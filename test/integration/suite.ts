import * as path from 'node:path';
import Mocha from 'mocha';

/** Ponto de entrada que o VS Code de teste chama dentro do extension host. */
export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: false, timeout: 300_000 });
  mocha.addFile(path.join(__dirname, 'java.itest.js'));
  return new Promise((resolve, reject) => {
    mocha.run((failures) => (failures > 0 ? reject(new Error(`${failures} teste(s) falharam`)) : resolve()));
  });
}
