import type * as vscode from 'vscode';
import type { DapScope, DapStackFrame, DapVariable } from './dap';
import type { ArrayVar, Pointer, Snapshot } from '../model/snapshot';
import {
  arrayLength,
  cleanValue,
  elementIndex,
  integralValue,
  isArrayVariable,
  isRangeGroup,
  pickLocalScope,
} from './javaAdapter';

export interface Limits {
  /** Máximo de posições lidas por array. */
  maxElements: number;
  /** Máximo de arrays por snapshot. */
  maxArrays: number;
}

export const DEFAULT_LIMITS: Limits = { maxElements: 50, maxArrays: 20 };

export interface Collected {
  snapshot: Snapshot;
  /** O que o adaptador devolveu, para investigar formatos no log. */
  raw: {
    frame: DapStackFrame;
    scopes: DapScope[];
    locals: DapVariable[];
    /** Primeiros filhos de cada array, como vieram. */
    elements: Record<string, DapVariable[]>;
  };
}

export type Session = Pick<vscode.DebugSession, 'customRequest'>;

export async function collectSnapshot(
  session: Session,
  threadId: number,
  limits: Limits = DEFAULT_LIMITS,
): Promise<Collected | undefined> {
  const { stackFrames } = (await session.customRequest('stackTrace', {
    threadId,
    startFrame: 0,
    levels: 1,
  })) as { stackFrames: DapStackFrame[] };
  const frame = stackFrames[0];
  if (!frame) return undefined;

  const { scopes } = (await session.customRequest('scopes', { frameId: frame.id })) as { scopes: DapScope[] };
  const scope = pickLocalScope(scopes);
  const locals = scope ? await variables(session, scope.variablesReference) : [];

  const arrays: ArrayVar[] = [];
  const pointers: Pointer[] = [];
  const elements: Record<string, DapVariable[]> = {};
  for (const v of locals) {
    if (isArrayVariable(v)) {
      if (arrays.length >= limits.maxArrays) continue;
      const { array, children } = await readArray(session, v, limits.maxElements);
      arrays.push(array);
      elements[v.name] = children.slice(0, 3);
      continue;
    }
    const n = integralValue(v);
    if (n !== undefined) pointers.push({ name: v.name, value: n });
  }

  return {
    snapshot: { line: frame.line, file: frame.source?.path ?? frame.source?.name ?? '', arrays, pointers },
    raw: { frame, scopes, locals, elements },
  };
}

async function readArray(
  session: Session,
  v: DapVariable,
  max: number,
): Promise<{ array: ArrayVar; children: DapVariable[] }> {
  const length = arrayLength(v) ?? 0;
  const count = Math.min(length, max);
  let children: DapVariable[];
  try {
    children = await variables(session, v.variablesReference, { filter: 'indexed', start: 0, count });
  } catch {
    // Adaptador sem suporte a paginação: pede tudo e corta aqui.
    children = await variables(session, v.variablesReference);
  }

  // Arrays grandes podem vir agrupados em "[0..99]"; o primeiro grupo basta.
  const group = children.find((c) => isRangeGroup(c.name));
  if (group) children = await variables(session, group.variablesReference);

  const values: string[] = [];
  for (const c of children) {
    const i = elementIndex(c.name);
    if (i !== undefined && i < count) values[i] = cleanValue(c.value);
  }
  return {
    array: { name: v.name, values: Array.from({ length: count }, (_, i) => values[i] ?? '?'), length },
    children,
  };
}

async function variables(session: Session, variablesReference: number, extra: object = {}): Promise<DapVariable[]> {
  const res = (await session.customRequest('variables', { variablesReference, ...extra })) as {
    variables?: DapVariable[];
  };
  return res.variables ?? [];
}
