import * as assert from 'node:assert/strict';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * Programas feitos para quebrar a coleta: coleções enormes, valores que dão erro ao serem lidos,
 * ciclos, recursão funda, threads. O que se confere é que nada trava nem some; o que foi
 * desenhado fica nos dumps out-test/estresse-*.json, repassados no painel por webview.test.ts.
 */
const base = path.resolve(samplesRoot, '..', 'test', 'estresse');
const python = process.env.CODE_SCOPE_PYTHON ?? path.resolve(samplesRoot, '..', '.vscode-test', 'python', 'python.exe');

function find(tool: string): string | undefined {
  for (const d of (process.env.PATH ?? '').split(path.delimiter)) {
    for (const ext of ['.exe', '']) {
      const p = path.join(d, tool + ext);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const stopLine = (file: string) => fs.readFileSync(file, 'utf8').split(/\r?\n/).findIndex((l) => l.includes('PARE')) + 1;

async function run(dump: string, file: string, config: vscode.DebugConfiguration, steps = 12, step?: 'stepOver' | 'stepInto', before?: () => Promise<void>): Promise<Snapshot[]> {
  const started = Date.now();
  const inFlight = new Map<number, { at: number; what: string }>();
  const slow: { ms: number; what: string }[] = [];
  const tracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker: () => ({
      onWillReceiveMessage: (m: { type?: string; seq: number; command: string; arguments?: unknown }) => {
        if (m.type === 'request') inFlight.set(m.seq, { at: Date.now(), what: `${m.command} ${JSON.stringify(m.arguments ?? {}).slice(0, 80)}` });
      },
      onDidSendMessage: (m: { type?: string; request_seq: number }) => {
        const r = m.type === 'response' ? inFlight.get(m.request_seq) : undefined;
        if (r) slow.push({ ms: Date.now() - r.at, what: r.what });
      },
    }),
  });
  try {
    const snaps = await debugFile({ file, breakpointLine: stopLine(file), steps, step, config, dump: `estresse-${dump}`, before });
    assert.ok(snaps.length >= 1, 'nenhuma parada');
    allChanges(snaps);
    const size = JSON.stringify(snaps).length;
    console.log(`ESTRESSE ${dump}: ${snaps.length} passos, ${Date.now() - started} ms, ${Math.round(size / 1024)} KB`);
    for (const s of slow.sort((a, b) => b.ms - a.ms).slice(0, 4)) console.log(`LENTO ${dump}: ${s.ms} ms ${s.what}`);
    return snaps;
  } finally {
    tracker.dispose();
    if (vscode.debug.activeDebugSession) await vscode.debug.stopDebugging();
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const py = (name: string, steps?: number, step?: 'stepOver' | 'stepInto') => {
  const file = path.join(base, 'py', `${name}.py`);
  return run(`py-${path.basename(name)}-${step ?? 'f10'}`, file, { type: 'debugpy', request: 'launch', name: `E ${name}`, program: file, python, debugAdapterPython: python, debugLauncherPython: python, console: 'internalConsole' }, steps, step);
};
const js = (name: string, steps?: number, step?: 'stepOver' | 'stepInto') => {
  const file = path.join(base, 'js', `${name}.js`);
  return run(`js-${name}-${step ?? 'f10'}`, file, { type: 'node', request: 'launch', name: `E ${name}`, program: file, skipFiles: ['<node_internals>/**'] }, steps, step);
};

describe('Estresse Python', function () {
  this.timeout(1_500_000);
  before(function () {
    if (!fs.existsSync(python)) this.skip();
  });
  for (const name of ['g-lista', 'g-dict', 'g-matriz', 'g-texto']) it(name, () => py(name, 3));
  it('gigante', () => py('gigante', 12));
  it('hostil', () => py('hostil', 12));
  it('variado', () => py('variado', 40));
  it('variado com F11', () => py('variado', 30, 'stepInto'));
  it('recursao', () => py('recursao', 8));
  it('threads', () => py('threads', 10));
  it('excecao', () => py('excecao', 12));
  it('caminho com espaço e acento', () => py('caminho com espaço ç/coração', 4));
});

describe('Estresse JavaScript', function () {
  this.timeout(1_500_000);
  for (const name of ['g-array', 'g-objeto', 'g-map', 'g-matriz', 'g-texto', 'g-nos']) it(name, () => js(name, 3));
  it('gigante', () => js('gigante', 12));
  it('hostil', () => js('hostil', 8));
  it('variado', () => js('variado', 30));
  it('variado com F11', () => js('variado', 20, 'stepInto'));
  it('recursao', () => js('recursao', 8));
  it('excecao', () => js('excecao', 5));
});

describe('Estresse Java', function () {
  this.timeout(1_500_000);
  it('tudo', async () => {
    const file = path.join(samplesRoot, 'java', 'Estresse.java');
    await run('java', file, { type: 'java', request: 'launch', name: 'Estresse', mainClass: 'Estresse' }, 16, undefined, async () => {
      const api = (await vscode.extensions.getExtension('redhat.java')?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
      await api?.serverReady?.();
    });
  });
});

/**
 * Pretty-printers ligados quando o gdb tem Python (o do Linux): std::map,
 * std::string e std::stack de verdade. O gdb do w64devkit não tem, e segue
 * pelo caminho das expressões (indirectSequence).
 */
const PRETTY = [{ description: 'pretty-printers', text: '-enable-pretty-printing', ignoreFailures: true }];

describe('Estresse C e C++', () => {
  before(function () {
    if (!find('gdb') || !find('gcc') || !vscode.extensions.getExtension('ms-vscode.cpptools')) this.skip();
  });
  for (const [name, compiler] of [['estresse.c', 'gcc'], ['estresse.cpp', 'g++']]) {
    it(name, async () => {
      const dir = path.join(base, 'c');
      const out = path.join(dir, `${name.replace('.', '-')}.exe`);
      cp.execFileSync(find(compiler)!, ['-g', '-O0', name, '-o', out], { cwd: dir });
      await run(name, path.join(dir, name), { type: 'cppdbg', request: 'launch', name, program: out, cwd: dir, MIMode: 'gdb', miDebuggerPath: find('gdb'), externalConsole: false, setupCommands: PRETTY }, 8);
    });
  }
});

describe('Estresse C#', function () {
  this.timeout(1_500_000);
  before(function () {
    if (!find('dotnet') || !vscode.extensions.getExtension('ms-dotnettools.csharp')) this.skip();
  });
  it('tudo', async () => {
    const dir = path.join(base, 'cs');
    cp.execFileSync(find('dotnet')!, ['build', '-c', 'Debug', '--nologo', '-v', 'q'], { cwd: dir });
    const ext = vscode.extensions.getExtension('ms-dotnettools.csharp');
    await ext?.activate();
    const done = ext ? path.join(ext.extensionPath, '.debugger', 'install.complete') : '';
    for (let i = 0; i < 240 && !fs.existsSync(done); i++) await new Promise((r) => setTimeout(r, 500));
    await run('cs', path.join(dir, 'Program.cs'), { type: 'coreclr', request: 'launch', name: 'Estresse', program: path.join(dir, 'bin', 'Debug', 'net8.0', 'Estresse.dll'), cwd: dir, console: 'internalConsole' }, 9);
  });
});

describe('Estresse Go', function () {
  this.timeout(1_500_000);
  before(function () {
    if (!find('dlv') || !vscode.extensions.getExtension('golang.go')) this.skip();
  });
  it('tudo', async () => {
    const file = path.join(base, 'go', 'main.go');
    await run('go', file, { type: 'go', request: 'launch', name: 'Estresse Go', mode: 'debug', program: path.dirname(file), cwd: path.dirname(file) }, 6);
  });
});
