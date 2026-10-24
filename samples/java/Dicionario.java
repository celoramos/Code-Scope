import java.util.HashMap;

public class Dicionario {
    public static void main(String[] args) {
        String[] palavras = {"sol", "mar", "sol", "lua", "sol"};
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        HashMap<String, Integer> contagem = new HashMap<>();
        for (int i = 0; i < palavras.length; i++) {
            String palavra = palavras[i];
            int vezes = contagem.getOrDefault(palavra, 0);
            contagem.put(palavra, vezes + 1);
        }
        System.out.println(contagem);
    }
}
