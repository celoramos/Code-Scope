import java.util.ArrayList;

public class Turma {
    static class Aluno {
        String nome;
        double nota;

        Aluno(String nome, double nota) {
            this.nome = nome;
            this.nota = nota;
        }
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        ArrayList<Aluno> turma = new ArrayList<>();
        turma.add(new Aluno("Ana", 8.5));
        turma.add(new Aluno("Bia", 6.0));
        turma.add(new Aluno("Caio", 9.0));
        Aluno melhor = turma.get(0);
        for (int i = 1; i < turma.size(); i++) {
            if (turma.get(i).nota > melhor.nota) {
                melhor = turma.get(i);
            }
        }
        turma.get(1).nota = 7.0;
        System.out.println("Melhor: " + melhor.nome);
    }
}
