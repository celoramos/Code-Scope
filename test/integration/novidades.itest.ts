import * as assert from 'node:assert/strict';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { checkExercise } from '../../src/model/annotations';
import { heapView } from '../../src/model/heap';
import type { Snapshot } from '../../src/model/snapshot';
import { api, debugFile, samplesRoot } from './helpers';

/*
 * Exercícios, novas estruturas, Go e C++ nos debuggers reais. Go precisa da
 * extensão golang.go, de go e de dlv no PATH (o runTest.ts acrescenta os de
 * .vscode-test); C++ precisa de g++ e gdb. Sem eles, os testes são pulados.
 */
const python = process.env.CODE_SCOPE_PYTHON ?? path.resolve(__dirname, '..', '.vscode-test', 'python', 'python.exe');

function findTool(name: string): string | undefined {
  for (const d of (process.env.PATH ?? '').split(path.delimiter)) {
    for (const ext of ['.exe', '']) {
      const p = path.join(d, `${name}${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const arrayOf = (s: Snapshot | undefined, name: string) => s?.arrays.find((a) => a.name === name);

describe('Novidades JavaScript real', () => {
  it('exercicio.js: o exercício vem do comentário, e a nota aparece na linha do laço', async () => {
    const file = path.join(samplesRoot, 'javascript', 'exercicio.js');
    const snaps = await debugFile({
      file,
      breakpointLine: 5,
      steps: 16,
      config: { type: 'node', request: 'launch', name: 'JS exercicio', program: file, skipFiles: ['<node_internals>/**'] },
      dump: 'js-exercicio',
    });
    assert.match(snaps[0].exercise?.goal ?? '', /erro/);
    assert.ok(snaps.some((s) => s.notes?.some((n) => /última posição/.test(n))), 'a nota não apareceu');
    // O exemplo tem o erro: a soma para em 10 e o objetivo não é alcançado.
    const view = checkExercise(snaps[0].exercise, snaps);
    assert.equal(view?.doneAt, undefined);
    assert.equal(view?.checks[0].actual, '10');
  });
});

describe('Novidades Python real', () => {
  before(function () {
    if (!fs.existsSync(python)) this.skip();
  });

  it('fila_de_prioridade.py: heapq e deque pelas duas pontas', async () => {
    const file = path.join(samplesRoot, 'python', 'fila_de_prioridade.py');
    const snaps = await debugFile({
      file,
      breakpointLine: 7,
      steps: 13,
      config: { type: 'debugpy', request: 'launch', name: 'Python heap', program: file, python, debugAdapterPython: python, debugLauncherPython: python, console: 'internalConsole' },
      dump: 'py-fila-de-prioridade',
    });
    const heap = snaps.flatMap((s) => (arrayOf(s, 'senhas')?.kind === 'heap' ? [arrayOf(s, 'senhas')] : []));
    assert.ok(heap.length > 0, `senhas: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
    assert.equal(heap.find((a) => a?.length === 4)?.values[0], '10');
    assert.ok(snaps.some((s) => arrayOf(s, 'vagoes')?.kind === 'deque'), `vagoes: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
  });
});

describe('Novidades Java real', () => {
  const before = async () => {
    const java = vscode.extensions.getExtension('redhat.java');
    const javaApi = (await java?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
    await javaApi?.serverReady?.();
  };

  it('FilaDePrioridade: PriorityQueue é heap, e ArrayDeque usado pelas pontas é deque', async () => {
    const snaps = await debugFile({ file: path.join(samplesRoot, 'java', 'FilaDePrioridade.java'), breakpointLine: 7, steps: 13, config: 'FilaDePrioridade', dump: 'FilaDePrioridade', before });
    const heap = snaps.flatMap((s) => (arrayOf(s, 'senhas')?.kind === 'heap' ? [arrayOf(s, 'senhas')] : []));
    assert.equal(heap.find((a) => a?.length === 4)?.values[0], '10');
    assert.ok(snaps.some((s) => arrayOf(s, 'vagoes')?.kind === 'deque'), `vagoes: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
  });

  it('exemplo sem breakpoint nenhum para sozinho no main e desenha', async () => {
    const cs = await api();
    await vscode.window.showTextDocument(vscode.Uri.file(path.join(samplesRoot, 'java', 'BubbleSort.java')));
    await before();
    vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
    assert.ok(await vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], 'BubbleSort'));
    const start = Date.now();
    while (cs.snapshots().length === 0 && Date.now() - start < 120_000) await new Promise((r) => setTimeout(r, 200));
    assert.ok(cs.snapshots().length >= 1, 'o exemplo terminou sem parar');
    await vscode.debug.stopDebugging();
  });

  it('Cubo: cada camada vira uma matriz', async () => {
    const snaps = await debugFile({ file: path.join(samplesRoot, 'java', 'Cubo.java'), breakpointLine: 4, steps: 3, config: 'Cubo', dump: 'Cubo', before });
    const last = snaps.at(-1);
    assert.deepEqual(last?.arrays.map((a) => a.name), ['cubo[0]', 'cubo[1]']);
    assert.equal(last?.arrays[0].rows?.length, 2);
  });
});

describe('Novidades C++ real', function () {
  this.retries(1);
  const dir = path.join(samplesRoot, 'c');

  before(function () {
    if (!findTool('gdb') || !findTool('g++') || !vscode.extensions.getExtension('ms-vscode.cpptools')) this.skip();
    fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
    const r = cp.spawnSync('g++', ['-g', '-O0', 'vetor.cpp', '-o', 'build/vetor.exe'], { cwd: dir, shell: process.platform === 'win32', encoding: 'utf-8' });
    if (r.status !== 0) throw new Error(`g++ falhou: ${r.stderr}`);
  });

  it('vetor.cpp: std::vector mostra os itens', async () => {
    const snaps = await debugFile({
      file: path.join(dir, 'vetor.cpp'),
      breakpointLine: 9,
      steps: 7,
      config: {
        type: 'cppdbg',
        request: 'launch',
        name: 'C++ vetor',
        program: path.join(dir, 'build', 'vetor.exe'),
        cwd: dir,
        MIMode: 'gdb',
        miDebuggerPath: findTool('gdb'),
        externalConsole: false,
        setupCommands: [{ text: '-enable-pretty-printing', ignoreFailures: true }],
      },
      dump: 'cpp-vetor',
    });
    assert.deepEqual(arrayOf(snaps.at(-1), 'notas')?.values, ['7', '9', '6'], `arrays: ${JSON.stringify(snaps.at(-1)?.arrays)}`);
  });
});

describe('Novidades Go real', () => {
  before(function () {
    if (!findTool('dlv') || !vscode.extensions.getExtension('golang.go')) this.skip();
  });

  it('main.go: arrays, pilha, mapa, lista ligada e condição', async () => {
    const file = path.join(samplesRoot, 'go', 'main.go');
    const snaps = await debugFile({
      file,
      breakpointLine: 25,
      steps: 54,
      config: { type: 'go', request: 'launch', name: 'Go main', mode: 'debug', program: file },
      dump: 'go-main',
    });
    const end = snaps.at(-1);
    assert.deepEqual(arrayOf(end, 'numeros')?.values, ['1', '2', '4', '5', '8']);
    assert.equal(arrayOf(end, 'pratos')?.kind, 'stack');
    assert.equal(arrayOf(end, 'grade')?.rows?.length, 2);
    assert.deepEqual(end?.maps?.[0].entries.find((e) => e.key === '"sol"')?.value, '2');
    assert.ok(end && heapView(end).lists.length > 0, `heap: ${JSON.stringify(end?.heap)}`);
    assert.ok(snaps.some((s) => s.condition?.parts.some((p) => p.value === true)), 'nenhuma condição avaliada');
  });
});
