def contador():
    total = 0

    def incrementar(passo=1):
        nonlocal total
        total += passo
        return total

    return incrementar


def quadrados(limite):
    for n in range(limite):
        yield n * n


def decorar(funcao):
    def envolvida(*args):
        resultado = funcao(*args)
        return resultado * 2

    return envolvida


@decorar
def soma(a, b):
    return a + b


conta = contador()  # @pare
conta()
conta(5)
gerados = list(quadrados(4))
dobro = soma(2, 3)
filtrados = list(filter(lambda x: x % 2 == 0, map(lambda x: x + 1, range(6))))
print(gerados, dobro, filtrados)
