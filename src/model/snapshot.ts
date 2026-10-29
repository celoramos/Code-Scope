import type { ClassInfo } from './classes';
import type { ConditionInfo } from './condition';

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
   * "set" é um conjunto: sem posições e sem repetidos, na ordem em que o debugger mostra.
   */
  kind?: 'array' | 'list' | 'stack' | 'queue' | 'text' | 'set';
  /**
   * Linhas de uma matriz (array de arrays). Cada linha se chama "nome[i]".
   * Quando existe, values guarda só um resumo de cada linha.
   */
  rows?: ArrayVar[];
  /** Posições que guardam objetos: o id do objeto em heap (null nas outras). */
  refs?: (string | null)[];
  /** Identidade do objeto na memória: duas variáveis com o mesmo id são o mesmo array. */
  id?: string;
}

/**
 * Objeto de uma classe do aluno (Conta, No...). id identifica o objeto na
 * memória dentro do passo e, sempre que o debugger permite, entre passos.
 */
export interface HeapObject {
  id: string;
  /** Nome curto da classe: "Conta", "No". */
  type: string;
  fields: ObjectField[];
  /** O limite de objetos lidos acabou antes deste: os campos não foram lidos. */
  truncated?: boolean;
  /**
   * Expressão que alcança o objeto neste passo ("inicio.proximo"). Serve para
   * reconhecer o mesmo objeto no passo seguinte quando o debugger não mostra
   * identidade (JavaScript).
   */
  expr?: string;
}

export interface ObjectField {
  name: string;
  /** Valor como texto; para referência, o texto que o debugger mostra. */
  value: string;
  /** id do objeto apontado; null quando o campo é null/None/undefined de propósito. */
  ref?: string | null;
}

/** Variável local que guarda um objeto (ou null). */
export interface Reference {
  name: string;
  ref: string | null;
}

/** Dicionário: chave e valor como o aluno escreveria. */
export interface MapVar {
  name: string;
  entries: { key: string; value: string; items?: string[] }[];
  /** Tamanho real; pode ser maior que entries.length se foi truncado. */
  length: number;
  id?: string;
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
  /**
   * Variáveis de um bloco de fora escondidas por uma de dentro com o mesmo
   * nome (let total dentro de um bloco esconde o total de fora).
   */
  shadowed?: Scalar[];
  /** Dicionários: HashMap, dict, objeto literal, Map. */
  maps?: MapVar[];
  /** Objetos das classes do aluno que as variáveis alcançam. */
  heap?: HeapObject[];
  /** Variáveis locais que apontam para objetos. */
  refs?: Reference[];
  /**
   * Chamadas em andamento só do código do aluno, da mais antiga (embaixo) até
   * a atual (no topo). Vazio quando o debugger não informa.
   */
  calls?: CallFrame[];
  /** Valor que uma função acabou de devolver, quando o debugger informa. */
  returned?: { function?: string; value: string; pending?: boolean };
  /** A condição que a linha parada vai testar, já avaliada parte por parte. */
  condition?: ConditionInfo;
  /** Erro que um catch capturou e guardou numa variável (o "e"). */
  caught?: { name: string; type: string; message?: string };
  /** Classes do arquivo: de quem herdam e que métodos escrevem. */
  classes?: Record<string, ClassInfo>;
  /** O programa parou por um erro que ninguém tratou. */
  exception?: ExceptionInfo;
}

/** Uma chamada de função em andamento e as variáveis dela. */
export interface CallFrame {
  /** Nome da função, sem classe nem parâmetros: "fatorial". */
  name: string;
  line: number;
  /** Classe do objeto cujo método está rodando (Cachorro em bichos[i].falar()). */
  owner?: string;
  /** Código de fora de qualquer função (o "<module>" do Python). */
  program?: boolean;
  /** Variáveis simples da chamada, já como texto. */
  vars: Scalar[];
}

export interface ExceptionInfo {
  /** Nome curto do tipo: "ArrayIndexOutOfBoundsException", "IndexError", "TypeError". */
  type: string;
  message: string;
}
