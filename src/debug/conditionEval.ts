import { combine, isSafe, substitute, type ConditionInfo, type ConditionPart, type ParsedCondition } from '../model/condition';
import type { Snapshot } from '../model/snapshot';
import type { Session } from './dapCollector';

/**
 * Avalia cada parte da condição no próprio programa, da esquerda para a
 * direita, como a linguagem faria: com && (and), uma parte falsa decide o
 * grupo e as seguintes nem rodam; com || (or), um grupo verdadeiro decide
 * tudo. Isso evita perguntar arr[i] quando i < n já deu falso, que daria erro.
 */
export async function evaluateCondition(
  session: Session,
  frameId: number,
  parsed: ParsedCondition,
  snapshot: Snapshot,
): Promise<ConditionInfo> {
  const parts: ConditionPart[] = [];
  const values: (boolean | undefined)[] = [];
  let groupFailed = false;
  let groupUnknown = false;
  let decided = false;

  for (const [k, text] of parsed.parts.entries()) {
    const op = parsed.ops[k - 1];
    if (op === '||') {
      // Fim de um grupo de &&: se ele deu verdadeiro, a condição inteira já é verdadeira.
      if (!groupFailed && !groupUnknown) decided = true;
      groupFailed = false;
      groupUnknown = false;
    }
    const part: ConditionPart = { text };
    const shown = substitute(text, snapshot);
    if (shown) part.values = shown;
    if (decided || groupFailed) {
      part.skipped = true;
      values.push(undefined);
      parts.push(part);
      continue;
    }
    const value = isSafe(text) ? await evalBoolean(session, frameId, text) : undefined;
    if (value !== undefined) part.value = value;
    if (value === false) groupFailed = true;
    if (value === undefined) groupUnknown = true;
    values.push(value);
    parts.push(part);
  }

  const result = combine(values, parsed.ops);
  return {
    keyword: parsed.keyword,
    line: snapshot.line,
    text: parsed.text,
    parts,
    ops: parsed.ops,
    ...(result !== undefined ? { result } : {}),
  };
}

/** true/false do programa; qualquer outra resposta (ou erro) fica sem valor. */
async function evalBoolean(session: Session, frameId: number, expression: string): Promise<boolean | undefined> {
  try {
    const res = (await session.customRequest('evaluate', { expression, frameId, context: 'watch' })) as { result?: string };
    if (res.result === 'true' || res.result === 'True') return true;
    if (res.result === 'false' || res.result === 'False') return false;
    return undefined;
  } catch {
    return undefined;
  }
}
