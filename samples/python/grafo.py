from collections import deque


def visitar():
    # Cada cidade e as cidades ligadas a ela.
    grafo = {
        "A": ["B", "C"],
        "B": ["A", "D"],
        "C": ["A", "D"],
        "D": ["B", "C"],
    }
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    fila = deque(["A"])
    visitados = ["A"]
    while fila:
        atual = fila.popleft()
        for vizinho in grafo[atual]:
            if vizinho not in visitados:
                visitados.append(vizinho)
                fila.append(vizinho)
    print(visitados)


visitar()
