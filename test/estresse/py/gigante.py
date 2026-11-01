class No:
    def __init__(self, valor, prox):
        self.valor = valor
        self.prox = prox


numeros = list(range(1_000_000))
matriz = [[i * j for j in range(300)] for i in range(300)]
tabela = {f"chave{i}": i for i in range(50_000)}
cabeca = None
for i in range(5000):
    cabeca = No(i, cabeca)
texto = "x" * 5_000_000
cubo = [[[k for k in range(50)] for _ in range(50)] for _ in range(50)]
objetos = [No(i, None) for i in range(1000)]
numeros[0] = 7  # PARE
numeros[1] = 8
matriz[1][1] = 99
tabela["chave1"] = -1
cabeca.valor = -1
objetos[0].valor = -1
for i in range(3):
    numeros[i] = i
print("fim")
