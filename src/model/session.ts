import { algorithmStats } from './focus';
import type { Snapshot } from './snapshot';
import { traceValues } from './trace';

/*
 * Sessão salva: os snapshots de uma execução, para rever sem debugger ou
 * comparar com outra. O arquivo é para ser compartilhado, então leva só o nome
 * do arquivo-fonte, sem as pastas do computador de quem salvou.
 */

const FORMAT = 'code-scope-session';
const VERSION = 1;

export function serializeSession(snapshots: readonly Snapshot[]): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, snapshots: snapshots.map((s) => ({ ...s, file: baseName(s.file) })) });
}

/** Snapshots do arquivo; undefined quando ele não é uma sessão do Code Scope. */
export function parseSession(text: string): Snapshot[] | undefined {
  try {
    const data = JSON.parse(text) as { format?: unknown; version?: unknown; snapshots?: unknown };
    if (data.format !== FORMAT || typeof data.version !== 'number' || data.version > VERSION) return undefined;
    const snapshots = data.snapshots;
    if (!Array.isArray(snapshots) || snapshots.length === 0) return undefined;
    return snapshots.every((s: Partial<Snapshot>) => typeof s.line === 'number' && Array.isArray(s.arrays) && Array.isArray(s.pointers)) ? (snapshots as Snapshot[]) : undefined;
  } catch {
    return undefined;
  }
}

export interface SessionSummary {
  file: string;
  steps: number;
  comparisons: number;
  swaps: number;
}

export interface Comparison {
  current: SessionSummary;
  saved: SessionSummary;
}

export function summarizeSession(snapshots: readonly Snapshot[]): SessionSummary {
  const stats = algorithmStats(snapshots);
  return { file: baseName(snapshots.at(-1)?.file ?? ''), steps: snapshots.length, comparisons: stats.comparisons, swaps: stats.swaps };
}

/**
 * Próximo passo que combina com a busca, a partir de "from" (posição a partir
 * de 0), na direção dir. Se a busca é o nome de uma variável, combina o passo em
 * que ela mudou; senão, o passo parado numa linha com esse texto.
 */
export function findStep(snapshots: readonly Snapshot[], from: number, query: string, dir: 1 | -1): number | undefined {
  const q = query.trim();
  if (q === '') return undefined;
  const values = snapshots.map(traceValues);
  const isVariable = values.some((v) => v.has(q));
  const needle = q.toLowerCase();
  const matches = (i: number) =>
    isVariable ? values[i].has(q) && (i === 0 || values[i].get(q) !== values[i - 1].get(q)) : (snapshots[i].code ?? '').toLowerCase().includes(needle);
  for (let i = from + dir; i >= 0 && i < snapshots.length; i += dir) {
    if (matches(i)) return i;
  }
  return undefined;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
