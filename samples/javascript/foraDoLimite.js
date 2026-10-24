function listarNomes() {
  const alunos = [{ nome: 'Ana' }, { nome: 'Bia' }];
  let nomes = '';
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  // Tem um erro escondido neste laço: descubra qual é.
  for (let i = 0; i <= alunos.length; i++) {
    nomes = nomes + alunos[i].nome + ' ';
  }
  console.log(nomes);
}

listarNomes();
