import type { DapScope, DapVariable } from '../dap';
import { asInteger, numericIndex, type LanguageAdapter, type VariableShape } from './adapter';

/*
 * C e C++ pela extensão C/C++ (ms-vscode.cpptools): cppdbg com gdb ou lldb,
 * cppvsdbg com o debugger do Visual Studio. Formatos observados no gdb real
 * (teste de descoberta, gcc 16 do w64devkit):
 *   escopos:   "Locals" e "Registers" (caro)
 *   array:     value "[5]", type "int [5]"; filhos "[0]".."[4]"
 *   ponteiro:  value "0x791340", type "struct No *"; os filhos já são os campos
 *              do struct apontado (o gdb segue o ponteiro); NULL é "0x0"
 *   inteiro:   value "5", type "int"
 * O endereço é a identidade: dois ponteiros com o mesmo endereço apontam para
 * o mesmo struct.
 *
 * Coleções do C++. Observado no gdb real sem os pretty-printers do Python
 * (w64devkit): std::vector tem value "{...}" e só o _Vector_base como filho, mas
 * as expressões em VECTOR_SIZE e VECTOR_ITEMS leem os itens; std::map é uma
 * árvore por dentro e fica de fora. Com os pretty-printers (o gdb do Linux), pelo
 * formato documentado, sem exemplo que confirme ainda: "std::vector of length 3,
 * capacity 4" e "std::map with 2 elements", com filhos "[0]" e '["chave"]'.
 */

const INTEGER = /^(?:const )?(?:unsigned |signed )?(?:int|short|long|long long|long int|short int|size_t|ssize_t|u?int\d+_t)$/;
const SCALAR = /^(?:const )?(?:float|double|long double|bool|_Bool|char|unsigned char|signed char)$/;
const ARRAY = /\[(\d+)\]$/;
const VECTOR = /^(?:const )?std::(?:__\w+::)?vector</;
const MAP = /^(?:const )?std::(?:__\w+::)?(?:unordered_)?map</;
/** Quantos itens o valor diz ter: "of length 3", "with 2 elements", "{ size=3 }". */
const COUNT = /(?:of length |with |size=)(\d+)/;

/** "97 'a'" vira "'a'"; ponteiro de char ('0x4050a0 "texto"') vira o texto. */
export function formatValue(v: DapVariable): string {
  const ch = /^-?\d+ ('.*')$/.exec(v.value);
  if (ch) return ch[1];
  const str = /^0x[0-9a-f]+ (".*")$/i.exec(v.value);
  return str ? str[1] : v.value;
}

/**
 * Endereço que pode ser de um struct de verdade: alinhado e dentro da memória
 * de um programa comum. Um ponteiro não inicializado costuma ter 0x1,
 * 0xcccccccc... ou um número ímpar qualquer.
 */
export function plausibleAddress(address: string): boolean {
  if (!/^0x[0-9a-f]+$/.test(address)) return false;
  const n = BigInt(address);
  return n >= 0x10000n && n < 0x800000000000n && n % 4n === 0n;
}

/** std::vector aberto só por expressões: o gdb sem pretty-printers não mostra os itens. */
function isOpaqueVector(v: DapVariable): boolean {
  return VECTOR.test((v.type ?? '').trim()) && !COUNT.test(v.value);
}

export const cAdapter: LanguageAdapter = {
  id: 'c',
  label: 'C/C++',
  debugTypes: ['cppdbg', 'cppvsdbg', 'lldb'],
  extensions: ['.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.hh'],

  localScopes(scopes: DapScope[]) {
    const locals = scopes.filter((s) => /^locals?$/i.test(s.name));
    return locals.length > 0 ? locals : scopes.filter((s) => !s.expensive && !/register/i.test(s.name));
  },

  shape(v): VariableShape {
    const type = (v.type ?? '').trim();
    if (VECTOR.test(type)) {
      const count = COUNT.exec(v.value);
      if (count?.[1] === '0') return { kind: 'empty-list' };
      return { kind: 'sequence', ...(count ? { length: Number(count[1]) } : {}), collection: 'list' };
    }
    if (MAP.test(type)) {
      const count = COUNT.exec(v.value);
      return count ? { kind: 'map', length: Number(count[1]) } : { kind: 'skip' };
    }
    const arr = ARRAY.exec(type);
    if (arr && v.variablesReference > 0) return { kind: 'sequence', length: Number(arr[1]), collection: 'array' };
    if (INTEGER.test(type)) {
      const n = asInteger(v.value);
      if (n !== undefined) return { kind: 'integer', value: n };
    }
    if (SCALAR.test(type)) return { kind: 'scalar', value: formatValue(v) };
    if (/char\s*\*$/.test(type)) return { kind: 'scalar', value: formatValue(v) };
    // Ponteiro para struct: o endereço é a identidade, e 0x0 é NULL.
    const ptr = /^(?:struct\s+)?([A-Za-z_]\w*)\s*\*$/.exec(type);
    if (ptr) {
      if (/^0x0+$/i.test(v.value)) return { kind: 'null' };
      const address = v.value.split(' ')[0].toLowerCase();
      // Ponteiro que ainda não recebeu valor guarda lixo (0x1, 0xcccc...): seguir leria memória aleatória.
      if (!plausibleAddress(address)) return { kind: 'scalar', value: address };
      if (v.variablesReference > 0) return { kind: 'object', type: ptr[1], id: address };
    }
    return { kind: 'skip' };
  },

  indirectSequence(v) {
    if (!isOpaqueVector(v)) return undefined;
    const e = v.evaluateName ?? v.name;
    return { length: `${e}._M_impl._M_finish - ${e}._M_impl._M_start`, items: (n) => `*${e}._M_impl._M_start@${n}` };
  },
  // Entrada de std::map: o nome é a chave, entre colchetes.
  mapEntry(child) {
    const m = /^\[(.*)\]$/s.exec(child.name);
    return m ? { key: m[1], value: formatValue(child) } : undefined;
  },
  elementIndex: numericIndex,
  formatElement: formatValue,
  isNull: (v) => /^0x0+$/i.test(v.value),
};
