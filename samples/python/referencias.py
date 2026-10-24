class Conta:
    def __init__(self, titular, saldo):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        self.saldo = self.saldo + valor


def main():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    minha = Conta("Ana", 100)
    outra = minha
    outra.depositar(50)
    nova = Conta("Bia", 20)
    a = [1, 2, 3]
    b = a
    b[0] = 99
    print(minha.saldo, nova.saldo, a[0])


main()
