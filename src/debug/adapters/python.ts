import { asInteger, methodsCalledOn, numericIndex, type CollectionRole, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * Python pelo debugpy (extensão ms-python.debugpy). Formatos do debugpy:
 *   escopos:   "Locals" e "Globals"
 *   list:      value "[5, 1, 4]", type "list"; filhos "0", "1"... mais "len()"
 *              e grupos como "special variables"
 *   tuple:     type "tuple"; deque: type "deque", value "deque([...])"
 *   int:       value "5", type "int"; str: value "'abc'", type "str"; bool: "True"
 * Ainda sem validação com o debugpy real: conferido com os formatos acima nos
 * testes unitários. O canal de log "Code Scope" mostra o que realmente chegou.
 */

const LISTS = new Set(['list', 'deque']);
const ARRAYS = new Set(['tuple', 'array']);
const SCALARS = new Set(['str', 'bool', 'float', 'NoneType', 'complex']);

export function pythonRole(source: string, name: string): CollectionRole | undefined {
  const calls = methodsCalledOn(source, name);
  const has = (method: string, args?: string) => calls.some((c) => c.method === method && (args === undefined || c.args === args));
  // pop(0) e popleft() tiram do começo: fila. pop() tira do fim: pilha.
  if (has('popleft') || has('pop', '0')) return { role: 'queue', topFirst: false };
  if (has('append') && has('pop', '')) return { role: 'stack', topFirst: false };
  return undefined;
}

export const pythonAdapter: LanguageAdapter = {
  id: 'python',
  label: 'Python',
  debugTypes: ['debugpy', 'python'],
  extensions: ['.py'],

  localScopes(scopes) {
    const locals = scopes.filter((s) => /^locals?$/i.test(s.name));
    return locals.length > 0 ? locals : scopes.filter((s) => !s.expensive && !/global/i.test(s.name));
  },

  shape(v): VariableShape {
    if (v.type && LISTS.has(v.type)) {
      if (/^(deque\()?\[\]\)?$/.test(v.value)) return { kind: 'empty-list' };
      return { kind: 'sequence', length: v.indexedVariables || undefined, collection: 'list' };
    }
    if (v.type && ARRAYS.has(v.type)) return { kind: 'sequence', length: v.indexedVariables || undefined, collection: 'array' };
    if (v.type === 'int') {
      const n = asInteger(v.value);
      return n !== undefined ? { kind: 'integer', value: n } : { kind: 'scalar', value: v.value };
    }
    if (v.type && SCALARS.has(v.type)) return { kind: 'scalar', value: v.value };
    return { kind: 'skip' };
  },

  elementIndex: numericIndex,
  formatElement: (v) => v.value,
  collectionRole: pythonRole,
};
