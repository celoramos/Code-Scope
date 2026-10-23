import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CodeScopeApi } from '../../src/extension';
import { diff } from '../../src/model/diff';
import { makeFrame } from '../../src/model/frame';
import type { Snapshot } from '../../src/model/snapshot';

const samples = path.resolve(__dirname, '..', 'samples', 'java');
const dumpDir = path.resolve(__dirname);

/** Se o painel estava visível na primeira parada do último debugSample. */
let visibleAtFirstStop = false;

async function api(): Promise<CodeScopeApi> {
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

/**
 * Debuga um sample: breakpoint na linha indicada, depois F10 várias vezes.
 * Grava em out-test/<nome>.json o que foi coletado, para inspeção.
 */
async function debugSample(name: string, breakpointLine: number, steps: number): Promise<Snapshot[]> {
  const cs = await api();
  const uri = vscode.Uri.file(path.join(samples, `${name}.java`));
  await vscode.window.showTextDocument(uri);

  const java = vscode.extensions.getExtension('redhat.java');
  const javaApi = (await java?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
  await javaApi?.serverReady?.();

  vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
  vscode.debug.addBreakpoints([
    new vscode.SourceBreakpoint(new vscode.Location(uri, new vscode.Position(breakpointLine - 1, 0))),
  ]);

  const folder = vscode.workspace.workspaceFolders?.[0];
  const ended = new Promise<void>((resolve) => {
    const d = vscode.debug.onDidTerminateDebugSession(() => {
      d.dispose();
      resolve();
    });
  });
  assert.ok(await vscode.debug.startDebugging(folder, name), `não iniciou o debug de ${name}`);

  // startDebugging limpa o histórico; espera a primeira parada.
  await waitFor('a primeira parada', () => cs.snapshots().length >= 1 || undefined, 240_000);
  const raw = cs.lastRaw();
  // O painel abre na primeira parada; dá um instante para o VS Code trocar a barra lateral.
  await new Promise((r) => setTimeout(r, 1500));
  visibleAtFirstStop = cs.panelVisible();

  for (let k = 0; k < steps && vscode.debug.activeDebugSession; k++) {
    const n = cs.snapshots().length;
    await vscode.commands.executeCommand('workbench.action.debug.stepOver');
    await waitFor(`o passo ${k + 1}`, () => cs.snapshots().length > n || !vscode.debug.activeDebugSession || undefined, 30_000);
  }

  const snaps = cs.snapshots();
  const probe = await probeLocals();
  fs.writeFileSync(path.join(dumpDir, `${name}.json`), JSON.stringify({ raw, probe, snapshots: snaps }, null, 2));
  await vscode.debug.stopDebugging();
  await ended;
  return snaps;
}

/** Abre um nível de cada variável local na parada atual, para documentar formatos novos. */
async function probeLocals(): Promise<unknown> {
  const s = vscode.debug.activeDebugSession;
  const thread = vscode.debug.activeStackItem;
  if (!s || !thread || !('threadId' in thread)) return undefined;
  const { stackFrames } = await s.customRequest('stackTrace', { threadId: thread.threadId, levels: 1 });
  const { scopes } = await s.customRequest('scopes', { frameId: stackFrames[0].id });
  const { variables } = await s.customRequest('variables', { variablesReference: scopes[0].variablesReference });
  const out: Record<string, unknown> = {};
  for (const v of variables as { name: string; variablesReference: number }[]) {
    if (v.variablesReference <= 0) continue;
    const children = await s.customRequest('variables', { variablesReference: v.variablesReference });
    out[v.name] = { variable: v, children: children.variables.slice(0, 4) };
  }
  return out;
}

describe('Java Debugger real', () => {
  it('BubbleSort: lê o array, os ponteiros e reconhece a troca com temp', async () => {
    const snaps = await debugSample('BubbleSort', 6, 12);
    assert.ok(visibleAtFirstStop, 'o painel não estava visível na primeira parada');
    const first = snaps[0];
    assert.equal(first.line, 6);
    assert.equal(first.code, 'for (int i = 0; i < numeros.length - 1; i++) {');
    assert.deepEqual(first.arrays.find((a) => a.name === 'numeros')?.values, ['5', '1', '4', '2', '8']);

    const kinds = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2])).map((c) => c.kind);
    assert.ok(kinds.includes('swap'), `nenhuma troca reconhecida: ${kinds.join(', ')}`);
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      'a variável j nunca apareceu como ponteiro',
    );
  });

  it('Matriz: lê as linhas, acha linha e coluna no código e vê a célula mudar', async () => {
    const snaps = await debugSample('Matriz', 9, 5);
    const grade = snaps[0].arrays.find((a) => a.name === 'grade');
    assert.deepEqual(grade?.rows?.map((r) => r.values), [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
    const changes = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2]));
    assert.ok(
      changes.some((c) => c.kind === 'set' && c.array === 'grade[0]' && c.index === 0 && c.to === '10'),
      `grade[0][0] não virou 10: ${JSON.stringify(changes)}`,
    );
    const frames = snaps.map((s, k) => makeFrame({ snapshot: s, prev: snaps[k - 1], older: snaps[k - 2], index: k + 1, total: snaps.length }));
    assert.ok(
      frames.some((f) => f.axes.grade?.row?.name === 'i' && f.axes.grade?.col?.name === 'j'),
      'i e j nunca foram reconhecidos como linha e coluna',
    );
  });

  it('ListaDeCompras: ArrayList vira lista e as inserções são reconhecidas', async () => {
    const snaps = await debugSample('ListaDeCompras', 7, 6);
    const last = snaps[snaps.length - 1].arrays.find((a) => a.name === 'lista');
    assert.equal(last?.kind, 'list');
    // Logo depois do "new ArrayList<>()" a lista existe e está vazia.
    const empty = snaps.find((s) => s.line === 8)?.arrays.find((a) => a.name === 'lista');
    assert.deepEqual(empty, { name: 'lista', values: [], length: 0, kind: 'list' });
    const kinds = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2])).map((c) => c.kind);
    assert.ok(kinds.includes('insert'), `nenhuma inserção: ${kinds.join(', ')}`);
  });

  it('Palindromo: char com aspas simples e boolean como variável simples', async () => {
    const snaps = await debugSample('Palindromo', 7, 3);
    const s = snaps[snaps.length - 1];
    assert.deepEqual(s.arrays.find((a) => a.name === 'letras')?.values, ["'r'", "'a'", "'d'", "'a'", "'r'"]);
    assert.deepEqual(s.scalars?.find((v) => v.name === 'ehPalindromo'), { name: 'ehPalindromo', value: 'true' });
  });

  it('InverterArray: lê os dois ponteiros', async () => {
    const snaps = await debugSample('InverterArray', 6, 8);
    const last = snaps[snaps.length - 1];
    const names = last.pointers.map((p) => p.name);
    assert.ok(names.includes('inicio') && names.includes('fim'), `ponteiros: ${names.join(', ')}`);
  });
});
