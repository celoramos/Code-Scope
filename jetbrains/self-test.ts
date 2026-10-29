/*
 * Compara os snapshots que o plugin montou no IntelliJ (build/self-test/<Classe>.json)
 * com os do VS Code para o mesmo exemplo (out-test/<Classe>.json, do teste de integração).
 * O mesmo programa parado nas mesmas linhas tem de desenhar a mesma coisa.
 * Uso: npx tsx jetbrains/self-test.ts BubbleSort
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Snapshot } from '../src/model/snapshot';

const root = path.resolve(__dirname, '..');
const name = process.argv[2];
const raw = fs.readFileSync(path.join(__dirname, 'build', 'self-test', `${name}.json`), 'utf8');
if (raw.startsWith('ERRO')) {
  console.error(raw);
  process.exit(1);
}
const ide: Snapshot[] = JSON.parse(raw);
// Referência do VS Code: o teste de integração mais recente (out-test) ou, sem ele (no CI), os snapshots versionados.
const dump = path.join(root, 'out-test', `${name}.json`);
const code: Snapshot[] = fs.existsSync(dump) && !process.env.CODE_SCOPE_FIXTURES
  ? JSON.parse(fs.readFileSync(dump, 'utf8')).snapshots
  : JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'panel', `${name}.json`), 'utf8'));

// O que o painel desenha; ids de objeto e caminhos de arquivo mudam de um debugger para o outro.
function view(s: Snapshot) {
  return {
    line: s.line,
    code: s.code,
    arrays: s.arrays.map((a) => ({ name: a.name, kind: a.kind, values: a.values, rows: a.rows?.map((r) => r.values) })),
    // "⎯►fib()" é o valor que a chamada devolveu, que o Java Debugger do VS Code mostra depois do
    // F7 e o IntelliJ não (limite conhecido do plugin, no README): fica fora da comparação.
    pointers: s.pointers.filter((p) => !p.name.startsWith('⎯►')).map((p) => `${p.name}=${p.value}`).sort(),
    scalars: (s.scalars ?? []).map((v) => `${v.name}=${v.value}`).sort(),
    maps: (s.maps ?? []).map((m) => ({ name: m.name, entries: m.entries })),
    calls: s.calls?.map((c) => c.name),
    condition: s.condition?.parts?.map((p) => `${p.text}=${p.value}`),
    exception: s.exception?.type,
  };
}

// O F8 dos dois debuggers nem sempre para nas mesmas linhas: o do IntelliJ para no "}"
// que fecha um if, o do VS Code pula. Parada que só um teve fica de fora da comparação.
let diffs = 0;
let compared = 0;
const extra: string[] = [];
let i = 0;
let j = 0;
while (i < ide.length && j < code.length) {
  if (ide[i].line !== code[j].line) {
    if (ide[i + 1]?.line === code[j].line) {
      extra.push(`IntelliJ parou também na linha ${ide[i].line} (passo ${i + 1})`);
      i++;
      continue;
    }
    if (code[j + 1]?.line === ide[i].line) {
      extra.push(`VS Code parou também na linha ${code[j].line} (passo ${j + 1})`);
      j++;
      continue;
    }
  }
  compared++;
  const a = JSON.stringify(view(ide[i]));
  const b = JSON.stringify(view(code[j]));
  if (a !== b) {
    diffs++;
    console.log(`passo ${i + 1} (VS Code ${j + 1}) difere\n  IntelliJ: ${a}\n  VS Code:  ${b}`);
  }
  i++;
  j++;
}
extra.forEach((e) => console.log(`  ${e}`));
console.log(`${name}: ${compared} passos comparados (IntelliJ ${ide.length}, VS Code ${code.length}), ${diffs} diferentes`);
process.exit(diffs === 0 && compared > 0 ? 0 : 1);
