import java.util.LinkedList;
import java.util.Queue;

public class Fila {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        Queue<String> banco = new LinkedList<>();
        banco.offer("Ana");
        banco.offer("Bruno");
        banco.offer("Carla");
        String atendido = banco.poll();
        banco.offer("Davi");
        atendido = banco.poll();
        String proximo = banco.peek();

        System.out.println("Ainda na fila: " + banco);
    }
}
