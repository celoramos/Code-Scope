import { diff, type Change } from './diff';
import { explain } from './explain';
import { explainFlow } from './flow';
import { MESSAGES, type Language } from './messages';
import type { Step } from './history';
import { arrowsFor, matrixAxesFor, VALUE_NAMES, type Arrow, type MatrixAxes } from './pointers';
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
  /** Setas por nome de array (vazio para matrizes). */
  arrows: Record<string, Arrow[]>;
  /** Linha e coluna apontadas em cada matriz, lidas do código. */
  axes: Record<string, MatrixAxes>;
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
  /** Idioma das frases do modo iniciante. */
  language: Language;
}

export const DEFAULT_FRAME_OPTIONS: FrameOptions = { valueNames: VALUE_NAMES, beginnerMode: true, language: 'pt' };

export function makeFrame(step: Step, options: FrameOptions = DEFAULT_FRAME_OPTIONS): Frame {
  const { snapshot, prev, older } = step;
  const arrows: Record<string, Arrow[]> = {};
  const axes: Record<string, MatrixAxes> = {};
  for (const arr of snapshot.arrays) {
    if (arr.rows) {
      arrows[arr.name] = [];
      axes[arr.name] = matrixAxesFor(arr, snapshot.pointers, [snapshot.code, prev?.code, older?.code]);
    } else if (arr.kind === 'stack' || arr.kind === 'queue') {
      // Pilha e fila não têm índice para o aluno: as pontas ganham etiquetas no painel.
      arrows[arr.name] = [];
    } else {
      arrows[arr.name] = arrowsFor(arr, snapshot.pointers, options.valueNames);
    }
  }
  const changes = diff(prev, snapshot, older);
  const executed = prev && prev.file === snapshot.file ? { line: prev.line, code: prev.code } : undefined;
  return {
    snapshot,
    executed,
    changes,
    arrows,
    axes,
    explanation: options.beginnerMode
      ? explain(
          changes,
          prev === undefined,
          [peekNote(executed?.code, snapshot, changes, options.language), explainFlow(executed, snapshot, options.language)].filter(isText),
          options.language,
        )
      : [],
    step: step.index,
    total: step.total,
  };
}

/**
 * peek() não muda nada, então o diff não vê. Mas é justamente o que o aluno
 * precisa entender: olhar a ponta não tira o item de lá.
 */
export function peekNote(
  code: string | undefined,
  snapshot: Snapshot,
  changes: Change[],
  language: Language = 'pt',
): string | undefined {
  const m = code && /\b([A-Za-z_$][\w$]*)\s*\.\s*peek\s*\(/.exec(code);
  if (!m) return undefined;
  const arr = snapshot.arrays.find((a) => a.name === m[1]);
  if (!arr || (arr.kind !== 'stack' && arr.kind !== 'queue')) return undefined;
  if (changes.some((c) => 'array' in c && c.array === arr.name)) return undefined;
  const value = arr.kind === 'stack' ? arr.values.at(-1) : arr.values[0];
  if (value === undefined) return undefined;
  const msg = MESSAGES[language];
  return arr.kind === 'stack' ? msg.peekStack(arr.name, value) : msg.peekQueue(arr.name, value);
}

function isText(s: string | undefined): s is string {
  return s !== undefined;
}
