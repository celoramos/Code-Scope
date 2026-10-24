function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

function main() {
  // Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
  const resultado = fib(4);
  console.log('fib(4) =', resultado);
}

main();
