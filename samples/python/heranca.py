class Animal:
    def __init__(self, nome):
        self.nome = nome

    def falar(self):
        return "..."


class Cachorro(Animal):
    def falar(self):
        return "Au!"


class Gato(Animal):
    def falar(self):
        return "Miau!"


def main():
    bichos = [Cachorro("Rex"), Gato("Mia"), Animal("Bob")]
    # Coloque um breakpoint na linha abaixo e use F11 (step into) para ver qual falar() roda.
    for i in range(len(bichos)):
        som = bichos[i].falar()
        print(bichos[i].nome + ":", som)


main()
