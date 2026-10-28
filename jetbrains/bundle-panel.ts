/*
 * Gera o painel do plugin JetBrains: um HTML por idioma, com o CSS e o script
 * (src/host/standalone.ts, que traz o painel, o modelo e o coletor) dentro.
 * O plugin carrega esse HTML no JCEF. Roda com: npx tsx jetbrains/bundle-panel.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { panelHtml } from '../src/webview/html';

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'src', 'main', 'resources', 'codescope');

const js = esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'host', 'standalone.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  write: false,
  absWorkingDir: root,
}).outputFiles[0].text;
const css = fs.readFileSync(path.join(root, 'media', 'main.css'), 'utf8');

fs.mkdirSync(out, { recursive: true });
for (const language of ['en', 'pt'] as const) {
  const html = panelHtml({ cspSource: '', cssUri: 'main.css', jsUri: 'main.js', nonce: 'n', present: false, language })
    // O JCEF carrega o HTML de uma string: sem arquivos ao lado, o CSS e o script vão dentro.
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">`)
    .replace('<link rel="stylesheet" href="main.css">', () => `<style id="cs-css">${css}</style>`)
    // O plugin troca este marcador pelas cores do tema da IDE antes de carregar.
    .replace('<html', '<html style="/*theme*/"')
    .replace('<script nonce="n" src="main.js"></script>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
  fs.writeFileSync(path.join(out, `panel-${language}.html`), html);
  console.log(`panel-${language}.html: ${(html.length / 1024).toFixed(0)} KB`);
}
