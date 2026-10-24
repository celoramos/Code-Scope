function copias() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const nome = '  ana  ';
  nome.trim();
  const limpo = nome.trim();
  const notas = [7, 5, 9];
  const mesmas = notas;
  const copia = notas.slice();
  notas.sort();
  console.log(limpo, mesmas, copia);
}

copias();
