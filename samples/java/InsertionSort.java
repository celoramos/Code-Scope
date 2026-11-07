public class InsertionSort {
    public static void main(String[] args) {
        int[] numeros = {12, 11, 13, 5, 6};

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 1; i < numeros.length; i++) {
            int atual = numeros[i];
            int j = i - 1;
            while (j >= 0 && numeros[j] > atual) {
                numeros[j + 1] = numeros[j];
                j--;
            }
            numeros[j + 1] = atual;
        }

        System.out.println(java.util.Arrays.toString(numeros));
    }
}
