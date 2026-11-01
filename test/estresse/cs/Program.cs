class No { public int V; public No Prox; public No(int v, No p) { V = v; Prox = p; } }
struct Ponto { public int X; public int Y; }
record Par(int A, string B);
enum Cor { Vermelho, Azul }
class Ruim { public int Bomba => throw new Exception("quebrado"); public override string ToString() => throw new Exception("quebrado"); }

static class Programa
{
    static void Main()
    {
        var grande = new int[1000000];
        var matriz = new int[300, 300];
        var irregular = new int[][] { new[] { 1, 2 }, new[] { 3 }, null };
        var lista = new List<int> { 3, 1, 2 };
        var nomes = new List<string> { "a", null, "<b>" };
        var mapa = new Dictionary<string, List<int>> { ["k"] = new List<int> { 1 } };
        var pilha = new Stack<int>();
        var fila = new Queue<int>();
        var conjunto = new HashSet<int> { 1, 2 };
        var pontos = new[] { new Ponto { X = 1 } };
        var par = new Par(1, "x");
        var cor = Cor.Azul;
        var ruim = new Ruim();
        int? nulavel = null;
        object[] misto = { 1, "dois", null, new[] { 1 } };
        double[] duplos = { double.NaN, double.PositiveInfinity };
        No cabeca = null;
        for (int i = 0; i < 5000; i++) cabeca = new No(i, cabeca);
        grande[0] = 7; // PARE
        matriz[1, 1] = 99;
        lista.Add(9);
        lista.Sort();
        mapa["k"].Add(2);
        pilha.Push(1);
        fila.Enqueue(1);
        var dobro = lista.Select(x => x * 2).ToList();
        Console.WriteLine(string.Join(",", dobro) + nulavel + par + cor + conjunto.Count + pontos.Length + misto.Length + duplos.Length + irregular.Length + nomes.Count + (ruim == null) + cabeca.V);
    }
}
