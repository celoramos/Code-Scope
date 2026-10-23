import * as assert from 'node:assert/strict';
import { arrowsFor, VALUE_NAMES } from '../src/model/pointers';
import pkg from '../package.json';

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

  it('a lista padrão é a mesma do package.json', () => {
    const fromSettings = pkg.contributes.configuration.properties['codeScope.valueNames'].default;
    assert.deepEqual([...VALUE_NAMES], fromSettings);
  });

  it('ignora nomes que guardam valor, não posição', () => {
    assert.deepEqual(arrowsFor(arr, [{ name: 'temp', value: 1 }, { name: 'alvo', value: 2 }]), []);
  });
});
