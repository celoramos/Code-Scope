public class InverterArray {
    public static void main(String[] args) {
        int[] valores = {1, 2, 3, 4, 5, 6};

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        int inicio = 0;
        int fim = valores.length - 1;
        while (inicio < fim) {
            int aux = valores[inicio];
            valores[inicio] = valores[fim];
            valores[fim] = aux;
            inicio++;
            fim--;
        }

        System.out.println(java.util.Arrays.toString(valores));
    }
}
