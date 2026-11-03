namespace Exemplos;

public static class TrataErro
{
    public static void Rodar()
    {
        string[] entradas = { "12", "abc", "7" };
        int soma = 0;
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < entradas.Length; i++)
        {
            try
            {
                int numero = int.Parse(entradas[i]);
                soma = soma + numero;
            }
            catch (FormatException e)
            {
                Console.WriteLine($"Ignorando: {entradas[i]} ({e.Message})");
            }
        }
        Console.WriteLine($"Soma: {soma}");
    }
}
