import * as assert from 'node:assert/strict';
import { checkExercise, parseAnnotations } from '../src/model/annotations';
import { stepDetails } from '../src/model/details';
import { History } from '../src/model/history';
import { findStep, parseSession, serializeSession, summarizeSession } from '../src/model/session';
import type { Snapshot } from '../src/model/snapshot';

function snap(line: number, soma: number, numeros: string[] = [], code?: string): Snapshot {
  return { line, file: 'C:/aluno/pasta/Soma.java', code, arrays: [{ name: 'numeros', values: numeros, length: numeros.length }], pointers: [{ name: 'soma', value: soma }] };
}

describe('anotações no código', () => {
  it('lê exercício e expectativas nos dois idiomas', () => {
    const java = parseAnnotations('// @exercise Some tudo.\n// @expect soma = 15\nint soma = 0;\n// @espera numeros[0] == 1\n');
    assert.deepEqual(java.exercise, {
      goal: 'Some tudo.',
      expects: [
        { name: 'soma', value: '15' },
        { name: 'numeros[0]', value: '1' },
      ],
    });
    assert.equal(parseAnnotations('# @exercicio Ache o maior.\n').exercise?.goal, 'Ache o maior.');
  });

  it('nota em linha própria vale para a próxima linha de código', () => {
    const { notes } = parseAnnotations('int a = 1;\n// @note Olhe aqui.\n\nint b = 2;\n');
    assert.deepEqual([...notes.entries()], [[4, ['Olhe aqui.']]]);
  });

  it('nota no fim da linha vale para a própria linha', () => {
    const { notes } = parseAnnotations('x = 1  # @nota Começa em um.\n');
    assert.deepEqual(notes.get(1), ['Começa em um.']);
  });

  it('sem anotações, nada de exercício', () => {
    assert.equal(parseAnnotations('int a = 1; // comentário comum').exercise, undefined);
  });
});

describe('conferência do exercício', () => {
  const exercise = { goal: 'Some', expects: [{ name: 'soma', value: '15' }] };

  it('sem exercício, não há o que mostrar', () => {
    assert.equal(checkExercise(undefined, [snap(1, 0)]), undefined);
  });

  it('mostra o valor de agora enquanto não bate', () => {
    const view = checkExercise(exercise, [snap(1, 0), snap(2, 10)]);
    assert.equal(view?.doneAt, undefined);
    assert.deepEqual(view?.checks, [{ name: 'soma', value: '15', actual: '10', ok: false }]);
  });

  it('um passo com tudo certo basta, mesmo que o valor mude depois', () => {
    const view = checkExercise(exercise, [snap(1, 0), snap(2, 15), snap(3, 0)]);
    assert.equal(view?.doneAt, 2);
  });

  it('variável que não existe não passa', () => {
    const view = checkExercise({ goal: 'x', expects: [{ name: 'total', value: '1' }] }, [snap(1, 1)]);
    assert.equal(view?.checks[0].ok, false);
    assert.equal(view?.checks[0].actual, undefined);
  });

  it('compara arrays sem ligar para espaços', () => {
    const view = checkExercise({ goal: 'x', expects: [{ name: 'numeros', value: '[1,2]' }] }, [snap(1, 0, ['1', '2'])]);
    assert.equal(view?.doneAt, 1);
  });

  it('exercício sem expectativa nunca se dá por pronto', () => {
    assert.equal(checkExercise({ goal: 'Leia', expects: [] }, [snap(1, 0)])?.doneAt, undefined);
  });
});

describe('nível detalhado', () => {
  it('escreve linhas e mudanças', () => {
    const details = stepDetails(
      [
        { kind: 'set', array: 'v', index: 1, from: '5', to: '3' },
        { kind: 'swap', array: 'v', a: 0, b: 1, steps: 1 },
        { kind: 'pointer', name: 'i', from: 0, to: 1 },
      ],
      snap(9, 0),
      8,
      'pt',
    );
    assert.deepEqual(details, ['linha 8 → 9', 'v[1]: 5 → 3', 'v[0] ↔ v[1]', 'i: 0 → 1']);
  });

  it('conta as chamadas em andamento', () => {
    const s = { ...snap(3, 0), calls: [{ name: 'f', line: 1, vars: [] }, { name: 'f', line: 2, vars: [] }] };
    assert.deepEqual(stepDetails([], s, undefined, 'en'), ['line 3', '2 calls running']);
  });
});

describe('sessão salva', () => {
  it('ida e volta, sem as pastas do computador', () => {
    const back = parseSession(serializeSession([snap(1, 0), snap(2, 1)]));
    assert.equal(back?.length, 2);
    assert.equal(back?.[0].file, 'Soma.java');
  });

  it('recusa o que não é sessão', () => {
    assert.equal(parseSession('{}'), undefined);
    assert.equal(parseSession('não é json'), undefined);
    assert.equal(parseSession(JSON.stringify({ format: 'code-scope-session', version: 1, snapshots: [] })), undefined);
    assert.equal(parseSession(JSON.stringify({ format: 'code-scope-session', version: 99, snapshots: [snap(1, 0)] })), undefined);
  });

  it('o histórico carrega a sessão a partir do primeiro passo', () => {
    const history = new History();
    history.load([snap(1, 0), snap(2, 1)]);
    assert.equal(history.current()?.index, 1);
    assert.equal(history.current()?.total, 2);
  });

  it('resumo para comparar', () => {
    assert.deepEqual(summarizeSession([snap(1, 0), snap(2, 1)]), { file: 'Soma.java', steps: 2, comparisons: 0, swaps: 0 });
  });
});

describe('busca no histórico', () => {
  const steps = [snap(1, 0, [], 'int soma = 0;'), snap(2, 0, [], 'for (x)'), snap(3, 5, [], 'soma += x;'), snap(4, 5, [], 'print(soma)')];

  it('variável: vai ao passo em que ela mudou', () => {
    assert.equal(findStep(steps, 0, 'soma', 1), 2);
    assert.equal(findStep(steps, 3, 'soma', -1), 2);
  });

  it('texto: vai à linha que contém', () => {
    assert.equal(findStep(steps, 0, 'PRINT', 1), 3);
  });

  it('sem resultado', () => {
    assert.equal(findStep(steps, 3, 'soma', 1), undefined);
    assert.equal(findStep(steps, 0, 'nada', 1), undefined);
    assert.equal(findStep(steps, 0, '  ', 1), undefined);
  });

  it('o histórico anda até o passo achado', () => {
    const history = new History();
    steps.forEach((s) => history.push(s));
    history.goto(1);
    assert.equal(history.find('soma', 1), true);
    assert.equal(history.current()?.index, 3);
    assert.equal(history.find('soma', 1), false);
    assert.equal(history.current()?.index, 3);
  });
});
