def ordenar():
    numeros = [12, 11, 13, 5, 6]

    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for i in range(1, len(numeros)):
        atual = numeros[i]
        j = i - 1
        while j >= 0 and numeros[j] > atual:
            numeros[j + 1] = numeros[j]
            j -= 1
        numeros[j + 1] = atual

    print(numeros)


ordenar()
