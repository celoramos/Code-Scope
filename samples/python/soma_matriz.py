def somar():
    grade = [
        [1, 2, 3],
        [4, 5, 6],
    ]
    soma = 0

    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    for i in range(len(grade)):
        for j in range(len(grade[i])):
            soma += grade[i][j]

    print("Soma:", soma)


somar()
