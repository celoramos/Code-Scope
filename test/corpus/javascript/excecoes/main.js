class SaldoInsuficiente extends Error {
  constructor(falta) {
    super(`faltam ${falta}`);
    this.name = 'SaldoInsuficiente';
    this.falta = falta;
  }
}

function sacar(saldo, valor) {
  if (valor > saldo) throw new SaldoInsuficiente(valor - saldo);
  return saldo - valor;
}

let saldo = 100; // @pare
let falta = 0;
try {
  saldo = sacar(saldo, 30);
  saldo = sacar(saldo, 500);
} catch (erro) {
  falta = erro.falta;
} finally {
  saldo += 1;
}
let mensagem = '';
try {
  JSON.parse('{x');
} catch (e) {
  mensagem = e.message;
}
console.log(saldo, falta, mensagem);
