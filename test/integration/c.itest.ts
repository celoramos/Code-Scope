import * as assert from 'node:assert/strict';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { heapView } from '../../src/model/heap';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * C pela extensão C/C++ (cppdbg) com gdb. Precisa de gcc e gdb no PATH: o
 * runTest.ts acrescenta o w64devkit de .vscode-test quando existe. Sem eles,
 * os testes são pulados.
 */
const dir = path.join(samplesRoot, 'c');

/** Caminho completo do gdb: o cppdbg não procura no PATH sozinho. */
function gdbPath(): string | undefined {
  for (const d of (process.env.PATH ?? '').split(path.delimiter)) {
    for (const ext of ['.exe', '']) {
      const p = path.join(d, `gdb${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

function debugC(name: string, breakpointLine: number, steps: number): Promise<Snapshot[]> {
  return debugFile({
    file: path.join(dir, `${name}.c`),
    breakpointLine,
    steps,
    config: {
      type: 'cppdbg',
      request: 'launch',
      name: `C ${name}`,
      program: path.join(dir, 'build', `${name}.exe`),
      cwd: dir,
      MIMode: 'gdb',
      miDebuggerPath: gdbPath(),
      externalConsole: false,
    },
    dump: `c-${name}`,
  });
}

describe('C (gdb) real', function () {
  // No fim da suíte completa, o cppdbg às vezes não conecta no gdb ("Pipe hasn't been connected yet"); sozinho, nunca.
  this.retries(1);

  before(function () {
    const gdb = gdbPath();
    if (!gdb || !vscode.extensions.getExtension('ms-vscode.cpptools')) {
      console.warn('C: sem gdb ou sem a extensão C/C++; testes pulados.');
      this.skip();
    }
    fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
    for (const f of ['bubble_sort', 'lista_ligada']) {
      const r = cp.spawnSync('gcc', ['-g', '-O0', `${f}.c`, '-o', `build/${f}.exe`], { cwd: dir, shell: process.platform === 'win32', encoding: 'utf-8' });
      if (r.status !== 0) {
        console.warn(`C: gcc falhou: ${r.stderr}`);
        this.skip();
      }
    }
  });

  it('bubble_sort.c: array de int, ponteiros e troca com temp', async () => {
    const snaps = await debugC('bubble_sort', 7, 14);
    assert.deepEqual(snaps[0].arrays.find((a) => a.name === 'numeros')?.values, ['5', '1', '4', '2', '8']);
    assert.ok(allChanges(snaps).some((c) => c.kind === 'swap'), `trocas: ${JSON.stringify(allChanges(snaps))}`);
  });

  it('lista_ligada.c: structs ligados por ponteiro viram lista ligada', async () => {
    const snaps = await debugC('lista_ligada', 18, 9);
    const full = snaps.find((s) => (s.heap?.length ?? 0) >= 3);
    assert.ok(full, `heap: ${JSON.stringify(snaps.at(-1)?.heap)}`);
    assert.deepEqual(heapView(full).lists[0]?.nodes.map((n) => n.value), ['10', '20', '30']);
  });
});
