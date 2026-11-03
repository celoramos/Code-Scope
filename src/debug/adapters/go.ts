import { asInteger, numericIndex, type CollectionRole, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * Go pelo Delve (extensão golang.go, sessão "go"). Formatos observados no dlv dap
 * real (Delve com Go 1.27), com supportsVariableType ligado, como o VS Code faz:
 *   escopos:   só "Locals", com os parâmetros junto; o resultado sem nome vem como "~r0"
 *   array:     value "[5]int [1,2,4,5,8]", type "[5]int", indexedVariables 5, filhos "[0]"...
 *   slice:     value "[]string len: 1, cap: 2, [\"azul\"]", type "[]string"
 *   map:       value "map[string]int [\"sol\": 2, ]"; filhos "len()" e um por chave,
 *              com o nome da chave ("\"sol\"")
 *   struct:    value "main.Aluno {nome: \"Ana\", nota: 9.5}", com os campos como filhos
 *   ponteiro:  value "*main.No {valor: 1, ...}"; um único filho sem nome é o struct
 *              apontado; nil é "*main.No nil", sem filhos. O valor não traz endereço,
 *              então "a == b" responde se dois ponteiros são o mesmo.
 *   rune:      é int32: value "120"
 */

const INTEGER = /^(?:u?int(?:8|16|32|64)?|uintptr|byte|rune)$/;
const SCALAR = /^(?:string|bool|float32|float64|complex64|complex128)$/;
const SLICE = /^\[\]/;
const ARRAY = /^\[(\d+)\]/;
const MAP = /^map\[/;
const LENGTH = /\blen: (\d+)/;
const POINTER = /^\*(?:[\w/.-]+\.)?([A-Za-z_]\w*)$/;
const STRUCT = /^(?:[\w/.-]+\.)?([A-Za-z_]\w*)$/;

/**
 * Pilha ou fila, pelo código: em Go as duas são um slice, e quem diz é o corte.
 * x = x[:len(x)-1] tira do fim; x = x[1:] tira do começo.
 */
export function goRole(source: string, name: string): CollectionRole | undefined {
  const n = name.replace(/\$/g, '\\$');
  if (new RegExp(`\\b${n}\\s*=\\s*${n}\\[\\s*1\\s*:\\s*\\]`).test(source)) return { role: 'queue', topFirst: false };
  if (new RegExp(`\\b${n}\\s*=\\s*${n}\\[\\s*:\\s*len\\(${n}\\)\\s*-\\s*1\\s*\\]`).test(source)) return { role: 'stack', topFirst: false };
  return undefined;
}

/** "interface {}(int) 1", "97 = 0x61" e "[]int len: 2, cap: 2, [1,2]" como o aluno escreveria. */
export function goValue(value: string): string {
  return value
    .replace(/^interface \{\}(?:\([^)]*\))? /, '')
    .replace(/^(\d+) = 0x[0-9a-f]+$/, '$1')
    .replace(/^\[\].*? len: \d+, cap: \d+, (\[.*\])$/s, '$1');
}

export const goAdapter: LanguageAdapter = {
  id: 'go',
  label: 'Go',
  debugTypes: ['go'],
  extensions: ['.go'],

  localScopes(scopes) {
    const locals = scopes.filter((s) => /^(locals?|arguments)$/i.test(s.name));
    return locals.length > 0 ? locals : scopes.filter((s) => !s.expensive && !/global|register/i.test(s.name));
  },

  // "~r0" é o resultado sem nome, que o programa não alcança.
  normalize: (vars) => vars.filter((v) => !v.name.startsWith('~')),

  shape(v): VariableShape {
    const type = v.type ?? '';
    if (SLICE.test(type)) {
      const length = Number(LENGTH.exec(v.value)?.[1] ?? 0);
      if (length === 0 || v.variablesReference <= 0) return { kind: 'empty-list' };
      return { kind: 'sequence', length, collection: 'list' };
    }
    const array = ARRAY.exec(type);
    if (array) return v.variablesReference > 0 ? { kind: 'sequence', length: Number(array[1]), collection: 'array' } : { kind: 'skip' };
    if (MAP.test(type)) return { kind: 'map', length: v.indexedVariables ?? 0 };
    if (INTEGER.test(type)) {
      const n = asInteger(v.value);
      return n !== undefined ? { kind: 'integer', value: n } : { kind: 'scalar', value: v.value };
    }
    if (SCALAR.test(type)) return { kind: 'scalar', value: v.value };
    const pointer = POINTER.exec(type);
    if (pointer) {
      if (v.variablesReference <= 0) return { kind: 'null' };
      return { kind: 'object', type: pointer[1] };
    }
    const struct = STRUCT.exec(type);
    if (struct && v.variablesReference > 0) {
      // Struct é valor, sem identidade própria: o que o distingue é o lugar onde mora.
      return { kind: 'object', type: struct[1], ...(v.evaluateName ? { id: `=${v.evaluateName}`, address: `&${v.evaluateName}` } : {}) };
    }
    return { kind: 'skip' };
  },

  pointee: (fields) => (fields.length === 1 && fields[0].name === '' ? fields[0] : undefined),
  isNull: (v) => / nil$/.test(v.value) || v.value === 'nil',
  identityExpr: (a, b) => `${a} == ${b}`,
  // "a == b" compara o conteúdo de um array; dois slices são o mesmo quando começam no mesmo lugar.
  sameArrayExpr: (a, b) => `&${a}[0] == &${b}[0]`,
  mapEntry: (child) => (child.name === 'len()' || /^\[(?:key|val) \d+\]$/.test(child.name) ? undefined : { key: child.name, value: goValue(child.value) }),
  elementIndex: numericIndex,
  formatElement: (v) => goValue(v.value),
  collectionRole: goRole,
};
