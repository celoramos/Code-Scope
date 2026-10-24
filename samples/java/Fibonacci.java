public class Fibonacci {
    static int fib(int n) {
        if (n < 2) {
            return n;
        }
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
        int resultado = fib(4);
        System.out.println("fib(4) = " + resultado);
    }
}
