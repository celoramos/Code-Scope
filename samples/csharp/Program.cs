// Cada exemplo é uma classe com o método Rodar. A configuração de debug escolhe qual pelo nome.
var exemplo = args.Length > 0 ? args[0] : "BubbleSort";
switch (exemplo)
{
    case "BubbleSort": Exemplos.BubbleSort.Rodar(); break;
    case "Pilha": Exemplos.Pilha.Rodar(); break;
    case "Fila": Exemplos.Fila.Rodar(); break;
    case "Dicionario": Exemplos.Dicionario.Rodar(); break;
    case "ListaLigada": Exemplos.ListaLigada.Rodar(); break;
    default: Console.WriteLine($"Exemplo desconhecido: {exemplo}"); break;
}
