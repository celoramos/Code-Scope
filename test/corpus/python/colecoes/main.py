from collections import Counter, OrderedDict, defaultdict, deque, namedtuple

Aluno = namedtuple("Aluno", ["nome", "nota"])

tupla = (1, 2, 3)  # @pare
conjunto = {3, 1, 2}
congelado = frozenset([1, 2])
contagem = Counter("banana")
agrupado = defaultdict(list)
for palavra in ["ana", "bia", "alice", "bruno"]:
    agrupado[palavra[0]].append(palavra)
ordenado = OrderedDict()
ordenado["z"] = 1
ordenado["a"] = 2
aluno = Aluno("Ana", 9.5)
turma = [Aluno("Bia", 7.0), aluno]
matriz = [[1, 2, 3], [4, 5, 6]]
transposta = [list(linha) for linha in zip(*matriz)]
pares = [(i, c) for i, c in enumerate("abc")]
ordenados = sorted(turma, key=lambda a: a.nota)
fila = deque(maxlen=3)
for i in range(5):
    fila.append(i)
aninhado = {"notas": [7, 8], "info": {"turma": "1A", "ano": 2026}}
fatia = list(range(10))[2:8:2]
vazia = []
vazio = {}
nenhum = set()
complexo = 3 + 4j
nada = None
print(tupla, conjunto, congelado, contagem, agrupado, ordenado, transposta, pares, ordenados, fila, aninhado, fatia, complexo, nada)
