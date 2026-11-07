import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, samplesRoot } from './helpers';

/*
 * Programas de repositórios abertos (TheAlgorithms), baixados por test/reais/preparar.mjs no
 * workflow reais.yml. Cada caso para no driver e entra na função real com F11. O teste falha
 * quando o painel mostra texto interno do debugger no lugar de um valor; o resto se confere
 * lendo os dumps out-test/reais-*.json.
 */
interface Caso {
  id: string;
  lang: 'python' | 'java' | 'javascript';
  file: string;
  line: number;
  mainClass?: string;
}

const planoFile = path.resolve(samplesRoot, '..', 'test', 'reais', 'plano.json');
const plano: Caso[] = fs.existsSync(planoFile) ? JSON.parse(fs.readFileSync(planoFile, 'utf8')) : [];
const python = process.env.CODE_SCOPE_PYTHON ?? path.resolve(samplesRoot, '..', '.vscode-test', 'python', 'python.exe');
const PASSOS = 40;

/** Texto que o debugger usa por dentro e que o aluno nunca escreveu. */
const LIXO: [RegExp, string][] = [
  [/\b[\w$.]+@[0-9a-f]{4,}\b/, 'identidade de objeto do Java'],
  [/object at 0x[0-9a-f]+/, 'repr padrão do Python'],
  [/\[\[Prototype\]\]/, 'protótipo do JavaScript'],
  [/^\?$/, 'valor não lido'],
  [/\bjava\.util\.[A-Z]/, 'nome interno de classe do Java'],
];

/** Todos os valores desenhados no passo, com o caminho de onde vieram. */
function valores(node: unknown, onde: string, out: { onde: string; valor: string }[]): void {
  if (Array.isArray(node)) {
    node.forEach((n, k) => valores(n, `${onde}[${k}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [chave, v] of Object.entries(node)) {
      if (['value', 'values', 'key', 'to', 'from'].includes(chave)) {
        for (const s of Array.isArray(v) ? v : [v]) if (typeof s === 'string') out.push({ onde: `${onde}.${chave}`, valor: s });
      }
      if (chave !== 'code') valores(v, `${onde}.${chave}`, out);
    }
  }
}

function config(caso: Caso): vscode.DebugConfiguration {
  const name = `Reais ${caso.id}`;
  if (caso.lang === 'java') return { type: 'java', request: 'launch', name, mainClass: caso.mainClass };
  if (caso.lang === 'python') {
    return { type: 'debugpy', request: 'launch', name, program: caso.file, cwd: path.dirname(caso.file), python, debugAdapterPython: python, debugLauncherPython: python, console: 'internalConsole' };
  }
  return { type: 'node', request: 'launch', name, program: caso.file, cwd: path.dirname(caso.file), skipFiles: ['<node_internals>/**'] };
}

async function rodar(caso: Caso): Promise<Snapshot[]> {
  const snaps = await debugFile({
    file: caso.file,
    breakpointLine: caso.line,
    steps: PASSOS,
    step: 'stepInto',
    config: config(caso),
    dump: `reais-${caso.id}`,
    async before() {
      if (caso.lang !== 'java') return;
      const java = vscode.extensions.getExtension('redhat.java');
      const javaApi = (await java?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
      await javaApi?.serverReady?.();
    },
  });
  allChanges(snaps);
  const achados: string[] = [];
  snaps.forEach((s, k) => {
    const out: { onde: string; valor: string }[] = [];
    valores(s, '', out);
    for (const { onde, valor } of out) {
      for (const [re, motivo] of LIXO) if (re.test(valor)) achados.push(`passo ${k + 1}, ${onde}: ${motivo}: ${valor.slice(0, 80)}`);
    }
  });
  const tipos = new Set(snaps.flatMap((s) => s.arrays.map((a) => a.kind ?? (a.rows ? 'matriz' : 'array'))));
  console.log(`REAIS ${caso.id}: ${snaps.length} passos, coleções ${[...tipos].join(' ') || 'nenhuma'}, ${achados.length} achados`);
  assert.deepEqual([...new Set(achados)].slice(0, 20), [], `${caso.id}: o painel mostrou texto interno`);
  return snaps;
}

describe('Reais', function () {
  this.timeout(600_000);
  before(function () {
    if (plano.length === 0) this.skip();
  });
  for (const caso of plano) {
    it(caso.id, async function () {
      if (caso.lang === 'python' && !fs.existsSync(python)) this.skip();
      await rodar(caso);
    });
  }
});
