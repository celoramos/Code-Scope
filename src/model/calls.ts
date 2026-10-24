import { MESSAGES, type Language } from './messages';
import type { CallFrame, Scalar, Snapshot } from './snapshot';

/** Uma chamada que começou ou terminou entre dois passos. */
export type CallChange =
  | {
      kind: 'call';
      name: string;
      /** Posição na pilha, a partir de 0 (embaixo). */
      depth: number;
      /** A função chamou a si mesma (direta ou indiretamente). */
      recursive: boolean;
      /** Quantas chamadas da mesma função estão na pilha agora. */
      copies: number;
      vars: Scalar[];
    }
  | {
      kind: 'return';
      name: string;
      depth: number;
      /** Valor devolvido, quando o debugger informa. */
      value?: string;
      /** Quem continua rodando depois do retorno. */
      to?: string;
    };

/** Chamadas que entraram e saíram da pilha de prev para next. */
export function callChanges(prev: Snapshot | undefined, next: Snapshot): CallChange[] {
  if (!prev?.calls || !next.calls) return [];
  const a = prev.calls;
  const b = next.calls;
  let common = 0;
  while (common < a.length && common < b.length && a[common].name === b[common].name) common++;
  // Mesma pilha: nenhuma chamada nova nem terminada (pode ter havido uma chamada inteira no F10).
  if (common === a.length && common === b.length) return [];

  const changes: CallChange[] = [];
  // Primeiro quem saiu, do topo para baixo; depois quem entrou, de baixo para o topo.
  for (let k = a.length - 1; k >= common; k--) {
    const to = b[k - 1] ?? a[k - 1];
    const value = returnedValue(prev, next, a[k].name, k === a.length - 1, k === common);
    changes.push({
      kind: 'return',
      name: a[k].name,
      depth: k,
      ...(value !== undefined ? { value } : {}),
      ...(to && !to.program ? { to: to.name } : {}),
    });
  }
  for (let k = common; k < b.length; k++) {
    const copies = b.slice(0, k + 1).filter((f) => f.name === b[k].name).length;
    changes.push({ kind: 'call', name: b[k].name, depth: k, recursive: copies > 1, copies, vars: b[k].vars });
  }
  return changes;
}

/**
 * O valor devolvido por uma chamada que saiu da pilha. O js-debug mostra o
 * valor no passo anterior, ainda dentro da função (pending); o debugpy
 * mostra no passo seguinte, já em quem chamou, com o nome da função.
 */
function returnedValue(prev: Snapshot, next: Snapshot, name: string, wasTop: boolean, isLast: boolean): string | undefined {
  if (isLast && next.returned && !next.returned.pending && (next.returned.function ?? name) === name) return next.returned.value;
  if (wasTop && prev.returned?.pending) return prev.returned.value;
  return undefined;
}

/** Frase do modo iniciante para uma chamada que começou ou terminou. */
export function describeCall(c: CallChange, language: Language): string {
  const m = MESSAGES[language];
  if (c.kind === 'return') return m.callReturned(c.name, c.value, c.to);
  const vars = c.vars
    .slice(0, 3)
    .map((v) => `${v.name} = ${v.value}`)
    .join(', ');
  return c.recursive ? m.callRecursive(c.name, vars, c.copies) : m.callEntered(c.name, vars);
}

/** Valores vazios que toda função sem return devolve: dizer isso só faz barulho. */
const EMPTY_RETURNS = new Set(['None', 'undefined', 'null', 'void']);

/**
 * Frase sobre o valor devolvido num passo que não trocou de função: a função
 * parada chegou ao return (js-debug), ou uma chamada inteira rodou no F10
 * (debugpy).
 */
export function returnNote(snapshot: Snapshot, prev: Snapshot | undefined, language: Language): string | undefined {
  const r = snapshot.returned;
  if (!r || EMPTY_RETURNS.has(r.value)) return undefined;
  // O debugpy repete o "(return)" no passo seguinte: só vale a primeira vez.
  if (prev?.returned && prev.returned.function === r.function && prev.returned.value === r.value) return undefined;
  const m = MESSAGES[language];
  const top = snapshot.calls?.at(-1);
  if (r.pending) return top && !top.program ? m.callReturning(top.name, r.value) : undefined;
  return r.function ? m.callGaveBack(r.function, r.value) : undefined;
}

/** Chamadas que contam para mostrar a pilha: o código de fora das funções não conta. */
export function visibleCalls(calls: readonly CallFrame[] | undefined): number {
  return (calls ?? []).filter((c) => !c.program).length;
}
