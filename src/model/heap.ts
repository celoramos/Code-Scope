import { objectPaths } from './heapIdentity';
import { MESSAGES, type Language } from './messages';
import type { HeapObject, Snapshot } from './snapshot';

/*
 * Como desenhar os objetos de um passo. Uma classe que aponta para ela mesma
 * vira estrutura: com um campo assim (proximo) é lista ligada, com dois
 * (esquerda, direita) é árvore. As outras viram cartões com os campos. Em
 * todos, as variáveis aparecem como etiquetas no objeto para onde apontam:
 * duas etiquetas no mesmo cartão são duas variáveis no mesmo objeto.
 */

export interface HeapView {
  lists: ListView[];
  trees: TreeView[];
  objects: ObjectView[];
  /** Variáveis locais que apontam para null. */
  nulls: string[];
  /**
   * Objetos guardados em arrays, desenhados dentro da posição: por array, a
   * posição, os outros campos e as variáveis que apontam para aquele objeto.
   */
  cells: Record<string, CellObject[]>;
}

export interface CellObject {
  index: number;
  id: string;
  /** Campos além do valor principal, já como "nota: 8.5". */
  details: string[];
  /** Classe do objeto, quando o array mistura classes (Cachorro, Gato...). */
  type?: string;
  names: string[];
}

export interface NodeView {
  id: string;
  /** O valor que o nó guarda (o primeiro campo simples). */
  value: string;
  /** Variáveis locais que apontam para este nó. */
  names: string[];
}

export interface ListView {
  type: string;
  /** Campo que liga um nó ao seguinte: "proximo", "next". */
  link: string;
  nodes: NodeView[];
  /** A lista volta para um nó que já apareceu. */
  cycle: boolean;
}

export interface TreeNodeView extends NodeView {
  /** Filhos na ordem esquerda, direita; null onde não há filho. */
  children: (TreeNodeView | null)[];
}

export interface TreeView {
  type: string;
  links: string[];
  root: TreeNodeView;
}

export interface ObjectView {
  id: string;
  type: string;
  names: string[];
  fields: { name: string; value: string; ref?: string | null; target?: string }[];
  truncated?: boolean;
}

/** Como null aparece em cada linguagem. */
const NULLS = new Set(['null', 'None', 'undefined']);

/** Variáveis que apontaram para objeto em algum dos dois passos: o que muda nelas é referência, não valor. */
export function referenceNames(prev: Snapshot | undefined, next: Snapshot): Set<string> {
  return new Set([...(prev?.refs ?? []), ...(next.refs ?? [])].map((r) => r.name));
}

/** Campos que guardam o valor de um nó, em ordem de preferência. */
const VALUE_FIELDS = /^(valor|value|val|dado|data|info|chave|key|item|elemento|element|conteudo|content)$/i;
/** Campos de árvore que vão à esquerda e à direita. */
const LEFT = /^(esq|esquerda|left|l|menor|filhoEsquerdo|filho_esquerdo)$/i;
const RIGHT = /^(dir|direita|right|r|maior|filhoDireito|filho_direito)$/i;
/** Ligação para trás numa lista dupla: não conta como galho de árvore. */
const BACK = /^(ant|anterior|prev|previous|pai|parent)$/i;

export function heapView(s: Snapshot): HeapView {
  const heap = s.heap ?? [];
  const byId = new Map(heap.map((o) => [o.id, o]));
  const names = new Map<string, string[]>();
  for (const r of s.refs ?? []) if (r.ref) names.set(r.ref, [...(names.get(r.ref) ?? []), r.name]);
  const namesOf = (id: string) => names.get(id) ?? [];

  // Campos que apontam para um objeto do mesmo tipo, por tipo.
  const selfLinks = new Map<string, Set<string>>();
  for (const o of heap) {
    for (const f of o.fields) {
      if (f.ref && byId.get(f.ref)?.type === o.type) selfLinks.set(o.type, (selfLinks.get(o.type) ?? new Set()).add(f.name));
    }
  }
  // Um campo null com o mesmo nome em outro nó do tipo também é ligação.
  const linksOf = (type: string) => [...(selfLinks.get(type) ?? [])].filter((f) => !BACK.test(f) || (selfLinks.get(type)?.size ?? 0) === 1);

  const view: HeapView = { lists: [], trees: [], objects: [], nulls: (s.refs ?? []).filter((r) => r.ref === null).map((r) => r.name), cells: {} };
  // Objeto num array aparece dentro da posição; sem cartão separado.
  for (const a of s.arrays) {
    // A classe só aparece quando o array mistura classes: é aí que ela importa (polimorfismo).
    const types = new Set((a.refs ?? []).map((id) => (id ? byId.get(id)?.type : undefined)).filter(Boolean));
    a.refs?.forEach((id, index) => {
      const o = id ? byId.get(id) : undefined;
      if (!o || !id) return;
      const main = nodeValue(o);
      const details = o.fields.filter((f) => f.ref === undefined && f.value !== main).slice(0, 2).map((f) => `${f.name}: ${f.value}`);
      (view.cells[a.name] ??= []).push({ index, id, details, names: namesOf(id), ...(types.size > 1 ? { type: o.type } : {}) });
    });
  }
  const inCells = new Set(Object.values(view.cells).flatMap((list) => list.map((c) => c.id)));
  const used = new Set<string>();
  const nodeOf = (o: HeapObject): NodeView => ({ id: o.id, value: nodeValue(o), names: namesOf(o.id) });

  for (const type of new Set(heap.map((o) => o.type))) {
    const links = linksOf(type);
    if (links.length === 0) continue;
    const nodes = heap.filter((o) => o.type === type);
    const pointed = new Set(nodes.flatMap((o) => o.fields.filter((f) => links.includes(f.name) && f.ref).map((f) => f.ref as string)));
    // Começo de cada estrutura: nó que nenhum outro nó do tipo aponta.
    const starts = [...nodes.filter((o) => !pointed.has(o.id)), ...nodes];

    if (links.length === 1) {
      const link = links[0];
      for (const start of starts) {
        if (used.has(start.id)) continue;
        const list: ListView = { type, link, nodes: [], cycle: false };
        for (let o: HeapObject | undefined = start; o; ) {
          if (used.has(o.id)) {
            list.cycle = list.nodes.some((n) => n.id === o?.id);
            break;
          }
          used.add(o.id);
          list.nodes.push(nodeOf(o));
          const next: string | null | undefined = o.fields.find((f) => f.name === link)?.ref;
          o = next ? byId.get(next) : undefined;
        }
        view.lists.push(list);
      }
    } else {
      const ordered = orderBranches(links);
      const build = (id: string | null | undefined, path: Set<string>): TreeNodeView | null => {
        const o = id ? byId.get(id) : undefined;
        if (!o || path.has(o.id)) return null;
        used.add(o.id);
        const inner = new Set(path).add(o.id);
        return { ...nodeOf(o), children: ordered.map((f) => build(o.fields.find((x) => x.name === f)?.ref, inner)) };
      };
      for (const start of starts) {
        if (used.has(start.id)) continue;
        const root = build(start.id, new Set());
        if (root) view.trees.push({ type, links: ordered, root });
      }
    }
  }

  for (const o of heap) {
    if (used.has(o.id) || inCells.has(o.id)) continue;
    view.objects.push({
      id: o.id,
      type: o.type,
      names: namesOf(o.id),
      fields: o.fields.map((f) => ({
        name: f.name,
        value: f.value,
        ...(f.ref !== undefined ? { ref: f.ref } : {}),
        ...(f.ref ? { target: targetLabel(byId.get(f.ref), namesOf(f.ref)) } : {}),
      })),
      ...(o.truncated ? { truncated: true } : {}),
    });
  }
  return view;
}

/** Esquerda antes da direita; o resto na ordem em que veio. */
function orderBranches(links: string[]): string[] {
  const rank = (f: string) => (LEFT.test(f) ? 0 : RIGHT.test(f) ? 2 : 1);
  return [...links].sort((a, b) => rank(a) - rank(b));
}

/** O que o nó guarda: o campo de nome conhecido, senão o primeiro campo simples. */
export function nodeValue(o: HeapObject): string {
  const simple = o.fields.filter((f) => f.ref === undefined);
  return (simple.find((f) => VALUE_FIELDS.test(f.name)) ?? simple[0])?.value ?? o.type;
}

function targetLabel(o: HeapObject | undefined, names: string[]): string {
  if (!o) return '?';
  return names.length > 0 ? names.join(', ') : o.type;
}

/** Ids de arrays com mais de um nome: o mesmo array em duas variáveis. */
export function arrayAliases(s: Snapshot): Map<string, string[]> {
  const byId = new Map<string, string[]>();
  for (const a of s.arrays) if (a.id) byId.set(a.id, [...(byId.get(a.id) ?? []), a.name]);
  return new Map([...byId].filter(([, names]) => names.length > 1));
}

/**
 * Frases sobre objetos e referências entre dois passos: objeto novo,
 * variável que passou a apontar para outro lugar (ou para o mesmo objeto de
 * outra variável), campo que mudou. Também diz quando dois nomes são o mesmo
 * array.
 */
export function explainHeap(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  const m = MESSAGES[language];
  const out: string[] = [];
  const before = new Map((prev?.heap ?? []).map((o) => [o.id, o]));
  const after = new Map((next.heap ?? []).map((o) => [o.id, o]));
  const prevRefs = new Map((prev?.refs ?? []).map((r) => [r.name, r.ref]));
  const announced = new Set<string>();
  const label = (id: string) => describeObject(after.get(id), before.has(id), m, next);

  for (const r of next.refs ?? []) {
    const old = prevRefs.get(r.name);
    if (prevRefs.has(r.name) && old === r.ref) continue;
    if (r.ref === null) {
      if (prevRefs.has(r.name)) out.push(m.refNull(r.name));
      continue;
    }
    const obj = after.get(r.ref);
    if (!obj) continue;
    if (!before.has(r.ref) && !announced.has(r.ref)) {
      announced.add(r.ref);
      out.push(m.objectCreated(obj.type, r.name, isNode(obj, next) ? nodeValue(obj) : undefined));
      continue;
    }
    // Apontar para um objeto que outra variável já apontava: as duas são o mesmo objeto.
    const other = (next.refs ?? []).find((o) => o.name !== r.name && o.ref === r.ref && prevRefs.get(o.name) === r.ref);
    out.push(other ? m.refAlias(r.name, other.name) : m.refPointsTo(r.name, label(r.ref)));
  }

  // Em JavaScript e Python, null/None numa variável não diz o tipo: ela vira valor simples.
  const nextRefs = new Set((next.refs ?? []).map((r) => r.name));
  for (const [name, ref] of prevRefs) {
    if (ref !== null && !nextRefs.has(name) && (next.scalars ?? []).some((v) => v.name === name && NULLS.has(v.value))) out.push(m.refNull(name));
  }

  const paths = objectPaths(next);
  const pathOf = (id: string) => [...(paths.get(id) ?? [])].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
  for (const o of next.heap ?? []) {
    const p = before.get(o.id);
    const path = pathOf(o.id);
    if (!p || !path) continue;
    const old = new Map(p.fields.map((f) => [f.name, f]));
    for (const f of o.fields) {
      const was = old.get(f.name);
      if (!was) continue;
      const where = `${path}.${f.name}`;
      if (f.ref !== undefined || was.ref !== undefined) {
        if (f.ref === was.ref) continue;
        if (f.ref === null || f.ref === undefined) out.push(m.fieldNull(where));
        else if (!before.has(f.ref) && !announced.has(f.ref)) {
          announced.add(f.ref);
          out.push(m.fieldPointsTo(where, describeObject(after.get(f.ref), false, m, next)));
        } else out.push(m.fieldPointsTo(where, label(f.ref)));
      } else if (f.value !== was.value) {
        out.push(m.fieldChanged(where, was.value, f.value));
      }
    }
  }

  // Array com dois nomes: b = a não copia nada.
  const prevAliases = prev ? arrayAliases(prev) : new Map<string, string[]>();
  for (const [id, names] of arrayAliases(next)) {
    const had = prevAliases.get(id) ?? [];
    for (const name of names.slice(1)) if (!had.includes(name)) out.push(m.arrayAlias(names[0], name));
  }
  return out;
}

/** O que o painel destaca: objetos que acabaram de aparecer e campos que mudaram. */
export interface HeapDelta {
  added: string[];
  /** Nomes dos campos alterados, por id do objeto. */
  fields: Record<string, string[]>;
}

export function heapDelta(prev: Snapshot | undefined, next: Snapshot): HeapDelta {
  const before = new Map((prev?.heap ?? []).map((o) => [o.id, o]));
  const delta: HeapDelta = { added: [], fields: {} };
  if (!prev) return delta;
  for (const o of next.heap ?? []) {
    const p = before.get(o.id);
    if (!p) {
      delta.added.push(o.id);
      continue;
    }
    const old = new Map(p.fields.map((f) => [f.name, f]));
    const changed = o.fields.filter((f) => {
      const was = old.get(f.name);
      return was && (was.value !== f.value || was.ref !== f.ref);
    });
    if (changed.length > 0) delta.fields[o.id] = changed.map((f) => f.name);
  }
  return delta;
}

function isNode(o: HeapObject, s: Snapshot): boolean {
  const types = new Map((s.heap ?? []).map((x) => [x.id, x.type]));
  return o.fields.some((f) => f.ref && types.get(f.ref) === o.type) || (s.heap ?? []).some((x) => x.type === o.type && x.fields.some((f) => f.ref === o.id));
}

function describeObject(o: HeapObject | undefined, existed: boolean, m: (typeof MESSAGES)[Language], s: Snapshot): string {
  if (!o) return '?';
  const value = nodeValue(o);
  // Objeto guardado num array: o nome da posição diz mais que o tipo ("turma[2] (Caio)").
  const inArray = s.arrays.flatMap((a) => (a.refs ?? []).map((id, i) => (id === o.id ? `${a.name}[${i}]` : undefined))).find(Boolean);
  if (inArray) return `${inArray} (${value})`;
  if (isNode(o, s)) return existed ? m.nodeLabel(value) : m.newNodeLabel(value);
  return existed ? m.objectLabel(o.type, value) : m.newObjectLabel(o.type, value);
}
