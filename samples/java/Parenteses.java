import java.util.ArrayDeque;
import java.util.Deque;

public class Parenteses {
    public static void main(String[] args) {
        String expressao = "{[()]}";
        Deque<Character> abertos = new ArrayDeque<>();
        boolean balanceado = true;

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < expressao.length(); i++) {
            char c = expressao.charAt(i);
            if (c == '(' || c == '[' || c == '{') {
                abertos.push(c);
            } else {
                char topo = abertos.pop();
                if ((c == ')' && topo != '(') || (c == ']' && topo != '[') || (c == '}' && topo != '{')) {
                    balanceado = false;
                    break;
                }
            }
        }

        System.out.println(balanceado && abertos.isEmpty() ? "Balanceado" : "Não balanceado");
    }
}
