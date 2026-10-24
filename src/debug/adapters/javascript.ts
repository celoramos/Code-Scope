import type { DapVariable } from '../dap';
import { asInteger, methodsCalledOn, numericIndex, splitEntry, type CollectionRole, type LanguageAdapter, type VariableShape } from './adapter';

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
    // O "e" de um catch fica num escopo próprio ("Catch Block").
    return scopes.filter((s) => /^(block|local|catch)\b/i.test(s.name));
  },

  shape(v): VariableShape {
    // Dentro de um método, this é o objeto: esse sim interessa.
    if (v.name === 'this') return isClassInstance(v) ? { kind: 'object', type: v.type ?? '' } : { kind: 'skip' };
    if (NODE_MODULE_NAMES.has(v.name)) return { kind: 'skip' };
    const m = ARRAY_VALUE.exec(v.value);
    if (m && v.variablesReference > 0) return { kind: 'sequence', length: Number(m[1]), collection: 'list' };
    if (isClassInstance(v)) return { kind: 'object', type: v.type ?? '' };
    // Objeto literal ({sol: 1}) e Map são os dicionários do JavaScript.
    if (v.variablesReference > 0 && v.type === 'Object' && v.value.startsWith('{')) return { kind: 'map' };
    if (v.variablesReference > 0 && v.type === 'Map') return { kind: 'map', length: Number(/^Map\((\d+)\)/.exec(v.value)?.[1] ?? 0) };
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
  // "[[Prototype]]", "[[Scopes]]" e "__proto__" são do motor, não campos do aluno.
  objectFields: (fields) => fields.filter((f) => !f.name.startsWith('[[') && f.name !== '__proto__'),
  isNull: (v) => v.value === 'null' || v.value === 'undefined',
  // O js-debug não mostra identidade no valor; quem decide é o próprio JavaScript.
  identityExpr: (a, b) => `(${a}) === (${b})`,

  // "SyntaxError: mensagem\n    at ..." (a pilha vem junto no valor).
  caughtError(v) {
    if (!v.type || !/Error$/.test(v.type) || v.variablesReference <= 0) return undefined;
    const first = v.value.split('\n')[0];
    const m = /^(\w+):\s*(.*)$/.exec(first);
    return { type: m?.[1] ?? v.type, ...(m ? { message: m[2] } : {}) };
  },

  mapEntry(child) {
    if (child.name.startsWith('[[') || child.name === '__proto__' || child.name === 'size') return undefined;
    // Entrada de Map, dentro de [[Entries]]: "{'sol' => 1}".
    const entry = /^\{(.*)\}$/.exec(child.value);
    if (/^\d+$/.test(child.name) && entry && entry[1].includes('=>')) return splitEntry(entry[1]);
    return { key: child.name, value: child.value };
  },
};

/** Tipos que o js-debug usa para o que não é objeto de uma classe do aluno. */
const BUILTIN_TYPES = new Set(['Object', 'Function', 'function', 'global', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'RegExp', 'Date', 'Error', 'Array', 'Symbol', 'Module']);

/** Objeto criado com new de uma classe: o js-debug põe o nome da classe em type. */
export function isClassInstance(v: DapVariable): boolean {
  return v.variablesReference > 0 && !!v.type && !BUILTIN_TYPES.has(v.type) && !/Error$/.test(v.type) && !v.value.startsWith('ƒ');
}
