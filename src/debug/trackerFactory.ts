import * as vscode from 'vscode';

export type StopListener = (session: vscode.DebugSession, threadId: number | undefined) => void;

/** Escuta o evento "stopped" de qualquer adaptador de debug. */
export function registerStopTracker(onStopped: StopListener): vscode.Disposable {
  return vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker(session) {
      return {
        onDidSendMessage(message: { type?: string; event?: string; body?: { threadId?: number } }) {
          if (message.type === 'event' && message.event === 'stopped') {
            onStopped(session, message.body?.threadId);
          }
        },
      };
    },
  });
}
