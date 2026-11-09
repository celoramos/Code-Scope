package corpus.multiarquivo;

public class Main {
    public static void main(String[] args) {
        ListaLigada lista = new ListaLigada(); // @pare
        lista.adicionar(3);
        lista.adicionar(1);
        lista.adicionar(4);
        Pilha<String> pilha = new Pilha<>();
        pilha.empilhar("a");
        pilha.empilhar("b");
        String topo = pilha.desempilhar();
        System.out.println(lista.tamanho + topo);
    } // @fim
}
