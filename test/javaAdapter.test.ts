import * as assert from 'node:assert/strict';
import {
  arrayLength,
  cleanValue,
  elementIndex,
  integralValue,
  isArrayVariable,
  isRangeGroup,
  pickLocalScope,
} from '../src/debug/javaAdapter';

describe('javaAdapter', () => {
  it('escolhe o escopo Local', () => {
    const scopes = [
      { name: 'Static', variablesReference: 2, expensive: true },
      { name: 'Local', variablesReference: 1 },
    ];
    assert.equal(pickLocalScope(scopes)?.variablesReference, 1);
  });

  it('cai no primeiro escopo barato quando nenhum se chama Local', () => {
    const scopes = [
      { name: 'Registers', variablesReference: 3, expensive: true },
      { name: 'Frame', variablesReference: 4 },
    ];
    assert.equal(pickLocalScope(scopes)?.variablesReference, 4);
  });

  it('reconhece array Java pelo type e pelo value', () => {
    assert.ok(isArrayVariable({ name: 'a', value: 'int[5]@10', type: 'int[]', variablesReference: 7 }));
    assert.ok(isArrayVariable({ name: 'a', value: 'int[5] (id=23)', type: 'int[]', variablesReference: 7 }));
    assert.ok(isArrayVariable({ name: 'a', value: 'int[5] (id=23)', variablesReference: 7 }));
    assert.ok(!isArrayVariable({ name: 'i', value: '3', type: 'int', variablesReference: 0 }));
    assert.ok(!isArrayVariable({ name: 's', value: '"oi"', type: 'String', variablesReference: 9 }));
  });

  it('lê o tamanho do array', () => {
    assert.equal(arrayLength({ name: 'a', value: 'int[5] (id=23)', variablesReference: 7 }), 5);
    assert.equal(arrayLength({ name: 'm', value: 'int[3][] (id=24)', variablesReference: 7 }), 3);
    assert.equal(arrayLength({ name: 'a', value: '?', variablesReference: 7, indexedVariables: 8 }), 8);
  });

  it('lê índices e grupos de paginação', () => {
    assert.equal(elementIndex('12'), 12);
    assert.equal(elementIndex('[12]'), 12);
    assert.equal(elementIndex('length'), undefined);
    assert.ok(isRangeGroup('[0..99]'));
    assert.ok(isRangeGroup('0..99'));
    assert.ok(!isRangeGroup('[0]'));
  });

  it('lê inteiros que podem ser ponteiros', () => {
    assert.equal(integralValue({ name: 'i', value: '3', type: 'int', variablesReference: 0 }), 3);
    assert.equal(integralValue({ name: 'n', value: '-1', variablesReference: 0 }), -1);
    assert.equal(integralValue({ name: 'x', value: '2.5', type: 'double', variablesReference: 0 }), undefined);
    assert.equal(integralValue({ name: 'b', value: 'true', type: 'boolean', variablesReference: 0 }), undefined);
  });

  it('tira o id de objeto do value', () => {
    assert.equal(cleanValue('"abc" (id=31)'), '"abc"');
    assert.equal(cleanValue('Integer@12'), 'Integer');
    assert.equal(cleanValue('5'), '5');
  });
});
