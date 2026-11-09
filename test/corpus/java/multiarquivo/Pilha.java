package corpus.multiarquivo;

public class Pilha<T> {
    private Object[] itens = new Object[4];
    private int topo = 0;

    void empilhar(T item) {
        itens[topo++] = item;
    }

    @SuppressWarnings("unchecked")
    T desempilhar() {
        return (T) itens[--topo];
    }
}
