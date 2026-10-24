def somar_entradas():
    entradas = ["12", "abc", "7"]
    soma = 0
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for i in range(len(entradas)):
        try:
            numero = int(entradas[i])
            soma = soma + numero
        except ValueError as e:
            print("Ignorando:", entradas[i])
    print("Soma:", soma)


somar_entradas()
