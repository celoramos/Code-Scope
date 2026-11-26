import * as vscode from 'vscode';
import type { Snapshot } from './model/snapshot';
import { registerSamples } from './samples';
import { ScopeController } from './scopeController';
import { ScopeViewProvider } from './webview/scopeViewProvider';

/** O que activate devolve. Só os testes de integração usam. */
export interface CodeScopeApi {
  snapshots(): Snapshot[];
  lastRaw(): unknown;
  panelVisible(): boolean;
  /** Paradas lidas até agora, com passo publicado ou não. */
  stopsRead(): number;
  /** O último erro ao montar um passo, com a pilha: o log não aparece no CI. */
  lastError(): string | undefined;
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
    registerSamples(context),
  );
  return {
    snapshots: () => controller.history.all(),
    lastRaw: () => controller.lastRaw,
    panelVisible: () => provider.visible,
    stopsRead: () => controller.stopsRead,
    lastError: () => controller.lastError,
  };
}

export function deactivate() {}
