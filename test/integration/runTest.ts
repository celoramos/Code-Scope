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
  const vscodePath = await downloadAndUnzipVSCode('stable');
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodePath);

  // C# e C/C++ só entram quando há com o que compilar: um .NET e um gcc portáteis em
  // .vscode-test (ou os do sistema, no CI). Sem eles, esses testes são pulados.
  const tools = path.join(root, '.vscode-test');
  const extraPath = [path.join(tools, 'dotnet'), path.join(tools, 'w64devkit', 'bin')].filter((p) => fs.existsSync(p));
  if (extraPath.length > 0) process.env.PATH = [...extraPath, process.env.PATH].join(path.delimiter);
  if (fs.existsSync(path.join(tools, 'dotnet'))) process.env.DOTNET_ROOT = path.join(tools, 'dotnet');
  const has = (cmd: string) => cp.spawnSync(cmd, ['--version'], { shell: process.platform === 'win32' }).status === 0;
  const extensions = ['vscjava.vscode-java-pack', 'ms-python.debugpy'];
  if (has('dotnet')) extensions.push('ms-dotnettools.csharp');
  if (has('gcc') && has('gdb')) extensions.push('ms-vscode.cpptools');

  cp.spawnSync(cli, [...cliArgs, '--extensions-dir', extensionsDir, ...extensions.flatMap((e) => ['--install-extension', e])], {
    encoding: 'utf-8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

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
