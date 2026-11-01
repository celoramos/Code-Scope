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
