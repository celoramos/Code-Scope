import type * as vscode from 'vscode';
import type { DapScope, DapStackFrame, DapVariable } from './dap';
import type { ArrayVar, Pointer, Scalar, Snapshot } from '../model/snapshot';
import {
  arrayLength,
  elementIndex,
  formatElement,
  integralValue,
  isArrayVariable,
  isBoxed,
  isEmptyList,
  isListVariable,
  isRangeGroup,
  pickLocalScope,
  scalarValue,
  unboxedValue,
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
  const scalars: Scalar[] = [];
  const elements: Record<string, DapVariable[]> = {};
  for (const v of locals) {
    if (isEmptyList(v)) {
      // Lista recém-criada: aparece vazia, para o aluno ver ela nascer antes do primeiro add.
      if (arrays.length < limits.maxArrays) arrays.push({ name: v.name, values: [], length: 0, kind: 'list' });
      continue;
    }
    if (isArrayVariable(v)) {
      if (arrays.length >= limits.maxArrays) continue;
      const { array, children } = await readArray(session, v, v.name, limits.maxElements, true);
      arrays.push(array);
      elements[v.name] = children.slice(0, 3);
      continue;
    }
    const n = integralValue(v);
    if (n !== undefined) {
      pointers.push({ name: v.name, value: n });
      continue;
    }
    const value = scalarValue(v);
    if (value !== undefined) scalars.push({ name: v.name, value });
  }

  return {
    snapshot: {
      line: frame.line,
      file: frame.source?.path ?? frame.source?.name ?? '',
      arrays,
      pointers,
      scalars,
    },
    raw: { frame, scopes, locals, elements },
  };
}

/**
 * Lê as posições de um array ou lista. Com expandRows, um array cujos
 * elementos também são arrays vira matriz: cada linha é lida uma vez, e o
 * terceiro nível em diante fica só como texto ("int[3]").
 */
async function readArray(
  session: Session,
  v: DapVariable,
  name: string,
  max: number,
  expandRows: boolean,
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

  const byIndex: DapVariable[] = [];
  for (const c of children) {
    const i = elementIndex(c.name);
    if (i !== undefined && i < count) byIndex[i] = c;
  }
  const unboxed: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = byIndex[i];
    if (c && isBoxed(c)) {
      // Variável "lazy" devolve o próprio valor como único filho; objeto comum devolve os campos.
      const fields = await variables(session, c.variablesReference);
      const inner = fields.find((f) => f.name === 'value') ?? (fields.length === 1 ? fields[0] : undefined);
      if (inner) unboxed[i] = unboxedValue(inner.value, c.type);
    }
  }
  const values = Array.from({ length: count }, (_, i) => unboxed[i] ?? (byIndex[i] ? formatElement(byIndex[i]) : '?'));
  const array: ArrayVar = { name, values, length };
  if (isListVariable(v)) array.kind = 'list';

  const isMatrix = count > 0 && byIndex.every((c) => c && isArrayVariable(c) && !isListVariable(c));
  if (expandRows && isMatrix) {
    array.rows = [];
    for (let i = 0; i < count; i++) {
      array.rows.push((await readArray(session, byIndex[i], `${name}[${i}]`, max, false)).array);
    }
  }
  return { array, children };
}

async function variables(session: Session, variablesReference: number, extra: object = {}): Promise<DapVariable[]> {
  const res = (await session.customRequest('variables', { variablesReference, ...extra })) as {
    variables?: DapVariable[];
  };
  return res.variables ?? [];
}
