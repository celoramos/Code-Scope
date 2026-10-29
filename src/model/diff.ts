import type { ArrayVar, Snapshot } from './snapshot';

export type Structure = 'array' | 'list' | 'stack' | 'queue' | 'matrix' | 'text' | 'set';

/*
 * Em matrizes, "array" é o nome da linha ("grade[1]"), então as mudanças de
 * células reaproveitam os mesmos tipos de um array simples.
 */
export type Change =
  | { kind: 'set'; array: string; index: number; from: string; to: string }
  /** steps 2: a troca terminou agora, mas começou no passo anterior (via variável auxiliar). */
  | { kind: 'swap'; array: string; a: number; b: number; steps: 1 | 2 }
  /** Lista ganhou um item; shifted diz se havia itens depois dele, que andaram para a direita. */
  | { kind: 'insert'; array: string; index: number; value: string; shifted: boolean; structure: Structure }
  /** Lista perdeu um item; shifted diz se os itens seguintes voltaram uma posição. */
  | { kind: 'remove'; array: string; index: number; value: string; shifted: boolean; structure: Structure }
  /** Conjunto ganhou ou perdeu um item; num conjunto não há posição. */
  | { kind: 'set-add'; array: string; value: string }
  | { kind: 'set-remove'; array: string; value: string }
  | { kind: 'array-added'; array: string; length: number; structure: Structure; cols?: number }
  | { kind: 'array-removed'; array: string }
  | { kind: 'array-resized'; array: string; from: number; to: number; structure?: Structure }
  | { kind: 'pointer'; name: string; from?: number; to?: number }
  | { kind: 'scalar'; name: string; from?: string; to?: string }
  /** Dicionário: chave nova (sem from) ou valor trocado. */
  | { kind: 'map-put'; map: string; key: string; value: string; from?: string }
  | { kind: 'map-remove'; map: string; key: string; value: string }
  | { kind: 'map-added'; map: string; length: number }
  | { kind: 'map-removed'; map: string };

/**
 * O que mudou de prev para next. Se older (o passo antes de prev) vier, uma
 * troca feita em dois passos com variável auxiliar também é reconhecida.
 */
export function diff(prev: Snapshot | undefined, next: Snapshot, older?: Snapshot): Change[] {
  if (!prev) return [...next.arrays.map(added), ...(next.maps ?? []).map((m): Change => ({ kind: 'map-added', map: m.name, length: m.length }))];

  const changes: Change[] = [];
  const before = byName(prev.arrays);
  const oldest = older ? byName(older.arrays) : undefined;

  for (const arr of next.arrays) {
    const p = before.get(arr.name);
    if (!p) {
      changes.push(added(arr));
    } else if (arr.kind === 'set' && p.kind === 'set') {
      changes.push(...setChanges(p, arr));
    } else if (p.rows && arr.rows) {
      changes.push(...matrixChanges(p, arr, oldest?.get(arr.name)));
    } else if (p.length !== arr.length) {
      // Array não cresce: tamanho diferente é outro array. Só coleções ganham e perdem itens.
      const list = arr.kind && arr.kind !== 'array' ? listChange(p, arr) : undefined;
      changes.push(list ?? { kind: 'array-resized', array: arr.name, from: p.length, to: arr.length, ...(arr.kind === 'text' ? { structure: 'text' as const } : {}) });
    } else {
      changes.push(...completeTwoStepSwaps(arrayChanges(p, arr), oldest?.get(arr.name), arr));
    }
  }
  const after = byName(next.arrays);
  for (const p of prev.arrays) {
    if (!after.has(p.name)) changes.push({ kind: 'array-removed', array: p.name });
  }

  changes.push(...dictionaryChanges(prev, next), ...pointerChanges(prev, next), ...scalarChanges(prev, next));
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

  const grew = next.length > prev.length;
  const [longer, shorter] = grew ? [next.values, prev.values] : [prev.values, next.values];
  // Com valores repetidos mais de uma posição explica a diferença. Escolhe a que a
  // estrutura usaria: inserção no fim, remoção no topo da pilha ou na frente da fila.
  const fromEnd = grew || next.kind === 'stack';
  const order = longer.map((_, i) => (fromEnd ? longer.length - 1 - i : i));
  for (const k of order) {
    if (longer.every((v, i) => i === k || v === shorter[i < k ? i : i - 1])) {
      const shifted = k < longer.length - 1;
      const structure = next.kind ?? 'list';
      return grew
        ? { kind: 'insert', array: next.name, index: k, value: longer[k], shifted, structure }
        : { kind: 'remove', array: next.name, index: k, value: longer[k], shifted, structure };
    }
  }
  return undefined;
}

/**
 * Conjunto: o que entrou e o que saiu, pela presença do valor. A ordem que o
 * debugger mostra pode mudar sem nada entrar ou sair (o Python e o HashSet
 * guardam pela conta do hash), e isso não é mudança para o aluno.
 */
function setChanges(prev: ArrayVar, next: ArrayVar): Change[] {
  const before = new Set(prev.values);
  const after = new Set(next.values);
  return [
    ...next.values.filter((v) => !before.has(v)).map((value): Change => ({ kind: 'set-add', array: next.name, value })),
    ...prev.values.filter((v) => !after.has(v)).map((value): Change => ({ kind: 'set-remove', array: next.name, value })),
  ];
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
  return { kind: 'array-added', array: a.name, length: a.length, structure: a.kind ?? 'array' };
}

function byName(arrays: ArrayVar[]): Map<string, ArrayVar> {
  return new Map(arrays.map((a) => [a.name, a]));
}

/** Chaves que entraram, saíram ou trocaram de valor em cada dicionário. */
function dictionaryChanges(prev: Snapshot, next: Snapshot): Change[] {
  const changes: Change[] = [];
  const before = new Map((prev.maps ?? []).map((m) => [m.name, m]));
  for (const m of next.maps ?? []) {
    const p = before.get(m.name);
    if (!p) {
      changes.push({ kind: 'map-added', map: m.name, length: m.length });
      continue;
    }
    const old = new Map(p.entries.map((e) => [e.key, e.value]));
    const now = new Set(m.entries.map((e) => e.key));
    for (const e of m.entries) {
      const was = old.get(e.key);
      if (was === undefined) changes.push({ kind: 'map-put', map: m.name, key: e.key, value: e.value });
      else if (was !== e.value) changes.push({ kind: 'map-put', map: m.name, key: e.key, value: e.value, from: was });
    }
    // Só dá para dizer que uma chave saiu quando o dicionário inteiro foi lido.
    if (p.entries.length === p.length && m.entries.length === m.length) {
      for (const e of p.entries) if (!now.has(e.key)) changes.push({ kind: 'map-remove', map: m.name, key: e.key, value: e.value });
    }
  }
  const after = new Set((next.maps ?? []).map((m) => m.name));
  for (const p of prev.maps ?? []) if (!after.has(p.name)) changes.push({ kind: 'map-removed', map: p.name });
  return changes;
}
