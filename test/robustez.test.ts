import * as assert from 'node:assert/strict';
import { cAdapter } from '../src/debug/adapters/c';
import { csharpAdapter } from '../src/debug/adapters/csharp';
import { goAdapter } from '../src/debug/adapters/go';
import { javaAdapter, pythonAdapter } from '../src/debug/adapters';
import { javascriptAdapter } from '../src/debug/adapters/javascript';
import { declaredEnums, type LanguageAdapter } from '../src/debug/adapters/adapter';
import { collectSnapshot, functionName, type Session } from '../src/debug/dapCollector';

type Var = { name: string; value: string; type?: string; variablesReference: number; evaluateName?: string; indexedVariables?: number };

/** Sessão falsa: a referência 1 são as locais; page corta cada resposta, como o vsdbg. */
function session(vars: Record<number, Var[]>, page = Infinity): Session {
  return {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'main', line: 1, source: { path: '/x/a' } }] };
      if (command === 'scopes') return { scopes: [{ name: 'Locals', variablesReference: 1 }] };
      if (command === 'evaluate') return { result: 'false' };
      const all = vars[args.variablesReference] ?? [];
      if (args.filter !== 'indexed') return { variables: all };
      const indexed = all.filter((v) => /^\[?\d/.test(v.name));
      return { variables: indexed.slice(args.start ?? 0, (args.start ?? 0) + Math.min(args.count ?? Infinity, page)) };
    },
  };
}

const collect = async (vars: Record<number, Var[]>, adapter: LanguageAdapter, page?: number) => (await collectSnapshot(session(vars, page), 1, adapter))!.snapshot;
const items = (n: number, type = 'int') => Array.from({ length: n }, (_, i) => ({ name: String(i), value: String(i), type, variablesReference: 0 }));

describe('Python: o debugpy só entrega 100 filhos', () => {
  const tooLarge = { name: 'Too large to show contents. Max items to show: 100', value: '', variablesReference: 0 };
  it('lista de um milhão mostra o tamanho que tem', async () => {
    const snap = await collect({ 1: [{ name: 'numeros', value: '[0, 1, 2]', type: 'list', variablesReference: 2 }], 2: [...items(100), tooLarge, { name: 'len()', value: '1000000', type: 'int', variablesReference: 0 }] }, pythonAdapter);
    assert.equal(snap.arrays[0].length, 1000000);
    assert.equal(snap.arrays[0].values.length, 50);
  });
  it('dicionário grande mostra o tamanho que tem', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({ name: `'k${i}'`, value: String(i), type: 'int', variablesReference: 0 }));
    const snap = await collect({ 1: [{ name: 'tabela', value: "{'k0': 0}", type: 'dict', variablesReference: 2 }], 2: [...entries, tooLarge, { name: 'len()', value: '50000', type: 'int', variablesReference: 0 }] }, pythonAdapter);
    assert.equal(snap.maps?.[0].length, 50000);
  });
  it('o aviso de "too large" não vira item', () => {
    assert.equal(pythonAdapter.mapEntry?.(tooLarge), undefined);
    assert.equal(pythonAdapter.setItem?.(tooLarge), false);
  });
});

describe('Python: Counter', () => {
  it('o método que o debugpy lista junto não vira entrada', () => {
    assert.equal(pythonAdapter.mapEntry?.({ name: '_keep_positive', value: "<bound method Counter._keep_positive of Counter({'a': 5})>", variablesReference: 3 }), undefined);
    assert.deepEqual(pythonAdapter.mapEntry?.({ name: "'a'", value: '5', variablesReference: 0 }), { key: "'a'", value: '5' });
  });
});

describe('Python: objetos com texto próprio', () => {
  it('dataclass e __repr__ continuam sendo objetos', () => {
    assert.deepEqual(pythonAdapter.shape({ name: 'p', value: 'Ponto(x=1, y=0)', type: 'Ponto', variablesReference: 5 }), { kind: 'object', type: 'Ponto' });
  });
  it('enum é um valor', () => {
    assert.deepEqual(pythonAdapter.shape({ name: 'c', value: '<Cor.VERMELHO: 1>', type: 'Cor', variablesReference: 5 }), { kind: 'scalar', value: 'Cor.VERMELHO' });
  });
  it('função e módulo seguem de fora', () => {
    assert.equal(pythonAdapter.shape({ name: 'f', value: '<function f at 0x1>', type: 'function', variablesReference: 5 }).kind, 'skip');
    assert.equal(pythonAdapter.shape({ name: 'm', value: "<module 'os'>", type: 'module', variablesReference: 5 }).kind, 'skip');
  });
});

describe('matriz irregular', () => {
  it('Python: linha vazia no meio, como numa lista de adjacência', async () => {
    const row = (name: string, value: string, variablesReference: number) => ({ name, value, type: 'list', variablesReference });
    const snap = await collect({ 1: [row('g', '[[1, 2], [], [3]]', 2)], 2: [row('0', '[1, 2]', 3), row('1', '[]', 4), row('2', '[3]', 5)], 3: items(2), 5: items(1) }, pythonAdapter);
    assert.deepEqual(snap.arrays[0].rows?.map((r) => r.length), [2, 0, 1]);
  });
  it('Java: linha nula', async () => {
    const row = (name: string, n: number, variablesReference: number) => ({ name, value: `int[${n}]@${variablesReference}`, type: 'int[]', variablesReference, indexedVariables: n });
    const snap = await collect({ 1: [{ name: 'm', value: 'int[2][]@9', type: 'int[][]', variablesReference: 2, indexedVariables: 2 } as Var], 2: [row('0', 1, 3), { name: '1', value: 'null', variablesReference: 0 }], 3: items(1) }, javaAdapter);
    assert.deepEqual(snap.arrays[0].rows?.map((r) => r.length), [1, 0]);
  });
});

describe('debugger que entrega em pedaços', () => {
  it('C#: array grande vem inteiro até o limite', async () => {
    const cells = Array.from({ length: 200 }, (_, i) => ({ name: `[${i}]`, value: String(i), type: 'int', variablesReference: 0 }));
    const snap = await collect({ 1: [{ name: 'a', value: '{int[1000000]}', type: 'int[]', variablesReference: 2 }], 2: cells }, csharpAdapter, 25);
    assert.deepEqual(snap.arrays[0].values, cells.slice(0, 50).map((c) => c.value));
  });
});

describe('C#: matriz retangular', () => {
  it('int[,] vira matriz, lida por linhas', async () => {
    const cells = Array.from({ length: 6 }, (_, k) => ({ name: `[${Math.floor(k / 3)}, ${k % 3}]`, value: String(k), type: 'int', variablesReference: 0 }));
    const snap = await collect({ 1: [{ name: 'm', value: '{int[2, 3]}', type: 'int[,]', variablesReference: 2 }], 2: cells }, csharpAdapter);
    assert.equal(snap.arrays[0].length, 2);
    assert.deepEqual(snap.arrays[0].rows?.map((r) => r.values), [['0', '1', '2'], ['3', '4', '5']]);
  });
  it('linha com mais de 25 colunas continua de onde o vsdbg parou', async () => {
    // Estresse: int[300, 300] vinha com 25 posições por linha e uma célula vazia no fim.
    const cells = Array.from({ length: 80 }, (_, k) => ({ name: `[${Math.floor(k / 40)}, ${k % 40}]`, value: String(k), type: 'int', variablesReference: 0 }));
    const snap = await collect({ 1: [{ name: 'm', value: '{int[2, 40]}', type: 'int[,]', variablesReference: 2 }], 2: cells }, csharpAdapter, 25);
    assert.deepEqual(snap.arrays[0].rows?.map((r) => r.values.length), [40, 40]);
    assert.equal(snap.arrays[0].rows?.[1].values[39], '79');
  });
});

describe('C#: textos do vsdbg', () => {
  it('"... returned" é o valor devolvido, não uma variável', () => {
    assert.deepEqual(csharpAdapter.returnValue?.({ name: 'Programa.Soma returned', value: '3', variablesReference: 0 }), { function: 'Soma', value: '3' });
  });
  it('HashSet é conjunto', () => {
    const v = { name: 's', value: 'Count = 2', type: 'System.Collections.Generic.HashSet<int>', variablesReference: 3 };
    assert.equal((csharpAdapter.shape(v) as { collection?: string }).collection, 'set');
  });
  it('nome da pilha sem módulo nem linha, em qualquer idioma', () => {
    assert.deepEqual(functionName('Estresse.dll!Programa.Main() Line 29'), { name: 'Main', program: false, owner: 'Programa' });
    assert.deepEqual(functionName('Estresse.dll!Programa.Main() Linha 29'), { name: 'Main', program: false, owner: 'Programa' });
  });
});

describe('C: struct em array', () => {
  it('a célula mostra os campos', async () => {
    const cell = (name: string, ref: number) => ({ name, value: '', type: 'struct no', variablesReference: ref });
    const snap = await collect({ 1: [{ name: 'v', value: '[2]', type: 'struct no [2]', variablesReference: 2 }], 2: [cell('[0]', 3), cell('[1]', 4)], 3: [{ name: 'v', value: '1', type: 'int', variablesReference: 0 }, { name: 'prox', value: '0x0', type: 'struct no *', variablesReference: 0 }], 4: [{ name: 'v', value: '2', type: 'int', variablesReference: 0 }] }, cAdapter);
    assert.deepEqual(snap.arrays[0].values, ['{v: 1, prox: 0x0}', '{v: 2}']);
  });
});

describe('Go: textos do Delve', () => {
  const format = (value: string) => goAdapter.formatElement({ name: '[0]', value, variablesReference: 0 });
  it('interface, byte e slice', () => {
    assert.equal(format('interface {}(int) 1'), '1');
    assert.equal(format('interface {}(string) "dois"'), '"dois"');
    assert.equal(format('interface {} nil'), 'nil');
    assert.equal(format('97 = 0x61'), '97');
    assert.equal(format('[]int len: 2, cap: 2, [1,2]'), '[1,2]');
  });
  it('valor de uma entrada de mapa', () => {
    assert.deepEqual(goAdapter.mapEntry?.({ name: '"k"', value: '[]int len: 2, cap: 2, [1,2]', variablesReference: 3 }), { key: '"k"', value: '[1,2]' });
  });
});

describe('texto muito longo', () => {
  it('corta variáveis e posições, para o histórico não crescer sem limite', async () => {
    const long = `'${'x'.repeat(100000)}'`;
    const snap = await collect({ 1: [{ name: 't', value: long, type: 'str', variablesReference: 0 }, { name: 'l', value: '[...]', type: 'list', variablesReference: 2 }], 2: [{ name: '0', value: long, type: 'str', variablesReference: 0 }] }, pythonAdapter);
    assert.ok((snap.scalars?.[0].value.length ?? 0) <= 501);
    assert.ok(snap.scalars?.[0].value.endsWith('…'));
    assert.ok(snap.arrays[0].values[0].length <= 501);
  });
});

describe('JavaScript: Map e Set grandes', () => {
  /** O js-debug, sem filtro, devolve todos os itens: a sessão falha nesse caso, como lembrete do custo (3 a 4 s com 50 mil). */
  function paged(vars: Record<number, Var[]>, big: number): Session {
    const inner = session(vars);
    return {
      async customRequest(command: string, args?: any) {
        // O js-debug chama o escopo de "Local".
        if (command === 'scopes') return { scopes: [{ name: 'Local', variablesReference: 1 }] };
        if (command === 'variables' && args.variablesReference === big && args.filter !== 'indexed') throw new Error('pediu todos os itens');
        return inner.customRequest(command, args);
      },
    };
  }
  const n = 50000;
  const tail = [{ name: 'size', value: String(n), variablesReference: 0 }, { name: '[[Prototype]]', value: 'Map', variablesReference: 9 }];

  it('Map de 50 mil pede só as primeiras entradas', async () => {
    const entries = Array.from({ length: n }, (_, i) => ({ name: String(i), value: `{'k${i}' => ${i}}`, variablesReference: 0 }));
    const vars = { 1: [{ name: 'tabela', value: `Map(${n}) {'k0' => 0, …}`, type: 'Map', variablesReference: 2, indexedVariables: n }], 2: [...entries, ...tail] };
    const snap = (await collectSnapshot(paged(vars, 2), 1, javascriptAdapter))!.snapshot;
    assert.equal(snap.maps?.[0].length, n);
    assert.equal(snap.maps?.[0].entries.length, 50);
    assert.deepEqual(snap.maps?.[0].entries[0], { key: "'k0'", value: '0' });
  });

  it('Set de 50 mil pede só os primeiros itens', async () => {
    const vars = { 1: [{ name: 'vistos', value: `Set(${n}) {size: ${n}, 0, 1, …}`, type: 'Set', variablesReference: 2, indexedVariables: n }], 2: [...items(n, 'number'), ...tail] };
    const snap = (await collectSnapshot(paged(vars, 2), 1, javascriptAdapter))!.snapshot;
    assert.equal(snap.arrays[0].length, n);
    assert.equal(snap.arrays[0].values.length, 50);
    assert.equal(snap.arrays[0].kind, 'set');
  });
});

describe('Java: enum do arquivo', () => {
  // Formato do java-debug no estresse: a variável é "lazy" e o único filho traz o nome entre aspas.
  const vars = {
    1: [
      { name: 'cor', value: 'Estresse$Cor@40', type: 'Estresse$Cor', variablesReference: 2 },
      { name: 'misto', value: 'Object[2]@41', type: 'Object[]', variablesReference: 3, indexedVariables: 2 },
      { name: 'carro', value: 'Estresse$Carro@42', type: 'Estresse$Carro', variablesReference: 5 },
    ],
    2: [{ name: '', value: 'Estresse$Cor@40 "VERMELHO"', variablesReference: 6 }],
    3: [
      { name: '0', value: '1', type: 'Integer', variablesReference: 0 },
      { name: '1', value: 'Estresse$Cor@43', type: 'Estresse$Cor', variablesReference: 4 },
    ],
    // Sem lazy: os campos do próprio enum.
    4: [
      { name: 'name', value: '"AZUL"', type: 'String', variablesReference: 7 },
      { name: 'ordinal', value: '1', type: 'int', variablesReference: 0 },
    ],
    5: [{ name: 'cor', value: 'Estresse$Cor@43', type: 'Estresse$Cor', variablesReference: 4 }],
  };
  const opts = { userTypes: async () => new Set(['Carro']), enumTypes: async () => new Set(['Cor']) };

  it('variável, posição de array e campo mostram a constante', async () => {
    const snap = (await collectSnapshot(session(vars), 1, javaAdapter, undefined, opts))!.snapshot;
    assert.deepEqual(snap.scalars?.find((s) => s.name === 'cor'), { name: 'cor', value: 'Cor.VERMELHO' });
    assert.deepEqual(snap.arrays.find((a) => a.name === 'misto')?.values, ['1', 'Cor.AZUL']);
    assert.deepEqual(snap.heap?.find((o) => o.type === 'Carro')?.fields, [{ name: 'cor', value: 'Cor.AZUL' }]);
  });
  it('declaredEnums acha enum Cor', () => {
    assert.deepEqual([...declaredEnums('public class A {\n  enum Cor { VERMELHO, AZUL }\n}')], ['Cor']);
  });
});

describe('C#: coleções vazias', () => {
  const t = (name: string) => `System.Collections.Generic.${name}<int>`;
  it('Stack e Queue vazias continuam pilha e fila', () => {
    assert.deepEqual(csharpAdapter.shape({ name: 'pilha', value: 'Count = 0', type: t('Stack'), variablesReference: 3 }), { kind: 'empty-list', collection: 'stack' });
    assert.deepEqual(csharpAdapter.shape({ name: 'fila', value: 'Count = 0', type: t('Queue'), variablesReference: 3 }), { kind: 'empty-list', collection: 'queue' });
  });
  it('HashSet vazio é conjunto e List vazia é lista', () => {
    assert.deepEqual(csharpAdapter.shape({ name: 'c', value: 'Count = 0', type: t('HashSet'), variablesReference: 3 }), { kind: 'empty-list', collection: 'set' });
    assert.deepEqual(csharpAdapter.shape({ name: 'l', value: 'Count = 0', type: t('List'), variablesReference: 3 }), { kind: 'empty-list' });
  });
  it('a pilha vazia chega ao painel como pilha', async () => {
    const snap = await collect({ 1: [{ name: 'pilha [Stack]', value: 'Count = 0', type: t('Stack'), variablesReference: 3 }] }, csharpAdapter);
    assert.deepEqual(snap.arrays[0], { name: 'pilha', values: [], length: 0, kind: 'stack' });
  });
});

describe('C#: Dictionary com lista no valor', () => {
  const list = 'System.Collections.Generic.List<int>';
  const entry = (i: number, key: string, ref: number) => ({
    name: `[${i}] [KeyValuePair]`,
    value: `{[${key}, System.Collections.Generic.List\`1[System.Int32]]}`,
    type: `System.Collections.Generic.KeyValuePair<string, ${list}>`,
    variablesReference: ref,
  });
  // Formato do vsdbg no estresse: a entrada abre em Key e Value.
  const vars = {
    1: [{ name: 'mapa [Dictionary]', value: 'Count = 2', type: `System.Collections.Generic.Dictionary<string, ${list}>`, variablesReference: 2 }],
    2: [entry(0, 'k', 3), entry(1, 'vazio', 5), { name: 'Raw View', value: '', variablesReference: 9, evaluateName: 'mapa, raw' }],
    3: [
      { name: 'Key [string]', value: '"k"', type: 'string', variablesReference: 0 },
      { name: 'Value [List]', value: 'Count = 2', type: list, variablesReference: 4 },
    ],
    4: [
      { name: '[0] [int]', value: '1', type: 'int', variablesReference: 0 },
      { name: '[1] [int]', value: '2', type: 'int', variablesReference: 0 },
    ],
    5: [
      { name: 'Key [string]', value: '"vazio"', type: 'string', variablesReference: 0 },
      { name: 'Value [List]', value: 'Count = 0', type: list, variablesReference: 6 },
    ],
  };
  it('mostra os itens da lista, não o nome interno do tipo', async () => {
    const snap = await collect(vars, csharpAdapter);
    assert.deepEqual(snap.maps?.[0].entries, [
      { key: 'k', value: '[1, 2]', items: ['1', '2'] },
      { key: 'vazio', value: '[]', items: [] },
    ]);
  });
  it('coleção que não abre aparece pelo nome curto', () => {
    const v = 'System.Collections.Generic.Dictionary`2[System.String,System.Int32]';
    assert.deepEqual(csharpAdapter.mapEntry?.({ name: '[0]', value: `{[k, ${v}]}`, variablesReference: 3 }), { key: 'k', value: 'Dictionary' });
  });
});

describe('C++: std::vector<bool> sem pretty-printers', () => {
  const bits = { name: 'bits', value: '{...}', type: 'std::vector<bool, std::allocator<bool> >', evaluateName: 'bits', variablesReference: 2 };
  /** gdb falso: palavra de 4 bytes (unsigned long do Windows); itens 1, 0, 1, 1 e o item 33 ligado. */
  function gdb(words: string[], length: number): Session {
    return {
      async customRequest(command: string, args?: any) {
        if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'main', line: 1, source: { path: '/x/a.cpp' } }] };
        if (command === 'scopes') return { scopes: [{ name: 'Locals', variablesReference: 1 }] };
        if (command === 'variables') {
          if (args.variablesReference === 1) return { variables: [bits] };
          if (args.variablesReference === 9) return { variables: words.slice(0, 2).map((w, i) => ({ name: `[${i}]`, value: w, variablesReference: 0 })) };
          return { variables: [] };
        }
        const e: string = args.expression;
        if (e.startsWith('sizeof(')) return { result: '4' };
        if (e.startsWith('(bits._M_impl._M_finish._M_p')) return { result: String(length) };
        if (e === '*bits._M_impl._M_start._M_p@2') return { result: '{13, 2}', variablesReference: 9 };
        return { result: '' };
      },
    };
  }
  it('lê o tamanho pelos iteradores de bit e cada item pelo bit da palavra', async () => {
    const snap = (await collectSnapshot(gdb(['13', '2'], 34), 1, cAdapter))!.snapshot;
    const arr = snap.arrays[0];
    assert.equal(arr.length, 34);
    assert.deepEqual(arr.values.slice(0, 4), ['true', 'false', 'true', 'true']);
    assert.equal(arr.values[33], 'true');
    assert.equal(arr.values[32], 'false');
  });
  it('a expressão do tamanho usa _M_p e _M_offset', () => {
    const ind = cAdapter.indirectSequence?.(bits);
    assert.equal(ind?.length, '(bits._M_impl._M_finish._M_p - bits._M_impl._M_start._M_p) * 8 * sizeof(*bits._M_impl._M_start._M_p) + bits._M_impl._M_finish._M_offset');
    assert.deepEqual(ind?.bits, { width: 'sizeof(*bits._M_impl._M_start._M_p)' });
  });
});

describe('C#: erro tratado no catch', () => {
  const e = (value: string) => ({ name: 'e', value, type: 'System.FormatException', variablesReference: 4 });
  it('mensagem entre aspas, como o Visual Studio mostra', () => {
    assert.deepEqual(csharpAdapter.caughtError?.(e('{"The input string \'abc\' was not in a correct format."}')), {
      type: 'FormatException',
      message: "The input string 'abc' was not in a correct format.",
    });
  });
  it('mensagem depois do tipo, sem a pilha', () => {
    assert.deepEqual(csharpAdapter.caughtError?.(e('{System.FormatException: Bad.\n   at Program.Main()}')), { type: 'FormatException', message: 'Bad.' });
  });
  it('sem mensagem no valor, lê a propriedade Message', async () => {
    const snap = await collect({ 1: [e('{System.FormatException}')], 4: [{ name: 'Message [string]', value: '"Bad."', type: 'string', variablesReference: 0 }] }, csharpAdapter);
    assert.deepEqual(snap.caught, { name: 'e', type: 'FormatException', message: 'Bad.' });
  });
  it('objeto comum não é erro', () => {
    assert.equal(csharpAdapter.caughtError?.({ name: 'a', value: '{Exemplos.Aluno}', type: 'Exemplos.Aluno', variablesReference: 4 }), undefined);
  });
});

describe('C++: std::string e vector<vector<int>> sem pretty-printers', () => {
  const str = 'std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >';
  const row = 'std::vector<int, std::allocator<int> >';
  // Formatos do gdb do w64devkit no estresse: "{...}" no topo, "" dentro do vector, evaluateName em cada item.
  const locals = [
    { name: 'texto', value: '{...}', type: 'std::string', evaluateName: 'texto', variablesReference: 5 },
    { name: 'nomes', value: '{...}', type: `std::vector<${str}, std::allocator<${str}> >`, evaluateName: 'nomes', variablesReference: 6 },
    { name: 'matriz', value: '{...}', type: `std::vector<${row}, std::allocator<${row}> >`, evaluateName: 'matriz', variablesReference: 7 },
  ];
  const item = (array: string, n: number, i: number, type: string, ref: number) => ({ name: `[${i}]`, value: '', type, evaluateName: `(*${array}._M_impl._M_start@${n})[${i}]`, variablesReference: ref });
  const results: Record<string, { result: string; variablesReference?: number }> = {
    'texto._M_dataplus._M_p': { result: '0x5ffb10 "abc"' },
    'nomes._M_impl._M_finish - nomes._M_impl._M_start': { result: '2' },
    '*nomes._M_impl._M_start@2': { result: '{...}', variablesReference: 20 },
    '(*nomes._M_impl._M_start@2)[0]._M_dataplus._M_p': { result: '0x1 "a"' },
    '(*nomes._M_impl._M_start@2)[1]._M_dataplus._M_p': { result: '0x2 ""' },
    'matriz._M_impl._M_finish - matriz._M_impl._M_start': { result: '2' },
    '*matriz._M_impl._M_start@2': { result: '{...}', variablesReference: 30 },
    '(*matriz._M_impl._M_start@2)[0]._M_impl._M_finish - (*matriz._M_impl._M_start@2)[0]._M_impl._M_start': { result: '2' },
    '*(*matriz._M_impl._M_start@2)[0]._M_impl._M_start@2': { result: '{1, 2}', variablesReference: 31 },
    '(*matriz._M_impl._M_start@2)[1]._M_impl._M_finish - (*matriz._M_impl._M_start@2)[1]._M_impl._M_start': { result: '2' },
    '*(*matriz._M_impl._M_start@2)[1]._M_impl._M_start@2': { result: '{3, 4}', variablesReference: 32 },
  };
  const children: Record<number, Var[]> = {
    1: locals,
    20: [item('nomes', 2, 0, str, 21), item('nomes', 2, 1, str, 22)],
    30: [item('matriz', 2, 0, row, 33), item('matriz', 2, 1, row, 34)],
    31: [{ name: '[0]', value: '1', type: 'int', variablesReference: 0 }, { name: '[1]', value: '2', type: 'int', variablesReference: 0 }],
    32: [{ name: '[0]', value: '3', type: 'int', variablesReference: 0 }, { name: '[1]', value: '4', type: 'int', variablesReference: 0 }],
  };
  const gdb: Session = {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'main', line: 1, source: { path: '/x/a.cpp' } }] };
      if (command === 'scopes') return { scopes: [{ name: 'Locals', variablesReference: 1 }] };
      if (command === 'variables') return { variables: children[args.variablesReference] ?? [] };
      const r = results[args.expression];
      if (!r) throw new Error(`expressão inesperada: ${args.expression}`);
      return r;
    },
  };

  it('o texto vem do ponteiro, e cada linha da matriz é lida por expressões', async () => {
    const snap = (await collectSnapshot(gdb, 1, cAdapter))!.snapshot;
    assert.deepEqual(snap.scalars?.find((s) => s.name === 'texto'), { name: 'texto', value: '"abc"' });
    assert.deepEqual(snap.arrays.find((a) => a.name === 'nomes')?.values, ['"a"', '""']);
    assert.deepEqual(snap.arrays.find((a) => a.name === 'matriz')?.rows?.map((r) => r.values), [['1', '2'], ['3', '4']]);
  });
  it('com os pretty-printers, o texto já vem entre aspas', () => {
    const v = { name: 'texto', value: '"abc"', type: 'std::string', variablesReference: 0 };
    assert.deepEqual(cAdapter.shape(v), { kind: 'scalar', value: '"abc"' });
    assert.equal(cAdapter.indirectText?.(v), undefined);
  });
});

describe('Java: objeto com toString próprio', () => {
  it('record mostra os campos, que vêm um nível abaixo do filho lazy', async () => {
    const vars = {
      1: [{ name: 'par', value: 'Estresse$Par@39', type: 'Estresse$Par', variablesReference: 2 }],
      2: [{ name: '', value: 'Estresse$Par@39 "Par[a=1, b=x]"', variablesReference: 3 }],
      3: [
        { name: 'a', value: '1', type: 'int', variablesReference: 0 },
        { name: 'b', value: '"x"', type: 'String', variablesReference: 4 },
      ],
    };
    const snap = (await collectSnapshot(session(vars), 1, javaAdapter, undefined, { userTypes: async () => new Set(['Par']) }))!.snapshot;
    assert.deepEqual(snap.heap?.[0].fields, [
      { name: 'a', value: '1' },
      { name: 'b', value: '"x"' },
    ]);
  });
});

describe('Chamadas de baixo com objetos', () => {
  // insere(no, 7) chamando a si mesma: em cima no = null, embaixo no é a raiz.
  const vars: Record<number, Var[]> = {
    1: [{ name: 'no', value: 'null', variablesReference: 0 }, { name: 'valor', value: '7', type: 'int', variablesReference: 0 }],
    2: [
      { name: 'no', value: 'Arvore$No@12', type: 'Arvore$No', variablesReference: 3 },
      { name: 'valor', value: '7', type: 'int', variablesReference: 0 },
      { name: 'leitor', value: 'Scanner@13', type: 'Scanner', variablesReference: 4 },
    ],
    3: [
      { name: 'valor', value: '5', type: 'int', variablesReference: 0 },
      { name: 'esq', value: 'Arvore$No@14', type: 'Arvore$No', variablesReference: 5 },
      { name: 'dir', value: 'null', variablesReference: 0 },
    ],
  };
  const frames: Session = {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') {
        return {
          stackFrames: [
            { id: 10, name: 'Arvore.insere(No, int)', line: 9, source: { path: '/x/Arvore.java' } },
            { id: 11, name: 'Arvore.insere(No, int)', line: 12, source: { path: '/x/Arvore.java' } },
          ],
        };
      }
      if (command === 'scopes') return { scopes: [{ name: 'Local', variablesReference: args.frameId === 10 ? 1 : 2 }] };
      if (command === 'evaluate') return { result: 'false' };
      return { variables: vars[args.variablesReference] ?? [] };
    },
  };

  it('o nó de cada chamada aparece com os campos, e o null do caso base também', async () => {
    const snap = (await collectSnapshot(frames, 1, javaAdapter, undefined, { userTypes: async () => new Set(['No']) }))!.snapshot;
    const [below, top] = snap.calls ?? [];
    assert.deepEqual(below.vars.find((v) => v.name === 'no'), { name: 'no', value: 'No {valor: 5, esq: No, dir: null}' });
    // Objeto de biblioteca fica de fora, como no painel principal.
    assert.equal(below.vars.find((v) => v.name === 'leitor'), undefined);
    assert.deepEqual(top.vars.find((v) => v.name === 'valor'), { name: 'valor', value: '7' });
  });
});

describe('C++: contêineres com pretty-printers', () => {
  const t = (s: string) => `std::${s}<int, std::deque<int, std::allocator<int> > >`;
  const items = (n: number, ref: number) => ({ [ref]: Array.from({ length: n }, (_, i) => ({ name: `[${i}]`, value: String(i + 1), type: 'int', variablesReference: 0 })) });
  // Formatos do gdb do w64devkit com -enable-pretty-printing, no estresse.
  it('stack, queue e set viram pilha, fila e conjunto', async () => {
    const snap = await collect(
      {
        1: [
          { name: 'pilha', value: 'std::stack wrapping: std::deque with 2 elements', type: t('stack'), variablesReference: 2 },
          { name: 'fila', value: 'std::queue wrapping: std::deque with 1 element', type: t('queue'), variablesReference: 3 },
          { name: 'conjunto', value: 'std::set with 2 elements', type: 'std::set<int, std::less<int>, std::allocator<int> >', variablesReference: 4 },
          { name: 'vazia', value: 'std::stack wrapping: std::deque with 0 elements', type: t('stack'), variablesReference: 5 },
        ],
        ...items(2, 2),
        ...items(1, 3),
        ...items(2, 4),
      },
      cAdapter,
    );
    const by = (n: string) => snap.arrays.find((a) => a.name === n);
    assert.deepEqual([by('pilha')?.kind, by('pilha')?.values], ['stack', ['1', '2']]);
    assert.deepEqual([by('fila')?.kind, by('fila')?.values], ['queue', ['1']]);
    assert.deepEqual([by('conjunto')?.kind, by('conjunto')?.values], ['set', ['1', '2']]);
    assert.deepEqual(by('vazia'), { name: 'vazia', values: [], length: 0, kind: 'stack' });
  });
  it('sem os pretty-printers, a pilha fica de fora em vez de mostrar campos internos', () => {
    assert.deepEqual(cAdapter.shape({ name: 'pilha', value: '{...}', type: t('stack'), variablesReference: 2 }), { kind: 'skip' });
  });
});

describe('JavaScript: array esparso', () => {
  it('posição que nunca recebeu valor vale undefined, não "?"', async () => {
    const sieve = { name: 'sieve', value: '(5) [empty × 4, true]', type: 'object', variablesReference: 2, indexedVariables: 5 };
    const base = session({ 1: [sieve], 2: [{ name: '4', value: 'true', type: 'boolean', variablesReference: 0 }] });
    // O js-debug chama o escopo de "Local".
    const js: Session = { customRequest: (c, a) => (c === 'scopes' ? Promise.resolve({ scopes: [{ name: 'Local', variablesReference: 1 }] }) : base.customRequest(c, a)) };
    const snap = (await collectSnapshot(js, 1, javascriptAdapter))!.snapshot;
    assert.deepEqual(snap.arrays[0].values, ['undefined', 'undefined', 'undefined', 'undefined', 'true']);
  });
  it('nas outras linguagens, posição que não veio continua "?"', async () => {
    const v = { name: 'v', value: 'int[3]', type: 'int[]', variablesReference: 2, indexedVariables: 3 };
    const snap = await collect({ 1: [v], 2: [{ name: '[2]', value: '7', type: 'int', variablesReference: 0 }] }, javaAdapter);
    assert.equal(snap.arrays[0].values[0], '?');
  });
});

describe('Campo que guarda um array', () => {
  it('mostra os itens, não o tamanho entre colchetes', async () => {
    const vars = {
      1: [{ name: 'pilha', value: 'Pilha@12', type: 'Pilha', variablesReference: 2 }],
      2: [
        { name: 'itens', value: 'int[2]', type: 'int[]', variablesReference: 3, indexedVariables: 2 },
        { name: 'vazio', value: 'int[0]', type: 'int[]', variablesReference: 4, indexedVariables: 0 },
      ],
      3: [
        { name: '[0]', value: '1', type: 'int', variablesReference: 0 },
        { name: '[1]', value: '2', type: 'int', variablesReference: 0 },
      ],
    };
    const snap = (await collectSnapshot(session(vars), 1, javaAdapter, undefined, { userTypes: async () => new Set(['Pilha']) }))!.snapshot;
    assert.deepEqual(snap.heap?.[0].fields, [
      { name: 'itens', value: '[1, 2]' },
      { name: 'vazio', value: '[]' },
    ]);
  });
});