const mapa = new Map([ // @pare
  ['ana', 9],
  ['bia', 7],
]);
mapa.set('caio', 8);
const conjunto = new Set([3, 1, 3, 2]);
conjunto.add(5);
const dicionario = { maçã: 3, banana: 5 };
dicionario['uva'] = 1;
const matriz = [
  [1, 2, 3],
  [4, 5, 6],
];
const alunos = [
  { nome: 'Ana', nota: 9 },
  { nome: 'Bia', nota: 6 },
];
const aprovados = alunos.filter((a) => a.nota >= 7).map((a) => a.nome);
const soma = [1, 2, 3, 4].reduce((acc, x) => acc + x, 0);
const ordenados = [10, 1, 5].sort((a, b) => a - b);
const [primeiro, ...resto] = ordenados;
const copia = { ...dicionario, kiwi: 2 };
const tipado = new Int32Array([4, 5, 6]);
const esparso = [1, , 3];
esparso[6] = 7;
const vazio = [];
const fila = [];
fila.push(1);
fila.push(2);
const frente = fila.shift();
const pilha = [];
pilha.push('x');
pilha.push('y');
const topo = pilha.pop();
const grafo = { A: ['B', 'C'], B: ['C'], C: [] };
const data = new Date(2026, 0, 1);
const regex = /a+b/g;
const simbolo = Symbol('id');
console.log(mapa, conjunto, matriz, aprovados, soma, primeiro, resto, copia, tipado, esparso, vazio, frente, topo, grafo, data, regex, simbolo);
