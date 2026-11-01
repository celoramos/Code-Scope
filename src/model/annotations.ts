import { answers, sameAnswer } from './predict';
import type { Snapshot } from './snapshot';

/*
 * Exercícios e notas do professor moram no próprio código, em comentários. Assim
 * funcionam em qualquer linguagem, nas duas IDEs, e quem ensina só precisa de um
 * editor de texto:
 *
 *   // @exercise Some todos os números do array.
 *   // @expect soma = 15
 *   // @note Repare até onde o laço vai.
 *
 * Em português também valem @exercicio, @espera e @nota. Em Python, com #.
 */

export interface Expectation {
  /** Variável ou posição, como o painel escreve: "soma", "numeros[2]". */
  name: string;
  value: string;
}

export interface Exercise {
  goal: string;
  expects: Expectation[];
}

export interface Annotations {
  exercise?: Exercise;
  /** Notas por linha do arquivo, a partir de 1. */
  notes: Map<number, string[]>;
}

export interface ExerciseCheck extends Expectation {
  /** Valor no passo conferido; undefined quando a variável não existe nele. */
  actual?: string;
  ok: boolean;
}

export interface ExerciseView {
  goal: string;
  checks: ExerciseCheck[];
  /** Primeiro passo em que tudo bateu ao mesmo tempo. */
  doneAt?: number;
}

const TAG = /(?:\/\/|#)\s*@(exerc[ií]cio|exercise|expect|espera|note|nota)\b:?\s*(.*)$/i;

export function parseAnnotations(source: string): Annotations {
  const notes = new Map<number, string[]>();
  let goal: string | undefined;
  const expects: Expectation[] = [];
  /** Nota em linha própria: vale para a próxima linha de código. */
  let waiting: string[] = [];
  source.split(/\r?\n/).forEach((text, i) => {
    const m = TAG.exec(text);
    const line = i + 1;
    if (!m) {
      if (waiting.length > 0 && isCode(text)) {
        addNotes(notes, line, waiting);
        waiting = [];
      }
      return;
    }
    const tag = m[1].toLowerCase();
    const body = m[2].trim();
    if (tag === 'note' || tag === 'nota') {
      if (isCode(text.slice(0, m.index))) addNotes(notes, line, [body]);
      else waiting.push(body);
    } else if (tag === 'expect' || tag === 'espera') {
      const e = /^(.+?)\s*==?\s*(.+)$/.exec(body);
      if (e) expects.push({ name: e[1].trim(), value: e[2].trim() });
    } else {
      goal = body;
    }
  });
  return { notes, ...(goal !== undefined ? { exercise: { goal, expects } } : {}) };
}

function isCode(text: string): boolean {
  const t = text.trim();
  return t !== '' && !/^(\/\/|#|\/\*|\*)/.test(t);
}

function addNotes(notes: Map<number, string[]>, line: number, added: string[]) {
  notes.set(line, [...(notes.get(line) ?? []), ...added.filter(Boolean)]);
}

/** "[1,2]" e "[1, 2]" são a mesma resposta; números e aspas seguem a regra do modo de adivinhar. */
function sameValue(expected: string, actual: string): boolean {
  return sameAnswer(expected, actual) || expected.replace(/\s+/g, '') === actual.replace(/\s+/g, '');
}

function checksAt(exercise: Exercise, s: Snapshot): ExerciseCheck[] {
  const values = answers(s);
  return exercise.expects.map((e) => {
    const actual = values[e.name];
    return { ...e, ...(actual !== undefined ? { actual } : {}), ok: actual !== undefined && sameValue(e.value, actual) };
  });
}

/**
 * Confere o exercício nos passos até agora: basta um passo com tudo certo, porque
 * no fim do programa as variáveis já saíram de escopo.
 */
export function checkExercise(exercise: Exercise | undefined, past: readonly Snapshot[], first = 1): ExerciseView | undefined {
  if (!exercise) return undefined;
  if (exercise.expects.length > 0) {
    for (const [k, s] of past.entries()) {
      const checks = checksAt(exercise, s);
      if (checks.every((c) => c.ok)) return { goal: exercise.goal, checks, doneAt: first + k };
    }
  }
  const last = past.at(-1);
  return { goal: exercise.goal, checks: last ? checksAt(exercise, last) : [] };
}
