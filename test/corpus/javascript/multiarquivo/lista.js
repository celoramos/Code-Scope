const { No } = require('./no');

class ListaLigada {
  constructor() {
    this.inicio = null;
    this.tamanho = 0;
  }

  adicionar(valor) {
    const novo = new No(valor);
    if (this.inicio === null) {
      this.inicio = novo;
    } else {
      let atual = this.inicio;
      while (atual.proximo !== null) {
        atual = atual.proximo;
      }
      atual.proximo = novo;
    }
    this.tamanho++;
  }
}

module.exports = { ListaLigada };
