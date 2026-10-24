import type * as vscode from 'vscode';
import type { DapScope, DapStackFrame, DapVariable } from './dap';
import type { ArrayVar, CallFrame, Pointer, Scalar, Snapshot } from '../model/snapshot';
import { alignHeap } from '../model/heapIdentity';
import { isRangeGroup, type LanguageAdapter, type VariableShape } from './adapters/adapter';
import { collectHeap, linkSameArrays } from './heapCollector';

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

export interface CollectOptions {
  /** Classes declaradas no arquivo parado: só objetos delas são desenhados. */
  userTypes?: (file: string) => Promise<ReadonlySet<string> | undefined>;
  /** Passo anterior: objetos sem identidade no debugger herdam o id pelos caminhos. */
  previous?: Snapshot;
}

export async function collectSnapshot(
  session: Session,
  threadId: number,
  pick: LanguageAdapter | ((file: string) => LanguageAdapter),
  limits: Limits = DEFAULT_LIMITS,
  opts: CollectOptions = {},
): Promise<Collected | undefined> {
  const { stackFrames } = (await session.customRequest('stackTrace', {
    threadId,
    startFrame: 0,
    levels: MAX_CALLS + 1,
  })) as { stackFrames: DapStackFrame[] };
  const frame = stackFrames[0];
  if (!frame) return undefined;
  const file = frame.source?.path ?? frame.source?.name ?? '';
  const adapter = typeof pick === 'function' ? pick(file) : pick;

  const { scopes, locals: frameLocals } = await readLocals(session, adapter, frame);
  const locals: DapVariable[] = [];
  let returned: Snapshot['returned'];
  for (const v of frameLocals) {
    const r = adapter.returnValue?.(v);
    if (r) returned = r;
    else locals.push(v);
  }

  const arrays: ArrayVar[] = [];
  const arrayVars: { array: ArrayVar; v: DapVariable }[] = [];
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
        if (shape.id) array.id = shape.id;
        arrays.push(array);
        arrayVars.push({ array, v });
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

  const snapshot: Snapshot = {
    line: frame.line,
    file,
    arrays,
    pointers,
    scalars,
  };
  if (returned) snapshot.returned = returned;

  await linkSameArrays(session, adapter, arrayVars, frame.id);
  const { heap, refs } = await collectHeap(session, adapter, locals, { frameId: frame.id, userTypes: await opts.userTypes?.(file) });
  if (heap.length > 0) snapshot.heap = heap;
  if (refs.length > 0) snapshot.refs = refs;
  alignHeap(opts.previous, snapshot);

  const calls = await readCalls(session, adapter, stackFrames, snapshot);
  if (calls.length > 0) snapshot.calls = calls;

  return {
    snapshot,
    adapter,
    raw: { frame, scopes, locals, elements },
  };
}

/** Chamadas lidas da pilha; as de baixo só com variáveis simples, para não pesar. */
export const MAX_CALLS = 12;
/** Variáveis mostradas em cada chamada que não é a atual. */
const MAX_CALL_VARS = 6;

/** Variáveis locais de um quadro, juntando os escopos que a linguagem divide. */
async function readLocals(
  session: Session,
  adapter: LanguageAdapter,
  frame: DapStackFrame,
): Promise<{ scopes: DapScope[]; locals: DapVariable[] }> {
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
  return { scopes, locals };
}

/**
 * Quadro do código do aluno. Os debuggers marcam o resto: o js-debug põe
 * "deemphasize" no código do Node, e quadros sem arquivo são de biblioteca.
 */
export function isUserFrame(f: DapStackFrame): boolean {
  if (!f.source?.path) return false;
  if (f.presentationHint === 'subtle' || f.presentationHint === 'label') return false;
  return f.source.presentationHint !== 'deemphasize' && f.source.presentationHint !== 'subtle';
}

/**
 * Nome da função como o aluno escreveu: "Fatorial.fatorial(int)" (Java) e
 * "global.fatorial" (js-debug) viram "fatorial"; o construtor do Java vira
 * "new Conta". program diz que é o código de fora das funções.
 */
export function functionName(raw: string): { name: string; program: boolean } {
  if (raw === '<module>' || raw === '<anonymous>' || raw === '') return { name: raw, program: true };
  const noArgs = raw.replace(/\(.*\)$/, '');
  const parts = noArgs.split('.');
  const last = parts.pop() ?? noArgs;
  if (last === '<init>') return { name: `new ${(parts.pop() ?? '').split('$').pop()}`, program: false };
  return { name: last, program: false };
}

async function readCalls(
  session: Session,
  adapter: LanguageAdapter,
  stackFrames: DapStackFrame[],
  top: Snapshot,
): Promise<CallFrame[]> {
  const user: DapStackFrame[] = [];
  for (const f of stackFrames.slice(0, MAX_CALLS)) {
    if (!isUserFrame(f)) break;
    user.push(f);
  }
  const calls: CallFrame[] = [];
  for (const [k, f] of user.entries()) {
    const { name, program } = functionName(f.name);
    let vars: Scalar[];
    if (k === 0) {
      vars = [...top.pointers.map((p) => ({ name: p.name, value: String(p.value) })), ...(top.scalars ?? [])];
    } else {
      // Uma chamada que falha em responder não deve esconder as outras.
      vars = await readLocals(session, adapter, f).then(
        ({ locals }) => locals.filter((v) => !adapter.returnValue?.(v)).flatMap((v) => summarize(adapter, v)).slice(0, MAX_CALL_VARS),
        () => [],
      );
    }
    calls.push({ name, line: f.line, ...(program ? { program } : {}), vars });
  }
  return calls.reverse();
}

/** Variável de uma chamada de baixo como texto curto, sem abrir coleções. */
function summarize(adapter: LanguageAdapter, v: DapVariable): Scalar[] {
  const shape = adapter.shape(v);
  switch (shape.kind) {
    case 'integer':
      return [{ name: v.name, value: String(shape.value) }];
    case 'scalar':
      return [{ name: v.name, value: shape.value }];
    case 'sequence':
      return [{ name: v.name, value: shape.length === undefined ? '[…]' : `[${shape.length}]` }];
    case 'empty-list':
      return [{ name: v.name, value: '[]' }];
    default:
      return [];
  }
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
