import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class Grafo {
    public static void main(String[] args) {
        // Cada cidade e as cidades ligadas a ela.
        HashMap<String, List<String>> grafo = new HashMap<>();
        grafo.put("A", List.of("B", "C"));
        grafo.put("B", List.of("A", "D"));
        grafo.put("C", List.of("A", "D"));
        grafo.put("D", List.of("B", "C"));

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        ArrayDeque<String> fila = new ArrayDeque<>();
        ArrayList<String> visitados = new ArrayList<>();
        fila.offer("A");
        visitados.add("A");
        while (!fila.isEmpty()) {
            String atual = fila.poll();
            for (String vizinho : grafo.get(atual)) {
                if (!visitados.contains(vizinho)) {
                    visitados.add(vizinho);
                    fila.offer(vizinho);
                }
            }
        }
        System.out.println(visitados);
    }
}
