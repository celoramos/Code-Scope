# Code Scope

Extensão do VS Code que mostra o código rodando de forma visual, para quem está aprendendo a programar. Gratuita e de código aberto ([MIT](LICENSE)).

Tudo acontece dentro do VS Code: o painel fica na barra lateral, ao lado do seu código, e usa as cores do seu tema. Não abre navegador, não precisa de conta e não envia nada para a internet.

Enquanto você debuga um programa Java, um painel lateral desenha os arrays, as listas e as matrizes das variáveis locais. A cada F10 ele anima o que mudou e explica em português o que aconteceu:

- a caixa alterada pisca e fica marcada;
- uma troca aparece como as duas caixas se cruzando, mesmo quando o código usa uma variável `temp` e leva dois passos;
- `i`, `j`, `inicio` e `fim` viram setas coloridas que deslizam embaixo das caixas;
- numa lista, o item novo surge e os seguintes abrem espaço;
- numa matriz, a linha e a coluna lidas pelo código ficam marcadas e a célula onde elas se cruzam ganha contorno;
- o texto diz o que mudou e por qual caminho o programa foi: "numeros[0] e numeros[1] trocaram de lugar", "a condição da linha 8 foi falsa: o programa pulou o bloco do if", "fim de uma volta do laço".

![Code Scope rodando o BubbleSort passo a passo](docs/demo.gif)

| Matriz | Lista |
|---|---|
| ![Matriz com a linha i e a coluna j marcadas](docs/matriz.png) | ![ArrayList recebendo um item no meio](docs/lista.png) |

*Capturas do painel feitas com dados de sessões reais do Java Debugger.*

## O que aparece no painel

| Parte | O que mostra |
|---|---|
| Linha do tempo | "Passo 7 de 13", botões de passo anterior e próximo, e um controle deslizante para pular para qualquer passo. Rever o histórico não volta a execução do programa. |
| Código | A linha que acabou de executar e a próxima, com a mesma cor que o editor usa para a linha parada. |
| Explicação | Uma frase por mudança, mais o caminho do programa (if, laço, break). Pode ser desligada. |
| Variáveis | Inteiros, booleans, chars, doubles e Strings locais. Os inteiros que viram seta levam a cor da seta. |
| Estruturas | Arrays (`int[]`, `char[]`, `String[]`...), matrizes (`int[][]`) e listas (`ArrayList`, `LinkedList`...). |

## Requisitos

- VS Code 1.90 ou mais novo
- Extensão **Debugger for Java** (`vscjava.vscode-java-debug`). O jeito mais simples é instalar o **Extension Pack for Java**, que já traz o debugger e o suporte à linguagem:

  ```bash
  code --install-extension vscjava.vscode-java-pack
  ```

- Um JDK instalado. Os exemplos e os testes de integração rodam com o JDK 21.

## Instalar

Baixe o `code-scope.vsix` da última execução do CI (aba **Actions** do repositório, artefato `code-scope-vsix`) ou gere o seu:

```bash
npm install
npm run vsix
code --install-extension code-scope.vsix
```

## Rodar a partir do código

```bash
git clone https://github.com/celoramos/Code-Scope.git
cd Code-Scope
npm install
```

Abra a pasta no VS Code e aperte **F5**. A configuração "Rodar extensão" compila o projeto e abre uma segunda janela, o *Extension Development Host*, já com a pasta `samples/java` aberta.

Durante o desenvolvimento, `npm run watch` recompila a cada alteração; recarregue a janela de teste com `Ctrl+R`.

## Testando com os exemplos

Na janela do Extension Development Host:

1. Abra um dos arquivos de `samples/java` e coloque um breakpoint na linha indicada pelo comentário.
2. Na aba **Run and Debug**, escolha o exemplo com o mesmo nome e aperte F5. O painel do Code Scope abre sozinho na primeira parada.
3. Avance com **F10** (step over) e acompanhe o painel.

| Exemplo | O que observar |
|---|---|
| `BubbleSort.java` | Setas `i` e `j`; trocas feitas com `temp` aparecendo como caixas que se cruzam; if verdadeiro e falso |
| `BuscaLinear.java` | A seta `i` percorrendo o array; `alvo` guarda um valor, então não vira seta; o break encerrando o laço |
| `InverterArray.java` | As setas `inicio` e `fim` se aproximando enquanto as pontas trocam de lugar |
| `Palindromo.java` | `char[]` com aspas simples; o boolean `ehPalindromo` entre as variáveis |
| `Matriz.java` | Grade 2 por 3 com a linha `i` e a coluna `j` marcadas, célula a célula |
| `ListaDeCompras.java` | Lista nascendo vazia, itens entrando no fim e no meio, item saindo do começo |

Com o painel em foco: setas esquerda e direita andam um passo, Home e End vão para o primeiro e para o último.

Se o painel não mostrar o que você esperava, abra **Output**, escolha **Code Scope** e mude o nível para *Debug*. O canal registra cada snapshot e o que o adaptador Java devolveu.

## Configurações

| Configuração | Padrão | O que faz |
|---|---|---|
| `codeScope.beginnerMode` | `true` | Mostra a frase explicando cada passo |
| `codeScope.animationSpeed` | `normal` | `lenta`, `normal`, `rapida` ou `desligada`. Se o sistema pedir menos movimento, as animações ficam desligadas de qualquer forma |
| `codeScope.maxElements` | `50` | Quantas posições de cada array, lista ou linha de matriz são lidas |
| `codeScope.valueNames` | `temp`, `aux`, `alvo`, `soma`... | Inteiros com esses nomes guardam valor, não posição, e não viram seta |
| `codeScope.revealOnDebug` | `true` | Abre o painel na primeira parada de cada sessão de debug |

Comandos na paleta: **Code Scope: Mostrar painel** e **Code Scope: Limpar histórico**.

## Como funciona

```
Debugger for Java -- evento "stopped" --> trackerFactory
                                             |
        stackTrace, scopes, variables  <---- dapCollector (customRequest)
                                             |  javaAdapter interpreta "int[5]@10", "ArrayList@11 size=4"...
                                             v
                     Snapshot { line, code, arrays, pointers, scalars }
                                             |
          History --> diff + explain + flow + setas --> Frame
                                             | postMessage
                                             v
                               Webview (HTML, CSS e JS puros)
```

| Pasta | Responsabilidade |
|---|---|
| `src/debug` | Fala o Debug Adapter Protocol. É a única parte que conhece o formato do adaptador Java. |
| `src/model` | `Snapshot`, diff entre passos, histórico, setas, linha e coluna da matriz, texto explicativo. Não depende do VS Code nem do DAP. |
| `src/webview` | `WebviewViewProvider` do painel e o protocolo de mensagens. |
| `media` | HTML, CSS e JS do painel. Cores, fontes e bordas vêm do tema do VS Code. |
| `samples/java` | Programas de exemplo com `launch.json` pronto. |
| `test` | Testes unitários (mocha) e de integração com o Java Debugger real. |

Como o `Snapshot` é neutro, suportar outra linguagem significa escrever outro adaptador em `src/debug`. O diff, o histórico e o painel continuam iguais. A única regra presa à sintaxe é a explicação de fluxo (`src/model/flow.ts`), que entende `if`, `for` e `while` no estilo de C.

## Testes

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários do modelo, do adaptador e do coletor, com respostas DAP gravadas do debugger real |
| `npm run test:integration` | Baixa um VS Code isolado em `.vscode-test/`, instala o Java Extension Pack só nele e debuga os samples de verdade. Seu VS Code não é tocado. Leva alguns minutos na primeira vez |

O CI roda os dois a cada push e publica o `.vsix` como artefato.

## Limites conhecidos

- Lê só as variáveis locais do método atual; campos de objetos e chamadas anteriores na pilha ainda não aparecem.
- Matrizes de três ou mais dimensões mostram o terceiro nível como texto (`int[3]`).
- Uma lista que ganha ou perde mais de um item num só passo aparece como redimensionada, sem animação de deslize.
- Fora de matrizes, um inteiro vira seta pelo valor: qualquer inteiro que caiba nos índices aponta para uma caixa, a menos que o nome esteja em `codeScope.valueNames`.
- Se você usar F5 (continue) entre breakpoints em vez de F10, o painel mostra a diferença acumulada entre as duas paradas e a linha "Executou" é a do breakpoint anterior.

## Roadmap

1. `HashMap` e `HashSet`
2. Pilha e fila
3. Recursão, com a pilha de chamadas
4. Stack vs heap, com setas de referência entre objetos
5. Suporte a JavaScript e Python

## Contribuindo

O Code Scope é open source para ajudar o máximo de pessoas a entrar na programação, e quem já está nela a entender melhor o próprio código. Você pode ajudar mesmo começando agora:

- relate o que te confundiu no painel, abrindo uma [issue](https://github.com/celoramos/Code-Scope/issues/new/choose);
- escreva um exemplo novo em `samples/java`;
- melhore uma frase de explicação;
- implemente um item do roadmap.

O [guia de contribuição](CONTRIBUTING.md) explica como preparar o ambiente, rodar os testes e onde fica cada parte do código. Toda participação segue o [código de conduta](CODE_OF_CONDUCT.md).

## Licença

[MIT](LICENSE). Pode usar, estudar, modificar e distribuir, inclusive em aulas e cursos.
