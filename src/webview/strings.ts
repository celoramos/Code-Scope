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
    | 'pointedBy',
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
  },
  script: {
    idle: 'Pronto para visualizar',
    running: 'Aguardando um breakpoint',
    ended: 'Sessão encerrada',
    step: 'Passo {0} de {1}',
    noArrays: 'Nenhum array nas variáveis locais deste ponto.',
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
  },
  script: {
    idle: 'Ready to visualize',
    running: 'Waiting for a breakpoint',
    ended: 'Session ended',
    step: 'Step {0} of {1}',
    noArrays: 'No arrays in the local variables at this point.',
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
  },
};

export const PANEL_STRINGS: Record<Language, PanelStrings> = { pt, en };

/** Aviso quando o debugger não responde às perguntas sobre as variáveis. */
export function readError(language: Language, err: unknown): string {
  return language === 'pt'
    ? `Não consegui ler as variáveis deste passo: ${String(err)}`
    : `Could not read the variables for this step: ${String(err)}`;
}
