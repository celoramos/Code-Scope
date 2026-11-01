import sys

sys.setrecursionlimit(5000)


def desce(n, lista):
    lista.append(n)
    if n == 0:
        return 0  # PARE
    return 1 + desce(n - 1, lista)


print(desce(900, []))
