// @ts-check
// Contador de comparações e a tabela "quanto custa".
import { costEl, costHeadEl, costProgramEl, costRowsEl, costTitleEl, statsEl, t } from './dom.js';

/**
 * Contas que se usam para comparar algoritmos: quantas vezes o programa
 * comparou posições e quantas trocas fez até aqui.
 * @param {{ comparisons: number, swaps: number } | undefined} stats
 */
export function renderStats(stats) {
  const parts = [];
  if (stats?.comparisons) parts.push(stats.comparisons === 1 ? t('statsComparison1') : t('statsComparisons', stats.comparisons));
  if (stats?.swaps) parts.push(stats.swaps === 1 ? t('statsSwap1') : t('statsSwaps', stats.swaps));
  statsEl.textContent = parts.join(' · ');
  statsEl.hidden = parts.length === 0;
  renderCost(stats);
}

/** Nomes das curvas como se escrevem em computação. */
const CURVES = /** @type {const} */ ([
  ['log', 'log n'],
  ['n', 'n'],
  ['nlogn', 'n log n'],
  ['n2', 'n²'],
]);

/**
 * Quanto o algoritmo custa: a contagem do programa ao lado do que faria um
 * algoritmo log n, n, n log n e n², para o n do programa e para n = 1000.
 * @param {{ comparisons: number, size?: number, curves?: { size: number, values: Record<string, number> }[] } | undefined} stats
 */
function renderCost(stats) {
  const curves = stats?.curves;
  costEl.hidden = !stats?.comparisons || !curves?.length;
  if (costEl.hidden || !stats || !curves) return;
  const num = new Intl.NumberFormat(t('locale'));
  costTitleEl.textContent = t('costTitle', stats.size);
  costHeadEl.replaceChildren(
    ...[t('costCurve'), ...curves.map((c) => t('costAt', num.format(c.size)))].map((text) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = text;
      return th;
    }),
  );
  costRowsEl.replaceChildren(
    ...CURVES.map(([key, label]) => {
      const tr = document.createElement('tr');
      tr.dataset.curve = key;
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = label;
      tr.append(th, ...curves.map((c) => {
        const td = document.createElement('td');
        td.textContent = num.format(c.values[key]);
        return td;
      }));
      return tr;
    }),
  );
  // A contagem do programa entra como uma linha a mais, só na coluna do n dele.
  const own = document.createElement('tr');
  own.className = 'is-program';
  const ownTh = document.createElement('th');
  ownTh.scope = 'row';
  ownTh.textContent = t('costProgramRow');
  own.append(ownTh, ...curves.map((c, k) => {
    const td = document.createElement('td');
    td.textContent = k === 0 ? num.format(stats.comparisons) : '';
    return td;
  }));
  costRowsEl.append(own);
  costProgramEl.textContent = t('costProgram', stats.size);
}
