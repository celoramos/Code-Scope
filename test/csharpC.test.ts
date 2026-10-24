import * as assert from 'node:assert/strict';
import { cAdapter } from '../src/debug/adapters/c';
import { csharpAdapter } from '../src/debug/adapters/csharp';
import type { DapVariable } from '../src/debug/dap';

const v = (name: string, value: string, type: string, variablesReference = 0, evaluateName?: string): DapVariable => ({
  name,
  value,
  type,
  variablesReference,
  ...(evaluateName ? { evaluateName } : {}),
});

describe('csharpAdapter (valores do vsdbg real)', () => {
  it('tira o tipo do nome e o "Raw View" traduzido', () => {
    const vars = csharpAdapter.normalize!([
      v('i [int]', '0', 'int'),
      v('[0] [string]', '"sol"', 'string'),
      v('Modo de Exibição Bruto', '', '', 9, 'pratos, raw'),
      v('Membros não públicos', '', '', 9, 'pratos, hidden'),
    ]);
    assert.deepEqual(vars.map((x) => x.name), ['i', '[0]']);
  });

  it('array, lista, pilha (topo em [0]), fila e dicionário', () => {
    assert.deepEqual(csharpAdapter.shape(v('palavras', '{string[5]}', 'string[]', 4)), { kind: 'sequence', length: 5, collection: 'array' });
    assert.deepEqual(csharpAdapter.shape(v('pratos', 'Count = 3', 'System.Collections.Generic.Stack<string>', 4)), {
      kind: 'sequence',
      length: 3,
      collection: 'list',
      role: { role: 'stack', topFirst: true },
    });
    assert.equal(csharpAdapter.shape(v('banco', 'Count = 2', 'System.Collections.Generic.Queue<string>', 4)).kind, 'sequence');
    assert.deepEqual(csharpAdapter.shape(v('vazia', 'Count = 0', 'System.Collections.Generic.List<int>', 4)), { kind: 'empty-list' });
    assert.deepEqual(csharpAdapter.shape(v('contagem', 'Count = 1', 'System.Collections.Generic.Dictionary<string, int>', 5)), { kind: 'map', length: 1 });
    assert.deepEqual(csharpAdapter.mapEntry!(v('[0]', '{[sol, 1]}', 'System.Collections.Generic.KeyValuePair<string, int>', 6)), { key: 'sol', value: '1' });
  });

  it('inteiro, char, texto, null e objeto', () => {
    assert.deepEqual(csharpAdapter.shape(v('i', '3', 'int')), { kind: 'integer', value: 3 });
    assert.deepEqual(csharpAdapter.shape(v('letra', "97 'a'", 'char')), { kind: 'scalar', value: "'a'" });
    assert.deepEqual(csharpAdapter.shape(v('nome', '"Ana"', 'string')), { kind: 'scalar', value: '"Ana"' });
    assert.deepEqual(csharpAdapter.shape(v('proximo', 'null', 'Exemplos.No')), { kind: 'null' });
    assert.deepEqual(csharpAdapter.shape(v('inicio', '{Exemplos.No}', 'Exemplos.No', 7)), { kind: 'object', type: 'No' });
  });
});

describe('cAdapter (valores do gdb real)', () => {
  it('array, inteiro e char', () => {
    assert.deepEqual(cAdapter.shape(v('numeros', '[5]', 'int [5]', 3)), { kind: 'sequence', length: 5, collection: 'array' });
    assert.deepEqual(cAdapter.shape(v('i', '0', 'int')), { kind: 'integer', value: 0 });
    assert.deepEqual(cAdapter.shape(v('c', "97 'a'", 'char')), { kind: 'scalar', value: "'a'" });
  });

  it('ponteiro para struct: o endereço é a identidade, e 0x0 é NULL', () => {
    assert.deepEqual(cAdapter.shape(v('inicio', '0x791340', 'struct No *', 6)), { kind: 'object', type: 'No', id: '0x791340' });
    assert.deepEqual(cAdapter.shape(v('proximo', '0x0', 'struct No *')), { kind: 'null' });
  });
});
