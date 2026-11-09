class No:
    def __init__(self, chave):
        self.chave = chave
        self.esq = None
        self.dir = None


def inserir(raiz, chave):
    if raiz is None:
        return No(chave)
    if chave < raiz.chave:
        raiz.esq = inserir(raiz.esq, chave)
    else:
        raiz.dir = inserir(raiz.dir, chave)
    return raiz


def em_ordem(raiz, saida):
    if raiz is not None:
        em_ordem(raiz.esq, saida)
        saida.append(raiz.chave)
        em_ordem(raiz.dir, saida)


def altura(raiz):
    if raiz is None:
        return 0
    return 1 + max(altura(raiz.esq), altura(raiz.dir))


raiz = None  # @pare
for chave in [50, 30, 70, 20, 40, 60]:
    raiz = inserir(raiz, chave)
ordenados = []
em_ordem(raiz, ordenados)
h = altura(raiz)
print(ordenados, h)
