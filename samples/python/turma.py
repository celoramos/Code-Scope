class Aluno:
    def __init__(self, nome, nota):
        self.nome = nome
        self.nota = nota


def main():
    # Coloque um breakpoint na linha abaixo e use F10 (step over).
    turma = []
    turma.append(Aluno("Ana", 8.5))
    turma.append(Aluno("Bia", 6.0))
    turma.append(Aluno("Caio", 9.0))
    melhor = turma[0]
    for i in range(1, len(turma)):
        if turma[i].nota > melhor.nota:
            melhor = turma[i]
    turma[1].nota = 7.0
    print("Melhor:", melhor.nome)


main()
