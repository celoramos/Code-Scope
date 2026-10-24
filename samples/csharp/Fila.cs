namespace Exemplos;

public static class Fila
{
    public static void Rodar()
    {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        var banco = new Queue<string>();
        banco.Enqueue("Ana");
        banco.Enqueue("Bia");
        banco.Enqueue("Caio");
        string atendido = banco.Dequeue();
        Console.WriteLine($"{atendido} {banco.Count}");
    }
}
