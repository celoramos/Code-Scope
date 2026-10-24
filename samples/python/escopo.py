class Placar:
    def __init__(self):
        self.pontos = 0

    def somar(self, pontos):
        # O parâmetro pontos e o atributo self.pontos são coisas diferentes.
        self.pontos = self.pontos + pontos


def main():
    # Coloque um breakpoint na linha abaixo e use F10 (step over) e F11 (step into).
    total = 1
    for i in range(2):
        dobro = i * 2
        total = total + dobro
    placar = Placar()
    placar.somar(5)
    print(total, placar.pontos)


main()
