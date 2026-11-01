/*
 * Texto da função onde o programa parou. Serve para ler o uso de uma variável
 * só na função dela: dois "itens" em funções diferentes podem ser uma pilha e
 * uma fila. É leitura de texto, não um parser: strings com chaves podem enganar
 * a contagem, e quem chama volta ao arquivo inteiro quando não acha nada.
 */

const CONTROL = /^\s*(?:\}\s*)?(?:else\s+)?(?:if|for|while|switch|catch|try|do|else|synchronized|foreach|using|lock)\b/;
const FUNCTION_HEADER = /(?:\)\s*(?:throws\s+[\w.,\s]+)?\s*$|=>\s*$|^\s*func\b)/;

function pythonFunction(lines: string[], line: number): string | undefined {
  const indent = (s: string) => /^\s*/.exec(s)?.[0].length ?? 0;
  for (let i = Math.min(line, lines.length) - 1; i >= 0; i--) {
    if (!/^\s*(?:async\s+)?def\s/.test(lines[i])) continue;
    // Uma def mais funda que a linha parada é outra função, já fechada.
    if (i !== line - 1 && indent(lines[i]) >= indent(lines[line - 1] ?? '')) continue;
    let end = i + 1;
    while (end < lines.length && (lines[end].trim() === '' || indent(lines[end]) > indent(lines[i]))) end++;
    return lines.slice(i, end).join('\n');
  }
  return undefined;
}

function braceFunction(lines: string[], line: number): string | undefined {
  /** Blocos abertos: linha onde abriu e se o cabeçalho é de função. */
  const open: { start: number; isFunction: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*$/g, '');
    for (let c = 0; c < text.length; c++) {
      if (text[c] === '{') {
        const header = text.slice(0, c);
        open.push({ start: i, isFunction: FUNCTION_HEADER.test(header) && !CONTROL.test(header) });
      } else if (text[c] === '}') {
        const block = open.pop();
        if (block?.isFunction && block.start < line && i + 1 >= line && !open.some((b) => b.isFunction)) {
          return lines.slice(block.start, i + 1).join('\n');
        }
      }
    }
  }
  return undefined;
}

export function enclosingFunction(source: string, line: number, indentBlocks: boolean): string | undefined {
  const lines = source.split(/\r?\n/);
  return indentBlocks ? pythonFunction(lines, line) : braceFunction(lines, line);
}
