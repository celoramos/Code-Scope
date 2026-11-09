class SaldoInsuficiente(Exception):
    def __init__(self, falta):
        super().__init__(f"faltam {falta}")
        self.falta = falta


def sacar(saldo, valor):
    if valor > saldo:
        raise SaldoInsuficiente(valor - saldo)
    return saldo - valor


saldo = 100  # @pare
falta = 0
try:
    saldo = sacar(saldo, 30)
    saldo = sacar(saldo, 500)
except SaldoInsuficiente as erro:
    falta = erro.falta
finally:
    fim = True
mensagem = ""
try:
    numero = int("abc")
except ValueError as e:
    mensagem = str(e)
print(saldo, falta, mensagem, fim)
