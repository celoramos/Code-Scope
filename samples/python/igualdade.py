class Ponto:
    def __init__(self, x, y):
        self.x = x
        self.y = y


def comparar():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    a = [1, 2]
    b = [1, 2]
    if a == b:
        print("a == b")
    if a is b:
        print("a is b")
    p = Ponto(1, 2)
    q = Ponto(1, 2)
    if p == q:
        print("p == q")


comparar()
