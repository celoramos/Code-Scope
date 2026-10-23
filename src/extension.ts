import * as vscode from 'vscode';
import { ScopeViewProvider } from './webview/scopeViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScopeViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ScopeViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
}

export function deactivate() {}
