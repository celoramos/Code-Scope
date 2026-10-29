import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { indexNames } from '../src/model/indexNames';
import { arrowsFor } from '../src/model/pointers';

const sample = (file: string) => fs.readFileSync(path.join(__dirname, '..', 'samples', file), 'utf8');
const has = (names: Set<string>, ...expected: string[]) => expected.forEach((n) => assert.ok(names.has(n), `${n} deveria ser posição: ${[...names].join(', ')}`));
const hasNot = (names: Set<string>, ...unexpected: string[]) => unexpected.forEach((n) => assert.ok(!names.has(n), `${n} não é posição`));

describe('posição pelo código (indexNames)', () => {
  it('bubble sort: i e j são posição', () => {
    has(indexNames(sample('java/BubbleSort.java')), 'i', 'j');
  });

  it('busca binária: meio está nos colchetes, e inicio e fim entram na conta dele', () => {
    const names = indexNames(sample('java/BuscaBinaria.java'));
    has(names, 'meio', 'inicio', 'fim');
    hasNot(names, 'alvo');
  });

  it('soma das notas: i é posição, soma não (soma = soma + notas[i] lê um valor)', () => {
    const names = indexNames(sample('java/ForaDoLimite.java'));
    has(names, 'i');
    hasNot(names, 'soma');
  });

  it('Python e JavaScript: range(len(v)), Math.floor e listas por método', () => {
    has(indexNames(sample('python/busca_binaria.py')), 'meio', 'inicio', 'fim');
    has(indexNames(sample('javascript/buscaBinaria.js')), 'meio', 'inicio', 'fim');
    has(indexNames('lista.insert(pos, "x")\nprint(lista.get(k))\nc = texto.charAt(n)'), 'pos', 'k', 'n');
    hasNot(indexNames('lista.add("leite")'), 'leite');
  });

  it('só posição vira seta; sem o código, vale o valor como antes', () => {
    const arr = { name: 'notas', values: ['7', '9', '6'], length: 3 };
    const pointers = [{ name: 'i', value: 1 }, { name: 'maior', value: 2 }];
    assert.deepEqual(arrowsFor(arr, pointers, new Set(), ['i']), [{ name: 'i', index: 1 }]);
    assert.deepEqual(arrowsFor(arr, pointers, new Set()).map((a) => a.name), ['i', 'maior']);
  });
});
