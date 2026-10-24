class No {
  constructor(valor) {
    this.valor = valor;
    this.proximo = null;
  }
}

function main() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const inicio = new No(10);
  inicio.proximo = new No(20);
  inicio.proximo.proximo = new No(30);

  let atual = inicio;
  let soma = 0;
  while (atual !== null) {
    soma = soma + atual.valor;
    atual = atual.proximo;
  }
  console.log('Soma:', soma);
}

main();
