# Classes em outros arquivos: no.py e lista.py, ao lado deste.
from lista import ListaLigada

lista = ListaLigada()  # @pare
for valor in [3, 1, 4, 1, 5]:
    lista.adicionar(valor)
primeiro = lista.remover_primeiro()
print(primeiro, lista.tamanho)
