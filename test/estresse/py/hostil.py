import math


class ReprRuim:
    def __repr__(self):
        raise RuntimeError("repr quebrado")


class LenRuim(list):
    def __len__(self):
        raise RuntimeError("len quebrado")


class AttrRuim:
    def __getattr__(self, nome):
        raise RuntimeError("getattr quebrado")


class Propriedade:
    def __init__(self):
        self.contador = 0

    @property
    def efeito(self):
        self.contador += 1
        return self.contador


class Lento:
    def __repr__(self):
        import time
        time.sleep(3)
        return "lento"


lista_ciclo = [1, 2]
lista_ciclo.append(lista_ciclo)
dict_ciclo = {}
dict_ciclo["eu"] = dict_ciclo
ruim = ReprRuim()
len_ruim = LenRuim([1, 2, 3])
attr_ruim = AttrRuim()
prop = Propriedade()
lento = Lento()
lista_ruim = [ReprRuim(), ReprRuim()]
especiais = [None, True, math.nan, math.inf, -math.inf, 10 ** 400, 1 + 2j, b"\x00\xff"]
texto = "aç😀\n\t\"'<script>alert(1)</script>\x00"
chaves = {(1, 2): "tupla", None: "nada", 3.5: "float", "<b>": "html"}
vazios = [[], {}, set(), (), "", [[]], [[], [1]]]
irregular = [[1, 2, 3], [4], [], [5, 6]]
misto = [1, "dois", 3.0, None, [4], {"cinco": 5}]
i = 10 ** 30  # PARE
j = -1
k = i
misto[j] = 0
print = 3
list = 4
del irregular
del lista_ciclo
x = 1
