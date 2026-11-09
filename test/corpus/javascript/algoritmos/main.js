function quickSort(v, ini = 0, fim = v.length - 1) {
  if (ini >= fim) return v;
  const pivo = v[fim];
  let i = ini;
  for (let j = ini; j < fim; j++) {
    if (v[j] < pivo) {
      [v[i], v[j]] = [v[j], v[i]];
      i++;
    }
  }
  [v[i], v[fim]] = [v[fim], v[i]];
  quickSort(v, ini, i - 1);
  quickSort(v, i + 1, fim);
  return v;
}

function mergeSort(v) {
  if (v.length <= 1) return v;
  const meio = Math.floor(v.length / 2);
  const esq = mergeSort(v.slice(0, meio));
  const dir = mergeSort(v.slice(meio));
  const junto = [];
  while (esq.length && dir.length) junto.push(esq[0] <= dir[0] ? esq.shift() : dir.shift());
  return [...junto, ...esq, ...dir];
}

function buscaBinaria(v, alvo) {
  let ini = 0;
  let fim = v.length - 1;
  while (ini <= fim) {
    const meio = (ini + fim) >> 1;
    if (v[meio] === alvo) return meio;
    if (v[meio] < alvo) ini = meio + 1;
    else fim = meio - 1;
  }
  return -1;
}

const numeros = [5, 2, 9, 1, 7, 3]; // @pare
quickSort(numeros);
const ordenado = mergeSort([8, 3, 5, 1]);
const pos = buscaBinaria(numeros, 7);
console.log(numeros, ordenado, pos);
