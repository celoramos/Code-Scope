import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Heap de prioridade (PriorityQueue, heapq). Por dentro é um array em que cada
 * posição i tem os filhos em 2i + 1 e 2i + 2. Uma entrada ou saída mexe em
 * várias posições, então a frase conta o que importa: quem entrou ou saiu e
 * quem ficou na raiz.
 */

/** Valores de a que sobram depois de tirar um de cada valor de b. */
function missing(a: string[], b: string[]): string[] {
  const rest = [...b];
  return a.filter((v) => {
    const i = rest.indexOf(v);
    if (i < 0) return true;
    rest.splice(i, 1);
    return false;
  });
}

export function priorityNotes(prev: Snapshot, next: Snapshot, language: Language): string[] {
  const m = MESSAGES[language];
  return next.arrays.flatMap((a) => {
    const p = prev.arrays.find((x) => x.name === a.name);
    if (a.kind !== 'heap' || !p) return [];
    const added = missing(a.values, p.values);
    const removed = missing(p.values, a.values);
    if (added.length === 1 && removed.length === 0) return [m.priorityIn(a.name, added[0], a.values[0])];
    if (removed.length === 1 && added.length === 0) return [m.priorityOut(a.name, removed[0], a.values[0])];
    return [];
  });
}
