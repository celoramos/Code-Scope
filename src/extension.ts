import * as vscode from 'vscode';
import type { Snapshot } from './model/snapshot';
import { ScopeController } from './scopeController';
import { ScopeViewProvider } from './webview/scopeViewProvider';

/** O que activate devolve. Só os testes de integração usam. */
export interface CodeScopeApi {
  snapshots(): Snapshot[];
  lastRaw(): unknown;
}

export function activate(context: vscode.ExtensionContext): CodeScopeApi {
  const log = vscode.window.createOutputChannel('Code Scope', { log: true });
  const provider = new ScopeViewProvider(context.extensionUri);
  const controller = new ScopeController(provider, log);
  context.subscriptions.push(
    log,
    vscode.window.registerWebviewViewProvider(ScopeViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    controller,
  );
  return {
    snapshots: () => controller.history.all(),
    lastRaw: () => controller.lastRaw,
  };
}

export function deactivate() {}
