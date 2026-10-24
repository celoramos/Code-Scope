def fatorial(n):
    if n <= 1:
        return 1
    resultado = n * fatorial(n - 1)
    return resultado


def main():
    # Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
    valor = fatorial(4)
    print("4! =", valor)


main()
