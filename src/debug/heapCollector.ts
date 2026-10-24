import type { ArrayVar, HeapObject, ObjectField, Reference } from '../model/snapshot';
import type { LanguageAdapter, VariableShape } from './adapters/adapter';
import type { DapVariable } from './dap';
import type { Session } from './dapCollector';

/*
 * Objetos alcançados pelas variáveis locais: os campos de cada um e quem
 * aponta para quem. É o que permite desenhar referências, listas ligadas e
 * árvores.
 *
 * A parte difícil é a identidade. Java e Python mostram um número no valor
 * ("@12", "0x...") e duas variáveis com o mesmo número são o mesmo objeto. O
 * js-debug não mostra nada, então a pergunta vai para o próprio programa:
 * evaluate("atual === inicio.proximo"). Para o mesmo objeto manter o id de um
 * passo para o outro, alignHeap (src/model/heapIdentity.ts) compara os
 * caminhos que levam a cada objeto nos dois passos.
 */

type ObjectShape = Extract<VariableShape, { kind: 'object' }>;

/** Objetos lidos por passo: uma lista de mil nós não deve travar o F10. */
export const MAX_OBJECTS = 40;
/** Perguntas "a === b" por passo, para debuggers sem identidade no valor. */
const MAX_EVALS = 80;

/** Ids inventados quando o debugger não dá um; únicos durante toda a sessão da extensão. */
let syntheticIds = 0;

export interface HeapOptions {
  frameId: number;
  /** Classes declaradas no arquivo; sem esta lista, todo objeto é desenhado. */
  userTypes?: ReadonlySet<string>;
}

/**
 * Lê objetos sob demanda durante um passo: as variáveis locais e as posições
 * de arrays que guardam objetos usam o mesmo contexto, então o mesmo objeto
 * tem o mesmo id onde quer que apareça.
 */
export class HeapCollector {
  private readonly ctx: HeapContext;

  constructor(session: Session, adapter: LanguageAdapter, opts: HeapOptions) {
    this.ctx = new HeapContext(session, adapter, opts);
  }

  /** id do objeto guardado na variável, se for objeto de uma classe do aluno. */
  async objectId(v: DapVariable): Promise<string | undefined> {
    const shape = this.ctx.adapter.shape(v);
    return shape.kind === 'object' ? this.ctx.visit(v, shape) : undefined;
  }

  /** Variáveis locais que apontam para objetos (ou para null). */
  async references(locals: DapVariable[]): Promise<Reference[]> {
    const refs: Reference[] = [];
    for (const v of locals) {
      const shape = this.ctx.adapter.shape(v);
      if (shape.kind === 'null') {
        refs.push({ name: v.name, ref: null });
      } else if (shape.kind === 'object') {
        const id = await this.ctx.visit(v, shape);
        if (id !== undefined) refs.push({ name: v.name, ref: id });
      }
    }
    return refs;
  }

  get heap(): HeapObject[] {
    return [...this.ctx.objects.values()];
  }
}

/**
 * Arrays que são o mesmo objeto ganham o mesmo id. Java já traz o id no
 * valor; nos outros, dois arrays com o mesmo conteúdo são comparados com
 * evaluate ("a === b", "a is b").
 */
export async function linkSameArrays(
  session: Session,
  adapter: LanguageAdapter,
  arrays: { array: ArrayVar; v: DapVariable }[],
  frameId: number,
): Promise<void> {
  if (!adapter.identityExpr) return;
  const pending = arrays.filter((a) => !a.array.id && !a.array.rows);
  let evals = 0;
  for (let i = 0; i < pending.length; i++) {
    for (let j = 0; j < i && evals < MAX_EVALS; j++) {
      const a = pending[j];
      const b = pending[i];
      if (b.array.id || a.array.values.join('\u0000') !== b.array.values.join('\u0000')) continue;
      evals++;
      if (await evalTrue(session, frameId, adapter.identityExpr(exprOf(a.v), exprOf(b.v)))) {
        a.array.id ??= `~${++syntheticIds}`;
        b.array.id = a.array.id;
      }
    }
  }
}

class HeapContext {
  readonly objects = new Map<string, HeapObject>();
  private evals = 0;

  constructor(
    private readonly session: Session,
    readonly adapter: LanguageAdapter,
    private readonly opts: HeapOptions,
  ) {}

  /** Lê o objeto (uma vez por id) e devolve o id, ou undefined se não é de uma classe do aluno. */
  async visit(v: DapVariable, shape: ObjectShape): Promise<string | undefined> {
    if (this.opts.userTypes && !this.opts.userTypes.has(shape.type)) return undefined;
    const id = await this.identify(v, shape);
    if (this.objects.has(id)) return id;
    const obj: HeapObject = { id, type: shape.type, fields: [], ...(v.evaluateName ? { expr: v.evaluateName } : {}) };
    this.objects.set(id, obj);
    if (this.objects.size > MAX_OBJECTS) {
      obj.truncated = true;
      return id;
    }

    const all = await variables(this.session, v.variablesReference);
    const children = this.adapter.objectFields?.(all) ?? all;
    for (const c of children) {
      const field = await this.field(c);
      if (field) obj.fields.push(field);
    }
    return id;
  }

  private async field(c: DapVariable): Promise<ObjectField | undefined> {
    const s = this.adapter.shape(c);
    switch (s.kind) {
      case 'object': {
        const ref = await this.visit(c, s);
        return ref !== undefined ? { name: c.name, value: c.value, ref } : { name: c.name, value: c.value };
      }
      case 'null':
        return { name: c.name, value: c.value, ref: null };
      case 'integer':
        return { name: c.name, value: String(s.value) };
      case 'scalar':
        // None/null/undefined num campo é uma referência vazia: a lista acaba ali.
        return this.adapter.isNull?.(c) ? { name: c.name, value: c.value, ref: null } : { name: c.name, value: s.value };
      case 'sequence':
        return { name: c.name, value: s.length === undefined ? '[…]' : `[${s.length}]` };
      case 'empty-list':
        return { name: c.name, value: '[]' };
      case 'map':
        return { name: c.name, value: s.length === undefined ? '{…}' : `{${s.length}}` };
      default:
        return this.adapter.isNull?.(c) ? { name: c.name, value: c.value, ref: null } : undefined;
    }
  }

  /**
   * Identidade do objeto: a do debugger; senão, a de um objeto já visto neste
   * passo que o próprio programa diz ser o mesmo. Entre passos, quem mantém o
   * id é alignHeap, pelos caminhos.
   */
  private async identify(v: DapVariable, shape: ObjectShape): Promise<string> {
    if (shape.id) return shape.id;
    const identity = this.adapter.identityExpr;
    if (identity && v.evaluateName) {
      // Mesmo texto primeiro: quase sempre é o mesmo objeto, e a primeira pergunta já acerta.
      const candidates = [...this.objects.values()]
        .filter((o) => o.type === shape.type && o.expr !== undefined)
        .sort((a, b) => Number(this.texts.get(b.id) === v.value) - Number(this.texts.get(a.id) === v.value));
      for (const o of candidates) {
        if (this.evals >= MAX_EVALS) break;
        this.evals++;
        if (await evalTrue(this.session, this.opts.frameId, identity(v.evaluateName, o.expr as string))) return o.id;
      }
    }
    const id = `~${++syntheticIds}`;
    this.texts.set(id, v.value);
    return id;
  }

  /** Texto do valor de cada objeto sem identidade, para ordenar as perguntas. */
  private readonly texts = new Map<string, string>();
}

function exprOf(v: DapVariable): string {
  return v.evaluateName ?? v.name;
}

/** Pergunta ao programa se a expressão é verdadeira; erro (variável que não existe mais) conta como não. */
async function evalTrue(session: Session, frameId: number, expression: string): Promise<boolean> {
  try {
    const res = (await session.customRequest('evaluate', { expression, frameId, context: 'watch' })) as { result?: string };
    return res.result === 'true' || res.result === 'True';
  } catch {
    return false;
  }
}

async function variables(session: Session, variablesReference: number): Promise<DapVariable[]> {
  const res = (await session.customRequest('variables', { variablesReference })) as { variables?: DapVariable[] };
  return res.variables ?? [];
}
