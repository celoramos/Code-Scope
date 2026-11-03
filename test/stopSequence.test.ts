import * as assert from 'node:assert/strict';
import { StopSequence } from '../src/core/stopSequence';

describe('StopSequence: paradas que chegam durante a leitura', () => {
  it('leitura que termina antes da próxima parada não perde nada', () => {
    const s = new StopSequence();
    const a = s.start();
    assert.ok(s.isCurrent(a));
    s.finish(a);
    const b = s.start();
    assert.ok(s.isCurrent(b));
    assert.equal(s.takeLost(), 0);
  });

  it('F10 durante a leitura descarta a anterior e conta o passo perdido', () => {
    const s = new StopSequence();
    const a = s.start();
    const b = s.start();
    const c = s.start();
    assert.equal(s.isCurrent(a), false);
    assert.equal(s.isCurrent(b), false);
    s.finish(a);
    s.finish(b);
    assert.ok(s.isCurrent(c));
    assert.equal(s.takeLost(), 2);
    assert.equal(s.takeLost(), 0);
  });

  it('a leitura velha que termina depois não apaga a atual', () => {
    const s = new StopSequence();
    const a = s.start();
    const b = s.start();
    s.finish(a);
    // b ainda lê: uma parada agora descarta b.
    s.start();
    assert.equal(s.takeLost(), 2);
    assert.equal(s.isCurrent(b), false);
  });

  it('reset zera a conta e invalida a leitura em andamento', () => {
    const s = new StopSequence();
    const a = s.start();
    s.start();
    s.reset();
    assert.equal(s.isCurrent(a), false);
    assert.equal(s.takeLost(), 0);
    s.finish(a);
    s.start();
    assert.equal(s.takeLost(), 0);
  });
});
