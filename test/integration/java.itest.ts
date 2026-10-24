import { heapView } from '../../src/model/heap';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { diff } from '../../src/model/diff';
import { callChanges } from '../../src/model/calls';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot, visibleAtFirstStop } from './helpers';

/** Debuga samples/java/<nome>.java com a configuração de mesmo nome do launch.json. */
function debugSample(name: string, breakpointLine: number, steps: number, step?: 'stepOver' | 'stepInto'): Promise<Snapshot[]> {
  return debugFile({
    file: path.join(samplesRoot, 'java', `${name}.java`),
    breakpointLine,
    steps,
    step,
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
    const frames = snaps.map((s, k) => makeFrame({ snapshot: s, prev: snaps[k - 1], older: snaps[k - 2], index: k + 1, total: snaps.length, past: snaps.slice(0, k + 1) }));
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

  it('ForaDoLimite: para no erro de índice e mostra a posição que não existe', async () => {
    const snaps = await debugSample('ForaDoLimite', 7, 12);
    const stop = snaps.find((s) => s.exception);
    assert.ok(stop, `o programa não parou no erro: ${JSON.stringify(snaps.map((s) => s.line))}`);
    assert.equal(stop.exception?.type, 'ArrayIndexOutOfBoundsException');
    const frame = makeFrame({ snapshot: stop, index: 1, total: 1, past: [stop] });
    assert.deepEqual(frame.error?.missing, { array: 'notas', index: 3 });
  });

  it('InverterArray: lê os dois ponteiros', async () => {
    const snaps = await debugSample('InverterArray', 6, 8);
    const last = snaps[snaps.length - 1];
    const names = last.pointers.map((p) => p.name);
    assert.ok(names.includes('inicio') && names.includes('fim'), `ponteiros: ${names.join(', ')}`);
  });

  it('Fatorial: recursão empilha uma chamada por nível, cada uma com o próprio n', async () => {
    const snaps = await debugSample('Fatorial', 12, 12, 'stepInto');
    const deepest = snaps.reduce((a, s) => ((s.calls?.length ?? 0) > (a.calls?.length ?? 0) ? s : a), snaps[0]);
    const fat = (deepest.calls ?? []).filter((c) => c.name === 'fatorial');
    assert.ok(fat.length >= 3, `pilha: ${JSON.stringify(deepest.calls)}`);
    // Cada chamada de baixo guarda o próprio n: 4, 3, 2...
    assert.deepEqual(
      fat.slice(0, -1).map((c) => c.vars.find((v) => v.name === 'n')?.value),
      ['4', '3', '2', '1'].slice(0, fat.length - 1),
    );
    const changes = snaps.flatMap((s, k) => callChanges(snaps[k - 1], s));
    assert.ok(changes.some((c) => c.kind === 'call' && c.recursive), 'nenhuma chamada recursiva reconhecida');
    assert.ok(changes.some((c) => c.kind === 'return' && c.name === 'fatorial'), 'nenhum retorno reconhecido');
  });

  it('Java referencias: duas variáveis no mesmo objeto e no mesmo array', async () => {
    const snaps = await debugSample('Referencias', 18, 8);
    const last = snaps.at(-1)!;
    const ref = (n: string) => last.refs?.find((r) => r.name === n)?.ref;
    assert.ok(ref('minha'), `refs: ${JSON.stringify(last.refs)}`);
    assert.equal(ref('outra'), ref('minha'), 'outra deveria apontar para o mesmo objeto que minha');
    assert.notEqual(ref('nova'), ref('minha'));
    const conta = last.heap?.find((o) => o.id === ref('minha'));
    assert.equal(conta?.type, 'Conta');
    assert.match(conta?.fields.find((f) => f.name === 'saldo')?.value ?? '', /^150(.0)?$/);
    const id = (n: string) => last.arrays.find((a) => a.name === n)?.id;
    assert.ok(id('a') && id('a') === id('b'), `arrays: ${JSON.stringify(last.arrays)}`);
  });

  it('Java lista ligada: nós em cadeia, com o mesmo id de um passo para o outro', async () => {
    const snaps = await debugSample('ListaLigada', 13, 9);
    const full = snaps.find((s) => (s.heap?.length ?? 0) >= 3);
    assert.ok(full, `heap: ${JSON.stringify(snaps.at(-1)?.heap)}`);
    const byId = new Map(full.heap!.map((o) => [o.id, o]));
    const head = full.refs?.find((r) => r.name === 'inicio')?.ref;
    const values: string[] = [];
    for (let id = head; id; id = byId.get(id)?.fields.find((f) => f.name === 'proximo')?.ref ?? null) {
      values.push(byId.get(id)?.fields.find((f) => f.name === 'valor')?.value ?? '?');
    }
    assert.deepEqual(values, ['10', '20', '30']);
    // O nó do começo é o mesmo objeto em todos os passos em que existe.
    const heads = new Set(snaps.map((s) => s.refs?.find((r) => r.name === 'inicio')?.ref).filter(Boolean));
    assert.equal(heads.size, 1, `o nó do começo mudou de id: ${[...heads].join(', ')}`);
  });

  it('Java árvore binária: inserções formam a árvore de busca', async () => {
    const snaps = await debugSample('ArvoreBinaria', 27, 14);
    const best = snaps.reduce((a, s) => ((s.heap?.length ?? 0) > (a.heap?.length ?? 0) ? s : a), snaps[0]);
    const trees = heapView(best).trees;
    assert.equal(trees.length, 1, `heap: ${JSON.stringify(best.heap)}`);
    const inOrder: string[] = [];
    const walk = (n: (typeof trees)[0]['root'] | null) => {
      if (!n) return;
      walk(n.children[0]);
      inOrder.push(n.value);
      walk(n.children[1]);
    };
    walk(trees[0].root);
    assert.equal(trees[0].root.value, '50');
    assert.deepEqual(inOrder, [...inOrder].sort((a, b) => Number(a) - Number(b)));
    assert.ok(inOrder.length >= 4, `nós: ${inOrder.join(', ')}`);
  });

  it('Java dicionário: conta as palavras com chave nova e valor trocado', async () => {
    const snaps = await debugSample('Dicionario', 7, 18);
    const last = [...snaps].reverse().find((s) => s.maps?.length) ?? snaps.at(-1)!;
    const map = last.maps?.find((m) => m.name === 'contagem');
    assert.ok(map, `maps: ${JSON.stringify(last.maps)}`);
    assert.equal(map.entries.find((e) => e.key === '"sol"')?.value, '2');
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === undefined), 'nenhuma chave nova reconhecida');
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === '1' && c.value === '2'), `trocas: ${JSON.stringify(changes.filter((c) => c.kind === 'map-put'))}`);
  });

  it('Java condição: o debugger responde cada parte antes da linha rodar', async () => {
    const snaps = await debugSample('BuscaBinaria', 7, 14);
    const tested = snaps.filter((s) => s.condition && s.condition.result !== undefined);
    assert.ok(tested.length > 0, `nenhuma condição avaliada: ${JSON.stringify(snaps.map((s) => s.condition ?? s.code))}`);
    assert.ok(tested.some((s) => s.condition!.result === true) && tested.some((s) => s.condition!.result === false), 'deveria haver condição verdadeira e falsa');
    assert.ok(tested.some((s) => s.condition!.text === 'ordenado[meio] == alvo'), `condições: ${[...new Set(tested.map((s) => s.condition!.text))].join(' | ')}`);
  });
});
