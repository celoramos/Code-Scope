import * as assert from 'node:assert/strict';
import { declaredClasses } from '../src/debug/adapters/adapter';
import { collectSnapshot, functionName, type Session } from '../src/debug/dapCollector';
import { cAdapter, goAdapter, javaAdapter, javascriptAdapter, pythonAdapter, pickAdapter } from '../src/debug/adapters';
import { parseCondition } from '../src/model/condition';
import { makeFrame } from '../src/model/frame';
import { History } from '../src/model/history';
import { VALUE_NAMES } from '../src/model/pointers';
import { priorityNotes } from '../src/model/priority';
import type { Snapshot } from '../src/model/snapshot';

const heapSnap = (values: string[]): Snapshot => ({ line: 1, file: 'a.py', arrays: [{ name: 'h', values, length: values.length, kind: 'heap' }], pointers: [] });

describe('fila de prioridade e deque pelo uso no código', () => {
  it('Java: PriorityQueue é heap, mesmo declarada como Queue', () => {
    assert.equal(javaAdapter.collectionRole?.('Queue<Integer> fila = new PriorityQueue<>();', 'fila')?.role, 'heap');
  });

  it('Java: as duas pontas fazem o deque', () => {
    const src = 'ArrayDeque<Integer> d = new ArrayDeque<>(); d.addFirst(1); d.pollLast();';
    assert.equal(javaAdapter.collectionRole?.(src, 'd')?.role, 'deque');
  });

  it('Python: heapq numa lista comum', () => {
    assert.equal(pythonAdapter.collectionRole?.('h = []\nheapq.heappush(h, 3)', 'h')?.role, 'heap');
    assert.equal(pythonAdapter.collectionRole?.('heappop( h )', 'h')?.role, 'heap');
    assert.equal(pythonAdapter.collectionRole?.('heapq.heappush(hh, 3)', 'h'), undefined);
  });

  it('Python: deque usado pelas duas pontas, e fila continua fila', () => {
    assert.equal(pythonAdapter.collectionRole?.('d.appendleft(1)\nd.pop()', 'd')?.role, 'deque');
    assert.equal(pythonAdapter.collectionRole?.('d.append(1)\nd.popleft()', 'd')?.role, 'queue');
  });
});

describe('frases do heap', () => {
  it('conta quem entrou e quem ficou na raiz', () => {
    assert.deepEqual(priorityNotes(heapSnap(['3', '5']), heapSnap(['1', '5', '3']), 'pt'), ['1 entrou em h. Quem sai primeiro agora é 1, na raiz.']);
  });

  it('conta quem saiu', () => {
    assert.deepEqual(priorityNotes(heapSnap(['1', '5', '3']), heapSnap(['3', '5']), 'en'), ['1 left h. The new root is 3.']);
    assert.deepEqual(priorityNotes(heapSnap(['1']), heapSnap([]), 'en'), ['1 left h, which is now empty.']);
  });

  it('valores repetidos contam um a um', () => {
    assert.deepEqual(priorityNotes(heapSnap(['2']), heapSnap(['2', '2']), 'en'), ['2 entered h. The next one out is now 2, at the root.']);
  });

  it('no frame, a frase substitui o texto de posição por posição', () => {
    const history = new History();
    history.push(heapSnap(['3', '5']));
    history.push(heapSnap(['1', '5', '3']));
    const frame = makeFrame(history.current() as never, { valueNames: VALUE_NAMES, beginnerMode: true, language: 'en' });
    assert.deepEqual(frame.explanation, ['1 entered h. The next one out is now 1, at the root.']);
  });
});

/** Sessão falsa: cada referência devolve os filhos dados; evaluate responde pelo texto da expressão. */
function fakeSession(tree: Record<number, unknown[]>, evaluate: Record<string, object> = {}): Session {
  return {
    async customRequest(command: string, args: { variablesReference?: number; expression?: string }) {
      if (command === 'stackTrace') return { stackFrames: [{ id: 1, name: 'main', line: 3, source: { path: 'a.txt' } }] };
      if (command === 'scopes') return { scopes: [{ name: 'Local', variablesReference: 1, expensive: false }] };
      if (command === 'variables') return { variables: tree[args.variablesReference ?? 0] ?? [] };
      if (command === 'evaluate') return evaluate[args.expression ?? ''] ?? {};
      return {};
    },
  };
}

const num = (name: string) => ({ name, value: '1', type: 'number', variablesReference: 0 });
const arr = (name: string, ref: number, n: number) => ({ name, value: `(${n}) [1, 1]`, type: 'Array', variablesReference: ref, indexedVariables: n });

describe('matriz de três dimensões', () => {
  it('cada camada vira uma matriz própria', async () => {
    const tree = {
      1: [arr('cubo', 2, 2)],
      2: [arr('0', 3, 2), arr('1', 4, 2)],
      3: [arr('0', 5, 2), arr('1', 5, 2)],
      4: [arr('0', 5, 2), arr('1', 5, 2)],
      5: [num('0'), num('1')],
    };
    const got = await collectSnapshot(fakeSession(tree), 1, javascriptAdapter);
    assert.deepEqual(got?.snapshot.arrays.map((a) => a.name), ['cubo[0]', 'cubo[1]']);
    assert.deepEqual(got?.snapshot.arrays[1].rows?.map((r) => r.name), ['cubo[1][0]', 'cubo[1][1]']);
    assert.deepEqual(got?.snapshot.arrays[1].rows?.[0].values, ['1', '1']);
  });

  it('matriz comum continua um desenho só', async () => {
    const tree = { 1: [arr('m', 2, 2)], 2: [arr('0', 3, 2), arr('1', 3, 2)], 3: [num('0'), num('1')] };
    const got = await collectSnapshot(fakeSession(tree), 1, javascriptAdapter);
    assert.deepEqual(got?.snapshot.arrays.map((a) => a.name), ['m']);
    assert.equal(got?.snapshot.arrays[0].rows?.length, 2);
  });
});

describe('coleções do C++', () => {
  const type = 'std::vector<int, std::allocator<int> >';

  it('com pretty-printer, o tamanho vem no valor', () => {
    assert.deepEqual(cAdapter.shape({ name: 'v', value: 'std::vector of length 3, capacity 4', type, variablesReference: 5 }), { kind: 'sequence', length: 3, collection: 'list' });
    assert.deepEqual(cAdapter.shape({ name: 'v', value: 'std::vector of length 0, capacity 0', type, variablesReference: 5 }), { kind: 'empty-list' });
  });

  it('std::map com pretty-printer vira dicionário', () => {
    const map = { name: 'm', value: 'std::map with 2 elements', type: 'std::map<int, int>', variablesReference: 5 };
    assert.deepEqual(cAdapter.shape(map), { kind: 'map', length: 2 });
    assert.deepEqual(cAdapter.mapEntry?.({ name: '["a"]', value: '1', variablesReference: 0 }), { key: '"a"', value: '1' });
  });

  it('sem pretty-printer, std::map fica de fora', () => {
    assert.deepEqual(cAdapter.shape({ name: 'm', value: '{...}', type: 'std::map<int, int>', variablesReference: 5 }), { kind: 'skip' });
  });

  it('sem pretty-printer, os itens do vector vêm por expressões', async () => {
    const tree = {
      1: [{ name: 'v', value: '{...}', type, variablesReference: 2, evaluateName: 'v' }],
      9: [
        { name: '[0]', value: '5', type: 'int', variablesReference: 0 },
        { name: '[1]', value: '7', type: 'int', variablesReference: 0 },
      ],
    };
    const evaluate = { 'v._M_impl._M_finish - v._M_impl._M_start': { result: '2' }, '*v._M_impl._M_start@2': { result: '[2]', variablesReference: 9 } };
    const got = await collectSnapshot(fakeSession(tree, evaluate), 1, cAdapter);
    assert.deepEqual(got?.snapshot.arrays, [{ name: 'v', values: ['5', '7'], length: 2, kind: 'list' }]);
  });

  it('vector vazio sem pretty-printer aparece vazio', async () => {
    const tree = { 1: [{ name: 'v', value: '{...}', type, variablesReference: 2, evaluateName: 'v' }] };
    const got = await collectSnapshot(fakeSession(tree, { 'v._M_impl._M_finish - v._M_impl._M_start': { result: '0' } }), 1, cAdapter);
    assert.deepEqual(got?.snapshot.arrays, [{ name: 'v', values: [], length: 0, kind: 'list' }]);
  });
});

describe('Go', () => {
  it('sessão go e arquivo .go escolhem o adaptador', () => {
    assert.equal(pickAdapter('go', 'main.go').id, 'go');
    assert.equal(pickAdapter('outro', 'main.go').id, 'go');
  });

  // Formatos copiados do dlv dap real, com supportsVariableType.
  it('slice, array e mapa', () => {
    assert.deepEqual(goAdapter.shape({ name: 's', value: '[]string len: 1, cap: 2, ["azul"]', type: '[]string', variablesReference: 4, indexedVariables: 1 }), { kind: 'sequence', length: 1, collection: 'list' });
    assert.deepEqual(goAdapter.shape({ name: 's', value: '[]int len: 0, cap: 0, []', type: '[]int', variablesReference: 0 }), { kind: 'empty-list' });
    assert.deepEqual(goAdapter.shape({ name: 'a', value: '[5]int [1,2,4,5,8]', type: '[5]int', variablesReference: 4, indexedVariables: 5 }), { kind: 'sequence', length: 5, collection: 'array' });
    assert.deepEqual(goAdapter.shape({ name: 'm', value: 'map[string]int ["sol": 2, "lua": 1, ]', type: 'map[string]int', variablesReference: 4, indexedVariables: 2, namedVariables: 1 }), { kind: 'map', length: 2 });
  });

  it('valores simples', () => {
    assert.deepEqual(goAdapter.shape({ name: 'i', value: '5', type: 'int', variablesReference: 0 }), { kind: 'integer', value: 5 });
    assert.deepEqual(goAdapter.shape({ name: 'r', value: '120', type: 'int32', variablesReference: 0 }), { kind: 'integer', value: 120 });
    assert.deepEqual(goAdapter.shape({ name: 't', value: '"go"', type: 'string', variablesReference: 0 }), { kind: 'scalar', value: '"go"' });
  });

  it('ponteiro, nil e struct', () => {
    assert.deepEqual(goAdapter.shape({ name: 'p', value: '*main.No {valor: 1}', type: '*main.No', variablesReference: 4 }), { kind: 'object', type: 'No' });
    assert.deepEqual(goAdapter.shape({ name: 'p', value: '*main.No nil', type: '*main.No', variablesReference: 0 }), { kind: 'null' });
    assert.deepEqual(goAdapter.shape({ name: '[0]', value: 'main.Aluno {nota: 9.5}', type: 'main.Aluno', variablesReference: 4, evaluateName: 'turma[0]' }), { kind: 'object', type: 'Aluno', id: '=turma[0]', address: '&turma[0]' });
  });

  it('o resultado sem nome não é variável do aluno', () => {
    assert.deepEqual(goAdapter.normalize?.([{ name: 'n', value: '1', variablesReference: 0 }, { name: '~r0', value: '0', variablesReference: 0 }]).map((v) => v.name), ['n']);
  });

  it('entradas de mapa pelo nome; len() e chave composta ficam de fora', () => {
    assert.deepEqual(goAdapter.mapEntry?.({ name: '"sol"', value: '2', variablesReference: 0 }), { key: '"sol"', value: '2' });
    assert.equal(goAdapter.mapEntry?.({ name: 'len()', value: '2', variablesReference: 0 }), undefined);
    assert.equal(goAdapter.mapEntry?.({ name: '[key 0]', value: 'x', variablesReference: 0 }), undefined);
  });

  it('o filho sem nome do ponteiro é o struct', async () => {
    const tree = {
      1: [{ name: 'p', value: '*main.No {valor: 1}', type: '*main.No', variablesReference: 2, evaluateName: 'p' }],
      2: [{ name: '', value: 'main.No {valor: 1}', type: 'main.No', variablesReference: 3 }],
      3: [{ name: 'valor', value: '1', type: 'int', variablesReference: 0 }],
    };
    const got = await collectSnapshot(fakeSession(tree), 1, goAdapter, undefined, { userTypes: async () => new Set(['No']) });
    assert.deepEqual(got?.snapshot.heap?.[0].fields, [{ name: 'valor', value: '1' }]);
    assert.equal(got?.snapshot.refs?.[0].name, 'p');
  });

  it('declaredClasses entende type No struct', () => {
    assert.deepEqual([...declaredClasses('type No struct {\n}\ntype Id int\n')], ['No']);
  });

  it('função e método têm o nome limpo', () => {
    assert.deepEqual(functionName('main.fatorial'), { name: 'fatorial', program: false });
    assert.deepEqual(functionName('main.(*Conta).depositar'), { name: 'depositar', program: false, owner: 'Conta' });
  });

  it('condições sem parênteses', () => {
    assert.equal(parseCondition('if numeros[j] > numeros[j+1] {', 'go')?.text, 'numeros[j] > numeros[j+1]');
    assert.equal(parseCondition('for i := 0; i < n; i++ {', 'go')?.text, 'i < n');
    assert.equal(parseCondition('for i < n {', 'go')?.text, 'i < n');
    assert.equal(parseCondition('} else if v := f(); v > 0 {', 'go')?.text, 'v > 0');
    assert.equal(parseCondition('for _, x := range lista {', 'go'), undefined);
    assert.equal(parseCondition('for {', 'go'), undefined);
  });

  it('o corte diz se o slice é pilha ou fila', () => {
    assert.equal(goAdapter.collectionRole?.('p = p[:len(p)-1]', 'p')?.role, 'stack');
    assert.equal(goAdapter.collectionRole?.('f = f[1:]', 'f')?.role, 'queue');
    assert.equal(goAdapter.collectionRole?.('x = append(x, 1)', 'x'), undefined);
  });
});
