import java.util.Stack;

public class Pilha {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        Stack<String> pratos = new Stack<>();
        pratos.push("azul");
        pratos.push("verde");
        pratos.push("vermelho");
        String deCima = pratos.peek();
        String tirado = pratos.pop();
        pratos.push("amarelo");
        tirado = pratos.pop();
        tirado = pratos.pop();

        System.out.println("Sobrou: " + pratos);
    }
}
