import type { DapScope, DapVariable } from '../dap';
import { asInteger, bigIntegerText, numericIndex, type LanguageAdapter, type VariableShape } from './adapter';
import { cGlobals } from '../../model/outer';

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
 * Coleções do C++. Observado no cppdbg real com gdb sem os pretty-printers do
 * Python (w64devkit, teste de integração vetor.cpp): std::vector tem value "{...}" e só o _Vector_base como filho, mas
 * as expressões em VECTOR_SIZE e VECTOR_ITEMS leem os itens; std::map é uma
 * árvore por dentro e fica de fora. Com os pretty-printers (o gdb do Linux), pelo
 * formato documentado, sem exemplo que confirme ainda: "std::vector of length 3,
 * capacity 4" e "std::map with 2 elements", com filhos "[0]" e '["chave"]'.
 */

const INTEGER = /^(?:const )?(?:unsigned |signed )?(?:int|short|long|long long|long int|short int|size_t|ssize_t|u?int\d+_t)$/;
const SCALAR = /^(?:const )?(?:float|double|long double|bool|_Bool|char|unsigned char|signed char)$/;
const ARRAY = /\[(\d+)\]$/;
const VECTOR = /^(?:const )?std::(?:__\w+::)?vector</;
const VECTOR_BOOL = /^(?:const )?std::(?:__\w+::)?vector<bool\b/;
/**
 * Outros contêineres, só com os pretty-printers (gdb do w64devkit no estresse):
 * "std::set with 2 elements" e "std::stack wrapping: std::deque with 1 element",
 * com os itens em "[0]", "[1]"... Na pilha, [0] é o fundo; na fila, a frente.
 */
const CONTAINER = /^(?:const )?std::(?:__\w+::)?(stack|queue|priority_queue|deque|list|forward_list|set|multiset|unordered_set|unordered_multiset)</;
/** std::string: "std::string" no topo, "std::__cxx11::basic_string<char, ...>" dentro de um vector. */
const STRING = /^(?:const )?std::(?:__\w+::)?(?:string|basic_string<char\b)/;
const MAP = /^(?:const )?std::(?:__\w+::)?(?:unordered_)?map</;
/** Struct, union ou classe por valor, com ou sem a palavra struct, e com os argumentos de template. */
const STRUCT_VALUE = /^(?:const\s+|volatile\s+)*(?:struct\s+|class\s+|union\s+)?([A-Za-z_]\w*)(?:\s*<.*>)?\s*&?$/;
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
  // O gdb não lista as globais: o int v[100] declarado fora das funções vem por evaluate.
  outerNames: cGlobals,

  shape(v): VariableShape {
    const type = (v.type ?? '').trim();
    // Com os pretty-printers, o texto já vem entre aspas; sem eles, indirectText lê.
    if (STRING.test(type)) return v.value.startsWith('"') ? { kind: 'scalar', value: v.value } : { kind: 'skip' };
    if (VECTOR.test(type)) {
      const count = COUNT.exec(v.value);
      if (count?.[1] === '0') return { kind: 'empty-list' };
      return { kind: 'sequence', ...(count ? { length: Number(count[1]) } : {}), collection: 'list' };
    }
    const container = CONTAINER.exec(type);
    if (container) {
      const count = COUNT.exec(v.value);
      // Sem os pretty-printers, o gdb só mostra os campos internos: fica de fora.
      if (!count) return { kind: 'skip' };
      const kind = container[1];
      const role =
        kind === 'stack'
          ? { role: 'stack' as const, topFirst: false }
          : kind === 'queue'
            ? { role: 'queue' as const, topFirst: false }
            : kind === 'priority_queue'
              ? { role: 'heap' as const, topFirst: false }
              : undefined;
      const set = /set$/.test(kind);
      if (count[1] === '0') return { kind: 'empty-list', ...(role && role.role !== 'heap' ? { collection: role.role } : set ? { collection: 'set' as const } : {}) };
      return { kind: 'sequence', length: Number(count[1]), collection: set ? 'set' : 'list', ...(role ? { role } : {}) };
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
      const big = bigIntegerText(v.value);
      if (big !== undefined) return { kind: 'scalar', value: big };
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
    // Struct ou objeto guardado direto na variável ("Aluno a;", "Pilha p;", "Pilha<int> p;"): os campos,
    // como um objeto. Não tem endereço no valor; o que o distingue é o lugar onde mora, como no Go.
    const value = STRUCT_VALUE.exec(type);
    if (value && v.variablesReference > 0 && !type.includes('::')) {
      const e = v.evaluateName ?? v.name;
      return { kind: 'object', type: value[1], id: `=${e}`, address: `&${e}`, inline: true };
    }
    // Constante de enum: o gdb mostra o nome ("AZUL").
    if (type && v.variablesReference === 0 && /^[A-Za-z_]\w*$/.test(v.value) && /^(?:enum\s+)?[A-Za-z_]\w*$/.test(type)) return { kind: 'scalar', value: v.value };
    return { kind: 'skip' };
  },

  indirectSequence(v) {
    if (!isOpaqueVector(v)) return undefined;
    const e = v.evaluateName ?? v.name;
    // vector<bool> (_Bvector_base): um bit por item; início e fim são iteradores de bit (_M_p, _M_offset).
    if (VECTOR_BOOL.test((v.type ?? '').trim())) {
      const word = `sizeof(*${e}._M_impl._M_start._M_p)`;
      return {
        length: `(${e}._M_impl._M_finish._M_p - ${e}._M_impl._M_start._M_p) * 8 * ${word} + ${e}._M_impl._M_finish._M_offset`,
        items: (n) => `*${e}._M_impl._M_start._M_p@${n}`,
        bits: { width: word },
      };
    }
    return { length: `${e}._M_impl._M_finish - ${e}._M_impl._M_start`, items: (n) => `*${e}._M_impl._M_start@${n}` };
  },
  // int v[] recebido pela função (vira int *) ou vetor de malloc: o gdb lê n itens a partir do endereço com *v@n.
  pointerSequence(v, length) {
    const type = (v.type ?? '').trim();
    if (!/\*$/.test(type) || /\bchar\s*\*$/.test(type) || /\*\s*\*$/.test(type)) return undefined;
    const address = v.value.split(' ')[0].toLowerCase();
    if (!plausibleAddress(address)) return undefined;
    const e = v.evaluateName ?? v.name;
    return { length, items: (n) => `*${e}@${n}` };
  },
  // char nome[20] num campo: o gdb manda '"ana", '\000' <repeats 16 times>'; vale o texto até o primeiro \0.
  fieldText(v) {
    if (!/^(?:const\s+)?(?:unsigned\s+|signed\s+)?char\s*\[\d+\]$/.test((v.type ?? '').trim())) return undefined;
    const m = /^"((?:[^"\\]|\\.)*)"/.exec(v.value);
    return m ? `"${m[1].split('\\000')[0]}"` : undefined;
  },
  // std::string sem pretty-printers: "{...}" no valor, e o texto no ponteiro _M_p ('0x5ffb10 "abc"').
  indirectText(v) {
    if (!STRING.test((v.type ?? '').trim()) || v.value.startsWith('"')) return undefined;
    return `${v.evaluateName ?? v.name}._M_dataplus._M_p`;
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
