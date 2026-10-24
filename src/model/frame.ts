import { callChanges, describeCall, returnNote, type CallChange } from './calls';
import { diff, type Change } from './diff';
import { explain } from './explain';
import { explainError, type ErrorView } from './errors';
import { explainFlow } from './flow';
import { arrayAliases, explainHeap, heapDelta, heapView, referenceNames, type HeapDelta, type HeapView } from './heap';
import { MESSAGES, type Language } from './messages';
import type { Step } from './history';
import { arrowsFor, matrixAxesFor, VALUE_NAMES, type Arrow, type MatrixAxes } from './pointers';
import type { Snapshot } from './snapshot';
import { traceTable, type TraceTable } from './trace';

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
  /** Chamadas que começaram ou terminaram neste passo. */
  calls: CallChange[];
  /** Objetos prontos para desenhar: listas ligadas, árvores e cartões. */
  heap: HeapView;
  /** Objetos novos e campos alterados neste passo, para destacar. */
  heapDelta: HeapDelta;
  /** Setas por nome de array (vazio para matrizes). */
  arrows: Record<string, Arrow[]>;
  /** Linha e coluna apontadas em cada matriz, lidas do código. */
  axes: Record<string, MatrixAxes>;
  /** Frases do modo iniciante; vazio quando o modo está desligado. */
  explanation: string[];
  /** Erro que parou o programa neste passo, já explicado. */
  error?: ErrorView;
  /** Teste de mesa até este passo. */
  trace: TraceTable;
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
  const calls = callChanges(prev, snapshot);
  // Entrar ou sair de uma função troca todas as variáveis de uma vez: comparar as
  // de uma função com as de outra diria que tudo "saiu de escopo". O passo vira só
  // a chamada, e as variáveis da função nova aparecem como estão.
  const switched = calls.length > 0;
  const changes = switched ? [] : diff(prev, snapshot, older);
  const executed = prev && prev.file === snapshot.file ? { line: prev.line, code: prev.code } : undefined;
  let explanation: string[] = [];
  if (options.beginnerMode && switched) {
    explanation = calls.map((c) => describeCall(c, options.language));
  } else if (options.beginnerMode) {
    const heapNotes = prev ? explainHeap(prev, snapshot, options.language) : [];
    // Dois nomes para o mesmo array: as mudanças aparecem nos dois, mas basta contar uma vez.
    const extraNames = new Set([...arrayAliases(snapshot).values()].flatMap((names) => names.slice(1)));
    // raiz = None virando objeto (ou o contrário) é referência: quem explica é explainHeap.
    const refNames = referenceNames(prev, snapshot);
    const told = changes.filter((c) => !('array' in c && extraNames.has(c.array)) && !(c.kind === 'scalar' && refNames.has(c.name)));
    // No erro, "nada mudou" só atrapalha: o cartão do erro é o que importa.
    if (!(snapshot.exception && told.length === 0 && heapNotes.length === 0)) {
      explanation = explain(
        told,
        prev === undefined,
        [
          ...heapNotes,
          peekNote(executed?.code, snapshot, changes, options.language),
          returnNote(snapshot, prev, options.language),
          explainFlow(executed, snapshot, options.language),
        ].filter(isText),
        options.language,
      );
    }
  }
  return {
    snapshot,
    executed,
    changes,
    calls,
    heap: heapView(snapshot),
    heapDelta: switched ? { added: [], fields: {} } : heapDelta(prev, snapshot),
    arrows,
    axes,
    explanation,
    error: explainError(snapshot, options.language),
    trace: traceTable(step.past, step.index - step.past.length + 1),
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
