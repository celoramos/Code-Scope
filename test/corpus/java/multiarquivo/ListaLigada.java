package corpus.multiarquivo;

public class ListaLigada {
    No inicio;
    int tamanho;

    void adicionar(int valor) {
        No novo = new No(valor);
        if (inicio == null) {
            inicio = novo;
        } else {
            No atual = inicio;
            while (atual.proximo != null) {
                atual = atual.proximo;
            }
            atual.proximo = novo;
        }
        tamanho++;
    }
}
