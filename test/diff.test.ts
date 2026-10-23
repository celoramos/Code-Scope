import * as assert from 'node:assert/strict';
import { diff } from '../src/model/diff';
import type { Pointer, Snapshot } from '../src/model/snapshot';

function snap(values: number[], pointers: Pointer[] = [], name = 'arr'): Snapshot {
  return { line: 1, file: 'X.java', arrays: [{ name, values: values.map(String), length: values.length }], pointers };
}

describe('diff', () => {
  it('primeiro passo: todo array é novo', () => {
    assert.deepEqual(diff(undefined, snap([1, 2])), [{ kind: 'array-added', array: 'arr', length: 2, structure: 'array' }]);
  });

  it('nada mudou', () => {
    assert.deepEqual(diff(snap([1, 2]), snap([1, 2])), []);
  });

  it('uma posição mudou', () => {
    assert.deepEqual(diff(snap([5, 1, 4]), snap([5, 1, 3])), [
      { kind: 'set', array: 'arr', index: 2, from: '4', to: '3' },
    ]);
  });

  it('troca em um passo', () => {
    assert.deepEqual(diff(snap([5, 1, 4]), snap([1, 5, 4])), [{ kind: 'swap', array: 'arr', a: 0, b: 1, steps: 1 }]);
  });

  it('duas posições mudaram sem ser troca', () => {
    assert.deepEqual(diff(snap([1, 2, 3]), snap([9, 8, 3])), [
      { kind: 'set', array: 'arr', index: 0, from: '1', to: '9' },
      { kind: 'set', array: 'arr', index: 1, from: '2', to: '8' },
    ]);
  });

  it('valores iguais trocados não contam como troca', () => {
    assert.deepEqual(diff(snap([7, 7]), snap([7, 7])), []);
  });

  it('troca em dois passos com auxiliar', () => {
    const older = snap([5, 1]); // temp = arr[0]
    const prev = snap([1, 1]); // arr[0] = arr[1]
    const next = snap([1, 5]); // arr[1] = temp
    assert.deepEqual(diff(prev, next, older), [{ kind: 'swap', array: 'arr', a: 0, b: 1, steps: 2 }]);
  });

  it('o passo do meio da troca continua sendo uma mudança simples', () => {
    const older = snap([5, 1, 9]);
    const prev = snap([5, 1, 9]);
    const next = snap([1, 1, 9]);
    assert.deepEqual(diff(prev, next, older), [{ kind: 'set', array: 'arr', index: 0, from: '5', to: '1' }]);
  });

  it('array criado, removido e redimensionado', () => {
    const prev: Snapshot = {
      line: 1,
      file: 'X.java',
      arrays: [
        { name: 'a', values: ['1'], length: 1 },
        { name: 'b', values: ['1'], length: 1 },
      ],
      pointers: [],
    };
    const next: Snapshot = {
      line: 2,
      file: 'X.java',
      arrays: [
        { name: 'a', values: ['1', '2'], length: 2 },
        { name: 'c', values: [], length: 0 },
      ],
      pointers: [],
    };
    assert.deepEqual(diff(prev, next), [
      { kind: 'array-resized', array: 'a', from: 1, to: 2 },
      { kind: 'array-added', array: 'c', length: 0, structure: 'array' },
      { kind: 'array-removed', array: 'b' },
    ]);
  });

  it('lista: item inserido no meio, no fim e removido', () => {
    const list = (values: string[]): Snapshot => ({
      line: 1,
      file: 'X.java',
      arrays: [{ name: 'lista', values, length: values.length, kind: 'list' }],
      pointers: [],
    });
    assert.deepEqual(diff(list(['a', 'c']), list(['a', 'b', 'c'])), [
      { kind: 'insert', array: 'lista', index: 1, value: 'b', shifted: true },
    ]);
    assert.deepEqual(diff(list(['a']), list(['a', 'b'])), [
      { kind: 'insert', array: 'lista', index: 1, value: 'b', shifted: false },
    ]);
    assert.deepEqual(diff(list(['a', 'b', 'c']), list(['b', 'c'])), [
      { kind: 'remove', array: 'lista', index: 0, value: 'a', shifted: true },
    ]);
    // Dois itens de uma vez não têm uma posição única que explique: vira redimensionamento.
    assert.deepEqual(diff(list(['a']), list(['a', 'b', 'c'])), [
      { kind: 'array-resized', array: 'lista', from: 1, to: 3 },
    ]);
  });

  it('matriz: mudança e troca dentro de uma linha', () => {
    const grid = (rows: number[][]): Snapshot => ({
      line: 1,
      file: 'X.java',
      arrays: [
        {
          name: 'g',
          values: rows.map((r) => `int[${r.length}]`),
          length: rows.length,
          rows: rows.map((r, i) => ({ name: `g[${i}]`, values: r.map(String), length: r.length })),
        },
      ],
      pointers: [],
    });
    assert.deepEqual(diff(grid([[1, 2], [3, 4]]), grid([[1, 2], [3, 40]])), [
      { kind: 'set', array: 'g[1]', index: 1, from: '4', to: '40' },
    ]);
    assert.deepEqual(diff(grid([[1, 2], [3, 4]]), grid([[2, 1], [3, 4]])), [
      { kind: 'swap', array: 'g[0]', a: 0, b: 1, steps: 1 },
    ]);
  });

  it('variáveis simples: boolean que muda', () => {
    const s = (v: string): Snapshot => ({ line: 1, file: 'X.java', arrays: [], pointers: [], scalars: [{ name: 'ok', value: v }] });
    assert.deepEqual(diff(s('true'), s('false')), [{ kind: 'scalar', name: 'ok', from: 'true', to: 'false' }]);
  });

  it('ponteiros que andaram, surgiram e sumiram', () => {
    const prev = snap([1, 2, 3], [
      { name: 'i', value: 0 },
      { name: 'k', value: 2 },
    ]);
    const next = snap([1, 2, 3], [
      { name: 'i', value: 1 },
      { name: 'j', value: 0 },
    ]);
    assert.deepEqual(diff(prev, next), [
      { kind: 'pointer', name: 'i', from: 0, to: 1 },
      { kind: 'pointer', name: 'j', from: undefined, to: 0 },
      { kind: 'pointer', name: 'k', from: 2, to: undefined },
    ]);
  });
});
