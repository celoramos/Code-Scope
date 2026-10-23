import * as assert from 'node:assert/strict';
import { arrowsFor } from '../src/model/pointers';

describe('arrowsFor', () => {
  const arr = { name: 'arr', values: ['5', '1', '4'], length: 10 };

  it('só aponta para posições desenhadas', () => {
    const pointers = [
      { name: 'i', value: 0 },
      { name: 'j', value: 2 },
      { name: 'k', value: 3 },
      { name: 'm', value: -1 },
    ];
    assert.deepEqual(arrowsFor(arr, pointers), [
      { name: 'i', index: 0 },
      { name: 'j', index: 2 },
    ]);
  });

  it('ignora nomes que guardam valor, não posição', () => {
    assert.deepEqual(arrowsFor(arr, [{ name: 'temp', value: 1 }, { name: 'alvo', value: 2 }]), []);
  });
});
