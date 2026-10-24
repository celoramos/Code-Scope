def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def main():
    # Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
    resultado = fib(4)
    print("fib(4) =", resultado)


main()
