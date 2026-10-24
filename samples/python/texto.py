def inverter():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    palavra = "radar"
    invertida = ""
    for i in range(len(palavra) - 1, -1, -1):
        letra = palavra[i]
        invertida = invertida + letra
    inicio = palavra[0:3]
    igual = palavra == invertida
    print(invertida, inicio, igual)


inverter()
