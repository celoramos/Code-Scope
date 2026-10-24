import * as vscode from 'vscode';
import { readSettings, uiLanguage } from './config';
import { collectSnapshot } from './debug/dapCollector';
import { applyCollectionRoles, pickAdapter } from './debug/adapters';
import { declaredClasses } from './debug/adapters/adapter';
import { evaluateCondition } from './debug/conditionEval';
import { readExceptionInfo, type ExceptionInfoBody } from './debug/exceptionFilters';
import { parseClasses } from './model/classes';
import { applyTextRoles } from './model/text';
import { parseCondition } from './model/condition';
import { registerPauseOnErrors } from './debug/pauseOnErrors';
import { registerStopTracker } from './debug/trackerFactory';
import { makeFrame } from './model/frame';
import { History } from './model/history';
import type { Snapshot } from './model/snapshot';
import type { FromWebview, ScopeViewProvider } from './webview/scopeViewProvider';
import { readError } from './webview/strings';

type SessionState = 'idle' | 'running' | 'ended';

/** Liga o debug ao painel: cada "stopped" vira um passo no histórico. */
export class ScopeController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  readonly history = new History();
  /** Resposta crua do adaptador na última parada; os testes de integração leem daqui. */
  lastRaw: unknown;
  private state: SessionState = 'idle';
  /** Cada parada ganha um número; uma coleta só publica se ainda for a mais recente. */
  private generation = 0;
  /** Abrir o painel na próxima parada (configuração codeScope.revealOnDebug). */
  private revealPending = false;

  constructor(
    private readonly view: ScopeViewProvider,
    private readonly log: vscode.LogOutputChannel,
  ) {
    this.disposables.push(
      registerStopTracker((session, threadId, reason) => void this.onStopped(session, threadId, reason)),
      registerPauseOnErrors(() => readSettings().pauseOnErrors, log),
      view.onMessage((msg) => this.onMessage(msg)),
      vscode.debug.onDidStartDebugSession((s) => void this.onSessionStart(s)),
      vscode.debug.onDidTerminateDebugSession(() => {
        this.generation++;
        this.setState('ended');
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration('codeScope')) return;
        this.sendSettings();
        this.showCurrent();
      }),
      vscode.commands.registerCommand('codeScope.show', () => this.reveal()),
      vscode.commands.registerCommand('codeScope.present', () => this.view.openPresentation()),
      vscode.commands.registerCommand('codeScope.clearHistory', () => {
        this.history.clear();
        this.view.post({ type: 'reset' });
        this.view.post({ type: 'session', state: this.state });
      }),
    );
  }

  private async onSessionStart(session: vscode.DebugSession) {
    this.log.info(`sessão iniciada: ${session.name} (type=${session.type})`);
    // O histórico da sessão anterior fica disponível até aqui.
    this.history.clear();
    this.setState('running');
    this.view.post({ type: 'reset' });
    // Abrir aqui não adianta: logo depois o VS Code troca a barra lateral para
    // "Run and Debug" e cobre o painel. Abre na primeira parada.
    this.revealPending = readSettings().revealOnDebug;
  }

  /** Mostra o painel sem tirar o foco do editor, para o F10 continuar funcionando. */
  private async revealOnFirstStop() {
    if (!this.revealPending) return;
    this.revealPending = false;
    if (this.view.visible) return;
    await this.reveal();
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  private async onStopped(session: vscode.DebugSession, threadId: number | undefined, reason?: string) {
    const gen = ++this.generation;
    try {
      const thread = threadId ?? (await firstThread(session));
      if (thread === undefined) return;
      // O mesmo arquivo serve para achar as classes do aluno e o texto da linha.
      const sources = new Map<string, ReturnType<typeof readSource>>();
      const sourceOf = (file: string) => {
        if (!sources.has(file)) sources.set(file, readSource(file));
        return sources.get(file) as ReturnType<typeof readSource>;
      };
      const collected = await collectSnapshot(session, thread, (file) => pickAdapter(session.type, file), readSettings().limits, {
        userTypes: async (file) => {
          const s = await sourceOf(file);
          return s ? declaredClasses(s.text) : undefined;
        },
        previous: this.history.last(),
      });
      if (!collected) return;
      const snap = collected.snapshot;
      const source = await sourceOf(snap.file);
      snap.code = source?.lines[snap.line - 1]?.trim();
      if (source) applyCollectionRoles(snap, source.text, collected.adapter);
      if (source) applyTextRoles(snap, source.text);
      // Só vale guardar as classes quando alguma herda de outra: é para explicar polimorfismo.
      const classes = source ? parseClasses(source.text) : {};
      if (Object.values(classes).some((c) => c.parent)) snap.classes = classes;
      if (reason === 'exception') snap.exception = await readException(session, thread);
      // A linha parada testa uma condição? Cada parte vira verdadeiro ou falso antes de rodar.
      const parsed = snap.exception ? undefined : parseCondition(snap.code, collected.adapter.id === 'python' ? 'python' : 'c');
      if (parsed) snap.condition = await evaluateCondition(session, collected.raw.frame.id, parsed, snap);
      if (gen !== this.generation) return;
      this.log.debug(`adaptador: ${collected.adapter.id} (sessão ${session.type})`);
      this.log.debug('scopes', JSON.stringify(collected.raw.scopes));
      this.log.debug('locals', JSON.stringify(collected.raw.locals));
      this.log.info('snapshot', JSON.stringify(collected.snapshot));
      this.lastRaw = collected.raw;
      this.history.push(collected.snapshot);
      this.showCurrent();
      await this.revealOnFirstStop();
    } catch (err) {
      if (gen !== this.generation) return;
      this.log.error('falha ao ler variáveis', err instanceof Error ? err : String(err));
      this.view.post({ type: 'error', text: readError(uiLanguage(), err) });
    }
  }

  private onMessage(msg: FromWebview) {
    switch (msg.type) {
      case 'ready':
        // Painel aberto (ou reaberto) depois dos eventos: manda o estado atual.
        this.sendSettings();
        this.view.post({ type: 'session', state: this.state });
        this.showCurrent();
        break;
      case 'back':
        if (this.history.back()) this.showCurrent();
        break;
      case 'forward':
        if (this.history.forward()) this.showCurrent();
        break;
      case 'goto':
        if (this.history.goto(msg.step)) this.showCurrent();
        break;
      case 'focus-editor':
        void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        break;
    }
  }

  private async reveal() {
    await vscode.commands.executeCommand(`${this.view.viewId}.focus`);
  }

  private setState(state: SessionState) {
    this.state = state;
    this.view.post({ type: 'session', state });
  }

  private sendSettings() {
    this.view.post({ type: 'settings', animationSpeed: readSettings().animationSpeed });
  }

  private showCurrent() {
    const step = this.history.current();
    if (step) this.view.post({ type: 'render', frame: makeFrame(step, readSettings().frame) });
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

async function firstThread(session: vscode.DebugSession): Promise<number | undefined> {
  const { threads } = (await session.customRequest('threads')) as { threads: { id: number }[] };
  return threads[0]?.id;
}

/**
 * Tipo e mensagem do erro que parou o programa. Todos os debuggers testados
 * respondem exceptionInfo; se algum não responder, fica só o aviso genérico.
 */
async function readException(session: vscode.DebugSession, threadId: number): Promise<Snapshot['exception']> {
  try {
    return readExceptionInfo((await session.customRequest('exceptionInfo', { threadId })) as ExceptionInfoBody);
  } catch {
    return { type: '', message: '' };
  }
}

/** Texto do arquivo; sem arquivo legível, o painel só mostra o número da linha. */
async function readSource(file: string): Promise<{ text: string; lines: string[] } | undefined> {
  if (!file) return undefined;
  try {
    const text = (await vscode.workspace.openTextDocument(vscode.Uri.file(file))).getText();
    return { text, lines: text.split(/\r?\n/) };
  } catch {
    return undefined;
  }
}
