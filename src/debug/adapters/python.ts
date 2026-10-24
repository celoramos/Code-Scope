import { asInteger, methodsCalledOn, numericIndex, type CollectionRole, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * Python pelo debugpy (extensão ms-python.debugpy). Formatos observados no
 * debugpy real (1.8.20, teste de integração com Python 3.12):
 *   escopos:   "Locals" e "Globals"
 *   list:      value "[5, 1, 4, 2, 8]", type "list", sem indexedVariables;
 *              filhos "special variables", "function variables", "0", "1"...
 *              e "len()"
 *   deque:     value "deque(['coxinha'])", type "deque", com um filho "maxlen";
 *              vazio, value "deque([])"
 *   int:       value "5", type "int"; str: value "'pastel'", type "str"
 * Pelo formato documentado, sem exemplo que confirme ainda: tuple (type
 * "tuple") e bool (value "True", type "bool").
 */

const LISTS = new Set(['list', 'deque']);
const ARRAYS = new Set(['tuple', 'array']);
const SCALARS = new Set(['str', 'bool', 'float', 'NoneType', 'complex']);
/** Objeto de uma classe: "<__main__.No object at 0x00000146F06538C0>"; o endereço é a identidade. */
const PY_OBJECT = /^<([\w.]+) object at (0x[0-9a-fA-F]+)>$/;

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
    const obj = PY_OBJECT.exec(v.value);
    if (obj && v.variablesReference > 0) return { kind: 'object', type: obj[1].split('.').pop() ?? obj[1], id: obj[2].toLowerCase() };
    return { kind: 'skip' };
  },

  // "special variables", "function variables", "class variables" e "len()" são do debugpy.
  objectFields: (fields) => fields.filter((f) => !/^(special|function|class) variables$/.test(f.name) && f.name !== 'len()'),
  isNull: (v) => v.type === 'NoneType' || v.value === 'None',
  // Listas não mostram endereço no valor: "a is b" decide se são a mesma.
  identityExpr: (a, b) => `(${a}) is (${b})`,

  elementIndex: numericIndex,
  formatElement: (v) => v.value,
  collectionRole: pythonRole,
  // O debugpy guarda o valor devolvido como "(return) fatorial" nas locais de quem chamou.
  returnValue: (v) => {
    const m = /^\(return\)\s*(.+)$/.exec(v.name);
    return m ? { function: m[1].split('.').pop(), value: v.value } : undefined;
  },
};
