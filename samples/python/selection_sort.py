def ordenar():
    numeros = [29, 10, 14, 37, 13]

    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for i in range(len(numeros) - 1):
        menor = i
        for j in range(i + 1, len(numeros)):
            if numeros[j] < numeros[menor]:
                menor = j
        numeros[i], numeros[menor] = numeros[menor], numeros[i]

    print(numeros)


ordenar()
