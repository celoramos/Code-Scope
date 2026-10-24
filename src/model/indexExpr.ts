import type { Snapshot } from './snapshot';

/**
 * Lê o código da linha para saber que posição de um array ela usa. Só o
 * que dá para calcular sem rodar o programa: números, inteiros do snapshot,
 * "+", "-", "*", "/" e o tamanho de um array (arr.length, len(arr),
 * arr.size()). Qualquer outra coisa devolve undefined.
 */

export interface IndexAccess {
  array: string;
  /** O texto entre os colchetes, como está no código. */
  expr: string;
  index?: number;
}

/** "notas[i + 1]" e "grade[i][j]" (só o primeiro nível) na linha. */
export function indexAccesses(code: string | undefined, snapshot: Snapshot): IndexAccess[] {
  if (!code) return [];
  const names = new Set(snapshot.arrays.map((a) => a.name));
  const out: IndexAccess[] = [];
  for (const m of stripStrings(code).matchAll(/([A-Za-z_$][\w$]*)\s*\[([^[\]]+)\]/g)) {
    if (!names.has(m[1])) continue;
    out.push({ array: m[1], expr: m[2].trim(), index: evalIndex(m[2], snapshot) });
  }
  return out;
}

/** Valor de uma expressão de índice simples, ou undefined se não der para saber. */
export function evalIndex(expr: string, snapshot: Snapshot): number | undefined {
  const values = new Map(snapshot.pointers.map((p) => [p.name, p.value]));
  const lengths = new Map(snapshot.arrays.map((a) => [a.name, a.length]));
  const text = expr
    .trim()
    // Divisão inteira do Python; em JavaScript "//" seria comentário.
    .replace(/\/\//g, '/')
    .replace(/\bMath\s*\.\s*floor\b/g, '')
    // Tamanho de coleção nas três linguagens.
    .replace(/\blen\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g, (_, n: string) => String(lengths.get(n) ?? 'NaN'))
    .replace(/([A-Za-z_$][\w$]*)\s*\.\s*(?:length|size\s*\(\s*\))/g, (_, n: string) => String(lengths.get(n) ?? 'NaN'))
    .replace(/[A-Za-z_$][\w$]*/g, (n) => (values.has(n) ? `(${values.get(n)})` : 'NaN'));
  if (!/^[\d\s+\-*/()]+$/.test(text)) return undefined;
  try {
    // Só dígitos, espaços, parênteses e + - * /: seguro de calcular.
    const v = Function(`"use strict"; return (${text});`)() as number;
    return Number.isFinite(v) ? Math.trunc(v) : undefined;
  } catch {
    return undefined;
  }
}

/** Troca o conteúdo de textos entre aspas por espaços, para "a[0]" dentro de uma string não contar. */
function stripStrings(code: string): string {
  return code.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (s) => ' '.repeat(s.length));
}
