import { evalIndex } from './indexExpr';
import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Pegadinhas de número que todo iniciante encontra: a divisão de inteiros que
 * some com a parte decimal, o // do Python, o 0.1 + 0.2 que não dá 0.3 e o
 * int que passa do limite e vira negativo. A frase aparece no passo em que
 * a pegadinha acontece, com os números do próprio programa.
 */

/** Linguagens em que inteiro / inteiro dá inteiro. */
const INT_DIVISION = /\.(java|c|h|cpp|cc|cxx|hpp|cs|go|rs|kt|scala)$/i;
/** O maior int de 32 bits: passar dele dá a volta para o negativo. */
const INT_MAX = 2147483647;

export function numberNotes(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  if (!prev) return [];
  const m = MESSAGES[language];
  const out: string[] = [];
  const code = prev.code ?? '';

  // Divisão: a linha que acabou de rodar divide duas coisas que o passo anterior sabia calcular.
  // Comentário sai antes: no Python é #, e // é divisão; nas outras, // começa comentário.
  const bare = /\.py$/i.test(next.file) ? code.replace(/#.*$/, '') : code.replace(/\/\/.*$/, '');
  const div = /([\w.[\]()]+)\s*(\/\/|\/)(?!=)\s*([\w.[\]()]+)/.exec(bare);
  if (div) {
    const a = evalIndex(div[1], prev);
    const b = evalIndex(div[3], prev);
    const isInt = (s: string) => /^[A-Za-z_]\w*$/.test(s) ? prev.pointers.some((p) => p.name === s) : /^-?\d+$/.test(s);
    if (a !== undefined && b !== undefined && b !== 0 && isInt(div[1]) && isInt(div[3]) && a % b !== 0) {
      const exact = String(Math.round((a / b) * 10000) / 10000);
      if (div[2] === '//') out.push(m.floorDivision(a, b, Math.floor(a / b), exact));
      else if (INT_DIVISION.test(next.file)) out.push(m.intDivision(a, b, Math.trunc(a / b), exact));
    }
  }

  // Número com vírgula que não deu redondo: 0.30000000000000004, 0.7999999999999999.
  const before = new Map((prev.scalars ?? []).map((v) => [v.name, v.value]));
  for (const v of next.scalars ?? []) {
    if (before.get(v.name) === v.value) continue;
    if (/^-?\d+\.\d*(0{6,}|9{6,})\d+$/.test(v.value)) out.push(m.floatPrecision(v.name, v.value));
  }

  // int que passou do limite e deu a volta.
  const old = new Map(prev.pointers.map((p) => [p.name, p.value]));
  for (const p of next.pointers) {
    const was = old.get(p.name);
    if (was === undefined) continue;
    if ((was > INT_MAX - 1e6 && p.value < 0) || (was < -INT_MAX + 1e6 && p.value > 0)) out.push(m.overflow(p.name, was, p.value));
  }
  return out;
}
