import type * as vscode from 'vscode';
import type { DapScope, DapStackFrame, DapVariable } from './dap';
import type { ArrayVar, Pointer, Scalar, Snapshot } from '../model/snapshot';
import { isRangeGroup, type LanguageAdapter, type VariableShape } from './adapters/adapter';

type Sequence = Extract<VariableShape, { kind: 'sequence' }>;

export interface Limits {
  /** Máximo de posições lidas por array. */
  maxElements: number;
  /** Máximo de arrays por snapshot. */
  maxArrays: number;
}

export const DEFAULT_LIMITS: Limits = { maxElements: 50, maxArrays: 20 };

export interface Collected {
  snapshot: Snapshot;
  /** Adaptador de linguagem usado nesta parada. */
  adapter: LanguageAdapter;
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
  pick: LanguageAdapter | ((file: string) => LanguageAdapter),
  limits: Limits = DEFAULT_LIMITS,
): Promise<Collected | undefined> {
  const { stackFrames } = (await session.customRequest('stackTrace', {
    threadId,
    startFrame: 0,
    levels: 1,
  })) as { stackFrames: DapStackFrame[] };
  const frame = stackFrames[0];
  if (!frame) return undefined;
  const file = frame.source?.path ?? frame.source?.name ?? '';
  const adapter = typeof pick === 'function' ? pick(file) : pick;

  const { scopes } = (await session.customRequest('scopes', { frameId: frame.id })) as { scopes: DapScope[] };
  // Alguns debuggers dividem as locais em vários escopos (JavaScript tem "Local" e "Block").
  const locals: DapVariable[] = [];
  const seenNames = new Set<string>();
  for (const scope of adapter.localScopes(scopes)) {
    for (const v of await variables(session, scope.variablesReference)) {
      // O escopo mais interno vem primeiro e esconde o de fora, como no próprio código.
      if (seenNames.has(v.name)) continue;
      seenNames.add(v.name);
      locals.push(v);
    }
  }

  const arrays: ArrayVar[] = [];
  const pointers: Pointer[] = [];
  const scalars: Scalar[] = [];
  const elements: Record<string, DapVariable[]> = {};
  for (const v of locals) {
    const shape = adapter.shape(v);
    switch (shape.kind) {
      case 'empty-list':
        // Lista recém-criada: aparece vazia, para o aluno ver ela nascer antes do primeiro add.
        if (arrays.length < limits.maxArrays) arrays.push({ name: v.name, values: [], length: 0, kind: 'list' });
        break;
      case 'sequence': {
        if (arrays.length >= limits.maxArrays) break;
        const { array, children } = await readSequence(session, adapter, v, v.name, shape, limits.maxElements, true);
        arrays.push(array);
        elements[v.name] = children.slice(0, 3);
        break;
      }
      case 'integer':
        pointers.push({ name: v.name, value: shape.value });
        break;
      case 'scalar':
        scalars.push({ name: v.name, value: shape.value });
        break;
    }
  }

  return {
    snapshot: {
      line: frame.line,
      file,
      arrays,
      pointers,
      scalars,
    },
    adapter,
    raw: { frame, scopes, locals, elements },
  };
}

/**
 * Lê as posições de uma coleção. Com expandRows, uma coleção cujos elementos
 * também são coleções vira matriz: cada linha é lida uma vez, e o terceiro
 * nível em diante fica só como texto.
 */
async function readSequence(
  session: Session,
  adapter: LanguageAdapter,
  v: DapVariable,
  name: string,
  shape: Sequence,
  max: number,
  expandRows: boolean,
): Promise<{ array: ArrayVar; children: DapVariable[] }> {
  let children: DapVariable[];
  if (shape.length === undefined) {
    children = await variables(session, v.variablesReference);
  } else {
    try {
      const count = Math.min(shape.length, max);
      children = await variables(session, v.variablesReference, { filter: 'indexed', start: 0, count });
    } catch {
      // Debugger sem suporte a paginação: pede tudo e corta aqui.
      children = await variables(session, v.variablesReference);
    }
  }
  // Alguns debuggers ignoram o filtro "indexed" e devolvem também "length", "__proto__"...
  // e outros não preenchem indexedVariables: quem decide o que é posição é o nome.
  if (!children.some((c) => adapter.elementIndex(c.name) !== undefined)) {
    const all = await variables(session, v.variablesReference);
    if (all.some((c) => adapter.elementIndex(c.name) !== undefined)) children = all;
  }

  // Coleções grandes podem vir agrupadas em "[0..99]"; o primeiro grupo basta.
  const group = children.find((c) => isRangeGroup(c.name));
  if (group) children = await variables(session, group.variablesReference);

  const indices = children.map((c) => adapter.elementIndex(c.name)).filter((i) => i !== undefined);
  const length = shape.length ?? (indices.length > 0 ? Math.max(...indices) + 1 : 0);
  const count = Math.min(length, max);
  const byIndex: DapVariable[] = [];
  for (const c of children) {
    const i = adapter.elementIndex(c.name);
    if (i !== undefined && i < count) byIndex[i] = c;
  }
  const values: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = byIndex[i];
    if (!c) {
      values.push('?');
      continue;
    }
    const unbox = adapter.unbox?.(c);
    if (unbox) {
      // Variável "lazy" devolve o próprio valor como único filho; objeto comum devolve os campos.
      const fields = await variables(session, c.variablesReference);
      const inner = fields.find((f) => f.name === 'value') ?? (fields.length === 1 ? fields[0] : undefined);
      values.push(inner ? unbox(inner) : adapter.formatElement(c));
    } else {
      values.push(adapter.formatElement(c));
    }
  }
  const array: ArrayVar = { name, values, length };
  if (shape.collection === 'list') array.kind = 'list';

  const rowShapes = byIndex.slice(0, count).map((c) => (c ? adapter.shape(c) : undefined));
  const isMatrix = count > 0 && rowShapes.every((s) => s?.kind === 'sequence');
  if (expandRows && isMatrix) {
    array.rows = [];
    for (let i = 0; i < count; i++) {
      const rowShape = rowShapes[i] as Sequence;
      array.rows.push((await readSequence(session, adapter, byIndex[i], `${name}[${i}]`, rowShape, max, false)).array);
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
