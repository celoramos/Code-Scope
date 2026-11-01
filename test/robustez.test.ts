import * as assert from 'node:assert/strict';
import { cAdapter } from '../src/debug/adapters/c';
import { csharpAdapter } from '../src/debug/adapters/csharp';
import { goAdapter } from '../src/debug/adapters/go';
import { javaAdapter, pythonAdapter } from '../src/debug/adapters';
import type { LanguageAdapter } from '../src/debug/adapters/adapter';
import { collectSnapshot, functionName, type Session } from '../src/debug/dapCollector';

type Var = { name: string; value: string; type?: string; variablesReference: number; evaluateName?: string };

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
});
