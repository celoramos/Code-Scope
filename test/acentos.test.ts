import * as assert from 'node:assert/strict';
import { methodsCalledOn } from '../src/debug/adapters/adapter';
import { javaAdapter, pythonAdapter } from '../src/debug/adapters';
import { collectionRole, objectShape } from '../src/debug/adapters/java';
import { javascriptAdapter } from '../src/debug/adapters/javascript';
import { substitute } from '../src/model/condition';
import { peekNote } from '../src/model/frame';
import { predictionFor } from '../src/model/predict';
import { setNotes } from '../src/model/sets';
import { cAdapter } from '../src/debug/adapters/c';
import { goAdapter, goRole } from '../src/debug/adapters/go';
import { parseClasses } from '../src/model/classes';
import { numberNotes } from '../src/model/numbers';
import { pythonRole } from '../src/debug/adapters/python';
import type { ConditionInfo } from '../src/model/condition';
import { notYetDeclared } from '../src/model/declared';
import { evalIndex, indexAccesses } from '../src/model/indexExpr';
import { indexNames } from '../src/model/indexNames';
import { mutationNotes } from '../src/model/mutation';
import { pointerLengths } from '../src/model/pointerLengths';
import { matrixAxesFor } from '../src/model/pointers';
import { samenessNotes } from '../src/model/sameness';
import type { ArrayVar, Snapshot } from '../src/model/snapshot';
import { readsLetters } from '../src/model/text';

// Quem aprende em português escreve class Nó, início, posição e índices. O \w e o \b do
// JavaScript só conhecem letras sem acento: "posição" virava "posi", e "índices" não era achado.

describe('nomes com acento', () => {
  it('Java: objeto de class Nó tem tipo e identidade', () => {
    assert.deepEqual(objectShape({ name: 'raiz', value: 'Nó@12', variablesReference: 5 }), { type: 'Nó', id: '@12' });
  });

  it('Python: objeto de class Nó tem identidade, para duas variáveis no mesmo nó virarem uma coisa só', () => {
    assert.deepEqual(pythonAdapter.shape({ name: 'raiz', value: '<__main__.Nó object at 0x000001A2F06538C0>', type: 'Nó', variablesReference: 5 }), {
      kind: 'object',
      type: 'Nó',
      id: '0x000001a2f06538c0',
    });
  });

  it('Python: constante de enum com acento é um valor, não um objeto', () => {
    assert.deepEqual(pythonAdapter.shape({ name: 's', value: '<Situação.APROVADO: 1>', type: 'Situação', variablesReference: 6 }), {
      kind: 'scalar',
      value: 'Situação.APROVADO',
    });
  });

  it('métodos chamados numa variável que começa com acento', () => {
    assert.deepEqual(methodsCalledOn('índices.push(1);\níndices.pop();', 'índices'), [
      { method: 'push', args: '1' },
      { method: 'pop', args: '' },
    ]);
  });

  it('métodos de outra variável que termina no mesmo nome não contam', () => {
    assert.deepEqual(methodsCalledOn('pilhaé.push(1);', 'é'), []);
  });

  it('Java: var índices = new Stack<>() é pilha com o topo no fim', () => {
    assert.deepEqual(collectionRole('var índices = new Stack<Integer>();\níndices.push(1);', 'índices'), { role: 'stack', topFirst: false });
  });

  it('busca binária com início e posição: os dois viram seta', () => {
    const names = indexNames('int início = 0, fim = v.length - 1;\nwhile (início <= fim) {\n  int posição = (início + fim) / 2;\n  if (v[posição] == alvo) return posição;\n}');
    assert.ok(names.has('posição'), [...names].join(', '));
    assert.ok(names.has('início'), [...names].join(', '));
    assert.ok(!names.has('posi'), [...names].join(', '));
  });

  it('matriz com nome e índices com acento: linha e coluna', () => {
    const área = {
      name: 'área',
      values: ['int[3]', 'int[3]'],
      length: 2,
      rows: [
        { name: 'área[0]', values: ['1', '2', '3'], length: 3 },
        { name: 'área[1]', values: ['4', '5', '6'], length: 3 },
      ],
    };
    const pointers = [
      { name: 'índice', value: 1 },
      { name: 'posição', value: 2 },
    ];
    assert.deepEqual(matrixAxesFor(área, pointers, ['área[índice][posição] = 0;']), {
      row: { name: 'índice', index: 1 },
      col: { name: 'posição', index: 2 },
    });
  });

  it('texto: lição.trim() sozinho na linha avisa que lição não mudou', () => {
    const s = [{ name: 'lição', value: '" oi "' }];
    const base = (code?: string): Snapshot => ({ file: 'A.java', line: 1, arrays: [], pointers: [], scalars: s, ...(code ? { code } : {}) });
    assert.equal(mutationNotes(base('lição.trim();'), base(), 'pt').length, 1);
  });

  it('lista: índices.sort() muda a própria lista, e o outro nome dela também', () => {
    const list = (name: string, values: string[]): ArrayVar => ({ name, values, length: values.length, kind: 'list', id: '1' });
    const prev: Snapshot = { file: 'a.py', line: 1, pointers: [], code: 'índices.sort()', arrays: [list('índices', ['3', '1']), list('cópia', ['3', '1'])] };
    const next: Snapshot = { file: 'a.py', line: 1, pointers: [], arrays: [list('índices', ['1', '3']), list('cópia', ['1', '3'])] };
    assert.equal(mutationNotes(prev, next, 'pt').length, 1);
  });

  it('Java: == entre textos iguais com nomes com acento', () => {
    const condition: ConditionInfo = { keyword: 'if', line: 1, text: 'avô == avó', parts: [{ text: 'avô == avó', value: false }], ops: [], result: false };
    const s: Snapshot = { file: 'A.java', line: 1, arrays: [], pointers: [], condition, scalars: [{ name: 'avô', value: '"ana"' }, { name: 'avó', value: '"ana"' }] };
    assert.equal(samenessNotes(s, 'pt').length, 1);
  });

  it('texto lido letra por letra: lição.charAt(i) e for (c of lição)', () => {
    assert.ok(readsLetters('char c = lição.charAt(i);', 'lição'));
    assert.ok(readsLetters('for (const c of lição) {}', 'lição'));
    assert.ok(!readsLetters('for (const c of liçãoé) {}', 'lição'));
  });

  it('C: int posição declarada depois da linha parada ainda é lixo', () => {
    const src = 'int main(void) {\n    int n = 3;\n    int posição = 0;\n    return posição;\n}\n';
    assert.deepEqual([...notYetDeclared(src, 3, ['n', 'posição'])], ['posição']);
    assert.deepEqual([...notYetDeclared(src, 4, ['n', 'posição'])], []);
  });

  it('C: tamanho de índices = malloc(...)', () => {
    const src = 'int main(void) {\n  int *índices = malloc(n * sizeof(int));\n  return 0;\n}\n';
    assert.equal(pointerLengths(src, 3).get('índices'), 'n');
  });

  it('C: parâmetro int médias[] com o tamanho em int quantidade_é', () => {
    const src = 'void ordena(int médias[], int quantidade_é) {\n  int i = 0;\n}\n';
    assert.deepEqual([...pointerLengths(src, 2)], [['médias', 'quantidade_é']]);
  });

  it('Go: ônibus = ônibus[1:] é fila', () => {
    assert.deepEqual(goRole('ônibus = append(ônibus, 1)\nônibus = ônibus[1:]', 'ônibus'), { role: 'queue', topFirst: false });
  });

  it('Python: heappush(fé, 3) é fila de prioridade', () => {
    assert.deepEqual(pythonRole('heapq.heappush(fé, 3)', 'fé'), { role: 'heap', topFirst: false });
  });

  it('C: struct Nó guardado na variável e ponteiro Nó *', () => {
    assert.deepEqual(cAdapter.shape({ name: 'raiz', value: '{valor = 1, prox = 0x0}', type: 'Nó', variablesReference: 4, evaluateName: 'raiz' }), {
      kind: 'object',
      type: 'Nó',
      id: '=raiz',
      address: '&raiz',
      inline: true,
    });
    assert.deepEqual(cAdapter.shape({ name: 'p', value: '0x5555555592a0', type: 'Nó *', variablesReference: 4 }), {
      kind: 'object',
      type: 'Nó',
      id: '0x5555555592a0',
    });
  });

  it('C: constante de enum Situação', () => {
    assert.deepEqual(cAdapter.shape({ name: 's', value: 'APROVAÇÃO', type: 'enum Situação', variablesReference: 0 }), { kind: 'scalar', value: 'APROVAÇÃO' });
  });

  it('Go: *main.Nó e main.Nó', () => {
    assert.deepEqual(goAdapter.shape({ name: 'raiz', value: '*{valor: 1}', type: '*main.Nó', variablesReference: 5 }), { kind: 'object', type: 'Nó' });
    assert.deepEqual(goAdapter.shape({ name: 'n', value: '{valor: 1}', type: 'main.Nó', variablesReference: 5, evaluateName: 'n' }), {
      kind: 'object',
      type: 'Nó',
      id: '=n',
      address: '&n',
    });
  });

  it('classes: class Nó extends Base, class Cão(Animal) e def média', () => {
    assert.deepEqual(parseClasses('class Nó extends Base {\n  void falar() {}\n}\n'), { Nó: { parent: 'Base', methods: ['falar'] } });
    assert.deepEqual(parseClasses('class Cão(Animal):\n    def média(self):\n        pass\n'), { Cão: { parent: 'Animal', methods: ['média'] } });
  });

  it('posições comparadas em números[posição] e números[posição + 1]', () => {
    const s: Snapshot = {
      file: 'A.java',
      line: 1,
      arrays: [{ name: 'números', values: ['5', '1', '4', '2'], length: 4 }],
      pointers: [{ name: 'posição', value: 2 }],
    };
    assert.deepEqual(indexAccesses('if (números[posição] > números[posição + 1]) {', s), [
      { array: 'números', expr: 'posição', index: 2 },
      { array: 'números', expr: 'posição + 1', index: 3 },
    ]);
    assert.equal(evalIndex('números.length - posição', s), 2);
  });

  it('condição com os valores no lugar: números[j] > números[j + 1] vira 5 > 1', () => {
    const s: Snapshot = { file: 'A.java', line: 1, arrays: [{ name: 'números', values: ['5', '1', '4'], length: 3 }], pointers: [{ name: 'j', value: 0 }] };
    assert.equal(substitute('números[j] > números[j + 1]', s), '5 > 1');
    assert.equal(substitute('j < números.length', s), '0 < 3');
    assert.equal(substitute('posição < 3', { ...s, pointers: [{ name: 'posição', value: 2 }] }), '2 < 3');
  });

  it('Java: ->máximo() é o valor devolvido', () => {
    assert.deepEqual(javaAdapter.returnValue?.({ name: '->máximo()', value: '3', type: 'int', variablesReference: 0 }), { function: 'máximo', value: '3' });
  });

  it('JavaScript: erro de class ValidaçãoError com a mensagem', () => {
    assert.deepEqual(javascriptAdapter.caughtError?.({ name: 'e', value: 'ValidaçãoError: idade negativa\n    at main (a.js:3:9)', type: 'ValidaçãoError', variablesReference: 3 }), {
      type: 'ValidaçãoError',
      message: 'idade negativa',
    });
  });

  it('peek numa fila que começa com acento', () => {
    const s: Snapshot = { file: 'A.java', line: 1, arrays: [{ name: 'ônibus', kind: 'queue', values: ['1', '2'], length: 2 }], pointers: [] };
    assert.ok(peekNote('int primeiro = ônibus.peek();', s, [], 'pt'));
  });

  it('modo de adivinhar: posição++, int média = ... e números[i] = 0', () => {
    const s = (code: string): Snapshot => ({
      file: 'A.java',
      line: 1,
      code,
      arrays: [{ name: 'números', values: ['5', '1', '4'], length: 3 }],
      pointers: [{ name: 'i', value: 1 }],
    });
    assert.deepEqual(predictionFor(s('posição++;')), { target: 'posição' });
    assert.deepEqual(predictionFor(s('int média = soma / n;')), { target: 'média' });
    assert.deepEqual(predictionFor(s('List<Ação> ações = new ArrayList<>();')), { target: 'ações' });
    assert.deepEqual(predictionFor(s('números[i] = 0;')), { target: 'números[1]' });
  });

  it('conjunto: cães.add(rex) de um valor que já estava', () => {
    const cães = { name: 'cães', kind: 'set' as const, values: ['"rex"'], length: 1 };
    const prev: Snapshot = { file: 'A.java', line: 1, code: 'cães.add(rex);', arrays: [cães], pointers: [], scalars: [{ name: 'rex', value: '"rex"' }] };
    const next: Snapshot = { file: 'A.java', line: 2, arrays: [cães], pointers: [], scalars: [{ name: 'rex', value: '"rex"' }] };
    assert.equal(setNotes(prev, next, 'pt').length, 1);
  });

  it('divisão de inteiros com nomes com acento', () => {
    const pointers = [
      { name: 'soma', value: 7 },
      { name: 'número', value: 2 },
    ];
    const prev: Snapshot = { file: 'A.java', line: 1, arrays: [], pointers, code: 'int média = soma / número;' };
    const next: Snapshot = { file: 'A.java', line: 2, arrays: [], pointers: [...pointers, { name: 'média', value: 3 }] };
    assert.match(numberNotes(prev, next, 'pt')[0] ?? '', /^7 \/ 2 deu 3/);
  });
});
