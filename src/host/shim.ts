/*
 * O painel (media/src) fala com o VS Code por acquireVsCodeApi().postMessage.
 * Fora do VS Code, este módulo entra antes do painel e entrega essas mensagens
 * ao controlador do host, em vez de a uma extensão.
 */
import type { FromWebview, ToWebview } from '../webview/scopeViewProvider';

type Listener = (msg: FromWebview) => void;
let listener: Listener | undefined;
const pending: FromWebview[] = [];

/** Recebe o que o painel manda; mensagens enviadas antes disso ficam guardadas. */
export function onPanelMessage(l: Listener) {
  listener = l;
  pending.splice(0).forEach(l);
}

/** Envia ao painel, como o VS Code faz com webview.postMessage. */
export function postToPanel(msg: ToWebview | { type: 'css'; text: string }) {
  window.dispatchEvent(new MessageEvent('message', { data: msg }));
}

let state: unknown;
(window as unknown as { acquireVsCodeApi: unknown }).acquireVsCodeApi = () => ({
  postMessage(msg: FromWebview) {
    if (listener) listener(msg);
    else pending.push(msg);
  },
  getState: () => state,
  setState: (s: unknown) => (state = s),
});
