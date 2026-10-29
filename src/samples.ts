import * as vscode from 'vscode';
import { uiLanguage } from './config';
import { sampleStrings } from './webview/strings';

/*
 * "Code Scope: Open a sample": copia os exemplos de uma linguagem (que vão
 * dentro da extensão, em samples/) para uma pasta que a pessoa escolhe e abre
 * essa pasta. Quem acabou de instalar começa com um programa pronto, com o
 * launch.json e o comentário dizendo onde pôr o breakpoint.
 */

/** Linguagens cujos exemplos rodam sem compilar nada antes: só abrir e apertar F5. */
const SAMPLES = [
  { folder: 'java', label: 'Java' },
  { folder: 'javascript', label: 'JavaScript' },
  { folder: 'python', label: 'Python' },
];

export function registerSamples(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('codeScope.openSample', () => openSample(context.extensionUri));
}

async function openSample(extensionUri: vscode.Uri) {
  const t = sampleStrings(uiLanguage());
  const pick = await vscode.window.showQuickPick(
    SAMPLES.map((s) => ({ label: s.label, description: t.debugger[s.folder], sample: s })),
    { title: t.pickLanguage, placeHolder: t.pickLanguage },
  );
  if (!pick) return;
  const parent = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: t.saveHere,
    title: t.pickFolder,
  });
  if (!parent?.[0]) return;

  const target = await copySample(extensionUri, pick.sample.folder, parent[0]);

  // Janela vazia recebe a pasta; com outra pasta aberta, ela vai para uma janela nova.
  const forceNewWindow = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  await vscode.commands.executeCommand('vscode.openFolder', target, { forceNewWindow });
}

/** Copia samples/<folder> para <parent>/code-scope-<folder> e devolve a pasta. */
export async function copySample(extensionUri: vscode.Uri, folder: string, parent: vscode.Uri): Promise<vscode.Uri> {
  const source = vscode.Uri.joinPath(extensionUri, 'samples', folder);
  const target = vscode.Uri.joinPath(parent, `code-scope-${folder}`);
  // Pasta que já existe fica como está: a pessoa pode ter mexido nos exemplos.
  const exists = await vscode.workspace.fs.stat(target).then(() => true, () => false);
  if (!exists) await vscode.workspace.fs.copy(source, target, { overwrite: false });
  return target;
}
