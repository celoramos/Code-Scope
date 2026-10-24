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
  | { kind: 'sequence'; length?: number; collection: 'array' | 'list'; id?: string }
  /**
   * Instância de uma classe. id é a identidade na memória quando o debugger
   * mostra uma ("@12" no Java, "0x..." no Python); sem ela, o coletor compara
   * com evaluate.
   */
  | { kind: 'object'; type: string; id?: string }
  /** Referência vazia: null do Java, que não diz o tipo. */
  | { kind: 'null' }
  /** Dicionário: HashMap, dict, objeto literal ou Map do JavaScript. */
  | { kind: 'map'; length?: number; id?: string }
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

  /** Campos de um objeto, sem o que o debugger acrescenta ("special variables", "[[Prototype]]"). */
  objectFields?(fields: DapVariable[]): DapVariable[];
  /** Valor vazio num campo de objeto: null, None, undefined. */
  isNull?(v: DapVariable): boolean;
  /**
   * Expressão que diz se a e b são o mesmo objeto ("a === b", "a is b"). Só
   * para debuggers que não mostram a identidade no valor.
   */
  identityExpr?(a: string, b: string): string;
  /**
   * Uma entrada de dicionário a partir de um filho do dicionário; undefined
   * para o que não é entrada ("len()", "[[Prototype]]"...).
   */
  mapEntry?(child: DapVariable): MapEntry | undefined;
  /**
   * Variável que guarda um erro capturado (o "e" do catch). messageField:
   * campo do objeto que tem a mensagem, quando ela não vem no próprio valor.
   */
  caughtError?(v: DapVariable): { type: string; message?: string; messageField?: string } | undefined;
}

export interface MapEntry {
  key: string;
  value: string;
}

/**
 * Separa "chave:valor" no primeiro ":" fora de aspas. O Java mostra a
 * entrada de um HashMap assim: '"sol":"1"'.
 */
export function splitEntry(text: string): MapEntry | undefined {
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ':' || (ch === '=' && text[i + 1] === '>')) {
      const key = text.slice(0, i).trim();
      const value = text.slice(ch === ':' ? i + 1 : i + 2).trim();
      return { key, value: unquoteSimple(value) };
    }
  }
  return undefined;
}

/** '"1"' vira 1: o Java põe aspas até em números dentro de um mapa. */
function unquoteSimple(value: string): string {
  const m = /^"(-?\d+(?:\.\d+)?|true|false)"$/.exec(value);
  return m ? m[1] : value;
}

/** Classes declaradas no arquivo: só objetos delas são desenhados. */
export function declaredClasses(source: string): Set<string> {
  return new Set([...source.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
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
