import type { ArrayVar, Snapshot } from './snapshot';

export type Change =
  | { kind: 'set'; array: string; index: number; from: string; to: string }
  /** steps 2: a troca terminou agora, mas começou no passo anterior (via variável auxiliar). */
  | { kind: 'swap'; array: string; a: number; b: number; steps: 1 | 2 }
  | { kind: 'array-added'; array: string; length: number }
  | { kind: 'array-removed'; array: string }
  | { kind: 'array-resized'; array: string; from: number; to: number }
  | { kind: 'pointer'; name: string; from?: number; to?: number };

/**
 * O que mudou de prev para next. Se older (o passo antes de prev) vier, uma
 * troca feita em dois passos com variável auxiliar também é reconhecida.
 */
export function diff(prev: Snapshot | undefined, next: Snapshot, older?: Snapshot): Change[] {
  if (!prev) return next.arrays.map((a) => ({ kind: 'array-added', array: a.name, length: a.length }));

  const changes: Change[] = [];
  const before = byName(prev.arrays);
  const oldest = older ? byName(older.arrays) : undefined;

  for (const arr of next.arrays) {
    const p = before.get(arr.name);
    if (!p) {
      changes.push({ kind: 'array-added', array: arr.name, length: arr.length });
    } else if (p.length !== arr.length) {
      changes.push({ kind: 'array-resized', array: arr.name, from: p.length, to: arr.length });
    } else {
      changes.push(...completeTwoStepSwaps(arrayChanges(p, arr), oldest?.get(arr.name), arr));
    }
  }
  const after = byName(next.arrays);
  for (const p of prev.arrays) {
    if (!after.has(p.name)) changes.push({ kind: 'array-removed', array: p.name });
  }

  changes.push(...pointerChanges(prev, next));
  return changes;
}

/** Posições alteradas de um mesmo array, juntando pares que trocaram de valor. */
function arrayChanges(prev: ArrayVar, next: ArrayVar): Change[] {
  const changed: number[] = [];
  const n = Math.min(prev.values.length, next.values.length);
  for (let i = 0; i < n; i++) if (prev.values[i] !== next.values[i]) changed.push(i);

  const paired = new Set<number>();
  const changes: Change[] = [];
  for (const a of changed) {
    if (paired.has(a)) continue;
    const b = changed.find(
      (b) => b > a && !paired.has(b) && prev.values[a] === next.values[b] && prev.values[b] === next.values[a],
    );
    if (b !== undefined) {
      paired.add(a).add(b);
      changes.push({ kind: 'swap', array: next.name, a, b, steps: 1 });
    }
  }
  for (const i of changed) {
    if (!paired.has(i)) {
      changes.push({ kind: 'set', array: next.name, index: i, from: prev.values[i], to: next.values[i] });
    }
  }
  return changes;
}

/**
 * Troca com auxiliar: temp = a[x]; a[x] = a[y]; a[y] = temp.
 * O passo do meio só mostra a[x] mudando; o último só mostra a[y]. Olhando
 * dois passos atrás a troca aparece inteira, então o último "set" vira "swap".
 */
function completeTwoStepSwaps(latest: Change[], older: ArrayVar | undefined, next: ArrayVar): Change[] {
  if (!older || older.length !== next.length) return latest;
  const sets = latest.filter((c): c is Extract<Change, { kind: 'set' }> => c.kind === 'set');
  if (sets.length === 0) return latest;

  const swaps = arrayChanges(older, next).filter((c): c is Extract<Change, { kind: 'swap' }> => c.kind === 'swap');
  return latest.map((c) => {
    if (c.kind !== 'set') return c;
    const s = swaps.find((s) => s.a === c.index || s.b === c.index);
    const other = s && (s.a === c.index ? s.b : s.a);
    if (!s || sets.some((x) => x.index === other)) return c;
    return { ...s, steps: 2 };
  });
}

function pointerChanges(prev: Snapshot, next: Snapshot): Change[] {
  const before = new Map(prev.pointers.map((p) => [p.name, p.value]));
  const after = new Map(next.pointers.map((p) => [p.name, p.value]));
  const changes: Change[] = [];
  for (const [name, to] of after) {
    const from = before.get(name);
    if (from !== to) changes.push({ kind: 'pointer', name, from, to });
  }
  for (const [name, from] of before) {
    if (!after.has(name)) changes.push({ kind: 'pointer', name, from });
  }
  return changes;
}

function byName(arrays: ArrayVar[]): Map<string, ArrayVar> {
  return new Map(arrays.map((a) => [a.name, a]));
}
