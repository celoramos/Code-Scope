/*
 * Classes do arquivo: de quem cada uma herda e que métodos ela escreve. É o
 * bastante para explicar polimorfismo: quando bichos[i].falar() roda o falar
 * de Cachorro, e não o de Animal, porque o objeto é um Cachorro.
 */

export interface ClassInfo {
  parent?: string;
  methods: string[];
}

/** Palavras que parecem chamada de método mas não são declaração. */
const NOT_METHODS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'super', 'this', 'function', 'synchronized']);

export function parseClasses(source: string): Record<string, ClassInfo> {
  const decls = [...source.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)\s*(?:\(\s*([A-Za-z_$][\w$.]*)\s*\)|(?:extends\s+([A-Za-z_$][\w$.]*)))?/g)];
  const out: Record<string, ClassInfo> = {};
  decls.forEach((d, k) => {
    // O corpo vai até a próxima classe: aproximação boa para os exemplos e exercícios de aula.
    const body = source.slice((d.index ?? 0) + d[0].length, decls[k + 1]?.index ?? source.length);
    const parent = (d[2] ?? d[3])?.split('.').pop();
    const methods = new Set<string>();
    for (const m of body.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(/g)) methods.add(m[1]);
    for (const m of body.matchAll(/(?:^|[\s;{}])([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?:throws\s+[\w., ]+)?\{/gm)) {
      if (!NOT_METHODS.has(m[1])) methods.add(m[1]);
    }
    out[d[1]] = { ...(parent && parent !== 'object' ? { parent } : {}), methods: [...methods] };
  });
  return out;
}

/** A classe mais próxima acima de cls que escreve o método. */
function ancestorWith(classes: Record<string, ClassInfo>, cls: string, method: string): string | undefined {
  const seen = new Set<string>();
  for (let c = classes[cls]?.parent; c && !seen.has(c); c = classes[c]?.parent) {
    seen.add(c);
    if (classes[c]?.methods.includes(method)) return c;
  }
  return undefined;
}

/** cls escreve a própria versão do método, e esta é a versão de cima que ela trocou. */
export function overriddenIn(classes: Record<string, ClassInfo>, cls: string, method: string): string | undefined {
  return classes[cls]?.methods.includes(method) ? ancestorWith(classes, cls, method) : undefined;
}

/** cls não escreve o método: ele vem herdado desta classe de cima. */
export function inheritedFrom(classes: Record<string, ClassInfo>, cls: string, method: string): string | undefined {
  return classes[cls] && !classes[cls].methods.includes(method) ? ancestorWith(classes, cls, method) : undefined;
}
