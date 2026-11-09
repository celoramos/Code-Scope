import { enclosingFunction } from './enclosing';

/*
 * Array do C que chega como ponteiro: o int v[] da função de ordenar (que vira int *), o
 * vetor de malloc. O debugger só mostra o endereço e o primeiro item, porque o tamanho não
 * mora no ponteiro. Ele mora no código: no parâmetro inteiro ao lado ("int v[], int n") ou na
 * conta do malloc ("malloc(n * sizeof(int))"). Daqui sai a expressão do tamanho, que o coletor
 * pergunta ao debugger na hora.
 *
 * Leitura de texto, como enclosing.ts: um palpite errado só faz a pergunta falhar.
 */

const IDENT = '[A-Za-z_]\\w*';
const INTEGER_PARAM = /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:int|long|short|long\s+long|size_t|ssize_t|unsigned)\s+([A-Za-z_]\w*)$/;
/** Ponteiro ou array de número ("int *v", "double notas[]", "float v[10]"); char * é texto, não entra. */
const ARRAY_PARAM = /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:int|long|short|long\s+long|float|double|size_t|bool|_Bool)\s*(?:\*\s*([A-Za-z_]\w*)|([A-Za-z_]\w*)\s*\[\s*(\w*)\s*\])$/;

/** Separa por vírgulas que não estão dentro de parênteses, colchetes ou chaves. */
function splitTop(text: string): string[] {
  const parts: string[] = [];
  let level = 0;
  let current = '';
  for (const ch of text) {
    if ('([{'.includes(ch)) level++;
    else if (')]}'.includes(ch)) level--;
    if (ch === ',' && level === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Texto dentro dos parênteses que abrem em start. */
function balanced(text: string, start: number): string | undefined {
  let level = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '(') level++;
    else if (text[i] === ')' && --level === 0) return text.slice(start + 1, i);
  }
  return undefined;
}

/** "n * sizeof(int)" e "sizeof(int) * n" viram "n"; só sizeof, sem quantidade, é um item só. */
function countOf(bytes: string): string | undefined {
  const factors: string[] = [];
  let level = 0;
  let current = '';
  for (const ch of bytes) {
    if (ch === '(') level++;
    else if (ch === ')') level--;
    if (ch === '*' && level === 0) {
      factors.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  factors.push(current.trim());
  const count = factors.filter((f) => f && !/^sizeof\b/.test(f));
  return count.length > 0 && count.length < factors.length ? count.join(' * ') : undefined;
}

/** Tamanhos vindos de malloc, calloc, realloc e new[] no arquivo inteiro: "v" => "n". */
function allocations(source: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = new RegExp(`\\b(${IDENT})\\s*=\\s*(?:\\([^()]*\\)\\s*)?(malloc|calloc|realloc)\\s*\\(`, 'g');
  for (const m of source.matchAll(re)) {
    const args = balanced(source, (m.index ?? 0) + m[0].length - 1);
    if (args === undefined) continue;
    const parts = splitTop(args);
    const count = m[2] === 'calloc' ? parts.find((p) => !/^sizeof\b/.test(p)) : countOf(m[2] === 'realloc' ? (parts[1] ?? '') : (parts[0] ?? ''));
    if (count) out.set(m[1], count);
  }
  // C++: int *v = new int[n];
  for (const m of source.matchAll(new RegExp(`\\b(${IDENT})\\s*=\\s*new\\s+[\\w:<>\\s]+\\[([^\\]]+)\\]`, 'g'))) out.set(m[1], m[2].trim());
  return out;
}

/** Parâmetros da função parada que são array, com o inteiro que diz o tamanho: "v" => "n". */
function parameters(functionText: string): Map<string, string> {
  const out = new Map<string, string>();
  const open = functionText.indexOf('(');
  const params = open >= 0 ? balanced(functionText, open) : undefined;
  if (params === undefined) return out;
  const list = splitTop(params).map((p) => p.replace(/\s+/g, ' ').trim());
  const integers = list.map((p, i) => ({ i, name: INTEGER_PARAM.exec(p)?.[1] })).filter((p): p is { i: number; name: string } => !!p.name);
  list.forEach((p, i) => {
    const m = ARRAY_PARAM.exec(p);
    if (!m) return;
    const name = m[1] ?? m[2];
    // "float v[10]": o próprio tipo diz. Senão, o inteiro logo depois do array, ou o de antes.
    if (m[3] && /^\d+$/.test(m[3])) return void out.set(name, m[3]);
    const size = integers.find((n) => n.i > i) ?? [...integers].reverse().find((n) => n.i < i);
    if (size) out.set(name, size.name);
  });
  return out;
}

/** Expressão do tamanho de cada ponteiro que é array, na linha parada: "v" => "n". */
export function pointerLengths(source: string, line: number): Map<string, string> {
  const found = allocations(source);
  const fn = enclosingFunction(source, line, false);
  if (fn) for (const [name, size] of parameters(fn)) found.set(name, size);
  return found;
}
