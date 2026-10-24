import { diff } from './diff';
import { indexAccesses } from './indexExpr';
import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * O que os algoritmos de busca e ordenação fazem com o array, além de trocar
 * valores: comparar duas posições e ir estreitando o pedaço que ainda
 * interessa. Aqui sai o que destacar em cada array e as contas que se usam
 * para comparar algoritmos (quantas comparações, quantas trocas).
 */

export interface ArrayFocus {
  /** Posições que a condição da próxima linha compara. */
  compare?: number[];
  /** Pedaço que a busca ainda olha, entre duas variáveis como inicio e fim. */
  range?: { from: number; to: number; names: [string, string] };
}

/** Pares de variáveis que marcam as pontas de um intervalo. */
const RANGE_PAIRS: [RegExp, RegExp][] = [
  [/^(inicio|ini|comeco|começo)$/i, /^(fim|final)$/i],
  [/^(lo|low|baixo)$/i, /^(hi|high|alto)$/i],
  [/^(left|l|esq|esquerda)$/i, /^(right|r|dir|direita)$/i],
  [/^(start|begin)$/i, /^(end|stop)$/i],
];

export function arrayFocus(s: Snapshot): Record<string, ArrayFocus> {
  const out: Record<string, ArrayFocus> = {};
  const get = (name: string) => (out[name] ??= {});

  // Comparação: a condição que vai rodar lê posições de um array.
  if (s.condition) {
    for (const a of indexAccesses(s.condition.text, s)) {
      const arr = s.arrays.find((x) => x.name === a.array);
      if (!arr || a.index === undefined || a.index < 0 || a.index >= arr.length) continue;
      const f = get(a.array);
      f.compare = [...new Set([...(f.compare ?? []), a.index])];
    }
  }

  // Intervalo: as duas pontas existem e cabem no array (fim pode ter passado do começo).
  for (const [startRe, endRe] of RANGE_PAIRS) {
    const start = s.pointers.find((p) => startRe.test(p.name));
    const end = s.pointers.find((p) => endRe.test(p.name));
    if (!start || !end) continue;
    for (const arr of s.arrays) {
      if (arr.rows || (arr.kind && arr.kind !== 'array' && arr.kind !== 'list')) continue;
      const n = arr.length;
      if (start.value < 0 || start.value > n || end.value < -1 || end.value >= n) continue;
      get(arr.name).range = { from: start.value, to: end.value, names: [start.name, end.name] };
    }
    break;
  }
  return out;
}

/**
 * Curvas de crescimento: quantas comparações faz um algoritmo log n, n, n log n
 * e n². O painel não diz qual o programa segue: os passos pulados com F5 não
 * são contados, então a contagem só vale como "até aqui".
 */
export type Growth = 'log' | 'n' | 'nlogn' | 'n2';

export interface AlgorithmStats {
  /** Vezes que o programa comparou posições de um array numa condição. */
  comparisons: number;
  swaps: number;
  /** O n: tamanho do maior array comparado. */
  size?: number;
  /** Valor de cada curva para o n do programa e para um n grande, onde a diferença aparece. */
  curves?: { size: number; values: Record<Growth, number> }[];
}

/** O n grande da comparação: com 1000 posições, n² já é um milhão. */
const BIG_N = 1000;

/** Contas do começo até o passo atual. */
export function algorithmStats(past: readonly Snapshot[]): AlgorithmStats {
  let comparisons = 0;
  let swaps = 0;
  let size = 0;
  past.forEach((s, k) => {
    const accesses = s.condition ? indexAccesses(s.condition.text, s) : [];
    if (accesses.length > 0) {
      comparisons++;
      for (const a of accesses) size = Math.max(size, s.arrays.find((x) => x.name === a.array)?.length ?? 0);
    }
    if (k > 0) swaps += diff(past[k - 1], s, past[k - 2]).filter((c) => c.kind === 'swap').length;
  });
  if (size === 0) return { comparisons, swaps };
  const curves = [size, BIG_N].map((n) => ({ size: n, values: growthTable(n) }));
  return { comparisons, swaps, size, curves };
}

/** O valor de cada curva para um n: o que o painel mostra lado a lado. */
export function growthTable(n: number): Record<Growth, number> {
  const log2 = Math.log2(n);
  return { log: Math.max(1, Math.round(log2)), n, nlogn: Math.round(n * log2), n2: n * n };
}

/** O intervalo encolheu: a busca descartou um pedaço. */
export function rangeNote(prev: Snapshot | undefined, next: Snapshot, language: Language): string | undefined {
  if (!prev) return undefined;
  const before = arrayFocus(prev);
  const after = arrayFocus(next);
  for (const [name, f] of Object.entries(after)) {
    const r = f.range;
    const p = before[name]?.range;
    if (!r || !p || (r.from === p.from && r.to === p.to)) continue;
    const m = MESSAGES[language];
    if (r.from > r.to) return m.rangeEmpty(name);
    const dropped = p.to - p.from + 1 - (r.to - r.from + 1);
    if (dropped > 0) return m.rangeNarrowed(name, r.from, r.to, dropped);
  }
  return undefined;
}
