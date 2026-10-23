import * as assert from 'node:assert/strict';
import { explainFlow } from '../src/model/flow';

// Linhas tiradas do BubbleSort.java, na sequência que o Java Debugger real devolveu.
const forI = { line: 6, code: 'for (int i = 0; i < numeros.length - 1; i++) {' };
const forJ = { line: 7, code: 'for (int j = 0; j < numeros.length - 1 - i; j++) {' };
const ifLine = { line: 8, code: 'if (numeros[j] > numeros[j + 1]) {' };
const temp = { line: 9, code: 'int temp = numeros[j];' };
const last = { line: 11, code: 'numeros[j + 1] = temp;' };
const print = { line: 16, code: 'System.out.println(java.util.Arrays.toString(numeros));' };

describe('explainFlow', () => {
  it('if verdadeiro entra no bloco', () => {
    assert.match(explainFlow(ifLine, temp)!, /linha 8 foi verdadeira/);
  });

  it('if falso pula o bloco', () => {
    assert.match(explainFlow(ifLine, { line: 12, code: '}' })!, /linha 8 foi falsa/);
  });

  it('laço que continua e laço que termina', () => {
    assert.match(explainFlow(forJ, ifLine)!, /linha 7 é verdadeira/);
    assert.match(explainFlow(forI, print)!, /linha 6 ficou falsa: o laço terminou/);
  });

  it('fim do corpo volta para o cabeçalho do laço', () => {
    assert.equal(explainFlow(last, forJ), 'Fim de uma volta do laço: o programa voltou para a linha 7.');
  });

  it('break', () => {
    assert.equal(explainFlow({ line: 11, code: 'break;' }, { line: 15, code: 'x();' }), 'O break interrompeu o laço.');
  });

  it('linha comum, sem código ou sem passo anterior não gera frase', () => {
    assert.equal(explainFlow(temp, { line: 10 }), undefined);
    assert.equal(explainFlow({ line: 8 }, temp), undefined);
    assert.equal(explainFlow(undefined, temp), undefined);
  });

  it('else if conta como condição', () => {
    assert.match(explainFlow({ line: 4, code: '} else if (x > 2) {' }, { line: 5 })!, /verdadeira/);
  });
});
