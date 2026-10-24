public class BuscaBinaria {
    public static void main(String[] args) {
        int[] ordenado = {3, 8, 12, 17, 21, 25, 30, 42};
        int alvo = 25;
        int encontradoEm = -1;
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        int inicio = 0;
        int fim = ordenado.length - 1;
        while (inicio <= fim) {
            int meio = (inicio + fim) / 2;
            if (ordenado[meio] == alvo) {
                encontradoEm = meio;
                break;
            } else if (ordenado[meio] < alvo) {
                inicio = meio + 1;
            } else {
                fim = meio - 1;
            }
        }
        System.out.println("Encontrado na posição " + encontradoEm);
    }
}
