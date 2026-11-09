from dataclasses import dataclass, field


@dataclass
class Ponto:
    x: int
    y: int


class Animal:
    def __init__(self, nome):
        self.nome = nome

    def som(self):
        return "..."

    def __repr__(self):
        return f"Animal({self.nome!r})"


class Cachorro(Animal):
    def som(self):
        return "au"


class Conta:
    __slots__ = ("titular", "saldo")

    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    @property
    def negativa(self):
        return self.saldo < 0

    @staticmethod
    def taxa():
        return 2


@dataclass
class Turma:
    nome: str
    alunos: list = field(default_factory=list)


p = Ponto(1, 2)  # @pare
q = Ponto(3, 4)
distancia = abs(p.x - q.x) + abs(p.y - q.y)
bicho = Cachorro("Rex")
som = bicho.som()
conta = Conta("Bia", 10)
conta.saldo -= Conta.taxa() * 6
negativa = conta.negativa
turma = Turma("1A")
turma.alunos.append("Ana")
turma.alunos.append("Bruno")
animais = [Animal("Mia"), bicho]
print(distancia, som, negativa, turma, animais)
