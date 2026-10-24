def buscar():
    ordenado = [3, 8, 12, 17, 21, 25, 30, 42]
    alvo = 25
    encontrado_em = -1
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    inicio = 0
    fim = len(ordenado) - 1
    while inicio <= fim:
        meio = (inicio + fim) // 2
        if ordenado[meio] == alvo:
            encontrado_em = meio
            break
        elif ordenado[meio] < alvo:
            inicio = meio + 1
        else:
            fim = meio - 1
    print("Encontrado na posição", encontrado_em)


buscar()
