import * as assert from 'node:assert/strict';
import { diff } from '../src/model/diff';
import type { Pointer, Snapshot } from '../src/model/snapshot';

function snap(values: number[], pointers: Pointer[] = [], name = 'arr'): Snapshot {
  return { line: 1, file: 'X.java', arrays: [{ name, values: values.map(String), length: values.length }], pointers };
}

describe('diff', () => {
  it('primeiro passo: todo array é novo', () => {
    assert.deepEqual(diff(undefined, snap([1, 2])), [{ kind: 'array-added', array: 'arr', length: 2 }]);
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
      { kind: 'array-added', array: 'c', length: 0 },
      { kind: 'array-removed', array: 'b' },
    ]);
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
      { kind: 'pointer', name: 'k', from: 2 },
    ]);
  });
});
