import { MESSAGES, type Language } from './messages';
import type { Snapshot } from './snapshot';

/** "vistos.add(numero);" e "vistos.add(numero)": o conjunto e o que foi adicionado. */
const ADD_CALL = /^(\w+)\.add\((.+)\);?$/;

/**
 * A linha que rodou adicionou ao conjunto um valor que ele já tinha: nada
 * mudou, e esse é justamente o ponto de um conjunto. Sem esta nota, o aluno
 * vê o passo sem mudança e acha que a linha não rodou.
 */
export function setNotes(prev: Snapshot | undefined, next: Snapshot, language: Language): string[] {
  const code = prev?.code?.trim();
  const call = code ? ADD_CALL.exec(code) : null;
  if (!prev || !call) return [];
  const [, name, arg] = call;
  const before = prev.arrays.find((a) => a.name === name && a.kind === 'set');
  const after = next.arrays.find((a) => a.name === name && a.kind === 'set');
  if (!before || !after || before.values.length !== after.values.length) return [];
  if (!before.values.every((v) => after.values.includes(v))) return [];
  return [MESSAGES[language].setAlreadyHad(name, valueOf(arg.trim(), prev))];
}

/** O valor do argumento no passo anterior, quando é uma variável; senão, o próprio texto. */
function valueOf(arg: string, s: Snapshot): string {
  const pointer = s.pointers.find((p) => p.name === arg);
  if (pointer) return String(pointer.value);
  return s.scalars?.find((v) => v.name === arg)?.value ?? arg;
}
