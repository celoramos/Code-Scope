class Trie:
    def __init__(self):
        self.filhos = {}
        self.fim = False


def inserir(raiz, palavra):
    no = raiz
    for letra in palavra:
        if letra not in no.filhos:
            no.filhos[letra] = Trie()
        no = no.filhos[letra]
    no.fim = True


def achar(pai, x):
    while pai[x] != x:
        pai[x] = pai[pai[x]]
        x = pai[x]
    return x


def unir(pai, a, b):
    ra, rb = achar(pai, a), achar(pai, b)
    if ra != rb:
        pai[rb] = ra


def heap_sort(v):
    n = len(v)

    def descer(i, tamanho):
        maior = i
        esq, dir = 2 * i + 1, 2 * i + 2
        if esq < tamanho and v[esq] > v[maior]:
            maior = esq
        if dir < tamanho and v[dir] > v[maior]:
            maior = dir
        if maior != i:
            v[i], v[maior] = v[maior], v[i]
            descer(maior, tamanho)

    for i in range(n // 2 - 1, -1, -1):
        descer(i, n)
    for fim in range(n - 1, 0, -1):
        v[0], v[fim] = v[fim], v[0]
        descer(0, fim)
    return v


raiz = Trie()  # @pare
for palavra in ["sol", "solo", "sal"]:
    inserir(raiz, palavra)
pai = list(range(6))
unir(pai, 0, 1)
unir(pai, 2, 3)
unir(pai, 1, 3)
grupo = achar(pai, 3)
ordenado = heap_sort([5, 2, 9, 1, 7])
print(grupo, pai, ordenado)
