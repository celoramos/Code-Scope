// Só regras que acham erro; o estilo fica por conta de quem escreve.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'out-test/**', 'node_modules/**', '.vscode-test/**', 'samples/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Promise esquecida no handler de um evento do VS Code engole o erro sem log.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Os testes imitam o debugger com objetos soltos; a descoberta deixa cenários prontos para ligar.
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['test/integration/discover.itest.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: ['media/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        acquireVsCodeApi: 'readonly',
        getComputedStyle: 'readonly',
        CSS: 'readonly',
        XMLSerializer: 'readonly',
        Image: 'readonly',
      },
    },
  },
  {
    files: ['*.js', '*.mjs'],
    languageOptions: { globals: { require: 'readonly', process: 'readonly', console: 'readonly', __dirname: 'readonly', module: 'writable' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
