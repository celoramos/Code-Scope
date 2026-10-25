// @ts-check
// Variáveis soltas e ponteiros.
import { el, t, varsEl } from './dom.js';
import { colorOf } from './state.js';
/** @typedef {import('./types.js').Pointer} Pointer */
/** @typedef {import('./types.js').Scalar} Scalar */
/** @typedef {import('./types.js').Change} Change */

/**
 * Variáveis simples: inteiros primeiro, depois boolean, char, String...
 * Os inteiros desenhados como seta levam a cor da seta.
 * @param {Pointer[]} pointers
 * @param {Scalar[]} scalars
 * @param {Change[]} changes
 * @param {Set<string>} arrowNames
 * @param {Record<string, string>} [shadows] nomes que escondem outra variável, com o valor da escondida
 */
export function renderVars(pointers, scalars, changes, arrowNames, shadows = {}) {
  const vars = changes.filter((c) => c.kind === 'pointer' || c.kind === 'scalar');
  const changed = new Set(vars.map((c) => c.name));
  // Quem acabou de nascer entra com destaque; quem saiu de escopo fica um passo, apagado.
  const born = new Set(vars.filter((c) => c.from === undefined).map((c) => c.name));
  /** @param {string} n @param {string} v */
  const chip = (n, v) => {
    const li = el('li', changed.has(n) ? 'var is-changed' : 'var');
    if (born.has(n)) li.classList.add('is-born');
    const name = el('span', 'var-name');
    name.textContent = `${n} =`;
    const value = el('span', 'var-value');
    value.textContent = v;
    li.append(name, value);
    if (shadows[n] !== undefined) {
      const hides = el('span', 'var-note');
      hides.textContent = t('hides', n, shadows[n]);
      li.append(hides);
    }
    return li;
  };
  const gone = vars
    .filter((c) => c.to === undefined && c.from !== undefined)
    .map((c) => {
      const li = chip(c.name ?? '', String(c.from));
      li.className = 'var is-gone';
      const note = el('span', 'var-note');
      note.textContent = t('outOfScope');
      li.append(note);
      return li;
    });
  varsEl.replaceChildren(
    ...pointers.map((p) => {
      const li = chip(p.name, String(p.value));
      if (arrowNames.has(p.name)) {
        li.classList.add('is-pointer');
        li.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(p.name)})`);
      }
      return li;
    }),
    ...scalars.map((sc) => chip(sc.name, sc.value)),
    ...gone,
  );
}
