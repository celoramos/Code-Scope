import * as assert from 'node:assert/strict';
import { mutationNotes } from '../src/model/mutation';
import type { ArrayVar, Snapshot } from '../src/model/snapshot';

const base = (file: string, extra: Partial<Snapshot> = {}): Snapshot => ({ file, line: 1, arrays: [], pointers: [], ...extra });
const list = (name: string, values: string[], id?: string): ArrayVar => ({ name, values, length: values.length, kind: 'list', ...(id ? { id } : {}) });

describe('mudar no lugar ou criar outro', () => {
  it('texto: s.toUpperCase() sozinho na linha não muda s', () => {
    const s = [{ name: 's', value: '"ana"' }];
    const notes = mutationNotes(base('A.java', { code: 's.toUpperCase();', scalars: s }), base('A.java', { scalars: s }), 'pt');
    assert.deepEqual(notes, [
      's.toUpperCase() criou um texto novo, mas ninguém guardou: s continua "ana". Um texto não muda depois de criado; para ficar com o novo, escreva s = s.toUpperCase();',
    ]);
  });

  it('texto: no Python a sugestão vem sem ponto e vírgula', () => {
    const s = [{ name: 'nome', value: "'ana'" }];
    const [note] = mutationNotes(base('a.py', { code: 'nome.upper()', scalars: s }), base('a.py', { scalars: s }), 'en');
    assert.match(note, /to keep the new one, write nome = nome\.upper\(\)$/);
  });

  it('texto novo guardado em outra variável', () => {
    const prev = base('a.js', { code: 'const t = s.trim();', scalars: [{ name: 's', value: '" oi "' }] });
    const next = base('a.js', { scalars: [{ name: 's', value: '" oi "' }, { name: 't', value: '"oi"' }] });
    assert.deepEqual(mutationNotes(prev, next, 'pt'), ['s.trim() criou um texto novo e guardou em t. s continua " oi ": um texto não muda depois de criado.']);
  });

  it('lista: sorted(x) sozinho não arruma x', () => {
    const x = [list('x', ['3', '1', '2'])];
    const [note] = mutationNotes(base('a.py', { code: 'sorted(x)', arrays: x }), base('a.py', { arrays: x }), 'pt');
    assert.equal(note, 'sorted(x) criou uma lista nova, mas ninguém guardou: x continua igual. Para ficar com ela, escreva x = sorted(x)');
  });

  it('lista: x.sort() muda a própria lista, e o outro nome dela também', () => {
    const prev = base('a.py', { code: 'x.sort()', arrays: [list('x', ['3', '1'], '1'), list('y', ['3', '1'], '1')] });
    const next = base('a.py', { arrays: [list('x', ['1', '3'], '1'), list('y', ['1', '3'], '1')] });
    assert.deepEqual(mutationNotes(prev, next, 'pt'), ['x.sort() mudou a própria x, sem criar outra lista. Por isso y, que é a mesma lista, também mudou.']);
  });

  it('lista: Arrays.sort(v) no Java', () => {
    const prev = base('A.java', { code: 'Arrays.sort(v);', arrays: [{ name: 'v', values: ['2', '1'], length: 2, id: '9' }] });
    const next = base('A.java', { arrays: [{ name: 'v', values: ['1', '2'], length: 2, id: '9' }] });
    assert.match(mutationNotes(prev, next, 'pt')[0], /^Arrays\.sort\(v\) mudou a própria v/);
  });

  it('lista: cópia com sorted, [:] e slice', () => {
    const x = list('x', ['3', '1']);
    for (const [file, code, rhs] of [
      ['a.py', 'y = sorted(x)', 'sorted(x)'],
      ['a.py', 'y = x[:]', 'x[:]'],
      ['a.js', 'const y = x.slice();', 'x.slice()'],
    ]) {
      const notes = mutationNotes(base(file, { code, arrays: [x] }), base(file, { arrays: [x, list('y', ['1', '3'])] }), 'pt');
      assert.deepEqual(notes, [`${rhs} criou uma lista nova para y: x continua como estava, e mudar uma não muda a outra.`], code);
    }
  });

  it('a mesma lista com outro nome não é cópia', () => {
    const x = list('x', ['1'], '5');
    assert.deepEqual(mutationNotes(base('a.js', { code: 'const y = x.sort();', arrays: [x] }), base('a.js', { arrays: [x, { ...x, name: 'y' }] }), 'pt'), []);
  });
});
