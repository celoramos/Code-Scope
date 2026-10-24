import type { Change } from './diff';
import { MESSAGES, type Language, type Messages } from './messages';

/**
 * Modo iniciante: uma frase curta por mudança, na ordem em que o aluno deve
 * ler. Arrays primeiro, porque são o assunto; ponteiros depois.
 */
export function explain(changes: Change[], isFirstStep = false, notes: string[] = [], language: Language = 'pt'): string[] {
  const m = MESSAGES[language];
  if (isFirstStep) {
    const added = changes.filter((c): c is Extract<Change, { kind: 'array-added' }> => c.kind === 'array-added');
    const maps = changes.filter((c): c is Extract<Change, { kind: 'map-added' }> => c.kind === 'map-added');
    if (added.length === 0 && maps.length === 0) return [m.firstStepNoArrays];
    return [...added.map((c) => m.firstStep(describe(c, m))), ...maps.map((c) => m.firstStep(m.describeMap(c.map, c.length)))];
  }

  // O que mudou vem antes das notas (caminho do programa, peek): os dados são o assunto.
  const isVariable = (c: Change) => c.kind === 'pointer' || c.kind === 'scalar';
  const arrays = changes.filter((c) => !isVariable(c)).map((c) => sentence(c, m));
  const variables = changes.filter(isVariable).map((c) => sentence(c, m));
  const all = [...arrays, ...variables, ...notes];
  return all.length > 0 ? all : [m.nothingChanged];
}

function sentence(c: Change, m: Messages): string {
  switch (c.kind) {
    case 'set':
      return m.set(c.array, c.index, c.from, c.to);
    case 'swap':
      return c.steps === 2 ? m.swapTwoSteps(c.array, c.a, c.b) : m.swap(c.array, c.a, c.b);
    case 'array-added':
      if (c.structure === 'list' || c.structure === 'stack' || c.structure === 'queue') {
        return m.collectionCreated(c.structure, c.array, c.length);
      }
      if (c.structure === 'matrix') return m.matrixCreated(c.array, c.length, c.cols ?? 0);
      return m.arrayCreated(c.array, c.length);
    case 'array-removed':
      return m.arrayRemoved(c.array);
    case 'array-resized':
      return m.arrayResized(c.array, c.from, c.to);
    case 'insert':
      if (c.structure === 'stack' && !c.shifted) return m.pushed(c.array, c.value);
      if (c.structure === 'queue' && !c.shifted) return m.enqueued(c.array, c.value);
      return c.shifted ? m.insertedShifting(c.array, c.value, c.index) : m.insertedAtEnd(c.array, c.value, c.index);
    case 'remove':
      if (c.structure === 'stack' && !c.shifted) return m.popped(c.array, c.value);
      if (c.structure === 'queue' && c.index === 0) return m.dequeued(c.array, c.value);
      return c.shifted ? m.removedShifting(c.array, c.value, c.index) : m.removedFromEnd(c.array, c.value, c.index);
    case 'scalar':
      if (c.from === undefined) return m.variableCreated(c.name, String(c.to));
      if (c.to === undefined) return m.variableGone(c.name);
      return m.variableChanged(c.name, c.from, c.to);
    case 'pointer':
      if (c.from === undefined) return m.variableCreated(c.name, String(c.to));
      if (c.to === undefined) return m.variableGone(c.name);
      // Contadores de laço andam de um em um; o verbo diz a direção sem o aluno fazer a conta.
      if (c.to === c.from + 1) return m.pointerForward(c.name, c.from, c.to);
      if (c.to === c.from - 1) return m.pointerBack(c.name, c.from, c.to);
      if (c.to === 0 && c.from > 0) return m.pointerRestarted(c.name);
      return m.variableChanged(c.name, c.from, c.to);
    case 'map-added':
      return m.mapCreated(c.map, c.length);
    case 'map-removed':
      return m.variableGone(c.map);
    case 'map-put':
      return c.from === undefined ? m.mapPutNew(c.map, keyText(c.key), c.value) : m.mapUpdated(c.map, keyText(c.key), c.from, c.value);
    case 'map-remove':
      return m.mapRemoved(c.map, keyText(c.key));
  }
}

/** Chave como o aluno escreveria entre colchetes: texto sem aspas (JavaScript) ganha aspas. */
function keyText(key: string): string {
  return /^(["']).*\1$/.test(key) || /^-?\d+(\.\d+)?$/.test(key) ? key : `'${key}'`;
}

/** "numeros tem 5 posições", "lista é uma lista vazia", "grade tem 2 linhas e 3 colunas". */
function describe(c: Extract<Change, { kind: 'array-added' }>, m: Messages): string {
  if (c.structure === 'matrix') return m.describeMatrix(c.array, c.length, c.cols ?? 0);
  if (c.structure === 'list' || c.structure === 'stack' || c.structure === 'queue') {
    return m.describeCollection(c.structure, c.array, c.length);
  }
  return m.describeArray(c.array, c.length);
}
