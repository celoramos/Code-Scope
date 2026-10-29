function semRepetir() {
  const numeros = [3, 1, 3, 2, 1];
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const vistos = new Set();
  for (let i = 0; i < numeros.length; i++) {
    const numero = numeros[i];
    vistos.add(numero);
  }
  console.log(vistos.has(2));
  console.log(vistos);
}

semRepetir();
