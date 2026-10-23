import java.util.ArrayList;
import java.util.List;

public class ListaDeCompras {
    public static void main(String[] args) {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        List<String> lista = new ArrayList<>();
        lista.add("arroz");
        lista.add("feijão");
        lista.add("café");
        lista.add(1, "leite");
        lista.remove("arroz");
        lista.set(0, "pão");

        System.out.println(lista);
    }
}
