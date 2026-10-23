/**
 * Explica o caminho que o programa tomou entre duas paradas, olhando só para
 * o texto das linhas: "if", "for" e "while" no começo da linha. Vale para a
 * família de C (Java, JavaScript, C#, C, Go), para Python ("elif") e para
 * Rust e Kotlin, que escrevem os laços do mesmo jeito. Linguagens com outra
 * forma de laço ("loop", "repeat") só não ganham a frase de fluxo.
 */

export interface LineRef {
  line: number;
  code?: string;
}

const CONDITION = /^(?:\}\s*)?(?:else\s+if|elif|if)\b/;
const LOOP = /^(?:for|while)\b/;

export function explainFlow(executed: LineRef | undefined, next: LineRef): string | undefined {
  const code = executed?.code;
  if (!executed || code === undefined) return undefined;

  if (/^break\b/.test(code)) return 'O break interrompeu o laço.';

  if (LOOP.test(next.code ?? '') && next.line < executed.line) {
    return `Fim de uma volta do laço: o programa voltou para a linha ${next.line}.`;
  }

  // Pular para a linha seguinte é entrar no bloco; pular mais adiante é passar por cima dele.
  const entered = next.line === executed.line + 1;
  const skipped = next.line > executed.line + 1;

  if (CONDITION.test(code)) {
    if (entered) return `A condição da linha ${executed.line} foi verdadeira: o programa entrou no if.`;
    if (skipped) return `A condição da linha ${executed.line} foi falsa: o programa pulou o bloco do if.`;
  }
  if (LOOP.test(code)) {
    if (entered) return `A condição do laço na linha ${executed.line} é verdadeira: o programa entra no corpo do laço.`;
    if (skipped) return `A condição do laço na linha ${executed.line} ficou falsa: o laço terminou.`;
  }
  return undefined;
}
