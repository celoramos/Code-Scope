/**
 * Ordem das paradas do debugger. Se o F10 vem antes de a leitura da parada
 * anterior terminar, essa leitura é descartada: o programa já andou, e o que
 * ela lesse seria de um passo velho. O passo seguinte precisa saber quantas
 * paradas ficaram de fora, senão o painel compara dois passos distantes como
 * se fossem vizinhos e conta uma história falsa ("soma foi criada valendo 1").
 */
export class StopSequence {
  private generation = 0;
  private reading: number | undefined;
  private lost = 0;

  /** Nova parada: devolve o número dela. A leitura que ainda corria fica de fora. */
  start(): number {
    if (this.reading !== undefined) this.lost++;
    this.reading = ++this.generation;
    return this.generation;
  }

  /** A leitura desta parada ainda é a mais recente. */
  isCurrent(gen: number): boolean {
    return gen === this.generation;
  }

  /** A leitura desta parada terminou, publicada ou não. */
  finish(gen: number): void {
    if (this.reading === gen) this.reading = undefined;
  }

  /** Quantas paradas ficaram de fora desde o último passo publicado; volta a zero. */
  takeLost(): number {
    const n = this.lost;
    this.lost = 0;
    return n;
  }

  /** Sessão nova, encerrada ou sessão salva aberta: nenhuma leitura em andamento vale mais. */
  reset(): void {
    this.generation++;
    this.reading = undefined;
    this.lost = 0;
  }
}
