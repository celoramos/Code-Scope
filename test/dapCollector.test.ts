import * as assert from 'node:assert/strict';
import { collectSnapshot, type Session } from '../src/debug/dapCollector';

/** Sessão falsa com as respostas que o Java Debugger real deu num BubbleSort parado. */
function fakeJavaSession(opts: { paging?: boolean } = {}): Session & { requests: string[] } {
  const requests: string[] = [];
  const vars: Record<number, unknown[]> = {
    1: [
      { name: 'args', value: 'String[0]@9', type: 'String[]', variablesReference: 0, indexedVariables: 0 },
      { name: 'numeros', value: 'int[5]@10', type: 'int[]', variablesReference: 2, indexedVariables: 5 },
      { name: 'i', value: '0', type: 'int', variablesReference: 0 },
      { name: 'j', value: '1', type: 'int', variablesReference: 0 },
    ],
    2: [5, 1, 4, 2, 8].map((v, i) => ({ name: String(i), value: String(v), type: 'int', variablesReference: 0 })),
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
      scalars: [],
    });
  });

  it('lê matriz, lista, char e boolean como o adaptador real devolve', async () => {
    const vars: Record<number, unknown[]> = {
      1: [
        { name: 'grade', value: 'int[2][]@10', type: 'int[][]', variablesReference: 2, indexedVariables: 2 },
        { name: 'lista', value: 'ArrayList@11 size=2', type: 'ArrayList', variablesReference: 5, indexedVariables: 2 },
        { name: 'letras', value: 'char[2]@12', type: 'char[]', variablesReference: 6, indexedVariables: 2 },
        { name: 'ok', value: 'true', type: 'boolean', variablesReference: 0 },
        { name: 'nome', value: '"Ana"', type: 'String', variablesReference: 7 },
      ],
      2: [
        { name: '0', value: 'int[2]@13', type: 'int[]', variablesReference: 3, indexedVariables: 2 },
        { name: '1', value: 'int[2]@14', type: 'int[]', variablesReference: 4, indexedVariables: 2 },
      ],
      3: [{ name: '0', value: '1', type: 'int', variablesReference: 0 }, { name: '1', value: '2', type: 'int', variablesReference: 0 }],
      4: [{ name: '0', value: '3', type: 'int', variablesReference: 0 }, { name: '1', value: '4', type: 'int', variablesReference: 0 }],
      5: [
        { name: '0', value: '"arroz"', type: 'String', variablesReference: 8 },
        { name: '1', value: '"café"', type: 'String', variablesReference: 9 },
      ],
      6: [{ name: '0', value: 'r', type: 'char', variablesReference: 0 }, { name: '1', value: 'a', type: 'char', variablesReference: 0 }],
    };
    const session: Session = {
      async customRequest(command: string, args?: any) {
        if (command === 'stackTrace') return { stackFrames: [{ id: 1, name: 'main', line: 3, source: { path: 'X.java' } }] };
        if (command === 'scopes') return { scopes: [{ name: 'Local', variablesReference: 1 }] };
        return { variables: vars[args.variablesReference] ?? [] };
      },
    };
    const got = (await collectSnapshot(session, 1))!.snapshot;
    assert.deepEqual(got.arrays, [
      {
        name: 'grade',
        values: ['int[2]', 'int[2]'],
        length: 2,
        rows: [
          { name: 'grade[0]', values: ['1', '2'], length: 2 },
          { name: 'grade[1]', values: ['3', '4'], length: 2 },
        ],
      },
      { name: 'lista', values: ['"arroz"', '"café"'], length: 2, kind: 'list' },
      { name: 'letras', values: ["'r'", "'a'"], length: 2 },
    ]);
    assert.deepEqual(got.scalars, [
      { name: 'ok', value: 'true' },
      { name: 'nome', value: '"Ana"' },
    ]);
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
