import java.util.Arrays;

public class MergeSort {
    static int[] ordenar(int[] v) {
        if (v.length <= 1) return v;
        int meio = v.length / 2;
        int[] esquerda = ordenar(Arrays.copyOfRange(v, 0, meio));
        int[] direita = ordenar(Arrays.copyOfRange(v, meio, v.length));
        return juntar(esquerda, direita);
    }

    static int[] juntar(int[] a, int[] b) {
        int[] r = new int[a.length + b.length];
        int i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) r[k++] = a[i++];
            else r[k++] = b[j++];
        }
        while (i < a.length) r[k++] = a[i++];
        while (j < b.length) r[k++] = b[j++];
        return r;
    }

    public static void main(String[] args) {
        int[] numeros = {38, 27, 43, 3};
        // Coloque um breakpoint na linha abaixo e use F11 (step into): cada chamada recebe metade do array.
        int[] ordenado = ordenar(numeros);
        System.out.println(Arrays.toString(ordenado));
    }
}
