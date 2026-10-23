import { diff, type Change } from './diff';
import { explain } from './explain';
import type { Step } from './history';
import { arrowsFor, type Arrow } from './pointers';
import type { Snapshot } from './snapshot';

/** Tudo que o painel precisa para desenhar um passo. */
export interface Frame {
  snapshot: Snapshot;
  /** O que mudou em relação ao passo anterior; guia as animações. */
  changes: Change[];
  /** Setas por nome de array. */
  arrows: Record<string, Arrow[]>;
  /** Frases do modo iniciante. */
  explanation: string[];
  /** Posição no histórico, a partir de 1. */
  step: number;
  total: number;
}

export function makeFrame(step: Step): Frame {
  const { snapshot, prev, older } = step;
  const arrows: Record<string, Arrow[]> = {};
  for (const arr of snapshot.arrays) arrows[arr.name] = arrowsFor(arr, snapshot.pointers);
  const changes = diff(prev, snapshot, older);
  return {
    snapshot,
    changes,
    arrows,
    explanation: explain(changes, prev === undefined),
    step: step.index,
    total: step.total,
  };
}
