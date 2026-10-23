public class BuscaLinear {
    public static void main(String[] args) {
        int[] valores = {12, 7, 3, 25, 9, 14};
        int alvo = 25;
        int encontradoEm = -1;

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < valores.length; i++) {
            if (valores[i] == alvo) {
                encontradoEm = i;
                break;
            }
        }

        System.out.println("Encontrado na posição " + encontradoEm);
    }
}
