package corpus.recursao;

import java.util.ArrayList;
import java.util.List;

public class Main {
    static void hanoi(int n, char origem, char destino, char auxiliar, List<String> movimentos) {
        if (n == 0) return;
        hanoi(n - 1, origem, auxiliar, destino, movimentos);
        movimentos.add(origem + ">" + destino);
        hanoi(n - 1, auxiliar, destino, origem, movimentos);
    }

    static void permutar(List<Integer> atual, boolean[] usado, int[] itens, List<List<Integer>> saida) {
        if (atual.size() == itens.length) {
            saida.add(new ArrayList<>(atual));
            return;
        }
        for (int i = 0; i < itens.length; i++) {
            if (usado[i]) continue;
            usado[i] = true;
            atual.add(itens[i]);
            permutar(atual, usado, itens, saida);
            atual.remove(atual.size() - 1);
            usado[i] = false;
        }
    }

    static int contarIlhas(char[][] mapa) {
        int ilhas = 0;
        for (int i = 0; i < mapa.length; i++) {
            for (int j = 0; j < mapa[0].length; j++) {
                if (mapa[i][j] == '1') {
                    ilhas++;
                    afundar(mapa, i, j);
                }
            }
        }
        return ilhas;
    }

    static void afundar(char[][] mapa, int i, int j) {
        if (i < 0 || j < 0 || i >= mapa.length || j >= mapa[0].length || mapa[i][j] != '1') return;
        mapa[i][j] = '0';
        afundar(mapa, i + 1, j);
        afundar(mapa, i - 1, j);
        afundar(mapa, i, j + 1);
        afundar(mapa, i, j - 1);
    }

    public static void main(String[] args) {
        List<String> movimentos = new ArrayList<>(); // @pare
        hanoi(3, 'A', 'C', 'B', movimentos);
        List<List<Integer>> perms = new ArrayList<>();
        permutar(new ArrayList<>(), new boolean[3], new int[]{1, 2, 3}, perms);
        char[][] mapa = {{'1', '1', '0'}, {'0', '1', '0'}, {'0', '0', '1'}};
        int ilhas = contarIlhas(mapa);
        System.out.println(movimentos + " " + perms + " " + ilhas);
    } // @fim
}
