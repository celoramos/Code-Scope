import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CodeScopeApi } from '../../src/extension';
import { diff } from '../../src/model/diff';
import type { Snapshot } from '../../src/model/snapshot';

const samples = path.resolve(__dirname, '..', 'samples', 'java');
const dumpDir = path.resolve(__dirname);

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

  for (let k = 0; k < steps && vscode.debug.activeDebugSession; k++) {
    const n = cs.snapshots().length;
    await vscode.commands.executeCommand('workbench.action.debug.stepOver');
    await waitFor(`o passo ${k + 1}`, () => cs.snapshots().length > n || !vscode.debug.activeDebugSession || undefined, 30_000);
  }

  const snaps = cs.snapshots();
  fs.writeFileSync(path.join(dumpDir, `${name}.json`), JSON.stringify({ raw, snapshots: snaps }, null, 2));
  await vscode.debug.stopDebugging();
  await ended;
  return snaps;
}

describe('Java Debugger real', () => {
  it('BubbleSort: lê o array, os ponteiros e reconhece a troca com temp', async () => {
    const snaps = await debugSample('BubbleSort', 6, 12);
    const first = snaps[0];
    assert.equal(first.line, 6);
    assert.deepEqual(first.arrays.find((a) => a.name === 'numeros')?.values, ['5', '1', '4', '2', '8']);

    const kinds = snaps.flatMap((s, k) => diff(snaps[k - 1], s, snaps[k - 2])).map((c) => c.kind);
    assert.ok(kinds.includes('swap'), `nenhuma troca reconhecida: ${kinds.join(', ')}`);
    assert.ok(
      snaps.some((s) => s.pointers.some((p) => p.name === 'j')),
      'a variável j nunca apareceu como ponteiro',
    );
  });

  it('InverterArray: lê os dois ponteiros', async () => {
    const snaps = await debugSample('InverterArray', 6, 8);
    const last = snaps[snaps.length - 1];
    const names = last.pointers.map((p) => p.name);
    assert.ok(names.includes('inicio') && names.includes('fim'), `ponteiros: ${names.join(', ')}`);
  });
});
