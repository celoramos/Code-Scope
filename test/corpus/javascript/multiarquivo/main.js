// Classes em outros arquivos: no.js e lista.js, ao lado deste.
const { ListaLigada } = require('./lista');

const lista = new ListaLigada(); // @pare
for (const valor of [3, 1, 4]) {
  lista.adicionar(valor);
}
console.log(lista.tamanho);
