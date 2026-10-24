import * as assert from 'node:assert/strict';
import { buildCallTree } from '../src/model/callTree';
import type { CallFrame, Snapshot } from '../src/model/snapshot';

const fib = (n: number, line = 3): CallFrame => ({ name: 'fib', line, vars: [{ name: 'n', value: String(n) }] });
const main: CallFrame = { name: 'main', line: 11, vars: [] };
const step = (calls: CallFrame[], returned?: string): Snapshot => ({
  file: 'Fibonacci.java',
  line: 1,
  arrays: [],
  pointers: [],
  calls,
  ...(returned === undefined ? {} : { returned: { function: 'fib', value: returned } }),
});

describe('árvore de recursão', () => {
  it('fib(3): cada chamada pendurada em quem chamou, com o valor devolvido', () => {
    const past = [
      step([main]),
      step([main, fib(3, 6)]),
      step([main, fib(3, 6), fib(2, 6)]),
      step([main, fib(3, 6), fib(2, 6), fib(1)]),
      step([main, fib(3, 6), fib(2, 6)], '1'),
      step([main, fib(3, 6), fib(2, 6), fib(0)]),
      step([main, fib(3, 6), fib(2, 6)], '0'),
      step([main, fib(3, 6)], '1'),
      step([main, fib(3, 6), fib(1)]),
    ];
    const tree = buildCallTree(past);
    assert.ok(tree, 'a recursão se divide e deveria virar árvore');
    const f3 = tree.root.children[0];
    assert.equal(f3.label, 'fib(3)');
    assert.deepEqual(
      f3.children.map((c) => [c.label, c.returned, c.done]),
      [
        ['fib(2)', '1', true],
        ['fib(1)', undefined, false],
      ],
    );
    assert.deepEqual(
      f3.children[0].children.map((c) => [c.label, c.returned]),
      [
        ['fib(1)', '1'],
        ['fib(0)', '0'],
      ],
    );
    assert.equal(tree.calls, 5);
    assert.deepEqual(tree.repeated, { 'fib(1)': 2 });
  });

  it('recursão em linha (fatorial) não vira árvore: a pilha já basta', () => {
    const fat = (n: number): CallFrame => ({ name: 'fatorial', line: 3, vars: [{ name: 'n', value: String(n) }] });
    assert.equal(buildCallTree([step([main]), step([main, fat(3)]), step([main, fat(3), fat(2)])]), undefined);
  });
});
