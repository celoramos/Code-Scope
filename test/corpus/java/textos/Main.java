package corpus.textos;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static String inverter(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) {
            sb.append(s.charAt(i));
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String frase = "a sacada da casa"; // @pare
        String invertida = inverter(frase);
        char[] letras = frase.toCharArray();
        String[] palavras = frase.split(" ");
        Map<Character, Integer> contagem = new HashMap<>();
        for (char c : letras) {
            if (c != ' ') contagem.put(c, contagem.getOrDefault(c, 0) + 1);
        }
        BigInteger fatorial = BigInteger.ONE;
        for (int i = 2; i <= 30; i++) {
            fatorial = fatorial.multiply(BigInteger.valueOf(i));
        }
        BigDecimal preco = new BigDecimal("19.90").multiply(new BigDecimal("3"));
        StringBuilder montagem = new StringBuilder("ab");
        montagem.insert(0, 'x');
        String acentos = "ação e coração";
        System.out.println(invertida + palavras.length + contagem + fatorial + preco + montagem + acentos);
    } // @fim
}
