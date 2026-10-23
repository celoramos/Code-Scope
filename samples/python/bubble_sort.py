def ordenar():
    numeros = [5, 1, 4, 2, 8]

    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for i in range(len(numeros) - 1):
        for j in range(len(numeros) - 1 - i):
            if numeros[j] > numeros[j + 1]:
                numeros[j], numeros[j + 1] = numeros[j + 1], numeros[j]

    print(numeros)


ordenar()
