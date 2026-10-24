import * as vscode from 'vscode';

/*
 * Nenhum dos debuggers testados (Java, js-debug, debugpy) para numa exceção
 * não tratada sem que alguém marque "Uncaught Exceptions" no painel de
 * breakpoints. Sem parar, o aluno só vê o programa terminar com um erro no
 * terminal e o painel nunca mostra onde foi.
 *
 * Aqui, sempre que o VS Code manda os filtros de exceção marcados pelo
 * usuário, mandamos de novo os mesmos filtros mais o de exceções não tratadas.
 * Nada que o usuário marcou é desligado.
 */

import { uncaughtFilter, withFilter, type ExceptionFilter, type SetExceptionBreakpointsArgs } from './exceptionFilters';

interface DapMessage {
  type?: string;
  seq?: number;
  command?: string;
  request_seq?: number;
  arguments?: SetExceptionBreakpointsArgs;
  body?: { exceptionBreakpointFilters?: ExceptionFilter[] };
}

export function registerPauseOnErrors(enabled: () => boolean, log?: vscode.LogOutputChannel): vscode.Disposable {
  return vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker(session) {
      let filters: ExceptionFilter[] = [];
      let fromVsCode: SetExceptionBreakpointsArgs | undefined;
      let pendingSeq: number | undefined;
      let sending = false;

      const resend = () => {
        if (!enabled()) return;
        const id = uncaughtFilter(filters);
        const args = id ? withFilter(fromVsCode, id) : undefined;
        if (!args) return;
        sending = true;
        session.customRequest('setExceptionBreakpoints', args).then(
          () => log?.debug(`pausa em erros ligada (${id}) na sessão ${session.type}`),
          (err) => log?.warn(`não consegui ligar a pausa em erros: ${String(err)}`),
        );
      };

      return {
        onWillReceiveMessage(m: DapMessage) {
          if (m.type !== 'request' || m.command !== 'setExceptionBreakpoints') return;
          // O nosso próprio pedido também passa por aqui; não é o que o usuário marcou.
          if (sending) {
            sending = false;
            return;
          }
          fromVsCode = m.arguments;
          pendingSeq = m.seq;
        },
        onDidSendMessage(m: DapMessage) {
          if (m.type !== 'response') return;
          if (m.command === 'initialize') filters = m.body?.exceptionBreakpointFilters ?? [];
          if (m.command === 'setExceptionBreakpoints' && m.request_seq === pendingSeq) {
            pendingSeq = undefined;
            resend();
          }
        },
      };
    },
  });
}
