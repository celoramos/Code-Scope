import type { Snapshot } from '../model/snapshot';

/*
 * O debugger diz a classe do objeto (Stack, ArrayDeque, LinkedList), mas não
 * diz como o programa usa: o mesmo ArrayDeque pode ser pilha ou fila. Quem sabe
 * é o código-fonte, então estas regras leem o arquivo Java.
 *
 * Detalhe que muda o desenho: Stack (filha de Vector) empilha no fim, então o
 * topo é o último elemento; ArrayDeque e LinkedList empilham no começo
 * (push = addFirst), então o topo é o elemento 0. O modelo combina "topo no
 * fim", e por isso a ordem é invertida quando o topo vem primeiro.
 */

export interface CollectionRole {
  role: 'stack' | 'queue';
  /** O adaptador entrega o topo da pilha na posição 0. */
  topFirst: boolean;
}

const STACK_OPS = /^(push|pop)$/;
const QUEUE_OPS = /^(offer|poll|element)$/;

export function collectionRole(source: string, name: string): CollectionRole | undefined {
  const n = name.replace(/\$/g, '\\$');
  const declared = new RegExp(`\\b(\\w+)\\s*(?:<[^;=()]*>)?\\s+${n}\\s*[=;]`).exec(source)?.[1];
  const created = new RegExp(`\\b${n}\\s*=\\s*new\\s+(\\w+)`).exec(source)?.[1];
  const ops = [...source.matchAll(new RegExp(`\\b${n}\\s*\\.\\s*(\\w+)\\s*\\(`, 'g'))].map((m) => m[1]);

  const isStackClass = declared === 'Stack' || created === 'Stack';
  if (isStackClass) return { role: 'stack', topFirst: false };
  if (declared === 'Queue' || ops.some((op) => QUEUE_OPS.test(op))) return { role: 'queue', topFirst: false };
  if (ops.some((op) => STACK_OPS.test(op))) return { role: 'stack', topFirst: true };
  return undefined;
}

/** Marca listas usadas como pilha ou fila e deixa a pilha com o topo no fim. */
export function applyCollectionRoles(snapshot: Snapshot, source: string): void {
  for (const arr of snapshot.arrays) {
    if (arr.kind !== 'list') continue;
    const role = collectionRole(source, arr.name);
    if (!role) continue;
    arr.kind = role.role;
    if (role.topFirst) arr.values.reverse();
  }
}
