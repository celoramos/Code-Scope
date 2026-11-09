package corpus.estaticos;

import java.util.ArrayList;
import java.util.List;

public class Main {
    static long[] memo = new long[60];
    static List<Integer> visitados = new ArrayList<>();
    static int chamadas = 0;

    static long fib(int n) {
        chamadas++;
        if (n < 2) return n;
        if (memo[n] != 0) return memo[n];
        memo[n] = fib(n - 1) + fib(n - 2);
        return memo[n];
    }

    static void visitar(int x) {
        visitados.add(x);
    }

    public static void main(String[] args) {
        long f = fib(12); // @pare
        for (int i = 0; i < 3; i++) {
            visitar(i * 10);
        }
        System.out.println(f + " " + visitados + " " + chamadas);
    } // @fim
}
