import { evalIndex } from './indexExpr';
import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * A condição da linha onde o programa parou, antes de ela rodar: o if, o
 * while, o elif ou o meio do for. Ela é quebrada nas partes ligadas por && e
 * || (and e or no Python), e cada parte vai virar verdadeiro ou falso no
 * painel, com os valores no lugar dos nomes ("3 < 5").
 */

export type Syntax = 'c' | 'python';

export interface ParsedCondition {
  keyword: 'if' | 'elif' | 'while' | 'for';
  /** A condição inteira, como está no código. */
  text: string;
  parts: string[];
  /** Operador entre cada parte e a seguinte: "&&" ou "||" (and/or viram estes). */
  ops: ('&&' | '||')[];
}

export interface ConditionPart {
  text: string;
  /** O texto com os valores do passo no lugar dos nomes, quando dá para saber. */
  values?: string;
  /** undefined: não foi avaliada (insegura, deu erro ou o curto-circuito pulou). */
  value?: boolean;
  /** O curto-circuito decidiu antes desta parte: ela nem roda. */
  skipped?: boolean;
}

export interface ConditionInfo {
  keyword: ParsedCondition['keyword'];
  line: number;
  text: string;
  parts: ConditionPart[];
  ops: ParsedCondition['ops'];
  result?: boolean;
}

/** Frases do modo iniciante sobre a condição que vai ser testada. */
export function explainCondition(c: ConditionInfo | undefined, language: Language): string[] {
  if (!c || c.result === undefined) return [];
  const m = MESSAGES[language];
  const out = [m.conditionResult(c.keyword, c.line, c.result)];
  // A última parte avaliada antes das puladas foi a que decidiu.
  const firstSkipped = c.parts.findIndex((p) => p.skipped);
  const decider = firstSkipped > 0 ? c.parts[firstSkipped - 1] : undefined;
  if (decider?.value !== undefined) out.push(m.shortCircuit(decider.text, decider.value));
  return out;
}

/** Acha a condição da linha; undefined se a linha não testa nada. */
export function parseCondition(code: string | undefined, syntax: Syntax): ParsedCondition | undefined {
  if (!code) return undefined;
  const line = code.trim();
  let keyword: ParsedCondition['keyword'];
  let text: string | undefined;

  if (syntax === 'python') {
    const m = /^(if|elif|while)\s+(.+):\s*(#.*)?$/.exec(line);
    if (!m) return undefined;
    keyword = m[1] as ParsedCondition['keyword'];
    text = m[2].trim();
  } else {
    const m = /^(?:\}\s*)?(?:else\s+)?(if|while|for)\s*\(/.exec(line);
    if (!m) return undefined;
    keyword = m[1] as ParsedCondition['keyword'];
    const inside = balanced(line, m[0].length - 1);
    if (inside === undefined) return undefined;
    if (keyword === 'for') {
      // for (init; condição; passo). O for-each (x : lista, x of lista) não testa nada.
      const pieces = splitTop(inside, [';']).parts;
      if (pieces.length !== 3) return undefined;
      text = pieces[1].trim();
    } else {
      text = inside.trim();
    }
  }
  if (!text) return undefined;
  const { parts, ops } = splitTop(text, syntax === 'python' ? [' and ', ' or '] : ['&&', '||']);
  return {
    keyword,
    text,
    parts: parts.map((p) => stripParens(p.trim())),
    ops: ops.map((o) => (o.trim() === 'and' || o === '&&' ? '&&' : '||')),
  };
}

/** Funções e métodos que só leem: avaliar não muda nada no programa. */
const PURE_CALL =
  /^(len|abs|min|max|str|int|float|bool|ord|chr|Math\.(abs|max|min|floor|ceil|round|sqrt))$|\.(size|length|isEmpty|equals|equalsIgnoreCase|charAt|get|getOrDefault|containsKey|containsValue|contains|includes|has|startsWith|endsWith|indexOf|toLowerCase|toUpperCase|trim|compareTo|peek|isdigit|isalpha|isupper|islower|lower|upper|strip|keys|values)$/;

/**
 * A parte pode ser avaliada pelo debugger sem efeito colateral: sem
 * atribuição, sem ++/--, sem new e só com chamadas que leem.
 */
export function isSafe(part: string): boolean {
  const code = part.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
  if (/\+\+|--|\bnew\b|\bdel\b|\bawait\b|\byield\b|=>|:=/.test(code)) return false;
  // "=" sozinho é atribuição; ==, !=, <=, >=, === e !== são comparações.
  if (/(^|[^=!<>])=(?!=)/.test(code)) return false;
  for (const m of code.matchAll(/([A-Za-z_$][\w$.]*)\s*\(/g)) {
    const callee = m[1];
    const method = callee.includes('.') ? `.${callee.split('.').pop()}` : callee;
    if (!PURE_CALL.test(method) && !PURE_CALL.test(callee)) return false;
  }
  return true;
}

/** O texto da parte com os valores conhecidos no lugar dos nomes: "numeros[j] > numeros[j + 1]" vira "5 > 1". */
export function substitute(part: string, s: Snapshot): string | undefined {
  const values = new Map<string, string>([
    ...s.pointers.map((p): [string, string] => [p.name, String(p.value)]),
    ...(s.scalars ?? []).map((v): [string, string] => [v.name, v.value]),
  ]);
  const lengths = new Map(s.arrays.map((a) => [a.name, a.length]));
  const arrays = new Map(s.arrays.map((a) => [a.name, a]));
  let changed = false;
  let out = part.replace(/([A-Za-z_$][\w$]*)\s*\[([^[\]]+)\]/g, (whole, name: string, expr: string) => {
    const arr = arrays.get(name);
    const i = arr ? evalIndex(expr, s) : undefined;
    if (!arr || i === undefined || i < 0 || i >= arr.values.length) return whole;
    changed = true;
    return arr.values[i];
  });
  out = out.replace(/\blen\s*\(\s*([A-Za-z_$][\w$]*)\s*\)|([A-Za-z_$][\w$]*)\s*\.\s*(?:length\b(?!\s*\()|size\s*\(\s*\))/g, (whole, a?: string, b?: string) => {
    const n = lengths.get((a ?? b) as string);
    if (n === undefined) return whole;
    changed = true;
    return String(n);
  });
  out = out.replace(/(["'`])(?:\\.|(?!\1).)*\1|[A-Za-z_$][\w$]*/g, (token) => {
    if (/^["'`]/.test(token) || !values.has(token)) return token;
    changed = true;
    return values.get(token) as string;
  });
  return changed && out !== part ? out : undefined;
}

/**
 * Junta os valores das partes como a linguagem faz, da esquerda para a
 * direita, com && antes de ||. undefined quando falta alguma parte decisiva.
 */
export function combine(values: (boolean | undefined)[], ops: ('&&' | '||')[]): boolean | undefined {
  // Grupos de && separados por ||.
  const groups: (boolean | undefined)[][] = [[values[0]]];
  ops.forEach((op, k) => (op === '||' ? groups.push([values[k + 1]]) : groups[groups.length - 1].push(values[k + 1])));
  let unknown = false;
  for (const g of groups) {
    if (g.some((v) => v === false)) continue;
    if (g.every((v) => v === true)) return true;
    unknown = true;
  }
  return unknown ? undefined : false;
}

/** Texto entre o "(" na posição open e o ")" que fecha ele. */
function balanced(text: string, open: number): string | undefined {
  let depth = 0;
  let quote: string | undefined;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return undefined;
}

/** Parte o texto nos separadores que estão fora de parênteses, colchetes e aspas. */
function splitTop(text: string, seps: string[]): { parts: string[]; ops: string[] } {
  const parts: string[] = [];
  const ops: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0) {
      const sep = seps.find((s) => text.startsWith(s, i));
      if (sep) {
        parts.push(text.slice(start, i));
        ops.push(sep);
        i += sep.length - 1;
        start = i + 1;
      }
    }
  }
  parts.push(text.slice(start));
  return { parts, ops };
}

/** "(i < n)" vira "i < n" quando os parênteses envolvem a parte inteira. */
function stripParens(part: string): string {
  if (part.startsWith('(') && balanced(part, 0)?.length === part.length - 2) return part.slice(1, -1).trim();
  return part;
}
