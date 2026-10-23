import { diff, type Change } from './diff';
import { explain } from './explain';
import { explainFlow } from './flow';
import type { Step } from './history';
import { arrowsFor, VALUE_NAMES, type Arrow } from './pointers';
import type { Snapshot } from './snapshot';

/** Tudo que o painel precisa para desenhar um passo. */
export interface Frame {
  snapshot: Snapshot;
  /**
   * A linha que rodou para chegar aqui: a parada anterior. O snapshot aponta
   * para a próxima linha, que ainda não executou.
   */
  executed?: { line: number; code?: string };
  /** O que mudou em relação ao passo anterior; guia as animações. */
  changes: Change[];
  /** Setas por nome de array. */
  arrows: Record<string, Arrow[]>;
  /** Frases do modo iniciante; vazio quando o modo está desligado. */
  explanation: string[];
  /** Posição no histórico, a partir de 1. */
  step: number;
  total: number;
}

export interface FrameOptions {
  /** Nomes de inteiros que guardam valor e não viram seta. */
  valueNames: ReadonlySet<string>;
  beginnerMode: boolean;
}

export const DEFAULT_FRAME_OPTIONS: FrameOptions = { valueNames: VALUE_NAMES, beginnerMode: true };

export function makeFrame(step: Step, options: FrameOptions = DEFAULT_FRAME_OPTIONS): Frame {
  const { snapshot, prev, older } = step;
  const arrows: Record<string, Arrow[]> = {};
  for (const arr of snapshot.arrays) arrows[arr.name] = arrowsFor(arr, snapshot.pointers, options.valueNames);
  const changes = diff(prev, snapshot, older);
  const executed = prev && prev.file === snapshot.file ? { line: prev.line, code: prev.code } : undefined;
  return {
    snapshot,
    executed,
    changes,
    arrows,
    explanation: options.beginnerMode ? explain(changes, prev === undefined, explainFlow(executed, snapshot)) : [],
    step: step.index,
    total: step.total,
  };
}
