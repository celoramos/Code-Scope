def copias():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    nome = "  ana  "
    nome.strip()
    limpo = nome.strip()
    notas = [7, 5, 9]
    mesmas = notas
    ordenada = sorted(notas)
    notas.sort()
    print(limpo, mesmas, ordenada)


copias()
