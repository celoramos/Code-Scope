def ordenar(v, inicio, fim):
    if inicio >= fim:
        return
    pivo = v[fim]
    i = inicio
    for j in range(inicio, fim):
        if v[j] < pivo:
            v[i], v[j] = v[j], v[i]
            i += 1
    v[i], v[fim] = v[fim], v[i]
    ordenar(v, inicio, i - 1)
    ordenar(v, i + 1, fim)


numeros = [7, 2, 9, 4, 5]
# Coloque um breakpoint na linha abaixo e use F11 (step into): o pivô vai para o lugar dele.
ordenar(numeros, 0, len(numeros) - 1)
print(numeros)
