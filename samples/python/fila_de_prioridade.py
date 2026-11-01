import heapq
from collections import deque


def atendimento():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    senhas = []
    heapq.heappush(senhas, 40)
    heapq.heappush(senhas, 10)
    heapq.heappush(senhas, 30)
    heapq.heappush(senhas, 20)
    proxima = heapq.heappop(senhas)

    # Um deque entra e sai pelas duas pontas.
    vagoes = deque()
    vagoes.append(1)
    vagoes.appendleft(2)
    vagoes.append(3)
    vagoes.popleft()
    vagoes.pop()
    print(proxima)


atendimento()
