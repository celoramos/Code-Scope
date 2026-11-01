// @ts-check
// Exercício do arquivo, notas do professor e o nível detalhado da explicação.
import { byId, el, t, vscode } from './dom.js';
/** @typedef {import('./types.js').Frame} Frame */

const exerciseEl = byId('exercise');
const exerciseTitle = byId('exercise-title');
const exerciseGoal = byId('exercise-goal');
const exerciseChecks = byId('exercise-checks');
const exerciseStatus = byId('exercise-status');
const notesEl = byId('notes');
const notesTitle = byId('notes-title');
const notesList = byId('notes-list');
const detailsEl = byId('details');
const detailsToggle = byId('details-toggle');

/** Ligado ou desligado, fica como a pessoa deixou. */
let detailsOn = Boolean((vscode.getState() ?? {}).details);
/** @type {string[]} */
let lastDetails = [];

detailsToggle.addEventListener('click', () => {
  detailsOn = !detailsOn;
  vscode.setState({ ...(vscode.getState() ?? {}), details: detailsOn });
  renderDetails(lastDetails);
});

/** @param {Frame['exercise']} exercise */
export function renderExercise(exercise) {
  exerciseEl.hidden = !exercise;
  if (!exercise) return;
  exerciseEl.classList.toggle('is-done', exercise.doneAt !== undefined);
  exerciseTitle.textContent = t('exerciseTitle');
  exerciseGoal.textContent = exercise.goal;
  exerciseChecks.replaceChildren(
    ...exercise.checks.map((c) => {
      const li = el('li', c.ok ? 'exercise-check is-ok' : 'exercise-check');
      li.textContent = c.actual === undefined ? t('exerciseMissing', c.name, c.value) : `${t('exerciseCheck', c.name, c.actual)}${c.ok ? '' : ` (${c.value})`}`;
      return li;
    }),
  );
  const pending = exercise.checks.length > 0 ? t('exercisePending') : '';
  exerciseStatus.textContent = exercise.doneAt !== undefined ? t('exerciseDone', exercise.doneAt) : pending;
}

/** @param {string[]} notes */
export function renderNotes(notes) {
  notesEl.hidden = notes.length === 0;
  notesTitle.textContent = t('notesTitle');
  notesList.replaceChildren(
    ...notes.map((text) => {
      const li = el('li', 'notes-item');
      li.textContent = text;
      return li;
    }),
  );
}

/** @param {string[]} details */
export function renderDetails(details) {
  lastDetails = details;
  detailsToggle.setAttribute('aria-pressed', String(detailsOn));
  detailsToggle.classList.toggle('is-on', detailsOn);
  detailsEl.hidden = !detailsOn || details.length === 0;
  detailsEl.replaceChildren(
    ...details.map((text) => {
      const li = el('li', 'details-item');
      li.textContent = text;
      return li;
    }),
  );
}
