function contarPalavras() {
  const palavras = ['sol', 'mar', 'sol', 'lua', 'sol'];
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const contagem = {};
  for (let i = 0; i < palavras.length; i++) {
    const palavra = palavras[i];
    const vezes = contagem[palavra] ?? 0;
    contagem[palavra] = vezes + 1;
  }
  console.log(contagem);
}

contarPalavras();
