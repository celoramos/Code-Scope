import * as vscode from 'vscode';
import type { Snapshot } from '../model/snapshot';

/** Mensagens que a extensão envia para o painel. */
export type ToWebview = { type: 'status'; text: string } | { type: 'render'; frame: Frame };

/** Tudo que o painel precisa para desenhar um passo. */
export interface Frame {
  snapshot: Snapshot;
}

/** Mensagens que o painel envia para a extensão. */
export type FromWebview = { type: 'ready' };

export class ScopeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'codeScope.panel';

  private view?: vscode.WebviewView;
  /** Última mensagem enviada, reenviada quando o painel é (re)aberto. */
  private last?: ToWebview;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media);
    view.webview.onDidReceiveMessage((msg: FromWebview) => {
      if (msg.type === 'ready' && this.last) {
        void view.webview.postMessage(this.last);
      }
    });
    view.onDidDispose(() => (this.view = undefined));
  }

  post(msg: ToWebview) {
    this.last = msg;
    void this.view?.webview.postMessage(msg);
  }

  private html(webview: vscode.Webview, media: vscode.Uri): string {
    const css = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.css'));
    const js = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.js'));
    const nonce = makeNonce();
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${css}">
  <title>Code Scope</title>
</head>
<body>
  <main id="app">
    <p id="location" class="location" hidden></p>
    <p id="status" class="status" role="status" aria-live="polite">
      Aguardando debug. Coloque um breakpoint num programa Java e aperte F5.
    </p>
    <section id="arrays" class="arrays" aria-label="Arrays"></section>
  </main>
  <script nonce="${nonce}" src="${js}"></script>
</body>
</html>`;
  }
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
