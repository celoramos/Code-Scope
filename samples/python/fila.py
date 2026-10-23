from collections import deque


def lanchonete():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    pedidos = deque()
    pedidos.append("pastel")
    pedidos.append("suco")
    pedidos.append("coxinha")
    pronto = pedidos.popleft()
    pronto = pedidos.popleft()
    print("Ainda esperando:", list(pedidos))


lanchonete()
