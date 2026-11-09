package corpus.excecoes;

class SaldoInsuficiente extends Exception {
    final int falta;

    SaldoInsuficiente(int falta) {
        super("faltam " + falta);
        this.falta = falta;
    }
}

public class Main {
    static int sacar(int saldo, int valor) throws SaldoInsuficiente {
        if (valor > saldo) throw new SaldoInsuficiente(valor - saldo);
        return saldo - valor;
    }

    public static void main(String[] args) {
        int saldo = 100; // @pare
        int falta = 0;
        try {
            saldo = sacar(saldo, 30);
            saldo = sacar(saldo, 500);
        } catch (SaldoInsuficiente e) {
            falta = e.falta;
        } finally {
            saldo += 1;
        }
        String mensagem = "";
        try {
            Integer.parseInt("abc");
        } catch (NumberFormatException e) {
            mensagem = e.getMessage();
        }
        System.out.println(saldo + " " + falta + " " + mensagem);
    } // @fim
}
