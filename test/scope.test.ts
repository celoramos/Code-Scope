import * as assert from 'node:assert/strict';
import { makeFrame } from '../src/model/frame';
import { History } from '../src/model/history';
import { fieldShadows, scopeNotes } from '../src/model/scope';
import type { Snapshot } from '../src/model/snapshot';

const step = (total: number, outer?: number): Snapshot => ({
  file: 'escopo.js',
  line: 10,
  arrays: [],
  pointers: [{ name: 'total', value: total }],
  ...(outer === undefined ? {} : { shadowed: [{ name: 'total', value: String(outer) }] }),
});

describe('escopo e vida das variáveis', () => {
  it('a variável de dentro do bloco esconde a de fora, e depois some', () => {
    assert.deepEqual(scopeNotes(step(3), step(100, 3), 'pt'), [
      'Agora existem duas variáveis total: a deste bloco (100) esconde a de fora (3). Até o bloco terminar, total é a de dentro.',
    ]);
    assert.deepEqual(scopeNotes(step(101, 3), step(3), 'en'), [
      'The block ended and the inner total no longer exists: total is the outer one again (3).',
    ]);
  });

  it('o passo em que a de dentro nasce não diz que total "mudou de 3 para 100"', () => {
    const h = new History();
    h.push(step(3));
    h.push(step(100, 3));
    const frame = makeFrame(h.current()!);
    assert.ok(!frame.explanation.some((e) => e.startsWith('total mudou')), frame.explanation.join(' | '));
    assert.deepEqual(frame.shadows, { total: '3' });
  });

  it('parâmetro com o mesmo nome de um campo do objeto', () => {
    const s: Snapshot = {
      file: 'Escopo.java',
      line: 7,
      arrays: [],
      pointers: [{ name: 'pontos', value: 5 }],
      heap: [{ id: '@3', type: 'Placar', fields: [{ name: 'pontos', value: '0' }] }],
      refs: [{ name: 'this', ref: '@3' }],
    };
    assert.deepEqual(fieldShadows(s), [{ name: 'pontos', owner: 'this' }]);
    assert.deepEqual(scopeNotes(undefined, s, 'pt'), [
      'pontos é o parâmetro, não o campo do objeto: o campo é this.pontos. Os dois têm o mesmo nome, mas são variáveis diferentes.',
    ]);
  });
});
