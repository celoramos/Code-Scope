import * as assert from 'node:assert/strict';
import { evaluateCondition } from '../src/debug/conditionEval';
import type { Session } from '../src/debug/dapCollector';
import { combine, explainCondition, isSafe, parseCondition, substitute } from '../src/model/condition';
import type { Snapshot } from '../src/model/snapshot';

const busca: Snapshot = {
  file: 'BuscaLinear.java',
  line: 9,
  code: 'if (valores[i] == alvo) {',
  arrays: [{ name: 'valores', values: ['12', '7', '3', '25'], length: 4 }],
  pointers: [
    { name: 'i', value: 3 },
    { name: 'alvo', value: 25 },
    { name: 'n', value: 4 },
  ],
};

describe('condições', () => {
  it('acha a condição do if, do while, do else if e do meio do for', () => {
    assert.equal(parseCondition('if (valores[i] == alvo) {', 'c')?.text, 'valores[i] == alvo');
    assert.equal(parseCondition('} else if (ordenado[meio] < alvo) {', 'c')?.text, 'ordenado[meio] < alvo');
    assert.equal(parseCondition('while (atual != null) {', 'c')?.text, 'atual != null');
    assert.equal(parseCondition('for (int i = 0; i < numeros.length - 1; i++) {', 'c')?.text, 'i < numeros.length - 1');
    assert.equal(parseCondition('for (int v : valores) {', 'c'), undefined);
    assert.equal(parseCondition('elif ordenado[meio] < alvo:', 'python')?.keyword, 'elif');
    assert.equal(parseCondition('for i in range(10):', 'python'), undefined);
    assert.equal(parseCondition('soma = soma + 1;', 'c'), undefined);
  });

  it('quebra em && e ||, e em and e or no Python, fora de parênteses', () => {
    assert.deepEqual(parseCondition('while (i < n && (a || b)) {', 'c'), {
      keyword: 'while',
      text: 'i < n && (a || b)',
      parts: ['i < n', 'a || b'],
      ops: ['&&'],
    });
    assert.deepEqual(parseCondition('if inicio <= fim and not achou:', 'python')?.parts, ['inicio <= fim', 'not achou']);
  });

  it('só avalia o que não muda nada no programa', () => {
    assert.ok(isSafe('i < n'));
    assert.ok(isSafe('valores[i] == alvo'));
    assert.ok(isSafe('palavra.equals("sol")'));
    assert.ok(isSafe('len(fila) > 0'));
    assert.ok(!isSafe('i++ < n'));
    assert.ok(!isSafe('(x = 3) > 0'));
    assert.ok(!isSafe('lista.remove(0) != null'));
    assert.ok(!isSafe('pegar(i) > 0'));
  });

  it('troca os nomes pelos valores do passo', () => {
    assert.equal(substitute('valores[i] == alvo', busca), '25 == 25');
    assert.equal(substitute('i < valores.length - 1', busca), '3 < 4 - 1');
    assert.equal(substitute('outra > 0', busca), undefined);
  });

  it('tamanho de uma linha da matriz vira o número, não o texto da linha', () => {
    const grade: Snapshot = {
      file: 'Matriz.java',
      line: 10,
      arrays: [
        {
          name: 'grade',
          values: ['[1, 2, 3]', '[4, 5]'],
          length: 2,
          rows: [
            { name: 'grade[0]', values: ['1', '2', '3'], length: 3 },
            { name: 'grade[1]', values: ['4', '5'], length: 2 },
          ],
        },
      ],
      pointers: [
        { name: 'i', value: 1 },
        { name: 'j', value: 0 },
      ],
    };
    assert.equal(substitute('j < grade[i].length', grade), '0 < 2');
    assert.equal(substitute('j < len(grade[i])', grade), '0 < 2');
    assert.equal(substitute('j < grade[0].size()', grade), '0 < 3');
  });

  it('nome dentro de texto entre aspas continua como está', () => {
    const s: Snapshot = { file: 'a.js', line: 1, arrays: [], pointers: [], scalars: [{ name: 'nome', value: '"ana"' }] };
    assert.equal(substitute('nome == "nome"', s), '"ana" == "nome"');
    assert.equal(substitute("nome == 'it\\'s nome'", s), "\"ana\" == 'it\\'s nome'");
    assert.equal(substitute('nome == `nome`', s), '"ana" == `nome`');
  });

  it('junta como a linguagem: && antes de ||', () => {
    assert.equal(combine([true, false], ['&&']), false);
    assert.equal(combine([false, true], ['||']), true);
    assert.equal(combine([false, undefined, true], ['&&', '||']), true);
    assert.equal(combine([true, undefined], ['&&']), undefined);
  });

  it('respeita o curto-circuito: arr[i] não é perguntado quando i < n já deu falso', async () => {
    const asked: string[] = [];
    const session: Session = {
      async customRequest(command: string, args?: any) {
        assert.equal(command, 'evaluate');
        asked.push(args.expression);
        return { result: args.expression === 'i < n' ? 'false' : 'true' };
      },
    };
    const parsed = parseCondition('while (i < n && valores[i] != alvo) {', 'c')!;
    const info = await evaluateCondition(session, 1, parsed, busca);
    assert.deepEqual(asked, ['i < n']);
    assert.equal(info.result, false);
    assert.equal(info.parts[1].skipped, true);
    assert.deepEqual(explainCondition(info, 'pt'), [
      'A condição da linha 9 vai dar falso: o laço termina.',
      'Como i < n deu falso, o resto da condição nem é testado: o resultado já está decidido.',
    ]);
  });
});
