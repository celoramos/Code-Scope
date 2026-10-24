/**
 * Explica o caminho que o programa tomou entre duas paradas, olhando só para
 * o texto das linhas: "if", "for" e "while" no começo da linha. Vale para a
 * família de C (Java, JavaScript, C#, C, Go), para Python ("elif") e para
 * Rust e Kotlin, que escrevem os laços do mesmo jeito. Linguagens com outra
 * forma de laço ("loop", "repeat") só não ganham a frase de fluxo.
 */

import { MESSAGES, type Language } from './messages';

export interface LineRef {
  line: number;
  code?: string;
}

const CONDITION = /^(?:\}\s*)?(?:else\s+if|elif|if)\b/;
const LOOP = /^(?:for|while)\b/;

export function explainFlow(executed: LineRef | undefined, next: LineRef, language: Language = 'pt'): string | undefined {
  const m = MESSAGES[language];
  const code = executed?.code;
  if (!executed || code === undefined) return undefined;

  if (/^break\b/.test(code)) return m.flowBreak;

  if (LOOP.test(next.code ?? '') && next.line < executed.line) {
    return m.flowLoopEnd(next.line);
  }

  // Pular para a linha seguinte é entrar no bloco; pular mais adiante é passar por cima dele.
  const entered = next.line === executed.line + 1;
  const skipped = next.line > executed.line + 1;

  if (CONDITION.test(code)) {
    if (entered) return m.flowIfTrue(executed.line);
    if (skipped) return m.flowIfFalse(executed.line);
  }
  if (LOOP.test(code)) {
    if (entered) return m.flowLoopEnter(executed.line);
    if (skipped) return m.flowLoopExit(executed.line);
  }
  return undefined;
}
