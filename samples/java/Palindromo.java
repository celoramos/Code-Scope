public class Palindromo {
    public static void main(String[] args) {
        char[] letras = {'r', 'a', 'd', 'a', 'r'};
        boolean ehPalindromo = true;

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        int inicio = 0;
        int fim = letras.length - 1;
        while (inicio < fim) {
            if (letras[inicio] != letras[fim]) {
                ehPalindromo = false;
                break;
            }
            inicio++;
            fim--;
        }

        System.out.println(ehPalindromo ? "É palíndromo" : "Não é palíndromo");
    }
}
