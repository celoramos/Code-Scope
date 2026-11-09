a, b = 0, 1  # @pare
for _ in range(85):
    a, b = b, a + b
fatorial = 1
for n in range(2, 31):
    fatorial *= n
potencia = 2**200
negativo = -(10**20)
limite = 2**53
print(a, fatorial, potencia, negativo, limite)
