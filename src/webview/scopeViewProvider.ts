import * as vscode from 'vscode';
import { uiLanguage, type AnimationSpeed } from '../config';
import type { Frame } from '../model/frame';
import { imageSaved, PANEL_STRINGS } from './strings';

/** Mensagens que a extensão envia para o painel. */
export type ToWebview =
  | { type: 'render'; frame: Frame }
  | { type: 'session'; state: 'idle' | 'running' | 'ended' }
  | { type: 'settings'; animationSpeed: AnimationSpeed }
  | { type: 'reset' }
  | { type: 'error'; text: string };

/** Mensagens que o painel envia para a extensão. */
export type FromWebview =
  | { type: 'ready' }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'goto'; step: number }
  /** Depois do palpite, o foco volta ao editor para o F10 funcionar. */
  | { type: 'focus-editor' }
  /** O painel quer o CSS para montar a imagem do passo. */
  | { type: 'export-css' }
  /** Imagem do passo pronta, em PNG base64. */
  | { type: 'save-image'; data: string; step: number };

/** Respostas que só o painel que perguntou recebe. */
type Reply = { type: 'css'; text: string };

export class ScopeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'codeScope.panel';
  readonly viewId = ScopeViewProvider.viewId;

  private view?: vscode.WebviewView;
  /** Modo aula: o mesmo painel, grande, na área do editor. */
  private presentation?: vscode.WebviewPanel;

  get visible(): boolean {
    return (this.view?.visible ?? false) || (this.presentation?.visible ?? false);
  }
  private readonly messages = new vscode.EventEmitter<FromWebview>();
  /** O painel avisa "ready" ao carregar; quem escuta reenvia o estado atual. */
  readonly onMessage = this.messages.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media, false);
    view.webview.onDidReceiveMessage((msg: FromWebview) => this.receive(view.webview, msg));
    view.onDidDispose(() => (this.view = undefined));
  }

  /** Abre (ou traz para a frente) o modo aula ao lado do código. */
  openPresentation() {
    if (this.presentation) {
      this.presentation.reveal(vscode.ViewColumn.Beside);
      return;
    }
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const panel = vscode.window.createWebviewPanel('codeScope.presentation', 'Code Scope', vscode.ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [media],
    });
    panel.iconPath = vscode.Uri.joinPath(media, 'icon.svg');
    panel.webview.html = this.html(panel.webview, media, true);
    panel.webview.onDidReceiveMessage((msg: FromWebview) => this.receive(panel.webview, msg));
    panel.onDidDispose(() => (this.presentation = undefined));
    this.presentation = panel;
  }

  post(msg: ToWebview) {
    void this.view?.webview.postMessage(msg);
    void this.presentation?.webview.postMessage(msg);
  }

  /** Pedidos da imagem ficam aqui; o resto vai para o controlador. */
  private receive(webview: vscode.Webview, msg: FromWebview) {
    if (msg.type === 'export-css') void this.sendCss(webview);
    else if (msg.type === 'save-image') void saveImage(msg.data, msg.step);
    else this.messages.fire(msg);
  }

  private async sendCss(webview: vscode.Webview) {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'));
    const reply: Reply = { type: 'css', text: new TextDecoder().decode(bytes) };
    void webview.postMessage(reply);
  }

  private html(webview: vscode.Webview, media: vscode.Uri, present: boolean): string {
    const css = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.css'));
    const js = webview.asWebviewUri(vscode.Uri.joinPath(media, 'main.js'));
    const nonce = makeNonce();
    const { html: t, script } = PANEL_STRINGS[uiLanguage()];
    // JSON dentro de <script>: "<" escapado para nenhum texto fechar a tag.
    const strings = JSON.stringify(script).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html lang="${t.lang}"${present ? ' class="is-present"' : ''}>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${css}">
  <title>Code Scope</title>
</head>
<body>
  <main id="app">
    <section id="empty" class="empty">
      <svg class="empty-art" viewBox="0 0 120 64" aria-hidden="true">
        <rect x="6" y="14" width="30" height="30" rx="5" />
        <rect x="45" y="14" width="30" height="30" rx="5" class="empty-art-accent" />
        <rect x="84" y="14" width="30" height="30" rx="5" />
        <path d="M60 52 l-5 8 h10 z" class="empty-art-pointer" />
      </svg>
      <h2 id="empty-title" class="empty-title">${t.emptyIdle}</h2>
      <ol class="empty-steps">
        ${t.emptySteps.map((s) => `<li><span>${s}</span></li>`).join('\n        ')}
      </ol>
    </section>

    <header id="toolbar" class="toolbar" hidden>
      <nav class="stepper" aria-label="${t.history}">
        <button id="back" class="icon-button" type="button" aria-label="${t.previous}" title="${t.previousTitle}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
        </button>
        <div class="step">
          <span id="counter" class="counter"></span>
          <input id="timeline" class="timeline" type="range" min="1" max="1" value="1" aria-label="${t.gotoStep}">
        </div>
        <button id="forward" class="icon-button" type="button" aria-label="${t.next}" title="${t.nextTitle}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
        </button>
      </nav>
      <div class="toolbar-actions">
        <button id="live" class="link-button" type="button" hidden>${t.live}</button>
        <button id="predict-toggle" class="toggle-button" type="button" aria-pressed="false">${t.predictMode}</button>
        <button id="save-image" class="toggle-button" type="button">${t.saveImage}</button>
      </div>
      <p class="location">
        <span id="file" class="location-file"></span>
        <span id="ended" class="badge" hidden>${t.sessionEnded}</span>
      </p>
      <dl id="code" class="code-lines"></dl>
      <div id="condition" class="condition" hidden></div>
      <section id="predict" class="predict" aria-live="polite" hidden>
        <form id="predict-form" class="predict-form" hidden>
          <label id="predict-question" class="predict-question" for="predict-input"></label>
          <div class="predict-row">
            <input id="predict-input" class="predict-input" type="text" autocomplete="off" spellcheck="false">
            <button id="predict-save" class="predict-save" type="submit">${t.predictSave}</button>
          </div>
        </form>
        <p id="predict-status" class="predict-status"></p>
      </section>
    </header>

    <p id="status" class="status" role="status" aria-live="polite"></p>
    <section id="error" class="error-card" role="alert" hidden>
      <h2 id="error-title" class="error-title"></h2>
      <ul id="error-text" class="error-text"></ul>
      <p id="error-raw" class="error-raw"></p>
    </section>
    <ul id="explanation" class="explanation" aria-live="polite" aria-label="${t.explanation}"></ul>
    <section id="calls" class="calls" aria-labelledby="calls-title" hidden>
      <header class="calls-header">
        <h3 id="calls-title" class="calls-title"></h3>
        <span id="calls-count" class="calls-count"></span>
      </header>
      <ol id="call-stack" class="call-stack"></ol>
      <p id="calls-rule" class="array-rule"></p>
    </section>
    <section id="call-tree" class="arrays heap" aria-label="${t.callTree}" hidden></section>
    <ul id="vars" class="vars" aria-label="${t.variables}"></ul>
    <p id="stats" class="stats" hidden></p>
    <details id="cost" class="cost" hidden>
      <summary id="cost-title"></summary>
      <table class="cost-table"><thead><tr id="cost-head"></tr></thead><tbody id="cost-rows"></tbody></table>
      <p id="cost-program" class="cost-note"></p>
    </details>
    <section id="arrays" class="arrays" aria-label="${t.arrays}"></section>
    <section id="maps" class="arrays heap" aria-label="${t.maps}" hidden></section>
    <section id="heap" class="arrays heap" aria-label="${t.objects}" hidden></section>
    <details id="trace" class="trace" open hidden>
      <summary class="trace-summary"><span id="trace-title" class="trace-title"></span><span id="trace-count" class="trace-count"></span></summary>
      <p id="trace-hidden" class="trace-note" hidden></p>
      <div class="trace-scroll"><table id="trace-table" class="trace-table"></table></div>
    </details>
  </main>
  <script id="strings" type="application/json">${strings}</script>
  <script nonce="${nonce}" src="${js}"></script>
</body>
</html>`;
  }
}

/** Pergunta onde salvar e grava a imagem do passo. */
async function saveImage(base64: string, step: number) {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const name = `code-scope-passo-${step}.png`;
  const target = await vscode.window.showSaveDialog({
    defaultUri: folder ? vscode.Uri.joinPath(folder, name) : vscode.Uri.file(name),
    filters: { PNG: ['png'] },
  });
  if (!target) return;
  await vscode.workspace.fs.writeFile(target, Buffer.from(base64, 'base64'));
  void vscode.window.showInformationMessage(imageSaved(uiLanguage(), target.fsPath));
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
