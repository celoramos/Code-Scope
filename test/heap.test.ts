import { History } from '../src/model/history';
import { makeFrame } from '../src/model/frame';
import * as assert from 'node:assert/strict';
import { explainHeap, heapDelta, heapView } from '../src/model/heap';
import type { HeapObject, Snapshot } from '../src/model/snapshot';

const conta = (id: string, titular: string, saldo: string): HeapObject => ({
  id,
  type: 'Conta',
  fields: [
    { name: 'saldo', value: saldo },
    { name: 'titular', value: titular },
  ],
});
const no = (id: string, valor: string, links: Record<string, string | null>): HeapObject => ({
  id,
  type: 'No',
  fields: [{ name: 'valor', value: valor }, ...Object.entries(links).map(([name, ref]) => ({ name, value: ref ? 'No@' : 'null', ref }))],
});
const snap = (heap: HeapObject[], refs: [string, string | null][], arrays: Snapshot['arrays'] = []): Snapshot => ({
  file: 'A.java',
  line: 1,
  arrays,
  pointers: [],
  heap,
  refs: refs.map(([name, ref]) => ({ name, ref })),
});

describe('objetos e referências', () => {
  it('duas variáveis no mesmo objeto viram um cartão com os dois nomes', () => {
    const v = heapView(snap([conta('@12', '"Ana"', '100.0'), conta('@23', '"Bia"', '20.0')], [['minha', '@12'], ['outra', '@12'], ['nova', '@23']]));
    assert.deepEqual(
      v.objects.map((o) => [o.type, o.names]),
      [
        ['Conta', ['minha', 'outra']],
        ['Conta', ['nova']],
      ],
    );
  });

  it('explica objeto novo, apelido e campo que mudou', () => {
    const s1 = snap([conta('@12', '"Ana"', '100.0')], [['minha', '@12']]);
    const s2 = snap([conta('@12', '"Ana"', '100.0')], [['minha', '@12'], ['outra', '@12']]);
    const s3 = snap([conta('@12', '"Ana"', '150.0')], [['minha', '@12'], ['outra', '@12']]);
    assert.deepEqual(explainHeap(snap([], []), s1, 'pt'), ['Um objeto Conta novo foi criado, e minha aponta para ele.']);
    assert.match(explainHeap(s1, s2, 'pt')[0], /^outra aponta para o mesmo objeto que minha: não é uma cópia/);
    assert.deepEqual(explainHeap(s2, s3, 'pt'), ['minha.saldo mudou de 100.0 para 150.0.']);
    assert.deepEqual(heapDelta(s2, s3), { added: [], fields: { '@12': ['saldo'] } });
  });

  it('b = a com arrays: diz que não é cópia', () => {
    const arr = (name: string) => ({ name, values: ['1', '2'], length: 2, id: '@26' });
    const s1 = snap([], [], [arr('a')]);
    const s2 = snap([], [], [arr('a'), arr('b')]);
    assert.deepEqual(explainHeap(s1, s2, 'pt'), ['b não é uma cópia: a e b são o mesmo array. Mudar um muda o outro.']);
  });
});

describe('listas ligadas e árvores', () => {
  const lista = snap(
    [no('@1', '10', { proximo: '@2' }), no('@2', '20', { proximo: '@3' }), no('@3', '30', { proximo: null })],
    [['inicio', '@1'], ['atual', '@2']],
  );

  it('uma classe com um campo para ela mesma é lista ligada, do começo ao fim', () => {
    const v = heapView(lista);
    assert.equal(v.lists.length, 1);
    assert.equal(v.lists[0].link, 'proximo');
    assert.deepEqual(
      v.lists[0].nodes.map((n) => [n.value, n.names]),
      [
        ['10', ['inicio']],
        ['20', ['atual']],
        ['30', []],
      ],
    );
    assert.equal(v.objects.length, 0);
  });

  it('atual andando na lista é uma variável apontando para outro nó', () => {
    const antes = snap(lista.heap!, [['inicio', '@1'], ['atual', '@1']]);
    assert.deepEqual(explainHeap(antes, lista, 'pt'), ['atual agora aponta para o nó 20.']);
  });

  it('nó novo pendurado no fim', () => {
    const antes = snap([no('@1', '10', { proximo: null })], [['inicio', '@1']]);
    const depois = snap([no('@1', '10', { proximo: '@2' }), no('@2', '20', { proximo: null })], [['inicio', '@1']]);
    assert.deepEqual(explainHeap(antes, depois, 'en'), ['inicio.proximo now points to a new node (20).']);
  });

  it('dois campos para a mesma classe é árvore, com a esquerda antes da direita', () => {
    const arvore = snap(
      [
        no('@1', '50', { direita: '@3', esquerda: '@2' }),
        no('@2', '30', { direita: null, esquerda: null }),
        no('@3', '70', { direita: null, esquerda: null }),
      ],
      [['raiz', '@1']],
    );
    const v = heapView(arvore);
    assert.equal(v.trees.length, 1);
    assert.deepEqual(v.trees[0].links, ['esquerda', 'direita']);
    assert.deepEqual(
      v.trees[0].root.children.map((c) => c?.value),
      ['30', '70'],
    );
  });

  it('Python: raiz = None virando objeto não "sai de escopo"', () => {
    const h = new History();
    h.push({ ...snap([], []), scalars: [{ name: 'raiz', value: 'None' }] });
    h.push(snap([no('0x1', '50', { esquerda: null, direita: null })], [['raiz', '0x1']]));
    const frame = makeFrame(h.current()!);
    assert.deepEqual(frame.explanation, ['Um objeto No novo foi criado, e raiz aponta para ele.']);
  });

  it('variável que aponta para null aparece como tal', () => {
    assert.deepEqual(heapView(snap([], [['raiz', null]])).nulls, ['raiz']);
  });
});
