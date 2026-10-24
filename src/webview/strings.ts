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
    | 'arrayLabel'
    | 'exit'
    | 'entry'
    | 'item'
    | 'items'
    | 'position'
    | 'positions'
    | 'partial'
    | 'list'
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
    | 'predictOff',
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
  },
  script: {
    idle: 'Pronto para visualizar',
    running: 'Aguardando um breakpoint',
    ended: 'Sessão encerrada',
    step: 'Passo {0} de {1}',
    noArrays: 'Nenhuma variável para desenhar neste ponto.',
    executed: 'Executou',
    nextLine: 'Próxima',
    stackLabel: 'Pilha {0}, do fundo para o topo',
    stackRule: 'Último a entrar, primeiro a sair.',
    queueLabel: 'Fila {0}, da frente para o fim',
    queueRule: 'Primeiro a entrar, primeiro a sair.',
    arrayLabel: 'Posições de {0}',
    exit: 'saída',
    entry: 'entrada',
    item: 'item',
    items: 'itens',
    position: 'posição',
    positions: 'posições',
    partial: '{0} de {1} {2}',
    list: 'lista',
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
  },
  script: {
    idle: 'Ready to visualize',
    running: 'Waiting for a breakpoint',
    ended: 'Session ended',
    step: 'Step {0} of {1}',
    noArrays: 'Nothing to draw at this point.',
    executed: 'Ran',
    nextLine: 'Next',
    stackLabel: 'Stack {0}, from bottom to top',
    stackRule: 'Last in, first out.',
    queueLabel: 'Queue {0}, from front to back',
    queueRule: 'First in, first out.',
    arrayLabel: 'Positions of {0}',
    exit: 'exit',
    entry: 'entry',
    item: 'item',
    items: 'items',
    position: 'position',
    positions: 'positions',
    partial: '{0} of {1} {2}',
    list: 'list',
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
  },
};

export const PANEL_STRINGS: Record<Language, PanelStrings> = { pt, en };

/** Aviso depois de salvar a imagem do passo. */
export function imageSaved(language: Language, path: string): string {
  return language === 'pt' ? `Imagem salva: ${path}` : `Image saved: ${path}`;
}

/** Aviso quando o debugger não responde às perguntas sobre as variáveis. */
export function readError(language: Language, err: unknown): string {
  return language === 'pt'
    ? `Não consegui ler as variáveis deste passo: ${String(err)}`
    : `Could not read the variables for this step: ${String(err)}`;
}
