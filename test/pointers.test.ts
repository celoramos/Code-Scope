import * as assert from 'node:assert/strict';
import { arrowsFor, matrixAxesFor, VALUE_NAMES } from '../src/model/pointers';
import pkg from '../package.json';

describe('matrixAxesFor', () => {
  const grade = {
    name: 'grade',
    values: ['int[3]', 'int[3]'],
    length: 2,
    rows: [
      { name: 'grade[0]', values: ['1', '2', '3'], length: 3 },
      { name: 'grade[1]', values: ['4', '5', '6'], length: 3 },
    ],
  };
  const ij = [
    { name: 'i', value: 1 },
    { name: 'j', value: 2 },
  ];

  it('lê linha e coluna de grade[i][j]', () => {
    assert.deepEqual(matrixAxesFor(grade, ij, ['grade[i][j] = grade[i][j] * 10;']), {
      row: { name: 'i', index: 1 },
      col: { name: 'j', index: 2 },
    });
  });

  it('ordem dos índices no código decide, não o nome', () => {
    assert.deepEqual(matrixAxesFor(grade, [{ name: 'j', value: 0 }, { name: 'i', value: 1 }], ['x = grade[j][i];']), {
      row: { name: 'j', index: 0 },
      col: { name: 'i', index: 1 },
    });
  });

  it('completa com linhas vizinhas e ignora índice fora da matriz', () => {
    const axes = matrixAxesFor(grade, ij, ['for (int j = 0; j < grade[i].length; j++) {', 'grade[i][j] = 0;']);
    assert.deepEqual(axes, { row: { name: 'i', index: 1 }, col: { name: 'j', index: 2 } });
    assert.deepEqual(matrixAxesFor(grade, [{ name: 'i', value: 5 }], ['grade[i][0] = 1;']), {
      row: undefined,
      col: undefined,
    });
  });

  it('sem código não chuta', () => {
    assert.deepEqual(matrixAxesFor(grade, ij, [undefined]), { row: undefined, col: undefined });
  });
});

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
