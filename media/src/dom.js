// @ts-check
// API do VS Code, textos traduzidos, elementos do painel e utilidades de DOM.

// @ts-expect-error acquireVsCodeApi é injetado pelo VS Code
export const vscode = acquireVsCodeApi();

export const empty = byId('empty');
export const emptyTitle = byId('empty-title');
export const toolbar = byId('toolbar');
export const counter = byId('counter');
export const timeline = /** @type {HTMLInputElement} */ (byId('timeline'));
export const backBtn = /** @type {HTMLButtonElement} */ (byId('back'));
export const forwardBtn = /** @type {HTMLButtonElement} */ (byId('forward'));
export const liveBtn = byId('live');
export const fileEl = byId('file');
export const codeEl = byId('code');
export const conditionEl = byId('condition');
export const endedBadge = byId('ended');
export const status = byId('status');
export const explanationEl = byId('explanation');
export const varsEl = byId('vars');
export const arraysEl = byId('arrays');
export const heapEl = byId('heap');
export const callTreeEl = byId('call-tree');
export const statsEl = byId('stats');
export const mapsEl = byId('maps');
export const callsEl = byId('calls');
export const callsTitleEl = byId('calls-title');
export const callsCountEl = byId('calls-count');
export const callsRuleEl = byId('calls-rule');
export const callStackEl = byId('call-stack');
export const errorEl = byId('error');
export const errorTitleEl = byId('error-title');
export const errorTextEl = byId('error-text');
export const errorRawEl = byId('error-raw');
export const traceEl = /** @type {HTMLDetailsElement} */ (byId('trace'));
export const traceTitleEl = byId('trace-title');
export const traceCountEl = byId('trace-count');
export const traceHiddenEl = byId('trace-hidden');
export const traceTableEl = byId('trace-table');
export const costEl = byId('cost');
export const costTitleEl = byId('cost-title');
export const costHeadEl = byId('cost-head');
export const costRowsEl = byId('cost-rows');
export const costProgramEl = byId('cost-program');

/** Textos no idioma do VS Code, que a extensão põe no HTML. */
/** @type {Record<string, string>} */
const T = JSON.parse(byId('strings').textContent || '{}');
// O CSS escreve "vazia" dentro da pilha e da fila sem itens.
document.documentElement.style.setProperty('--cs-empty-label', JSON.stringify(t('empty')));

/**
 * Texto traduzido, trocando {0}, {1}... pelos valores.
 * @param {string} key
 * @param {...(string | number)} args
 */
export function t(key, ...args) {
  return (T[key] ?? key).replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)]));
}

/** @param {string} id */
export function byId(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * @param {string} tag
 * @param {string} className
 */
export function el(tag, className) {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}

/** @param {unknown} v @returns {v is string} */
export function isString(v) {
  return typeof v === 'string';
}

/** @param {string} path */
export function basename(path) {
  return path.split(/[\\/]/).pop() || path;
}
