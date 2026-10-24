import * as assert from 'node:assert/strict';
import { algorithmStats, arrayFocus, growthTable, rangeNote } from '../src/model/focus';
import type { Snapshot } from '../src/model/snapshot';

const ordenado = { name: 'ordenado', values: ['3', '8', '12', '17', '21', '25', '30', '42'], length: 8 };
const busca = (inicio: number, fim: number, meio?: number): Snapshot => ({
  file: 'BuscaBinaria.java',
  line: 11,
  arrays: [ordenado],
  pointers: [
    { name: 'inicio', value: inicio },
    { name: 'fim', value: fim },
    ...(meio === undefined ? [] : [{ name: 'meio', value: meio }]),
  ],
  ...(meio === undefined
    ? {}
    : { condition: { keyword: 'if' as const, line: 11, text: 'ordenado[meio] == alvo', parts: [{ text: 'ordenado[meio] == alvo' }], ops: [] } }),
});

describe('comparação e intervalo', () => {
  it('a condição que compara posições marca essas posições', () => {
    assert.deepEqual(arrayFocus(busca(0, 7, 3)).ordenado?.compare, [3]);
  });

  it('inicio e fim marcam o pedaço que a busca ainda olha', () => {
    assert.deepEqual(arrayFocus(busca(4, 7)).ordenado?.range, { from: 4, to: 7, names: ['inicio', 'fim'] });
  });

  it('diz quanto a busca descartou e quando não sobrou nada', () => {
    assert.equal(rangeNote(busca(0, 7), busca(4, 7), 'pt'), 'A busca descartou 4 posições de ordenado: agora só olha de 4 a 7.');
    assert.equal(rangeNote(busca(4, 4), busca(5, 4), 'en'), 'No position of ordenado is left to look at: the search ended without finding it.');
  });

  it('conta comparações entre posições e trocas desde o começo', () => {
    const swap = (values: string[], withCondition: boolean): Snapshot => ({
      file: 'BubbleSort.java',
      line: 8,
      arrays: [{ name: 'numeros', values, length: values.length }],
      pointers: [{ name: 'j', value: 0 }],
      ...(withCondition ? { condition: { keyword: 'if' as const, line: 8, text: 'numeros[j] > numeros[j + 1]', parts: [], ops: [] } } : {}),
    });
    const stats = algorithmStats([swap(['5', '1'], true), swap(['1', '5'], false), swap(['1', '5'], true)]);
    assert.equal(stats.comparisons, 2);
    assert.equal(stats.swaps, 1);
    assert.equal(stats.size, 2);
    assert.deepEqual(stats.curves?.map((c) => c.size), [2, 1000]);
  });

  it('valores das curvas para um n', () => {
    assert.deepEqual(growthTable(8), { log: 3, n: 8, nlogn: 24, n2: 64 });
    assert.deepEqual(growthTable(1000), { log: 10, n: 1000, nlogn: 9966, n2: 1000000 });
  });

});
