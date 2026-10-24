import * as assert from 'node:assert/strict';
import { readExceptionInfo, uncaughtFilter, withFilter } from '../src/debug/exceptionFilters';
import { classifyError, explainError } from '../src/model/errors';
import { evalIndex, indexAccesses } from '../src/model/indexExpr';
import type { Snapshot } from '../src/model/snapshot';

const notas: Snapshot = {
  file: 'ForaDoLimite.java',
  line: 8,
  code: 'soma = soma + notas[i];',
  arrays: [{ name: 'notas', values: ['7', '9', '6'], length: 3 }],
  pointers: [
    { name: 'i', value: 3 },
    { name: 'soma', value: 22 },
  ],
};

describe('índices no código', () => {
  it('calcula expressões simples com os inteiros do passo', () => {
    assert.equal(evalIndex('i', notas), 3);
    assert.equal(evalIndex('i - 1', notas), 2);
    assert.equal(evalIndex('notas.length - 1', notas), 2);
    assert.equal(evalIndex('len(notas)', notas), 3);
    assert.equal(evalIndex('(i + soma) // 2', notas), 12);
    assert.equal(evalIndex('Math.floor((i + 1) / 2)', notas), 2);
  });

  it('não calcula o que depende de chamada ou variável desconhecida', () => {
    assert.equal(evalIndex('pegar(i)', notas), undefined);
    assert.equal(evalIndex('k + 1', notas), undefined);
    assert.equal(evalIndex('i = 2', notas), undefined);
  });

  it('acha arr[expr] da linha, ignorando textos entre aspas', () => {
    assert.deepEqual(indexAccesses('print("notas[0]", notas[i])', notas), [{ array: 'notas', expr: 'i', index: 3 }]);
  });
});

describe('erros', () => {
  it('classifica pelo tipo e pela mensagem, nas três linguagens', () => {
    assert.equal(classifyError({ type: 'ArrayIndexOutOfBoundsException', message: 'Index 3 out of bounds for length 3' }), 'index');
    assert.equal(classifyError({ type: 'IndexError', message: 'list index out of range' }), 'index');
    assert.equal(classifyError({ type: 'TypeError', message: "Cannot read properties of undefined (reading 'nome')" }), 'null');
    assert.equal(classifyError({ type: 'NullPointerException', message: '' }), 'null');
    assert.equal(classifyError({ type: 'ZeroDivisionError', message: 'division by zero' }), 'zero');
    assert.equal(classifyError({ type: 'RangeError', message: 'Maximum call stack size exceeded' }), 'recursion');
    assert.equal(classifyError({ type: 'KeyError', message: "'x'" }), 'key');
    assert.equal(classifyError({ type: 'TypeError', message: 'x is not iterable' }), 'type');
    assert.equal(classifyError({ type: 'Weird', message: '' }), 'other');
  });

  it('índice fora do limite: diz a posição pedida, as que existem e onde olhar', () => {
    const view = explainError({ ...notas, exception: { type: 'ArrayIndexOutOfBoundsException', message: 'Index 3 out of bounds for length 3' } }, 'pt');
    assert.deepEqual(view?.missing, { array: 'notas', index: 3 });
    assert.equal(view?.title, 'Erro: ArrayIndexOutOfBoundsException');
    assert.equal(view?.sentences[0], 'notas[i] tentou usar a posição 3, mas notas só tem as posições de 0 a 2.');
    assert.match(view?.sentences[1] ?? '', /<=/);
  });

  it('JavaScript: undefined vindo de uma posição que não existe', () => {
    const alunos: Snapshot = {
      file: 'foraDoLimite.js',
      line: 7,
      code: "nomes = nomes + alunos[i].nome + ' ';",
      arrays: [{ name: 'alunos', values: ['{…}', '{…}'], length: 2, kind: 'list' }],
      pointers: [{ name: 'i', value: 2 }],
      exception: { type: 'TypeError', message: "Cannot read properties of undefined (reading 'nome')" },
    };
    const view = explainError(alunos, 'en');
    assert.deepEqual(view?.missing, { array: 'alunos', index: 2 });
    assert.equal(view?.sentences[0], 'alunos[i] tried to use position 2, but alunos only has positions 0 to 1.');
    assert.match(view?.sentences[1] ?? '', /undefined/);
  });

  it('erro sem posição na linha usa a explicação do tipo', () => {
    const view = explainError({ ...notas, code: 'x = a / b;', exception: { type: 'ArithmeticException', message: '/ by zero' } }, 'pt');
    assert.equal(view?.kind, 'zero');
    assert.equal(view?.missing, undefined);
    assert.match(view?.sentences[0] ?? '', /^Divisão por zero/);
  });

  it('sem exceção, sem cartão', () => {
    assert.equal(explainError(notas, 'pt'), undefined);
  });
});

describe('exceptionInfo', () => {
  it('Java: nome completo da classe vira o nome curto', () => {
    assert.deepEqual(
      readExceptionInfo({ exceptionId: 'java.lang.ArrayIndexOutOfBoundsException', description: 'Index 3 out of bounds for length 3' }),
      { type: 'ArrayIndexOutOfBoundsException', message: 'Index 3 out of bounds for length 3' },
    );
  });

  it('Java real: mensagem entre aspas com o nome completo na frente', () => {
    assert.deepEqual(
      readExceptionInfo({
        exceptionId: 'java.lang.ArrayIndexOutOfBoundsException',
        description: '"java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3"',
      }),
      { type: 'ArrayIndexOutOfBoundsException', message: 'Index 3 out of bounds for length 3' },
    );
  });

  it('JavaScript: separa "TypeError: ..." e descarta a pilha', () => {
    const text = "TypeError: Cannot read properties of undefined (reading 'nome')";
    assert.deepEqual(readExceptionInfo({ exceptionId: text, description: `${text}
    at listarNomes (foraDoLimite.js:7:38)` }), {
      type: 'TypeError',
      message: "Cannot read properties of undefined (reading 'nome')",
    });
  });

  it('Python: tipo e mensagem nos detalhes', () => {
    assert.deepEqual(readExceptionInfo({ exceptionId: 'IndexError', description: 'list index out of range', details: { typeName: 'IndexError', message: 'list index out of range' } }), {
      type: 'IndexError',
      message: 'list index out of range',
    });
  });
});

describe('pausa em erros', () => {
  it('escolhe o filtro de exceções não tratadas de cada debugger', () => {
    assert.equal(uncaughtFilter([{ filter: 'caught' }, { filter: 'uncaught' }]), 'uncaught');
    assert.equal(uncaughtFilter([{ filter: 'raised' }, { filter: 'uncaught' }, { filter: 'userUnhandled' }]), 'uncaught');
    assert.equal(uncaughtFilter([{ filter: 'all' }]), undefined);
  });

  it('acrescenta o filtro sem tirar o que o usuário marcou', () => {
    assert.deepEqual(withFilter({ filters: ['caught'] }, 'uncaught'), { filters: ['caught', 'uncaught'] });
    assert.deepEqual(withFilter(undefined, 'uncaught'), { filters: ['uncaught'] });
    assert.equal(withFilter({ filters: ['uncaught'] }, 'uncaught'), undefined);
    assert.deepEqual(withFilter({ filters: [], filterOptions: [{ filterId: 'all' }] }, 'uncaught'), {
      filters: [],
      filterOptions: [{ filterId: 'all' }, { filterId: 'uncaught' }],
    });
  });
});
