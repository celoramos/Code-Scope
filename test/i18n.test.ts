import * as assert from 'node:assert/strict';
import { explain } from '../src/model/explain';
import { explainFlow } from '../src/model/flow';
import { peekNote } from '../src/model/frame';
import { PANEL_STRINGS, readError } from '../src/webview/strings';

describe('inglês', () => {
  it('primeiro passo e mudanças em arrays', () => {
    assert.deepEqual(explain([{ kind: 'array-added', array: 'arr', length: 1, structure: 'array' }], true, [], 'en'), [
      'First step: arr has 1 position.',
    ]);
    assert.deepEqual(explain([{ kind: 'swap', array: 'arr', a: 1, b: 2, steps: 1 }], false, [], 'en'), [
      'arr[1] and arr[2] swapped places.',
    ]);
    assert.deepEqual(explain([], false, [], 'en'), ['Nothing changed in this step.']);
  });

  it('pilha, fila e matriz', () => {
    assert.deepEqual(
      explain(
        [
          { kind: 'array-added', array: 'pratos', length: 0, structure: 'stack' },
          { kind: 'array-added', array: 'grade', length: 2, cols: 3, structure: 'matrix' },
          { kind: 'remove', array: 'fila', index: 0, value: "'Ana'", shifted: true, structure: 'queue' },
        ],
        false,
        [],
        'en',
      ),
      [
        'The stack pratos was created empty.',
        'The matrix grade was created with 2 rows and 3 columns.',
        "'Ana' left the front of the queue fila. In a queue, whoever arrived first always leaves first.",
      ],
    );
  });

  it('ponteiros', () => {
    assert.deepEqual(
      explain(
        [
          { kind: 'pointer', name: 'i', from: 2, to: 3 },
          { kind: 'pointer', name: 'j', from: 4, to: 0 },
        ],
        false,
        [],
        'en',
      ),
      ['i moved forward from 2 to 3.', 'j went back to 0 (the loop started over).'],
    );
  });

  it('caminho do programa', () => {
    assert.equal(
      explainFlow({ line: 8, code: 'if (a > b) {' }, { line: 12 }, 'en'),
      'The condition on line 8 was false: the program skipped the if block.',
    );
    assert.equal(
      explainFlow({ line: 9, code: 'j++;' }, { line: 5, code: 'for (int j = 0; j < n; j++) {' }, 'en'),
      'End of one loop iteration: the program went back to line 5.',
    );
  });

  it('peek', () => {
    const snapshot = {
      file: 'Pilha.java',
      line: 7,
      arrays: [{ name: 'pratos', values: ['1', '2'], length: 2, kind: 'stack' as const }],
      pointers: [],
    };
    assert.equal(peekNote('pratos.peek();', snapshot, [], 'en'), 'peek() only looked at the top of pratos: 2 is still there.');
  });

  it('erro de leitura', () => {
    assert.equal(readError('en', 'timeout'), 'Could not read the variables for this step: timeout');
  });
});

describe('textos do painel', () => {
  it('português e inglês têm as mesmas chaves', () => {
    assert.deepEqual(Object.keys(PANEL_STRINGS.en.script).sort(), Object.keys(PANEL_STRINGS.pt.script).sort());
    assert.deepEqual(Object.keys(PANEL_STRINGS.en.html).sort(), Object.keys(PANEL_STRINGS.pt.html).sort());
  });

  it('os modelos usam os mesmos {0}, {1}... nos dois idiomas', () => {
    const slots = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
    for (const [key, text] of Object.entries(PANEL_STRINGS.pt.script)) {
      assert.equal(slots(PANEL_STRINGS.en.script[key as keyof typeof PANEL_STRINGS.en.script]), slots(text), key);
    }
  });
});
