def permutacoes(itens):
    resultado = []

    def montar(atual, restantes):
        if not restantes:
            resultado.append(atual[:])
            return
        for i in range(len(restantes)):
            atual.append(restantes[i])
            montar(atual, restantes[:i] + restantes[i + 1 :])
            atual.pop()

    montar([], itens)
    return resultado


def rainhas(n):
    tabuleiro = [["." for _ in range(n)] for _ in range(n)]

    def segura(linha, coluna):
        for i in range(linha):
            d = linha - i
            if tabuleiro[i][coluna] == "Q":
                return False
            if coluna - d >= 0 and tabuleiro[i][coluna - d] == "Q":
                return False
            if coluna + d < n and tabuleiro[i][coluna + d] == "Q":
                return False
        return True

    def colocar(linha):
        if linha == n:
            return True
        for coluna in range(n):
            if segura(linha, coluna):
                tabuleiro[linha][coluna] = "Q"
                if colocar(linha + 1):
                    return True
                tabuleiro[linha][coluna] = "."
        return False

    colocar(0)
    return ["".join(linha) for linha in tabuleiro]


todas = permutacoes([1, 2, 3])  # @pare
solucao = rainhas(4)
print(todas, solucao)
