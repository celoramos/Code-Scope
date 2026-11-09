# Variáveis do módulo que as funções usam e mudam.
historico = []
contagem = {"a": 0, "b": 0}
total = 0


def registrar(evento):
    historico.append(evento)
    contagem[evento] += 1


def somar(valor):
    global total
    total += valor
    return total


for evento in ["a", "b", "a"]:  # @pare
    registrar(evento)
    somar(len(historico))
print(historico, contagem, total)
