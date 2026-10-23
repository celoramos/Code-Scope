import type { DapScope, DapVariable } from './dap';

/*
 * Regras de leitura do que o Java Debugger (vscjava.vscode-java-debug) devolve.
 * Formatos observados no adaptador real (teste de integração, Java Pack com
 * VS Code 1.143):
 *   escopo:    um único escopo chamado "Local"
 *   array:     value "int[5]@10", type "int[]", indexedVariables 5
 *   elemento:  name "0", value "5", evaluateName "numeros[0]"
 *   vazio:     "String[0]@9" com variablesReference 0, então não é expandido
 * Também aceitamos "[0]" e "(id=10)", formatos de outros adaptadores e de
 * versões antigas, porque o value é texto livre no protocolo. O canal de log
 * "Code Scope" mostra o que realmente chegou.
 */

const ARRAY_VALUE = /^[\w.$]+\[(\d+)\](?:\[\])*/;
const INDEX_NAME = /^\[?(\d+)\]?$/;
const RANGE_NAME = /^\[?(\d+)\.\.(\d+)\]?$/;
const INTEGER = /^-?\d+$/;
const INTEGRAL_TYPES = new Set(['int', 'short', 'long', 'byte', 'Integer', 'Short', 'Long', 'Byte']);

/** Escolhe o escopo de variáveis locais; cai no primeiro barato se o nome for outro. */
export function pickLocalScope(scopes: DapScope[]): DapScope | undefined {
  return (
    scopes.find((s) => /^locals?$/i.test(s.name)) ??
    scopes.find((s) => /local/i.test(s.name)) ??
    scopes.find((s) => !s.expensive)
  );
}

export function isArrayVariable(v: DapVariable): boolean {
  if (v.variablesReference <= 0) return false;
  return (v.type?.endsWith('[]') ?? false) || ARRAY_VALUE.test(v.value) || (v.indexedVariables ?? 0) > 0;
}

/** Tamanho do array pelo indexedVariables ou pelo "int[5]" do value. */
export function arrayLength(v: DapVariable): number | undefined {
  if (typeof v.indexedVariables === 'number') return v.indexedVariables;
  const m = ARRAY_VALUE.exec(v.value);
  return m ? Number(m[1]) : undefined;
}

/** "3" ou "[3]" vira 3; qualquer outro nome vira undefined. */
export function elementIndex(name: string): number | undefined {
  const m = INDEX_NAME.exec(name);
  return m ? Number(m[1]) : undefined;
}

/** Grupo de paginação "[0..99]" ou "0..99" que um adaptador pode criar para arrays grandes. */
export function isRangeGroup(name: string): boolean {
  return RANGE_NAME.test(name);
}

/** Inteiro simples que pode servir de índice (i, j, min...). */
export function integralValue(v: DapVariable): number | undefined {
  if (v.variablesReference > 0) return undefined;
  if (v.type !== undefined && !INTEGRAL_TYPES.has(v.type)) return undefined;
  const raw = cleanValue(v.value);
  return INTEGER.test(raw) ? Number(raw) : undefined;
}

/** Tira o "@10" (ou o antigo "(id=10)") que o Java põe em objetos; o resto fica como veio. */
export function cleanValue(value: string): string {
  return value.replace(/\s*\(id=\d+\)$/, '').replace(/@\d+$/, '');
}
