function fatorial(n) {
  if (n <= 1) {
    return 1;
  }
  const resultado = n * fatorial(n - 1);
  return resultado;
}

function main() {
  // Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
  const valor = fatorial(4);
  console.log('4! =', valor);
}

main();
