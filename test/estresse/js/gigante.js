class No { constructor(v, p) { this.valor = v; this.prox = p; } }
const numeros = Array.from({ length: 1000000 }, (_, i) => i);
const matriz = Array.from({ length: 300 }, (_, i) => Array.from({ length: 300 }, (_, j) => i * j));
const tabela = {};
for (let i = 0; i < 50000; i++) tabela['chave' + i] = i;
const mapa = new Map(Array.from({ length: 50000 }, (_, i) => [i, i]));
let cabeca = null;
for (let i = 0; i < 5000; i++) cabeca = new No(i, cabeca);
const texto = 'x'.repeat(5000000);
const objetos = Array.from({ length: 1000 }, (_, i) => new No(i, null));
numeros[0] = 7; // PARE
numeros[1] = 8;
matriz[1][1] = 99;
tabela.chave1 = -1;
mapa.set(1, -1);
cabeca.valor = -1;
objetos[0].valor = -1;
for (let i = 0; i < 3; i++) numeros[i] = i;
console.log('fim');
