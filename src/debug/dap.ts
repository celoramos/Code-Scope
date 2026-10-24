/** Subconjunto do Debug Adapter Protocol usado pelo coletor. Não sai de src/debug. */

export interface DapStackFrame {
  id: number;
  name: string;
  line: number;
  source?: { name?: string; path?: string; presentationHint?: string };
  /** "subtle" e "label" marcam quadros que não são código do usuário. */
  presentationHint?: string;
}

export interface DapScope {
  name: string;
  variablesReference: number;
  expensive?: boolean;
}

export interface DapVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  indexedVariables?: number;
  namedVariables?: number;
  /** Expressão que o debugger aceita em evaluate para chegar a esta variável. */
  evaluateName?: string;
}
