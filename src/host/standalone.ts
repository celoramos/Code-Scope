/*
 * O Code Scope inteiro dentro de um navegador embutido (o JCEF das IDEs
 * JetBrains): o painel, o histórico, o modelo e o coletor. A IDE só avisa as
 * paradas e responde as requisições do DAP lendo o depurador dela, então a
 * lógica é a mesma do VS Code, sem uma segunda cópia.
 */
import { onPanelMessage, postToPanel } from './shim';
import '../../media/src/main.js';
import { collectStep, toSource } from '../core/collectStep';
import type { Session } from '../debug/dapCollector';
import { makeFrame, type FrameOptions } from '../model/frame';
import { History } from '../model/history';
import type { Language } from '../model/messages';
import { VALUE_NAMES } from '../model/pointers';
import { readAnimationSpeed } from '../animationSpeed';
import { readError } from '../webview/strings';
import { request, type HostEvent } from './bridge';

const language: Language = document.documentElement.lang.startsWith('pt') ? 'pt' : 'en';
const frameOptions: FrameOptions = { valueNames: VALUE_NAMES, beginnerMode: true, language };
let maxElements = 50;
let animationSpeed = readAnimationSpeed(undefined);

const history = new History();
let state: 'idle' | 'running' | 'ended' = 'idle';
/** Cada parada ganha um número; uma coleta só publica se ainda for a mais recente. */
let generation = 0;

const session: Session = {
  customRequest: (command: string, args?: unknown) => request({ kind: 'dap', command, args }),
};

function showCurrent() {
  const step = history.current();
  if (step) postToPanel({ type: 'render', frame: makeFrame(step, frameOptions) });
}

function setState(s: typeof state) {
  state = s;
  postToPanel({ type: 'session', state: s });
}

async function onStopped(threadId: number | undefined, reason: string | undefined, debugType: string) {
  const gen = ++generation;
  try {
    const step = await collectStep(session, threadId, {
      debugType,
      limits: { maxElements, maxArrays: 20 },
      readSource: async (file) => {
        const text = (await request({ kind: 'source', file })) as string | null;
        return text == null ? undefined : toSource(text);
      },
      previous: history.last(),
      reason,
    });
    if (!step || gen !== generation) return;
    void request({ kind: 'log', level: 'debug', text: `snapshot ${JSON.stringify(step.snapshot)}` });
    history.push(step.snapshot);
    showCurrent();
  } catch (err) {
    if (gen !== generation) return;
    void request({ kind: 'log', level: 'error', text: String(err instanceof Error ? err.stack : err) });
    postToPanel({ type: 'error', text: readError(language, err) });
  }
}

function receive(event: HostEvent) {
  switch (event.type) {
    case 'session-start':
      history.clear();
      postToPanel({ type: 'reset' });
      setState('running');
      break;
    case 'session-end':
      generation++;
      setState('ended');
      break;
    case 'stopped':
      void onStopped(event.threadId, event.reason, event.debugType);
      break;
    case 'settings':
      if (event.maxElements) maxElements = Math.min(Math.max(Math.round(event.maxElements), 1), 500);
      if (event.animationSpeed) animationSpeed = readAnimationSpeed(event.animationSpeed);
      if (event.beginnerMode !== undefined) frameOptions.beginnerMode = event.beginnerMode;
      postToPanel({ type: 'settings', animationSpeed });
      showCurrent();
      break;
  }
}

(window as unknown as { codeScope: unknown }).codeScope = { receive };
// A IDE espera este aviso para mandar os eventos guardados (início da sessão, paradas).
void request({ kind: 'ready' }).catch(() => {});

onPanelMessage((msg) => {
  switch (msg.type) {
    case 'ready':
      postToPanel({ type: 'settings', animationSpeed });
      postToPanel({ type: 'session', state });
      showCurrent();
      break;
    case 'back':
      if (history.back()) showCurrent();
      break;
    case 'forward':
      if (history.forward()) showCurrent();
      break;
    case 'goto':
      if (history.goto(msg.step)) showCurrent();
      break;
    case 'focus-editor':
      void request({ kind: 'focus-editor' });
      break;
    case 'export-css':
      // O CSS já está na página, num <style>: a imagem leva o mesmo.
      postToPanel({ type: 'css', text: document.getElementById('cs-css')?.textContent ?? '' });
      break;
    case 'save-image':
      void request({ kind: 'save-image', data: msg.data, step: msg.step });
      break;
  }
});
