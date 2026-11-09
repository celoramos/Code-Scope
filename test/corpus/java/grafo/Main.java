package corpus.grafo;

import java.util.*;

public class Main {
    static List<List<Integer>> adj = new ArrayList<>();

    static List<Integer> bfs(int inicio, int n) {
        boolean[] visitado = new boolean[n];
        Queue<Integer> fila = new ArrayDeque<>();
        List<Integer> ordem = new ArrayList<>();
        fila.add(inicio);
        visitado[inicio] = true;
        while (!fila.isEmpty()) {
            int atual = fila.poll();
            ordem.add(atual);
            for (int v : adj.get(atual)) {
                if (!visitado[v]) {
                    visitado[v] = true;
                    fila.add(v);
                }
            }
        }
        return ordem;
    }

    static int[] dijkstra(int[][] pesos, int origem) {
        int n = pesos.length;
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[origem] = 0;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[1] - b[1]);
        heap.add(new int[]{origem, 0});
        while (!heap.isEmpty()) {
            int[] topo = heap.poll();
            int u = topo[0];
            for (int v = 0; v < n; v++) {
                if (pesos[u][v] > 0 && dist[u] + pesos[u][v] < dist[v]) {
                    dist[v] = dist[u] + pesos[u][v];
                    heap.add(new int[]{v, dist[v]});
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        int n = 5; // @pare
        for (int i = 0; i < n; i++) {
            adj.add(new ArrayList<>());
        }
        int[][] arestas = {{0, 1}, {0, 2}, {1, 3}, {2, 4}};
        for (int[] a : arestas) {
            adj.get(a[0]).add(a[1]);
        }
        List<Integer> ordem = bfs(0, n);
        int[][] pesos = {{0, 4, 1, 0}, {0, 0, 0, 1}, {0, 2, 0, 5}, {0, 0, 0, 0}};
        int[] dist = dijkstra(pesos, 0);
        System.out.println(ordem + Arrays.toString(dist));
    } // @fim
}
