import type { ClassInfo } from './classes';
import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/*
 * Identidade e igualdade: "é o mesmo objeto?" e "tem o mesmo conteúdo?" são
 * perguntas diferentes, e cada linguagem escolhe um operador para cada uma.
 * O == do Java entre dois textos iguais dá falso; o equals de uma classe que
 * não escreveu equals também. Quando a condição faz uma dessas perguntas, a
 * frase diz qual foi feita, com os dois lados que o painel já desenha.
 */

type Lang = 'java' | 'js' | 'python' | 'csharp';

/** O que o painel sabe de um lado da comparação. */
interface Side {
  kind: 'object' | 'array' | 'map' | 'text';
  /** Identidade na memória; texto não tem. */
  id?: string;
  /** Conteúdo resumido: dois lados com a mesma assinatura têm o mesmo conteúdo. */
  content: string;
  /** Classe do objeto (só para kind 'object'). */
  type?: string;
}

interface Comparison {
  a: string;
  b: string;
  /** Operador como está no código: "==", "!=", "===", "!==", "is", "is not", "equals". */
  op: string;
  /** O operador pergunta o contrário (!=, is not, !a.equals(b)). */
  negated: boolean;
}

function languageOf(file: string): Lang | undefined {
  if (/\.java$/i.test(file)) return 'java';
  if (/\.[cm]?[jt]sx?$/i.test(file)) return 'js';
  if (/\.py$/i.test(file)) return 'python';
  if (/\.cs$/i.test(file)) return 'csharp';
  return undefined;
}

const NAME = '[A-Za-z_$][\\w$]*';
const OPERATOR = new RegExp(`^(${NAME})\\s*(===|!==|==|!=)\\s*(${NAME})$`);
const IS = new RegExp(`^(${NAME})\\s+(is not|is)\\s+(${NAME})$`);
const EQUALS = new RegExp(`^(!?)\\s*(${NAME})\\.(equals|Equals)\\(\\s*(${NAME})\\s*\\)$`);

function parseComparison(part: string): Comparison | undefined {
  const text = part.trim();
  let m = EQUALS.exec(text);
  if (m) return { a: m[2], b: m[4], op: 'equals', negated: m[1] === '!' };
  m = IS.exec(text);
  if (m) return { a: m[1], b: m[3], op: m[2], negated: m[2] === 'is not' };
  m = OPERATOR.exec(text);
  if (m) return { a: m[1], b: m[3], op: m[2], negated: m[2].startsWith('!') };
  return undefined;
}

function sideOf(name: string, s: Snapshot): Side | undefined {
  const ref = s.refs?.find((r) => r.name === name);
  if (ref) {
    const obj = ref.ref ? s.heap?.find((o) => o.id === ref.ref) : undefined;
    if (!obj || obj.truncated) return undefined;
    const content = obj.fields.map((f) => `${f.name}=${f.ref !== undefined ? `@${f.ref}` : f.value}`).join(',');
    return { kind: 'object', id: obj.id, content: `${obj.type}{${content}}`, type: obj.type };
  }
  const arr = s.arrays.find((a) => a.name === name);
  if (arr) {
    if (arr.length > arr.values.length) return undefined;
    return { kind: arr.kind === 'text' ? 'text' : 'array', id: arr.kind === 'text' ? undefined : arr.id, content: arr.values.join('\u0000') };
  }
  const map = s.maps?.find((m) => m.name === name);
  if (map) {
    if (map.length > map.entries.length) return undefined;
    return { kind: 'map', id: map.id, content: map.entries.map((e) => `${e.key}:${e.value}`).sort().join('\u0000') };
  }
  const scalar = s.scalars?.find((v) => v.name === name);
  if (scalar && /^(["']).*\1$/s.test(scalar.value)) return { kind: 'text', content: scalar.value.slice(1, -1) };
  return undefined;
}

/** A classe (ou uma de cima) escreve o método: equals, Equals ou __eq__. */
function writes(classes: Record<string, ClassInfo> | undefined, cls: string | undefined, method: string): boolean {
  const seen = new Set<string>();
  for (let c = cls; c && classes?.[c] && !seen.has(c); c = classes[c].parent) {
    seen.add(c);
    if (classes[c].methods.includes(method)) return true;
  }
  return false;
}

/** O operador, nesta linguagem e com estes lados, pergunta "mesmo objeto?" (true) ou "mesmo conteúdo?" (false). */
function asksIdentity(lang: Lang, c: Comparison, side: Side, classes: Snapshot['classes']): boolean {
  if (c.op === 'is' || c.op === 'is not') return true;
  if (lang === 'python') return side.kind === 'object' && !writes(classes, side.type, '__eq__');
  if (c.op === 'equals') {
    if (side.kind === 'text' || side.kind === 'map') return false;
    if (side.kind === 'array') return true;
    // Classe que o aluno escreveu sem equals: vale o equals de Object, que é o ==.
    return Boolean(classes?.[side.type ?? '']) && !writes(classes, side.type, lang === 'csharp' ? 'Equals' : 'equals');
  }
  // ==, !=, === e !==: texto é comparado pelo conteúdo no JavaScript e no C#, e pela identidade no Java.
  return side.kind !== 'text' || lang === 'java';
}

/** Frases sobre as comparações de identidade e igualdade da condição deste passo. */
export function samenessNotes(s: Snapshot, language: Language): string[] {
  const c = s.condition;
  const lang = languageOf(s.file);
  if (!c || !lang) return [];
  const m = MESSAGES[language];
  const out: string[] = [];
  for (const part of c.parts) {
    if (part.value === undefined) continue;
    const cmp = parseComparison(part.text);
    if (!cmp) continue;
    const a = sideOf(cmp.a, s);
    const b = sideOf(cmp.b, s);
    if (!a || !b || a.kind !== b.kind) continue;
    const same = cmp.negated ? !part.value : part.value;
    const sameContent = a.content === b.content;
    const sameObject = a.id !== undefined && a.id === b.id;
    const expr = part.text.trim();

    // equals, e o == do Python, foram feitos para o conteúdo; quando caem na identidade, a culpa é da classe.
    const meantContent = cmp.op === 'equals' || (lang === 'python' && (cmp.op === '==' || cmp.op === '!='));
    if (asksIdentity(lang, cmp, a, s.classes)) {
      if (meantContent && !same && sameContent) {
        out.push(a.kind === 'array' ? m.arrayEqualsIsIdentity(expr, cmp.a, cmp.b, lang) : m.equalsNotWritten(expr, a.type ?? '', lang));
      } else if (!same && sameContent) {
        out.push(m.identityTrap(expr, part.value, cmp.a, cmp.b, fixFor(lang, cmp, a, s.classes)));
      } else if (same && a.kind === 'text' && lang === 'java') {
        out.push(m.stringPool(expr, cmp.a, cmp.b));
      } else if (same && sameObject) {
        out.push(m.identitySame(expr, cmp.a, cmp.b));
      }
    } else if (same && !sameObject && (a.id !== undefined || b.id !== undefined || (a.kind === 'array' && sameContent))) {
      // Arrays iguais sem id já foram perguntados ao debugger (linkSameArrays): se fossem o mesmo, teriam id.
      out.push(m.contentEqual(expr, cmp.a, cmp.b, identityOp(lang, cmp)));
    }
  }
  return out;
}

/** Como perguntar pelo conteúdo, nesta linguagem; undefined quando não há um jeito pronto. */
function fixFor(lang: Lang, c: Comparison, side: Side, classes: Snapshot['classes']): string | undefined {
  const not = c.negated;
  if (lang === 'python') return side.kind === 'object' && !writes(classes, side.type, '__eq__') ? undefined : `${c.a} ${not ? '!=' : '=='} ${c.b}`;
  if (lang === 'java') {
    if (side.kind === 'array') return `${not ? '!' : ''}Arrays.equals(${c.a}, ${c.b})`;
    if (side.kind === 'object' && !writes(classes, side.type, 'equals')) return undefined;
    return `${not ? '!' : ''}${c.a}.equals(${c.b})`;
  }
  if (lang === 'csharp') {
    if (side.kind === 'array') return `${not ? '!' : ''}${c.a}.SequenceEqual(${c.b})`;
    if (side.kind === 'object' && !writes(classes, side.type, 'Equals')) return undefined;
    return `${not ? '!' : ''}${c.a}.Equals(${c.b})`;
  }
  return undefined;
}

/** O operador que faria a outra pergunta ("é o mesmo objeto?"), para a frase do conteúdo igual. */
function identityOp(lang: Lang, c: Comparison): string {
  if (lang === 'python') return `${c.a} is ${c.b}`;
  if (lang === 'js') return `${c.a} === ${c.b}`;
  return `${c.a} == ${c.b}`;
}
