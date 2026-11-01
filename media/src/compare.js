// @ts-check
// Esta sessão ao lado de uma sessão salva: passos, comparações e trocas.
import { byId, t, vscode } from './dom.js';
/** @typedef {import('./types.js').Frame} Frame */

const compareEl = byId('compare');
const titleEl = byId('compare-title');
const headEl = byId('compare-head');
const rowsEl = byId('compare-rows');
const noteEl = byId('compare-note');

byId('compare-session').addEventListener('click', () => vscode.postMessage({ type: 'open-session', compare: true }));
byId('open-session').addEventListener('click', () => vscode.postMessage({ type: 'open-session', compare: false }));
byId('save-session').addEventListener('click', () => vscode.postMessage({ type: 'save-session' }));
byId('compare-close').addEventListener('click', () => vscode.postMessage({ type: 'compare-close' }));

/** @param {Frame['compare']} compare */
export function renderCompare(compare) {
  compareEl.hidden = !compare;
  if (!compare) return;
  const { current, saved } = compare;
  titleEl.textContent = t('compareTitle');
  headEl.replaceChildren(
    ...['', `${t('compareCurrent')} (${current.file})`, `${t('compareSaved')} (${saved.file})`].map((text) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = text;
      return th;
    }),
  );
  rowsEl.replaceChildren(
    ...[
      [t('compareSteps'), current.steps, saved.steps],
      [t('compareComparisons'), current.comparisons, saved.comparisons],
      [t('compareSwaps'), current.swaps, saved.swaps],
    ].map(([label, a, b]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = String(label);
      const cells = [a, b].map((value) => {
        const td = document.createElement('td');
        td.textContent = String(value);
        return td;
      });
      tr.append(th, ...cells);
      return tr;
    }),
  );
  const gap = current.comparisons - saved.comparisons;
  noteEl.textContent = gap === 0 ? t('compareSame') : t('compareFewer', gap < 0 ? current.file : saved.file, Math.abs(gap));
}
