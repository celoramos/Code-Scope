def eh_palindromo(texto):
    limpo = [c.lower() for c in texto if c.isalnum()]
    esquerda, direita = 0, len(limpo) - 1
    while esquerda < direita:
        if limpo[esquerda] != limpo[direita]:
            return False
        esquerda += 1
        direita -= 1
    return True


def contar_letras(frase):
    contagem = {}
    for letra in frase:
        if letra != " ":
            contagem[letra] = contagem.get(letra, 0) + 1
    return contagem


def cifra(texto, deslocamento):
    resultado = ""
    for c in texto:
        resultado += chr((ord(c) - 97 + deslocamento) % 26 + 97)
    return resultado


frase = "A sacada da casa"  # @pare
palindromo = eh_palindromo(frase)
letras = contar_letras("banana nanica")
secreto = cifra("abc", 3)
palavras = frase.split()
juntas = "-".join(palavras)
acentos = "ação, coração, pão"
print(palindromo, letras, secreto, juntas, acentos)
