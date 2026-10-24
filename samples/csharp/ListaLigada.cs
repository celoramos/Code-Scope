namespace Exemplos;

public class No
{
    public int Valor;
    public No Proximo;

    public No(int valor)
    {
        Valor = valor;
    }
}

public static class ListaLigada
{
    public static void Rodar()
    {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        var inicio = new No(10);
        inicio.Proximo = new No(20);
        inicio.Proximo.Proximo = new No(30);

        var atual = inicio;
        int soma = 0;
        while (atual != null)
        {
            soma = soma + atual.Valor;
            atual = atual.Proximo;
        }
        Console.WriteLine(soma);
    }
}
