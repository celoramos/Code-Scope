# Code Scope

[English](README.md) | **Português**

O Code Scope mostra o código rodando, para quem está aprendendo a programar. Enquanto você debuga, um painel lateral desenha o seu programa e, a cada F10, anima o que mudou e explica em palavras simples. É o "quer que eu desenhe?" da programação.

Funciona com Java, JavaScript, TypeScript, Python, C# e C, e num modo genérico com qualquer outra linguagem que tenha debugger no VS Code. Roda no VS Code, no Cursor, no Windsurf, no VSCodium e no Antigravity, e no IntelliJ IDEA e no Android Studio (beta, só Java). O painel fica ao lado do seu código e usa as cores do seu tema. Não abre navegador, não precisa de conta e não envia nada para a internet. Gratuito e de código aberto ([MIT](LICENSE)).

> **Beta.** O Code Scope está no [Marketplace do VS Code](https://marketplace.visualstudio.com/items?itemName=code-scope.code-scope) e ainda é uma beta para as pessoas testarem e ajudarem a melhorar. Se algo parecer errado ou confuso, [abra uma issue](https://github.com/celoramos/Code-Scope/issues/new/choose): é a ajuda mais útil agora.

<p align="center">
  <img src="docs/demo.gif" alt="Code Scope rodando o BubbleSort passo a passo" width="320">
</p>

## O que aparece no painel

### Arrays, listas e matrizes

Um array é uma fileira de caixas. A caixa alterada pisca e fica marcada, e uma troca aparece como as duas caixas se cruzando, mesmo quando o código usa uma variável `temp` e leva dois passos. As variáveis que o código usa como posição, como `i`, `j`, `inicio` e `fim`, viram setas coloridas que deslizam embaixo das caixas. `soma = 2` não aponta para a posição 2.

Numa lista, o item novo surge e os seguintes abrem espaço; o que sai vai embora e os vizinhos fecham o buraco. Numa matriz, a linha e a coluna lidas pelo código ficam marcadas e a célula onde elas se cruzam ganha contorno. Num conjunto (`HashSet`, `set` do Python, `Set` do JavaScript), as caixas não têm índice, e adicionar um valor que já estava é explicado: conjunto não guarda repetidos.

| Matriz | Lista |
|:---:|:---:|
| <img src="docs/matriz.gif" alt="Matriz com a linha i e a coluna j marcadas" width="320"> | <img src="docs/lista.gif" alt="ArrayList recebendo um item no meio" width="320"> |

### Pilhas e filas

O painel reconhece o papel de uma coleção pelo jeito como o código usa ela. A pilha é uma torre: o item empilhado cai no topo e o desempilhado sobe e some, com a etiqueta "topo" acompanhando. A fila é uma esteira: o item entra pela direita e quem está na frente sai pela esquerda.

| Pilha | Fila |
|:---:|:---:|
| <img src="docs/pilha.gif" alt="Pilha de pratos: push e pop pelo topo" width="320"> | <img src="docs/fila.gif" alt="Fila do banco: entra pelo fim, sai pela frente" width="320"> |

### Condições, buscas e erros

Antes de um `if` ou de um laço rodar, a condição é quebrada em partes. Cada parte é marcada como verdadeira ou falsa, com os valores no lugar dos nomes (`ordenado[meio] == alvo (17 == 25)`), e as partes que o curto-circuito pula ficam apagadas. Depois que a linha roda, o texto diz por qual caminho o programa foi: "a condição da linha 8 foi falsa: o programa pulou o bloco do if".

Em buscas e ordenações, as posições comparadas ganham contorno, o pedaço do array que a busca já descartou fica apagado, e o painel conta comparações e trocas. Embaixo do contador, uma tabela põe a contagem do programa ao lado de log n, n, n log n e n², para o tamanho dele e para 1000 posições, onde um laço dentro de outro já faz um milhão de comparações.

Quando o programa quebra, o painel para no erro e explica em palavras simples, com uma dica de onde olhar e a mensagem original embaixo. Um índice fora do limite aparece como a posição que não existe, tracejada, depois do array. Dentro de um `catch`, o painel explica qual linha deu erro e que o resto do `try` não rodou.

| Busca binária | Erro explicado |
|:---:|:---:|
| <img src="docs/busca.gif" alt="A condição com os valores, a posição comparada e a metade descartada" width="320"> | <img src="docs/erro.gif" alt="Índice fora do limite: a posição que não existe" width="320"> |

### Funções, recursão e objetos

Quando uma função chama outra, ou a si mesma, a pilha de chamadas mostra um cartão por chamada, cada um com as próprias variáveis. A chamada que termina sai dizendo o que devolveu. Quando a recursão se divide em duas, como `fib(n - 1) + fib(n - 2)`, uma árvore de recursão mostra todas as chamadas, o valor que cada uma devolveu e quantas vezes a mesma conta foi refeita.

Objetos das classes que você escreveu viram cartões com as variáveis que apontam para eles. Dois nomes no mesmo cartão são duas variáveis no mesmo objeto, não uma cópia. Uma lista de objetos mostra cada objeto dentro da sua posição (`turma[1]` com nome e nota). Quando roda o método de uma subclasse, o painel diz por que foi aquela versão (polimorfismo).

| Árvore de recursão | Lista de objetos |
|:---:|:---:|
| <img src="docs/recursao.gif" alt="fib(4): todas as chamadas com o que devolveram" width="320"> | <img src="docs/objetos.gif" alt="Cada aluno dentro da sua posição, com melhor apontando para um deles" width="320"> |

### Dicionários, árvores e grafos

Dicionários (`HashMap`, `dict`, objetos e `Map` do JavaScript) viram uma tabela de chave e valor: a chave nova entra deslizando e o valor trocado pisca. Um dicionário de listas que apontam para as próprias chaves vira grafo, com os visitados, o nó atual e a fila de uma busca em largura.

Lista ligada aparece como nós e setas, árvore binária como árvore.

| Árvore binária | Grafo |
|:---:|:---:|
| <img src="docs/arvore.gif" alt="Uma árvore binária de busca crescendo uma inserção por vez" width="320"> | <img src="docs/grafo.gif" alt="Busca em largura: visitados, atual e esperando" width="320"> |

### Pegadinhas clássicas

O painel explica estas quando elas acontecem no seu programa:

- **Números:** divisão de inteiros, `0.1 + 0.2` e overflow.
- **`==` ou `equals`** (e `is` ou `==` no Python): o texto diz se a condição perguntou "é o mesmo objeto?" ou "tem o mesmo conteúdo?", como em `==` entre dois textos iguais no Java ou `equals` numa classe que não escreveu o seu.
- **Mudar no lugar ou criar outro:** `x.sort()` muda a própria lista, `sorted(x)`, `slice()` ou `Arrays.copyOf` criam outra, e `s.trim();` sozinho na linha cria um texto que ninguém guarda.
- **Escopo:** a variável que sai de escopo fica um passo, riscada, e a variável de um bloco que esconde outra de mesmo nome é marcada.
- **Texto:** um texto lido letra por letra vira uma fileira de letras com a seta do índice.

### Histórico e ferramentas extras

A linha do tempo mostra "Passo 7 de 13", com um controle deslizante para pular para qualquer passo; rever o histórico não volta a execução do programa. Um teste de mesa vai sendo preenchido, uma linha por passo e uma coluna por variável, como o feito no papel.

- **Adivinhar antes:** antes de uma linha rodar, o painel pergunta quanto a variável vai valer. Depois do F10 diz se o palpite acertou e guarda o placar.
- **Modo apresentação:** o painel abre grande ao lado do código, com letra maior e animações mais lentas, pronto para projetar ou gravar.
- **Salvar imagem:** o passo atual vira um PNG, para slides, anotações ou para compartilhar.

O painel fala português e inglês e segue o idioma do seu editor.

*Capturas do painel feitas com dados de sessões reais dos debuggers (Java, JavaScript e Python), salvas com o próprio botão "Salvar imagem" do painel. As novas estão com o painel em inglês; em português, o painel mostra os mesmos textos traduzidos.*

## Linguagens

Cada linguagem tem um adaptador que traduz os valores do debugger para o painel. As que não têm usam o modo genérico, que mostra o que o Debug Adapter Protocol garante e deixa de fora o que não entende.

| Linguagem | O que você precisa | Estruturas | Situação |
|---|---|---|---|
| Java | [Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack) e um JDK | arrays, matrizes, `ArrayList`, `Stack`, `Queue`, `ArrayDeque`, `HashMap`, objetos, listas ligadas, árvores | validada com o debugger real |
| JavaScript e TypeScript | Node.js 22 ou mais novo; o debugger vem no VS Code | arrays, matrizes, pilha, fila, objetos como dicionário, `Map`, instâncias de classe, listas ligadas, árvores | validada no Node; o navegador ainda não tem teste |
| Python | [Extensão Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) e o Python | `list`, `tuple`, `deque`, `dict`, matrizes, pilha, fila, objetos, listas ligadas, árvores | validada com o debugger real |
| C# | [Extensão C#](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) e o .NET SDK | arrays, `List`, `Stack`, `Queue`, `Dictionary`, objetos, listas ligadas | validada com o debugger real |
| C | [Extensão C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools), um compilador e o gdb | arrays, ponteiros para `struct`, listas ligadas | validada com gdb no Windows e no Linux; lldb no macOS ainda não tem teste |
| Outras (Go, Rust, PHP...) | qualquer debugger do VS Code | coleções que o debugger marca como indexadas, inteiros e valores simples | modo genérico |

As explicações de fluxo (if, laços, break) entendem a família de C (Java, JavaScript, C#, C, Go) e Python.

## Instalar

**VS Code** (1.95 ou mais novo): instale pelo [Marketplace](https://marketplace.visualstudio.com/items?itemName=code-scope.code-scope) ou rode:

```bash
code --install-extension code-scope.code-scope
```

**Cursor, Windsurf, VSCodium, Antigravity:** o Code Scope ainda não está no Open VSX. Baixe o `code-scope.vsix` da [última release](https://github.com/celoramos/Code-Scope/releases/latest) e use **Install from VSIX...** na aba Extensões. Java, JavaScript e Python funcionam como no VS Code. Os debuggers de C# e C/C++ da Microsoft não rodam nesses editores; use os abertos, **C#** de muhammad-sammy (netcoredbg) e **CodeLLDB**, que os testes ainda não cobrem.

**IntelliJ IDEA 2026.2 ou mais novo, ou um Android Studio feito sobre ele** (beta, só Java): baixe o `code-scope-jetbrains-*.zip` da [última release](https://github.com/celoramos/Code-Scope/releases/latest) e vá em **Settings > Plugins > engrenagem > Install Plugin from Disk...**. As configurações ficam em **Settings > Tools > Code Scope**.

## Começar

1. Rode **Code Scope: Abrir um exemplo** na paleta de comandos e escolha Java, JavaScript ou Python. O tour **Começando com o Code Scope**, em **Help > Get Started**, faz o mesmo.
2. Abra um exemplo e coloque um breakpoint na linha indicada pelo comentário.
3. Aperte F5. O painel abre sozinho na primeira parada.
4. Avance com F10, ou F11 para entrar numa chamada, e acompanhe o painel.

No IntelliJ, debugue qualquer arquivo Java. O painel abre à direita quando o debugger para; ande com F8 ou F7.

Com o painel em foco, as setas esquerda e direita andam um passo, e Home e End vão para o primeiro e para o último. Os exemplos cobrem ordenação, buscas, recursão, listas ligadas, árvores, grafos, herança, `try/catch` e as pegadinhas acima, nas pastas de [`samples`](samples).

Se o painel não mostrar o que você esperava, abra **Output**, escolha **Code Scope** e mude o nível para *Debug*: o canal registra qual adaptador foi usado e o que o debugger devolveu. Depois veja os [limites conhecidos](docs/limites-conhecidos.md) ou [abra uma issue](https://github.com/celoramos/Code-Scope/issues/new/choose) com o log.

## Configurações

| Configuração | Padrão | O que faz |
|---|---|---|
| `codeScope.beginnerMode` | `true` | Mostra a frase explicando cada passo |
| `codeScope.animationSpeed` | `normal` | `slow`, `normal`, `fast` ou `off`. Se o sistema pedir menos movimento, as animações ficam desligadas de qualquer forma |
| `codeScope.maxElements` | `50` | Quantas posições de cada array, lista ou linha de matriz são lidas |
| `codeScope.valueNames` | `temp`, `aux`, `alvo`, `soma`... | Inteiros com esses nomes guardam valor, não posição, e não viram seta |
| `codeScope.revealOnDebug` | `true` | Abre o painel na primeira parada de cada sessão de debug |
| `codeScope.pauseOnErrors` | `true` | Pausa o programa nos erros que ninguém trata, para o painel mostrar onde e por que ele quebrou |

Comandos na paleta: **Code Scope: Mostrar painel**, **Code Scope: Limpar histórico**, **Code Scope: Modo apresentação** e **Code Scope: Abrir um exemplo**.

## Roadmap

1. PyCharm e WebStorm: Python e JavaScript no plugin JetBrains
2. Marketplace da JetBrains e Open VSX
3. Coleções do C++ (`std::vector`, `std::map`) e os conceitos novos em C#
4. Objetos nas variáveis das chamadas de baixo
5. JavaScript no navegador, testado com o debugger real
6. Adaptador para Go

## Contribuindo

O Code Scope é open source para ajudar o máximo de pessoas a entrar na programação, e quem já está nela a entender melhor o próprio código. Você pode ajudar mesmo começando agora: conte o que te confundiu, escreva um exemplo, melhore uma explicação ou escreva o adaptador da sua linguagem favorita.

As [tarefas para começar](docs/tarefas-para-comecar.md) dizem o que fazer, onde mexer e como saber que terminou. O [guia de contribuição](CONTRIBUTING.pt-br.md) explica o ambiente, os testes e onde fica cada parte do código. Toda participação segue o [código de conduta](CODE_OF_CONDUCT.md). O que mudou em cada versão está no [CHANGELOG](CHANGELOG.md).

## Licença

[MIT](LICENSE). Pode usar, estudar, modificar e distribuir, inclusive em aulas e cursos. Criado e mantido por [@celoramos](https://github.com/celoramos); todo mundo que ajudou está na [página de contribuidores](https://github.com/celoramos/Code-Scope/graphs/contributors).
