import * as vscode from 'vscode';
import { uiLanguage, type AnimationSpeed } from '../config';
import type { Frame } from '../model/frame';
import { panelHtml } from './html';
import { fileSaved } from './strings';

/** Mensagens que a extensão envia para o painel. */
export type ToWebview =
  | { type: 'render'; frame: Frame }
  | { type: 'session'; state: 'idle' | 'running' | 'ended' }
  | { type: 'settings'; animationSpeed: AnimationSpeed }
  | { type: 'reset' }
  | { type: 'error'; text: string }
  /** Nenhum passo combina com a busca. */
  | { type: 'find-miss'; query: string }
  /** O arquivo aberto precisa de um debugger que não está instalado. */
  | { type: 'debugger'; missing?: { id: string; label: string } };

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
  | { type: 'save-image'; data: string; step: number }
  /** A execução em GIF, em base64. */
  | { type: 'save-gif'; data: string }
  | { type: 'save-session' }
  /** Abre uma sessão salva; com compare, ela só entra na comparação. */
  | { type: 'open-session'; compare: boolean }
  | { type: 'compare-close' }
  | { type: 'install-debugger'; id: string }
  /** Próximo (dir 1) ou anterior (dir -1) passo que combina com a busca. */
  | { type: 'find'; query: string; dir: 1 | -1 };

/** Respostas que só o painel que perguntou recebe. */
type Reply = { type: 'css'; text: string };

export class ScopeViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'codeScope.panel';
  readonly viewId = ScopeViewProvider.viewId;

  private view?: vscode.WebviewView;
  /** Modo apresentação: o mesmo painel, grande, na área do editor. */
  private presentation?: vscode.WebviewPanel;

  get visible(): boolean {
    return (this.view?.visible ?? false) || (this.presentation?.visible ?? false);
  }
  private readonly messages = new vscode.EventEmitter<FromWebview>();
  /** O painel avisa "ready" ao carregar; quem escuta reenvia o estado atual. */
  readonly onMessage = this.messages.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** O script do painel, empacotado de media/src pelo esbuild.js. */
  private get dist() {
    return vscode.Uri.joinPath(this.extensionUri, 'dist');
  }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media, this.dist] };
    view.webview.html = this.html(view.webview, media, false);
    view.webview.onDidReceiveMessage((msg: FromWebview) => this.receive(view.webview, msg));
    view.onDidDispose(() => (this.view = undefined));
  }

  /** Abre (ou traz para a frente) o modo apresentação ao lado do código. */
  openPresentation() {
    if (this.presentation) {
      this.presentation.reveal(vscode.ViewColumn.Beside);
      return;
    }
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const panel = vscode.window.createWebviewPanel('codeScope.presentation', 'Code Scope', vscode.ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [media, this.dist],
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
    else if (msg.type === 'save-image') void saveFile(Buffer.from(msg.data, 'base64'), `code-scope-passo-${msg.step}.png`, { PNG: ['png'] });
    else if (msg.type === 'save-gif') void saveFile(Buffer.from(msg.data, 'base64'), 'code-scope.gif', { GIF: ['gif'] });
    else this.messages.fire(msg);
  }

  private async sendCss(webview: vscode.Webview) {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.dist, 'main.css'));
    const reply: Reply = { type: 'css', text: new TextDecoder().decode(bytes) };
    void webview.postMessage(reply);
  }

  private html(webview: vscode.Webview, media: vscode.Uri, present: boolean): string {
    return panelHtml({
      cspSource: webview.cspSource,
      cssUri: webview.asWebviewUri(vscode.Uri.joinPath(this.dist, 'main.css')).toString(),
      jsUri: webview.asWebviewUri(vscode.Uri.joinPath(this.dist, 'webview.js')).toString(),
      nonce: makeNonce(),
      present,
      language: uiLanguage(),
    });
  }
}

/** Pergunta onde salvar e grava o arquivo. */
export async function saveFile(bytes: Uint8Array, name: string, filters: Record<string, string[]>) {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const target = await vscode.window.showSaveDialog({
    defaultUri: folder ? vscode.Uri.joinPath(folder, name) : vscode.Uri.file(name),
    filters,
  });
  if (!target) return;
  await vscode.workspace.fs.writeFile(target, bytes);
  void vscode.window.showInformationMessage(fileSaved(uiLanguage(), target.fsPath));
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
