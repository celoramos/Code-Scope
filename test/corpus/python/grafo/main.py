from collections import deque
import heapq

grafo = {  # @pare
    "A": ["B", "C"],
    "B": ["D"],
    "C": ["D", "E"],
    "D": ["F"],
    "E": ["F"],
    "F": [],
}


def bfs(inicio):
    visitados = {inicio}
    fila = deque([inicio])
    ordem = []
    while fila:
        atual = fila.popleft()
        ordem.append(atual)
        for vizinho in grafo[atual]:
            if vizinho not in visitados:
                visitados.add(vizinho)
                fila.append(vizinho)
    return ordem


def dfs(atual, visitados, ordem):
    visitados.add(atual)
    ordem.append(atual)
    for vizinho in grafo[atual]:
        if vizinho not in visitados:
            dfs(vizinho, visitados, ordem)
    return ordem


pesos = {"A": {"B": 4, "C": 1}, "B": {"D": 1}, "C": {"B": 2, "D": 5}, "D": {}}


def dijkstra(origem):
    dist = {v: float("inf") for v in pesos}
    dist[origem] = 0
    heap = [(0, origem)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in pesos[u].items():
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist


largura = bfs("A")
profundidade = dfs("A", set(), [])
distancias = dijkstra("A")
print(largura, profundidade, distancias)
