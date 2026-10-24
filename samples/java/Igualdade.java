public class Igualdade {
    static class Ponto {
        int x;
        int y;

        Ponto(int x, int y) {
            this.x = x;
            this.y = y;
        }
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        String a = "ana";
        String b = "ana";
        String c = new String("ana");
        if (a == b) {
            System.out.println("a == b");
        }
        if (a == c) {
            System.out.println("a == c");
        }
        if (a.equals(c)) {
            System.out.println("a.equals(c)");
        }
        Ponto p = new Ponto(1, 2);
        Ponto q = new Ponto(1, 2);
        Ponto r = p;
        if (p == q) {
            System.out.println("p == q");
        }
        if (p.equals(q)) {
            System.out.println("p.equals(q)");
        }
        if (r == p) {
            System.out.println("r == p");
        }
    }
}
