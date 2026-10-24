import type { Snapshot } from './snapshot';

/*
 * Em C, o debugger mostra todas as variáveis da função desde a primeira
 * linha, mas a que é declarada mais abaixo ainda não recebeu valor: guarda o
 * lixo que estava na memória. Um ponteiro com lixo parece apontar para um
 * struct e desenharia um nó que não existe. Por isso a variável só entra no
 * painel depois que a linha que a declara roda.
 */

/** Palavras que vêm antes de um nome sem declarar nada ("return soma;"). */
const NOT_TYPES = new Set(['return', 'else', 'case', 'goto', 'sizeof', 'typedef', 'do']);

/** Início e fim (índices de linha, base 0) da função que contém a linha. */
function functionBounds(lines: string[], index: number): [number, number] {
  let start = index;
  while (start > 0 && !/^[A-Za-z_][\w\s*]*\([^;]*\)\s*\{?\s*$/.test(lines[start])) start--;
  let end = index;
  while (end < lines.length - 1 && !/^\}/.test(lines[end])) end++;
  return [start, end];
}

/** Linha (base 1) em que o nome é declarado dentro da função, e se é no cabeçalho de um for. */
function declaration(lines: string[], from: number, to: number, name: string): { line: number; inFor: boolean } | undefined {
  const decl = new RegExp(
    `(?:^|[;({])\\s*(?:(?:const|static|unsigned|signed|long|short|volatile)\\s+)*(struct\\s+\\w+|[A-Za-z_]\\w*)\\s*\\**\\s*\\b${name}\\s*(?:\\[[^\\]]*\\])?\\s*(?:=|;|,)`,
  );
  for (let i = from; i <= to; i++) {
    const code = lines[i].replace(/\/\/.*$/, '');
    const m = decl.exec(code);
    if (m && !NOT_TYPES.has(m[1])) return { line: i + 1, inFor: /\bfor\s*\(\s*$/.test(code.slice(0, m.index + 1)) };
  }
  return undefined;
}

/** Variáveis da função parada cuja declaração ainda não rodou (está na linha parada ou abaixo). */
export function notYetDeclared(source: string, line: number, names: string[]): Set<string> {
  const lines = source.split(/\r?\n/);
  const [start, end] = functionBounds(lines, line - 1);
  const out = new Set<string>();
  for (const name of names) {
    if (!/^[A-Za-z_]\w*$/.test(name)) continue;
    const at = declaration(lines, start, end, name);
    // O for volta para a própria linha a cada volta: ali a variável dele já existe.
    if (at && (at.line > line || (at.line === line && !at.inFor))) out.add(name);
  }
  return out;
}

/** Tira as variáveis do passo, e os objetos que só elas alcançavam. */
export function dropVariables(s: Snapshot, names: Set<string>): void {
  if (names.size === 0) return;
  const dropped = (s.refs ?? []).filter((r) => names.has(r.name));
  s.arrays = s.arrays.filter((a) => !names.has(a.name));
  s.pointers = s.pointers.filter((p) => !names.has(p.name));
  if (s.scalars) s.scalars = s.scalars.filter((v) => !names.has(v.name));
  if (s.maps) s.maps = s.maps.filter((m) => !names.has(m.name));
  if (s.refs) s.refs = s.refs.filter((r) => !names.has(r.name));
  if (!s.heap || dropped.length === 0) return;
  const reach = (roots: (string | null | undefined)[]) => {
    const byId = new Map(s.heap?.map((o) => [o.id, o]));
    const seen = new Set<string>();
    const stack = roots.filter((r): r is string => !!r);
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const f of byId.get(id)?.fields ?? []) if (f.ref) stack.push(f.ref);
    }
    return seen;
  };
  const kept = reach([...(s.refs ?? []).map((r) => r.ref), ...s.arrays.flatMap((a) => a.refs ?? [])]);
  const lost = reach(dropped.map((r) => r.ref));
  s.heap = s.heap.filter((o) => kept.has(o.id) || !lost.has(o.id));
}
