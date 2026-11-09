class Ponto:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, outro):
        return isinstance(outro, Ponto) and (self.x, self.y) == (outro.x, outro.y)

    def __hash__(self):
        return hash((self.x, self.y))


class Contagem:
    def __init__(self, limite):
        self.limite = limite
        self.atual = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.atual >= self.limite:
            raise StopIteration
        self.atual += 1
        return self.atual


pontos = {Ponto(1, 2), Ponto(1, 2), Ponto(3, 4)}  # @pare
indice = {Ponto(0, 0): "origem"}
valores = [n for n in Contagem(3)]
mesmo = Ponto(1, 2) == Ponto(1, 2)
print(len(pontos), indice, valores, mesmo)
