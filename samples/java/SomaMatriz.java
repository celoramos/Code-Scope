public class SomaMatriz {
    public static void main(String[] args) {
        int[][] grade = {
            {1, 2, 3},
            {4, 5, 6}
        };
        int soma = 0;

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < grade.length; i++) {
            for (int j = 0; j < grade[i].length; j++) {
                soma += grade[i][j];
            }
        }

        System.out.println("Soma: " + soma);
    }
}
