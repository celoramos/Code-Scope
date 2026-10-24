class No {
  constructor(valor) {
    this.valor = valor;
    this.esquerda = null;
    this.direita = null;
  }
}

function inserir(raiz, valor) {
  if (raiz === null) {
    return new No(valor);
  }
  if (valor < raiz.valor) {
    raiz.esquerda = inserir(raiz.esquerda, valor);
  } else {
    raiz.direita = inserir(raiz.direita, valor);
  }
  return raiz;
}

function main() {
  const valores = [50, 30, 70, 20, 40, 60];
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  let raiz = null;
  for (let k = 0; k < valores.length; k++) {
    raiz = inserir(raiz, valores[k]);
  }
  console.log('Raiz:', raiz.valor);
}

main();
