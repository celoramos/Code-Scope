const numeros = [29, 10, 14, 37, 13];

// Coloque um breakpoint na linha abaixo e use F10 (step over).
for (let i = 0; i < numeros.length - 1; i++) {
  let menor = i;
  for (let j = i + 1; j < numeros.length; j++) {
    if (numeros[j] < numeros[menor]) {
      menor = j;
    }
  }
  const temp = numeros[i];
  numeros[i] = numeros[menor];
  numeros[menor] = temp;
}

console.log(numeros);
