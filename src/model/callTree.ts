import { callChanges } from './calls';
import type { Snapshot } from './snapshot';

/*
 * Árvore de recursão: todas as chamadas desde o começo, cada uma pendurada em
 * quem chamou. A pilha de chamadas mostra um galho por vez; a árvore mostra o
 * caminho todo, e é ela que explica por que fib(n-1) + fib(n-2) é lento: o
 * mesmo fib(2) aparece várias vezes.
 */

export interface CallNode {
  /** Ordem em que a chamada começou, a partir de 0: serve de id. */
  id: number;
  name: string;
  /** "fib(4)": o nome com o valor das variáveis no começo da chamada. */
  label: string;
  /** O que a chamada devolveu, quando já terminou e o debugger disse. */
  returned?: string;
  /** Já terminou. */
  done: boolean;
  /** Está na pilha agora, no passo que o aluno está vendo. */
  active: boolean;
  children: CallNode[];
}

export interface CallTree {
  root: CallNode;
  /** Total de chamadas da função recursiva. */
  calls: number;
  /** Chamadas repetidas: mesmo rótulo aparecendo mais de uma vez (fib(2) três vezes). */
  repeated: Record<string, number>;
}

/**
 * Monta a árvore a partir dos passos até o atual. Só devolve árvore quando há
 * recursão que se divide (algum nó com dois filhos da mesma função): para
 * recursão em linha, como o fatorial, a pilha de chamadas já basta.
 */
export function buildCallTree(past: readonly Snapshot[]): CallTree | undefined {
  const first = past.find((s) => s.calls?.length);
  if (!first) return undefined;
  let next = 0;
  const node = (name: string, vars: { name: string; value: string }[]): CallNode => ({
    id: next++,
    name,
    label: `${name}(${vars.slice(0, 3).map((v) => v.value).join(', ')})`,
    done: false,
    active: true,
    children: [],
  });

  // A pilha do primeiro passo vira o tronco da árvore.
  const stack: CallNode[] = (first.calls ?? []).map((c) => node(c.program ? '' : c.name, c.program ? [] : c.vars));
  for (let k = 1; k < stack.length; k++) stack[k - 1].children.push(stack[k]);
  const root = stack[0];

  for (let k = past.indexOf(first) + 1; k < past.length; k++) {
    for (const c of callChanges(past[k - 1], past[k])) {
      if (c.kind === 'return') {
        const done = stack.pop();
        if (!done) continue;
        done.done = true;
        done.active = false;
        if (c.value !== undefined) done.returned = c.value;
      } else {
        const parent = stack[stack.length - 1];
        const child = node(c.name, c.vars);
        if (parent) parent.children.push(child);
        stack.push(child);
      }
    }
  }

  // Recursão que se divide: alguma chamada com dois filhos de mesmo nome que ela.
  let branching = false;
  const byName: Record<string, number> = {};
  const byLabel: Record<string, number> = {};
  const walk = (n: CallNode) => {
    if (n.children.filter((c) => c.name === n.name).length >= 2) branching = true;
    if (n.name) {
      byName[n.name] = (byName[n.name] ?? 0) + 1;
      byLabel[n.label] = (byLabel[n.label] ?? 0) + 1;
    }
    for (const c of n.children) walk(c);
  };
  if (!root) return undefined;
  walk(root);
  if (!branching) return undefined;
  const repeated = Object.fromEntries(Object.entries(byLabel).filter(([, n]) => n > 1));
  return { root, calls: Math.max(...Object.values(byName)), repeated };
}
