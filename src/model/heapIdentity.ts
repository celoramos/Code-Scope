import type { HeapObject, Snapshot } from './snapshot';

/*
 * Quando o debugger não dá identidade aos objetos (JavaScript), cada passo
 * inventa ids novos ("~7"). Para o painel saber que o nó de valor 10 é o
 * mesmo de antes, comparamos os caminhos que chegam a cada objeto: de um
 * passo para o outro quase todas as variáveis continuam apontando para o
 * mesmo lugar, então o mesmo objeto mantém a maior parte dos caminhos
 * ("inicio", "inicio.proximo"...). Sem nenhuma avaliação no programa.
 */

/** Profundidade máxima dos caminhos: listas maiores ainda casam pelo começo. */
const MAX_PATH_DEPTH = 8;

/** Ids que o coletor inventou; os do debugger ("@12", "0x...") já são estáveis. */
export function isSyntheticId(id: string): boolean {
  return id.startsWith('~');
}

/** Todos os caminhos curtos de cada objeto, a partir das variáveis locais. */
export function objectPaths(s: Snapshot): Map<string, Set<string>> {
  const heap = new Map((s.heap ?? []).map((o) => [o.id, o]));
  const paths = new Map<string, Set<string>>();
  const walk = (id: string, path: string, depth: number, seen: Set<string>) => {
    if (seen.has(id)) return;
    const set = paths.get(id) ?? new Set<string>();
    set.add(path);
    paths.set(id, set);
    const obj = heap.get(id);
    if (!obj || depth >= MAX_PATH_DEPTH) return;
    seen.add(id);
    for (const f of obj.fields) if (f.ref) walk(f.ref, `${path}.${f.name}`, depth + 1, seen);
    seen.delete(id);
  };
  for (const r of s.refs ?? []) if (r.ref) walk(r.ref, r.name, 0, new Set());
  // Objetos guardados em arrays: "turma[1]" também é caminho.
  for (const a of s.arrays) a.refs?.forEach((id, i) => id && walk(id, `${a.name}[${i}]`, 0, new Set()));
  return paths;
}

/** Quantos campos simples (não referências) os dois objetos têm com o mesmo valor. */
function sameValues(a: HeapObject, b: HeapObject): { equal: number; total: number } {
  const values = new Map(a.fields.filter((f) => f.ref === undefined).map((f) => [f.name, f.value]));
  let equal = 0;
  let total = 0;
  for (const f of b.fields) {
    if (f.ref !== undefined) continue;
    total++;
    if (values.get(f.name) === f.value) equal++;
  }
  return { equal, total };
}

/**
 * Troca os ids inventados de next pelos de prev quando os objetos dividem
 * caminhos. Cada objeto de prev é usado no máximo uma vez, pelo par com mais
 * caminhos em comum.
 */
export function alignHeap(prev: Snapshot | undefined, next: Snapshot): void {
  if (!prev?.heap?.length || !next.heap?.some((o) => isSyntheticId(o.id))) return;
  const before = objectPaths(prev);
  const after = objectPaths(next);
  const prevById = new Map(prev.heap.map((o) => [o.id, o]));

  // Caminho em comum é o sinal principal; campos iguais desempatam (quando "atual"
  // anda na lista, o nó 20 divide "inicio.proximo" com ele mesmo e "atual" com o nó 10).
  // Sem caminho em comum, só casa quem tem todos os campos iguais, com nota menor.
  const pairs: { from: string; to: string; score: number }[] = [];
  for (const o of next.heap) {
    if (!isSyntheticId(o.id)) continue;
    const mine = after.get(o.id) ?? new Set<string>();
    for (const [pid, theirs] of before) {
      const p = prevById.get(pid);
      if (!p || p.type !== o.type) continue;
      let shared = 0;
      for (const path of mine) if (theirs.has(path)) shared++;
      const { equal, total } = sameValues(p, o);
      const score = shared > 0 ? shared + equal : total > 0 && equal === total ? 0.5 : 0;
      if (score > 0) pairs.push({ from: o.id, to: pid, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const rename = new Map<string, string>();
  const taken = new Set<string>(next.heap.filter((o) => !isSyntheticId(o.id)).map((o) => o.id));
  for (const p of pairs) {
    if (rename.has(p.from) || taken.has(p.to)) continue;
    rename.set(p.from, p.to);
    taken.add(p.to);
  }
  if (rename.size === 0) return;
  const swap = (id: string) => rename.get(id) ?? id;
  for (const o of next.heap as HeapObject[]) {
    o.id = swap(o.id);
    for (const f of o.fields) if (f.ref) f.ref = swap(f.ref);
  }
  for (const r of next.refs ?? []) if (r.ref) r.ref = swap(r.ref);
  // Posições de array que guardam objetos também apontam pelo id.
  for (const a of next.arrays) if (a.refs) a.refs = a.refs.map((id) => (id ? swap(id) : id));
}
