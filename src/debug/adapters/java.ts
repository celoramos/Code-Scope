import type { DapScope, DapVariable } from '../dap';
import {
  asInteger,
  methodsCalledOn,
  numericIndex,
  splitEntry,
  type CollectionRole,
  type LanguageAdapter,
  type VariableShape,
} from './adapter';

/*
 * Java Debugger (vscjava.vscode-java-debug). Formatos observados no adaptador
 * real (teste de integração, Java Pack com VS Code 1.143):
 *   escopo:    um único escopo chamado "Local"
 *   array:     value "int[5]@10", type "int[]", indexedVariables 5
 *   elemento:  name "0", value "5", evaluateName "numeros[0]"
 *   vazio:     "String[0]@9" com variablesReference 0, então não é expandido
 *   matriz:    "int[2][]@10", type "int[][]"; cada linha vem como "int[3]@13"
 *   lista:     "ArrayList@11 size=4", type "ArrayList", indexedVariables 4,
 *              filhos "0", "1"... com value "\"arroz\"" e type "String"
 *   char:      value "r", sem aspas, type "char"
 *   embrulho:  dentro de coleções, "Character@41" (lazy); aberto, vira 'Character@46 "["'
 * Também aceitamos "[0]" e "(id=10)", formatos de versões antigas.
 */

const ARRAY_VALUE = /^[\w.$]+\[(\d+)\](?:\[\])*/;
const INTEGRAL_TYPES = new Set(['int', 'short', 'long', 'byte', 'Integer', 'Short', 'Long', 'Byte']);
const SCALAR_TYPES = new Set(['boolean', 'Boolean', 'char', 'Character', 'double', 'Double', 'float', 'Float', 'String']);
const BOXED = /^(Character|Integer|Long|Short|Byte|Double|Float|Boolean)@\d+$/;

/** Escolhe o escopo de variáveis locais; cai no primeiro barato se o nome for outro. */
export function pickLocalScope(scopes: DapScope[]): DapScope | undefined {
  return (
    scopes.find((s) => /^locals?$/i.test(s.name)) ??
    scopes.find((s) => /local/i.test(s.name)) ??
    scopes.find((s) => !s.expensive)
  );
}

/** Coleção vazia ("ArrayList@11 size=0"): o adaptador não dá filhos, então não há o que expandir. */
export function isEmptyList(v: DapVariable): boolean {
  return v.variablesReference <= 0 && /\bsize=0$/.test(v.value);
}

export function isArrayVariable(v: DapVariable): boolean {
  if (v.variablesReference <= 0) return false;
  return (v.type?.endsWith('[]') ?? false) || ARRAY_VALUE.test(v.value) || (v.indexedVariables ?? 0) > 0;
}

/** Coleção indexada que não é array nativo: ArrayList, LinkedList, Vector... */
export function isListVariable(v: DapVariable): boolean {
  return isArrayVariable(v) && !(v.type?.endsWith('[]') ?? false) && !ARRAY_VALUE.test(v.value);
}

/** Valor de um elemento para exibir: char ganha aspas simples, como no código. */
export function formatElement(v: DapVariable): string {
  const value = cleanValue(v.value);
  if (v.type === 'char' || v.type === 'Character') return `'${value}'`;
  if (v.type && /^(double|float|Double|Float)$/.test(v.type)) return formatDecimal(value);
  return value;
}

/**
 * O debugger formata double com a vírgula e as casas do sistema
 * ("150,000000"); o aluno escreve e imprime "150.0".
 */
export function formatDecimal(value: string): string {
  const m = /^(-?\d+)[.,](\d+)$/.exec(value);
  if (!m) return value;
  const decimals = m[2].replace(/0+$/, '');
  return `${m[1]}.${decimals || '0'}`;
}

/** "HashMap@26 size=1", "TreeMap@3 size=0": qualquer classe terminada em Map. */
const MAP_VALUE = /^([\w.$]*Map)@(\d+)\s+size=(\d+)/;

export function mapShape(v: DapVariable): VariableShape | undefined {
  const m = MAP_VALUE.exec(v.value);
  if (!m) return undefined;
  return { kind: 'map', length: Number(m[3]), id: `@${m[2]}` };
}

/** Objeto comum: "Referencias$Conta@12", sem "size=" (coleções) nem embrulho de primitivo. */
const OBJECT_VALUE = /^([\w.$]+)@(\d+)$/;

/** Classe e identidade de um objeto; undefined se não é objeto de classe. */
export function objectShape(v: DapVariable): { type: string; id: string } | undefined {
  if (v.variablesReference <= 0 || isBoxed(v) || v.type === 'String') return undefined;
  const m = OBJECT_VALUE.exec(v.value);
  if (!m) return undefined;
  return { type: simpleClassName(v.type ?? m[1]), id: `@${m[2]}` };
}

/** "Referencias$Conta" e "java.util.Random" viram "Conta" e "Random". */
export function simpleClassName(type: string): string {
  return type.replace(/<.*$/, '').split(/[.$]/).pop() ?? type;
}

/** "@26" de "int[3]@26" ou "ArrayList@11 size=2": mesmo número, mesmo objeto. */
export function arrayId(v: DapVariable): string | undefined {
  const m = /@(\d+)(?:\s|$)/.exec(v.value);
  return m ? `@${m[1]}` : undefined;
}

/**
 * Primitivo embrulhado em objeto (Character, Integer...). Dentro de coleções o
 * adaptador mostra só "Character@41"; o valor de verdade está no campo "value".
 */
export function isBoxed(v: DapVariable): boolean {
  return v.variablesReference > 0 && BOXED.test(v.value);
}

/**
 * Valor de um primitivo embrulhado depois de resolvido. O adaptador real devolve
 * algo como 'Character@46 "["' (variável lazy) ou só "[" (campo value).
 */
export function unboxedValue(value: string, boxType: string | undefined): string {
  const raw = /^\w+@\d+\s+"(.*)"$/.exec(value)?.[1] ?? cleanValue(value);
  return boxType === 'Character' ? `'${raw.replace(/^'(.*)'$/, '$1')}'` : raw;
}

/**
 * Variável simples que não é índice: boolean, char, double, String.
 * String é objeto no Java (e tem variablesReference), mas para o aluno é um valor.
 */
export function scalarValue(v: DapVariable): string | undefined {
  if (v.type === undefined || !SCALAR_TYPES.has(v.type)) return undefined;
  if (v.variablesReference > 0 && v.type !== 'String') return undefined;
  return formatElement(v);
}

/** Tamanho do array pelo indexedVariables ou pelo "int[5]" do value. */
export function arrayLength(v: DapVariable): number | undefined {
  if (typeof v.indexedVariables === 'number') return v.indexedVariables;
  const m = ARRAY_VALUE.exec(v.value);
  return m ? Number(m[1]) : undefined;
}

/** "3" ou "[3]" vira 3; qualquer outro nome vira undefined. */
export const elementIndex = numericIndex;

/** Inteiro simples que pode servir de índice (i, j, min...). */
export function integralValue(v: DapVariable): number | undefined {
  if (v.variablesReference > 0) return undefined;
  if (v.type !== undefined && !INTEGRAL_TYPES.has(v.type)) return undefined;
  return asInteger(cleanValue(v.value));
}

/** Tira o "@10" (ou o antigo "(id=10)") que o Java põe em objetos; o resto fica como veio. */
export function cleanValue(value: string): string {
  return value.replace(/\s*\(id=\d+\)$/, '').replace(/@\d+$/, '');
}

/*
 * Pilha ou fila, pelo código-fonte. O debugger diz a classe (Stack, ArrayDeque,
 * LinkedList), mas não como o programa usa: o mesmo ArrayDeque pode ser pilha
 * ou fila.
 *
 * Detalhe que muda o desenho: Stack (filha de Vector) empilha no fim, então o
 * topo é o último elemento; ArrayDeque e LinkedList empilham no começo
 * (push = addFirst), então o topo é o elemento 0.
 */
export function collectionRole(source: string, name: string): CollectionRole | undefined {
  const n = name.replace(/\$/g, '\\$');
  const declared = new RegExp(`\\b(\\w+)\\s*(?:<[^;=()]*>)?\\s+${n}\\s*[=;]`).exec(source)?.[1];
  const created = new RegExp(`\\b${n}\\s*=\\s*new\\s+(\\w+)`).exec(source)?.[1];
  const ops = methodsCalledOn(source, name).map((c) => c.method);

  if (declared === 'Stack' || created === 'Stack') return { role: 'stack', topFirst: false };
  if (declared === 'Queue' || ops.some((op) => /^(offer|poll|element)$/.test(op))) return { role: 'queue', topFirst: false };
  if (ops.some((op) => /^(push|pop)$/.test(op))) return { role: 'stack', topFirst: true };
  return undefined;
}

export const javaAdapter: LanguageAdapter = {
  id: 'java',
  label: 'Java',
  debugTypes: ['java'],
  extensions: ['.java'],

  localScopes(scopes) {
    const s = pickLocalScope(scopes);
    return s ? [s] : [];
  },

  shape(v): VariableShape {
    // Mapa antes de coleção: o HashMap também chega com indexedVariables.
    const map = mapShape(v);
    if (map) return map;
    if (isEmptyList(v)) return { kind: 'empty-list' };
    if (isArrayVariable(v)) {
      const id = arrayId(v);
      return { kind: 'sequence', length: arrayLength(v) ?? 0, collection: isListVariable(v) ? 'list' : 'array', ...(id ? { id } : {}) };
    }
    const n = integralValue(v);
    if (n !== undefined) return { kind: 'integer', value: n };
    const s = scalarValue(v);
    if (s !== undefined) return { kind: 'scalar', value: s };
    // Referência vazia: o debugger manda "null" sem tipo.
    if (v.value === 'null' && v.variablesReference <= 0) return { kind: 'null' };
    const obj = objectShape(v);
    return obj ? { kind: 'object', ...obj } : { kind: 'skip' };
  },

  isNull: (v) => v.value === 'null' && v.variablesReference <= 0,

  mapEntry(child) {
    // Entrada: 'HashMap$Node@44 "sol":"1"'.
    const m = /^[\w.$]+@\d+\s+(.*)$/.exec(child.value);
    return m ? splitEntry(m[1]) : undefined;
  },

  elementIndex,
  formatElement,

  unbox(v) {
    return isBoxed(v) ? (inner) => unboxedValue(inner.value, v.type) : undefined;
  },

  collectionRole,
};
