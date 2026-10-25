const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** Opções do script do painel; o teste do painel (test/webview.test.ts) empacota com as mesmas. */
const webview = {
  entryPoints: ['media/src/main.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
};

async function main() {
  const contexts = await Promise.all([
    esbuild.context({
      entryPoints: ['src/extension.ts'],
      bundle: true,
      format: 'cjs',
      minify: production,
      sourcemap: !production,
      platform: 'node',
      outfile: 'dist/extension.js',
      external: ['vscode'],
      logLevel: 'info',
    }),
    esbuild.context({
      ...webview,
      minify: production,
      sourcemap: !production,
      outfile: 'dist/webview.js',
      logLevel: 'info',
    }),
  ]);
  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { webview };
