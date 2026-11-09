package corpus.iniciante;

public class Main {
    public static void main(String[] args) {
        String nome = "Ana"; // @pare
        int idade = 17;
        double altura = 1.68;
        boolean aprovado = true;
        char inicial = nome.charAt(0);
        double[] notas = {7.5, 8.0, 6.5, 9.0};
        double soma = 0;
        for (int i = 0; i < notas.length; i++) {
            soma += notas[i];
        }
        double media = soma / notas.length;
        String situacao = media >= 7 ? "aprovada" : "recuperação";
        int[] pares = new int[5];
        for (int i = 0; i < 5; i++) {
            pares[i] = i * 2;
        }
        long fatorial = 1;
        for (int n = 2; n <= 20; n++) {
            fatorial *= n;
        }
        long grande = Long.MAX_VALUE;
        System.out.println(nome + idade + altura + aprovado + inicial + media + situacao + fatorial + grande);
    } // @fim
}
