import type { ArrayVar, Snapshot } from './snapshot';

export type Structure = 'array' | 'list' | 'matrix';

/*
 * Em matrizes, "array" é o nome da linha ("grade[1]"), então as mudanças de
 * células reaproveitam os mesmos tipos de um array simples.
 */
export type Change =
  | { kind: 'set'; array: string; index: number; from: string; to: string }
  /** steps 2: a troca terminou agora, mas começou no passo anterior (via variável auxiliar). */
  | { kind: 'swap'; array: string; a: number; b: number; steps: 1 | 2 }
  /** Lista ganhou um item; shifted diz se havia itens depois dele, que andaram para a direita. */
  | { kind: 'insert'; array: string; index: number; value: string; shifted: boolean }
  /** Lista perdeu um item; shifted diz se os itens seguintes voltaram uma posição. */
  | { kind: 'remove'; array: string; index: number; value: string; shifted: boolean }
  | { kind: 'array-added'; array: string; length: number; structure: Structure; cols?: number }
  | { kind: 'array-removed'; array: string }
  | { kind: 'array-resized'; array: string; from: number; to: number }
  | { kind: 'pointer'; name: string; from?: number; to?: number }
  | { kind: 'scalar'; name: string; from?: string; to?: string };

/**
 * O que mudou de prev para next. Se older (o passo antes de prev) vier, uma
 * troca feita em dois passos com variável auxiliar também é reconhecida.
 */
export function diff(prev: Snapshot | undefined, next: Snapshot, older?: Snapshot): Change[] {
  if (!prev) return next.arrays.map(added);

  const changes: Change[] = [];
  const before = byName(prev.arrays);
  const oldest = older ? byName(older.arrays) : undefined;

  for (const arr of next.arrays) {
    const p = before.get(arr.name);
    if (!p) {
      changes.push(added(arr));
    } else if (p.rows && arr.rows) {
      changes.push(...matrixChanges(p, arr, oldest?.get(arr.name)));
    } else if (p.length !== arr.length) {
      // Array não cresce: tamanho diferente é outro array. Só listas ganham e perdem itens.
      const list = arr.kind === 'list' ? listChange(p, arr) : undefined;
      changes.push(list ?? { kind: 'array-resized', array: arr.name, from: p.length, to: arr.length });
    } else {
      changes.push(...completeTwoStepSwaps(arrayChanges(p, arr), oldest?.get(arr.name), arr));
    }
  }
  const after = byName(next.arrays);
  for (const p of prev.arrays) {
    if (!after.has(p.name)) changes.push({ kind: 'array-removed', array: p.name });
  }

  changes.push(...pointerChanges(prev, next), ...scalarChanges(prev, next));
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

/** Célula a célula, linha por linha; cada linha se comporta como um array. */
function matrixChanges(prev: ArrayVar, next: ArrayVar, older: ArrayVar | undefined): Change[] {
  const prevRows = prev.rows ?? [];
  const nextRows = next.rows ?? [];
  if (prevRows.length !== nextRows.length) {
    return [{ kind: 'array-resized', array: next.name, from: prev.length, to: next.length }];
  }
  return nextRows.flatMap((row, r) => {
    const p = prevRows[r];
    if (p.length !== row.length) return [{ kind: 'array-resized', array: row.name, from: p.length, to: row.length }];
    return completeTwoStepSwaps(arrayChanges(p, row), older?.rows?.[r], row);
  });
}

/**
 * Lista que cresceu ou encolheu um item: acha a posição que explica a
 * diferença inteira. Sem uma posição assim (vários itens, ou lista truncada),
 * devolve undefined e quem chamou trata como redimensionamento.
 */
function listChange(prev: ArrayVar, next: ArrayVar): Change | undefined {
  const complete = prev.values.length === prev.length && next.values.length === next.length;
  if (!complete || Math.abs(prev.length - next.length) !== 1) return undefined;

  const [longer, shorter] = next.length > prev.length ? [next.values, prev.values] : [prev.values, next.values];
  for (let k = 0; k < longer.length; k++) {
    if (longer.every((v, i) => i === k || v === shorter[i < k ? i : i - 1])) {
      const shifted = k < longer.length - 1;
      return next.length > prev.length
        ? { kind: 'insert', array: next.name, index: k, value: longer[k], shifted }
        : { kind: 'remove', array: next.name, index: k, value: longer[k], shifted };
    }
  }
  return undefined;
}

function pointerChanges(prev: Snapshot, next: Snapshot): Change[] {
  return mapChanges(
    prev.pointers.map((p) => [p.name, p.value]),
    next.pointers.map((p) => [p.name, p.value]),
  ).map(([name, from, to]) => ({ kind: 'pointer', name, from, to }));
}

function scalarChanges(prev: Snapshot, next: Snapshot): Change[] {
  return mapChanges(
    (prev.scalars ?? []).map((s) => [s.name, s.value]),
    (next.scalars ?? []).map((s) => [s.name, s.value]),
  ).map(([name, from, to]) => ({ kind: 'scalar', name, from, to }));
}

/** Variáveis que mudaram, surgiram (from undefined) ou sumiram (to undefined). */
function mapChanges<T>(before: [string, T][], after: [string, T][]): [string, T | undefined, T | undefined][] {
  const b = new Map(before);
  const a = new Map(after);
  const out: [string, T | undefined, T | undefined][] = [];
  for (const [name, to] of a) if (b.get(name) !== to) out.push([name, b.get(name), to]);
  for (const [name, from] of b) if (!a.has(name)) out.push([name, from, undefined]);
  return out;
}

/** Que tipo de estrutura nasceu, para a frase dizer "lista" ou "matriz" e não só "array". */
function added(a: ArrayVar): Change {
  if (a.rows) {
    const cols = Math.max(0, ...a.rows.map((r) => r.length));
    return { kind: 'array-added', array: a.name, length: a.length, structure: 'matrix', cols };
  }
  return { kind: 'array-added', array: a.name, length: a.length, structure: a.kind === 'list' ? 'list' : 'array' };
}

function byName(arrays: ArrayVar[]): Map<string, ArrayVar> {
  return new Map(arrays.map((a) => [a.name, a]));
}
