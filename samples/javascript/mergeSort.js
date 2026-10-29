function ordenar(v) {
  if (v.length <= 1) return v;
  const meio = Math.floor(v.length / 2);
  const esquerda = ordenar(v.slice(0, meio));
  const direita = ordenar(v.slice(meio));
  return juntar(esquerda, direita);
}

function juntar(a, b) {
  const r = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) r.push(a[i++]);
    else r.push(b[j++]);
  }
  return r.concat(a.slice(i), b.slice(j));
}

const numeros = [38, 27, 43, 3];
// Coloque um breakpoint na linha abaixo e use F11 (step into): cada chamada recebe metade do array.
const ordenado = ordenar(numeros);
console.log(ordenado);
