const grade = [
  [1, 2, 3],
  [4, 5, 6],
];
let soma = 0;

// Coloque um breakpoint na linha abaixo e use F10 (step over).
for (let i = 0; i < grade.length; i++) {
  for (let j = 0; j < grade[i].length; j++) {
    soma += grade[i][j];
  }
}

console.log('Soma:', soma);
