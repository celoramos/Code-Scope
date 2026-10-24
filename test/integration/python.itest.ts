import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { callChanges } from '../../src/model/calls';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * Python: CODE_SCOPE_PYTHON aponta o interpretador (o CI usa o do setup-python).
 * Sem ele, procura um Python portátil em .vscode-test/python, que não exige
 * instalação: descompacte ali o "Windows embeddable package" do python.org e
 * renomeie o python3XX._pth (ele impede o Python de achar a pasta do script, e
 * o debugpy roda como script). Sem nenhum dos dois, os testes de Python são pulados.
 */
const python =
  process.env.CODE_SCOPE_PYTHON ?? path.resolve(__dirname, '..', '.vscode-test', 'python', 'python.exe');

function debugScript(name: string, breakpointLine: number, steps: number, step?: 'stepOver' | 'stepInto'): Promise<Snapshot[]> {
  const file = path.join(samplesRoot, 'python', `${name}.py`);
  return debugFile({
    file,
    breakpointLine,
    steps,
    step,
    // O debugpy usa um Python para o programa e outro para o próprio adaptador e o launcher.
    config: {
      type: 'debugpy',
      request: 'launch',
      name: `Python ${name}`,
      program: file,
      python,
      debugAdapterPython: python,
      debugLauncherPython: python,
      console: 'internalConsole',
    },
    dump: `py-${name}`,
  });
}

describe('Python (debugpy) real', function () {
  before(function () {
    if (!fs.existsSync(python)) {
      console.warn(`Python não encontrado em ${python}; testes de Python pulados.`);
      this.skip();
    }
  });

  it('bubble_sort.py: list, ponteiros e troca num passo só', async () => {
    const snaps = await debugScript('bubble_sort', 5, 12);
    const numeros = snaps[0].arrays.find((a) => a.name === 'numeros');
    assert.deepEqual(numeros?.values, ['5', '1', '4', '2', '8']);
    assert.equal(numeros?.kind, 'list');
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      `j nunca apareceu: ${JSON.stringify(snaps.map((s) => s.pointers))}`,
    );
    const swaps = allChanges(snaps).filter((c) => c.kind === 'swap');
    assert.ok(swaps.some((c) => c.kind === 'swap' && c.steps === 1), `nenhuma troca: ${JSON.stringify(allChanges(snaps))}`);
  });

  it('pilha.py: list com append e pop() vira pilha', async () => {
    const snaps = await debugScript('pilha', 3, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'voltar')?.kind, 'stack');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'stack' && c.value === "'artigo.html'"),
      `pop não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fila.py: deque com popleft vira fila', async () => {
    const snaps = await debugScript('fila', 6, 6);
    assert.equal(snaps.at(-1)?.arrays.find((a) => a.name === 'pedidos')?.kind, 'queue');
    assert.ok(
      allChanges(snaps).some((c) => c.kind === 'remove' && c.structure === 'queue' && c.index === 0 && c.value === "'pastel'"),
      `popleft não reconhecido: ${JSON.stringify(allChanges(snaps))}`,
    );
  });

  it('fora_do_limite.py: IndexError mostra a posição que não existe', async () => {
    const snaps = await debugScript('fora_do_limite', 6, 12);
    const stop = snaps.find((s) => s.exception);
    assert.ok(stop, `o programa não parou no erro: ${JSON.stringify(snaps.map((s) => s.line))}`);
    assert.equal(stop.exception?.type, 'IndexError');
    const frame = makeFrame({ snapshot: stop, index: 1, total: 1, past: [stop] });
    assert.deepEqual(frame.error?.missing, { array: 'notas', index: 3 });
  });

  it('fatorial.py: recursão empilha uma chamada por nível, cada uma com o próprio n', async () => {
    const snaps = await debugScript('fatorial', 10, 12, 'stepInto');
    const deepest = snaps.reduce((a, s) => ((s.calls?.length ?? 0) > (a.calls?.length ?? 0) ? s : a), snaps[0]);
    const fat = (deepest.calls ?? []).filter((c) => c.name === 'fatorial');
    assert.ok(fat.length >= 3, `pilha: ${JSON.stringify(deepest.calls)}`);
    // Cada chamada de baixo guarda o próprio n: 4, 3, 2...
    assert.deepEqual(
      fat.slice(0, -1).map((c) => c.vars.find((v) => v.name === 'n')?.value),
      ['4', '3', '2', '1'].slice(0, fat.length - 1),
    );
    const changes = snaps.flatMap((s, k) => callChanges(snaps[k - 1], s));
    assert.ok(changes.some((c) => c.kind === 'call' && c.recursive), 'nenhuma chamada recursiva reconhecida');
    assert.ok(changes.some((c) => c.kind === 'return' && c.value === '1'), `retornos: ${JSON.stringify(changes.filter((c) => c.kind === 'return'))}`);
  });
});
