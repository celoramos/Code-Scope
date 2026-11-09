// Variáveis do módulo que as funções usam e mudam.
const historico = [];
const contagem = { a: 0, b: 0 };
let total = 0;

function registrar(evento) {
  historico.push(evento);
  contagem[evento] += 1;
}

function somar(valor) {
  total += valor;
  return total;
}

function criarContador() {
  let n = 0;
  return () => ++n;
}

for (const evento of ['a', 'b', 'a']) { // @pare
  registrar(evento);
  somar(historico.length);
}
const proximo = criarContador();
proximo();
proximo();
console.log(historico, contagem, total);
