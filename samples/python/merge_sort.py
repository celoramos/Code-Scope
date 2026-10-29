def ordenar(v):
    if len(v) <= 1:
        return v
    meio = len(v) // 2
    esquerda = ordenar(v[:meio])
    direita = ordenar(v[meio:])
    return juntar(esquerda, direita)


def juntar(a, b):
    r = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            r.append(a[i])
            i += 1
        else:
            r.append(b[j])
            j += 1
    return r + a[i:] + b[j:]


numeros = [38, 27, 43, 3]
# Coloque um breakpoint na linha abaixo e use F11 (step into): cada chamada recebe metade da lista.
ordenado = ordenar(numeros)
print(ordenado)
