import type { ArrayVar, Pointer } from './snapshot';

/**
 * Nomes que costumam guardar um valor, não uma posição. Sem esta lista,
 * "alvo = 3" na busca linear desenharia uma seta na posição 3 do array.
 * A configuração codeScope.valueNames substitui esta lista.
 */
export const VALUE_NAMES: ReadonlySet<string> = new Set([
  'temp', 'tmp', 'aux', 'alvo', 'target', 'valor', 'value', 'chave', 'key',
  'soma', 'sum', 'total', 'n', 'len', 'tamanho', 'size', 'count', 'contador',
  'vezes', 'quantidade', 'qtd', 'resultado', 'result', 'produto',
]);

export interface Arrow {
  name: string;
  index: number;
}

export interface MatrixAxes {
  row?: Arrow;
  col?: Arrow;
}

/**
 * Em matriz não dá para adivinhar pelo valor quem é linha e quem é coluna:
 * i e j costumam caber nos dois. O código diz: em "grade[i][j]" o primeiro
 * índice é a linha. Procura nas linhas próximas da parada e só aceita nomes
 * de variáveis inteiras que caibam na matriz desenhada.
 */
export function matrixAxesFor(matrix: ArrayVar, pointers: Pointer[], codes: (string | undefined)[]): MatrixAxes {
  const name = matrix.name.replace(/[$]/g, '\\$&');
  const both = new RegExp(`\\b${name}\\s*\\[\\s*(\\w+)\\s*\\]\\s*\\[\\s*(\\w+)\\s*\\]`);
  const rowOnly = new RegExp(`\\b${name}\\s*\\[\\s*(\\w+)\\s*\\]`);
  const value = new Map(pointers.map((p) => [p.name, p.value]));
  const rows = matrix.rows ?? [];
  const cols = Math.max(0, ...rows.map((r) => r.values.length));

  const arrow = (n: string | undefined, limit: number): Arrow | undefined => {
    const v = n === undefined ? undefined : value.get(n);
    return n !== undefined && v !== undefined && v >= 0 && v < limit ? { name: n, index: v } : undefined;
  };

  let rowName: string | undefined;
  let colName: string | undefined;
  for (const code of codes) {
    if (!code) continue;
    const m = both.exec(code);
    if (m) {
      rowName ??= m[1];
      colName ??= m[2];
    }
    rowName ??= rowOnly.exec(code)?.[1];
    if (rowName && colName) break;
  }
  return { row: arrow(rowName, rows.length), col: arrow(colName, cols) };
}

/** Ponteiros que apontam para uma caixa desenhada deste array. */
export function arrowsFor(array: ArrayVar, pointers: Pointer[], valueNames: ReadonlySet<string> = VALUE_NAMES): Arrow[] {
  return pointers
    .filter((p) => !valueNames.has(p.name.toLowerCase()))
    .filter((p) => Number.isInteger(p.value) && p.value >= 0 && p.value < array.values.length)
    .map((p) => ({ name: p.name, index: p.value }));
}
