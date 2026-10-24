import * as assert from 'node:assert/strict';
import { History } from '../src/model/history';
import { makeFrame } from '../src/model/frame';
import type { Snapshot } from '../src/model/snapshot';
import { traceTable } from '../src/model/trace';

const snap = (line: number, pointers: [string, number][], scalars: [string, string][] = [], arrays: Snapshot['arrays'] = []): Snapshot => ({
  file: 'A.java',
  line,
  arrays,
  pointers: pointers.map(([name, value]) => ({ name, value })),
  scalars: scalars.map(([name, value]) => ({ name, value })),
});

describe('teste de mesa', () => {
  it('uma coluna por variável, na ordem em que apareceram', () => {
    const t = traceTable([snap(5, [['i', 0]]), snap(6, [['i', 0], ['soma', 0]]), snap(7, [['i', 1], ['soma', 3]], [['ok', 'true']])]);
    assert.deepEqual(t.columns, ['i', 'soma', 'ok']);
    assert.deepEqual(
      t.rows.map((r) => r.values),
      [
        ['0', undefined, undefined],
        ['0', '0', undefined],
        ['1', '3', 'true'],
      ],
    );
  });

  it('marca só o que mudou desde a linha anterior', () => {
    const t = traceTable([snap(5, [['i', 0], ['j', 4]]), snap(6, [['i', 1], ['j', 4]])]);
    assert.deepEqual(t.rows[0].changed, [false, false]);
    assert.deepEqual(t.rows[1].changed, [true, false]);
  });

  it('variável que saiu de escopo deixa a célula vazia, sem marcar mudança', () => {
    const t = traceTable([snap(5, [['i', 2]]), snap(9, [])]);
    assert.deepEqual(t.rows[1].values, [undefined]);
    assert.deepEqual(t.rows[1].changed, [false]);
  });

  it('arrays pequenos entram como texto; matrizes ficam de fora', () => {
    const t = traceTable([
      snap(3, [], [], [
        { name: 'v', values: ['5', '1'], length: 2 },
        { name: 'g', values: ['int[2]'], length: 1, rows: [{ name: 'g[0]', values: ['1', '2'], length: 2 }] },
        { name: 'grande', values: Array(9).fill('0'), length: 9 },
      ]),
    ]);
    assert.deepEqual(t.columns, ['v', 'grande']);
    assert.deepEqual(t.rows[0].values, ['[5, 1]', '[9]']);
  });

  it('guarda só as linhas mais recentes e conta as escondidas', () => {
    const many = Array.from({ length: 5 }, (_, k) => snap(k + 1, [['i', k]]));
    const t = traceTable(many, 1, 3);
    assert.equal(t.hidden, 2);
    assert.deepEqual(t.rows.map((r) => r.step), [3, 4, 5]);
  });

  it('o frame traz a tabela até o passo que o aluno está vendo', () => {
    const h = new History();
    h.push(snap(5, [['i', 0]]));
    h.push(snap(6, [['i', 1]]));
    h.push(snap(7, [['i', 2]]));
    h.back();
    const frame = makeFrame(h.current()!);
    assert.deepEqual(frame.trace.rows.map((r) => r.step), [1, 2]);
  });
});
