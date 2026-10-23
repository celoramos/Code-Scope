import * as assert from 'node:assert/strict';
import { History, MAX_STEPS } from '../src/model/history';
import type { Snapshot } from '../src/model/snapshot';

const snap = (line: number): Snapshot => ({ line, file: 'X.java', arrays: [], pointers: [] });

describe('History', () => {
  it('começa vazio', () => {
    assert.equal(new History().current(), undefined);
  });

  it('navega para trás e para frente sem passar das pontas', () => {
    const h = new History();
    [1, 2, 3].forEach((l) => h.push(snap(l)));
    assert.equal(h.current()?.index, 3);
    assert.equal(h.forward(), false);
    assert.equal(h.back(), true);
    assert.equal(h.back(), true);
    assert.equal(h.back(), false);
    const step = h.current();
    assert.equal(step?.snapshot.line, 1);
    assert.equal(step?.prev, undefined);
    assert.equal(step?.total, 3);
  });

  it('entrega os dois passos anteriores para o diff', () => {
    const h = new History();
    [1, 2, 3].forEach((l) => h.push(snap(l)));
    const step = h.current();
    assert.equal(step?.prev?.line, 2);
    assert.equal(step?.older?.line, 1);
  });

  it('um passo novo volta o cursor para o fim', () => {
    const h = new History();
    [1, 2, 3].forEach((l) => h.push(snap(l)));
    h.back();
    h.back();
    h.push(snap(4));
    assert.equal(h.current()?.index, 4);
    assert.equal(h.current()?.snapshot.line, 4);
  });

  it('descarta os passos mais antigos acima do limite', () => {
    const h = new History();
    for (let l = 1; l <= MAX_STEPS + 5; l++) h.push(snap(l));
    assert.equal(h.current()?.total, MAX_STEPS);
    while (h.back());
    assert.equal(h.current()?.snapshot.line, 6);
  });

  it('goto pula para qualquer passo e para nas pontas', () => {
    const h = new History();
    [1, 2, 3, 4].forEach((l) => h.push(snap(l)));
    assert.equal(h.goto(2), true);
    assert.equal(h.current()?.snapshot.line, 2);
    assert.equal(h.goto(2), false);
    h.goto(99);
    assert.equal(h.current()?.index, 4);
    h.goto(-3);
    assert.equal(h.current()?.index, 1);
    assert.equal(new History().goto(1), false);
  });

  it('clear zera tudo', () => {
    const h = new History();
    h.push(snap(1));
    h.clear();
    assert.equal(h.current(), undefined);
  });
});
