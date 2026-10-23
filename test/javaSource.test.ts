import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { applyCollectionRoles, collectionRole } from '../src/debug/javaSource';

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
    applyCollectionRoles(snap, sample('Parenteses'));
    assert.deepEqual(snap.arrays[0], { name: 'abertos', values: ["'{'", "'['"], length: 2, kind: 'stack' });
  });
});
