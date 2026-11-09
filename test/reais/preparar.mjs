// Baixa os programas de test/reais/casos.json, no commit fixado, e escreve um driver por caso:
// poucas linhas que chamam a função real com dados fixos. O teste reais.itest.ts para no driver
// e entra na função com F11. Grava test/reais/plano.json com o arquivo, a linha e a classe de cada caso.
//
// Só roda no CI (ou com --forcar): os arquivos do Java vão direto para samples/java, a pasta que o
// VS Code de teste abre, para o language server compilar tudo junto. A lista do que foi escrito fica
// em test/reais/gerados.txt, e a próxima rodada apaga esses arquivos antes de começar.
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
if (!process.env.CI && !process.argv.includes('--forcar')) {
  console.error('preparar.mjs escreve em samples/; rode no CI, ou passe --forcar.');
  process.exit(1);
}

const { repos, casos } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'casos.json'), 'utf8'));
const pastas = {
  python: path.join(root, 'samples', 'python', 'reais'),
  javascript: path.join(root, 'samples', 'javascript', 'reais'),
  java: path.join(root, 'samples', 'java'),
};

// O que a rodada anterior escreveu sai antes; os exemplos do projeto ficam.
const gerados = path.join(import.meta.dirname, 'gerados.txt');
if (fs.existsSync(gerados)) {
  for (const file of fs.readFileSync(gerados, 'utf8').split('\n').filter(Boolean)) fs.rmSync(path.join(root, file), { force: true });
}
fs.mkdirSync(pastas.python, { recursive: true });
fs.mkdirSync(pastas.javascript, { recursive: true });

// samples/java tem os exemplos do projeto: um arquivo baixado com o mesmo nome apagaria um deles.
const escritos = new Set();
function escrever(file, texto) {
  if (fs.existsSync(file) && !escritos.has(file)) throw new Error(`${path.relative(root, file)} já existe; troque o caso em casos.json`);
  escritos.add(file);
  fs.writeFileSync(file, texto);
  fs.writeFileSync(gerados, [...escritos].map((f) => path.relative(root, f)).join('\n') + '\n');
}

// Os arquivos do TheAlgorithms/JavaScript usam import e export.
escrever(path.join(pastas.javascript, 'package.json'), '{ "type": "module" }\n');

async function baixar(lang, arquivo) {
  const { url, commit } = repos[lang];
  const resposta = await fetch(`${url}/${commit}/${arquivo}`);
  if (!resposta.ok) throw new Error(`${lang} ${arquivo}: HTTP ${resposta.status}`);
  let texto = await resposta.text();
  // Sem o package, a classe fica no pacote padrão, junto do driver.
  if (lang === 'java') texto = texto.replace(/^package [\w.]+;\s*$/m, '');
  escrever(path.join(pastas[lang], path.basename(arquivo)), texto);
}

const camel = (id) => id.split('-').slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const plano = [];
for (const caso of casos) {
  for (const arquivo of caso.arquivos) await baixar(caso.lang, arquivo);
  if (caso.lang === 'java') {
    const classe = `Rodar${camel(caso.id)}`;
    const corpo = caso.linhas.map((l) => `        ${l}`).join('\n');
    const file = path.join(pastas.java, `${classe}.java`);
    escrever(file, `public class ${classe} {\n    public static void main(String[] args) {\n${corpo}\n    }\n}\n`);
    // O driver tem duas linhas antes do corpo (a da classe e a do main); fim é o "}" que fecha o main.
    plano.push({ id: caso.id, lang: caso.lang, file, line: caso.pare + 2, fim: caso.linhas.length + 3, mainClass: classe });
  } else {
    const nome = `rodar_${caso.id.replace(/-/g, '_')}.${caso.lang === 'python' ? 'py' : 'js'}`;
    const file = path.join(pastas[caso.lang], nome);
    escrever(file, caso.linhas.join('\n') + '\n');
    plano.push({ id: caso.id, lang: caso.lang, file, line: caso.pare });
  }
}
// Programas do próprio projeto (test/corpus/<linguagem>/<caso>/), do iniciante ao avançado, com
// vários arquivos quando o caso pede. O arquivo com "@pare" é o programa: o breakpoint vai nessa linha.
// No Java, cada caso é um pacote (corpus.<caso>) e "@fim" marca o "}" que fecha o main.
const corpus = path.join(import.meta.dirname, '..', 'corpus');
const prefixo = { python: 'py', java: 'java', javascript: 'js' };
for (const lang of Object.keys(prefixo)) {
  const base = path.join(corpus, lang);
  if (!fs.existsSync(base)) continue;
  for (const caso of fs.readdirSync(base).sort()) {
    const origem = path.join(base, caso);
    const destino = lang === 'java' ? path.join(pastas.java, 'corpus', caso) : path.join(pastas[lang], caso);
    fs.mkdirSync(destino, { recursive: true });
    let entrada;
    for (const nome of fs.readdirSync(origem).sort()) {
      const texto = fs.readFileSync(path.join(origem, nome), 'utf8');
      const file = path.join(destino, nome);
      escrever(file, texto);
      const linhas = texto.split(/\r?\n/);
      const pare = linhas.findIndex((l) => l.includes('@pare'));
      if (pare < 0) continue;
      const fim = linhas.findIndex((l) => l.includes('@fim'));
      entrada = { id: `${prefixo[lang]}-corpus-${caso}`, lang, file, line: pare + 1 };
      if (lang === 'java') Object.assign(entrada, { fim: fim + 1, mainClass: `corpus.${caso}.${path.basename(nome, '.java')}` });
    }
    if (!entrada) throw new Error(`test/corpus/${lang}/${caso}: nenhum arquivo marca a linha com @pare`);
    // Programa de iniciante usa require: a pasta do caso não herda o "type": "module" dos baixados.
    if (lang === 'javascript' && !fs.existsSync(path.join(origem, 'package.json'))) escrever(path.join(destino, 'package.json'), '{ "type": "commonjs" }\n');
    plano.push(entrada);
  }
}

fs.writeFileSync(path.join(import.meta.dirname, 'plano.json'), JSON.stringify(plano, null, 2));
console.log(`${plano.length} casos prontos.`);
