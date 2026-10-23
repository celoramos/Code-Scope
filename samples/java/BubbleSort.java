public class BubbleSort {
    public static void main(String[] args) {
        int[] numeros = {5, 1, 4, 2, 8};

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < numeros.length - 1; i++) {
            for (int j = 0; j < numeros.length - 1 - i; j++) {
                if (numeros[j] > numeros[j + 1]) {
                    int temp = numeros[j];
                    numeros[j] = numeros[j + 1];
                    numeros[j + 1] = temp;
                }
            }
        }

        System.out.println(java.util.Arrays.toString(numeros));
    }
}
