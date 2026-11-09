export class Pilha {
  #itens = [];

  empilhar(x) {
    this.#itens.push(x);
  }

  desempilhar() {
    return this.#itens.pop();
  }

  get tamanho() {
    return this.#itens.length;
  }
}
