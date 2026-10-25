// @ts-check
// Entrada do painel: mensagens da extensão, navegação pelos passos e o desenho de cada passo.
import { animateBlock, createBlock, createMatrixBlock, setNames, updateArrows, updateBlock, updateCellObjects, updateFocus, updateMarkers, updateMatrix, updateMissing } from './arrays.js';
import { renderCallTree, renderCalls } from './calls.js';
import { highlightCode, renderCode, renderCondition, renderError } from './code.js';
import { renderStats } from './cost.js';
import { arraysEl, backBtn, basename, callsEl, codeEl, counter, el, empty, emptyTitle, endedBadge, explanationEl, fileEl, forwardBtn, heapEl, isString, liveBtn, mapsEl, status, t, timeline, toolbar, traceEl, varsEl, vscode } from './dom.js';
import { renderHeap } from './heap.js';
import { cssArrived } from './image.js';
import { renderMaps } from './maps.js';
import { checkGuess, renderPredict } from './predict.js';
import { blocks, current, pointerColor, setCurrent } from './state.js';
import { renderTrace } from './trace.js';
import { renderVars } from './vars.js';
/** @typedef {import('./types.js').Frame} Frame */

/** Multiplicador das durações em CSS; 0 desliga o movimento. */
const SPEED = { slow: 2, normal: 1, fast: 0.5, off: 0 };

const EMPTY_TITLE = { idle: t('idle'), running: t('running'), ended: t('ended') };

/** @type {'idle' | 'running' | 'ended'} */
let session = 'idle';
/** @type {string | undefined} */
let error;

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'render') {
    error = undefined;
    render(msg.frame);
  } else if (msg.type === 'session') {
    session = msg.state;
  } else if (msg.type === 'settings') {
    document.documentElement.style.setProperty('--cs-speed', String(SPEED[msg.animationSpeed] ?? 1));
  } else if (msg.type === 'reset') {
    reset();
  } else if (msg.type === 'error') {
    error = msg.text;
  } else if (msg.type === 'css') {
    cssArrived(msg.text);
    return;
  }
  updateChrome();
});

backBtn.addEventListener('click', () => vscode.postMessage({ type: 'back' }));
forwardBtn.addEventListener('click', () => vscode.postMessage({ type: 'forward' }));
liveBtn.addEventListener('click', () => gotoStep(Infinity));
// "input" dispara a cada movimento do controle: arrastar a linha do tempo passa pelos passos.
timeline.addEventListener('input', () => gotoStep(Number(timeline.value)));
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || !current) return;
  // O slider já trata as setas sozinho; aqui só os atalhos do resto do painel.
  if (e.target === timeline) return;
  if (e.key === 'ArrowLeft') vscode.postMessage({ type: 'back' });
  else if (e.key === 'ArrowRight') vscode.postMessage({ type: 'forward' });
  else if (e.key === 'Home') gotoStep(1);
  else if (e.key === 'End') gotoStep(Infinity);
  else return;
  e.preventDefault();
});

/** @param {number} step */
export function gotoStep(step) {
  if (!current) return;
  vscode.postMessage({ type: 'goto', step: Math.min(step, current.total) });
}

/** Estado vazio, selo de sessão encerrada e a linha de status. */
function updateChrome() {
  empty.hidden = Boolean(current);
  emptyTitle.textContent = EMPTY_TITLE[session];
  toolbar.hidden = !current;
  endedBadge.hidden = session !== 'ended';

  const parts = [];
  if (error) parts.push(error);
  // Só avisa quando não há nada para desenhar: sem arrays, sem variáveis e sem chamadas.
  const s = current?.snapshot;
  if (s && s.arrays.length === 0 && s.pointers.length === 0 && !(s.scalars ?? []).length && callsEl.hidden && heapEl.hidden && mapsEl.hidden) parts.push(t('noArrays'));
  status.textContent = parts.join(' ');
  status.classList.toggle('is-error', Boolean(error));
}

function reset() {
  setCurrent(undefined);
  error = undefined;
  for (const block of blocks.values()) block.remove();
  blocks.clear();
  pointerColor.clear();
  varsEl.replaceChildren();
  explanationEl.replaceChildren();
  codeEl.replaceChildren();
}

/** @param {Frame} frame */
function render(frame) {
  setCurrent(frame);
  const s = frame.snapshot;
  const arrowNames = new Set([
    ...Object.values(frame.arrows).flatMap((list) => list.map((a) => a.name)),
    ...Object.values(frame.axes ?? {}).flatMap((ax) => [ax.row?.name, ax.col?.name].filter(isString)),
  ]);

  counter.textContent = t('step', frame.step, frame.total);
  timeline.max = String(frame.total);
  timeline.value = String(frame.step);
  timeline.disabled = frame.total <= 1;
  timeline.setAttribute('aria-valuetext', t('step', frame.step, frame.total));
  timeline.style.setProperty('--progress', String(frame.total > 1 ? (frame.step - 1) / (frame.total - 1) : 1));
  backBtn.disabled = frame.step <= 1;
  forwardBtn.disabled = frame.step >= frame.total;
  liveBtn.hidden = frame.step >= frame.total;
  fileEl.textContent = basename(s.file);
  renderCode(frame.executed, { line: s.line, code: s.code });
  renderCondition(s.condition);
  renderPredict(frame, checkGuess(frame));

  explanationEl.replaceChildren(
    ...frame.explanation.map((text) => {
      const li = el('li', 'explanation-item');
      li.append(...highlightCode(text));
      return li;
    }),
  );
  renderError(frame.error);
  renderCalls(s.calls ?? [], frame.calls ?? []);
  renderCallTree(frame.callTree);
  renderVars(s.pointers, s.scalars ?? [], frame.changes, arrowNames, frame.shadows);
  renderTrace(frame.trace, frame.step);

  // Dois nomes para o mesmo array (b = a): um desenho só, com os dois nomes.
  /** @type {Map<string, string[]>} */
  const aliasNames = new Map();
  for (const arr of s.arrays) if (arr.id) aliasNames.set(arr.id, [...(aliasNames.get(arr.id) ?? []), arr.name]);
  const seen = new Set();
  for (const arr of s.arrays) {
    const names = (arr.id && aliasNames.get(arr.id)) || [arr.name];
    if (names[0] !== arr.name) continue;
    seen.add(arr.name);
    const kind = arr.rows ? 'matrix' : arr.kind === 'stack' || arr.kind === 'queue' ? arr.kind : 'array';
    let block = blocks.get(arr.name);
    if (block && block.dataset.kind !== kind) {
      block.remove();
      block = undefined;
    }
    const isNew = !block;
    if (!block) {
      block = kind === 'matrix' ? createMatrixBlock(arr.name) : createBlock(arr.name, kind);
      block.dataset.kind = kind;
      blocks.set(arr.name, block);
    }
    arraysEl.appendChild(block); // mantém a ordem das variáveis
    setNames(block, names);
    if (kind === 'matrix') {
      updateMatrix(block, arr, frame.axes[arr.name] ?? {}, frame.changes, isNew);
    } else {
      updateBlock(block, arr);
      animateBlock(block, arr.name, frame.changes, isNew);
      if (kind === 'array') updateMissing(block, arr.name, frame.error?.missing);
      if (kind === 'array') updateArrows(block, frame.arrows[arr.name] ?? []);
      else updateMarkers(block, kind);
      if (kind === 'array') updateFocus(block, frame.focus?.[arr.name]);
      updateCellObjects(block, frame.heap?.cells?.[arr.name], frame.heapDelta);
    }
  }
  for (const [name, block] of blocks) {
    if (!seen.has(name)) {
      block.remove();
      blocks.delete(name);
    }
  }
  renderStats(frame.stats);
  renderMaps(s.maps ?? [], frame.changes, frame.graphs ?? []);
  renderHeap(frame.heap, frame.heapDelta);
}

// Aberto ou fechado, o teste de mesa fica como o aluno deixou.
/** @type {{ traceOpen?: boolean, predict?: object }} */
const saved = vscode.getState() ?? {};
if (saved.traceOpen === false) traceEl.open = false;
traceEl.addEventListener('toggle', () => vscode.setState({ ...(vscode.getState() ?? {}), traceOpen: traceEl.open }));

updateChrome();
vscode.postMessage({ type: 'ready' });
