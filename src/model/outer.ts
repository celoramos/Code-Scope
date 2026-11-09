/*
 * Variáveis de fora da função parada que a função usa: a lista global que registrar() muda, o
 * static int[] memo da Fibonacci com memória, o int v[100] global do C. O debugger lista só as
 * locais; sem isto, dentro da função o aluno não via a estrutura que ela estava mudando.
 *
 * É leitura de texto, como enclosing.ts: acha nomes, não entende o programa. Um nome a mais só
 * custa uma pergunta ao debugger que não acha nada; um nome a menos deixa a variável de fora.
 */

const IDENT = /[\p{L}_$][\p{L}\p{N}_$]*/gu;

/**
 * Tira strings e comentários: "total" dentro de um texto não é uso da variável total. No Python o
 * comentário é # e // é divisão; nos outros, // e /* são comentário e #saldo é campo privado.
 */
function code(text: string, python = false): string {
  const strings = text
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '""')
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  return python ? strings.replace(/#[^\n]*/g, ' ') : strings.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** Nomes que a função usa, sem os que vêm depois de um ponto (self.total, obj.campo). */
export function usedNames(functionText: string, python = false): Set<string> {
  const text = code(functionText, python);
  const names = new Set<string>();
  for (const m of text.matchAll(IDENT)) {
    const before = text.slice(0, m.index).trimEnd();
    if (before.endsWith('.') && !before.endsWith('..')) continue;
    names.add(m[0]);
  }
  return names;
}

/** Campos static do Java e do C# ("static long[] memo = ...;", "private static int total;"). */
export function staticFields(source: string): string[] {
  const out = new Set<string>();
  const re = /\bstatic\s+(?:(?:final|readonly|volatile|transient)\s+)*[\p{L}\p{N}_$.<>[\]?,\s]+?\s([\p{L}_$][\p{L}\p{N}_$]*)\s*(?:=(?!=)|;)/gu;
  for (const m of code(source).matchAll(re)) out.add(m[1]);
  return [...out];
}

/** Variáveis de pacote do Go: "var memo = ...", "var total int" e o bloco "var ( ... )". */
export function goGlobals(source: string): string[] {
  const text = code(source);
  const out = new Set<string>();
  let depth = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (depth === 0) {
      const single = /^var\s+([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*)/u.exec(line);
      if (single) single[1].split(',').forEach((n) => out.add(n.trim()));
      if (/^var\s*\(\s*$/.test(line)) {
        for (i++; i < lines.length && !/^\s*\)/.test(lines[i]); i++) {
          const m = /^\s*([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*)/u.exec(lines[i]);
          if (m) m[1].split(',').forEach((n) => out.add(n.trim()));
        }
        continue;
      }
    }
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth = Math.max(0, depth - 1);
    }
  }
  return [...out];
}

const C_NOT_DECLARATION = /^(?:typedef|return|using|namespace|template|extern\s+"C")\b/;

/**
 * Variáveis globais do C e do C++: o que é declarado fora de toda função e de todo struct
 * ("int v[100];", "struct No *inicio = NULL;", "int a, b = 2;"). Protótipos e typedefs ficam de fora.
 */
export function cGlobals(source: string): string[] {
  const text = code(source.replace(/^\s*#.*$/gm, ''));
  const out = new Set<string>();
  let depth = 0;
  let statement = '';
  /** Texto antes da chave que abriu o bloco atual, no nível de fora. */
  let head = '';
  for (const ch of text) {
    if (ch === '{') {
      if (depth === 0) head = statement;
      depth++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      // Corpo de função (o cabeçalho tem parênteses e não é inicialização): o que vem depois é outra declaração.
      if (depth === 0 && /\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->[^=]*)?$/.test(head.trim()) && !head.includes('=')) statement = '';
      continue;
    }
    if (depth > 0) continue;
    if (ch === ';') {
      declarators(statement).forEach((n) => out.add(n));
      statement = '';
      continue;
    }
    statement += ch;
  }
  return [...out];
}

/** Nomes declarados num comando do nível de fora: "int a, *b, c[3] = {0}" vira a, b, c. */
function declarators(statement: string): string[] {
  const s = statement.trim();
  if (!s || C_NOT_DECLARATION.test(s)) return [];
  const parts: string[] = [];
  let level = 0;
  let current = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) level++;
    else if (')]}'.includes(ch)) level--;
    if (ch === ',' && level === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  const names: string[] = [];
  for (const part of parts) {
    const declarator = part.split(/=(?!=)/)[0];
    // Protótipo ("int soma(int a, int b)") ou ponteiro de função: não é variável que o painel desenha.
    if (declarator.includes('(')) return [];
    const bare = declarator.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '');
    const words = bare.match(/[\p{L}_][\p{L}\p{N}_]*/gu);
    const name = words?.at(-1);
    if (name && words!.length >= (names.length === 0 ? 2 : 1) && !C_TYPE_WORDS.has(name)) names.push(name);
  }
  return names;
}

const C_TYPE_WORDS = new Set(['int', 'char', 'float', 'double', 'long', 'short', 'void', 'unsigned', 'signed', 'const', 'static', 'struct', 'union', 'enum', 'bool', 'auto', 'volatile']);
