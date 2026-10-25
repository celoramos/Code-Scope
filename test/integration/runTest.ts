import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import * as path from 'node:path';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from '@vscode/test-electron';

/*
 * Roda a extensão dentro de um VS Code isolado (baixado em .vscode-test/),
 * com o Java Extension Pack instalado só nele, e debuga os samples de verdade.
 * O VS Code do usuário não é tocado.
 */
async function main() {
  const root = path.resolve(__dirname, '../..');
  const extensionsDir = path.join(root, '.vscode-test', 'extensions');
  // CODE_SCOPE_VSCODE escolhe a versão (o CI testa a mínima do engines).
  const vscodePath = await downloadAndUnzipVSCode(process.env.CODE_SCOPE_VSCODE ?? 'stable');
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);

  // C# e C/C++ só entram quando há com o que compilar: um .NET e um gcc portáteis em
  // .vscode-test (ou os do sistema, no CI). Sem eles, esses testes são pulados.
  const tools = path.join(root, '.vscode-test');
  const extraPath = [path.join(tools, 'dotnet'), path.join(tools, 'w64devkit', 'bin')].filter((p) => fs.existsSync(p));
  if (extraPath.length > 0) process.env.PATH = [...extraPath, process.env.PATH].join(path.delimiter);
  if (fs.existsSync(path.join(tools, 'dotnet'))) process.env.DOTNET_ROOT = path.join(tools, 'dotnet');
  const has = (cmd: string) => cp.spawnSync(cmd, ['--version'], { shell: process.platform === 'win32' }).status === 0;
  // CODE_SCOPE_EXTENSIONS troca a lista (separada por vírgula; vazia instala nada), para rodar só
  // algumas linguagens sem baixar o Java Extension Pack.
  const only = process.env.CODE_SCOPE_EXTENSIONS;
  const extensions = only !== undefined ? only.split(',').filter(Boolean) : ['vscjava.vscode-java-pack', 'ms-python.debugpy'];
  if (only === undefined && has('dotnet')) extensions.push('ms-dotnettools.csharp');
  if (only === undefined && has('gcc') && has('gdb')) extensions.push('ms-vscode.cpptools');

  // Sem extensão para instalar, o CLI abriria uma janela do VS Code; com ela aberta,
  // versões antigas (1.90) se recusam a rodar os testes.
  if (extensions.length > 0) {
    cp.spawnSync(cli, [...cliArgs, '--extensions-dir', extensionsDir, ...extensions.flatMap((e) => ['--install-extension', e])], {
      encoding: 'utf-8',
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }

  await runTests({
    vscodeExecutablePath: vscodePath,
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(root, 'out-test', 'suite.js'),
    launchArgs: [
      path.join(root, 'samples', 'java'),
      '--extensions-dir',
      extensionsDir,
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
    ],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
