import * as assert from 'node:assert/strict';
import { javaAdapter, javascriptAdapter, pythonAdapter } from '../src/debug/adapters';
import { diff } from '../src/model/diff';
import { explain } from '../src/model/explain';
import { setNotes } from '../src/model/sets';
import type { ArrayVar, Snapshot } from '../src/model/snapshot';

// Valores reais dos debuggers (teste de descoberta com samples/*/conjunto e Conjunto.java).
const v = (name: string, value: string, type?: string, variablesReference = 0, indexedVariables?: number) => ({
  name,
  value,
  type,
  variablesReference,
  ...(indexedVariables !== undefined ? { indexedVariables } : {}),
});

describe('conjuntos: adaptadores', () => {
  it('Python: set vira conjunto; set() é o conjunto vazio; itens são os filhos que não são do debugpy', () => {
    assert.deepEqual(pythonAdapter.shape(v('vistos', '{1, 3}', 'set', 23)), { kind: 'sequence', collection: 'set' });
    assert.deepEqual(pythonAdapter.shape(v('vistos', 'set()', 'set', 23)), { kind: 'empty-list', collection: 'set' });
    const children = [v('special variables', ''), v('function variables', ''), v('140706722171320', '1', 'int'), v('len()', '2', 'int')];
    assert.deepEqual(children.filter((c) => pythonAdapter.setItem?.(c)).map((c) => c.value), ['1']);
  });

  it('JavaScript: Set(n) vira conjunto com n itens; Set(0) é vazio', () => {
    assert.deepEqual(javascriptAdapter.shape(v('vistos', 'Set(1) {size: 1, 3}', 'Set', 31646)), { kind: 'sequence', length: 1, collection: 'set' });
    assert.deepEqual(javascriptAdapter.shape(v('vistos', 'Set(0) {size: 0}', 'Set', 31646)), { kind: 'empty-list', collection: 'set' });
    const children = [v('0', '3', 'Object', 31660), v('size', '1', 'number'), v('[[Prototype]]', 'Set', 'Set', 31656)];
    assert.deepEqual(children.filter((c) => javascriptAdapter.setItem?.(c)).map((c) => c.value), ['3']);
  });

  it('Java: HashSet vira conjunto, com os itens numerados como numa lista', () => {
    assert.deepEqual(javaAdapter.shape(v('vistos', 'HashSet@13 size=2', 'HashSet', 42, 2)), { kind: 'sequence', length: 2, collection: 'set', id: '@13' });
    assert.deepEqual(javaAdapter.shape(v('vistos', 'HashSet@13 size=0', 'HashSet', 0, 0)), { kind: 'empty-list', collection: 'set' });
    // ArrayList continua lista.
    assert.equal((javaAdapter.shape(v('lista', 'ArrayList@11 size=4', 'ArrayList', 7, 4)) as { collection?: string }).collection, 'list');
  });
});

const set = (values: string[]): ArrayVar => ({ name: 'vistos', values, length: values.length, kind: 'set' });
const snap = (arrays: ArrayVar[], code?: string, extra: Partial<Snapshot> = {}): Snapshot => ({
  line: 1,
  file: 'conjunto.py',
  arrays,
  pointers: [],
  ...(code ? { code } : {}),
  ...extra,
});

describe('conjuntos: o que mudou', () => {
  it('item novo entra, item que sai sai, sem posição', () => {
    assert.deepEqual(diff(snap([set(['3'])]), snap([set(['1', '3'])])), [{ kind: 'set-add', array: 'vistos', value: '1' }]);
    assert.deepEqual(diff(snap([set(['1', '3'])]), snap([set(['3'])])), [{ kind: 'set-remove', array: 'vistos', value: '1' }]);
  });

  it('a ordem mudar (hash) não é mudança', () => {
    assert.deepEqual(diff(snap([set(['3', '1'])]), snap([set(['1', '3'])])), []);
  });

  it('as frases falam de conjunto, em português e em inglês', () => {
    assert.deepEqual(explain([{ kind: 'set-add', array: 'vistos', value: '2' }]), ['2 entrou no conjunto vistos.']);
    assert.deepEqual(explain([{ kind: 'set-remove', array: 'vistos', value: '2' }], false, [], 'en'), ['2 left the set vistos.']);
    assert.deepEqual(explain([{ kind: 'array-added', array: 'vistos', length: 0, structure: 'set' }]), ['O conjunto vistos foi criado vazio.']);
    assert.deepEqual(explain([{ kind: 'array-added', array: 'vistos', length: 0, structure: 'set' }], true), [
      'Primeiro passo: vistos é um conjunto vazio.',
    ]);
  });
});

describe('conjuntos: add de um valor que já estava', () => {
  it('diz que nada mudou porque o conjunto não guarda repetidos', () => {
    const prev = snap([set(['1', '3'])], 'vistos.add(numero)', { pointers: [{ name: 'numero', value: 3 }] });
    assert.deepEqual(setNotes(prev, snap([set(['1', '3'])]), 'pt'), ['3 já estava em vistos, então nada mudou: um conjunto não guarda repetidos.']);
    assert.deepEqual(setNotes(prev, snap([set(['3', '1'])]), 'en'), ['3 was already in vistos, so nothing changed: a set keeps no duplicates.']);
  });

  it('não fala nada quando o add trouxe um valor novo', () => {
    const prev = snap([set(['1', '3'])], 'vistos.add(numero);', { pointers: [{ name: 'numero', value: 2 }] });
    assert.deepEqual(setNotes(prev, snap([set(['1', '3', '2'])]), 'pt'), []);
  });
});
