import * as assert from 'node:assert/strict';
import { answers, predictionFor, sameAnswer } from '../src/model/predict';
import type { Snapshot } from '../src/model/snapshot';

const s = (code: string): Snapshot => ({
  file: 'BubbleSort.java',
  line: 9,
  code,
  arrays: [{ name: 'numeros', values: ['5', '1', '4'], length: 3 }],
  pointers: [{ name: 'j', value: 0 }],
});

describe('modo de adivinhar', () => {
  it('pergunta pela variável que a linha muda', () => {
    assert.deepEqual(predictionFor(s('int temp = numeros[j];')), { target: 'temp' });
    assert.deepEqual(predictionFor(s('soma = soma + numero;')), { target: 'soma' });
    assert.deepEqual(predictionFor(s('total += 2;')), { target: 'total' });
    assert.deepEqual(predictionFor(s('const meio = Math.floor((inicio + fim) / 2);')), { target: 'meio' });
    assert.deepEqual(predictionFor(s('inteiro = total // pessoas')), { target: 'inteiro' });
    assert.deepEqual(predictionFor(s('i++;')), { target: 'i' });
  });

  it('pergunta pela posição do array, com o índice calculado', () => {
    assert.deepEqual(predictionFor(s('numeros[j + 1] = temp;')), { target: 'numeros[1]' });
  });

  it('não pergunta em linha que não atribui', () => {
    assert.equal(predictionFor(s('if (numeros[j] > numeros[j + 1]) {')), undefined);
    assert.equal(predictionFor(s('System.out.println(soma);')), undefined);
    assert.equal(predictionFor(s('return resultado;')), undefined);
  });

  it('respostas do passo e comparação tolerante', () => {
    assert.equal(answers(s('x'))['numeros[2]'], '4');
    assert.equal(answers(s('x')).j, '0');
    assert.ok(sameAnswer('7', '7.0'));
    assert.ok(sameAnswer('Ana', '"Ana"'));
    assert.ok(sameAnswer(' 3,5 ', '3.5'));
    assert.ok(sameAnswer('true', 'True'));
    assert.ok(!sameAnswer('6', '7'));
    assert.ok(!sameAnswer('', '0'));
  });
});
