class Aluno {
  constructor(nome, nota) {
    this.nome = nome;
    this.nota = nota;
  }
}

function main() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const turma = [];
  turma.push(new Aluno('Ana', 8.5));
  turma.push(new Aluno('Bia', 6));
  turma.push(new Aluno('Caio', 9));
  let melhor = turma[0];
  for (let i = 1; i < turma.length; i++) {
    if (turma[i].nota > melhor.nota) {
      melhor = turma[i];
    }
  }
  turma[1].nota = 7;
  console.log('Melhor:', melhor.nome);
}

main();
