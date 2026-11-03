namespace Exemplos;

public static class Fatorial
{
    static int Calcular(int n)
    {
        if (n <= 1)
        {
            return 1;
        }
        int resultado = n * Calcular(n - 1);
        return resultado;
    }

    public static void Rodar()
    {
        // Coloque um breakpoint na linha abaixo e use F11 (step into) para entrar em cada chamada.
        int valor = Calcular(4);
        Console.WriteLine($"4! = {valor}");
    }
}
