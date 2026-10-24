public class ListaLigada {
    static class No {
        int valor;
        No proximo;

        No(int valor) {
            this.valor = valor;
        }
    }

    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        No inicio = new No(10);
        inicio.proximo = new No(20);
        inicio.proximo.proximo = new No(30);

        No atual = inicio;
        int soma = 0;
        while (atual != null) {
            soma = soma + atual.valor;
            atual = atual.proximo;
        }
        System.out.println("Soma: " + soma);
    }
}
