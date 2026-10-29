function ordenar(v, inicio, fim) {
  if (inicio >= fim) return;
  const pivo = v[fim];
  let i = inicio;
  for (let j = inicio; j < fim; j++) {
    if (v[j] < pivo) {
      [v[i], v[j]] = [v[j], v[i]];
      i++;
    }
  }
  [v[i], v[fim]] = [v[fim], v[i]];
  ordenar(v, inicio, i - 1);
  ordenar(v, i + 1, fim);
}

const numeros = [7, 2, 9, 4, 5];
// Coloque um breakpoint na linha abaixo e use F11 (step into): o pivô vai para o lugar dele.
ordenar(numeros, 0, numeros.length - 1);
console.log(numeros);
