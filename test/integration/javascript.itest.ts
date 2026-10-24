import { fieldShadows } from '../../src/model/scope';
import { heapView } from '../../src/model/heap';
import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { callChanges } from '../../src/model/calls';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/** Debuga samples/javascript/<nome>.js com o debugger de Node que vem no VS Code. */
function debugScript(name: string, breakpointLine: number, steps: number, step?: 'stepOver' | 'stepInto'): Promise<Snapshot[]> {
  const file = path.join(samplesRoot, 'javascript', `${name}.js`);
  return debugFile({
    file,
    breakpointLine,
    steps,
    step,
    config: { type: 'node', request: 'launch', name: `JS ${name}`, program: file, skipFiles: ['<node_internals>/**'] },
    dump: `js-${name}`,
  });
}

describe('JavaScript (js-debug) real', () => {
  it('bubbleSort.js: array, ponteiros em let e troca com temp', async () => {
    const snaps = await debugScript('bubbleSort', 4, 14);
    const numeros = snaps[0].arrays.find((a) => a.name === 'numeros');
    assert.deepEqual(numeros?.values, ['5', '1', '4', '2', '8']);
    assert.equal(numeros?.kind, 'list');
    const names = snaps.flatMap((s) => (s.scalars ?? []).map((v) => v.name));
    assert.ok(!names.includes('__dirname'), 'variáveis do módulo do Node apareceram no painel');
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      `j nunca apareceu: ${JSON.stringify(snaps.map((s) => s.pointers))}`,
    );
    const kinds = allChanges(snaps).map((c) => c.kind);
    assert.ok(kinds.includes('swap'), `nenhuma troca reconhecida: ${kinds.join(', ')}`);
  });

  it('pilha.js: array com push e pop vira pilha', async () => {
    const snaps = await debugScript('pilha', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'historico')?.kind, 'stack');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'stack' && c.value === "'apagou B'"),
      `pop não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fila.js: array com push e shift vira fila', async () => {
    const snaps = await debugScript('fila', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'documentos')?.kind, 'queue');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'queue' && c.index === 0),
      `shift não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('foraDoLimite.js: undefined de uma posição que não existe para o programa e é explicado', async () => {
    const snaps = await debugScript('foraDoLimite', 6, 12);
    const stop = snaps.find((s) => s.exception);
    assert.ok(stop, `o programa não parou no erro: ${JSON.stringify(snaps.map((s) => s.line))}`);
    assert.equal(stop.exception?.type, 'TypeError');
    const frame = makeFrame({ snapshot: stop, index: 1, total: 1, past: [stop] });
    assert.deepEqual(frame.error?.missing, { array: 'alunos', index: 2 });
  });

  it('fatorial.js: recursão empilha uma chamada por nível, cada uma com o próprio n', async () => {
    const snaps = await debugScript('fatorial', 11, 12, 'stepInto');
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
    assert.ok(changes.some((c) => c.kind === 'return' && c.value === '1'), `retornos: ${JSON.stringify(changes.filter((c) => c.kind === 'return'))}`);
  });

  it('JavaScript referencias: duas variáveis no mesmo objeto e no mesmo array', async () => {
    const snaps = await debugScript('referencias', 14, 8);
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

  it('JavaScript lista ligada: nós em cadeia, com o mesmo id de um passo para o outro', async () => {
    const snaps = await debugScript('listaLigada', 10, 9);
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

  it('JavaScript árvore binária: inserções formam a árvore de busca', async () => {
    const snaps = await debugScript('arvoreBinaria', 24, 14);
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

  it('JavaScript dicionário: conta as palavras com chave nova e valor trocado', async () => {
    const snaps = await debugScript('dicionario', 4, 20);
    const last = [...snaps].reverse().find((s) => s.maps?.length) ?? snaps.at(-1)!;
    const map = last.maps?.find((m) => m.name === 'contagem');
    assert.ok(map, `maps: ${JSON.stringify(last.maps)}`);
    assert.equal(map.entries.find((e) => e.key === 'sol')?.value, '2');
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === undefined), 'nenhuma chave nova reconhecida');
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === '1' && c.value === '2'), `trocas: ${JSON.stringify(changes.filter((c) => c.kind === 'map-put'))}`);
  });

  it('JavaScript condição: o debugger responde cada parte antes da linha rodar', async () => {
    const snaps = await debugScript('buscaBinaria', 6, 14);
    const tested = snaps.filter((s) => s.condition && s.condition.result !== undefined);
    assert.ok(tested.length > 0, `nenhuma condição avaliada: ${JSON.stringify(snaps.map((s) => s.condition ?? s.code))}`);
    assert.ok(tested.some((s) => s.condition!.result === true) && tested.some((s) => s.condition!.result === false), 'deveria haver condição verdadeira e falsa');
    assert.ok(tested.some((s) => s.condition!.text === 'ordenado[meio] === alvo'), `condições: ${[...new Set(tested.map((s) => s.condition!.text))].join(' | ')}`);
  });

  it('escopo.js: o total do bloco esconde o de fora', async () => {
    const snaps = await debugScript('escopo', 3, 12);
    const inner = snaps.find((s) => s.shadowed?.some((v) => v.name === 'total'));
    assert.ok(inner, `nenhuma variável escondida: ${JSON.stringify(snaps.map((s) => [s.line, s.pointers, s.shadowed]))}`);
    assert.equal(inner.shadowed?.find((v) => v.name === 'total')?.value, '3');
  });
});
