function inverter() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const palavra = 'radar';
  let invertida = '';
  for (let i = palavra.length - 1; i >= 0; i--) {
    const letra = palavra[i];
    invertida = invertida + letra;
  }
  const igual = palavra === invertida;
  console.log(invertida, igual);
}

inverter();
