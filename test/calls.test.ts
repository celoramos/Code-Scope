import * as assert from 'node:assert/strict';
import { callChanges, describeCall } from '../src/model/calls';
import { History } from '../src/model/history';
import { makeFrame } from '../src/model/frame';
import type { CallFrame, Snapshot } from '../src/model/snapshot';

const call = (name: string, line: number, n?: number): CallFrame => ({ name, line, vars: n === undefined ? [] : [{ name: 'n', value: String(n) }] });
const snap = (calls: CallFrame[], extra: Partial<Snapshot> = {}): Snapshot => ({
  file: 'Fatorial.java',
  line: calls.at(-1)?.line ?? 1,
  arrays: [],
  pointers: [],
  calls,
  ...extra,
});

describe('pilha de chamadas', () => {
  it('entrar numa função é uma chamada nova', () => {
    const changes = callChanges(snap([call('main', 12)]), snap([call('main', 12), call('fatorial', 3, 4)]));
    assert.deepEqual(changes, [{ kind: 'call', name: 'fatorial', depth: 1, recursive: false, copies: 1, vars: [{ name: 'n', value: '4' }] }]);
    assert.equal(describeCall(changes[0], 'pt'), 'O programa entrou na função fatorial, com n = 4. Quem chamou fica esperando ela terminar.');
  });

  it('a função chamando a si mesma é recursão, e conta as cópias', () => {
    const changes = callChanges(
      snap([call('main', 12), call('fatorial', 6, 4)]),
      snap([call('main', 12), call('fatorial', 6, 4), call('fatorial', 3, 3)]),
    );
    assert.equal(changes[0].kind === 'call' && changes[0].copies, 2);
    assert.match(describeCall(changes[0], 'pt'), /^fatorial chamou fatorial de novo \(recursão\), agora com n = 3\. Há 2 chamadas/);
  });

  it('terminar devolve para quem chamou, com o valor quando o debugger diz', () => {
    const changes = callChanges(
      snap([call('main', 12), call('fatorial', 6, 2), call('fatorial', 4, 1)]),
      snap([call('main', 12), call('fatorial', 6, 2)], { returned: { value: '1' } }),
    );
    assert.deepEqual(changes, [{ kind: 'return', name: 'fatorial', depth: 2, value: '1', to: 'fatorial' }]);
    assert.equal(describeCall(changes[0], 'en'), 'fatorial finished and returned 1. The call of fatorial continues where it stopped.');
  });

  it('js-debug: o valor aparece ainda dentro da função, um passo antes de ela sair', () => {
    const changes = callChanges(
      snap([call('main', 11), call('fatorial', 5, 2), call('fatorial', 3, 1)], { returned: { value: '1', pending: true } }),
      snap([call('main', 11), call('fatorial', 6, 2)], { returned: { value: '2', pending: true } }),
    );
    assert.deepEqual(changes, [{ kind: 'return', name: 'fatorial', depth: 2, value: '1', to: 'fatorial' }]);
  });

  it('debugpy: o valor vem em quem chamou, com o nome da função', () => {
    const changes = callChanges(
      snap([call('main', 10), call('fatorial', 4, 2), call('fatorial', 2, 1)], { returned: { function: 'fatorial', value: '2' } }),
      snap([call('main', 10), call('fatorial', 4, 2)], { returned: { function: 'fatorial', value: '1' } }),
    );
    assert.equal(changes[0].kind === 'return' && changes[0].value, '1');
  });

  it('mesma pilha não é mudança, mesmo com outras variáveis', () => {
    assert.deepEqual(callChanges(snap([call('main', 5)]), snap([call('main', 6)])), []);
  });

  it('o passo que troca de função não compara variáveis de funções diferentes', () => {
    const h = new History();
    h.push(snap([call('main', 12)], { pointers: [{ name: 'valor', value: 0 }] }));
    h.push(snap([call('main', 12), call('fatorial', 3, 4)], { pointers: [{ name: 'n', value: 4 }] }));
    const frame = makeFrame(h.current()!);
    assert.deepEqual(frame.changes, []);
    assert.deepEqual(frame.explanation, ['O programa entrou na função fatorial, com n = 4. Quem chamou fica esperando ela terminar.']);
  });
});
