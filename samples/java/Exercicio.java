// @exercise Este laço tem um erro: a soma de {1, 2, 3, 4, 5} deveria dar 15. Conserte e rode de novo.
// @expect soma = 15
public class Exercicio {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        int[] numeros = {1, 2, 3, 4, 5};
        int soma = 0;
        // @note Repare até onde o i vai: a última posição é numeros.length - 1.
        for (int i = 0; i < numeros.length - 1; i++) {
            soma += numeros[i];
        }
        System.out.println(soma);
    }
}
