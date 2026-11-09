from no import No


class ListaLigada:
    def __init__(self):
        self.inicio = None
        self.tamanho = 0

    def adicionar(self, valor):
        novo = No(valor)
        if self.inicio is None:
            self.inicio = novo
        else:
            atual = self.inicio
            while atual.proximo is not None:
                atual = atual.proximo
            atual.proximo = novo
        self.tamanho += 1

    def remover_primeiro(self):
        removido = self.inicio
        self.inicio = removido.proximo
        self.tamanho -= 1
        return removido.valor
