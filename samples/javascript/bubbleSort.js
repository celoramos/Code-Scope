const numeros = [5, 1, 4, 2, 8];

// Coloque um breakpoint na linha abaixo e use F10 (step over).
for (let i = 0; i < numeros.length - 1; i++) {
  for (let j = 0; j < numeros.length - 1 - i; j++) {
    if (numeros[j] > numeros[j + 1]) {
      const temp = numeros[j];
      numeros[j] = numeros[j + 1];
      numeros[j + 1] = temp;
    }
  }
}

console.log(numeros);
