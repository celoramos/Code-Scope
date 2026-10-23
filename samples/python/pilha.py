def navegador():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    voltar = []
    voltar.append("inicio.html")
    voltar.append("busca.html")
    voltar.append("artigo.html")
    pagina = voltar.pop()
    pagina = voltar.pop()
    print("Ainda dá para voltar para:", voltar)


navegador()
