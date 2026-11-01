import java.util.ArrayDeque;
import java.util.PriorityQueue;

public class FilaDePrioridade {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        PriorityQueue<Integer> senhas = new PriorityQueue<>();
        senhas.add(40);
        senhas.add(10);
        senhas.add(30);
        senhas.add(20);
        int proxima = senhas.poll();

        // Um deque entra e sai pelas duas pontas.
        ArrayDeque<Integer> vagoes = new ArrayDeque<>();
        vagoes.addLast(1);
        vagoes.addFirst(2);
        vagoes.addLast(3);
        vagoes.pollFirst();
        vagoes.pollLast();
        System.out.println(proxima);
    }
}
