import type { Snapshot } from './snapshot';

/*
 * Texto lido letra por letra (palavra.charAt(i), palavra[i], fatias) vira uma
 * fileira de caixas, uma por letra, como um array de char: aí a seta do i
 * mostra qual letra o código está lendo. Texto que o código só imprime ou
 * compara continua como valor simples.
 */

/** Textos maiores que isto continuam como valor: uma frase inteira não cabe na barra lateral. */
const MAX_LETTERS = 40;

/** O código lê este texto por posição em algum lugar do arquivo? */
export function readsLetters(source: string, name: string): boolean {
  const n = name.replace(/\$/g, '\\$');
  return new RegExp(`\\b${n}\\s*(?:\\.\\s*(?:charAt|substring|substr|slice|codePointAt|charCodeAt)\\s*\\(|\\[)|\\bin\\s+${n}\\b|\\bof\\s+${n}\\b|\\b${n}\\s*\\.\\s*toCharArray\\s*\\(`).test(source);
}

/** Letras de um texto como o debugger mostra ("'radar'", "\"radar\""), já entre aspas simples. */
export function letters(value: string): string[] | undefined {
  const m = /^(["'`])([\s\S]*)\1$/.exec(value);
  if (!m) return undefined;
  const text = m[2].replace(/\\(["'\\])/g, '$1');
  return [...text].map((ch) => `'${ch}'`);
}

/** Troca os textos lidos letra por letra por fileiras de letras. */
export function applyTextRoles(snapshot: Snapshot, source: string): void {
  const keep = [];
  for (const v of snapshot.scalars ?? []) {
    const chars = letters(v.value);
    if (chars && chars.length <= MAX_LETTERS && readsLetters(source, v.name)) {
      snapshot.arrays.push({ name: v.name, values: chars, length: chars.length, kind: 'text' });
    } else {
      keep.push(v);
    }
  }
  if (snapshot.scalars) snapshot.scalars = keep;
}
