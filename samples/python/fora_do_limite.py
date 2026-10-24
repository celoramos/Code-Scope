def somar_notas():
    notas = [7, 9, 6]
    soma = 0
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    # Tem um erro escondido neste laço: descubra qual é.
    for i in range(len(notas) + 1):
        soma = soma + notas[i]
    print("Soma:", soma)


somar_notas()
