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
/** Se o programa do último debugFile terminou sozinho, antes de acabarem os passos. */
export let lastRunEnded = false;
/** O que o debugger mandou em cada passo do último debugFile, com a posição do passo no histórico. */
export let lastRaws: { index: number; raw: unknown }[] = [];
/**
 * Variáveis que o painel não desenhou, abertas na hora em que existiam: o valor, a referência e os
 * primeiros filhos, para saber por que sumiram sem precisar rodar de novo. Uma vez por nome.
 */
export const invisibleDetails = new Map<string, string>();

type RawVar = { name: string; value: string; type?: string; variablesReference: number; indexedVariables?: number };

async function probeInvisible(raw: unknown, snap: Snapshot): Promise<void> {
  const session = vscode.debug.activeDebugSession;
  const locals = (raw as { locals?: RawVar[] } | undefined)?.locals;
  if (!session || !locals || invisibleDetails.size >= 40) return;
  const drawn = new Set([...snap.arrays.map((a) => a.name.replace(/\[.*$/, '')), ...snap.pointers.map((p) => p.name), ...(snap.scalars ?? []).map((s) => s.name), ...(snap.refs ?? []).map((r) => r.name), ...(snap.maps ?? []).map((m) => m.name)]);
  for (const v of locals) {
    if (drawn.has(v.name) || invisibleDetails.has(v.name) || v.variablesReference <= 0) continue;
    let children = '';
    try {
      const res = (await session.customRequest('variables', { variablesReference: v.variablesReference })) as { variables?: RawVar[] };
      children = (res.variables ?? [])
        .slice(0, 3)
        .map((c) => `${c.name}=${c.value.slice(0, 50)}${c.type ? `:${c.type}` : ''}${c.variablesReference > 0 ? `#${c.indexedVariables ?? ''}` : ''}`)
        .join(' | ');
    } catch (e) {
      children = `erro: ${e instanceof Error ? e.message : e}`;
    }
    invisibleDetails.set(v.name, `ref=${v.variablesReference} idx=${v.indexedVariables ?? '-'} filhos: ${children}`);
  }
}

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
  /** Passo depois do qual o programa segue sem parar até o fim (o fim do main, no Java). */
  until?: (s: Snapshot) => boolean;
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
    // Os exemplos param sozinhos no main (stopOnEntry); aqui quem manda é o breakpoint da linha pedida.
    const named = typeof run.config === 'string' ? vscode.workspace.getConfiguration('launch', folder).get<vscode.DebugConfiguration[]>('configurations')?.find((c) => c.name === run.config) : undefined;
    const config = named ? { ...named, stopOnEntry: false } : run.config;
    assert.ok(await vscode.debug.startDebugging(folder, config), `não iniciou o debug de ${run.dump}`);

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
  const raws = [{ index: cs.snapshots().length - 1, raw }];
  invisibleDetails.clear();
  for (let k = 0; k < run.steps && vscode.debug.activeDebugSession; k++) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const n = cs.snapshots().length;
    // Parada em código sem arquivo (o encerramento da JVM depois do fim do main) é lida, mas não vira
    // passo: o que libera o próximo F10 é a leitura terminar, não o passo aparecer.
    const read = cs.stopsRead();
    await vscode.commands.executeCommand(`workbench.action.debug.${run.step ?? 'stepOver'}`);
    await waitFor(`o passo ${k + 1}`, () => cs.snapshots().length > n || cs.stopsRead() > read || !vscode.debug.activeDebugSession || undefined, 30_000);
    const last = cs.snapshots().at(-1);
    if (cs.snapshots().length > n) {
      raws.push({ index: cs.snapshots().length - 1, raw: cs.lastRaw() });
      if (last) await probeInvisible(cs.lastRaw(), last);
    }
    if (run.until && cs.snapshots().length > n && last && run.until(last)) {
      await vscode.commands.executeCommand('workbench.action.debug.continue');
      await waitFor('o fim do programa', () => !vscode.debug.activeDebugSession || undefined, 60_000).catch(() => undefined);
      break;
    }
  }
  lastRunEnded = !vscode.debug.activeDebugSession;
  lastRaws = raws;

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
/**
 * Primeira página de uma variável com posições. O java-debug recusa count
 * maior que o tamanho ("Attempted to get more values from array than length
 * of array"), então count nunca passa de indexedVariables.
 */
function firstPage(indexed: number | undefined, count: number): object {
  return indexed ? { filter: 'indexed', start: 0, count: Math.min(count, indexed) } : {};
}

async function probeLocals(): Promise<unknown> {
  const s = vscode.debug.activeDebugSession;
  const thread = vscode.debug.activeStackItem;
  if (!s || !thread || !('threadId' in thread)) return undefined;
  const { stackFrames } = await s.customRequest('stackTrace', { threadId: thread.threadId, levels: 1 });
  const { scopes } = await s.customRequest('scopes', { frameId: stackFrames[0].id });
  const out: Record<string, unknown> = { scopes };
  for (const scope of scopes.slice(0, 2) as { name: string; variablesReference: number }[]) {
    const { variables } = await s.customRequest('variables', { variablesReference: scope.variablesReference });
    for (const v of variables as { name: string; variablesReference: number; indexedVariables?: number }[]) {
      if (v.variablesReference <= 0) continue;
      // Sem filtro, o js-debug devolve todas as posições: num array de 1 milhão, a sonda levava 20 minutos.
      const children = await s.customRequest('variables', { variablesReference: v.variablesReference, ...firstPage(v.indexedVariables, 6) });
      const first = children.variables[0];
      const nested =
        first?.variablesReference > 0
          ? (
              await s.customRequest('variables', {
                variablesReference: first.variablesReference,
                ...firstPage(first.indexedVariables, 4),
              })
            ).variables.slice(0, 4)
          : undefined;
      out[`${scope.name}/${v.name}`] = { variable: v, children: children.variables.slice(0, 6), nested };
    }
  }
  return out;
}

/** Mudanças de todos os passos de uma sessão, como o painel calcularia. */
export const allChanges = (snaps: Snapshot[]) => snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2]));
