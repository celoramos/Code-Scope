public class Texto {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        String palavra = "radar";
        String invertida = "";
        for (int i = palavra.length() - 1; i >= 0; i--) {
            char letra = palavra.charAt(i);
            invertida = invertida + letra;
        }
        boolean igual = palavra.equals(invertida);
        System.out.println(invertida + " " + igual);
    }
}
