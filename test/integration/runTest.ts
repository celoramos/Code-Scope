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

  cp.spawnSync(
    cli,
    [...cliArgs, '--extensions-dir', extensionsDir, '--install-extension', 'vscjava.vscode-java-pack'],
    { encoding: 'utf-8', stdio: 'inherit', shell: process.platform === 'win32' },
  );

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
