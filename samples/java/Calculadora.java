import java.util.Stack;

public class Calculadora {
    public static void main(String[] args) {
        // Conta em notação pós-fixa: "3 4 + 2 *" é (3 + 4) * 2.
        String[] partes = {"3", "4", "+", "2", "*"};
        Stack<Integer> pilha = new Stack<>();

        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (String parte : partes) {
            if (parte.equals("+") || parte.equals("*")) {
                int b = pilha.pop();
                int a = pilha.pop();
                pilha.push(parte.equals("+") ? a + b : a * b);
            } else {
                pilha.push(Integer.parseInt(parte));
            }
        }

        System.out.println("Resultado: " + pilha.pop());
    }
}
