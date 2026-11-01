# Limites conhecidos

O que o Code Scope ainda não faz, ou faz diferente do que você poderia esperar.

- As chamadas de baixo na pilha mostram as variáveis simples e os 8 primeiros itens de arrays e listas, mas não os objetos. São lidas no máximo 12 chamadas.
- Só objetos de classes declaradas no arquivo que está sendo debugado são desenhados, no máximo 40 por passo. Objetos dentro de uma matriz mostram o valor principal na célula e o cartão embaixo.
- O JavaScript não mostra a identidade dos objetos, então a pergunta vai para o próprio programa (`a === b`); entre passos, o objeto mantém a identidade pelos caminhos que levam a ele. Uma lista refeita do zero num passo só pode parecer feita de objetos novos.
- Uma parte de condição que chama um método só é avaliada quando o método apenas lê (`len`, `.length`, `.size()`, `.equals`, `.get`...); senão, aparece "não dá para saber antes".
- Variáveis escondidas (um nome escondendo outro) são reconhecidas em blocos do JavaScript e em parâmetros com o nome de um campo. Java e Python não têm escopo de bloco para variáveis locais.
- No modo genérico, só aparecem coleções que o debugger marca como indexadas ou cujo tamanho está escrito no valor.
- Arrays de três dimensões mostram as 8 primeiras camadas, cada uma como matriz. Da quarta dimensão em diante, o resto aparece como texto.
- `std::map` precisa de um gdb com os pretty-printers do Python; sem eles, fica de fora. `std::vector` funciona com ou sem eles.
- Em Go, entrar no `fmt` ou passar do fim do `main` mostra código de biblioteca. Um ponteiro aparece de novo como objeto novo depois que uma chamada volta.
- Um GIF mostra no máximo 80 passos, espalhados pela execução. Um `@expect` passa assim que um passo tem todos os valores certos, mesmo que eles mudem depois.
- Uma lista que ganha ou perde vários itens num passo é animada quando eles formam um bloco (`addAll`, `extend`, `splice`); itens que entram em lugares diferentes aparecem como redimensionamento.
- Fora de matrizes, um inteiro vira seta quando o código usa ele como posição: dentro de colchetes (`v[i]`), em `get(i)`, `insert(i, x)` e parecidos, comparado com o tamanho, ou na conta de outra posição (`meio = (inicio + fim) / 2`). Nomes em `codeScope.valueNames` nunca viram seta. Sem o arquivo-fonte, vira seta todo inteiro que caiba nos índices.
- Pilha e fila são reconhecidas pelo uso da variável na função parada, e pelo arquivo inteiro quando essa função não diz nada. Uma coleção usada por uma função auxiliar pode mudar de papel quando o programa para lá.
- Se você usar F5 (continue) entre breakpoints em vez de F10, o painel mostra a diferença acumulada entre as duas paradas e a linha "Executou" é a do breakpoint anterior.
- O plugin JetBrains cobre só Java (configurações em Settings > Tools > Code Scope). O modo apresentação é só do VS Code. O F8 do IntelliJ também para no `}` que fecha um `if`, que o VS Code pula, então o mesmo programa pode levar alguns passos a mais lá. Depois do F7, o valor que uma chamada devolveu não aparece no IntelliJ.
