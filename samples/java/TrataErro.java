public class TrataErro {
    public static void main(String[] args) {
        String[] entradas = {"12", "abc", "7"};
        int soma = 0;
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < entradas.length; i++) {
            try {
                int numero = Integer.parseInt(entradas[i]);
                soma = soma + numero;
            } catch (NumberFormatException e) {
                System.out.println("Ignorando: " + entradas[i]);
            }
        }
        System.out.println("Soma: " + soma);
    }
}
