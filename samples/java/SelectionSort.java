public class SelectionSort {
    public static void main(String[] args) {
        int[] numeros = {29, 10, 14, 37, 13};

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < numeros.length - 1; i++) {
            int menor = i;
            for (int j = i + 1; j < numeros.length; j++) {
                if (numeros[j] < numeros[menor]) {
                    menor = j;
                }
            }
            int temp = numeros[i];
            numeros[i] = numeros[menor];
            numeros[menor] = temp;
        }

        System.out.println(java.util.Arrays.toString(numeros));
    }
}
