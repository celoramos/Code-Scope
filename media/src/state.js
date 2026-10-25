// @ts-check
// Estado compartilhado entre as partes do painel.
/** @typedef {import('./types.js').Frame} Frame */

/** Quantas cores de ponteiro o CSS declara (--cs-ptr-0 até --cs-ptr-3). */
const POINTER_COLORS = 4;
/** Passo desenhado agora. Quem importa lê o valor atual; só setCurrent troca. */
/** @type {Frame | undefined} */
export let current;

/** @param {Frame | undefined} frame */
export function setCurrent(frame) {
  current = frame;
}

/** Um bloco por array, reaproveitado entre passos para poder animar. */
/** @type {Map<string, HTMLElement>} */
export const blocks = new Map();
/** Cada ponteiro guarda a cor da primeira vez que apareceu: i é sempre azul. */
/** @type {Map<string, number>} */
export const pointerColor = new Map();

/** @param {string} name */
export function colorOf(name) {
  let c = pointerColor.get(name);
  if (c === undefined) {
    c = pointerColor.size % POINTER_COLORS;
    pointerColor.set(name, c);
  }
  return c;
}

/** @param {HTMLElement} block */
export function cellsOf(block) {
  return /** @type {HTMLElement[]} */ (Array.from(block.querySelectorAll('.cell:not(.ghost):not(.is-missing)')));
}
