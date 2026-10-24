import { MESSAGES, type Language } from './messages';
import type { ArrayVar, Snapshot } from './snapshot';

/*
 * Mudar no lugar ou criar outro: x.sort() arruma a própria lista, sorted(x)
 * cria uma nova e deixa x como estava. Texto nunca muda no lugar: s.trim()
 * sozinho numa linha cria um texto novo que ninguém guarda, e s continua
 * igual. A frase aparece no passo em que a linha rodou, com os nomes dela.
 */

const NAME = '[A-Za-z_$][\\w$]*';
/** Métodos de texto que devolvem um texto novo. */
const TEXT_NEW =
  'toUpperCase|toLowerCase|trim|strip|replace|replaceAll|concat|substring|repeat|padStart|padEnd|upper|lower|capitalize|title|lstrip|rstrip|ToUpper|ToLower|Trim|Replace|Substring';
/** Métodos de lista que devolvem uma lista nova. */
const LIST_NEW = 'concat|slice|map|filter|toSorted|toReversed|toSpliced|copy|clone|ToList|ToArray';
/** Métodos e funções que arrumam a própria lista. */
const IN_PLACE = 'sort|reverse|Sort|Reverse';

/** Linha que só chama um método, sem guardar o resultado: "s.trim();". */
const BARE_CALL = new RegExp(`^(${NAME})\\.(${TEXT_NEW}|${LIST_NEW})\\(.*\\)\\s*;?$`);
const BARE_SORTED = new RegExp(`^(sorted|reversed)\\(\\s*(${NAME})\\s*\\)$`);
/** x.sort(), Arrays.sort(x), Collections.reverse(x), Array.Sort(x). */
const SORT_METHOD = new RegExp(`^(${NAME})\\.(${IN_PLACE})\\(.*\\)\\s*;?$`);
const SORT_STATIC = new RegExp(`^(?:Arrays|Collections|Array)\\.(${IN_PLACE})\\(\\s*(${NAME})\\b.*\\)\\s*;?$`);
/** Atribuição: "y = ...", "int[] y = ...", "const y = ...", "List<Integer> y = ...". */
const ASSIGN = new RegExp(`^(?:[\\w<>\\[\\],.?\\s]+\\s)?(${NAME})\\s*=(?!=)\\s*(.+?)\\s*;?$`);

/** Quem a expressão copia: "sorted(x)", "x[:]", "[...x]", "x.slice()", "Arrays.copyOf(x, n)", "new ArrayList<>(x)". */
function copySource(rhs: string): string | undefined {
  const patterns = [
    new RegExp(`^(?:sorted|list|reversed)\\(\\s*(${NAME})\\s*\\)$`),
    new RegExp(`^(${NAME})\\[\\s*:\\s*\\]$`),
    new RegExp(`^\\[\\s*\\.\\.\\.(${NAME})\\s*\\]$`),
    new RegExp(`^(${NAME})\\.(?:${LIST_NEW})\\(.*\\)$`),
    new RegExp(`^Arrays\\.copyOf(?:Range)?\\(\\s*(${NAME})\\b.*\\)$`),
    new RegExp(`^new\\s+\\w+(?:<.*>)?\\(\\s*(${NAME})\\s*\\)$`),
  ];
  for (const p of patterns) {
    const m = p.exec(rhs);
    if (m) return m[1];
  }
  return undefined;
}

const textOf = (name: string, s: Snapshot): string | undefined => {
  const v = s.scalars?.find((x) => x.name === name)?.value;
  if (v !== undefined && /^(["']).*\1$/s.test(v)) return v;
  const arr = s.arrays.find((a) => a.name === name && a.kind === 'text');
  return arr ? `"${arr.values.map((c) => c.slice(1, -1)).join('')}"` : undefined;
};

const sameValues = (a: ArrayVar | undefined, b: ArrayVar | undefined) =>
  !!a && !!b && a.length === b.length && a.values.join('\u0000') === b.values.join('\u0000');

export function mutationNotes(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  const code = prev?.code?.trim();
  if (!prev || !code) return [];
  const m = MESSAGES[language];
  const python = /\.py$/i.test(next.file);
  const end = python ? '' : ';';
  const call = code.replace(/\s*;$/, '');

  // Texto ou lista novos que ninguém guardou.
  const bare = BARE_CALL.exec(code);
  if (bare) {
    const [, name] = bare;
    const before = textOf(name, prev);
    if (before !== undefined && before === textOf(name, next)) return [m.discardedText(name, call, before, `${name} = ${call}${end}`)];
    const arr = next.arrays.find((a) => a.name === name);
    if (arr && arr.kind !== 'text' && sameValues(prev.arrays.find((a) => a.name === name), arr)) {
      return [m.discardedList(name, call, `${name} = ${call}${end}`)];
    }
  }
  const sorted = BARE_SORTED.exec(code);
  if (sorted && sameValues(prev.arrays.find((a) => a.name === sorted[2]), next.arrays.find((a) => a.name === sorted[2]))) {
    return [m.discardedList(sorted[2], call, `${sorted[2]} = ${call}`)];
  }

  // Arrumou a própria lista: quem aponta para ela também vê.
  // O estático vem antes: "Arrays.sort(v)" também parece um método de uma lista chamada Arrays.
  const statik = SORT_STATIC.exec(code);
  const method = statik ? undefined : SORT_METHOD.exec(code);
  if (statik || method) {
    const name = statik ? statik[2] : (method as RegExpExecArray)[1];
    const after = next.arrays.find((a) => a.name === name);
    if (after && !sameValues(prev.arrays.find((a) => a.name === name), after)) {
      const other = after.id ? next.arrays.find((a) => a.name !== name && a.id === after.id)?.name : undefined;
      return [m.inPlace(name, call, other)];
    }
    return [];
  }

  // Cópia: o alvo é uma lista nova e a de origem continua como estava.
  const assign = ASSIGN.exec(code);
  if (assign) {
    const [, target, rhs] = assign;
    const source = copySource(rhs.trim());
    const made = next.arrays.find((a) => a.name === target);
    const src = next.arrays.find((a) => a.name === source);
    if (source && source !== target && made && src && !(made.id && made.id === src.id) && sameValues(prev.arrays.find((a) => a.name === source), src)) {
      return [m.newCopy(target, source, rhs.trim())];
    }
    // Texto novo guardado em outra variável: a de origem não mudou.
    const textCall = new RegExp(`^(${NAME})\\.(?:${TEXT_NEW})\\(.*\\)$`).exec(rhs.trim());
    if (textCall && textCall[1] !== target) {
      const before = textOf(textCall[1], prev);
      if (before !== undefined && before === textOf(textCall[1], next) && textOf(target, next) !== undefined) {
        return [m.newText(target, textCall[1], rhs.trim(), before)];
      }
    }
  }
  return [];
}
