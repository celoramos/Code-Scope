import * as vscode from 'vscode';
import { collectSnapshot } from './debug/dapCollector';
import { registerStopTracker } from './debug/trackerFactory';
import type { ScopeViewProvider } from './webview/scopeViewProvider';

/** Liga o debug ao painel: cada "stopped" vira um snapshot. */
export class ScopeController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  /** Cada parada ganha um número; uma coleta só publica se ainda for a mais recente. */
  private generation = 0;

  constructor(
    private readonly view: ScopeViewProvider,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.disposables.push(
      registerStopTracker((session, threadId) => void this.onStopped(session, threadId)),
      vscode.debug.onDidStartDebugSession((s) => {
        this.log.info(`sessão iniciada: ${s.name} (type=${s.type})`);
        this.view.post({ type: 'status', text: 'Sessão iniciada. Aguardando um breakpoint.' });
      }),
      vscode.debug.onDidTerminateDebugSession(() => {
        this.generation++;
        this.view.post({ type: 'status', text: 'Sessão encerrada.' });
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
      this.view.post({ type: 'render', frame: { snapshot: collected.snapshot } });
    } catch (err) {
      if (gen !== this.generation) return;
      this.log.error('falha ao ler variáveis', err instanceof Error ? err : String(err));
      this.view.post({ type: 'status', text: `Não consegui ler as variáveis: ${String(err)}` });
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

async function firstThread(session: vscode.DebugSession): Promise<number | undefined> {
  const { threads } = (await session.customRequest('threads')) as { threads: { id: number }[] };
  return threads[0]?.id;
}
