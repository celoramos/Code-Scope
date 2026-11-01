import java.util.*;
import java.util.stream.*;

public class Estresse {
    record Par(int a, String b) {}
    enum Cor { VERMELHO, AZUL }
    interface Forma { double area(); }
    static class Circulo implements Forma { double r = 1; public double area() { return r; } }
    static class No<T> { T v; No<T> prox; No(T v, No<T> p) { this.v = v; prox = p; } }
    class Interna { int x = 1; }

    public static void main(String[] args) {
        int[] grande = new int[1000000];
        int[][] matriz = new int[300][300];
        int[][] irregular = { { 1, 2, 3 }, { 4 }, {}, null };
        int[][][] cubo = new int[50][50][50];
        long[] longos = { Long.MAX_VALUE, Long.MIN_VALUE };
        double[] duplos = { Double.NaN, Double.POSITIVE_INFINITY, -0.0 };
        char[] letras = { 'a', 'ç', '\n', '\0' };
        byte[] bytes = { -1, 127 };
        boolean[] logicos = { true, false };
        String[] nulos = { null, "", "a\nb", "<b>" };
        Object[] misto = { 1, "dois", 3.0, null, new int[] { 4 }, Cor.AZUL };
        Integer[] caixas = { 1, null, 3 };
        int[] vazio = {};
        int[] nada = null;
        List<Integer> lista = new ArrayList<>(List.of(3, 1, 2));
        List<int[]> listaArrays = new ArrayList<>(List.of(new int[] { 1 }));
        LinkedList<String> ligada = new LinkedList<>(List.of("a", "b"));
        Map<String, List<Integer>> mapa = new HashMap<>();
        mapa.put("k", new ArrayList<>(List.of(1)));
        TreeMap<Integer, String> arvore = new TreeMap<>(Map.of(1, "a", 2, "b"));
        Set<Integer> conjunto = new TreeSet<>(Set.of(1, 2));
        Deque<Integer> deque = new ArrayDeque<>(List.of(1, 2));
        PriorityQueue<Integer> heap = new PriorityQueue<>(List.of(5, 2, 8));
        Stack<Integer> pilha = new Stack<>();
        StringBuilder sb = new StringBuilder("abc");
        Par par = new Par(1, "x");
        Cor cor = Cor.VERMELHO;
        Forma forma = new Circulo();
        Runnable lambda = () -> System.out.println("x");
        No<Integer> cabeca = null;
        for (int i = 0; i < 5000; i++) cabeca = new No<>(i, cabeca);
        Object[] ciclo = new Object[1];
        ciclo[0] = ciclo;
        Optional<Integer> opcional = Optional.of(1);
        grande[0] = 7; // PARE
        matriz[1][1] = 99;
        lista.add(9);
        lista.sort(null);
        mapa.get("k").add(2);
        pilha.push(1);
        pilha.pop();
        deque.addFirst(0);
        heap.add(1);
        sb.append("d");
        int soma = lista.stream().mapToInt(Integer::intValue).sum();
        List<Integer> dobro = lista.stream().map(x -> x * 2).collect(Collectors.toList());
        try {
            nada[0] = 1;
        } catch (NullPointerException e) {
            soma = -1;
        }
        System.out.println(soma + " " + dobro);
    }
}
