class Animal {
  constructor(nome) {
    this.nome = nome;
  }

  som() {
    return '...';
  }

  toString() {
    return `Animal(${this.nome})`;
  }
}

class Cachorro extends Animal {
  static total = 0;

  constructor(nome) {
    super(nome);
    Cachorro.total++;
  }

  som() {
    return 'au';
  }
}

class Conta {
  #saldo = 0;

  depositar(valor) {
    this.#saldo += valor;
  }

  get saldo() {
    return this.#saldo;
  }
}

class No {
  constructor(chave) {
    this.chave = chave;
    this.esq = null;
    this.dir = null;
  }
}

function inserir(raiz, chave) {
  if (raiz === null) return new No(chave);
  if (chave < raiz.chave) raiz.esq = inserir(raiz.esq, chave);
  else raiz.dir = inserir(raiz.dir, chave);
  return raiz;
}

const bicho = new Cachorro('Rex'); // @pare
const som = bicho.som();
const conta = new Conta();
conta.depositar(50);
const saldo = conta.saldo;
let raiz = null;
for (const chave of [50, 30, 70, 20]) {
  raiz = inserir(raiz, chave);
}
const literal = { tipo: 'ponto', x: 1, y: 2 };
console.log(som, saldo, raiz, literal, String(bicho));
