import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Snapshot } from '../../src/model/snapshot';
import { allChanges, debugFile, lastRaws, lastRunEnded, samplesRoot } from './helpers';

/*
 * Programas de repositórios abertos (TheAlgorithms), baixados por test/reais/preparar.mjs no
 * workflow reais.yml. Cada caso para no driver, entra na função real com F11 e vai até o fim do
 * programa. O teste falha quando o programa não termina, quando um passo sai sem arquivo ou quando
 * o painel mostra texto interno do debugger no lugar de um valor; o resto se confere lendo os dumps
 * out-test/reais-*.json.
 */
interface Caso {
  id: string;
  lang: 'python' | 'java' | 'javascript';
  file: string;
  line: number;
  /** Java: a linha do "}" que fecha o main do driver; dali o programa segue até o fim. */
  fim?: number;
  mainClass?: string;
}

const planoFile = path.resolve(samplesRoot, '..', 'test', 'reais', 'plano.json');
const plano: Caso[] = fs.existsSync(planoFile) ? JSON.parse(fs.readFileSync(planoFile, 'utf8')) : [];
const python = process.env.CODE_SCOPE_PYTHON ?? path.resolve(samplesRoot, '..', '.vscode-test', 'python', 'python.exe');
/** Passos de F11 até desistir; os 33 casos terminam bem antes. */
const PASSOS = Number(process.env.CODE_SCOPE_REAIS_PASSOS ?? 600);

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

type Crua = { name: string; value: string; type?: string };

/** Variáveis que o debugger mostra e que não são do aluno, ou que o painel não deve desenhar. */
function naoEDoAluno(lang: Caso['lang'], v: Crua): boolean {
  if (lang === 'python') {
    return /^(special|function|class) variables$/.test(v.name) || /^__\w+__$/.test(v.name) || ['module', 'function', 'type', 'builtin_function_or_method', 'method'].includes(v.type ?? '');
  }
  if (lang === 'javascript') {
    if (['exports', 'require', 'module', '__filename', '__dirname'].includes(v.name)) return true;
    if (v.name === 'this') return !/^\w+ \{/.test(v.value) || /^(global|Window|Object|Module) \{/.test(v.value);
    return v.type === 'function' || v.value.startsWith('class ');
  }
  // O args vazio do main.
  return v.name === 'args' && /^String\[0\]/.test(v.value);
}

/**
 * Variáveis do programa que nenhum passo desenhou: a lista ligada de uma classe de outro arquivo,
 * o BigInteger, o array recebido por ponteiro. Cada uma sai uma vez, com o tipo e o valor.
 */
function invisiveis(lang: Caso['lang'], snaps: Snapshot[]): string[] {
  const achadas = new Map<string, string>();
  for (const { index, raw } of lastRaws) {
    const s = snaps[index];
    const locais = (raw as { locals?: Crua[] } | undefined)?.locals;
    if (!s || !locais) continue;
    const desenhadas = new Set([
      ...s.arrays.map((a) => a.name.replace(/\[.*$/, '')),
      ...s.pointers.map((p) => p.name),
      ...(s.scalars ?? []).map((x) => x.name),
      ...(s.refs ?? []).map((r) => r.name),
      ...(s.maps ?? []).map((m) => m.name),
      ...(s.caught ? [s.caught.name] : []),
    ]);
    for (const v of locais) {
      if (desenhadas.has(v.name) || naoEDoAluno(lang, v) || achadas.has(v.name)) continue;
      achadas.set(v.name, `${v.name} (${v.type ?? '?'}: ${String(v.value).slice(0, 60)})`);
    }
  }
  return [...achadas.values()];
}

function config(caso: Caso): vscode.DebugConfiguration {
  const name = `Reais ${caso.id}`;
  // No corpus, o F11 não entra no código do JDK (ArrayList.add, Collections.sort): o programa é o do aluno.
  if (caso.lang === 'java') return { type: 'java', request: 'launch', name, mainClass: caso.mainClass, ...(caso.id.includes('-corpus-') ? { stepFilters: { skipClasses: ['$JDK'] } } : {}) };
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
    // No Java, depois do main vem o encerramento da JVM: dali, segue sem parar. Nos outros, o programa acaba sozinho.
    until: (s) => caso.fim !== undefined && path.basename(s.file) === path.basename(caso.file) && s.line >= caso.fim,
    async before() {
      if (caso.lang !== 'java') return;
      const java = vscode.extensions.getExtension('redhat.java');
      const javaApi = (await java?.activate()) as { serverReady?: () => Promise<boolean> } | undefined;
      await javaApi?.serverReady?.();
    },
  });
  const fim = lastRunEnded;
  allChanges(snaps);
  const semArquivo = snaps.findIndex((s) => !s.file || s.line <= 0);
  const achados: string[] = [];
  snaps.forEach((s, k) => {
    const out: { onde: string; valor: string }[] = [];
    valores(s, '', out);
    for (const { onde, valor } of out) {
      for (const [re, motivo] of LIXO) if (re.test(valor)) achados.push(`passo ${k + 1}, ${onde}: ${motivo}: ${valor.slice(0, 80)}`);
    }
  });
  const tipos = new Set(snaps.flatMap((s) => s.arrays.map((a) => a.kind ?? (a.rows ? 'matriz' : 'array'))));
  console.log(`REAIS ${caso.id}: ${snaps.length} passos, ${fim ? 'até o fim' : 'NÃO TERMINOU'}, coleções ${[...tipos].join(' ') || 'nenhuma'}, ${achados.length} achados`);
  const sumidas = invisiveis(caso.lang, snaps);
  if (sumidas.length > 0) console.log(`INVISIVEIS ${caso.id}: ${sumidas.join('; ')}`);
  assert.ok(fim, `${caso.id}: o programa não terminou em ${PASSOS} passos`);
  assert.equal(semArquivo, -1, `${caso.id}: o passo ${semArquivo + 1} saiu sem arquivo`);
  assert.deepEqual([...new Set(achados)].slice(0, 20), [], `${caso.id}: o painel mostrou texto interno`);
  return snaps;
}

describe('Reais', function () {
  this.timeout(1_200_000);
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
