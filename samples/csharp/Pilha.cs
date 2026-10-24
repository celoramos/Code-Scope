namespace Exemplos;

public static class Pilha
{
    public static void Rodar()
    {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        var pratos = new Stack<string>();
        pratos.Push("azul");
        pratos.Push("verde");
        pratos.Push("vermelho");
        string topo = pratos.Peek();
        string tirado = pratos.Pop();
        Console.WriteLine($"{topo} {tirado} {pratos.Count}");
    }
}
