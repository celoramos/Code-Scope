import * as assert from 'node:assert/strict';
import { collectStep, toSource } from '../src/core/collectStep';
import type { Session } from '../src/debug/dapCollector';
import { cGlobals, goGlobals, staticFields, usedNames } from '../src/model/outer';

type Var = { name: string; value: string; type?: string; variablesReference: number; indexedVariables?: number; evaluateName?: string };

describe('Nomes que a função usa', () => {
  it('sem campo de objeto, texto nem comentário', () => {
    const fn = 'void registrar(String e) {\n  historico.add(e); // total aqui não conta\n  this.contagem++;\n  String s = "total";\n}';
    const used = usedNames(fn);
    assert.ok(used.has('historico'));
    assert.ok(used.has('e'));
    assert.ok(!used.has('contagem'));
    assert.ok(!used.has('total'));
    assert.ok(!used.has('add'));
  });
  it('Python: # é comentário e // é divisão', () => {
    const used = usedNames('def media(v):\n    return soma(v) // tamanho  # total\n', true);
    assert.ok(used.has('tamanho'));
    assert.ok(!used.has('total'));
  });
  it('JavaScript: #saldo é campo privado, não comentário', () => {
    const used = usedNames('depositar(valor) {\n  this.#saldo += valor + taxa;\n}');
    assert.ok(used.has('taxa'));
  });
});

describe('Variáveis declaradas fora das funções', () => {
  it('Java e C#: campos static, não métodos', () => {
    const java = 'public class Main {\n  static long[] memo = new long[60];\n  private static final int MAX = 10;\n  static List<Integer> visitados = new ArrayList<>();\n  static int total;\n  static long fib(int n) { return n; }\n  public static void main(String[] a) {}\n}';
    assert.deepEqual(staticFields(java).sort(), ['MAX', 'memo', 'total', 'visitados']);
    assert.deepEqual(staticFields('class P { static readonly Dictionary<string, int> cache = new(); }'), ['cache']);
  });
  it('C: globais, sem protótipo, typedef, struct nem local de função', () => {
    const c = [
      '#include <stdio.h>',
      '#define MAX 100',
      'typedef struct no { int v; struct no *prox; } No;',
      'int v[MAX];',
      'int n = 5, total, *p = NULL;',
      'No *inicio = NULL;',
      'struct Ponto { int x, y; } origem = {0, 0};',
      'static char nome[20] = "ana";',
      'int soma(int a, int b);',
      'int main(void) {',
      '    int local = 1;',
      '    return soma(local, n);',
      '}',
      'int soma(int a, int b) { int dentro = a; return dentro + b; }',
    ].join('\n');
    assert.deepEqual(cGlobals(c).sort(), ['inicio', 'n', 'nome', 'origem', 'p', 'total', 'v']);
  });
  it('Go: var solta e bloco var', () => {
    const go = 'package main\n\nvar memo = map[int]int{}\nvar a, b int\nvar (\n\tvisitados []int\n\ttotal = 0\n)\n\nfunc main() {\n\tvar local int\n}\n';
    assert.deepEqual(goGlobals(go).sort(), ['a', 'b', 'memo', 'total', 'visitados']);
  });
});

/** Sessão falsa: locais na referência 1, globais na 2; evaluate responde os static. */
function session(file: string, line: number, scopes: { name: string; variablesReference: number }[], vars: Record<number, Var[]>, evaluate: Record<string, object> = {}): Session {
  return {
    async customRequest(command: string, args?: any) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 10, name: 'f', line, source: { path: file } }] };
      if (command === 'scopes') return { scopes };
      if (command === 'evaluate') {
        const r = evaluate[args.expression];
        if (!r) throw new Error('não existe');
        return r;
      }
      return { variables: vars[args.variablesReference] ?? [] };
    },
  };
}

const step = (s: Session, debugType: string, text: string) =>
  collectStep(s, 1, { debugType, limits: { maxElements: 50, maxArrays: 20 }, readSource: async () => toSource(text) }).then((r) => r!.snapshot);

describe('Dentro da função, as variáveis de fora que ela usa', () => {
  const py = 'historico = []\noutra = [9]\n\n\ndef registrar(evento):\n    historico.append(evento)\n\n\nregistrar("a")\n';
  const globals: Var[] = [
    { name: 'historico', value: "['a']", type: 'list', variablesReference: 3 },
    { name: 'outra', value: '[9]', type: 'list', variablesReference: 4 },
    { name: 'registrar', value: '<function registrar at 0x1>', type: 'function', variablesReference: 5 },
  ];
  const vars = { 1: [{ name: 'evento', value: "'a'", type: 'str', variablesReference: 0 }], 2: globals, 3: [{ name: '0', value: "'a'", type: 'str', variablesReference: 0 }], 4: [{ name: '0', value: '9', type: 'int', variablesReference: 0 }] };
  const scopes = [
    { name: 'Locals', variablesReference: 1 },
    { name: 'Globals', variablesReference: 2 },
  ];

  it('Python: a lista global que a função muda aparece; a que ela não usa, não', async () => {
    const snap = await step(session('/p/main.py', 6, scopes, vars), 'debugpy', py);
    assert.deepEqual(
      snap.arrays.map((a) => a.name),
      ['historico'],
    );
    assert.deepEqual(snap.scalars, [{ name: 'evento', value: "'a'" }]);
  });

  it('no topo do programa, as locais já são as globais: nada é lido duas vezes', async () => {
    const top = { 1: globals.slice(0, 2), 2: globals, 3: vars[3], 4: vars[4] };
    const snap = await step(session('/p/main.py', 9, scopes, top), 'debugpy', py);
    assert.deepEqual(snap.arrays.map((a) => a.name).sort(), ['historico', 'outra']);
  });

  it('Java: o static memo vem por evaluate', async () => {
    const java = 'public class Main {\n  static long[] memo = new long[3];\n  static long fib(int n) {\n    return memo[n];\n  }\n}\n';
    const s = session('/j/Main.java', 4, [{ name: 'Local', variablesReference: 1 }], { 1: [{ name: 'n', value: '2', type: 'int', variablesReference: 0 }], 7: [0, 1, 1].map((v, i) => ({ name: String(i), value: String(v), type: 'long', variablesReference: 0 })) }, {
      memo: { result: 'long[3]@20', type: 'long[]', variablesReference: 7, indexedVariables: 3 },
    });
    const snap = await step(s, 'java', java);
    const memo = snap.arrays.find((a) => a.name === 'memo');
    assert.deepEqual(memo?.values, ['0', '1', '1']);
    assert.deepEqual(snap.pointers, [{ name: 'n', value: 2 }]);
  });

  it('C: o array global que a função ordena vem por evaluate; o que não existe fica de fora', async () => {
    const c = 'int v[3] = {3, 1, 2};\nint n = 3;\n\nvoid ordena(void) {\n  v[0] = n + fantasma;\n}\n';
    const s = session('/c/a.c', 5, [{ name: 'Locals', variablesReference: 1 }], { 1: [], 8: [3, 1, 2].map((x, i) => ({ name: `[${i}]`, value: String(x), type: 'int', variablesReference: 0 })) }, {
      v: { result: '[3]', type: 'int [3]', variablesReference: 8 },
      n: { result: '3', type: 'int', variablesReference: 0 },
    });
    const snap = await step(s, 'cppdbg', c);
    assert.deepEqual(snap.arrays.find((a) => a.name === 'v')?.values, ['3', '1', '2']);
    assert.deepEqual(snap.pointers, [{ name: 'n', value: 3 }]);
  });
});
