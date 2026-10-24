/**
 * As frases do modo iniciante em cada idioma. A lógica de qual frase usar
 * fica em explain.ts, flow.ts e frame.ts; aqui só o texto, lado a lado, para
 * quem traduz ver as duas versões juntas.
 */

export type Language = 'pt' | 'en';

export type CollectionKind = 'list' | 'stack' | 'queue';

export type ErrorKindName = 'index' | 'null' | 'zero' | 'key' | 'format' | 'recursion' | 'name' | 'type' | 'other';

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

  errorTitle(type: string): string;
  /** arr[expr] pediu uma posição que não existe; last é a última que existe. */
  errorIndex(array: string, expr: string, index: number, last: number): string;
  errorIndexEmpty(array: string, expr: string, index: number): string;
  errorIndexTip(length: number): string;
  /** JavaScript: a posição inexistente vira undefined, e o erro vem ao usar esse undefined. */
  errorUndefinedFromIndex(array: string, index: number): string;
  errorKind(kind: ErrorKindName, message: string): string;

  /** vars já vem como "n = 3, i = 0". */
  callEntered(name: string, vars: string): string;
  callRecursive(name: string, vars: string, copies: number): string;
  callReturned(name: string, value: string | undefined, to: string | undefined): string;
  /** A função parada chegou ao return e já sabe o que vai devolver. */
  callReturning(name: string, value: string): string;
  /** Uma chamada inteira aconteceu dentro do passo (F10 por cima dela). */
  callGaveBack(name: string, value: string): string;

  /** "o objeto Conta ('Ana')": value é o primeiro campo simples. */
  objectLabel(type: string, value: string): string;
  newObjectLabel(type: string, value: string): string;
  /** Nó de lista ligada ou árvore: o valor basta. */
  nodeLabel(value: string): string;
  newNodeLabel(value: string): string;
  objectCreated(type: string, name: string, value?: string): string;
  refPointsTo(name: string, label: string): string;
  refAlias(name: string, other: string): string;
  refNull(name: string): string;
  fieldChanged(path: string, from: string, to: string): string;
  fieldPointsTo(path: string, label: string): string;
  fieldNull(path: string): string;
  arrayAlias(first: string, other: string): string;

  mapCreated(name: string, length: number): string;
  describeMap(name: string, length: number): string;
  mapPutNew(name: string, key: string, value: string): string;
  mapUpdated(name: string, key: string, from: string, to: string): string;
  mapRemoved(name: string, key: string): string;
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

  errorTitle: (type) => (type ? `Erro: ${type}` : 'Erro'),
  errorIndex: (arr, expr, i, last) =>
    `${arr}[${expr}] tentou usar a posição ${i}, mas ${arr} só tem as posições de 0 a ${last}.`,
  errorIndexEmpty: (arr, expr, i) => `${arr}[${expr}] tentou usar a posição ${i}, mas ${arr} está vazio: não tem nenhuma posição.`,
  errorIndexTip: (n) =>
    `Com ${ptPositions(n)}, a última é a ${Math.max(n - 1, 0)}. Se o laço usa <= com o tamanho, ele passa uma vez a mais: troque por <.`,
  errorUndefinedFromIndex: (arr, i) =>
    `Em JavaScript, ler uma posição que não existe não dá erro na hora: ${arr}[${i}] vale undefined, e o erro aparece ao usar esse undefined.`,
  errorKind: (kind, msg) =>
    ({
      index: 'O programa tentou usar uma posição que não existe na coleção.',
      null: 'O programa tentou usar um valor vazio (null, undefined ou None) como se fosse um objeto: não dá para ler campos nem chamar métodos de algo que não existe.',
      zero: 'Divisão por zero: nenhum número pode ser dividido por 0. Confira o valor do divisor antes de dividir.',
      key: `A chave ${msg} não existe no dicionário. Confira se ela está lá antes de ler, ou use um valor padrão.`,
      format: 'Um texto que não é número foi convertido para número.',
      recursion: 'Recursão sem fim: a função chamou a si mesma tantas vezes que a pilha de chamadas encheu. Confira o caso base, a condição que faz a recursão parar.',
      name: 'O programa usou um nome que não foi criado: confira se está escrito igual à declaração e se ela vem antes do uso.',
      type: 'Um valor foi usado com o tipo errado, como somar texto com número ou chamar algo que não é função.',
      other: 'O programa parou por causa de um erro que ninguém tratou.',
    })[kind],

  callEntered: (name, vars) =>
    `O programa entrou na função ${name}${vars ? `, com ${vars}` : ''}. Quem chamou fica esperando ela terminar.`,
  callRecursive: (name, vars, copies) =>
    `${name} chamou ${name} de novo (recursão)${vars ? `, agora com ${vars}` : ''}. Há ${copies} chamadas de ${name} na pilha, cada uma com as próprias variáveis.`,
  callReturned: (name, value, to) =>
    `${name} terminou${value !== undefined ? ` e devolveu ${value}` : ''}. ${to ? `A chamada de ${to}` : 'Quem chamou'} continua de onde parou.`,
  callReturning: (name, value) => `${name} chegou ao return: vai devolver ${value} para quem chamou.`,
  callGaveBack: (name, value) => `A chamada de ${name} rodou inteira neste passo e devolveu ${value}.`,

  objectLabel: (type, value) => `o objeto ${type} (${value})`,
  newObjectLabel: (type, value) => `um objeto ${type} novo (${value})`,
  nodeLabel: (value) => `o nó ${value}`,
  newNodeLabel: (value) => `um nó novo (${value})`,
  objectCreated: (type, name, value) =>
    `Um objeto ${type} novo foi criado${value !== undefined ? ` (${value})` : ''}, e ${name} aponta para ele.`,
  refPointsTo: (name, label) => `${name} agora aponta para ${label}.`,
  refAlias: (name, other) =>
    `${name} aponta para o mesmo objeto que ${other}: não é uma cópia. Mudar o objeto por um muda para o outro.`,
  refNull: (name) => `${name} agora não aponta para nenhum objeto.`,
  fieldChanged: (path, from, to) => `${path} mudou de ${from} para ${to}.`,
  fieldPointsTo: (path, label) => `${path} agora aponta para ${label}.`,
  fieldNull: (path) => `${path} agora não aponta para nada: a ligação acabou ali.`,
  arrayAlias: (first, other) => `${other} não é uma cópia: ${first} e ${other} são o mesmo array. Mudar um muda o outro.`,

  mapCreated: (name, n) => `O dicionário ${name} foi criado ${n === 0 ? 'vazio' : `com ${count(n, 'chave', 'chaves')}`}.`,
  describeMap: (name, n) => `${name} é um dicionário ${n === 0 ? 'vazio' : `com ${count(n, 'chave', 'chaves')}`}`,
  mapPutNew: (name, key, value) => `A chave ${key} entrou em ${name}, com o valor ${value}.`,
  mapUpdated: (name, key, from, to) => `${name}[${key}] mudou de ${from} para ${to}: a chave já existia, só o valor foi trocado.`,
  mapRemoved: (name, key) => `A chave ${key} saiu de ${name}.`,
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

  errorTitle: (type) => (type ? `Error: ${type}` : 'Error'),
  errorIndex: (arr, expr, i, last) =>
    `${arr}[${expr}] tried to use position ${i}, but ${arr} only has positions 0 to ${last}.`,
  errorIndexEmpty: (arr, expr, i) => `${arr}[${expr}] tried to use position ${i}, but ${arr} is empty: it has no positions.`,
  errorIndexTip: (n) =>
    `With ${enPositions(n)}, the last one is ${Math.max(n - 1, 0)}. If the loop uses <= with the length, it runs one extra time: change it to <.`,
  errorUndefinedFromIndex: (arr, i) =>
    `In JavaScript, reading a position that does not exist is not an error right away: ${arr}[${i}] is undefined, and the error shows up when that undefined is used.`,
  errorKind: (kind, msg) =>
    ({
      index: 'The program tried to use a position that does not exist in the collection.',
      null: 'The program tried to use an empty value (null, undefined or None) as if it were an object: you cannot read fields or call methods on something that does not exist.',
      zero: 'Division by zero: no number can be divided by 0. Check the divisor before dividing.',
      key: `The key ${msg} is not in the dictionary. Check that it is there before reading it, or use a default value.`,
      format: 'A text that is not a number was converted to a number.',
      recursion: 'Endless recursion: the function called itself so many times that the call stack filled up. Check the base case, the condition that stops the recursion.',
      name: 'The program used a name that was never created: check that it is spelled like the declaration and that the declaration comes first.',
      type: 'A value was used with the wrong type, like adding text to a number or calling something that is not a function.',
      other: 'The program stopped because of an error that nobody handled.',
    })[kind],

  callEntered: (name, vars) =>
    `The program entered the function ${name}${vars ? `, with ${vars}` : ''}. The caller waits for it to finish.`,
  callRecursive: (name, vars, copies) =>
    `${name} called ${name} again (recursion)${vars ? `, now with ${vars}` : ''}. There are ${copies} calls of ${name} on the stack, each with its own variables.`,
  callReturned: (name, value, to) =>
    `${name} finished${value !== undefined ? ` and returned ${value}` : ''}. ${to ? `The call of ${to}` : 'The caller'} continues where it stopped.`,
  callReturning: (name, value) => `${name} reached the return: it will give ${value} back to the caller.`,
  callGaveBack: (name, value) => `The call of ${name} ran entirely in this step and returned ${value}.`,

  objectLabel: (type, value) => `the ${type} object (${value})`,
  newObjectLabel: (type, value) => `a new ${type} object (${value})`,
  nodeLabel: (value) => `the node ${value}`,
  newNodeLabel: (value) => `a new node (${value})`,
  objectCreated: (type, name, value) =>
    `A new ${type} object was created${value !== undefined ? ` (${value})` : ''}, and ${name} points to it.`,
  refPointsTo: (name, label) => `${name} now points to ${label}.`,
  refAlias: (name, other) =>
    `${name} points to the same object as ${other}: it is not a copy. Changing the object through one changes it for the other.`,
  refNull: (name) => `${name} no longer points to any object.`,
  fieldChanged: (path, from, to) => `${path} changed from ${from} to ${to}.`,
  fieldPointsTo: (path, label) => `${path} now points to ${label}.`,
  fieldNull: (path) => `${path} now points to nothing: the chain ends there.`,
  arrayAlias: (first, other) => `${other} is not a copy: ${first} and ${other} are the same array. Changing one changes the other.`,

  mapCreated: (name, n) => `The dictionary ${name} was created ${n === 0 ? 'empty' : `with ${count(n, 'key', 'keys')}`}.`,
  describeMap: (name, n) => `${name} is a dictionary ${n === 0 ? 'that is empty' : `with ${count(n, 'key', 'keys')}`}`,
  mapPutNew: (name, key, value) => `The key ${key} was added to ${name}, with the value ${value}.`,
  mapUpdated: (name, key, from, to) => `${name}[${key}] changed from ${from} to ${to}: the key already existed, only the value was replaced.`,
  mapRemoved: (name, key) => `The key ${key} was removed from ${name}.`,
};

export const MESSAGES: Record<Language, Messages> = { pt, en };
