import type { DapScope, DapVariable } from '../dap';

/*
 * Todo debugger do VS Code fala o mesmo protocolo (DAP), mas cada um escreve
 * os valores do seu jeito: Java manda "int[5]@10", JavaScript "(5) [5, 1, 4]",
 * Python "[5, 1, 4]". Um adaptador de linguagem traduz esse texto para as
 * categorias que o painel entende. O coletor (dapCollector.ts) só fala com
 * esta interface; o resto do projeto nem sabe que existem linguagens.
 */

/** O que uma variável do debugger é, para o painel. */
export type VariableShape =
  /**
   * Coleção indexada a ser expandida. "list" cresce e encolhe; "array" tem tamanho
   * fixo. Sem length, o tamanho é contado pelas posições que o debugger devolver.
   */
  | { kind: 'sequence'; length?: number; collection: 'array' | 'list' }
  /** Coleção vazia que o debugger não deixa expandir, mas que o aluno precisa ver nascer. */
  | { kind: 'empty-list' }
  /** Inteiro que pode servir de índice (i, j, inicio...). */
  | { kind: 'integer'; value: number }
  /** Qualquer outro valor simples: texto, booleano, número com vírgula, caractere. */
  | { kind: 'scalar'; value: string }
  /** Objetos, funções, módulos: ainda não desenhamos. */
  | { kind: 'skip' };

export interface CollectionRole {
  role: 'stack' | 'queue';
  /** O debugger entrega o topo da pilha na posição 0 (o painel inverte para o topo ficar no fim). */
  topFirst: boolean;
}

export interface LanguageAdapter {
  /** Identificador estável, usado no log e nos testes. */
  readonly id: string;
  /** Nome para mostrar ao aluno. */
  readonly label: string;
  /** Tipos de sessão de debug (session.type) que este adaptador entende. */
  readonly debugTypes: readonly string[];
  /** Extensões de arquivo, usadas quando o tipo da sessão não é conhecido. */
  readonly extensions: readonly string[];

  /** Escopos com as variáveis locais do método ou função parada. */
  localScopes(scopes: DapScope[]): DapScope[];
  shape(v: DapVariable): VariableShape;
  /** Posição de um filho de coleção ("0", "[0]"...), ou undefined se não é posição. */
  elementIndex(name: string): number | undefined;
  /** Valor de um elemento de coleção, já como o aluno escreveria no código. */
  formatElement(v: DapVariable): string;

  /**
   * Elemento que precisa ser aberto para mostrar o valor de verdade (Java mostra
   * "Character@41" dentro de coleções). Devolve como formatar o valor de dentro.
   */
  unbox?(v: DapVariable): ((inner: DapVariable) => string) | undefined;
  /** Pilha ou fila, pelo uso no código-fonte. */
  collectionRole?(source: string, name: string): CollectionRole | undefined;
  /**
   * Variável que o debugger cria com o valor que uma função acabou de devolver
   * ("Return value" no js-debug, "(return) f" no debugpy). Não é variável do aluno.
   */
  returnValue?(v: DapVariable): ReturnedValue | undefined;
}

export interface ReturnedValue {
  /** Função que devolveu, quando o debugger diz. */
  function?: string;
  /**
   * true: o valor é o que a função parada está para devolver (js-debug).
   * false: uma função que já terminou devolveu este valor (debugpy).
   */
  pending?: boolean;
  value: string;
}

/** "3" ou "[3]" vira 3. Serve para a maioria dos debuggers. */
export function numericIndex(name: string): number | undefined {
  const m = /^\[?(\d+)\]?$/.exec(name);
  return m ? Number(m[1]) : undefined;
}

/** Grupo de paginação "[0..99]" ou "0..99" que alguns debuggers criam para coleções grandes. */
export function isRangeGroup(name: string): boolean {
  return /^\[?(\d+)\s*\.\.\s*(\d+)\]?$/.test(name);
}

/** Texto que é um inteiro, como "-3" ou "42". */
export function asInteger(text: string): number | undefined {
  return /^-?\d+$/.test(text) ? Number(text) : undefined;
}

export interface MethodCall {
  method: string;
  /** Argumentos como estão no código, sem espaços nas pontas ("" quando não há). */
  args: string;
}

/**
 * Métodos chamados numa variável em todo o arquivo: "pilha.push(x)" vira
 * { method: "push", args: "x" }. Base das regras de pilha e fila de cada linguagem.
 */
export function methodsCalledOn(source: string, name: string): MethodCall[] {
  const n = name.replace(/\$/g, '\\$');
  // Até o primeiro ")": basta para separar pop() de pop(0) e não perde push(s.charAt(i)).
  return [...source.matchAll(new RegExp(`\\b${n}\\s*\\.\\s*(\\w+)\\s*\\(([^)]*)`, 'g'))].map((m) => ({
    method: m[1],
    args: m[2].trim(),
  }));
}
