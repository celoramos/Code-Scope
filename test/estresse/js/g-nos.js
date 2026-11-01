class No { constructor(v, p) { this.valor = v; this.prox = p; } }
let cabeca = null;
for (let i = 0; i < 5000; i++) cabeca = new No(i, cabeca);
cabeca.valor = 7; // PARE
cabeca.valor = 8;
cabeca.valor = 9;
console.log('fim');
