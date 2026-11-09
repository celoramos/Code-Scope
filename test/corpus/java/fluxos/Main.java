package corpus.fluxos;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class Main {
    record Aluno(String nome, double nota) {}

    public static void main(String[] args) {
        var alunos = List.of(new Aluno("Ana", 9), new Aluno("Bia", 6), new Aluno("Caio", 7.5)); // @pare
        List<String> aprovados = alunos.stream().filter(a -> a.nota() >= 7).map(Aluno::nome).collect(Collectors.toList());
        double media = alunos.stream().mapToDouble(Aluno::nota).average().orElse(0);
        Map<Boolean, List<String>> grupos = alunos.stream().collect(Collectors.partitioningBy(a -> a.nota() >= 7, Collectors.mapping(Aluno::nome, Collectors.toList())));
        Optional<Aluno> melhor = alunos.stream().max((a, b) -> Double.compare(a.nota(), b.nota()));
        int[] quadrados = IntStream.rangeClosed(1, 5).map(x -> x * x).toArray();
        int dia = 3;
        String nome = switch (dia) {
            case 1 -> "domingo";
            case 3 -> "terça";
            default -> "outro";
        };
        String texto = """
                linha 1
                linha 2""";
        System.out.println(aprovados + " " + media + grupos + melhor.get() + quadrados.length + nome + texto);
    } // @fim
}
