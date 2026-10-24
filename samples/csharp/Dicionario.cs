namespace Exemplos;

public static class Dicionario
{
    public static void Rodar()
    {
        string[] palavras = { "sol", "mar", "sol", "lua", "sol" };
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        var contagem = new Dictionary<string, int>();
        for (int i = 0; i < palavras.Length; i++)
        {
            string palavra = palavras[i];
            int vezes = contagem.GetValueOrDefault(palavra, 0);
            contagem[palavra] = vezes + 1;
        }
        Console.WriteLine(contagem.Count);
    }
}
