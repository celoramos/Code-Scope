import * as vscode from 'vscode';
import { collectSnapshot } from './debug/dapCollector';
import { registerStopTracker } from './debug/trackerFactory';
import { makeFrame } from './model/frame';
import { History } from './model/history';
import type { FromWebview, ScopeViewProvider } from './webview/scopeViewProvider';

type SessionState = 'idle' | 'running' | 'ended';

/** Liga o debug ao painel: cada "stopped" vira um passo no histórico. */
export class ScopeController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly history = new History();
  private state: SessionState = 'idle';
  /** Cada parada ganha um número; uma coleta só publica se ainda for a mais recente. */
  private generation = 0;

  constructor(
    private readonly view: ScopeViewProvider,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.disposables.push(
      registerStopTracker((session, threadId) => void this.onStopped(session, threadId)),
      view.onMessage((msg) => this.onMessage(msg)),
      vscode.debug.onDidStartDebugSession((s) => {
        this.log.info(`sessão iniciada: ${s.name} (type=${s.type})`);
        // O histórico da sessão anterior fica disponível até aqui.
        this.history.clear();
        this.setState('running');
        this.view.post({ type: 'reset' });
      }),
      vscode.debug.onDidTerminateDebugSession(() => {
        this.generation++;
        this.setState('ended');
      }),
    );
  }

  private async onStopped(session: vscode.DebugSession, threadId: number | undefined) {
    const gen = ++this.generation;
    try {
      const thread = threadId ?? (await firstThread(session));
      if (thread === undefined) return;
      const collected = await collectSnapshot(session, thread);
      if (gen !== this.generation || !collected) return;
      this.log.debug('scopes', JSON.stringify(collected.raw.scopes));
      this.log.debug('locals', JSON.stringify(collected.raw.locals));
      this.log.info('snapshot', JSON.stringify(collected.snapshot));
      this.history.push(collected.snapshot);
      this.showCurrent();
    } catch (err) {
      if (gen !== this.generation) return;
      this.log.error('falha ao ler variáveis', err instanceof Error ? err : String(err));
      this.view.post({ type: 'error', text: `Não consegui ler as variáveis deste passo: ${String(err)}` });
    }
  }

  private onMessage(msg: FromWebview) {
    switch (msg.type) {
      case 'ready':
        // Painel aberto (ou reaberto) depois dos eventos: manda o estado atual.
        this.view.post({ type: 'session', state: this.state });
        this.showCurrent();
        break;
      case 'back':
        if (this.history.back()) this.showCurrent();
        break;
      case 'forward':
        if (this.history.forward()) this.showCurrent();
        break;
    }
  }

  private setState(state: SessionState) {
    this.state = state;
    this.view.post({ type: 'session', state });
  }

  private showCurrent() {
    const step = this.history.current();
    if (step) this.view.post({ type: 'render', frame: makeFrame(step) });
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

async function firstThread(session: vscode.DebugSession): Promise<number | undefined> {
  const { threads } = (await session.customRequest('threads')) as { threads: { id: number }[] };
  return threads[0]?.id;
}
