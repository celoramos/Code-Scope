public class ForaDoLimite {
    public static void main(String[] args) {
        int[] notas = {7, 9, 6};
        int soma = 0;
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        // Tem um erro escondido neste laço: descubra qual é.
        for (int i = 0; i <= notas.length; i++) {
            soma = soma + notas[i];
        }
        System.out.println("Soma: " + soma);
    }
}
