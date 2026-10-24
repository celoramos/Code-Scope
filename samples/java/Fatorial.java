public class Fatorial {
    static int fatorial(int n) {
        if (n <= 1) {
            return 1;
        }
        int resultado = n * fatorial(n - 1);
        return resultado;
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
        int valor = fatorial(4);
        System.out.println("4! = " + valor);
    }
}
