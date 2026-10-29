import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { copySample } from '../../src/samples';

describe('Abrir um exemplo', () => {
  it('copia os exemplos com o launch.json e não sobrescreve o que a pessoa mudou', async () => {
    const ext = vscode.extensions.all.find((e) => e.packageJSON.name === 'code-scope');
    assert.ok(ext, 'extensão não encontrada');
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('codeScope.openSample'), 'comando codeScope.openSample não registrado');

    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'code-scope-sample-'));
    for (const lang of ['java', 'javascript', 'python']) {
      const target = await copySample(ext.extensionUri, lang, vscode.Uri.file(parent));
      // O VS Code escreve o drive em minúscula (c:); o Node, em maiúscula.
      assert.equal(target.fsPath.toLowerCase(), path.join(parent, `code-scope-${lang}`).toLowerCase());
      assert.ok(fs.existsSync(path.join(target.fsPath, '.vscode', 'launch.json')), `${lang} sem launch.json`);
    }
    const java = path.join(parent, 'code-scope-java', 'BubbleSort.java');
    assert.ok(fs.readFileSync(java, 'utf8').includes('class BubbleSort'));

    fs.writeFileSync(java, '// mudado pela pessoa');
    await copySample(ext.extensionUri, 'java', vscode.Uri.file(parent));
    assert.equal(fs.readFileSync(java, 'utf8'), '// mudado pela pessoa');
    fs.rmSync(parent, { recursive: true, force: true });
  });

  it('o tour de primeiro uso abre', async () => {
    const ext = vscode.extensions.all.find((e) => e.packageJSON.name === 'code-scope');
    assert.ok(ext);
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', `${ext.id}#start`, false);
    // CODE_SCOPE_STEP_DELAY segura o tour na tela, para conferir ou gravar.
    await new Promise((r) => setTimeout(r, Number(process.env.CODE_SCOPE_STEP_DELAY ?? 0)));
  });
});
