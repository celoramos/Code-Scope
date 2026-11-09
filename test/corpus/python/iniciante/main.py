# Quem está começando: sem funções, só variáveis, listas e laços.
nome = "Ana"  # @pare
idade = 17
altura = 1.68
aprovado = True
notas = [7.5, 8.0, 6.5, 9.0]
soma = 0
for nota in notas:
    soma = soma + nota
media = soma / len(notas)
if media >= 7:
    situacao = "aprovada"
else:
    situacao = "recuperação"
contador = 10
while contador > 0:
    contador -= 3
pares = []
for i in range(10):
    if i % 2 == 0:
        pares.append(i)
frase = f"{nome} tem média {media:.1f} e está {situacao}"
letras = list(nome)
invertido = nome[::-1]
print(frase, pares, letras, invertido, idade, altura, aprovado)
