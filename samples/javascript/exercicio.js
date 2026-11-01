// @exercise Este laço tem um erro: a soma de [1, 2, 3, 4, 5] deveria dar 15. Conserte e rode de novo.
// @expect soma = 15
function somar() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const numeros = [1, 2, 3, 4, 5];
  let soma = 0;
  // @note Repare até onde o i vai: a última posição é numeros.length - 1.
  for (let i = 0; i < numeros.length - 1; i++) {
    soma += numeros[i];
  }
  console.log(soma);
}

somar();
