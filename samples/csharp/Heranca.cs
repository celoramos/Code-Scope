namespace Exemplos;

public class Animal
{
    public string Nome;

    public Animal(string nome)
    {
        Nome = nome;
    }

    public virtual string Falar()
    {
        return "...";
    }
}

public class Cachorro : Animal
{
    public Cachorro(string nome) : base(nome)
    {
    }

    public override string Falar()
    {
        return "Au!";
    }
}

public class Gato : Animal
{
    public Gato(string nome) : base(nome)
    {
    }

    public override string Falar()
    {
        return "Miau!";
    }
}

public static class Heranca
{
    public static void Rodar()
    {
        Animal[] bichos = { new Cachorro("Rex"), new Gato("Mia"), new Animal("Bob") };
        // Coloque um breakpoint na linha abaixo e use F11 (step into) para ver qual Falar() roda.
        for (int i = 0; i < bichos.Length; i++)
        {
            string som = bichos[i].Falar();
            Console.WriteLine($"{bichos[i].Nome}: {som}");
        }
    }
}
