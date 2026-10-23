import { asInteger, numericIndex, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * Para qualquer debugger sem adaptador próprio (C#, C/C++, Go, Rust, PHP...).
 * Usa só o que o protocolo garante: indexedVariables, filhos chamados "0",
 * "1"... e valores sem filhos. Não reconhece tudo, mas não inventa: o que não
 * entende fica de fora do painel.
 */

const INTEGER_TYPE = /^(int|long|short|byte|sbyte|ushort|uint|ulong|nint|nuint|number|usize|isize|[iu](8|16|32|64|128)|int(8|16|32|64)?|uint(8|16|32|64)?|integer|Int\d*)$/i;
/** Tamanho escrito no próprio valor: "(5) [..]", "int[5]", "size=5", "len=5", "Count = 5". */
const LENGTH_IN_VALUE = /\((\d+)\)|\[(\d+)\]|\bsize\s*=\s*(\d+)|\blen\s*=\s*(\d+)|\bCount\s*=\s*(\d+)/;
const EMPTY_VALUE = /^\[\]$|^\(0\)|\bsize\s*=\s*0\b|\blen\s*=\s*0\b|\bCount\s*=\s*0\b/;

export function lengthInValue(value: string): number | undefined {
  const m = LENGTH_IN_VALUE.exec(value);
  const n = m?.slice(1).find((g) => g !== undefined);
  return n === undefined ? undefined : Number(n);
}

export const genericAdapter: LanguageAdapter = {
  id: 'generic',
  label: 'modo genérico',
  debugTypes: [],
  extensions: [],

  localScopes(scopes) {
    // Tudo que é barato e não é global: cada debugger dá um nome diferente aos escopos.
    return scopes.filter((s) => !s.expensive && !/global|static|register|module|script/i.test(s.name));
  },

  shape(v): VariableShape {
    if (v.variablesReference > 0) {
      const length = v.indexedVariables && v.indexedVariables > 0 ? v.indexedVariables : lengthInValue(v.value);
      return length !== undefined ? { kind: 'sequence', length, collection: 'list' } : { kind: 'skip' };
    }
    if (EMPTY_VALUE.test(v.value)) return { kind: 'empty-list' };
    const n = asInteger(v.value);
    if (n !== undefined && (v.type === undefined || INTEGER_TYPE.test(v.type))) return { kind: 'integer', value: n };
    // Valor curto sem filhos: texto, booleano, número com vírgula. Valores longos são objetos resumidos.
    return v.value.length <= 40 ? { kind: 'scalar', value: v.value } : { kind: 'skip' };
  },

  elementIndex: numericIndex,
  formatElement: (v) => v.value,
};
