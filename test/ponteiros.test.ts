import * as assert from 'node:assert/strict';
import { collectStep, toSource } from '../src/core/collectStep';
import type { Session } from '../src/debug/dapCollector';
import { enclosingFunction } from '../src/model/enclosing';
import { pointerLengths } from '../src/model/pointerLengths';

type Var = { name: string; value: string; type?: string; variablesReference: number; evaluateName?: string };

describe('Tamanho de um ponteiro que é array, pelo código', () => {
  it('parâmetro: o inteiro logo depois do array, ou o de antes', () => {
    const c = 'void ordena(int v[], int n) {\n  int i;\n}\nint soma(int tam, const double *notas) {\n  return 0;\n}\nvoid fixo(float v[10]) {\n  v[0] = 1;\n}\n';
    assert.deepEqual([...pointerLengths(c, 2)], [['v', 'n']]);
    assert.deepEqual([...pointerLengths(c, 5)], [['notas', 'tam']]);
    assert.deepEqual([...pointerLengths(c, 8)], [['v', '10']]);
  });
  it('chave na linha de baixo, como em muito livro de C', () => {
    const c = 'void ordena(int *v, int n)\n{\n  int i = 0;\n}\n';
    assert.ok(enclosingFunction(c, 3, false)?.startsWith('void ordena'));
    assert.deepEqual([...pointerLengths(c, 3)], [['v', 'n']]);
  });
  it('malloc, calloc, realloc e new[]', () => {
    const c = [
      'int main(void) {',
      '  int *v = malloc(n * sizeof(int));',
      '  double *d = (double *) malloc(sizeof(double) * (n + 1));',
      '  int *z = calloc(tam, sizeof *z);',
      '  v = realloc(v, 2 * n * sizeof(int));',
      '  No *um = malloc(sizeof(No));',
      '  int *w = new int[k];',
      '  return 0;',
      '}',
    ].join('\n');
    const lengths = pointerLengths(c, 8);
    assert.equal(lengths.get('v'), '2 * n');
    assert.equal(lengths.get('d'), '(n + 1)');
    assert.equal(lengths.get('z'), 'tam');
    assert.equal(lengths.get('w'), 'k');
    assert.ok(!lengths.has('um'), 'um nó só não é array');
  });
  it('troca(int *a, int *b) não é array: não tem inteiro de tamanho', () => {
    assert.deepEqual([...pointerLengths('void troca(int *a, int *b) {\n  int t = *a;\n}\n', 2)], []);
  });
});

function session(line: number, vars: Record<number, Var[]>, evaluate: Record<string, object>): Session {
  return {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'ordena', line, source: { path: '/c/a.c' } }] };
      if (command === 'scopes') return { scopes: [{ name: 'Locals', variablesReference: 1 }] };
      if (command === 'evaluate') {
        const r = evaluate[args.expression];
        if (!r) throw new Error(`sem ${args.expression}`);
        return r;
      }
      return { variables: vars[args.variablesReference] ?? [] };
    },
  };
}

const step = (s: Session, text: string) => collectStep(s, 1, { debugType: 'cppdbg', limits: { maxElements: 50, maxArrays: 20 }, readSource: async () => toSource(text) }).then((r) => r!.snapshot);

describe('C: o array que a função recebe por ponteiro', () => {
  const source = 'void ordena(int v[], int n) {\n  for (int i = 0; i < n; i++) {}\n}\n';
  const items = [5, 1, 4].map((x, i) => ({ name: `[${i}]`, value: String(x), type: 'int', variablesReference: 0 }));

  it('a função de ordenar mostra o array inteiro, não só o endereço', async () => {
    const s = session(
      2,
      {
        1: [
          { name: 'v', value: '0x5ffe40', type: 'int *', variablesReference: 2, evaluateName: 'v' },
          { name: 'n', value: '3', type: 'int', variablesReference: 0 },
        ],
        2: [{ name: '*v', value: '5', type: 'int', variablesReference: 0 }],
        3: items,
      },
      { n: { result: '3' }, '*v@3': { result: '{5, 1, 4}', variablesReference: 3 } },
    );
    const snap = await step(s, source);
    assert.deepEqual(snap.arrays.find((a) => a.name === 'v')?.values, ['5', '1', '4']);
  });

  it('ponteiro com lixo (ainda sem valor) não é lido', async () => {
    const s = session(2, { 1: [{ name: 'v', value: '0x1', type: 'int *', variablesReference: 2 }] }, { n: { result: '3' } });
    const snap = await step(s, source);
    assert.equal(snap.arrays.length, 0);
  });
});

describe('C e C++: struct e objeto guardados direto na variável', () => {
  it('"Aluno a;" vira um objeto com os campos', async () => {
    const source = 'typedef struct { char nome[10]; int nota; } Aluno;\nint main(void) {\n  Aluno a = {"ana", 9};\n  return 0;\n}\n';
    const s = session(
      4,
      {
        1: [{ name: 'a', value: '{...}', type: 'Aluno', variablesReference: 2, evaluateName: 'a' }],
        2: [
          { name: 'nome', value: String.raw`"ana\000\000\000\000\000\000\000"`, type: 'char [10]', variablesReference: 5 },
          { name: 'nota', value: '9', type: 'int', variablesReference: 0 },
        ],
      },
      {},
    );
    const snap = await step(s, source);
    assert.deepEqual(snap.refs, [{ name: 'a', ref: '=a' }]);
    assert.deepEqual(
      snap.heap?.[0].fields.map((f) => `${f.name}=${f.value}`),
      ['nome="ana"', 'nota=9'],
    );
  });
});
