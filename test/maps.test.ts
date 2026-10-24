import * as assert from 'node:assert/strict';
import { splitEntry } from '../src/debug/adapters/adapter';
import { javaAdapter } from '../src/debug/adapters/java';
import { javascriptAdapter } from '../src/debug/adapters/javascript';
import { pythonAdapter } from '../src/debug/adapters/python';
import { diff } from '../src/model/diff';
import { explain } from '../src/model/explain';
import type { Snapshot } from '../src/model/snapshot';

const snap = (entries: [string, string][]): Snapshot => ({
  file: 'Dicionario.java',
  line: 1,
  arrays: [],
  pointers: [],
  maps: [{ name: 'contagem', entries: entries.map(([key, value]) => ({ key, value })), length: entries.length }],
});

describe('dicionários', () => {
  it('reconhece o dicionário de cada linguagem pelo formato real', () => {
    assert.deepEqual(javaAdapter.shape({ name: 'contagem', value: 'HashMap@26 size=1', type: 'HashMap', variablesReference: 5, indexedVariables: 1 }), {
      kind: 'map',
      length: 1,
      id: '@26',
    });
    assert.deepEqual(javascriptAdapter.shape({ name: 'contagem', value: '{sol: 1}', type: 'Object', variablesReference: 5 }), { kind: 'map' });
    assert.deepEqual(pythonAdapter.shape({ name: 'contagem', value: "{'sol': 1}", type: 'dict', variablesReference: 5 }), { kind: 'map' });
  });

  it('lê as entradas: Java pelo texto, Python e JavaScript pelo nome do filho', () => {
    assert.deepEqual(javaAdapter.mapEntry?.({ name: '0', value: 'HashMap$Node@44 "sol":"1"', variablesReference: 9 }), { key: '"sol"', value: '1' });
    assert.deepEqual(pythonAdapter.mapEntry?.({ name: "'sol'", value: '1', variablesReference: 0 }), { key: "'sol'", value: '1' });
    assert.equal(pythonAdapter.mapEntry?.({ name: 'len()', value: '1', variablesReference: 0 }), undefined);
    assert.deepEqual(javascriptAdapter.mapEntry?.({ name: '0', value: "{'sol' => 1}", variablesReference: 0 }), { key: "'sol'", value: '1' });
  });

  it('chave com ":" dentro das aspas não se parte', () => {
    assert.deepEqual(splitEntry('"a:b":"2"'), { key: '"a:b"', value: '2' });
  });

  it('chave nova, valor trocado e chave que saiu', () => {
    const changes = diff(snap([['"sol"', '1']]), snap([['"sol"', '2'], ['"mar"', '1']]));
    assert.deepEqual(explain(changes, false, [], 'pt'), [
      'contagem["sol"] mudou de 1 para 2: a chave já existia, só o valor foi trocado.',
      'A chave "mar" entrou em contagem, com o valor 1.',
    ]);
    assert.deepEqual(explain(diff(snap([['"sol"', '1']]), snap([])), false, [], 'en'), ['The key "sol" was removed from contagem.']);
  });

  it('JavaScript: chave sem aspas ganha aspas na frase', () => {
    const changes = diff(snap([]), snap([['sol', '1']]));
    assert.deepEqual(explain(changes, false, [], 'pt'), ["A chave 'sol' entrou em contagem, com o valor 1."]);
  });
});
