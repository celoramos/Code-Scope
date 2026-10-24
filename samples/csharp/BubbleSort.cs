namespace Exemplos;

public static class BubbleSort
{
    public static void Rodar()
    {
        int[] numeros = { 5, 1, 4, 2, 8 };
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        for (int i = 0; i < numeros.Length - 1; i++)
        {
            for (int j = 0; j < numeros.Length - 1 - i; j++)
            {
                if (numeros[j] > numeros[j + 1])
                {
                    int temp = numeros[j];
                    numeros[j] = numeros[j + 1];
                    numeros[j + 1] = temp;
                }
            }
        }
        Console.WriteLine(string.Join(", ", numeros));
    }
}
