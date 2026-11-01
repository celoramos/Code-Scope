// @ts-check
// Busca no histórico: ir ao passo em que uma variável mudou ou a uma linha com um texto.
import { byId, status, t, vscode } from './dom.js';

const form = /** @type {HTMLFormElement} */ (byId('find'));
const input = /** @type {HTMLInputElement} */ (byId('find-input'));
const prev = byId('find-prev');

/** @param {1 | -1} dir */
function find(dir) {
  const query = input.value.trim();
  if (query !== '') vscode.postMessage({ type: 'find', query, dir });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  find(1);
});
prev.addEventListener('click', () => find(-1));

/** @param {string} query */
export function findMissed(query) {
  status.textContent = t('findMiss', query);
}
