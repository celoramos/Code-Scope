/** Subconjunto do Debug Adapter Protocol usado pelo coletor. Não sai de src/debug. */

export interface DapStackFrame {
  id: number;
  name: string;
  line: number;
  source?: { name?: string; path?: string };
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
}
