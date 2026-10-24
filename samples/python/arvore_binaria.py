class No:
    def __init__(self, valor):
        self.valor = valor
        self.esquerda = None
        self.direita = None


def inserir(raiz, valor):
    if raiz is None:
        return No(valor)
    if valor < raiz.valor:
        raiz.esquerda = inserir(raiz.esquerda, valor)
    else:
        raiz.direita = inserir(raiz.direita, valor)
    return raiz


def main():
    valores = [50, 30, 70, 20, 40, 60]
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    raiz = None
    for k in range(len(valores)):
        raiz = inserir(raiz, valores[k])
    print("Raiz:", raiz.valor)


main()
