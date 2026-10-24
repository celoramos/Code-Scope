import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Grafo guardado como lista de adjacência: um dicionário em que cada chave
 * tem a lista das vizinhas, e as vizinhas são chaves do mesmo dicionário
 * ({A: [B, C], B: [A, D]...}). Junto vem o estado de uma busca (BFS, DFS)
 * pelos nomes de sempre: visitados, atual, fila ou pilha.
 */

export interface GraphView {
  name: string;
  nodes: string[];
  /** Pares de nós ligados; ida e volta viram uma ligação só. */
  edges: [string, string][];
  /** Ligações de mão única (o grafo não é simétrico). */
  directed: boolean;
  visited: string[];
  current?: string;
  /** Nós esperando na fila ou na pilha da busca, na ordem. */
  frontier: string[];
}

const VISITED = /^(visitad[oa]s?|visited|vistos?|seen|explorad[oa]s?|marcad[oa]s?)$/i;
const CURRENT = /^(atual|current|cur|no|nó|vertice|vértice|node|u|v)$/i;
const FRONTIER = /^(fila|pilha|queue|stack|frontier|fronteira|abertos?|pendentes?)$/i;

/** "'A'", "\"A\"" e A são o mesmo nó. */
function plain(text: string): string {
  return text.trim().replace(/^(["'])(.*)\1$/, '$2');
}

export function graphViews(s: Snapshot): GraphView[] {
  const out: GraphView[] = [];
  for (const map of s.maps ?? []) {
    if (map.entries.length < 2 || !map.entries.every((e) => e.items)) continue;
    const nodes = map.entries.map((e) => plain(e.key));
    const known = new Set(nodes);
    const all = map.entries.flatMap((e) => (e.items ?? []).map(plain));
    // A maior parte das vizinhas precisa ser chave do próprio dicionário.
    if (all.length === 0 || all.filter((n) => known.has(n)).length < all.length / 2) continue;

    const arcs = new Set<string>();
    for (const e of map.entries) for (const n of e.items ?? []) if (known.has(plain(n))) arcs.add(`${plain(e.key)}\u0000${plain(n)}`);
    const edges: [string, string][] = [];
    let directed = false;
    for (const arc of arcs) {
      const [a, b] = arc.split('\u0000');
      if (!arcs.has(`${b}\u0000${a}`)) directed = true;
      if (a <= b || !arcs.has(`${b}\u0000${a}`)) edges.push([a, b]);
    }

    const list = (re: RegExp) => s.arrays.filter((a) => re.test(a.name)).flatMap((a) => a.values.map(plain));
    const visited = [...new Set(list(VISITED).filter((n) => known.has(n)))];
    const frontier = list(FRONTIER).filter((n) => known.has(n));
    const current = [...(s.scalars ?? []).map((v) => ({ name: v.name, value: v.value })), ...s.pointers.map((p) => ({ name: p.name, value: String(p.value) }))]
      .filter((v) => CURRENT.test(v.name))
      .map((v) => plain(v.value))
      .find((v) => known.has(v));
    out.push({ name: map.name, nodes, edges, directed, visited, ...(current ? { current } : {}), frontier });
  }
  return out;
}

/** Frases da busca: nó novo marcado como visitado e o nó que passou a ser olhado. */
export function graphNotes(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  if (!prev) return [];
  const m = MESSAGES[language];
  const before = new Map(graphViews(prev).map((g) => [g.name, g]));
  const out: string[] = [];
  for (const g of graphViews(next)) {
    const p = before.get(g.name);
    if (!p) continue;
    for (const n of g.visited) if (!p.visited.includes(n)) out.push(m.graphVisited(n, g.visited.length, g.nodes.length));
    if (g.current && g.current !== p.current) out.push(m.graphCurrent(g.current));
  }
  return out;
}
