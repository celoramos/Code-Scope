import { indexAccesses } from './indexExpr';
import { MESSAGES, type ErrorKindName, type Language } from './messages';
import type { ExceptionInfo, Snapshot } from './snapshot';

/**
 * Explica o erro que parou o programa. A mensagem do debugger é escrita para
 * quem já programa ("Index 3 out of bounds for length 3"); aqui ela vira o
 * que aconteceu, com os nomes do código do aluno, e uma dica de onde olhar.
 */

export type ErrorKind = ErrorKindName;

export interface ErrorView {
  type: string;
  message: string;
  kind: ErrorKind;
  title: string;
  sentences: string[];
  /** Erro tratado por um catch: o programa continua. */
  handled?: boolean;
  /** Posição que o código tentou usar e não existe: o painel desenha uma caixa fantasma. */
  missing?: { array: string; index: number };
}

const RULES: [ErrorKind, RegExp][] = [
  ['index', /IndexOutOfBounds|IndexError|index out of range|out of bounds/i],
  ['recursion', /StackOverflow|RecursionError|Maximum call stack/i],
  ['zero', /ArithmeticException|by zero|ZeroDivision/i],
  ['null', /NullPointer|Cannot read propert|Cannot set propert|of undefined|of null|NoneType|undefined is not|null is not/i],
  ['key', /KeyError/],
  ['format', /NumberFormat|invalid literal for int|could not convert string/i],
  ['name', /NameError|ReferenceError|is not defined/i],
  ['type', /ClassCast|TypeError/],
];

export function classifyError(ex: ExceptionInfo): ErrorKind {
  const text = `${ex.type} ${ex.message}`;
  return RULES.find(([, re]) => re.test(text))?.[0] ?? 'other';
}

/**
 * Erro tratado: o passo em que o programa entrou no catch. A linha que deu
 * erro é a que acabou de rodar; o resto do try não rodou.
 */
export function explainHandled(prev: Snapshot | undefined, next: Snapshot, language: Language): ErrorView | undefined {
  const c = next.caught;
  if (!c || !prev) return undefined;
  const was = prev.caught;
  if (was && was.name === c.name && was.type === c.type && was.message === c.message) return undefined;
  const m = MESSAGES[language];
  const kind = classifyError({ type: c.type, message: c.message ?? '' });
  return {
    type: c.type,
    message: c.message ?? '',
    kind,
    title: m.handledTitle(c.type),
    handled: true,
    sentences: [m.handledJump(prev.line, c.name), m.errorKind(kind, c.message ?? '')],
  };
}

export function explainError(snapshot: Snapshot, language: Language): ErrorView | undefined {
  const ex = snapshot.exception;
  if (!ex) return undefined;
  const m = MESSAGES[language];
  const kind = classifyError(ex);
  const view: ErrorView = { type: ex.type, message: ex.message, kind, title: m.errorTitle(ex.type), sentences: [] };

  // A linha parada tem um arr[expr] fora dos limites? Em JavaScript isso não dá erro de
  // índice: dá undefined, e o erro aparece depois, ao ler um campo desse undefined.
  const lengths = new Map(snapshot.arrays.map((a) => [a.name, a.length]));
  const outside = indexAccesses(snapshot.code, snapshot).find((a) => {
    const n = lengths.get(a.array);
    return a.index !== undefined && n !== undefined && (a.index < 0 || a.index >= n);
  });
  if (outside && outside.index !== undefined && (kind === 'index' || kind === 'null' || kind === 'other')) {
    const length = lengths.get(outside.array) ?? 0;
    view.missing = { array: outside.array, index: outside.index };
    view.sentences.push(
      length === 0
        ? m.errorIndexEmpty(outside.array, outside.expr, outside.index)
        : m.errorIndex(outside.array, outside.expr, outside.index, length - 1),
    );
    if (kind === 'null') view.sentences.push(m.errorUndefinedFromIndex(outside.array, outside.index));
    if (outside.index >= 0) view.sentences.push(m.errorIndexTip(length));
    return view;
  }

  view.sentences.push(m.errorKind(kind, ex.message));
  return view;
}
