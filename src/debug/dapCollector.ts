import type * as vscode from 'vscode';
import type { DapScope, DapStackFrame, DapVariable } from './dap';
import type { ArrayVar, CallFrame, HeapObject, MapVar, Pointer, Scalar, Snapshot } from '../model/snapshot';
import { alignHeap } from '../model/heapIdentity';
import { isRangeGroup, type LanguageAdapter, type VariableShape } from './adapters/adapter';
import { HeapCollector, linkSameArrays } from './heapCollector';
import { nodeValue } from '../model/heap';

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
  // Daqui em diante toda resposta de "variables" já vem arrumada pelo adaptador.
  session = normalizing(session, adapter);

  const { scopes, locals: frameLocals, hidden } = await readLocals(session, adapter, frame);
  const locals: DapVariable[] = [];
  let returned: Snapshot['returned'];
  for (const v of frameLocals) {
    const r = adapter.returnValue?.(v);
    if (r) returned = r;
    else locals.push(v);
  }

  // Objetos dos arrays e das variáveis passam pelo mesmo leitor: o mesmo objeto tem o mesmo id nos dois.
  const heapReader = new HeapCollector(session, adapter, { frameId: frame.id, userTypes: await opts.userTypes?.(file) });
  const objectsOf = (c: DapVariable) => heapReader.objectId(c);
  const arrays: ArrayVar[] = [];
  const arrayVars: { array: ArrayVar; v: DapVariable }[] = [];
  const pointers: Pointer[] = [];
  const scalars: Scalar[] = [];
  const maps: MapVar[] = [];
  const elements: Record<string, DapVariable[]> = {};
  let caught: Snapshot['caught'];
  for (const v of locals) {
    // O "e" de um catch: o erro que o programa tratou.
    const error = adapter.caughtError?.(v);
    if (error) {
      caught = { name: v.name, type: error.type, ...(await caughtMessage(session, v, error, frame.id)) };
      continue;
    }
    const shape = adapter.shape(v);
    switch (shape.kind) {
      case 'empty-list':
        // Lista recém-criada: aparece vazia, para o aluno ver ela nascer antes do primeiro add.
        if (arrays.length < limits.maxArrays) arrays.push({ name: v.name, values: [], length: 0, kind: 'list' });
        break;
      case 'sequence': {
        if (arrays.length >= limits.maxArrays) break;
        const { array, children } = await readSequence(session, adapter, v, v.name, shape, limits.maxElements, true, objectsOf);
        if (shape.id) array.id = shape.id;
        // O tipo já diz que é pilha ou fila (C#: Stack<T>, Queue<T>), sem precisar olhar o código.
        if (shape.role) {
          array.kind = shape.role.role;
          if (shape.role.topFirst) array.values.reverse();
        }
        arrays.push(array);
        arrayVars.push({ array, v });
        elements[v.name] = children.slice(0, 3);
        break;
      }
      case 'map': {
        const entries = await readMap(session, adapter, v, limits.maxElements);
        maps.push({ name: v.name, entries, length: Math.max(shape.length ?? 0, entries.length), ...(shape.id ? { id: shape.id } : {}) });
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
  if (maps.length > 0) snapshot.maps = maps;
  if (caught) snapshot.caught = caught;
  const shadowed = hidden.flatMap((v) => summarize(adapter, v));
  if (shadowed.length > 0) snapshot.shadowed = shadowed;

  await linkSameArrays(session, adapter, arrayVars, frame.id);
  const refs = await heapReader.references(locals);
  const heap = heapReader.heap;
  labelObjectCells(arrays, heap);
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

/** Sessão que passa cada resposta de "variables" pelo normalize do adaptador. */
function normalizing(session: Session, adapter: LanguageAdapter): Session {
  const normalize = adapter.normalize;
  if (!normalize) return session;
  return {
    async customRequest(command: string, args?: unknown) {
      const res = await session.customRequest(command, args);
      if (command !== 'variables' || !res?.variables) return res;
      return { ...res, variables: normalize(res.variables as DapVariable[]) };
    },
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
): Promise<{ scopes: DapScope[]; locals: DapVariable[]; hidden: DapVariable[] }> {
  const { scopes } = (await session.customRequest('scopes', { frameId: frame.id })) as { scopes: DapScope[] };
  // Alguns debuggers dividem as locais em vários escopos (JavaScript tem "Local" e "Block").
  const locals: DapVariable[] = [];
  // Variáveis de fora com o mesmo nome de uma de dentro: existem, mas o código não alcança.
  const hidden: DapVariable[] = [];
  const seenNames = new Set<string>();
  for (const scope of adapter.localScopes(scopes)) {
    for (const v of await variables(session, scope.variablesReference)) {
      // O escopo mais interno vem primeiro e esconde o de fora, como no próprio código.
      if (seenNames.has(v.name)) {
        hidden.push(v);
        continue;
      }
      seenNames.add(v.name);
      locals.push(v);
    }
  }
  return { scopes, locals, hidden };
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
export function functionName(raw: string): { name: string; program: boolean; owner?: string } {
  if (raw === '<module>' || raw === '<anonymous>' || raw === '') return { name: raw, program: true };
  const noArgs = raw.replace(/\(.*\)$/, '');
  const parts = noArgs.split('.');
  const last = parts.pop() ?? noArgs;
  if (last === '<init>') return { name: `new ${(parts.pop() ?? '').split('$').pop()}`, program: false };
  // A classe do método: "Heranca$Cachorro.falar()" (Java) e "Cachorro.falar" (js-debug) dizem qual versão rodou.
  const owner = parts.pop()?.split('$').pop();
  return { name: last, program: false, ...(owner && !NOT_OWNERS.has(owner) ? { owner } : {}) };
}

/** Prefixos que o debugger põe no nome da função e que não são classes do aluno. */
const NOT_OWNERS = new Set(['global', 'Object', 'Module', '<anonymous>', 'exports']);

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
    const named = functionName(f.name);
    const { name, program } = named;
    let owner = named.owner;
    let vars: Scalar[];
    if (k === 0) {
      vars = [...top.pointers.map((p) => ({ name: p.name, value: String(p.value) })), ...(top.scalars ?? [])];
      // No Python o nome não traz a classe; o tipo do self traz.
      const self = top.refs?.find((r) => r.name === 'self' || r.name === 'this');
      owner = top.heap?.find((o) => o.id === self?.ref)?.type ?? owner;
    } else {
      // Uma chamada que falha em responder não deve esconder as outras.
      const locals = await readLocals(session, adapter, f).then(
        (r) => r.locals,
        () => [],
      );
      vars = locals.filter((v) => !adapter.returnValue?.(v)).flatMap((v) => summarize(adapter, v)).slice(0, MAX_CALL_VARS);
      const self = locals.find((v) => v.name === 'self' || v.name === 'this');
      const shape = self ? adapter.shape(self) : undefined;
      if (shape?.kind === 'object') owner = shape.type;
    }
    calls.push({ name, line: f.line, ...(program ? { program } : {}), ...(owner && !program ? { owner } : {}), vars });
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
    case 'map':
      return [{ name: v.name, value: shape.length === undefined ? '{…}' : `{${shape.length}}` }];
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
  objects?: (c: DapVariable) => Promise<string | undefined>,
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
  const refs: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    const c = byIndex[i];
    refs.push(null);
    if (!c) {
      values.push('?');
      continue;
    }
    // Objeto de uma classe do aluno: a posição guarda a referência, e o rótulo vem depois.
    const ref = objects ? await objects(c) : undefined;
    if (ref) {
      refs[i] = ref;
      values.push(adapter.formatElement(c));
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
  if (refs.some((r) => r !== null)) array.refs = refs;
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

/**
 * Entradas de um dicionário. O Map do JavaScript guarda as entradas num
 * filho "[[Entries]]"; coleções grandes podem vir em grupos "[0..99]".
 */
async function readMap(session: Session, adapter: LanguageAdapter, v: DapVariable, max: number): Promise<MapVar['entries']> {
  if (v.variablesReference <= 0 || !adapter.mapEntry) return [];
  let children = await variables(session, v.variablesReference);
  const inner = children.find((c) => c.name === '[[Entries]]') ?? children.find((c) => isRangeGroup(c.name));
  if (inner) children = await variables(session, inner.variablesReference);
  const entries: MapVar['entries'] = [];
  for (const c of children) {
    const e = adapter.mapEntry(c);
    if (!e) continue;
    const items = entries.length < MAX_LIST_ENTRIES ? await entryList(session, adapter, c, e.value, max) : undefined;
    entries.push(items ? { ...e, value: `[${items.join(', ')}]`, items } : e);
    if (entries.length >= max) break;
  }
  return entries;
}

/** Mensagem do erro capturado: no valor (Python, JavaScript) ou num campo do objeto (Java). */
async function caughtMessage(
  session: Session,
  v: DapVariable,
  error: { message?: string; messageField?: string },
  frameId: number,
): Promise<{ message?: string }> {
  if (error.message !== undefined) return { message: error.message };
  if (!error.messageField) return {};
  let fields = await variables(session, v.variablesReference);
  // Variável "lazy" do Java: o primeiro nível é o próprio objeto; os campos vêm no seguinte.
  if (!fields.some((f) => f.name === error.messageField) && fields.length === 1 && fields[0].variablesReference > 0) {
    fields = await variables(session, fields[0].variablesReference);
  }
  const field = fields.find((f) => f.name === error.messageField);
  if (field && field.value !== 'null') return { message: field.value.replace(/^"(.*)"$/s, '$1') };
  // Último recurso: perguntar ao programa. getMessage() só lê.
  try {
    const res = (await session.customRequest('evaluate', { expression: `${v.evaluateName ?? v.name}.getMessage()`, frameId, context: 'watch' })) as { result?: string };
    return res.result && res.result !== 'null' ? { message: res.result.replace(/^"(.*)"$/s, '$1') } : {};
  } catch {
    return {};
  }
}

/** Entradas cujo valor é lista são abertas até aqui: é o que um grafo (cidade e vizinhas) precisa. */
const MAX_LIST_ENTRIES = 20;

/**
 * Itens da lista guardada numa entrada. No JavaScript e no Python a própria
 * entrada é a lista; no Java a entrada é um nó com "key" e "value", e a lista
 * está em "value" ('"A":ImmutableCollections$List12@38' não mostra os itens).
 */
async function entryList(session: Session, adapter: LanguageAdapter, c: DapVariable, value: string, max: number): Promise<string[] | undefined> {
  let list: DapVariable | undefined;
  if (adapter.shape(c).kind === 'sequence') list = c;
  else if (c.variablesReference > 0 && /@\d+$/.test(value)) {
    const inner = (await variables(session, c.variablesReference)).find((k) => k.name === 'value');
    if (inner && adapter.shape(inner).kind === 'sequence') list = inner;
  }
  const shape = list ? adapter.shape(list) : undefined;
  if (!list || shape?.kind !== 'sequence') return undefined;
  return (await readSequence(session, adapter, list, '', shape, max, false)).array.values;
}

async function variables(session: Session, variablesReference: number, extra: object = {}): Promise<DapVariable[]> {
  const res = (await session.customRequest('variables', { variablesReference, ...extra })) as {
    variables?: DapVariable[];
  };
  return res.variables ?? [];
}

/** Posições que guardam objetos mostram o valor principal do objeto ("Ana"), não "Turma$Aluno@30". */
function labelObjectCells(arrays: ArrayVar[], heap: HeapObject[]): void {
  const byId = new Map(heap.map((o) => [o.id, o]));
  for (const a of arrays) {
    a.refs?.forEach((id, i) => {
      const obj = id ? byId.get(id) : undefined;
      if (obj) a.values[i] = nodeValue(obj);
    });
  }
}
