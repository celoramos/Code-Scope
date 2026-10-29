public class QuickSort {
    static void ordenar(int[] v, int inicio, int fim) {
        if (inicio >= fim) return;
        int pivo = v[fim];
        int i = inicio;
        for (int j = inicio; j < fim; j++) {
            if (v[j] < pivo) {
                int temp = v[i];
                v[i] = v[j];
                v[j] = temp;
                i++;
            }
        }
        int temp = v[i];
        v[i] = v[fim];
        v[fim] = temp;
        ordenar(v, inicio, i - 1);
        ordenar(v, i + 1, fim);
    }

    public static void main(String[] args) {
        int[] numeros = {7, 2, 9, 4, 5};
        // Coloque um breakpoint na linha abaixo e use F11 (step into): o pivô vai para o lugar dele.
        ordenar(numeros, 0, numeros.length - 1);
        System.out.println(java.util.Arrays.toString(numeros));
    }
}
