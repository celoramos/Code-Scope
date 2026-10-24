def contar_palavras():
    palavras = ["sol", "mar", "sol", "lua", "sol"]
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    contagem = {}
    for i in range(len(palavras)):
        palavra = palavras[i]
        vezes = contagem.get(palavra, 0)
        contagem[palavra] = vezes + 1
    print(contagem)


contar_palavras()
