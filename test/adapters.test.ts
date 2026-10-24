import * as assert from 'node:assert/strict';
import { methodsCalledOn } from '../src/debug/adapters/adapter';
import { genericAdapter, lengthInValue } from '../src/debug/adapters/generic';
import { javaAdapter, javascriptAdapter, pickAdapter, pythonAdapter } from '../src/debug/adapters';
import { javascriptRole } from '../src/debug/adapters/javascript';
import { pythonRole } from '../src/debug/adapters/python';

const v = (name: string, value: string, type?: string, variablesReference = 0, indexedVariables?: number) => ({
  name,
  value,
  type,
  variablesReference,
  indexedVariables,
});

describe('pickAdapter', () => {
  it('escolhe pelo tipo da sessão', () => {
    assert.equal(pickAdapter('java', ''), javaAdapter);
    assert.equal(pickAdapter('pwa-node', ''), javascriptAdapter);
    assert.equal(pickAdapter('debugpy', ''), pythonAdapter);
  });

  it('sem tipo conhecido, escolhe pela extensão do arquivo', () => {
    assert.equal(pickAdapter('algum-debugger', 'C:/x/app.TS'), javascriptAdapter);
    assert.equal(pickAdapter('algum-debugger', '/x/main.py'), pythonAdapter);
  });

  it('C# e C/C++ têm adaptador próprio', () => {
    assert.equal(pickAdapter('coreclr', '/x/Program.cs').id, 'csharp');
    assert.equal(pickAdapter('cppdbg', '/x/main.cpp').id, 'c');
  });

  it('cai no modo genérico para o resto', () => {
    assert.equal(pickAdapter('go', '/x/main.go'), genericAdapter);
    assert.equal(pickAdapter('lua', '/x/main.lua'), genericAdapter);
  });
});

describe('javascriptAdapter (valores do js-debug real)', () => {
  it('escopos Block e Local, sem Global', () => {
    const scopes = [
      { name: 'Block', variablesReference: 1 },
      { name: 'Block', variablesReference: 2 },
      { name: 'Local', variablesReference: 3 },
      { name: 'Global', variablesReference: 4, expensive: true },
    ];
    assert.deepEqual(
      javascriptAdapter.localScopes(scopes).map((s) => s.variablesReference),
      [1, 2, 3],
    );
  });

  it('array, número, texto e o que o Node põe no módulo', () => {
    assert.deepEqual(javascriptAdapter.shape(v('numeros', '(5) [5, 1, 4, 2, 8]', 'Array', 9)), {
      kind: 'sequence',
      length: 5,
      collection: 'list',
    });
    assert.deepEqual(javascriptAdapter.shape(v('j', '0', 'number')), { kind: 'integer', value: 0 });
    assert.deepEqual(javascriptAdapter.shape(v('media', '2.5', 'number')), { kind: 'scalar', value: '2.5' });
    assert.deepEqual(javascriptAdapter.shape(v('nome', "'Ana'", 'string')), { kind: 'scalar', value: "'Ana'" });
    assert.deepEqual(javascriptAdapter.shape(v('__dirname', "'C:\\x'", 'string')), { kind: 'skip' });
    assert.deepEqual(javascriptAdapter.shape(v('pessoa', '{nome: ...}', 'Object', 3)), { kind: 'map' });
  });

  it('push com pop é pilha, push com shift é fila', () => {
    assert.deepEqual(javascriptRole('const h = [];\nh.push(1);\nh.pop();', 'h'), { role: 'stack', topFirst: false });
    assert.deepEqual(javascriptRole('const f = [];\nf.push(1);\nf.shift();', 'f'), { role: 'queue', topFirst: false });
    assert.equal(javascriptRole('const l = [];\nl.push(1);', 'l'), undefined);
  });
});

describe('pythonAdapter (formato do debugpy)', () => {
  it('escolhe Locals e ignora Globals', () => {
    const scopes = [
      { name: 'Locals', variablesReference: 1 },
      { name: 'Globals', variablesReference: 2 },
    ];
    assert.deepEqual(pythonAdapter.localScopes(scopes).map((s) => s.name), ['Locals']);
  });

  it('list, tuple, deque, int, str, bool e o que não desenha', () => {
    assert.deepEqual(pythonAdapter.shape(v('numeros', '[5, 1, 4]', 'list', 7)), {
      kind: 'sequence',
      length: undefined,
      collection: 'list',
    });
    assert.deepEqual(pythonAdapter.shape(v('ponto', '(1, 2)', 'tuple', 8)), {
      kind: 'sequence',
      length: undefined,
      collection: 'array',
    });
    assert.deepEqual(pythonAdapter.shape(v('fila', 'deque([])', 'deque', 9)), { kind: 'empty-list' });
    assert.deepEqual(pythonAdapter.shape(v('vazia', '[]', 'list', 9)), { kind: 'empty-list' });
    assert.deepEqual(pythonAdapter.shape(v('i', '3', 'int')), { kind: 'integer', value: 3 });
    assert.deepEqual(pythonAdapter.shape(v('nome', "'Ana'", 'str')), { kind: 'scalar', value: "'Ana'" });
    assert.deepEqual(pythonAdapter.shape(v('ok', 'True', 'bool')), { kind: 'scalar', value: 'True' });
    assert.deepEqual(pythonAdapter.shape(v('math', "<module 'math'>", 'module', 4)), { kind: 'skip' });
    assert.equal(pythonAdapter.elementIndex('len()'), undefined);
    assert.equal(pythonAdapter.elementIndex('2'), 2);
  });

  it('append com pop() é pilha; pop(0) e popleft() são fila', () => {
    assert.deepEqual(pythonRole('p = []\np.append(1)\np.pop()', 'p'), { role: 'stack', topFirst: false });
    assert.deepEqual(pythonRole('f = []\nf.append(1)\nf.pop(0)', 'f'), { role: 'queue', topFirst: false });
    assert.deepEqual(pythonRole('f = deque()\nf.append(1)\nf.popleft()', 'f'), { role: 'queue', topFirst: false });
    assert.equal(pythonRole('l = []\nl.append(1)', 'l'), undefined);
  });
});

describe('genericAdapter', () => {
  it('reconhece coleção pelo indexedVariables ou pelo tamanho escrito no valor', () => {
    assert.deepEqual(genericAdapter.shape(v('xs', 'int[3]', undefined, 5, 3)), { kind: 'sequence', length: 3, collection: 'list' });
    assert.deepEqual(genericAdapter.shape(v('v', 'std::vector of length 4', 'std::vector<int>', 5)), { kind: 'skip' });
    assert.deepEqual(genericAdapter.shape(v('lista', 'Count = 2', 'List<int>', 5)), { kind: 'sequence', length: 2, collection: 'list' });
    assert.equal(lengthInValue('(5) [1, 2]'), 5);
    assert.equal(lengthInValue('size=7'), 7);
  });

  it('inteiro, valor simples e objeto grande', () => {
    assert.deepEqual(genericAdapter.shape(v('i', '4', 'int')), { kind: 'integer', value: 4 });
    assert.deepEqual(genericAdapter.shape(v('ok', 'true', 'bool')), { kind: 'scalar', value: 'true' });
    assert.deepEqual(genericAdapter.shape(v('x', '1.5', 'double')), { kind: 'scalar', value: '1.5' });
    assert.deepEqual(genericAdapter.shape(v('o', 'x'.repeat(60))), { kind: 'skip' });
  });

  it('escopos baratos e não globais', () => {
    const scopes = [
      { name: 'Locals', variablesReference: 1 },
      { name: 'Registers', variablesReference: 2 },
      { name: 'Globals', variablesReference: 3 },
    ];
    assert.deepEqual(genericAdapter.localScopes(scopes).map((s) => s.name), ['Locals']);
  });
});

describe('methodsCalledOn', () => {
  it('separa método e argumentos, inclusive com chamadas dentro', () => {
    assert.deepEqual(methodsCalledOn('p.push(s.charAt(i));\np.pop();\nq.pop(0)', 'p'), [
      { method: 'push', args: 's.charAt(i' },
      { method: 'pop', args: '' },
    ]);
  });
});
