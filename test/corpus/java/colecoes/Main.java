package corpus.colecoes;

import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> lista = new ArrayList<>(List.of(5, 3, 8)); // @pare
        lista.add(1);
        Collections.sort(lista);
        LinkedList<String> encadeada = new LinkedList<>();
        encadeada.add("b");
        encadeada.addFirst("a");
        Deque<Integer> pilha = new ArrayDeque<>();
        pilha.push(1);
        pilha.push(2);
        int topo = pilha.pop();
        Queue<String> fila = new LinkedList<>();
        fila.offer("x");
        fila.offer("y");
        String frente = fila.poll();
        Map<String, List<Integer>> notas = new HashMap<>();
        notas.computeIfAbsent("ana", k -> new ArrayList<>()).add(9);
        notas.computeIfAbsent("bia", k -> new ArrayList<>()).add(7);
        TreeMap<String, Integer> ordenado = new TreeMap<>(Map.of("c", 3, "a", 1));
        Set<Integer> conjunto = new HashSet<>(Arrays.asList(3, 1, 3, 2));
        TreeSet<String> nomes = new TreeSet<>(List.of("zé", "ana"));
        PriorityQueue<Integer> heap = new PriorityQueue<>(List.of(5, 1, 4));
        int menor = heap.poll();
        int[][] irregular = new int[3][];
        irregular[0] = new int[]{1};
        irregular[1] = new int[]{1, 2};
        irregular[2] = new int[]{1, 2, 3};
        Integer[] caixas = {1, null, 3};
        List<int[]> arestas = new ArrayList<>();
        arestas.add(new int[]{0, 1});
        Iterator<Integer> it = lista.iterator();
        int primeiro = it.next();
        List<Integer> vazia = new ArrayList<>();
        Map<Character, Integer> letras = new LinkedHashMap<>();
        for (char c : "banana".toCharArray()) {
            letras.merge(c, 1, Integer::sum);
        }
        System.out.println(lista + " " + encadeada + topo + frente + notas + ordenado + conjunto + nomes + menor + irregular.length + caixas.length + arestas.size() + primeiro + vazia + letras);
    } // @fim
}
