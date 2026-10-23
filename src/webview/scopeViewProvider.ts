import * as vscode from 'vscode';
import type { Frame } from '../model/frame';

/** Mensagens que a extensão envia para o painel. */
export type ToWebview =
  | { type: 'render'; frame: Frame }
  | { type: 'session'; state: 'idle' | 'running' | 'ended' }
  | { type: 'reset' }
  | { type: 'error'; text: string };

/** Mensagens que o painel envia para a extensão. */
export type FromWebview = { type: 'ready' } | { type: 'back' } | { type: 'forward' };

export class ScopeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'codeScope.panel';

  private view?: vscode.WebviewView;
  private readonly messages = new vscode.EventEmitter<FromWebview>();
  /** O painel avisa "ready" ao carregar; quem escuta reenvia o estado atual. */
  readonly onMessage = this.messages.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media);
    view.webview.onDidReceiveMessage((msg: FromWebview) => this.messages.fire(msg));
    view.onDidDispose(() => (this.view = undefined));
  }

  post(msg: ToWebview) {
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
    <nav id="nav" class="nav" aria-label="Histórico de passos" hidden>
      <button id="back" class="nav-button" type="button" aria-label="Passo anterior" title="Passo anterior (seta esquerda)">⏮</button>
      <span id="counter" class="counter"></span>
      <button id="forward" class="nav-button" type="button" aria-label="Próximo passo" title="Próximo passo (seta direita)">⏭</button>
    </nav>
    <p id="location" class="location" hidden></p>
    <p id="status" class="status" role="status" aria-live="polite">
      Aguardando debug. Coloque um breakpoint num programa Java e aperte F5.
    </p>
    <ul id="explanation" class="explanation" aria-live="polite" aria-label="O que mudou"></ul>
    <ul id="vars" class="vars" aria-label="Variáveis inteiras"></ul>
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
