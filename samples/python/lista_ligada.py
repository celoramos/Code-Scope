class No:
    def __init__(self, valor):
        self.valor = valor
        self.proximo = None


def main():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    inicio = No(10)
    inicio.proximo = No(20)
    inicio.proximo.proximo = No(30)

    atual = inicio
    soma = 0
    while atual is not None:
        soma = soma + atual.valor
        atual = atual.proximo
    print("Soma:", soma)


main()
