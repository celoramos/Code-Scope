import java.util.HashSet;
import java.util.Set;

public class Conjunto {
    public static void main(String[] args) {
        int[] numeros = {3, 1, 3, 2, 1};
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        Set<Integer> vistos = new HashSet<>();
        for (int i = 0; i < numeros.length; i++) {
            int numero = numeros[i];
            vistos.add(numero);
        }
        System.out.println(vistos.contains(2));
        System.out.println(vistos);
    }
}
