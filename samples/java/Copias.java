import java.util.Arrays;

public class Copias {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        String nome = "  ana  ";
        nome.trim();
        String limpo = nome.trim();
        int[] notas = {7, 5, 9};
        int[] mesmas = notas;
        int[] copia = Arrays.copyOf(notas, notas.length);
        Arrays.sort(notas);
        System.out.println(limpo + " " + mesmas[0] + " " + copia[0]);
    }
}
