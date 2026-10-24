import * as assert from 'node:assert/strict';
import type { ConditionInfo } from '../src/model/condition';
import { samenessNotes } from '../src/model/sameness';
import type { HeapObject, Snapshot } from '../src/model/snapshot';

const cond = (text: string, value: boolean): ConditionInfo => ({ keyword: 'if', line: 1, text, parts: [{ text, value }], ops: [], result: value });
const ponto = (id: string): HeapObject => ({ id, type: 'Ponto', fields: [{ name: 'x', value: '1' }, { name: 'y', value: '2' }] });
const base = (file: string, condition: ConditionInfo, extra: Partial<Snapshot> = {}): Snapshot => ({ file, line: 1, arrays: [], pointers: [], condition, ...extra });
const textos = { scalars: [{ name: 'a', value: '"ana"' }, { name: 'b', value: '"ana"' }] };
const pontos = { heap: [ponto('1'), ponto('2')], refs: [{ name: 'p', ref: '1' }, { name: 'q', ref: '2' }], classes: { Ponto: { methods: ['Ponto'] } } };

describe('identidade e igualdade', () => {
  it('== entre textos iguais no Java que deu falso', () => {
    const notes = samenessNotes(base('A.java', cond('a == b', false), textos), 'pt');
    assert.deepEqual(notes, [
      'a == b deu falso mesmo com a e b iguais por dentro: esse operador pergunta se é o mesmo objeto, e são dois objetos diferentes. Para comparar o conteúdo, use a.equals(b).',
    ]);
  });

  it('== entre textos iguais no Java que deu verdadeiro: o texto escrito no código é um só', () => {
    assert.match(samenessNotes(base('A.java', cond('a == b', true), textos), 'pt')[0], /só porque a e b são o mesmo texto escrito direto no código/);
  });

  it('no JavaScript e no C#, == entre textos compara o conteúdo: nada a explicar', () => {
    assert.deepEqual(samenessNotes(base('a.js', cond('a === b', true), textos), 'pt'), []);
    assert.deepEqual(samenessNotes(base('A.cs', cond('a == b', true), textos), 'pt'), []);
  });

  it('!= entre dois objetos iguais: a frase usa o resultado de verdade', () => {
    const [note] = samenessNotes(base('A.java', cond('p != q', true), pontos), 'en');
    assert.match(note, /^p != q was true even though p and q are equal inside/);
    assert.match(note, /compare field by field/);
  });

  it('equals de uma classe que não escreveu equals', () => {
    const [note] = samenessNotes(base('A.java', cond('p.equals(q)', false), pontos), 'pt');
    assert.match(note, /a classe Ponto não escreveu equals/);
  });

  it('equals escrito pela classe que deu verdadeiro com dois objetos', () => {
    const extra = { ...pontos, classes: { Ponto: { methods: ['Ponto', 'equals'] } } };
    const [note] = samenessNotes(base('A.java', cond('p.equals(q)', true), extra), 'pt');
    assert.equal(note, 'p.equals(q) deu verdadeiro: o conteúdo é igual, mesmo sendo dois objetos diferentes na memória (p == q daria falso).');
  });

  it('equals de array no Java é o ==', () => {
    const arrays = [
      { name: 'a', values: ['1', '2'], length: 2, id: '7' },
      { name: 'b', values: ['1', '2'], length: 2, id: '8' },
    ];
    const [note] = samenessNotes(base('A.java', cond('a.equals(b)', false), { arrays }), 'pt');
    assert.match(note, /use Arrays\.equals\(a, b\)/);
  });

  it('Python: is entre listas iguais e == entre duas listas', () => {
    const arrays = [
      { name: 'a', values: ['1', '2'], length: 2, kind: 'list' as const, id: '0x1' },
      { name: 'b', values: ['1', '2'], length: 2, kind: 'list' as const, id: '0x2' },
    ];
    assert.match(samenessNotes(base('a.py', cond('a is b', false), { arrays }), 'pt')[0], /use a == b\.$/);
    assert.match(samenessNotes(base('a.py', cond('a == b', true), { arrays }), 'pt')[0], /\(a is b daria falso\)/);
  });

  it('mesmo objeto por duas variáveis', () => {
    const extra = { ...pontos, refs: [{ name: 'p', ref: '1' }, { name: 'r', ref: '1' }] };
    assert.deepEqual(samenessNotes(base('a.js', cond('r === p', true), extra), 'pt'), ['r === p: r e p apontam para o mesmo objeto, então é claro que são iguais.']);
  });

  it('conteúdo diferente ou parte não avaliada: sem frase', () => {
    const extra = { ...pontos, heap: [ponto('1'), { ...ponto('2'), fields: [{ name: 'x', value: '9' }, { name: 'y', value: '2' }] }] };
    assert.deepEqual(samenessNotes(base('A.java', cond('p == q', false), extra), 'pt'), []);
    const skipped: ConditionInfo = { ...cond('p == q', false), parts: [{ text: 'p == q' }] };
    assert.deepEqual(samenessNotes(base('A.java', skipped, pontos), 'pt'), []);
  });
});

describe('identidade e igualdade no Python', () => {
  it('== entre objetos de uma classe sem __eq__', () => {
    const extra = { ...pontos, classes: { Ponto: { methods: ['__init__'] } } };
    const [note] = samenessNotes(base('a.py', cond('p == q', false), extra), 'pt');
    assert.match(note, /a classe Ponto não escreveu __eq__, .* como o is\.$/);
  });
});
