import * as path from 'node:path';
import Mocha from 'mocha';

/** Ponto de entrada que o VS Code de teste chama dentro do extension host. */
export function run(): Promise<void> {
  // CODE_SCOPE_GREP roda só os testes cujo nome bate, por exemplo "JavaScript".
  const mocha = new Mocha({ ui: 'bdd', color: false, timeout: 300_000, grep: process.env.CODE_SCOPE_GREP });
  mocha.addFile(path.join(__dirname, 'python.itest.js'));
  mocha.addFile(path.join(__dirname, 'javascript.itest.js'));
  mocha.addFile(path.join(__dirname, 'java.itest.js'));
  mocha.addFile(path.join(__dirname, 'discover.itest.js'));
  return new Promise((resolve, reject) => {
    mocha.run((failures) => (failures > 0 ? reject(new Error(`${failures} teste(s) falharam`)) : resolve()));
  });
}
