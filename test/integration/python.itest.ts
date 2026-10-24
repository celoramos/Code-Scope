import { buildCallTree } from '../../src/model/callTree';
import { explainHeap } from '../../src/model/heap';
import { numberNotes } from '../../src/model/numbers';
import { samenessNotes } from '../../src/model/sameness';
import { polymorphismNote } from '../../src/model/calls';
import { graphViews } from '../../src/model/graph';
import { fieldShadows } from '../../src/model/scope';
import { heapView } from '../../src/model/heap';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { callChanges } from '../../src/model/calls';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * Python: CODE_SCOPE_PYTHON aponta o interpretador (o CI usa o do setup-python).
 * Sem ele, procura um Python portátil em .vscode-test/python, que não exige
 * instalação: descompacte ali o "Windows embeddable package" do python.org e
 * renomeie o python3XX._pth (ele impede o Python de achar a pasta do script, e
 * o debugpy roda como script). Sem nenhum dos dois, os testes de Python são pulados.
 */
const python =
  process.env.CODE_SCOPE_PYTHON ?? path.resolve(__dirname, '..', '.vscode-test', 'python', 'python.exe');

function debugScript(name: string, breakpointLine: number, steps: number, step?: 'stepOver' | 'stepInto'): Promise<Snapshot[]> {
  const file = path.join(samplesRoot, 'python', `${name}.py`);
  return debugFile({
    file,
    breakpointLine,
    steps,
    step,
    // O debugpy usa um Python para o programa e outro para o próprio adaptador e o launcher.
    config: {
      type: 'debugpy',
      request: 'launch',
      name: `Python ${name}`,
      program: file,
      python,
      debugAdapterPython: python,
      debugLauncherPython: python,
      console: 'internalConsole',
    },
    dump: `py-${name}`,
  });
}

describe('Python (debugpy) real', function () {
  before(function () {
    if (!fs.existsSync(python)) {
      console.warn(`Python não encontrado em ${python}; testes de Python pulados.`);
      this.skip();
    }
  });

  it('bubble_sort.py: list, ponteiros e troca num passo só', async () => {
    const snaps = await debugScript('bubble_sort', 5, 12);
    const numeros = snaps[0].arrays.find((a) => a.name === 'numeros');
    assert.deepEqual(numeros?.values, ['5', '1', '4', '2', '8']);
    assert.equal(numeros?.kind, 'list');
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      `j nunca apareceu: ${JSON.stringify(snaps.map((s) => s.pointers))}`,
    );
    const swaps = allChanges(snaps).filter((c) => c.kind === 'swap');
    assert.ok(swaps.some((c) => c.kind === 'swap' && c.steps === 1), `nenhuma troca: ${JSON.stringify(allChanges(snaps))}`);
  });

  it('pilha.py: list com append e pop() vira pilha', async () => {
    const snaps = await debugScript('pilha', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'voltar')?.kind, 'stack');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'stack' && c.value === "'artigo.html'"),
      `pop não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fila.py: deque com popleft vira fila', async () => {
    const snaps = await debugScript('fila', 6, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'pedidos')?.kind, 'queue');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'queue' && c.index === 0 && c.value === "'pastel'"),
      `popleft não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fora_do_limite.py: IndexError mostra a posição que não existe', async () => {
    const snaps = await debugScript('fora_do_limite', 6, 12);
    const stop = snaps.find((s) => s.exception);
    assert.ok(stop, `o programa não parou no erro: ${JSON.stringify(snaps.map((s) => s.line))}`);
    assert.equal(stop.exception?.type, 'IndexError');
    const frame = makeFrame({ snapshot: stop, index: 1, total: 1, past: [stop] });
    assert.deepEqual(frame.error?.missing, { array: 'notas', index: 3 });
  });

  it('fatorial.py: recursão empilha uma chamada por nível, cada uma com o próprio n', async () => {
    const snaps = await debugScript('fatorial', 10, 12, 'stepInto');
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

  it('Python referencias: duas variáveis no mesmo objeto e no mesmo array', async () => {
    const snaps = await debugScript('referencias', 12, 8);
    // O último passo já é depois de main terminar; vale o último ainda dentro dela.
    const last = [...snaps].reverse().find((s) => s.refs?.some((r) => r.name === 'nova')) ?? snaps.at(-1)!;
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

  it('Python lista ligada: nós em cadeia, com o mesmo id de um passo para o outro', async () => {
    const snaps = await debugScript('lista_ligada', 10, 9);
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

  it('Python árvore binária: inserções formam a árvore de busca', async () => {
    const snaps = await debugScript('arvore_binaria', 21, 14);
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

  it('Python dicionário: conta as palavras com chave nova e valor trocado', async () => {
    const snaps = await debugScript('dicionario', 4, 14);
    const last = [...snaps].reverse().find((s) => s.maps?.length) ?? snaps.at(-1)!;
    const map = last.maps?.find((m) => m.name === 'contagem');
    assert.ok(map, `maps: ${JSON.stringify(last.maps)}`);
    assert.equal(map.entries.find((e) => e.key === "'sol'")?.value, '2');
    const changes = allChanges(snaps);
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === undefined), 'nenhuma chave nova reconhecida');
    assert.ok(changes.some((c) => c.kind === 'map-put' && c.from === '1' && c.value === '2'), `trocas: ${JSON.stringify(changes.filter((c) => c.kind === 'map-put'))}`);
  });

  it('Python condição: o debugger responde cada parte antes da linha rodar', async () => {
    const snaps = await debugScript('busca_binaria', 6, 14);
    const tested = snaps.filter((s) => s.condition && s.condition.result !== undefined);
    assert.ok(tested.length > 0, `nenhuma condição avaliada: ${JSON.stringify(snaps.map((s) => s.condition ?? s.code))}`);
    assert.ok(tested.some((s) => s.condition!.result === true) && tested.some((s) => s.condition!.result === false), 'deveria haver condição verdadeira e falsa');
    assert.ok(tested.some((s) => s.condition!.text === 'ordenado[meio] == alvo'), `condições: ${[...new Set(tested.map((s) => s.condition!.text))].join(' | ')}`);
  });

  it('Python escopo: parâmetro com o nome de um campo do objeto', async () => {
    const snaps = await debugScript('escopo', 12, 16, 'stepInto');
    assert.ok(
      snaps.some((s) => fieldShadows(s).some((f) => f.name === 'pontos')),
      `campo não reconhecido: ${JSON.stringify(snaps.map((s) => [s.line, s.refs, s.pointers.map((p) => p.name)]))}`,
    );
  });

  it('Python conceito: lista de objetos com o objeto dentro da posição', async () => {
    const snaps = await debugScript('turma', 9, 12);
    const last = [...snaps].reverse().find((s) => s.arrays.some((a) => a.name === 'turma' && a.refs?.every(Boolean) && a.length === 3));
    assert.ok(last, `turma sem objetos: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
    const turma = last.arrays.find((a) => a.name === 'turma')!;
    assert.deepEqual(turma.values.map((v) => v.replace(/["']/g, '')), ['Ana', 'Bia', 'Caio']);
    const changes = snaps.flatMap((s, k) => (k > 0 ? explainHeap(snaps[k - 1], s, 'pt') : []));
    assert.ok(changes.some((c) => c.startsWith('turma[1].nota mudou de 6')), `frases: ${changes.join(' | ')}`);
  });

  it('Python conceito: grafo e a busca andando por ele', async () => {
    const snaps = await debugScript('grafo', 13, 40);
    const graphs = snaps.map((s) => graphViews(s)[0]).filter(Boolean);
    assert.ok(graphs.length > 0, `nenhum grafo: ${JSON.stringify(snaps.at(-1)?.maps)}`);
    assert.deepEqual(graphs[0].nodes.sort(), ['A', 'B', 'C', 'D']);
    assert.equal(graphs[0].edges.length, 4);
    assert.ok(Math.max(...graphs.map((g) => g.visited.length)) >= 3, `visitados: ${graphs.map((g) => g.visited.join('')).join(' ')}`);
  });

  it('Python conceito: herança e polimorfismo', async () => {
    const snaps = await debugScript('heranca', 22, 8, 'stepInto');
    const notes = snaps.flatMap((s, k) => (k > 0 ? callChanges(snaps[k - 1], s).map((c) => polymorphismNote(c, s.classes, 'pt')) : [])).filter(Boolean);
    assert.ok(notes.some((n) => n?.includes('rodou o falar de Cachorro')), `frases: ${notes.join(' | ')}; donos: ${JSON.stringify(snaps.map((s) => s.calls?.at(-1)?.owner))}`);
  });

  it('Python conceito: erro tratado no catch', async () => {
    const snaps = await debugScript('trata_erro', 5, 10);
    const caught = snaps.find((s) => s.caught);
    assert.ok(caught, 'o catch não foi reconhecido');
    assert.equal(caught.caught?.type, 'ValueError');
    assert.ok(caught.caught?.message, 'sem mensagem do erro');
  });

  it('Python conceito: texto lido letra por letra', async () => {
    const snaps = await debugScript('texto', 3, 3);
    const palavra = snaps.flatMap((s) => s.arrays).find((a) => a.name === 'palavra');
    assert.equal(palavra?.kind, 'text');
    assert.deepEqual(palavra?.values, ["'r'", "'a'", "'d'", "'a'", "'r'"]);
  });

  it('Python conceito: pegadinha de número', async () => {
    const snaps = await debugScript('numeros', 3, 6);
    const notes = snaps.flatMap((s, k) => (k > 0 ? numberNotes(snaps[k - 1], s, 'pt') : []));
    assert.ok(notes.some((n) => n.includes('7 // 2 dá 3')), `frases: ${notes.join(' | ')}`);
  });

  it('Python conceito: identidade e igualdade', async () => {
    const snaps = await debugScript('igualdade', 9, 12);
    const notes = snaps.flatMap((s) => samenessNotes(s, 'pt'));
    assert.ok(notes.some((n) => n.startsWith('a == b deu verdadeiro: o conteúdo é igual')), `frases: ${notes.join(' | ')}; condições: ${JSON.stringify(snaps.map((s) => s.condition?.parts))}`);
    assert.ok(notes.some((n) => n.startsWith('a is b deu falso mesmo com a e b iguais por dentro')), `frases: ${notes.join(' | ')}; condições: ${JSON.stringify(snaps.map((s) => s.condition?.parts))}`);
    assert.ok(notes.some((n) => n.includes('a classe Ponto não escreveu __eq__')), `frases: ${notes.join(' | ')}; condições: ${JSON.stringify(snaps.map((s) => s.condition?.parts))}`);
  });

  it('Python conceito: árvore de recursão do fibonacci', async () => {
    const snaps = await debugScript('fibonacci', 9, 24, 'stepInto');
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
