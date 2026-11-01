import type { Language } from '../model/messages';

/**
 * Textos do painel. Os do HTML entram direto no modelo da página; os do
 * script vão como JSON e usam {0}, {1}... no lugar dos valores.
 */
export interface PanelStrings {
  html: {
    lang: string;
    emptyIdle: string;
    /** Passos da tela inicial; podem ter <kbd>. */
    emptySteps: [string, string, string];
    history: string;
    previous: string;
    previousTitle: string;
    gotoStep: string;
    next: string;
    nextTitle: string;
    live: string;
    sessionEnded: string;
    explanation: string;
    variables: string;
    arrays: string;
    objects: string;
    maps: string;
    callTree: string;
    predictMode: string;
    predictSave: string;
    saveImage: string;
    saveGif: string;
    feedback: string;
    installDebugger: string;
    saveSession: string;
    openSession: string;
    compareSession: string;
    closeCompare: string;
    detailsMode: string;
    find: string;
    findPrevious: string;
    findNext: string;
    exercise: string;
    notes: string;
    details: string;
  };
  script: Record<
    | 'idle'
    | 'running'
    | 'ended'
    | 'step'
    | 'noArrays'
    | 'executed'
    | 'nextLine'
    | 'stackLabel'
    | 'stackRule'
    | 'queueLabel'
    | 'queueRule'
    | 'dequeLabel'
    | 'dequeRule'
    | 'deque'
    | 'heap'
    | 'heapRule'
    | 'heapLevels'
    | 'arrayLabel'
    | 'exit'
    | 'entry'
    | 'item'
    | 'items'
    | 'position'
    | 'positions'
    | 'partial'
    | 'list'
    | 'set'
    | 'emptySet'
    | 'setItemLabel'
    | 'stack'
    | 'queue'
    | 'emptyCollection'
    | 'collectionCount'
    | 'empty'
    | 'top'
    | 'front'
    | 'back'
    | 'frontAndBack'
    | 'and'
    | 'matrixLabel'
    | 'row'
    | 'rows'
    | 'column'
    | 'columns'
    | 'pointedBy'
    | 'traceTitle'
    | 'traceSteps'
    | 'traceStep'
    | 'traceLine'
    | 'traceGoto'
    | 'traceCall'
    | 'traceHidden'
    | 'missing'
    | 'missingLabel'
    | 'callsTitle'
    | 'callsCount'
    | 'callsRule'
    | 'callLine'
    | 'programFrame'
    | 'returned'
    | 'finished'
    | 'callRunning'
    | 'sameArray'
    | 'pointsToNull'
    | 'linkedTitle'
    | 'treeTitle'
    | 'oneNode'
    | 'nodes'
    | 'cycle'
    | 'noVariable'
    | 'objectLabel'
    | 'truncated'
    | 'emptyMap'
    | 'oneKey'
    | 'keys'
    | 'mapKey'
    | 'mapValue'
    | 'condTitle'
    | 'condTrue'
    | 'condFalse'
    | 'condUnknown'
    | 'condSkipped'
    | 'condAnd'
    | 'condOr'
    | 'condResult'
    | 'statsComparisons'
    | 'statsSwaps'
    | 'statsComparison1'
    | 'statsSwap1'
    | 'locale'
    | 'costTitle'
    | 'costCurve'
    | 'costAt'
    | 'costProgram'
    | 'costProgramRow'
    | 'comparing'
    | 'outside'
    | 'hides'
    | 'outOfScope'
    | 'callTreeTitle'
    | 'callTreeMeta'
    | 'callTreeRule'
    | 'callTreeRepeated'
    | 'graphMeta'
    | 'graphLabel'
    | 'legendVisited'
    | 'legendCurrent'
    | 'legendWaiting'
    | 'text'
    | 'letter'
    | 'letters'
    | 'emptyText'
    | 'predictQuestion'
    | 'predictSaved'
    | 'predictRight'
    | 'predictWrong'
    | 'predictScore'
    | 'predictOff'
    | 'exerciseTitle'
    | 'exerciseDone'
    | 'exercisePending'
    | 'exerciseCheck'
    | 'exerciseMissing'
    | 'notesTitle'
    | 'detailsTitle'
    | 'findMiss'
    | 'missingDebugger'
    | 'gifProgress'
    | 'gifSampled'
    | 'compareTitle'
    | 'compareCurrent'
    | 'compareSaved'
    | 'compareSteps'
    | 'compareComparisons'
    | 'compareSwaps'
    | 'compareFewer'
    | 'compareSame',
    string
  >;
}

const pt: PanelStrings = {
  html: {
    lang: 'pt-BR',
    emptyIdle: 'Pronto para visualizar',
    emptySteps: [
      'Coloque um breakpoint no seu programa.',
      'Inicie o debug com <kbd>F5</kbd>.',
      'Avance linha a linha com <kbd>F10</kbd>.',
    ],
    history: 'Histórico de passos',
    previous: 'Passo anterior',
    previousTitle: 'Passo anterior (seta esquerda)',
    gotoStep: 'Ir para o passo',
    next: 'Próximo passo',
    nextTitle: 'Próximo passo (seta direita)',
    live: 'Voltar ao passo mais recente',
    sessionEnded: 'sessão encerrada',
    explanation: 'O que mudou',
    variables: 'Variáveis inteiras',
    arrays: 'Arrays',
    objects: 'Objetos',
    maps: 'Dicionários',
    callTree: 'Árvore de recursão',
    predictMode: 'Adivinhar antes',
    predictSave: 'Guardar palpite',
    saveImage: 'Salvar imagem',
    saveGif: 'Salvar GIF',
    feedback: 'Achou algo confuso? Conte para a gente',
    installDebugger: 'Ver a extensão',
    saveSession: 'Salvar sessão',
    openSession: 'Abrir sessão salva',
    compareSession: 'Comparar',
    closeCompare: 'Fechar comparação',
    detailsMode: 'Detalhes',
    find: 'Variável ou texto da linha',
    findPrevious: 'Passo anterior que combina',
    findNext: 'Próximo passo que combina',
    exercise: 'Exercício',
    notes: 'Notas do professor',
    details: 'Detalhes do passo',
  },
  script: {
    idle: 'Pronto para visualizar',
    running: 'Aguardando um breakpoint',
    ended: 'O programa terminou sem parar. Coloque um breakpoint e rode de novo.',
    step: 'Passo {0} de {1}',
    noArrays: 'Nenhuma variável para desenhar neste ponto.',
    executed: 'Executou',
    nextLine: 'Próxima',
    stackLabel: 'Pilha {0}, do fundo para o topo',
    stackRule: 'Último a entrar, primeiro a sair.',
    queueLabel: 'Fila {0}, da frente para o fim',
    queueRule: 'Primeiro a entrar, primeiro a sair.',
    dequeLabel: 'Deque {0}, da frente para o fim',
    dequeRule: 'Entra e sai pelas duas pontas.',
    deque: 'deque',
    heap: 'fila de prioridade',
    heapRule: 'A raiz é a primeira a sair, e cada pai vem antes dos filhos.',
    heapLevels: 'Heap {0} como árvore, nível por nível',
    arrayLabel: 'Posições de {0}',
    exit: 'saída',
    entry: 'entrada',
    item: 'item',
    items: 'itens',
    position: 'posição',
    positions: 'posições',
    partial: '{0} de {1} {2}',
    list: 'lista',
    set: 'conjunto',
    emptySet: 'conjunto vazio',
    setItemLabel: '{0} contém {1}',
    stack: 'pilha',
    queue: 'fila',
    emptyCollection: '{0} vazia',
    collectionCount: '{0}, {1}',
    empty: 'vazia',
    top: 'topo',
    front: 'frente',
    back: 'fim',
    frontAndBack: 'frente e fim',
    and: ' e ',
    matrixLabel: 'Matriz {0}',
    row: 'linha',
    rows: 'linhas',
    column: 'coluna',
    columns: 'colunas',
    pointedBy: '{0}, apontada por {1}',
    traceTitle: 'Teste de mesa',
    traceSteps: '{0} passos',
    traceStep: 'Passo',
    traceLine: 'Linha',
    traceGoto: 'Ir para o passo {0}',
    traceCall: 'Chamada',
    traceHidden: 'Os {0} passos mais antigos não aparecem.',
    missing: 'não existe',
    missingLabel: '{0}[{1}] não existe',
    callsTitle: 'Pilha de chamadas',
    callsCount: '{0} chamadas',
    callsRule: 'A chamada de cima é a que está rodando; as de baixo esperam ela terminar.',
    callLine: 'linha {0}',
    programFrame: 'código principal',
    returned: 'devolveu {0}',
    finished: 'terminou',
    callRunning: 'rodando',
    sameArray: 'o mesmo array',
    pointsToNull: 'não aponta para nenhum objeto (null)',
    linkedTitle: 'Lista ligada de {0}',
    treeTitle: 'Árvore de {0}',
    oneNode: '1 nó',
    nodes: '{0} nós',
    cycle: 'volta ao começo',
    noVariable: 'nenhuma variável aponta para ele',
    objectLabel: 'Objeto {0}, apontado por {1}',
    truncated: 'Campos não lidos: o painel lê no máximo 40 objetos por passo.',
    emptyMap: 'dicionário vazio',
    oneKey: '1 chave',
    keys: '{0} chaves',
    mapKey: 'chave',
    mapValue: 'valor',
    condTitle: 'A condição da linha {0}, antes de rodar',
    condTrue: 'verdadeiro',
    condFalse: 'falso',
    condUnknown: 'não dá para saber antes',
    condSkipped: 'nem é testada',
    condAnd: 'e',
    condOr: 'ou',
    condResult: 'resultado',
    statsComparisons: '{0} comparações entre posições',
    statsSwaps: '{0} trocas',
    statsComparison1: '1 comparação entre posições',
    statsSwap1: '1 troca',
    locale: 'pt-BR',
    costTitle: 'Quanto custa: n = {0} posições',
    costCurve: 'curva',
    costAt: 'n = {0}',
    costProgram: 'Cada curva mostra quantas comparações faz um algoritmo que cresce daquele jeito. Com {0} posições elas ficam perto; com 1000, um laço dentro de outro (n²) faz um milhão, e uma busca que descarta metade (log n) faz 10.',
    costProgramRow: 'este programa, até aqui',
    comparing: 'comparando',
    outside: 'fora da busca',
    hides: 'esconde a {0} de fora ({1})',
    outOfScope: 'saiu de escopo',
    callTreeTitle: 'Árvore de recursão',
    callTreeMeta: '{0} chamadas',
    callTreeRule: 'Cada chamada fica pendurada em quem a chamou. As de borda azul ainda estão rodando.',
    callTreeRepeated: '{0} foi calculada {1} vezes: a recursão refaz a mesma conta.',
    graphMeta: 'grafo, {0} nós e {1} ligações',
    graphLabel: 'Grafo {0} com os nós {1}; visitados: {2}',
    legendVisited: 'visitado',
    legendCurrent: 'atual',
    legendWaiting: 'esperando (ordem)',
    text: 'texto',
    letter: 'letra',
    letters: 'letras',
    emptyText: 'texto vazio',
    predictQuestion: 'Antes de apertar F10: quanto vai valer {0} depois desta linha?',
    predictSaved: 'Palpite guardado: {0} = {1}. Agora aperte F10.',
    predictRight: 'Acertou! {0} ficou {1}.',
    predictWrong: 'Quase: {0} ficou {1}, e o seu palpite foi {2}.',
    predictScore: '{0} de {1} palpites certos',
    predictOff: 'Modo de adivinhar desligado',
    exerciseTitle: 'Exercício',
    exerciseDone: 'Objetivo alcançado no passo {0}.',
    exercisePending: 'Ainda não: conserte o código e rode de novo, ou continue andando.',
    exerciseCheck: '{0} = {1}',
    exerciseMissing: '{0}: esperado {1}, ainda não existe',
    notesTitle: 'Nota do professor',
    detailsTitle: 'Detalhes',
    missingDebugger: 'Para debugar este arquivo, falta instalar a extensão {0}.',
    findMiss: 'Nenhum outro passo combina com "{0}".',
    gifProgress: 'Gerando o GIF: passo {0} de {1}',
    gifSampled: 'O GIF mostra {0} dos {1} passos.',
    compareTitle: 'Comparação',
    compareCurrent: 'Esta sessão',
    compareSaved: 'Salva',
    compareSteps: 'Passos',
    compareComparisons: 'Comparações',
    compareSwaps: 'Trocas',
    compareFewer: '{0} fez {1} comparações a menos.',
    compareSame: 'As duas fizeram o mesmo número de comparações.',
  },
};

const en: PanelStrings = {
  html: {
    lang: 'en',
    emptyIdle: 'Ready to visualize',
    emptySteps: [
      'Set a breakpoint in your program.',
      'Start debugging with <kbd>F5</kbd>.',
      'Step line by line with <kbd>F10</kbd>.',
    ],
    history: 'Step history',
    previous: 'Previous step',
    previousTitle: 'Previous step (left arrow)',
    gotoStep: 'Go to step',
    next: 'Next step',
    nextTitle: 'Next step (right arrow)',
    live: 'Back to the latest step',
    sessionEnded: 'session ended',
    explanation: 'What changed',
    variables: 'Integer variables',
    arrays: 'Arrays',
    objects: 'Objects',
    maps: 'Dictionaries',
    callTree: 'Recursion tree',
    predictMode: 'Guess first',
    predictSave: 'Save guess',
    saveImage: 'Save image',
    saveGif: 'Save GIF',
    feedback: 'Something confusing? Tell us',
    installDebugger: 'See the extension',
    saveSession: 'Save session',
    openSession: 'Open saved session',
    compareSession: 'Compare',
    closeCompare: 'Close comparison',
    detailsMode: 'Details',
    find: 'Variable or line text',
    findPrevious: 'Previous matching step',
    findNext: 'Next matching step',
    exercise: 'Exercise',
    notes: 'Teacher notes',
    details: 'Step details',
  },
  script: {
    idle: 'Ready to visualize',
    running: 'Waiting for a breakpoint',
    ended: 'The program finished without stopping. Set a breakpoint and run it again.',
    step: 'Step {0} of {1}',
    noArrays: 'Nothing to draw at this point.',
    executed: 'Ran',
    nextLine: 'Next',
    stackLabel: 'Stack {0}, from bottom to top',
    stackRule: 'Last in, first out.',
    queueLabel: 'Queue {0}, from front to back',
    queueRule: 'First in, first out.',
    dequeLabel: 'Deque {0}, from front to back',
    dequeRule: 'Items enter and leave at both ends.',
    deque: 'deque',
    heap: 'priority queue',
    heapRule: 'The root leaves first, and every parent comes before its children.',
    heapLevels: 'Heap {0} as a tree, level by level',
    arrayLabel: 'Positions of {0}',
    exit: 'exit',
    entry: 'entry',
    item: 'item',
    items: 'items',
    position: 'position',
    positions: 'positions',
    partial: '{0} of {1} {2}',
    list: 'list',
    set: 'set',
    emptySet: 'empty set',
    setItemLabel: '{0} contains {1}',
    stack: 'stack',
    queue: 'queue',
    emptyCollection: 'empty {0}',
    collectionCount: '{0}, {1}',
    empty: 'empty',
    top: 'top',
    front: 'front',
    back: 'back',
    frontAndBack: 'front and back',
    and: ' and ',
    matrixLabel: 'Matrix {0}',
    row: 'row',
    rows: 'rows',
    column: 'column',
    columns: 'columns',
    pointedBy: '{0}, pointed to by {1}',
    traceTitle: 'Trace table',
    traceSteps: '{0} steps',
    traceStep: 'Step',
    traceLine: 'Line',
    traceGoto: 'Go to step {0}',
    traceCall: 'Call',
    traceHidden: 'The {0} oldest steps are not shown.',
    missing: 'missing',
    missingLabel: '{0}[{1}] does not exist',
    callsTitle: 'Call stack',
    callsCount: '{0} calls',
    callsRule: 'The top call is the one running; the ones below wait for it to finish.',
    callLine: 'line {0}',
    programFrame: 'main program',
    returned: 'returned {0}',
    finished: 'finished',
    callRunning: 'running',
    sameArray: 'the same array',
    pointsToNull: 'points to no object (null)',
    linkedTitle: 'Linked list of {0}',
    treeTitle: 'Tree of {0}',
    oneNode: '1 node',
    nodes: '{0} nodes',
    cycle: 'back to the start',
    noVariable: 'no variable points to it',
    objectLabel: '{0} object, pointed to by {1}',
    truncated: 'Fields not read: the panel reads at most 40 objects per step.',
    emptyMap: 'empty dictionary',
    oneKey: '1 key',
    keys: '{0} keys',
    mapKey: 'key',
    mapValue: 'value',
    condTitle: 'The condition on line {0}, before it runs',
    condTrue: 'true',
    condFalse: 'false',
    condUnknown: 'cannot tell beforehand',
    condSkipped: 'not even tested',
    condAnd: 'and',
    condOr: 'or',
    condResult: 'result',
    statsComparisons: '{0} comparisons between positions',
    statsSwaps: '{0} swaps',
    statsComparison1: '1 comparison between positions',
    statsSwap1: '1 swap',
    locale: 'en',
    costTitle: 'How much it costs: n = {0} positions',
    costCurve: 'curve',
    costAt: 'n = {0}',
    costProgram: 'Each curve shows how many comparisons an algorithm that grows that way makes. With {0} positions they are close; with 1000, a loop inside a loop (n²) makes a million, and a search that discards half (log n) makes 10.',
    costProgramRow: 'this program, so far',
    comparing: 'being compared',
    outside: 'outside the search',
    hides: 'hides the outer {0} ({1})',
    outOfScope: 'out of scope',
    callTreeTitle: 'Recursion tree',
    callTreeMeta: '{0} calls',
    callTreeRule: 'Each call hangs from the one that made it. The ones with a blue border are still running.',
    callTreeRepeated: '{0} was computed {1} times: the recursion redoes the same work.',
    graphMeta: 'graph, {0} nodes and {1} edges',
    graphLabel: 'Graph {0} with nodes {1}; visited: {2}',
    legendVisited: 'visited',
    legendCurrent: 'current',
    legendWaiting: 'waiting (order)',
    text: 'text',
    letter: 'letter',
    letters: 'letters',
    emptyText: 'empty text',
    predictQuestion: 'Before pressing F10: what will {0} be after this line?',
    predictSaved: 'Guess saved: {0} = {1}. Now press F10.',
    predictRight: 'Right! {0} became {1}.',
    predictWrong: 'Close: {0} became {1}, and your guess was {2}.',
    predictScore: '{0} of {1} guesses right',
    predictOff: 'Guess mode off',
    exerciseTitle: 'Exercise',
    exerciseDone: 'Goal reached at step {0}.',
    exercisePending: 'Not yet: fix the code and run again, or keep stepping.',
    exerciseCheck: '{0} = {1}',
    exerciseMissing: '{0}: expected {1}, does not exist yet',
    notesTitle: 'Teacher note',
    detailsTitle: 'Details',
    missingDebugger: 'To debug this file, install the {0} extension.',
    findMiss: 'No other step matches "{0}".',
    gifProgress: 'Building the GIF: step {0} of {1}',
    gifSampled: 'The GIF shows {0} of the {1} steps.',
    compareTitle: 'Comparison',
    compareCurrent: 'This session',
    compareSaved: 'Saved',
    compareSteps: 'Steps',
    compareComparisons: 'Comparisons',
    compareSwaps: 'Swaps',
    compareFewer: '{0} made {1} fewer comparisons.',
    compareSame: 'Both made the same number of comparisons.',
  },
};

/** Onde a pessoa conta o que achou. O painel nunca envia nada sozinho. */
export const FEEDBACK_URL = 'https://github.com/celoramos/Code-Scope/issues/new/choose';

export const PANEL_STRINGS: Record<Language, PanelStrings> = { pt, en };

/** Aviso depois de salvar a imagem, o GIF ou a sessão. */
export function fileSaved(language: Language, path: string): string {
  return language === 'pt' ? `Arquivo salvo: ${path}` : `File saved: ${path}`;
}

/** Aviso quando o arquivo escolhido não é uma sessão do Code Scope. */
export function invalidSession(language: Language): string {
  return language === 'pt' ? 'Esse arquivo não é uma sessão salva do Code Scope.' : 'That file is not a saved Code Scope session.';
}

/** Título da janela de escolher a sessão. */
export function pickSession(language: Language, compare: boolean): string {
  if (language === 'pt') return compare ? 'Escolha a sessão para comparar' : 'Escolha a sessão salva';
  return compare ? 'Pick the session to compare' : 'Pick the saved session';
}

/** Aviso quando o debugger não responde às perguntas sobre as variáveis. */
export function readError(language: Language, err: unknown): string {
  return language === 'pt'
    ? `Não consegui ler as variáveis deste passo: ${String(err)}`
    : `Could not read the variables for this step: ${String(err)}`;
}

/** Textos do comando "Abrir um exemplo". */
export function sampleStrings(language: Language) {
  return language === 'pt'
    ? {
        pickLanguage: 'Escolha a linguagem do exemplo',
        pickFolder: 'Onde salvar os exemplos? Uma pasta code-scope-<linguagem> é criada aqui.',
        saveHere: 'Salvar aqui',
        debugger: {
          java: 'precisa do Extension Pack for Java e de um JDK',
          javascript: 'precisa do Node.js 22 ou mais novo',
          python: 'precisa da extensão Python e do Python instalado',
        } as Record<string, string>,
      }
    : {
        pickLanguage: 'Pick the language of the sample',
        pickFolder: 'Where should the samples go? A code-scope-<language> folder is created here.',
        saveHere: 'Save here',
        debugger: {
          java: 'needs the Extension Pack for Java and a JDK',
          javascript: 'needs Node.js 22 or newer',
          python: 'needs the Python extension and Python installed',
        } as Record<string, string>,
      };
}
