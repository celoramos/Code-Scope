import type { Snapshot } from './snapshot';

/**
 * Teste de mesa: uma linha por passo, uma coluna por variável, como o
 * professor pede para fazer no papel. Cada célula diz o valor da variável
 * naquele passo; vazia quando ela ainda não existe ou já saiu de escopo.
 */
export interface TraceTable {
  columns: string[];
  /** Há recursão ou chamadas aninhadas: cada linha diz em que chamada estava. */
  showCalls: boolean;
  rows: TraceRow[];
  /** Passos mais antigos que ficaram de fora por causa do limite de linhas. */
  hidden: number;
}

export interface TraceRow {
  /** Número do passo no histórico, a partir de 1. */
  step: number;
  line: number;
  /** Função em que o passo parou; "fatorial #3" na terceira chamada empilhada dela. */
  call?: string;
  values: (string | undefined)[];
  /** A célula mudou em relação à linha anterior. */
  changed: boolean[];
}

/** Linhas guardadas na tabela; o painel rola, mas mil linhas pesam no navegador. */
export const MAX_TRACE_ROWS = 200;
/** Arrays maiores que isto viram "[...]" na tabela: a célula precisa caber. */
const MAX_INLINE_ARRAY = 8;
const MAX_INLINE_MAP = 4;

/** Variáveis do passo como texto, na ordem em que o painel mostra. */
export function traceValues(s: Snapshot): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of s.pointers) out.set(p.name, String(p.value));
  for (const v of s.scalars ?? []) out.set(v.name, v.value);
  for (const a of s.arrays) {
    if (a.rows) continue;
    out.set(a.name, a.length <= MAX_INLINE_ARRAY ? `[${a.values.join(', ')}]` : `[${a.length}]`);
  }
  for (const m of s.maps ?? []) {
    out.set(m.name, m.length <= MAX_INLINE_MAP ? `{${m.entries.map((e) => `${e.key}: ${e.value}`).join(', ')}}` : `{${m.length}}`);
  }
  return out;
}

/** Tabela dos passos 1..snapshots.length; first é o número do primeiro snapshot. */
export function traceTable(snapshots: readonly Snapshot[], first = 1, max = MAX_TRACE_ROWS): TraceTable {
  const columns: string[] = [];
  const seen = new Set<string>();
  const perStep = snapshots.map(traceValues);
  for (const values of perStep) {
    for (const name of values.keys()) {
      if (!seen.has(name)) {
        seen.add(name);
        columns.push(name);
      }
    }
  }

  // A coluna da chamada só aparece quando alguma vez houve duas funções do aluno em andamento.
  const showCalls = snapshots.some((s) => (s.calls ?? []).filter((c) => !c.program).length > 1);
  const rows: TraceRow[] = perStep.map((values, k) => {
    const prev = perStep[k - 1];
    const call = showCalls ? callLabel(snapshots[k]) : undefined;
    return {
      step: first + k,
      line: snapshots[k].line,
      ...(call ? { call } : {}),
      values: columns.map((c) => values.get(c)),
      changed: columns.map((c) => prev !== undefined && values.get(c) !== undefined && values.get(c) !== prev.get(c)),
    };
  });
  const hidden = Math.max(0, rows.length - max);
  return { columns, showCalls, rows: rows.slice(hidden), hidden };
}

/** "fatorial", ou "fatorial #3" quando há três chamadas dela empilhadas. */
function callLabel(s: Snapshot): string | undefined {
  const calls = s.calls ?? [];
  const top = calls.at(-1);
  if (!top || top.program) return undefined;
  const copies = calls.filter((c) => c.name === top.name).length;
  return copies > 1 ? `${top.name} #${copies}` : top.name;
}
