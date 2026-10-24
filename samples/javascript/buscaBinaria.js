function buscar() {
  const ordenado = [3, 8, 12, 17, 21, 25, 30, 42];
  const alvo = 25;
  let encontradoEm = -1;
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  let inicio = 0;
  let fim = ordenado.length - 1;
  while (inicio <= fim) {
    const meio = Math.floor((inicio + fim) / 2);
    if (ordenado[meio] === alvo) {
      encontradoEm = meio;
      break;
    } else if (ordenado[meio] < alvo) {
      inicio = meio + 1;
    } else {
      fim = meio - 1;
    }
  }
  console.log('Encontrado na posição', encontradoEm);
}

buscar();
