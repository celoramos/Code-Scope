class Conta {
  constructor(titular, saldo) {
    this.titular = titular;
    this.saldo = saldo;
  }

  depositar(valor) {
    this.saldo = this.saldo + valor;
  }
}

function main() {
  // Coloque um breakpoint na linha abaixo e use F10 (step over).
  const minha = new Conta('Ana', 100);
  const outra = minha;
  outra.depositar(50);
  const nova = new Conta('Bia', 20);
  const a = [1, 2, 3];
  const b = a;
  b[0] = 99;
  console.log(minha.saldo, nova.saldo, a[0]);
}

main();
