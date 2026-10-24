function somarEntradas() {
  const entradas = ['12', '{x', '7'];
  let soma = 0;
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  for (let i = 0; i < entradas.length; i++) {
    try {
      const numero = JSON.parse(entradas[i]);
      soma = soma + numero;
    } catch (e) {
      console.log('Ignorando:', entradas[i]);
    }
  }
  console.log('Soma:', soma);
}

somarEntradas();
