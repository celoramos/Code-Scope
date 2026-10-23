/**
 * Modelo neutro de linguagem. Nada aqui conhece o Debug Adapter Protocol:
 * a camada src/debug traduz o que o adaptador manda para estes tipos, e o
 * painel só desenha estes tipos.
 */

export interface ArrayVar {
  name: string;
  /** Valores já formatados para exibição, um por posição. */
  values: string[];
  /** Tamanho real; pode ser maior que values.length se foi truncado. */
  length: number;
  /**
   * Sem valor, é array. "list" para coleções que crescem e encolhem (ArrayList).
   * "stack" e "queue" têm uma ordem combinada: na pilha, values[0] é o fundo e
   * o último é o topo; na fila, values[0] é a frente, quem sai primeiro.
   */
  kind?: 'array' | 'list' | 'stack' | 'queue';
  /**
   * Linhas de uma matriz (array de arrays). Cada linha se chama "nome[i]".
   * Quando existe, values guarda só um resumo de cada linha.
   */
  rows?: ArrayVar[];
}

/** Inteiro que pode apontar para uma posição: i, j, inicio, fim... */
export interface Pointer {
  name: string;
  value: number;
}

/** Qualquer outra variável simples: boolean, char, double, String. */
export interface Scalar {
  name: string;
  value: string;
}

export interface Snapshot {
  /** Linha onde o programa parou: a próxima a ser executada. */
  line: number;
  file: string;
  /** Texto dessa linha no arquivo, sem espaços nas pontas, quando foi possível ler. */
  code?: string;
  arrays: ArrayVar[];
  pointers: Pointer[];
  scalars?: Scalar[];
}
