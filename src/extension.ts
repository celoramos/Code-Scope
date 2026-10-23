import * as vscode from 'vscode';
import { ScopeController } from './scopeController';
import { ScopeViewProvider } from './webview/scopeViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const log = vscode.window.createOutputChannel('Code Scope', { log: true });
  const provider = new ScopeViewProvider(context.extensionUri);
  context.subscriptions.push(
    log,
    vscode.window.registerWebviewViewProvider(ScopeViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    new ScopeController(provider, log),
  );
}

export function deactivate() {}
