import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { diff } from '../../src/model/diff';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot, visibleAtFirstStop } from './helpers';

/** Debuga samples/java/<nome>.java com a configuração de mesmo nome do launch.json. */
function debugSample(name: string, breakpointLine: number, steps: number): Promise<Snapshot[]> {
  return debugFile({
    file: path.join(samplesRoot, 'java', `${name}.java`),
    breakpointLine,
    steps,
    config: name,
    dump: name,
    async before() {
      // O debugger do Java só acha a classe depois que o language server terminou de carregar.
      const java = vscode.extensions.getExtension('redhat.java');
      const javaApi = (await java?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
      await javaApi?.serverReady?.();
    },
  });
}

describe('Java Debugger real', () => {
  it('BubbleSort: lê o array, os ponteiros e reconhece a troca com temp', async () => {
    const snaps = await debugSample('BubbleSort', 6, 12);
    assert.ok(visibleAtFirstStop, 'o painel não estava visível na primeira parada');
    const first = snaps[0];
    assert.equal(first.line, 6);
    assert.equal(first.code, 'for (int i = 0; i < numeros.length - 1; i++) {');
    assert.deepEqual(first.arrays.find((a) => a.name === 'numeros')?.values, ['5', '1', '4', '2', '8']);

    const kinds = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2])).map((c) => c.kind);
    assert.ok(kinds.includes('swap'), `nenhuma troca reconhecida: ${kinds.join(', ')}`);
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      'a variável j nunca apareceu como ponteiro',
    );
  });

  it('Matriz: lê as linhas, acha linha e coluna no código e vê a célula mudar', async () => {
    const snaps = await debugSample('Matriz', 9, 5);
    const grade = snaps[0].arrays.find((a) => a.name === 'grade');
    assert.deepEqual(grade?.rows?.map((r) => r.values), [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
    const changes = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2]));
    assert.ok(
      changes.some((c) => c.kind === 'set' && c.array === 'grade[0]' && c.index === 0 && c.to === '10'),
      `grade[0][0] não virou 10: ${JSON.stringify(changes)}`,
    );
    const frames = snaps.map((s, k) => makeFrame({ snapshot: s, prev: snaps[k - 1], older: snaps[k - 2], index: k + 1, total: snaps.length }));
    assert.ok(
      frames.some((f) => f.axes.grade?.row?.name === 'i' && f.axes.grade?.col?.name === 'j'),
      'i e j nunca foram reconhecidos como linha e coluna',
    );
  });

  it('ListaDeCompras: ArrayList vira lista e as inserções são reconhecidas', async () => {
    const snaps = await debugSample('ListaDeCompras', 7, 6);
    const last = snaps[snaps.length - 1].arrays.find((a) => a.name === 'lista');
    assert.equal(last?.kind, 'list');
    // Logo depois do "new ArrayList<>()" a lista existe e está vazia.
    const empty = snaps.find((s) => s.line === 8)?.arrays.find((a) => a.name === 'lista');
    assert.deepEqual(empty, { name: 'lista', values: [], length: 0, kind: 'list' });
    const kinds = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2])).map((c) => c.kind);
    assert.ok(kinds.includes('insert'), `nenhuma inserção: ${kinds.join(', ')}`);
  });

  it('Palindromo: char com aspas simples e boolean como variável simples', async () => {
    const snaps = await debugSample('Palindromo', 7, 3);
    const s = snaps[snaps.length - 1];
    assert.deepEqual(s.arrays.find((a) => a.name === 'letras')?.values, ["'r'", "'a'", "'d'", "'a'", "'r'"]);
    assert.deepEqual(s.scalars?.find((v) => v.name === 'ehPalindromo'), { name: 'ehPalindromo', value: 'true' });
  });

  it('Pilha: Stack empilha e desempilha pelo topo', async () => {
    const snaps = await debugSample('Pilha', 6, 7);
    const pratos = snaps.map((s) => s.arrays.find((a) => a.name === 'pratos')).filter((a) => a !== undefined);
    assert.ok(pratos.every((a) => a.kind === 'stack'), `nem todo passo virou pilha: ${JSON.stringify(pratos)}`);
    assert.deepEqual(pratos.at(-1)?.values, ['"azul"', '"verde"', '"amarelo"']);
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'insert' && c.structure === 'stack' && !c.shifted), 'nenhum push no topo');
    assert.ok(
      changes.some((c) => c.kind === 'remove' && c.structure === 'stack' && c.value === '"vermelho"' && !c.shifted),
      'o pop do "vermelho" não saiu do topo',
    );
  });

  it('Fila: LinkedList como Queue tira da frente', async () => {
    const snaps = await debugSample('Fila', 7, 7);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'banco')?.kind, 'queue');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'queue' && c.index === 0 && c.value === '"Ana"'),
      'Ana não saiu da frente',
    );
  });

  it('Parenteses: ArrayDeque com push vira pilha com o topo certo e chars legíveis', async () => {
    const snaps = await debugSample('Parenteses', 11, 9);
    const abertos = snaps.at(-1)?.arrays.find((a) => a.name === 'abertos');
    assert.equal(abertos?.kind, 'stack');
    // "{" entrou primeiro e está no fundo; "[" está no topo.
    assert.deepEqual(abertos?.values, ["'{'", "'['"]);
  });

  it('InverterArray: lê os dois ponteiros', async () => {
    const snaps = await debugSample('InverterArray', 6, 8);
    const last = snaps[snaps.length - 1];
    const names = last.pointers.map((p) => p.name);
    assert.ok(names.includes('inicio') && names.includes('fim'), `ponteiros: ${names.join(', ')}`);
  });
});
