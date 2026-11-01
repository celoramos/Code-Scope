/*
 * Sem o debugger da linguagem, o F5 não tem como rodar e o painel fica vazio sem
 * dizer por quê. Aqui mora qual extensão cada tipo de arquivo precisa; JavaScript
 * e TypeScript ficam de fora porque o debugger já vem no editor.
 */

export interface DebuggerNeed {
  extensions: readonly string[];
  /** Qualquer uma destas resolve (nos forks, as abertas substituem as da Microsoft). */
  ids: readonly string[];
  /** O que sugerir para instalar. */
  install: string;
  label: string;
}

export const DEBUGGERS: readonly DebuggerNeed[] = [
  { extensions: ['.java'], ids: ['vscjava.vscode-java-debug'], install: 'vscjava.vscode-java-pack', label: 'Extension Pack for Java' },
  { extensions: ['.py'], ids: ['ms-python.debugpy'], install: 'ms-python.python', label: 'Python' },
  { extensions: ['.cs'], ids: ['ms-dotnettools.csharp', 'muhammad-sammy.csharp'], install: 'ms-dotnettools.csharp', label: 'C#' },
  { extensions: ['.c', '.h', '.cpp', '.cc', '.cxx', '.hpp'], ids: ['ms-vscode.cpptools', 'vadimcn.vscode-lldb'], install: 'ms-vscode.cpptools', label: 'C/C++' },
  { extensions: ['.go'], ids: ['golang.go'], install: 'golang.go', label: 'Go' },
];

/** O debugger que falta para este arquivo, se faltar. */
export function missingDebugger(file: string, isInstalled: (id: string) => boolean): DebuggerNeed | undefined {
  const lower = file.toLowerCase();
  const need = DEBUGGERS.find((d) => d.extensions.some((ext) => lower.endsWith(ext)));
  return need && !need.ids.some(isInstalled) ? need : undefined;
}
