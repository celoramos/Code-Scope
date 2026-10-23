import type { Change } from './diff';

/**
 * Modo iniciante: uma frase curta por mudança, na ordem em que o aluno deve
 * ler. Arrays primeiro, porque são o assunto; ponteiros depois.
 */
export function explain(changes: Change[], isFirstStep = false, notes: string[] = []): string[] {
  if (isFirstStep) {
    const added = changes.filter((c): c is Extract<Change, { kind: 'array-added' }> => c.kind === 'array-added');
    if (added.length === 0) return ['Primeiro passo. Ainda não há arrays nas variáveis locais.'];
    return added.map((c) => `Primeiro passo: ${describe(c)}.`);
  }

  // O que mudou vem antes das notas (caminho do programa, peek): os dados são o assunto.
  const isVariable = (c: Change) => c.kind === 'pointer' || c.kind === 'scalar';
  const arrays = changes.filter((c) => !isVariable(c)).map(sentence);
  const variables = changes.filter(isVariable).map(sentence);
  const all = [...arrays, ...variables, ...notes];
  return all.length > 0 ? all : ['Nada mudou neste passo.'];
}

function sentence(c: Change): string {
  switch (c.kind) {
    case 'set':
      return `${c.array}[${c.index}] mudou de ${c.from} para ${c.to}.`;
    case 'swap':
      return c.steps === 2
        ? `${c.array}[${c.a}] e ${c.array}[${c.b}] terminaram de trocar de lugar. A troca levou dois passos e usou uma variável auxiliar.`
        : `${c.array}[${c.a}] e ${c.array}[${c.b}] trocaram de lugar.`;
    case 'array-added':
      if (c.structure === 'list' || c.structure === 'stack' || c.structure === 'queue') {
        const noun = { list: 'A lista', stack: 'A pilha', queue: 'A fila' }[c.structure];
        return `${noun} ${c.array} foi criada ${c.length === 0 ? 'vazia' : `com ${plural(c.length, 'item', 'itens')}`}.`;
      }
      if (c.structure === 'matrix') return `A matriz ${c.array} foi criada com ${size(c)}.`;
      return `O array ${c.array} foi criado com ${plural(c.length, 'posição', 'posições')}.`;
    case 'array-removed':
      return `O array ${c.array} saiu de escopo.`;
    case 'array-resized':
      return `${c.array} agora tem ${plural(c.to, 'posição', 'posições')} (antes tinha ${c.from}).`;
    case 'insert':
      if (c.structure === 'stack' && !c.shifted) return `${c.value} foi empilhado no topo de ${c.array}.`;
      if (c.structure === 'queue' && !c.shifted) return `${c.value} entrou no fim da fila ${c.array}.`;
      return c.shifted
        ? `${c.array} ganhou ${c.value} na posição ${c.index}. Os itens que estavam dali em diante andaram uma posição.`
        : `${c.array} ganhou ${c.value} no fim, na posição ${c.index}.`;
    case 'remove':
      // A regra da estrutura vai junto: é o que o aluno precisa guardar.
      if (c.structure === 'stack' && !c.shifted) {
        return `${c.value} saiu do topo de ${c.array}. Na pilha, sai sempre o último que entrou.`;
      }
      if (c.structure === 'queue' && c.index === 0) {
        return `${c.value} saiu da frente da fila ${c.array}. Na fila, sai sempre quem chegou primeiro.`;
      }
      return c.shifted
        ? `${c.value} saiu de ${c.array} (posição ${c.index}). Os itens seguintes voltaram uma posição.`
        : `${c.value} saiu do fim de ${c.array} (posição ${c.index}).`;
    case 'scalar':
      if (c.from === undefined) return `${c.name} foi criada valendo ${c.to}.`;
      if (c.to === undefined) return `${c.name} saiu de escopo.`;
      return `${c.name} mudou de ${c.from} para ${c.to}.`;
    case 'pointer':
      if (c.from === undefined) return `${c.name} foi criada valendo ${c.to}.`;
      if (c.to === undefined) return `${c.name} saiu de escopo.`;
      // Contadores de laço andam de um em um; o verbo diz a direção sem o aluno fazer a conta.
      if (c.to === c.from + 1) return `${c.name} avançou de ${c.from} para ${c.to}.`;
      if (c.to === c.from - 1) return `${c.name} recuou de ${c.from} para ${c.to}.`;
      if (c.to === 0 && c.from > 0) return `${c.name} voltou para 0 (o laço recomeçou).`;
      return `${c.name} mudou de ${c.from} para ${c.to}.`;
  }
}

/** "numeros tem 5 posições", "lista é uma lista vazia", "grade tem 2 linhas e 3 colunas". */
function describe(c: Extract<Change, { kind: 'array-added' }>): string {
  if (c.structure === 'matrix') return `${c.array} tem ${size(c)}`;
  if (c.structure === 'list' || c.structure === 'stack' || c.structure === 'queue') {
    const noun = { list: 'lista', stack: 'pilha', queue: 'fila' }[c.structure];
    return c.length === 0 ? `${c.array} é uma ${noun} vazia` : `${c.array} é uma ${noun} com ${plural(c.length, 'item', 'itens')}`;
  }
  return `${c.array} tem ${plural(c.length, 'posição', 'posições')}`;
}

function size(c: { length: number; cols?: number }): string {
  return `${plural(c.length, 'linha', 'linhas')} e ${plural(c.cols ?? 0, 'coluna', 'colunas')}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
