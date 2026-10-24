import { asInteger, methodsCalledOn, numericIndex, type CollectionRole, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * JavaScript e TypeScript pelo debugger que já vem no VS Code (js-debug).
 * Formatos observados no debugger real (teste de integração, VS Code 1.143):
 *   escopos:   um "Block" para cada let/const de laço ou if, do mais interno
 *              para fora, depois "Local" e "Global" (caro)
 *   array:     value "(5) [5, 1, 4, 2, 8]", type "Array", sem indexedVariables;
 *              filhos "0".."4", "length" e "[[Prototype]]"
 *   número:    value "5", type "number"; texto: value "'abc'", type "string"
 *   Node:      o módulo CommonJS traz this, __dirname, __filename, exports,
 *              module e require como locais
 * Todo array de JavaScript cresce e encolhe, então é desenhado como lista.
 */

const ARRAY_VALUE = /^(?:Array)?\s*\((\d+)\)\s*\[/;
/** Variáveis que o Node põe em todo módulo e que o aluno não escreveu. */
const NODE_MODULE_NAMES = new Set(['this', '__dirname', '__filename', 'exports', 'module', 'require']);

export function javascriptRole(source: string, name: string): CollectionRole | undefined {
  const ops = new Set(methodsCalledOn(source, name).map((c) => c.method));
  // push + shift: entra no fim, sai do começo. push + pop: entra e sai pelo fim.
  if (ops.has('push') && ops.has('shift')) return { role: 'queue', topFirst: false };
  if (ops.has('push') && ops.has('pop')) return { role: 'stack', topFirst: false };
  return undefined;
}

export const javascriptAdapter: LanguageAdapter = {
  id: 'javascript',
  label: 'JavaScript',
  debugTypes: ['pwa-node', 'node', 'node-terminal', 'pwa-chrome', 'chrome', 'pwa-msedge', 'msedge', 'pwa-extensionHost'],
  extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx'],

  localScopes(scopes) {
    return scopes.filter((s) => /^(block|local)\b/i.test(s.name));
  },

  shape(v): VariableShape {
    if (NODE_MODULE_NAMES.has(v.name)) return { kind: 'skip' };
    const m = ARRAY_VALUE.exec(v.value);
    if (m && v.variablesReference > 0) return { kind: 'sequence', length: Number(m[1]), collection: 'list' };
    if (v.variablesReference > 0) return { kind: 'skip' };
    if (v.type === 'number') {
      const n = asInteger(v.value);
      return n !== undefined ? { kind: 'integer', value: n } : { kind: 'scalar', value: v.value };
    }
    if (v.type === 'string' || v.type === 'boolean' || v.type === 'bigint') return { kind: 'scalar', value: v.value };
    if (v.value === 'null' || v.value === 'undefined') return { kind: 'scalar', value: v.value };
    return { kind: 'skip' };
  },

  elementIndex: numericIndex,
  formatElement: (v) => v.value,
  collectionRole: javascriptRole,
  // O js-debug mostra, ainda dentro da função, o valor que ela está para devolver.
  returnValue: (v) => (v.name === 'Return value' ? { value: v.value, pending: true } : undefined),
};
