/**
 * Modelo neutro de linguagem. Nada aqui conhece o Debug Adapter Protocol:
 * a camada src/debug traduz o que o adaptador manda para estes tipos, e o
 * painel só desenha estes tipos.
 */

export interface ArrayVar {
  name: string;
  /** Valores já formatados para exibição, um por posição. */
  values: string[];
  /** Tamanho real do array; pode ser maior que values.length se foi truncado. */
  length: number;
}

export interface Pointer {
  name: string;
  value: number;
}

export interface Snapshot {
  /** Linha onde o programa parou: a próxima a ser executada. */
  line: number;
  file: string;
  /** Texto dessa linha no arquivo, sem espaços nas pontas, quando foi possível ler. */
  code?: string;
  arrays: ArrayVar[];
  pointers: Pointer[];
}
