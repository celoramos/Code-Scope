# Code Scope

[English](README.md) | **Português**

Mostra o código rodando de forma visual, para quem está aprendendo a programar. Enquanto você debuga, um painel lateral desenha o seu programa e explica cada passo. É o "quer que eu desenhe?" da programação. Gratuito e de código aberto ([MIT](LICENSE)).

Roda no VS Code, no Cursor, no Windsurf, no VSCodium e no Antigravity, e no IntelliJ IDEA (beta, Java). Tudo fica dentro do seu editor: sem navegador, sem conta e sem enviar nada para a internet.

![Code Scope rodando o BubbleSort passo a passo](docs/demo.gif)

## O que ele desenha

- Arrays, matrizes, listas, conjuntos, pilhas e filas, com setas coloridas para `i` e `j`
- Dicionários, objetos e referências, listas ligadas, árvores e grafos
- A pilha de chamadas e a árvore de recursão
- Uma frase simples para cada passo, cada condição quebrada em partes verdadeiras e falsas, e todo erro explicado
- Um teste de mesa preenchido passo a passo, como o feito no papel

Três ferramentas a mais: **Adivinhar antes** pergunta quanto a variável vai valer antes de a linha rodar, **Modo apresentação** abre o painel grande para projetar, e **Salvar imagem** transforma o passo atual num PNG.

O painel fala português e inglês e segue o idioma do seu editor.

| Árvore de recursão | Erro explicado |
|---|---|
| ![fib(4): todas as chamadas com o que devolveram](docs/recursao.gif) | ![Índice fora do limite: a posição que não existe](docs/erro.gif) |

| Busca binária | Grafo |
|---|---|
| ![A condição com os valores, a posição comparada e a metade descartada](docs/busca.gif) | ![Busca em largura: visitados, atual e esperando](docs/grafo.gif) |

## Instalar

**VS Code** (1.95 ou mais novo): instale pelo [Marketplace](https://marketplace.visualstudio.com/items?itemName=code-scope.code-scope) ou rode:

```bash
code --install-extension code-scope.code-scope
```

**Cursor, Windsurf, VSCodium, Antigravity**: o Code Scope ainda não está no Open VSX. Baixe o `code-scope.vsix` da [última release](https://github.com/celoramos/Code-Scope/releases/latest) e use **Install from VSIX...** na aba Extensões. Os debuggers de C# e C/C++ da Microsoft não rodam nesses editores.

**IntelliJ IDEA 2026.2 ou mais novo, ou um Android Studio feito sobre ele** (beta, só Java): baixe o `code-scope-jetbrains-*.zip` da [última release](https://github.com/celoramos/Code-Scope/releases/latest) e vá em **Settings > Plugins > engrenagem > Install Plugin from Disk...**.

## Linguagens

| Linguagem | O que você precisa |
|---|---|
| Java | [Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack) e um JDK |
| JavaScript, TypeScript | Node.js 22 ou mais novo |
| Python | [Extensão Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) e o Python |
| C# | [Extensão C#](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) e o .NET SDK |
| C | [Extensão C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools), um compilador e o gdb |
| Outras (Go, Rust, PHP...) | Qualquer debugger do VS Code. O modo genérico mostra coleções indexadas e valores simples |

## Começar

1. Rode **Code Scope: Abrir um exemplo** na paleta de comandos e escolha uma linguagem.
2. Coloque um breakpoint na linha indicada pelo comentário e aperte F5.
3. Avance com F10 e acompanhe o painel.

No IntelliJ, debugue qualquer arquivo Java e avance com F8.

Algo parece errado? Veja os [limites conhecidos](docs/limites-conhecidos.md) e [abra uma issue](https://github.com/celoramos/Code-Scope/issues/new/choose). O Code Scope é uma beta, e essa é a ajuda mais útil agora.

## Roadmap

1. PyCharm e WebStorm: Python e JavaScript no plugin JetBrains
2. Marketplace da JetBrains e Open VSX
3. Coleções do C++ (`std::vector`, `std::map`) e os conceitos novos em C#
4. Objetos nas variáveis das chamadas de baixo
5. JavaScript no navegador, testado com o debugger real
6. Adaptador para Go

## Contribuindo

Você pode ajudar mesmo começando agora. As [tarefas para começar](docs/tarefas-para-comecar.md) dizem o que fazer e como saber que terminou, e o [guia de contribuição](CONTRIBUTING.pt-br.md) explica o ambiente, os testes e onde fica cada parte do código. Toda participação segue o [código de conduta](CODE_OF_CONDUCT.md). O que mudou em cada versão está no [CHANGELOG](CHANGELOG.md).

## Licença

[MIT](LICENSE). Criado e mantido por [@celoramos](https://github.com/celoramos).
