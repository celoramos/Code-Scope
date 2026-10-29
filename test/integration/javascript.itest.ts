import { buildCallTree } from '../../src/model/callTree';
import { setNotes } from '../../src/model/sets';
import { explainHeap } from '../../src/model/heap';
import { numberNotes } from '../../src/model/numbers';
import { samenessNotes } from '../../src/model/sameness';
import { mutationNotes } from '../../src/model/mutation';
import { polymorphismNote } from '../../src/model/calls';
import { graphViews } from '../../src/model/graph';
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

  it('JavaScript conjunto: Set desenhado sem posições, e o add repetido explicado', async () => {
    const snaps = await debugScript('conjunto', 4, 18);
    const last = snaps.at(-1)!;
    const vistos = last.arrays.find((a) => a.name === 'vistos');
    assert.equal(vistos?.kind, 'set', `arrays: ${JSON.stringify(last.arrays)}`);
    assert.deepEqual([...vistos.values].sort(), ['1', '2', '3']);
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'set-add'), 'nenhum item entrou no conjunto');
    const notes = snaps.flatMap((s, k) => setNotes(snaps[k - 1], s, 'pt'));
    assert.ok(notes.some((n) => n.includes('já estava em vistos')), `JavaScript: o add repetido não foi explicado: ${JSON.stringify(notes)}`);
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

  it('JavaScript conceito: lista de objetos com o objeto dentro da posição', async () => {
    const snaps = await debugScript('turma', 10, 18);
    const last = [...snaps].reverse().find((s) => s.arrays.some((a) => a.name === 'turma' && a.refs?.every(Boolean) && a.length === 3));
    assert.ok(last, `turma sem objetos: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
    const turma = last.arrays.find((a) => a.name === 'turma')!;
    assert.deepEqual(turma.values.map((v) => v.replace(/["']/g, '')), ['Ana', 'Bia', 'Caio']);
    const changes = snaps.flatMap((s, k) => (k > 0 ? explainHeap(snaps[k - 1], s, 'pt') : []));
    assert.ok(changes.some((c) => c.startsWith('turma[1].nota mudou de 6')), `frases: ${changes.join(' | ')}`);
  });

  it('JavaScript conceito: grafo e a busca andando por ele', async () => {
    const snaps = await debugScript('grafo', 10, 40);
    const graphs = snaps.map((s) => graphViews(s)[0]).filter(Boolean);
    assert.ok(graphs.length > 0, `nenhum grafo: ${JSON.stringify(snaps.at(-1)?.maps)}`);
    assert.deepEqual(graphs[0].nodes.sort(), ['A', 'B', 'C', 'D']);
    assert.equal(graphs[0].edges.length, 4);
    assert.ok(Math.max(...graphs.map((g) => g.visited.length)) >= 3, `visitados: ${graphs.map((g) => g.visited.join('')).join(' ')}`);
  });

  it('JavaScript conceito: herança e polimorfismo', async () => {
    const snaps = await debugScript('heranca', 26, 8, 'stepInto');
    const notes = snaps.flatMap((s, k) => (k > 0 ? callChanges(snaps[k - 1], s).map((c) => polymorphismNote(c, s.classes, 'pt')) : [])).filter(Boolean);
    assert.ok(notes.some((n) => n?.includes('rodou o falar de Cachorro')), `frases: ${notes.join(' | ')}; donos: ${JSON.stringify(snaps.map((s) => s.calls?.at(-1)?.owner))}`);
  });

  it('JavaScript conceito: erro tratado no catch', async () => {
    const snaps = await debugScript('trataErro', 5, 10);
    const caught = snaps.find((s) => s.caught);
    assert.ok(caught, 'o catch não foi reconhecido');
    assert.equal(caught.caught?.type, 'SyntaxError');
    assert.ok(caught.caught?.message, 'sem mensagem do erro');
  });

  it('JavaScript conceito: texto lido letra por letra', async () => {
    const snaps = await debugScript('texto', 3, 3);
    const palavra = snaps.flatMap((s) => s.arrays).find((a) => a.name === 'palavra');
    assert.equal(palavra?.kind, 'text');
    assert.deepEqual(palavra?.values, ["'r'", "'a'", "'d'", "'a'", "'r'"]);
  });

  it('JavaScript conceito: pegadinha de número', async () => {
    const snaps = await debugScript('numeros', 3, 6);
    const notes = snaps.flatMap((s, k) => (k > 0 ? numberNotes(snaps[k - 1], s, 'pt') : []));
    assert.ok(notes.some((n) => n.includes('0.30000000000000004')), `frases: ${notes.join(' | ')}`);
  });

  it('JavaScript conceito: identidade e igualdade', async () => {
    const snaps = await debugScript('igualdade', 10, 14);
    const notes = snaps.flatMap((s) => samenessNotes(s, 'pt'));
    assert.ok(notes.some((n) => n.startsWith('p === q deu falso mesmo com p e q iguais por dentro')), `frases: ${notes.join(' | ')}; condições: ${JSON.stringify(snaps.map((s) => s.condition?.parts))}`);
    assert.ok(notes.some((n) => n.startsWith('r === p: r e p apontam para o mesmo objeto')), `frases: ${notes.join(' | ')}; condições: ${JSON.stringify(snaps.map((s) => s.condition?.parts))}`);
  });

  it('JavaScript conceito: mudar no lugar ou criar outro', async () => {
    const snaps = await debugScript.bind(null, 'copias')(3, 9);
    const notes = snaps.flatMap((s, k) => (k > 0 ? mutationNotes(snaps[k - 1], s, 'pt') : []));
    assert.ok(notes.some((n) => n.startsWith("nome.trim() criou um texto novo, mas ninguém guardou")), `frases: ${notes.join(' | ')}; linhas: ${JSON.stringify(snaps.map((s) => [s.code, s.arrays.map((a) => [a.name, a.id, a.values.join(',')]), s.scalars?.map((v) => v.name + '=' + v.value)]))}`);
    assert.ok(notes.some((n) => n.startsWith("nome.trim() criou um texto novo e guardou em limpo")), `frases: ${notes.join(' | ')}; linhas: ${JSON.stringify(snaps.map((s) => [s.code, s.arrays.map((a) => [a.name, a.id, a.values.join(',')]), s.scalars?.map((v) => v.name + '=' + v.value)]))}`);
    assert.ok(notes.some((n) => n.startsWith("notas.slice() criou uma lista nova para copia")), `frases: ${notes.join(' | ')}; linhas: ${JSON.stringify(snaps.map((s) => [s.code, s.arrays.map((a) => [a.name, a.id, a.values.join(',')]), s.scalars?.map((v) => v.name + '=' + v.value)]))}`);
    assert.ok(notes.some((n) => n.startsWith("notas.sort() mudou a própria notas, sem criar outra lista. Por isso mesmas")), `frases: ${notes.join(' | ')}; linhas: ${JSON.stringify(snaps.map((s) => [s.code, s.arrays.map((a) => [a.name, a.id, a.values.join(',')]), s.scalars?.map((v) => v.name + '=' + v.value)]))}`);
  });

  it('JavaScript conceito: árvore de recursão do fibonacci', async () => {
    const snaps = await debugScript('fibonacci', 10, 24, 'stepInto');
    const tree = buildCallTree(snaps);
    assert.ok(tree, `sem árvore: ${JSON.stringify(snaps.map((s) => s.calls?.map((c) => c.name + c.vars.map((v) => v.value).join(','))))}`);
    const labels: string[] = [];
    const walk = (n: { label: string; children: { label: string; children: unknown[] }[] }) => {
      labels.push(n.label);
      n.children.forEach((c) => walk(c as never));
    };
    walk(tree.root as never);
    assert.ok(labels.includes('fib(4)') && labels.includes('fib(3)') && labels.includes('fib(2)'), labels.join(' '));
  });
});
