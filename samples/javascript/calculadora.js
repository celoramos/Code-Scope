// Conta em notação pós-fixa: "3 4 + 2 *" é (3 + 4) * 2.
const partes = ['3', '4', '+', '2', '*'];
const pilha = [];

// Coloque um breakpoint na linha abaixo e use F10 (step over).
for (const parte of partes) {
  if (parte === '+' || parte === '*') {
    const b = pilha.pop();
    const a = pilha.pop();
    pilha.push(parte === '+' ? a + b : a * b);
  } else {
    pilha.push(Number(parte));
  }
}

console.log('Resultado:', pilha.pop());
