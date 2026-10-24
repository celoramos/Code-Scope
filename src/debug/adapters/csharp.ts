import type { DapScope, DapVariable } from '../dap';
import { asInteger, numericIndex, type LanguageAdapter, type MapEntry, type VariableShape } from './adapter';

/*
 * C# pela extensão C# (ms-dotnettools.csharp, debugger vsdbg, tipo "coreclr").
 * Formatos observados no debugger real (teste de descoberta, .NET 8):
 *   escopo:    "Locals"
 *   nomes:     às vezes com o tipo junto ("i [int]", "pratos [Stack]")
 *   array:     value "{string[5]}", type "string[]"; filhos "[0]", "[1]"...
 *   coleções:  value "Count = 3", type "System.Collections.Generic.Stack<string>";
 *              filhos "[0]".. e um filho "Raw View" (traduzido para a língua do
 *              sistema, "Modo de Exibição Bruto"), reconhecido pelo evaluateName
 *              terminado em ", raw"
 *   Stack:     [0] é o topo
 *   Dictionary: filhos "{[sol, 1]}" (KeyValuePair)
 *   objeto:    value "{Exemplos.No}", sem identidade no valor
 *   texto:     "\"sol\""; null: "null"
 */

const INTEGERS = new Set(['int', 'long', 'short', 'byte', 'sbyte', 'uint', 'ulong', 'ushort', 'nint', 'nuint']);
const SCALARS = new Set(['double', 'float', 'decimal', 'bool', 'char', 'string']);
const COLLECTION = /^System\.Collections\.Generic\.(List|Stack|Queue|LinkedList|HashSet|SortedSet)<.*>$/;
const DICTIONARY = /^System\.Collections\.Generic\.(Dictionary|SortedDictionary|SortedList)<.*>$/;

/** "i [int]" vira "i"; "numeros [int[]]" vira "numeros"; "[0] [string]" vira "[0]". */
export function cleanName(name: string): string {
  return name.replace(/^(\S.*?) \[.+\]$/, '$1');
}

/** "97 'a'" (char) vira "'a'"; o resto fica como veio. */
export function formatValue(v: DapVariable): string {
  if (v.type === 'char') return /'.*'$/.exec(v.value)?.[0] ?? v.value;
  return v.value;
}

/** "{Exemplos.No}" e "{Exemplos.Turma+Aluno}" viram "No" e "Aluno". */
function simpleType(type: string): string {
  return type.replace(/<.*$/, '').split(/[.+]/).pop() ?? type;
}

export const csharpAdapter: LanguageAdapter = {
  id: 'csharp',
  label: 'C#',
  debugTypes: ['coreclr', 'clr'],
  extensions: ['.cs'],

  localScopes(scopes: DapScope[]) {
    const locals = scopes.filter((s) => /^locals?$/i.test(s.name));
    return locals.length > 0 ? locals : scopes.filter((s) => !s.expensive).slice(0, 1);
  },

  normalize: (vars) =>
    vars
      // "Raw View" e "Non-Public members": o nome vem traduzido, a expressão não.
      .filter((v) => !/, (raw|hidden)$/.test(v.evaluateName ?? ''))
      .map((v) => ({ ...v, name: cleanName(v.name) })),

  shape(v): VariableShape {
    const type = v.type ?? '';
    if (type.endsWith('[]') && v.variablesReference > 0) {
      const n = /\[(\d+)\]\}$/.exec(v.value);
      return { kind: 'sequence', length: n ? Number(n[1]) : undefined, collection: 'array' };
    }
    const count = /^Count = (\d+)$/.exec(v.value);
    if (count && DICTIONARY.test(type)) return { kind: 'map', length: Number(count[1]) };
    const coll = COLLECTION.exec(type);
    if (count && coll) {
      const n = Number(count[1]);
      if (n === 0) return { kind: 'empty-list' };
      const role = coll[1] === 'Stack' ? { role: 'stack' as const, topFirst: true } : coll[1] === 'Queue' ? { role: 'queue' as const, topFirst: false } : undefined;
      return { kind: 'sequence', length: n, collection: 'list', ...(role ? { role } : {}) };
    }
    if (INTEGERS.has(type)) {
      const n = asInteger(v.value);
      if (n !== undefined) return { kind: 'integer', value: n };
    }
    if (SCALARS.has(type)) return { kind: 'scalar', value: formatValue(v) };
    if (v.value === 'null') return { kind: 'null' };
    if (/^\{[\w.+<>, ]+\}$/.test(v.value) && v.variablesReference > 0 && !type.startsWith('System.')) {
      return { kind: 'object', type: simpleType(type || v.value.slice(1, -1)) };
    }
    return { kind: 'skip' };
  },

  elementIndex: numericIndex,
  formatElement: formatValue,
  isNull: (v) => v.value === 'null',
  identityExpr: (a, b) => `object.ReferenceEquals(${a}, ${b})`,

  mapEntry(child): MapEntry | undefined {
    // KeyValuePair: "{[sol, 1]}".
    const m = /^\{\[(.*), (.*)\]\}$/.exec(child.value);
    return m ? { key: m[1], value: m[2] } : undefined;
  },
};
