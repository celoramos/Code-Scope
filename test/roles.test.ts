import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { applyCollectionRoles, javaAdapter, pythonAdapter } from '../src/debug/adapters';
import { collectionRole } from '../src/debug/adapters/java';
import { enclosingFunction } from '../src/model/enclosing';
import type { Snapshot } from '../src/model/snapshot';

const sample = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'samples', 'java', `${name}.java`), 'utf8');

describe('collectionRole', () => {
  it('Stack é pilha com o topo no fim', () => {
    assert.deepEqual(collectionRole(sample('Pilha'), 'pratos'), { role: 'stack', topFirst: false });
  });

  it('Queue é fila', () => {
    assert.deepEqual(collectionRole(sample('Fila'), 'banco'), { role: 'queue', topFirst: false });
  });

  it('Deque com push e pop é pilha com o topo no começo', () => {
    assert.deepEqual(collectionRole(sample('Parenteses'), 'abertos'), { role: 'stack', topFirst: true });
  });

  it('ArrayDeque usado com offer e poll é fila', () => {
    const src = 'ArrayDeque<Integer> espera = new ArrayDeque<>();\nespera.offer(1);\nespera.poll();';
    assert.deepEqual(collectionRole(src, 'espera'), { role: 'queue', topFirst: false });
  });

  it('ArrayList comum continua lista', () => {
    assert.equal(collectionRole(sample('ListaDeCompras'), 'lista'), undefined);
  });
});

describe('applyCollectionRoles', () => {
  it('inverte a pilha que tem o topo no começo', () => {
    const snap = {
      line: 1,
      file: 'Parenteses.java',
      arrays: [{ name: 'abertos', values: ["'['", "'{'"], length: 2, kind: 'list' as const }],
      pointers: [],
    };
    applyCollectionRoles(snap, sample('Parenteses'), javaAdapter);
    assert.deepEqual(snap.arrays[0], { name: 'abertos', values: ["'{'", "'['"], length: 2, kind: 'stack' });
  });
});

describe('papel da coleção pela função parada', () => {
  const java = [
    'class A {',
    '  void empilha() {',
    '    ArrayDeque<Integer> itens = new ArrayDeque<>();',
    '    itens.push(1);',
    '  }',
    '  void enfileira() {',
    '    ArrayDeque<Integer> itens = new ArrayDeque<>();',
    '    itens.offer(1);',
    '  }',
    '}',
  ].join('\n');
  const list = (line: number): Snapshot => ({ line, file: 'A.java', arrays: [{ name: 'itens', values: ['1'], length: 1, kind: 'list' }], pointers: [] });
  const roleAt = (line: number, source: string, adapter = javaAdapter) => {
    const s = list(line);
    applyCollectionRoles(s, source, adapter);
    return s.arrays[0].kind;
  };

  it('duas funções, dois papéis', () => {
    assert.equal(roleAt(4, java), 'stack');
    assert.equal(roleAt(8, java), 'queue');
  });

  it('em Python, pela indentação', () => {
    const py = 'def a():\n    itens = []\n    itens.append(1)\n    itens.pop()\n\ndef b():\n    itens = []\n    itens.append(1)\n    itens.pop(0)\n';
    assert.equal(roleAt(3, py, pythonAdapter), 'stack');
    assert.equal(roleAt(8, py, pythonAdapter), 'queue');
  });

  it('sem uso na função, vale o arquivo inteiro', () => {
    const src = 'class A {\n  void main() {\n    int x = 1;\n  }\n  void outra() {\n    itens.offer(1);\n  }\n}';
    assert.equal(roleAt(3, src), 'queue');
  });
});

describe('função parada', () => {
  it('blocos de if e for não contam como função', () => {
    const src = 'void f() {\n  if (a) {\n    b();\n  }\n}\nvoid g() {\n}';
    assert.equal(enclosingFunction(src, 3, false), 'void f() {\n  if (a) {\n    b();\n  }\n}');
  });

  it('Go e fora de função', () => {
    assert.match(enclosingFunction('func main() {\n\tx := 1\n}', 2, false) ?? '', /x := 1/);
    assert.equal(enclosingFunction('const a = 1;\nconst b = 2;', 2, false), undefined);
  });
});
