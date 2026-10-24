import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dropVariables, notYetDeclared } from '../src/model/declared';
import type { Snapshot } from '../src/model/snapshot';

const sample = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'samples', 'c', name), 'utf8');

describe('variáveis de C que ainda não foram declaradas', () => {
  it('lista_ligada.c: parado na linha 18, inicio, atual e soma ainda são lixo', () => {
    assert.deepEqual([...notYetDeclared(sample('lista_ligada.c'), 18, ['inicio', 'atual', 'soma'])].sort(), ['atual', 'inicio', 'soma']);
    assert.deepEqual([...notYetDeclared(sample('lista_ligada.c'), 22, ['inicio', 'atual', 'soma'])].sort(), ['atual', 'soma']);
    assert.deepEqual([...notYetDeclared(sample('lista_ligada.c'), 25, ['inicio', 'atual', 'soma'])], []);
  });

  it('bubble_sort.c: a variável do for existe quando o laço volta para a própria linha', () => {
    const src = sample('bubble_sort.c');
    assert.deepEqual([...notYetDeclared(src, 8, ['numeros', 'n', 'i', 'j', 'temp'])], ['temp']);
    assert.deepEqual([...notYetDeclared(src, 7, ['numeros', 'n', 'i', 'j', 'temp'])].sort(), ['j', 'temp']);
    assert.deepEqual([...notYetDeclared(src, 11, ['numeros', 'n', 'i', 'j', 'temp'])], []);
  });

  it('"return soma;" não é declaração', () => {
    const src = 'int f(void) {\n    int soma = 0;\n    return soma;\n}\n';
    assert.deepEqual([...notYetDeclared(src, 3, ['soma'])], []);
  });

  it('tira o ponteiro com lixo e o nó falso que só ele alcançava', () => {
    const s: Snapshot = {
      file: 'l.c',
      line: 20,
      arrays: [],
      pointers: [],
      refs: [{ name: 'inicio', ref: '0x10' }, { name: 'atual', ref: '0x90' }],
      heap: [
        { id: '0x10', type: 'No', fields: [{ name: 'valor', value: '10' }, { name: 'proximo', value: '0x20', ref: '0x20' }] },
        { id: '0x20', type: 'No', fields: [{ name: 'valor', value: '20' }, { name: 'proximo', value: '0x0', ref: null }] },
        { id: '0x90', type: 'No', fields: [{ name: 'valor', value: '-1' }, { name: 'proximo', value: '0x10', ref: '0x10' }] },
      ],
    };
    dropVariables(s, new Set(['atual']));
    assert.deepEqual(s.refs, [{ name: 'inicio', ref: '0x10' }]);
    assert.deepEqual(s.heap?.map((o) => o.id), ['0x10', '0x20']);
  });
});
