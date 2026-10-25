// @ts-check
// Linhas de código, condição e cartão de erro.
import { codeEl, conditionEl, el, errorEl, errorRawEl, errorTextEl, errorTitleEl, t } from './dom.js';
import { current } from './state.js';
/** @typedef {import('./types.js').LineRef} LineRef */
/** @typedef {import('./types.js').Condition} Condition */
/** @typedef {import('./types.js').ErrorView} ErrorView */

/**
 * A linha que acabou de rodar e a próxima. O debugger para antes de executar
 * a linha marcada no editor, e é a linha anterior que causou as mudanças.
 * @param {LineRef | undefined} executed
 * @param {LineRef} next
 */
export function renderCode(executed, next) {
  /** @type {HTMLElement[]} */
  const rows = [];
  if (executed) rows.push(...codeRow(t('executed'), executed, 'is-executed'));
  rows.push(...codeRow(t('nextLine'), next, 'is-next'));
  codeEl.replaceChildren(...rows);
}

/**
 * A condição da próxima linha quebrada nas partes, cada uma com o valor que
 * vai dar. As partes que o curto-circuito pula ficam apagadas.
 * @param {Condition | undefined} c
 */
export function renderCondition(c) {
  conditionEl.hidden = !c;
  if (!c) {
    conditionEl.replaceChildren();
    return;
  }
  const title = el('p', 'condition-title');
  title.textContent = t('condTitle', c.line);
  const list = el('ol', 'condition-parts');
  c.parts.forEach((part, k) => {
    if (k > 0) {
      const op = el('li', 'condition-op');
      op.textContent = c.ops[k - 1] === '||' ? t('condOr') : t('condAnd');
      list.append(op);
    }
    const li = el('li', `condition-part${part.skipped ? ' is-skipped' : ''}`);
    const code = el('code', 'code');
    code.textContent = part.text;
    li.append(code);
    if (part.values) {
      const values = el('span', 'condition-values');
      values.textContent = part.values;
      li.append(values);
    }
    li.append(verdict(part.skipped ? undefined : part.value, part.skipped));
    list.append(li);
  });
  conditionEl.replaceChildren(title, list);
  if (c.parts.length > 1 && c.result !== undefined) {
    const result = el('p', 'condition-result');
    result.append(document.createTextNode(`${t('condResult')}: `), verdict(c.result, false));
    conditionEl.append(result);
  }
}

/**
 * @param {boolean | undefined} value
 * @param {boolean | undefined} skipped
 */
function verdict(value, skipped) {
  const v = el('span', `verdict ${skipped ? 'is-skipped' : value === true ? 'is-true' : value === false ? 'is-false' : 'is-unknown'}`);
  v.textContent = skipped ? t('condSkipped') : value === true ? t('condTrue') : value === false ? t('condFalse') : t('condUnknown');
  return v;
}

/**
 * @param {string} label
 * @param {LineRef} ref
 * @param {string} modifier
 */
function codeRow(label, ref, modifier) {
  const dt = el('dt', `code-label ${modifier}`);
  dt.textContent = label;
  const dd = el('dd', `code-line ${modifier}`);
  const num = el('span', 'code-num');
  num.textContent = String(ref.line);
  const text = el('code', 'code-text');
  text.textContent = ref.code ?? '';
  text.title = ref.code ?? '';
  dd.append(num, text);
  return [dt, dd];
}

/**
 * Destaca "arr[2]" e nomes de variáveis conhecidos dentro da frase,
 * sem passar texto do debug por innerHTML.
 * @param {string} text
 */
export function highlightCode(text) {
  const s = current?.snapshot;
  const known = new Set([
    ...(s?.arrays.map((a) => a.name) ?? []),
    ...(s?.pointers.map((p) => p.name) ?? []),
    ...(s?.refs?.map((r) => r.name) ?? []),
    ...(s?.maps?.map((m) => m.name) ?? []),
    ...(s?.scalars?.map((v) => v.name) ?? []),
    // Quem acabou de sair de escopo não está mais no snapshot, mas aparece na frase.
    ...(current?.changes.map((c) => c.name ?? c.array ?? '') ?? []),
  ]);
  /** @type {(string | HTMLElement)[]} */
  const out = [];
  let last = 0;
  // "turma[1].nota" e "inicio.proximo" viram um trecho de código só.
  for (const m of text.matchAll(/[A-Za-z_$][\w$]*((?:\[\d+\])+)?((?:\.[A-Za-z_$][\w$]*)+)?/g)) {
    const root = m[0].split(/[.[]/)[0];
    if (!m[1] && !known.has(root)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    const code = el('code', 'code');
    code.textContent = m[0];
    out.push(code);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Erro que parou o programa: o que aconteceu em palavras simples e, embaixo,
 * a mensagem original do debugger, para o aluno aprender a ler as duas.
 * @param {ErrorView | undefined} error
 */
export function renderError(error) {
  errorEl.hidden = !error;
  if (!error) return;
  errorTitleEl.textContent = error.title;
  errorEl.classList.toggle('is-handled', !!error.handled);
  errorTextEl.replaceChildren(
    ...error.sentences.map((text) => {
      const li = el('li', 'error-item');
      li.append(...highlightCode(text));
      return li;
    }),
  );
  errorRawEl.textContent = [error.type, error.message].filter(Boolean).join(': ');
  errorRawEl.hidden = !errorRawEl.textContent;
}
