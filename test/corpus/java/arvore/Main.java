package corpus.arvore;

public class Main {
    static class No {
        int chave;
        No esq, dir;

        No(int chave) {
            this.chave = chave;
        }
    }

    static No inserir(No raiz, int chave) {
        if (raiz == null) return new No(chave);
        if (chave < raiz.chave) raiz.esq = inserir(raiz.esq, chave);
        else raiz.dir = inserir(raiz.dir, chave);
        return raiz;
    }

    static No remover(No raiz, int chave) {
        if (raiz == null) return null;
        if (chave < raiz.chave) raiz.esq = remover(raiz.esq, chave);
        else if (chave > raiz.chave) raiz.dir = remover(raiz.dir, chave);
        else {
            if (raiz.esq == null) return raiz.dir;
            if (raiz.dir == null) return raiz.esq;
            No sucessor = raiz.dir;
            while (sucessor.esq != null) sucessor = sucessor.esq;
            raiz.chave = sucessor.chave;
            raiz.dir = remover(raiz.dir, sucessor.chave);
        }
        return raiz;
    }

    static int altura(No raiz) {
        return raiz == null ? 0 : 1 + Math.max(altura(raiz.esq), altura(raiz.dir));
    }

    public static void main(String[] args) {
        No raiz = null; // @pare
        int[] chaves = {50, 30, 70, 20, 40, 60, 80};
        for (int c : chaves) {
            raiz = inserir(raiz, c);
        }
        raiz = remover(raiz, 30);
        int h = altura(raiz);
        System.out.println(h);
    } // @fim
}
