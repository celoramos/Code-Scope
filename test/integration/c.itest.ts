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

function debugC(name: string, breakpointLine: number, steps: number, step: 'stepOver' | 'stepInto' = 'stepOver'): Promise<Snapshot[]> {
  return debugFile({
    file: path.join(dir, `${name}.c`),
    breakpointLine,
    steps,
    step,
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
    for (const f of ['bubble_sort', 'lista_ligada', 'ponteiros']) {
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

  it('ponteiros.c: array recebido por ponteiro, vetor de malloc, globais na função e struct na variável', async () => {
    const snaps = await debugC('ponteiros', 30, 120, 'stepInto');
    const dentro = snaps.filter((s) => s.line >= 14 && s.line <= 23);
    assert.ok(dentro.length > 0, `não entrou em ordena: ${snaps.map((s) => s.line).join(' ')}`);
    // O int v[] chega como int *: o tamanho vem do n ao lado, nos parâmetros.
    assert.deepEqual(dentro[0].arrays.find((a) => a.name === 'v')?.values, ['7', '3', '9', '1']);
    assert.deepEqual(dentro.at(-1)?.arrays.find((a) => a.name === 'v')?.values, ['1', '3', '7', '9']);
    // As globais que a função usa aparecem dentro dela.
    assert.ok(dentro.at(-1)?.arrays.some((a) => a.name === 'historico'), `arrays: ${JSON.stringify(dentro.at(-1)?.arrays.map((a) => a.name))}`);
    assert.ok(dentro.some((s) => s.pointers.some((p) => p.name === 'trocas' && p.value > 0)), 'trocas');
    assert.ok(allChanges(dentro).some((c) => c.kind === 'swap'), 'troca no v');
    // O vetor de malloc, no main: o tamanho vem do malloc(n * sizeof(int)).
    const depois = snaps.find((s) => s.line === 35);
    assert.deepEqual(depois?.arrays.find((a) => a.name === 'dados')?.values, ['7', '3', '9', '1']);
    // Struct guardado na variável vira objeto com os campos; char nome[10] é o texto.
    const aluno = snaps.find((s) => s.refs?.some((r) => r.name === 'a') && s.line >= 37);
    const campos = aluno?.heap?.find((o) => o.type === 'Aluno')?.fields.map((f) => `${f.name}=${f.value}`);
    assert.deepEqual(campos?.[0], 'nome="ana"', `campos: ${JSON.stringify(campos)}`);
  });

  it('lista_ligada.c: structs ligados por ponteiro viram lista ligada', async () => {
    const snaps = await debugC('lista_ligada', 18, 9);
    const full = snaps.find((s) => (s.heap?.length ?? 0) >= 3);
    assert.ok(full, `heap: ${JSON.stringify(snaps.at(-1)?.heap)}`);
    assert.deepEqual(heapView(full).lists[0]?.nodes.map((n) => n.value), ['10', '20', '30']);
  });
});
