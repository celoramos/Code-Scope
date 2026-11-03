namespace Exemplos;

public class Aluno
{
    public string Nome;
    public double Nota;

    public Aluno(string nome, double nota)
    {
        Nome = nome;
        Nota = nota;
    }
}

public static class Turma
{
    public static void Rodar()
    {
        // Coloque um breakpoint na linha abaixo e use F10 (step over).
        var turma = new List<Aluno>();
        turma.Add(new Aluno("Ana", 8.5));
        turma.Add(new Aluno("Bia", 6.0));
        turma.Add(new Aluno("Caio", 9.0));
        var melhor = turma[0];
        for (int i = 1; i < turma.Count; i++)
        {
            if (turma[i].Nota > melhor.Nota)
            {
                melhor = turma[i];
            }
        }
        turma[1].Nota = 7.0;
        Console.WriteLine($"Melhor: {melhor.Nome}");
    }
}
