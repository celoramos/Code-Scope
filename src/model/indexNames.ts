/*
 * Quais variáveis inteiras são posição de array, pelo código: as que aparecem
 * dentro de colchetes (v[i], grade[i][j]) e as que entram na conta de uma
 * delas (meio = (inicio + fim) / 2 faz inicio e fim também serem posição).
 * Só essas viram seta embaixo do array; soma = 2 não aponta para a posição 2.
 */

const KEYWORDS = new Set([
  'int', 'long', 'short', 'byte', 'var', 'let', 'const', 'new', 'return', 'true', 'false', 'null', 'None', 'True', 'False',
  'length', 'len', 'size', 'Math', 'floor', 'math', 'this', 'self', 'in', 'and', 'or', 'not', 'for', 'if', 'while',
]);

/** Identificadores de uma expressão, sem métodos (seguidos de "(") e sem campos (depois de "."). */
function identifiers(expr: string): string[] {
  const out: string[] = [];
  for (const m of expr.matchAll(/(?<![.\w])([A-Za-z_]\w*)\b(?!\s*\()/g)) {
    if (!KEYWORDS.has(m[1])) out.push(m[1]);
  }
  return out;
}

export function indexNames(source: string): Set<string> {
  const code = source.replace(/\/\/.*$|#.*$/gm, '').replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""');
  const names = new Set<string>();
  // Dentro de colchetes de acesso (v[i], v[i + 1]); "int[] v" e "[1, 2]" não têm nome antes do "[".
  for (const m of code.matchAll(/[\w\])]\s*\[([^[\]]+)\]/g)) for (const id of identifiers(m[1])) names.add(id);
  // Listas e textos recebem a posição por método: get(i), charAt(i), pop(i); set(i, x), add(i, x), insert(i, x).
  for (const m of code.matchAll(/\.(?:get|charAt|pop)\(\s*([^,()]+?)\s*\)/g)) for (const id of identifiers(m[1])) names.add(id);
  for (const m of code.matchAll(/\.(?:set|add|insert)\(\s*([^,()]+?)\s*,/g)) for (const id of identifiers(m[1])) names.add(id);

  // Atribuições: "meio = (inicio + fim) / 2", "int fim = v.length - 1", "i += 1".
  const assignments: [string, string][] = [];
  for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*(?:[+\-*/]?=)(?!=)\s*([^;\n]+)/g)) assignments.push([m[1], m[2]]);
  // Comparações: "i < numeros.length - 1" (comparado com o tamanho) e "j < numeros.length - 1 - i"
  // (o limite do laço de uma posição) também fazem a variável ser posição.
  const comparisons: [string, string][] = [];
  for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*(?:<=?|>=?)\s*([^;)&|:\n]+)/g)) {
    comparisons.push([m[1], m[2]]);
    if (/\.length\b|\blen\(|\.size\(\)/.test(m[2])) names.add(m[1]);
  }
  // Quem entra na conta de uma posição também é posição; repete até parar de crescer.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [left, right] of comparisons) {
      if (!names.has(left)) continue;
      for (const id of identifiers(right.replace(/\[[^\]]*\]/g, ''))) {
        if (!names.has(id)) {
          names.add(id);
          grew = true;
        }
      }
    }
    for (const [target, expr] of assignments) {
      if (!names.has(target)) continue;
      // O valor lido de um array (soma = v[i]) não é posição: só o que está fora dos colchetes conta.
      for (const id of identifiers(expr.replace(/\[[^\]]*\]/g, ''))) {
        if (!names.has(id)) {
          names.add(id);
          grew = true;
        }
      }
    }
  }
  return names;
}
