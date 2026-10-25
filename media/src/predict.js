// @ts-check
// Modo de adivinhar.
import { byId, t, vscode } from './dom.js';
import { current } from './state.js';
/** @typedef {import('./types.js').Frame} Frame */

// ---------- Modo de adivinhar ----------
// O palpite fica guardado até o passo seguinte chegar; o placar fica no estado do painel.
/** @type {{ step: number, target: string, guess: string } | undefined} */
let pending;
/** @type {{ on?: boolean, right?: number, total?: number }} */
const predictState = { ...((vscode.getState() ?? {}).predict ?? {}) };
const predictToggle = byId('predict-toggle');
const predictEl = byId('predict');
const predictForm = /** @type {HTMLFormElement} */ (byId('predict-form'));
const predictQuestion = byId('predict-question');
const predictInput = /** @type {HTMLInputElement} */ (byId('predict-input'));
const predictStatus = byId('predict-status');

function savePredict() {
  vscode.setState({ ...(vscode.getState() ?? {}), predict: predictState });
}

predictToggle.addEventListener('click', () => {
  predictState.on = !predictState.on;
  pending = undefined;
  savePredict();
  if (current) renderPredict(current, undefined);
});

predictForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const guess = predictInput.value.trim();
  if (!current?.prediction || guess === '') return;
  pending = { step: current.step, target: current.prediction.target, guess };
  predictForm.hidden = true;
  predictStatus.textContent = t('predictSaved', pending.target, guess);
  vscode.postMessage({ type: 'focus-editor' });
});

/**
 * Confere o palpite do passo anterior e, se o modo estiver ligado, pergunta
 * pela próxima linha. Só pergunta no passo mais recente: no histórico o
 * aluno já sabe a resposta.
 * @param {Frame} frame
 * @param {string | undefined} verdict
 */
export function renderPredict(frame, verdict) {
  predictToggle.setAttribute('aria-pressed', String(!!predictState.on));
  predictToggle.classList.toggle('is-on', !!predictState.on);
  if (!predictState.on) {
    predictEl.hidden = true;
    return;
  }
  const ask = frame.step === frame.total && !!frame.prediction && pending?.step !== frame.step;
  predictEl.hidden = !ask && !verdict && !pending;
  predictForm.hidden = !ask;
  if (ask && frame.prediction) {
    predictQuestion.textContent = t('predictQuestion', frame.prediction.target);
    predictInput.value = '';
  }
  const score = predictState.total ? t('predictScore', predictState.right ?? 0, predictState.total) : '';
  if (verdict) predictStatus.textContent = [verdict, score].filter(Boolean).join(' ');
  else if (!pending) predictStatus.textContent = score;
}

/**
 * O passo novo chegou: confere o palpite guardado com o valor de verdade.
 * @param {Frame} frame
 * @returns {string | undefined} a frase do resultado
 */
export function checkGuess(frame) {
  if (!pending) return undefined;
  if (frame.step !== pending.step + 1) {
    // Voltou no histórico ou pulou passos: o palpite não vale para este passo.
    if (frame.step <= pending.step) pending = undefined;
    return undefined;
  }
  const actual = frame.answers?.[pending.target];
  const guess = pending;
  pending = undefined;
  if (actual === undefined) return undefined;
  const right = sameAnswer(guess.guess, actual);
  predictState.total = (predictState.total ?? 0) + 1;
  predictState.right = (predictState.right ?? 0) + (right ? 1 : 0);
  savePredict();
  return right ? t('predictRight', guess.target, actual) : t('predictWrong', guess.target, actual, guess.guess);
}

/**
 * Mesma regra do modelo (src/model/predict.ts): sem aspas, sem espaços, 7 igual a 7.0.
 * @param {string} guess
 * @param {string} actual
 */
function sameAnswer(guess, actual) {
  /** @param {string} s */
  const clean = (s) => s.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
  const a = clean(guess);
  const b = clean(actual);
  if (a === b) return true;
  const na = Number(a.replace(',', '.'));
  const nb = Number(b.replace(',', '.'));
  if (a !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return a.toLowerCase() === b.toLowerCase() && /^(true|false)$/i.test(a);
}
