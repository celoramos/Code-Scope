import { evalIndex } from './indexExpr';
import type { Snapshot } from './snapshot';
import { traceValues } from './trace';

/*
 * Modo de adivinhar: antes de a linha rodar, o painel pergunta quanto vai
 * valer a variável que ela muda. Chutar antes de ver é o que faz o aluno
 * pensar no código, em vez de só assistir.
 */

export interface Prediction {
  /** O que perguntar: "soma" ou "numeros[3]". Também é a chave da resposta no passo seguinte. */
  target: string;
}

/** Palavras que começam linha mas não são atribuição. */
const NOT_ASSIGNMENT = /^(if|else|for|while|return|print|console|System|def|class|switch|case|do|try|catch|elif)\b/;

/** A variável (ou posição) que a linha vai mudar, se der para saber só lendo. */
export function predictionFor(s: Snapshot): Prediction | undefined {
  const code = s.code?.trim().replace(/;\s*$/, '');
  if (!code || NOT_ASSIGNMENT.test(code)) return undefined;

  // numeros[j] = temp, grade[i][j] += 1 (só o primeiro índice).
  const cell = /^([A-Za-z_$][\w$]*)\s*\[([^\]]+)\]\s*(?:[+\-*/%]?=)(?!=)/.exec(code);
  if (cell) {
    const arr = s.arrays.find((a) => a.name === cell[1] && !a.rows);
    const i = arr ? evalIndex(cell[2], s) : undefined;
    return arr && i !== undefined && i >= 0 && i < arr.length ? { target: `${cell[1]}[${i}]` } : undefined;
  }
  // i++, ++i, i--.
  const step = /^(?:([A-Za-z_$][\w$]*)\s*(\+\+|--)|(\+\+|--)\s*([A-Za-z_$][\w$]*))$/.exec(code);
  if (step) return { target: step[1] ?? step[4] };
  // soma = soma + x, int temp = numeros[j], const meio = ..., total += 2.
  const assign = /^(?:(?:final\s+)?(?:const|let|var|[A-Za-z_$][\w$<>,\s]*?(?:\[\])*)\s+)?([A-Za-z_$][\w$]*)\s*(?:[+\-*/%]|\/\/)?=(?!=)/.exec(code);
  if (assign) return { target: assign[1] };
  return undefined;
}

/**
 * Respostas que o painel pode precisar conferir no passo: o valor de cada
 * variável e de cada posição de array, como texto.
 */
export function answers(s: Snapshot): Record<string, string> {
  const out: Record<string, string> = Object.fromEntries(traceValues(s));
  for (const a of s.arrays) {
    if (a.rows) continue;
    a.values.forEach((v, i) => (out[`${a.name}[${i}]`] = v));
  }
  return out;
}

/** Compara o palpite com a resposta sem ligar para aspas, espaços e 7 contra 7.0. */
export function sameAnswer(guess: string, actual: string): boolean {
  const clean = (s: string) => s.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
  const a = clean(guess);
  const b = clean(actual);
  if (a === b) return true;
  const na = Number(a.replace(',', '.'));
  const nb = Number(b.replace(',', '.'));
  if (a !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return a.toLowerCase() === b.toLowerCase() && /^(true|false)$/i.test(a);
}
