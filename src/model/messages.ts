/**
 * As frases do modo iniciante em cada idioma. A lógica de qual frase usar
 * fica em explain.ts, flow.ts e frame.ts; aqui só o texto, lado a lado, para
 * quem traduz ver as duas versões juntas.
 */

export type Language = 'pt' | 'en';

export type CollectionKind = 'list' | 'stack' | 'queue';

export interface Messages {
  firstStepNoArrays: string;
  firstStep(description: string): string;
  nothingChanged: string;

  set(array: string, index: number, from: string, to: string): string;
  swap(array: string, a: number, b: number): string;
  /** Troca feita com uma variável auxiliar, em dois passos. */
  swapTwoSteps(array: string, a: number, b: number): string;

  collectionCreated(kind: CollectionKind, array: string, length: number): string;
  matrixCreated(array: string, rows: number, cols: number): string;
  arrayCreated(array: string, length: number): string;
  arrayRemoved(array: string): string;
  arrayResized(array: string, from: number, to: number): string;

  pushed(array: string, value: string): string;
  enqueued(array: string, value: string): string;
  insertedShifting(array: string, value: string, index: number): string;
  insertedAtEnd(array: string, value: string, index: number): string;
  popped(array: string, value: string): string;
  dequeued(array: string, value: string): string;
  removedShifting(array: string, value: string, index: number): string;
  removedFromEnd(array: string, value: string, index: number): string;

  variableCreated(name: string, value: string | number): string;
  variableGone(name: string): string;
  variableChanged(name: string, from: string | number, to: string | number): string;
  pointerForward(name: string, from: number, to: number): string;
  pointerBack(name: string, from: number, to: number): string;
  pointerRestarted(name: string): string;

  /** "numeros tem 5 posições", usado no primeiro passo. */
  describeArray(array: string, length: number): string;
  describeMatrix(array: string, rows: number, cols: number): string;
  describeCollection(kind: CollectionKind, array: string, length: number): string;

  flowBreak: string;
  flowLoopEnd(line: number): string;
  flowIfTrue(line: number): string;
  flowIfFalse(line: number): string;
  flowLoopEnter(line: number): string;
  flowLoopExit(line: number): string;

  peekStack(array: string, value: string): string;
  peekQueue(array: string, value: string): string;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const ptNoun = { list: 'lista', stack: 'pilha', queue: 'fila' };
const ptPositions = (n: number) => count(n, 'posição', 'posições');
const ptItems = (n: number) => count(n, 'item', 'itens');
const ptSize = (rows: number, cols: number) => `${count(rows, 'linha', 'linhas')} e ${count(cols, 'coluna', 'colunas')}`;

const pt: Messages = {
  firstStepNoArrays: 'Primeiro passo. Ainda não há arrays nas variáveis locais.',
  firstStep: (d) => `Primeiro passo: ${d}.`,
  nothingChanged: 'Nada mudou neste passo.',

  set: (arr, i, from, to) => `${arr}[${i}] mudou de ${from} para ${to}.`,
  swap: (arr, a, b) => `${arr}[${a}] e ${arr}[${b}] trocaram de lugar.`,
  swapTwoSteps: (arr, a, b) =>
    `${arr}[${a}] e ${arr}[${b}] terminaram de trocar de lugar. A troca levou dois passos e usou uma variável auxiliar.`,

  collectionCreated: (kind, arr, n) =>
    `A ${ptNoun[kind]} ${arr} foi criada ${n === 0 ? 'vazia' : `com ${ptItems(n)}`}.`,
  matrixCreated: (arr, rows, cols) => `A matriz ${arr} foi criada com ${ptSize(rows, cols)}.`,
  arrayCreated: (arr, n) => `O array ${arr} foi criado com ${ptPositions(n)}.`,
  arrayRemoved: (arr) => `O array ${arr} saiu de escopo.`,
  arrayResized: (arr, from, to) => `${arr} agora tem ${ptPositions(to)} (antes tinha ${from}).`,

  pushed: (arr, v) => `${v} foi empilhado no topo de ${arr}.`,
  enqueued: (arr, v) => `${v} entrou no fim da fila ${arr}.`,
  insertedShifting: (arr, v, i) =>
    `${arr} ganhou ${v} na posição ${i}. Os itens que estavam dali em diante andaram uma posição.`,
  insertedAtEnd: (arr, v, i) => `${arr} ganhou ${v} no fim, na posição ${i}.`,
  // A regra da estrutura vai junto: é o que o aluno precisa guardar.
  popped: (arr, v) => `${v} saiu do topo de ${arr}. Na pilha, sai sempre o último que entrou.`,
  dequeued: (arr, v) => `${v} saiu da frente da fila ${arr}. Na fila, sai sempre quem chegou primeiro.`,
  removedShifting: (arr, v, i) => `${v} saiu de ${arr} (posição ${i}). Os itens seguintes voltaram uma posição.`,
  removedFromEnd: (arr, v, i) => `${v} saiu do fim de ${arr} (posição ${i}).`,

  variableCreated: (name, v) => `${name} foi criada valendo ${v}.`,
  variableGone: (name) => `${name} saiu de escopo.`,
  variableChanged: (name, from, to) => `${name} mudou de ${from} para ${to}.`,
  pointerForward: (name, from, to) => `${name} avançou de ${from} para ${to}.`,
  pointerBack: (name, from, to) => `${name} recuou de ${from} para ${to}.`,
  pointerRestarted: (name) => `${name} voltou para 0 (o laço recomeçou).`,

  describeArray: (arr, n) => `${arr} tem ${ptPositions(n)}`,
  describeMatrix: (arr, rows, cols) => `${arr} tem ${ptSize(rows, cols)}`,
  describeCollection: (kind, arr, n) =>
    n === 0 ? `${arr} é uma ${ptNoun[kind]} vazia` : `${arr} é uma ${ptNoun[kind]} com ${ptItems(n)}`,

  flowBreak: 'O break interrompeu o laço.',
  flowLoopEnd: (line) => `Fim de uma volta do laço: o programa voltou para a linha ${line}.`,
  flowIfTrue: (line) => `A condição da linha ${line} foi verdadeira: o programa entrou no if.`,
  flowIfFalse: (line) => `A condição da linha ${line} foi falsa: o programa pulou o bloco do if.`,
  flowLoopEnter: (line) => `A condição do laço na linha ${line} é verdadeira: o programa entra no corpo do laço.`,
  flowLoopExit: (line) => `A condição do laço na linha ${line} ficou falsa: o laço terminou.`,

  peekStack: (arr, v) => `peek() só olhou o topo de ${arr}: ${v} continua lá.`,
  peekQueue: (arr, v) => `peek() só olhou a frente da fila ${arr}: ${v} continua lá.`,
};

const enPositions = (n: number) => count(n, 'position', 'positions');
const enItems = (n: number) => count(n, 'item', 'items');
const enSize = (rows: number, cols: number) => `${count(rows, 'row', 'rows')} and ${count(cols, 'column', 'columns')}`;

const en: Messages = {
  firstStepNoArrays: 'First step. There are no arrays in the local variables yet.',
  firstStep: (d) => `First step: ${d}.`,
  nothingChanged: 'Nothing changed in this step.',

  set: (arr, i, from, to) => `${arr}[${i}] changed from ${from} to ${to}.`,
  swap: (arr, a, b) => `${arr}[${a}] and ${arr}[${b}] swapped places.`,
  swapTwoSteps: (arr, a, b) =>
    `${arr}[${a}] and ${arr}[${b}] finished swapping places. The swap took two steps and used a helper variable.`,

  collectionCreated: (kind, arr, n) => `The ${kind} ${arr} was created ${n === 0 ? 'empty' : `with ${enItems(n)}`}.`,
  matrixCreated: (arr, rows, cols) => `The matrix ${arr} was created with ${enSize(rows, cols)}.`,
  arrayCreated: (arr, n) => `The array ${arr} was created with ${enPositions(n)}.`,
  arrayRemoved: (arr) => `The array ${arr} went out of scope.`,
  arrayResized: (arr, from, to) => `${arr} now has ${enPositions(to)} (it had ${from} before).`,

  pushed: (arr, v) => `${v} was pushed onto the top of ${arr}.`,
  enqueued: (arr, v) => `${v} joined the back of the queue ${arr}.`,
  insertedShifting: (arr, v, i) =>
    `${arr} got ${v} at position ${i}. The items from there on moved up one position.`,
  insertedAtEnd: (arr, v, i) => `${arr} got ${v} at the end, at position ${i}.`,
  popped: (arr, v) => `${v} left the top of ${arr}. In a stack, the last one in is always the first one out.`,
  dequeued: (arr, v) => `${v} left the front of the queue ${arr}. In a queue, whoever arrived first always leaves first.`,
  removedShifting: (arr, v, i) => `${v} left ${arr} (position ${i}). The items after it moved back one position.`,
  removedFromEnd: (arr, v, i) => `${v} left the end of ${arr} (position ${i}).`,

  variableCreated: (name, v) => `${name} was created with the value ${v}.`,
  variableGone: (name) => `${name} went out of scope.`,
  variableChanged: (name, from, to) => `${name} changed from ${from} to ${to}.`,
  pointerForward: (name, from, to) => `${name} moved forward from ${from} to ${to}.`,
  pointerBack: (name, from, to) => `${name} moved back from ${from} to ${to}.`,
  pointerRestarted: (name) => `${name} went back to 0 (the loop started over).`,

  describeArray: (arr, n) => `${arr} has ${enPositions(n)}`,
  describeMatrix: (arr, rows, cols) => `${arr} has ${enSize(rows, cols)}`,
  describeCollection: (kind, arr, n) => (n === 0 ? `${arr} is an empty ${kind}` : `${arr} is a ${kind} with ${enItems(n)}`),

  flowBreak: 'The break stopped the loop.',
  flowLoopEnd: (line) => `End of one loop iteration: the program went back to line ${line}.`,
  flowIfTrue: (line) => `The condition on line ${line} was true: the program entered the if.`,
  flowIfFalse: (line) => `The condition on line ${line} was false: the program skipped the if block.`,
  flowLoopEnter: (line) => `The loop condition on line ${line} is true: the program enters the loop body.`,
  flowLoopExit: (line) => `The loop condition on line ${line} became false: the loop ended.`,

  peekStack: (arr, v) => `peek() only looked at the top of ${arr}: ${v} is still there.`,
  peekQueue: (arr, v) => `peek() only looked at the front of the queue ${arr}: ${v} is still there.`,
};

export const MESSAGES: Record<Language, Messages> = { pt, en };
