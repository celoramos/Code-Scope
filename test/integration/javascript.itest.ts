import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/** Debuga samples/javascript/<nome>.js com o debugger de Node que vem no VS Code. */
function debugScript(name: string, breakpointLine: number, steps: number): Promise<Snapshot[]> {
  const file = path.join(samplesRoot, 'javascript', `${name}.js`);
  return debugFile({
    file,
    breakpointLine,
    steps,
    config: { type: 'node', request: 'launch', name: `JS ${name}`, program: file, skipFiles: ['<node_internals>/**'] },
    dump: `js-${name}`,
  });
}

describe('JavaScript (js-debug) real', () => {
  it('bubbleSort.js: array, ponteiros em let e troca com temp', async () => {
    const snaps = await debugScript('bubbleSort', 4, 14);
    const numeros = snaps[0].arrays.find((a) => a.name === 'numeros');
    assert.deepEqual(numeros?.values, ['5', '1', '4', '2', '8']);
    assert.equal(numeros?.kind, 'list');
    const names = snaps.flatMap((s) => (s.scalars ?? []).map((v) => v.name));
    assert.ok(!names.includes('__dirname'), 'variáveis do módulo do Node apareceram no painel');
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      `j nunca apareceu: ${JSON.stringify(snaps.map((s) => s.pointers))}`,
    );
    const kinds = allChanges(snaps).map((c) => c.kind);
    assert.ok(kinds.includes('swap'), `nenhuma troca reconhecida: ${kinds.join(', ')}`);
  });

  it('pilha.js: array com push e pop vira pilha', async () => {
    const snaps = await debugScript('pilha', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'historico')?.kind, 'stack');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'stack' && c.value === "'apagou B'"),
      `pop não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fila.js: array com push e shift vira fila', async () => {
    const snaps = await debugScript('fila', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'documentos')?.kind, 'queue');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'queue' && c.index === 0),
      `shift não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('foraDoLimite.js: undefined de uma posição que não existe para o programa e é explicado', async () => {
    const snaps = await debugScript('foraDoLimite', 6, 12);
    const stop = snaps.find((s) => s.exception);
    assert.ok(stop, `o programa não parou no erro: ${JSON.stringify(snaps.map((s) => s.line))}`);
    assert.equal(stop.exception?.type, 'TypeError');
    const frame = makeFrame({ snapshot: stop, index: 1, total: 1, past: [stop] });
    assert.deepEqual(frame.error?.missing, { array: 'alunos', index: 2 });
  });
});
