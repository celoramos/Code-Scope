// @ts-check
// Teste de mesa.
import { el, t, traceCountEl, traceEl, traceHiddenEl, traceTableEl, traceTitleEl } from './dom.js';
import { gotoStep } from './main.js';
/** @typedef {import('./types.js').Trace} Trace */

/**
 * Teste de mesa: refeito a cada passo, porque voltar no histórico também
 * encolhe a tabela. A linha atual fica marcada e visível.
 * @param {Trace | undefined} trace
 * @param {number} step
 */
export function renderTrace(trace, step) {
  traceEl.hidden = !trace || trace.columns.length === 0;
  if (!trace || traceEl.hidden) return;
  traceTitleEl.textContent = t('traceTitle');
  traceCountEl.textContent = t('traceSteps', trace.rows.length + trace.hidden);
  traceHiddenEl.hidden = trace.hidden === 0;
  traceHiddenEl.textContent = t('traceHidden', trace.hidden);

  const head = el('thead', '');
  const headRow = el('tr', '');
  for (const label of [t('traceStep'), t('traceLine'), ...(trace.showCalls ? [t('traceCall')] : [])]) {
    const th = el('th', 'trace-meta');
    th.setAttribute('scope', 'col');
    th.textContent = label;
    headRow.append(th);
  }
  for (const name of trace.columns) {
    const th = el('th', 'trace-var');
    th.setAttribute('scope', 'col');
    th.textContent = name;
    headRow.append(th);
  }
  head.append(headRow);

  const body = el('tbody', '');
  /** @type {HTMLElement | undefined} */
  let currentRow;
  for (const row of trace.rows) {
    const tr = el('tr', row.step === step ? 'is-current' : '');
    if (row.step === step) currentRow = tr;
    const stepCell = el('th', 'trace-meta');
    stepCell.setAttribute('scope', 'row');
    const go = el('button', 'trace-goto');
    go.setAttribute('type', 'button');
    go.textContent = String(row.step);
    go.setAttribute('aria-label', t('traceGoto', row.step));
    go.addEventListener('click', () => gotoStep(row.step));
    stepCell.append(go);
    const lineCell = el('td', 'trace-meta');
    lineCell.textContent = String(row.line);
    tr.append(stepCell, lineCell);
    if (trace.showCalls) {
      const callCell = el('td', 'trace-meta trace-call');
      callCell.textContent = row.call ?? '';
      tr.append(callCell);
    }
    row.values.forEach((value, i) => {
      const td = el('td', row.changed[i] ? 'trace-value is-changed' : 'trace-value');
      td.textContent = value ?? '';
      if (value != null) td.title = value;
      tr.append(td);
    });
    body.append(tr);
  }
  traceTableEl.replaceChildren(head, body);
  if (traceEl.open) currentRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
