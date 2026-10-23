import * as assert from 'node:assert/strict';
import { makeFrame } from '../src/model/frame';
import { History } from '../src/model/history';
import type { Snapshot } from '../src/model/snapshot';

const snap = (values: number[], i: number): Snapshot => ({
  line: 8,
  file: 'BubbleSort.java',
  arrays: [{ name: 'arr', values: values.map(String), length: values.length }],
  pointers: [
    { name: 'i', value: i },
    { name: 'temp', value: 5 },
  ],
});

describe('makeFrame', () => {
  it('junta diff, setas, texto e posição no histórico', () => {
    const h = new History();
    h.push(snap([5, 1], 0));
    h.push(snap([1, 5], 1));
    const frame = makeFrame(h.current()!);
    assert.equal(frame.step, 2);
    assert.equal(frame.total, 2);
    assert.deepEqual(frame.arrows, { arr: [{ name: 'i', index: 1 }] });
    assert.deepEqual(frame.explanation, ['arr[0] e arr[1] trocaram de lugar.', 'i avançou de 0 para 1.']);
  });

  it('aponta a linha que executou e respeita as opções', () => {
    const h = new History();
    h.push({ ...snap([5, 1], 0), line: 9, code: 'int temp = arr[j];' });
    h.push({ ...snap([5, 1], 0), line: 10 });
    const frame = makeFrame(h.current()!, { valueNames: new Set(['i']), beginnerMode: false });
    assert.deepEqual(frame.executed, { line: 9, code: 'int temp = arr[j];' });
    assert.deepEqual(frame.arrows, { arr: [] });
    assert.deepEqual(frame.explanation, []);
  });

  it('o primeiro passo usa o texto de abertura', () => {
    const h = new History();
    h.push(snap([5, 1], 0));
    assert.deepEqual(makeFrame(h.current()!).explanation, ['Primeiro passo: arr tem 2 posições.']);
  });
});
