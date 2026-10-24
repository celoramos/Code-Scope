public class ArvoreBinaria {
    static class No {
        int valor;
        No esquerda;
        No direita;

        No(int valor) {
            this.valor = valor;
        }
    }

    static No inserir(No raiz, int valor) {
        if (raiz == null) {
            return new No(valor);
        }
        if (valor < raiz.valor) {
            raiz.esquerda = inserir(raiz.esquerda, valor);
        } else {
            raiz.direita = inserir(raiz.direita, valor);
        }
        return raiz;
    }

    public static void main(String[] args) {
        int[] valores = {50, 30, 70, 20, 40, 60};
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        No raiz = null;
        for (int k = 0; k < valores.length; k++) {
            raiz = inserir(raiz, valores[k]);
        }
        System.out.println("Raiz: " + raiz.valor);
    }
}
