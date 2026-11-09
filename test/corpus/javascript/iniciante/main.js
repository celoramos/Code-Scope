// Quem está começando: sem funções, só variáveis, arrays e laços.
let nome = 'Ana'; // @pare
const idade = 17;
var altura = 1.68;
let aprovado = true;
const notas = [7.5, 8, 6.5, 9];
let soma = 0;
for (let i = 0; i < notas.length; i++) {
  soma += notas[i];
}
const media = soma / notas.length;
let situacao;
if (media >= 7) {
  situacao = 'aprovada';
} else {
  situacao = 'recuperação';
}
const pares = [];
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) pares.push(i);
}
const pessoa = { nome, idade, cidade: 'Recife' };
const frase = `${nome} tem média ${media.toFixed(1)}`;
const letras = nome.split('');
const grande = 2n ** 100n;
let nada = null;
let indefinido;
const especiais = [NaN, Infinity, -0];
console.log(frase, pares, pessoa, letras, grande, nada, indefinido, especiais, altura, aprovado);
