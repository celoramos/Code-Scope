/*
 * Ponte com uma IDE que não é o VS Code (o plugin JetBrains). A IDE injeta
 * window.__codeScopeSend, que leva uma requisição em JSON para o lado dela e
 * responde por callback; aqui ela vira uma Promise.
 */

/** Requisições que o painel faz para a IDE. */
export type HostRequest =
  /** O script do painel começou a rodar: a IDE pode mandar os eventos. */
  | { kind: 'ready' }
  /** Uma requisição do Debug Adapter Protocol, respondida pela IDE a partir do depurador dela. */
  | { kind: 'dap'; command: string; args?: unknown }
  /** Texto do arquivo-fonte. */
  | { kind: 'source'; file: string }
  /** Depois do palpite, o foco volta ao editor. */
  | { kind: 'focus-editor' }
  /** Imagem do passo em PNG base64. */
  | { kind: 'save-image'; data: string; step: number }
  /** O CSS do painel, para montar a imagem do passo. */
  | { kind: 'css' }
  | { kind: 'log'; level: 'debug' | 'error'; text: string };

/** Eventos que a IDE manda para o painel, chamando window.codeScope.receive. */
export type HostEvent =
  | { type: 'session-start' }
  | { type: 'session-end' }
  | { type: 'stopped'; threadId?: number; reason?: string; debugType: string }
  | { type: 'settings'; animationSpeed?: string; maxElements?: number; beginnerMode?: boolean };

type Send = (request: string, onSuccess: (response: string) => void, onFailure: (code: number, message: string) => void) => void;

declare global {
  interface Window {
    __codeScopeSend?: Send;
  }
}

export function request(req: HostRequest): Promise<unknown> {
  const send = window.__codeScopeSend;
  if (!send) return Promise.reject(new Error('IDE não conectada'));
  return new Promise((resolve, reject) =>
    send(
      JSON.stringify(req),
      (res) => resolve(res ? JSON.parse(res) : undefined),
      (_code, message) => reject(new Error(message)),
    ),
  );
}
