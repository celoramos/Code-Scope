import type { ArrayVar, Pointer } from './snapshot';

/**
 * Nomes que costumam guardar um valor, não uma posição. Sem esta lista,
 * "alvo = 3" na busca linear desenharia uma seta na posição 3 do array.
 */
export const VALUE_NAMES = new Set([
  'temp', 'tmp', 'aux', 'alvo', 'target', 'valor', 'value', 'chave', 'key',
  'soma', 'sum', 'total', 'n', 'len', 'tamanho', 'size', 'count', 'contador',
]);

export interface Arrow {
  name: string;
  index: number;
}

/** Ponteiros que apontam para uma caixa desenhada deste array. */
export function arrowsFor(array: ArrayVar, pointers: Pointer[]): Arrow[] {
  return pointers
    .filter((p) => !VALUE_NAMES.has(p.name.toLowerCase()))
    .filter((p) => Number.isInteger(p.value) && p.value >= 0 && p.value < array.values.length)
    .map((p) => ({ name: p.name, index: p.value }));
}
