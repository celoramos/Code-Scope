from functools import lru_cache


def mochila(pesos, valores, capacidade):
    n = len(pesos)
    tabela = [[0] * (capacidade + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(capacidade + 1):
            tabela[i][c] = tabela[i - 1][c]
            if pesos[i - 1] <= c:
                tabela[i][c] = max(tabela[i][c], tabela[i - 1][c - pesos[i - 1]] + valores[i - 1])
    return tabela[n][capacidade]


memo = {}


def fib(n):
    if n in memo:
        return memo[n]
    if n < 2:
        return n
    memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]


@lru_cache(maxsize=None)
def caminhos(linhas, colunas):
    if linhas == 1 or colunas == 1:
        return 1
    return caminhos(linhas - 1, colunas) + caminhos(linhas, colunas - 1)


melhor = mochila([1, 3, 4], [15, 20, 30], 4)  # @pare
f = fib(15)
total = caminhos(3, 3)
print(melhor, f, total)
