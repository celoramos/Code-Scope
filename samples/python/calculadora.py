def calcular():
    # Conta em notação pós-fixa: "3 4 + 2 *" é (3 + 4) * 2.
    partes = ["3", "4", "+", "2", "*"]
    pilha = []

    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for parte in partes:
        if parte in ("+", "*"):
            b = pilha.pop()
            a = pilha.pop()
            pilha.append(a + b if parte == "+" else a * b)
        else:
            pilha.append(int(parte))

    print("Resultado:", pilha.pop())


calcular()
