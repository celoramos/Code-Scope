import type { Change } from './diff';

/**
 * Modo iniciante: uma frase curta por mudança, na ordem em que o aluno deve
 * ler. Arrays primeiro, porque são o assunto; ponteiros depois.
 */
export function explain(changes: Change[], isFirstStep = false): string[] {
  if (isFirstStep) {
    const added = changes.filter((c) => c.kind === 'array-added');
    if (added.length === 0) return ['Primeiro passo. Ainda não há arrays nas variáveis locais.'];
    return added.map((c) => `Primeiro passo: ${c.array} tem ${plural(c.length, 'posição', 'posições')}.`);
  }

  const arrays = changes.filter((c) => c.kind !== 'pointer').map(sentence);
  const pointers = changes.filter((c) => c.kind === 'pointer').map(sentence);
  const all = [...arrays, ...pointers];
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
      return `O array ${c.array} foi criado com ${plural(c.length, 'posição', 'posições')}.`;
    case 'array-removed':
      return `O array ${c.array} saiu de escopo.`;
    case 'array-resized':
      return `${c.array} agora é outro array, com ${plural(c.to, 'posição', 'posições')} (antes tinha ${c.from}).`;
    case 'pointer':
      if (c.from === undefined) return `${c.name} foi criada valendo ${c.to}.`;
      if (c.to === undefined) return `${c.name} saiu de escopo.`;
      return `${c.name} mudou de ${c.from} para ${c.to}.`;
  }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
