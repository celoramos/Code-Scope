package corpus.dp;

public class Main {
    static int lcs(String a, String b) {
        int[][] tabela = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    tabela[i][j] = tabela[i - 1][j - 1] + 1;
                } else {
                    tabela[i][j] = Math.max(tabela[i - 1][j], tabela[i][j - 1]);
                }
            }
        }
        return tabela[a.length()][b.length()];
    }

    static long[] fibonacci(int n) {
        long[] f = new long[n + 1];
        f[1] = 1;
        for (int i = 2; i <= n; i++) {
            f[i] = f[i - 1] + f[i - 2];
        }
        return f;
    }

    static int moedas(int[] valores, int total) {
        int[] minimo = new int[total + 1];
        for (int t = 1; t <= total; t++) {
            minimo[t] = Integer.MAX_VALUE;
            for (int v : valores) {
                if (v <= t && minimo[t - v] != Integer.MAX_VALUE) {
                    minimo[t] = Math.min(minimo[t], minimo[t - v] + 1);
                }
            }
        }
        return minimo[total];
    }

    public static void main(String[] args) {
        int comum = lcs("ABCB", "BDCB"); // @pare
        long[] fib = fibonacci(90);
        long grande = fib[90];
        int troco = moedas(new int[]{1, 3, 4}, 6);
        System.out.println(comum + " " + grande + " " + troco);
    } // @fim
}
