import type { Snapshot } from './snapshot';

/** Passos guardados por sessão. Um laço longo com F5 não deve encher a memória. */
export const MAX_STEPS = 1000;

export interface Step {
  snapshot: Snapshot;
  prev?: Snapshot;
  older?: Snapshot;
  /** Todos os passos até este, do mais antigo ao atual: base do teste de mesa. */
  past: readonly Snapshot[];
  /** Posição a partir de 1, como o contador mostra. */
  index: number;
  total: number;
}

/**
 * Histórico de snapshots com um cursor. Navegar só muda o cursor: a execução
 * do programa não volta.
 */
export class History {
  private items: Snapshot[] = [];
  private cursor = -1;

  /** Um passo novo sempre leva o cursor para o fim, mesmo se o aluno estava revendo. */
  push(snapshot: Snapshot) {
    this.items.push(snapshot);
    if (this.items.length > MAX_STEPS) this.items.shift();
    this.cursor = this.items.length - 1;
  }

  /** Cópia de todos os snapshots, do mais antigo ao mais novo. */
  all(): Snapshot[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.cursor = -1;
  }

  back(): boolean {
    if (this.cursor <= 0) return false;
    this.cursor--;
    return true;
  }

  forward(): boolean {
    if (this.cursor >= this.items.length - 1) return false;
    this.cursor++;
    return true;
  }

  /** Pula para o passo n (a partir de 1); valores fora do intervalo param na ponta. */
  goto(n: number): boolean {
    if (this.items.length === 0) return false;
    const target = Math.min(Math.max(Math.round(n), 1), this.items.length) - 1;
    if (target === this.cursor) return false;
    this.cursor = target;
    return true;
  }

  current(): Step | undefined {
    const snapshot = this.items[this.cursor];
    if (!snapshot) return undefined;
    return {
      snapshot,
      prev: this.items[this.cursor - 1],
      older: this.items[this.cursor - 2],
      past: this.items.slice(0, this.cursor + 1),
      index: this.cursor + 1,
      total: this.items.length,
    };
  }
}
