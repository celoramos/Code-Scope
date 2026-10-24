public class Referencias {
    static class Conta {
        String titular;
        double saldo;

        Conta(String titular, double saldo) {
            this.titular = titular;
            this.saldo = saldo;
        }

        void depositar(double valor) {
            saldo = saldo + valor;
        }
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        Conta minha = new Conta("Ana", 100);
        Conta outra = minha;
        outra.depositar(50);
        Conta nova = new Conta("Bia", 20);
        int[] a = {1, 2, 3};
        int[] b = a;
        b[0] = 99;
        System.out.println(minha.saldo + " " + nova.saldo + " " + a[0]);
    }
}
