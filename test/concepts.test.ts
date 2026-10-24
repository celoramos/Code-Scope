import * as assert from 'node:assert/strict';
import { overriddenIn, parseClasses } from '../src/model/classes';
import { explainHandled } from '../src/model/errors';
import { graphNotes, graphViews } from '../src/model/graph';
import { explainHeap, heapView } from '../src/model/heap';
import { numberNotes } from '../src/model/numbers';
import type { Snapshot } from '../src/model/snapshot';
import { applyTextRoles, letters, readsLetters } from '../src/model/text';

const base = (extra: Partial<Snapshot>): Snapshot => ({ file: 'A.java', line: 1, arrays: [], pointers: [], ...extra });

describe('texto como letras', () => {
  it('vira fileira só quando o código lê letra por letra', () => {
    assert.ok(readsLetters('char letra = palavra.charAt(i);', 'palavra'));
    assert.ok(readsLetters('letra = palavra[i]', 'palavra'));
    assert.ok(readsLetters('for letra in palavra:', 'palavra'));
    assert.ok(!readsLetters('System.out.println(palavra);', 'palavra'));
    assert.deepEqual(letters('"rad"'), ["'r'", "'a'", "'d'"]);
    const s = base({ scalars: [{ name: 'palavra', value: '"radar"' }, { name: 'nome', value: '"Ana"' }] });
    applyTextRoles(s, 'char c = palavra.charAt(i); print(nome);');
    assert.deepEqual(s.arrays.map((a) => [a.name, a.kind, a.length]), [['palavra', 'text', 5]]);
    assert.deepEqual(s.scalars, [{ name: 'nome', value: '"Ana"' }]);
  });
});

describe('pegadinhas de número', () => {
  it('divisão de inteiros no Java', () => {
    const prev = base({ code: 'int porPessoa = total / pessoas;', pointers: [{ name: 'total', value: 7 }, { name: 'pessoas', value: 2 }] });
    const next = base({ pointers: [...prev.pointers, { name: 'porPessoa', value: 3 }] });
    assert.deepEqual(numberNotes(prev, next, 'pt'), [
      '7 / 2 deu 3, e não 3.5: dividir dois inteiros joga fora a parte decimal. Para ter 3.5, um dos dois precisa ser número com vírgula (7 / 2.0).',
    ]);
  });

  it('// do Python e 0.1 + 0.2', () => {
    const prev = base({ file: 'n.py', code: 'inteiro = total // pessoas', pointers: [{ name: 'total', value: 7 }, { name: 'pessoas', value: 2 }] });
    const next = base({ file: 'n.py', pointers: prev.pointers, scalars: [{ name: 'soma', value: '0.30000000000000004' }] });
    const notes = numberNotes(prev, next, 'en');
    assert.match(notes[0], /^7 \/\/ 2 is 3/);
    assert.match(notes[1], /^soma became 0\.30000000000000004/);
  });

  it('overflow do int', () => {
    const prev = base({ pointers: [{ name: 'grande', value: 2147483647 }] });
    const next = base({ pointers: [{ name: 'grande', value: -2147483648 }] });
    assert.match(numberNotes(prev, next, 'pt')[0], /^grande passou do maior valor que um int guarda/);
  });
});

describe('grafo', () => {
  const graph = (visitados: string[], atual?: string): Snapshot =>
    base({
      maps: [
        {
          name: 'grafo',
          length: 3,
          entries: [
            { key: '"A"', value: '["B", "C"]', items: ['"B"', '"C"'] },
            { key: '"B"', value: '["A"]', items: ['"A"'] },
            { key: '"C"', value: '["A"]', items: ['"A"'] },
          ],
        },
      ],
      arrays: [{ name: 'visitados', values: visitados.map((v) => `"${v}"`), length: visitados.length, kind: 'list' }],
      ...(atual ? { scalars: [{ name: 'atual', value: `"${atual}"` }] } : {}),
    });

  it('dicionário de listas que apontam para as chaves é grafo', () => {
    const [g] = graphViews(graph(['A'], 'A'));
    assert.deepEqual(g.nodes, ['A', 'B', 'C']);
    assert.deepEqual(g.edges, [
      ['A', 'B'],
      ['A', 'C'],
    ]);
    assert.equal(g.directed, false);
    assert.equal(g.current, 'A');
    assert.deepEqual(g.visited, ['A']);
  });

  it('explica o nó visitado e onde a busca está', () => {
    assert.deepEqual(graphNotes(graph(['A'], 'A'), graph(['A', 'B'], 'B'), 'pt'), [
      'B foi marcado como visitado (2 de 3): a busca não vai entrar nele de novo.',
      'A busca agora está em B e vai olhar as ligações dele.',
    ]);
  });
});

describe('herança', () => {
  const java = `
    class Animal { String falar() { return "..."; } }
    class Cachorro extends Animal { String falar() { return "Au!"; } }
    class Gato extends Animal { }`;
  const python = 'class Animal:\n    def falar(self):\n        pass\n\nclass Cachorro(Animal):\n    def falar(self):\n        pass\n';

  it('lê de quem cada classe herda e o que ela escreve', () => {
    const c = parseClasses(java);
    assert.equal(c.Cachorro.parent, 'Animal');
    assert.deepEqual(c.Cachorro.methods, ['falar']);
    assert.equal(overriddenIn(c, 'Cachorro', 'falar'), 'Animal');
    assert.equal(overriddenIn(c, 'Gato', 'falar'), undefined);
    assert.equal(overriddenIn(parseClasses(python), 'Cachorro', 'falar'), 'Animal');
  });
});

describe('erro tratado', () => {
  it('o passo que entra no catch explica o pulo', () => {
    const prev = base({ line: 8 });
    const next = base({ line: 11, caught: { name: 'e', type: 'NumberFormatException', message: 'For input string: "abc"' } });
    const view = explainHandled(prev, next, 'pt');
    assert.equal(view?.title, 'Erro tratado: NumberFormatException');
    assert.equal(view?.handled, true);
    assert.match(view?.sentences[0] ?? '', /^A linha 8 deu erro, e o programa pulou direto para o catch/);
    assert.equal(explainHandled(next, next, 'pt'), undefined);
  });
});

describe('objetos dentro de arrays', () => {
  const aluno = (id: string, nome: string, nota: string) => ({
    id,
    type: 'Aluno',
    fields: [
      { name: 'nome', value: nome },
      { name: 'nota', value: nota },
    ],
  });
  const turma = (notaBia: string): Snapshot =>
    base({
      arrays: [{ name: 'turma', values: ['"Ana"', '"Bia"'], length: 2, kind: 'list', refs: ['@1', '@2'] }],
      heap: [aluno('@1', '"Ana"', '8.5'), aluno('@2', '"Bia"', notaBia)],
      refs: [{ name: 'melhor', ref: '@1' }],
    });

  it('aparecem dentro da posição, com quem aponta para eles, sem cartão separado', () => {
    const v = heapView(turma('6.0'));
    assert.deepEqual(v.objects, []);
    assert.deepEqual(v.cells.turma, [
      { index: 0, id: '@1', details: ['nota: 8.5'], names: ['melhor'] },
      { index: 1, id: '@2', details: ['nota: 6.0'], names: [] },
    ]);
  });

  it('campo mudado é dito pela posição do array', () => {
    assert.deepEqual(explainHeap(turma('6.0'), turma('7.0'), 'pt'), ['turma[1].nota mudou de 6.0 para 7.0.']);
  });
});
