import { diff, type Change } from './diff';
import { arrowsFor, type Arrow } from './pointers';
import type { Snapshot } from './snapshot';

/** Tudo que o painel precisa para desenhar um passo. */
export interface Frame {
  snapshot: Snapshot;
  /** O que mudou em relação ao passo anterior; guia as animações. */
  changes: Change[];
  /** Setas por nome de array. */
  arrows: Record<string, Arrow[]>;
}

export function makeFrame(snapshot: Snapshot, prev?: Snapshot, older?: Snapshot): Frame {
  const arrows: Record<string, Arrow[]> = {};
  for (const arr of snapshot.arrays) arrows[arr.name] = arrowsFor(arr, snapshot.pointers);
  return { snapshot, changes: diff(prev, snapshot, older), arrows };
}
