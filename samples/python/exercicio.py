# @exercise Este laço tem um erro: a soma de [1, 2, 3, 4, 5] deveria dar 15. Conserte e rode de novo.
# @expect soma = 15
def somar():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    numeros = [1, 2, 3, 4, 5]
    soma = 0
    # @note Repare até onde o i vai: range(n) para antes de n.
    for i in range(len(numeros) - 1):
        soma += numeros[i]
    print(soma)


somar()
