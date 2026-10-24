import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { samplesRoot } from './helpers';

/*
 * Descoberta de formatos: debuga um exemplo e grava tudo o que o debugger
 * devolve (todas as chamadas da pilha, objetos abertos em três níveis, a
 * exceção). Serve para escrever um adaptador novo olhando o formato real, não
 * para verificar comportamento. Só roda com CODE_SCOPE_DISCOVER=1.
 */

const python = process.env.CODE_SCOPE_PYTHON ?? path.resolve(__dirname, '..', '.vscode-test', 'python', 'python.exe');

interface Scenario {
  name: string;
  file: string;
  line: number;
  steps: ('over' | 'into' | 'continue')[];
  config: vscode.DebugConfiguration | string;
}

function java(name: string, line: number, steps: Scenario['steps']): Scenario {
  return { name: `java-${name}`, file: path.join(samplesRoot, 'java', `${name}.java`), line, steps, config: name };
}
function js(name: string, line: number, steps: Scenario['steps']): Scenario {
  const file = path.join(samplesRoot, 'javascript', `${name}.js`);
  return { name: `js-${name}`, file, line, steps, config: { type: 'node', request: 'launch', name, program: file, skipFiles: ['<node_internals>/**'] } };
}
function py(name: string, line: number, steps: Scenario['steps']): Scenario {
  const file = path.join(samplesRoot, 'python', `${name}.py`);
  return {
    name: `py-${name}`,
    file,
    line,
    steps,
    config: { type: 'debugpy', request: 'launch', name, program: file, python, debugAdapterPython: python, debugLauncherPython: python, console: 'internalConsole' },
  };
}

const over = (n: number) => Array<'over'>(n).fill('over');
const into = (n: number) => Array<'into'>(n).fill('into');

const SCENARIOS: Scenario[] = [
  java('Referencias', 18, over(8)),
  java('ListaLigada', 13, over(6)),
  java('Dicionario', 7, over(8)),
  java('Fatorial', 12, into(6)),
  java('ForaDoLimite', 7, ['continue']),
  js('referencias', 14, over(8)),
  js('listaLigada', 10, over(6)),
  js('dicionario', 4, over(8)),
  js('fatorial', 11, into(6)),
  js('foraDoLimite', 6, ['continue']),
  js('escopo', 3, over(9)),
  py('referencias', 12, over(8)),
  py('lista_ligada', 10, over(6)),
  py('dicionario', 4, over(8)),
  py('fatorial', 10, into(6)),
  py('fora_do_limite', 6, ['continue']),
];

async function waitFor<T>(check: () => T | undefined, ms: number): Promise<T | undefined> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const v = check();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return undefined;
}

async function dumpStop(s: vscode.DebugSession, threadId: number, reason: string) {
  const out: Record<string, unknown> = { reason };
  if (reason === 'exception') {
    try {
      out.exceptionInfo = await s.customRequest('exceptionInfo', { threadId });
    } catch (e) {
      out.exceptionInfo = String(e);
    }
  }
  const { stackFrames } = await s.customRequest('stackTrace', { threadId, startFrame: 0, levels: 20 });
  out.stackFrames = stackFrames;
  const frames = [];
  for (const f of (stackFrames as { id: number }[]).slice(0, 6)) {
    const { scopes } = await s.customRequest('scopes', { frameId: f.id });
    const sc = [];
    for (const scope of (scopes as { name: string; variablesReference: number; expensive?: boolean }[]).slice(0, 3)) {
      if (scope.expensive) {
        sc.push({ scope });
        continue;
      }
      sc.push({ scope, variables: await expand(s, scope.variablesReference, 3) });
    }
    frames.push({ frame: f, scopes: sc });
  }
  out.frames = frames;
  return out;
}

async function expand(s: vscode.DebugSession, ref: number, depth: number): Promise<unknown[]> {
  const { variables } = await s.customRequest('variables', { variablesReference: ref });
  const out = [];
  for (const v of (variables as { name: string; variablesReference: number }[]).slice(0, 12)) {
    if (depth > 1 && v.variablesReference > 0 && !/^(special variables|function variables|\[\[Prototype\]\]|__proto__)$/.test(v.name)) {
      out.push({ ...v, children: await expand(s, v.variablesReference, depth - 1) });
    } else {
      out.push(v);
    }
  }
  return out;
}

describe('Descoberta de formatos (CODE_SCOPE_DISCOVER)', function () {
  before(function () {
    if (!process.env.CODE_SCOPE_DISCOVER) this.skip();
  });

  for (const sc of SCENARIOS) {
    it(sc.name, async function () {
      if (sc.name.startsWith('py-') && !fs.existsSync(python)) this.skip();
      const stops: { session: vscode.DebugSession; threadId: number; reason: string }[] = [];
      const tracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker: (session) => ({
          onDidSendMessage: (m: { type?: string; event?: string; body?: { threadId?: number; reason?: string } }) => {
            if (m.type === 'event' && m.event === 'stopped') {
              stops.push({ session, threadId: m.body?.threadId ?? 1, reason: m.body?.reason ?? '' });
            }
          },
        }),
      });
      const dumps: unknown[] = [];
      try {
        const uri = vscode.Uri.file(sc.file);
        await vscode.window.showTextDocument(uri);
        if (sc.name.startsWith('java-')) {
          const api = (await vscode.extensions.getExtension('redhat.java')?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
          await api?.serverReady?.();
        }
        vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
        vscode.debug.addBreakpoints([new vscode.SourceBreakpoint(new vscode.Location(uri, new vscode.Position(sc.line - 1, 0)))]);
        await vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], sc.config);
        let seen = 0;
        for (let k = 0; k <= sc.steps.length; k++) {
          const stop = await waitFor(() => stops[seen], k === 0 ? 240_000 : 20_000);
          if (!stop) break;
          seen++;
          dumps.push(await dumpStop(stop.session, stop.threadId, stop.reason));
          const step = sc.steps[k];
          if (!step) break;
          const cmd = { over: 'stepOver', into: 'stepInto', continue: 'continue' }[step];
          await vscode.commands.executeCommand(`workbench.action.debug.${cmd}`);
        }
      } finally {
        tracker.dispose();
        fs.writeFileSync(path.join(__dirname, `discover-${sc.name}.json`), JSON.stringify(dumps, null, 2));
        await vscode.debug.stopDebugging();
        await waitFor(() => !vscode.debug.activeDebugSession || undefined, 30_000);
      }
    });
  }
});
