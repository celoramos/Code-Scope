def sem_repetir():
    numeros = [3, 1, 3, 2, 1]
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    vistos = set()
    for i in range(len(numeros)):
        numero = numeros[i]
        vistos.add(numero)
    print(2 in vistos)
    print(vistos)


sem_repetir()
