const numeros = [12, 11, 13, 5, 6];

// Coloque um breakpoint na linha abaixo e use F10 (step over).
for (let i = 1; i < numeros.length; i++) {
  const atual = numeros[i];
  let j = i - 1;
  while (j >= 0 && numeros[j] > atual) {
    numeros[j + 1] = numeros[j];
    j--;
  }
  numeros[j + 1] = atual;
}

console.log(numeros);
