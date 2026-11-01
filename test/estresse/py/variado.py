import collections
import dataclasses
import enum
import heapq
from typing import NamedTuple


@dataclasses.dataclass
class Ponto:
    x: int
    y: int = 0


class Cor(enum.Enum):
    VERMELHO = 1


class P(NamedTuple):
    a: int


class Base:
    __slots__ = ("v",)

    def __init__(self):
        self.v = 1


class Filha(Base):
    pass


def gerador(n):
    for i in range(n):
        yield i * 2


def fechamento():
    total = 0

    def soma(n):
        nonlocal total
        total += n
        return total
    return soma


def troca(a, i, j):
    a[i], a[j] = a[j], a[i]
    return a


fila = collections.deque([3, 1, 2])
contagem = collections.Counter("abracadabra")
padrao = collections.defaultdict(list)
heap = [5, 2, 8]
heapq.heapify(heap)
pontos = [Ponto(1), Ponto(2, 3)]
cor = Cor.VERMELHO
tupla = P(1)
filha = Filha()
gen = gerador(3)
soma = fechamento()
conjunto = {1, 2, 3}
congelado = frozenset({1})
fatia = list(range(10))[2:8:2]
gramatica = [x * x for x in range(5) if x % 2]
a = [1, 2, 3]  # PARE
troca(a, 0, 2)
fila.append(9)
fila.popleft()
heapq.heappush(heap, 1)
heapq.heappop(heap)
padrao["k"].append(1)
next(gen)
soma(3)
pontos[0].x = 9
for i, v in enumerate(a):
    a[i] = v + 1
while a:
    a.pop()
try:
    1 / 0
except ZeroDivisionError as e:
    erro = str(e)
x = 1
