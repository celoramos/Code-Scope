import { Pilha } from './pilha.js';

const pilha = new Pilha(); // @pare
pilha.empilhar('a');
pilha.empilhar('b');
const topo = pilha.desempilhar();
const tamanho = pilha.tamanho;
console.log(topo, tamanho);
