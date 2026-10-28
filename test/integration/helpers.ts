import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CodeScopeApi } from '../../src/extension';
import { diff } from '../../src/model/diff';
import type { Snapshot } from '../../src/model/snapshot';

export const samplesRoot = path.resolve(__dirname, '..', 'samples');
const dumpDir = path.resolve(__dirname);

/** Se o painel estava visível na primeira parada do último debugFile. */
export let visibleAtFirstStop = false;

export async function api(): Promise<CodeScopeApi> {
  const ext = vscode.extensions.getExtension<CodeScopeApi>('code-scope.code-scope');
  assert.ok(ext, 'extensão Code Scope não encontrada');
  return ext.activate();
}

async function waitFor<T>(what: string, check: () => T | undefined, timeoutMs = 120_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = check();
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error(`tempo esgotado esperando ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

export interface DebugRun {
  /** Arquivo a abrir e onde pôr o breakpoint. */
  file: string;
  breakpointLine: number;
  steps: number;
  /** Nome de uma configuração do launch.json da pasta aberta, ou a configuração inteira. */
  config: string | vscode.DebugConfiguration;
  /** Nome do dump em out-test/<dump>.json. */
  dump: string;
  /** Espera algo ficar pronto antes de começar (o language server do Java, por exemplo). */
  before?: () => Promise<void>;
  /** F10 (stepOver, o padrão) ou F11 (stepInto, para entrar nas funções). */
  step?: 'stepOver' | 'stepInto';
}

/**
 * Debuga um arquivo: breakpoint na linha indicada, depois F10 várias vezes.
 * Grava em out-test/<dump>.json o que foi coletado, para inspeção.
 */
export async function debugFile(run: DebugRun): Promise<Snapshot[]> {
  const cs = await api();
  const uri = vscode.Uri.file(run.file);
  await vscode.window.showTextDocument(uri);
  await run.before?.();

  vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
  vscode.debug.addBreakpoints([
    new vscode.SourceBreakpoint(new vscode.Location(uri, new vscode.Position(run.breakpointLine - 1, 0))),
  ]);

  // Guarda o que o debugger escreveu no Debug Console e avisa se a sessão acabou antes de parar,
  // para a falha dizer o motivo em vez de esperar o tempo todo.
  const output: string[] = [];
  let ended = false;
  const listeners = [
    vscode.debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker: () => ({
        onDidSendMessage: (m: { type?: string; event?: string; body?: { output?: string } }) => {
          if (m.type === 'event' && m.event === 'output' && m.body?.output) output.push(m.body.output);
        },
        onError: (e: Error) => output.push(`erro do adaptador: ${e.message}\n`),
      }),
    }),
    vscode.debug.onDidTerminateDebugSession(() => (ended = true)),
  ];

  try {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(await vscode.debug.startDebugging(folder, run.config), `não iniciou o debug de ${run.dump}`);

    // Iniciar o debug limpa o histórico; espera a primeira parada.
    await waitFor('a primeira parada', () => cs.snapshots().length >= 1 || ended || undefined, 240_000);
    assert.ok(
      cs.snapshots().length >= 1,
      `o debug de ${run.dump} terminou sem parar no breakpoint. Saída do debugger:\n${output.join('')}`,
    );
  } catch (err) {
    if (err instanceof Error && !err.message.includes('Saída do debugger')) {
      err.message += `\nSaída do debugger:\n${output.join('')}`;
    }
    await stopAll();
    throw err;
  } finally {
    listeners.forEach((l) => l.dispose());
  }
  const raw = cs.lastRaw();
  // O painel abre na primeira parada; dá um instante para o VS Code trocar a barra lateral.
  await new Promise((r) => setTimeout(r, 1500));
  visibleAtFirstStop = cs.panelVisible();

  // CODE_SCOPE_STEP_DELAY (ms) segura cada passo na tela, para gravar o painel animando.
  const delay = Number(process.env.CODE_SCOPE_STEP_DELAY ?? 0);
  for (let k = 0; k < run.steps && vscode.debug.activeDebugSession; k++) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const n = cs.snapshots().length;
    await vscode.commands.executeCommand(`workbench.action.debug.${run.step ?? 'stepOver'}`);
    await waitFor(`o passo ${k + 1}`, () => cs.snapshots().length > n || !vscode.debug.activeDebugSession || undefined, 30_000);
  }

  const snaps = cs.snapshots();
  const probe = await probeLocals();
  fs.writeFileSync(path.join(dumpDir, `${run.dump}.json`), JSON.stringify({ raw, probe, snapshots: snaps }, null, 2));
  await stopAll();
  return snaps;
}

/** Encerra todas as sessões (o JavaScript abre uma sessão filha) e espera terminarem. */
async function stopAll() {
  await vscode.debug.stopDebugging();
  await waitFor('o fim do debug', () => !vscode.debug.activeDebugSession || undefined, 30_000);
}

/** Abre um nível de cada variável local na parada atual, para documentar formatos novos. */
async function probeLocals(): Promise<unknown> {
  const s = vscode.debug.activeDebugSession;
  const thread = vscode.debug.activeStackItem;
  if (!s || !thread || !('threadId' in thread)) return undefined;
  const { stackFrames } = await s.customRequest('stackTrace', { threadId: thread.threadId, levels: 1 });
  const { scopes } = await s.customRequest('scopes', { frameId: stackFrames[0].id });
  const out: Record<string, unknown> = { scopes };
  for (const scope of scopes.slice(0, 2) as { name: string; variablesReference: number }[]) {
    const { variables } = await s.customRequest('variables', { variablesReference: scope.variablesReference });
    for (const v of variables as { name: string; variablesReference: number }[]) {
      if (v.variablesReference <= 0) continue;
      const children = await s.customRequest('variables', { variablesReference: v.variablesReference });
      const first = children.variables[0];
      const nested =
        first?.variablesReference > 0
          ? (await s.customRequest('variables', { variablesReference: first.variablesReference })).variables.slice(0, 4)
          : undefined;
      out[`${scope.name}/${v.name}`] = { variable: v, children: children.variables.slice(0, 6), nested };
    }
  }
  return out;
}

/** Mudanças de todos os passos de uma sessão, como o painel calcularia. */
export const allChanges = (snaps: Snapshot[]) => snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2]));
