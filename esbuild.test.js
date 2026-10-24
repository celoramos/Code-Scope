const esbuild = require('esbuild');

// Testes de integração rodam dentro do extension host, então viram CommonJS como a extensão.
esbuild
  .build({
    entryPoints: ['test/integration/suite.ts', 'test/integration/java.itest.ts', 'test/integration/javascript.itest.ts', 'test/integration/python.itest.ts', 'test/integration/discover.itest.ts', 'test/integration/csharp.itest.ts', 'test/integration/c.itest.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outdir: 'out-test',
    external: ['vscode', 'mocha'],
    sourcemap: true,
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
