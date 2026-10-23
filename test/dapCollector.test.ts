import * as assert from 'node:assert/strict';
import { collectSnapshot, type Session } from '../src/debug/dapCollector';

/** Sessão falsa que responde como o Java Debugger num BubbleSort parado. */
function fakeJavaSession(opts: { paging?: boolean } = {}): Session & { requests: string[] } {
  const requests: string[] = [];
  const vars: Record<number, unknown[]> = {
    1: [
      { name: 'args', value: 'String[0] (id=20)', type: 'String[]', variablesReference: 0 },
      { name: 'numeros', value: 'int[5] (id=21)', type: 'int[]', variablesReference: 2, indexedVariables: 5 },
      { name: 'i', value: '0', type: 'int', variablesReference: 0 },
      { name: 'j', value: '1', type: 'int', variablesReference: 0 },
    ],
    2: [5, 1, 4, 2, 8].map((v, i) => ({ name: `[${i}]`, value: String(v), type: 'int', variablesReference: 0 })),
  };
  return {
    requests,
    async customRequest(command: string, args?: any) {
      requests.push(command);
      switch (command) {
        case 'stackTrace':
          return { stackFrames: [{ id: 10, name: 'main', line: 8, source: { path: '/x/BubbleSort.java' } }] };
        case 'scopes':
          return { scopes: [{ name: 'Local', variablesReference: 1 }] };
        case 'variables':
          if (args.filter && opts.paging === false) throw new Error('filter não suportado');
          return { variables: vars[args.variablesReference] ?? [] };
      }
      throw new Error(command);
    },
  };
}

describe('collectSnapshot', () => {
  it('converte as variáveis do Java num Snapshot', async () => {
    const got = await collectSnapshot(fakeJavaSession(), 1);
    assert.deepEqual(got?.snapshot, {
      line: 8,
      file: '/x/BubbleSort.java',
      arrays: [
        { name: 'numeros', values: ['5', '1', '4', '2', '8'], length: 5 },
      ],
      pointers: [
        { name: 'i', value: 0 },
        { name: 'j', value: 1 },
      ],
    });
  });

  it('respeita o limite de elementos', async () => {
    const got = await collectSnapshot(fakeJavaSession(), 1, { maxElements: 3, maxArrays: 20 });
    assert.deepEqual(got?.snapshot.arrays[0], { name: 'numeros', values: ['5', '1', '4'], length: 5 });
  });

  it('funciona quando o adaptador recusa paginação', async () => {
    const got = await collectSnapshot(fakeJavaSession({ paging: false }), 1);
    assert.deepEqual(got?.snapshot.arrays[0].values, ['5', '1', '4', '2', '8']);
  });
});
