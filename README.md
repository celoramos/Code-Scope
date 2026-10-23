# Code Scope

Extensão do VS Code que mostra o código rodando de forma visual, para quem está aprendendo a programar. Gratuita e de código aberto ([MIT](LICENSE)).

Tudo acontece dentro do VS Code: o painel fica na barra lateral, ao lado do seu código, e usa as cores do seu tema. Não abre navegador, não precisa de conta e não envia nada para a internet.

Enquanto você debuga, um painel lateral desenha as variáveis locais: arrays, matrizes, listas, pilhas e filas. É o "quer que eu desenhe?" da programação. Funciona com Java, JavaScript, TypeScript e Python, e com qualquer outra linguagem que tenha debugger no VS Code (veja [Linguagens](#linguagens)). A cada F10 o painel anima o que mudou e explica em português o que aconteceu:

- a caixa alterada pisca e fica marcada;
- uma troca aparece como as duas caixas se cruzando, mesmo quando o código usa uma variável `temp` e leva dois passos;
- `i`, `j`, `inicio` e `fim` viram setas coloridas que deslizam embaixo das caixas;
- numa lista, o item novo surge e os seguintes abrem espaço; o que sai vai embora e os vizinhos fecham o buraco;
- numa pilha, o item empilhado cai no topo da torre e o desempilhado sobe e some, com a etiqueta "topo" acompanhando;
- numa fila, o item entra pela direita da esteira e quem está na frente sai pela esquerda;
- numa matriz, a linha e a coluna lidas pelo código ficam marcadas e a célula onde elas se cruzam ganha contorno;
- o texto diz o que mudou e por qual caminho o programa foi: "numeros[0] e numeros[1] trocaram de lugar", "a condição da linha 8 foi falsa: o programa pulou o bloco do if", "fim de uma volta do laço".

![Code Scope rodando o BubbleSort passo a passo](docs/demo.gif)

| Pilha | Fila |
|---|---|
| ![Pilha de pratos: push e pop pelo topo](docs/pilha.gif) | ![Fila do banco: entra pelo fim, sai pela frente](docs/fila.gif) |

| Matriz | Lista |
|---|---|
| ![Matriz com a linha i e a coluna j marcadas](docs/matriz.png) | ![ArrayList recebendo um item no meio](docs/lista.png) |

*Capturas do painel feitas com dados de sessões reais do Java Debugger.*

## Linguagens

O Code Scope conversa com o debugger pelo **Debug Adapter Protocol**, o protocolo que o VS Code usa com todos os debuggers. Cada debugger escreve os valores do seu jeito, então cada linguagem tem um adaptador que traduz esse texto para o painel. Linguagens sem adaptador próprio usam o modo genérico.

| Linguagem | Debugger | Estruturas | Situação |
|---|---|---|---|
| Java | Debugger for Java (`vscjava.vscode-java-debug`) | arrays, matrizes, `ArrayList`, `Stack`, `Queue`, `ArrayDeque` | validada com o debugger real |
| JavaScript e TypeScript | o que já vem no VS Code (Node, Chrome, Edge) | arrays, matrizes, pilha (`push`/`pop`), fila (`push`/`shift`) | validada com o debugger real no Node; no navegador usa o mesmo adaptador, ainda sem teste |
| Python | Python Debugger (`ms-python.debugpy`) | `list`, `tuple`, `deque`, matrizes, pilha (`append`/`pop()`), fila (`pop(0)`/`popleft()`) | implementada; ainda sem validação com o debugpy real |
| Outras (C#, C/C++, Go, Rust, PHP...) | qualquer debugger do VS Code | coleções que o debugger marca como indexadas, inteiros e valores simples | modo genérico: mostra o que o protocolo garante e deixa de fora o que não entende |

As explicações de fluxo (if, laços, break) entendem a família de C (Java, JavaScript, C#, C, Go) e Python. Se o painel não reconhecer alguma coisa na sua linguagem, abra uma [issue](https://github.com/celoramos/Code-Scope/issues/new/choose) com o log (veja abaixo): é assim que um adaptador novo começa.

## O que aparece no painel

| Parte | O que mostra |
|---|---|
| Linha do tempo | "Passo 7 de 13", botões de passo anterior e próximo, e um controle deslizante para pular para qualquer passo. Rever o histórico não volta a execução do programa. |
| Código | A linha que acabou de executar e a próxima, com a mesma cor que o editor usa para a linha parada. |
| Explicação | Uma frase por mudança, mais o caminho do programa (if, laço, break). Pode ser desligada. |
| Variáveis | Inteiros, textos, booleanos, caracteres e números com vírgula. Os inteiros que viram seta levam a cor da seta. |
| Estruturas | Arrays, matrizes, listas, pilhas e filas. Pilha e fila são reconhecidas pelo jeito como o código usa a coleção. |

## Requisitos

- VS Code 1.90 ou mais novo
- O debugger da sua linguagem:
  - Java: **Extension Pack for Java** (`code --install-extension vscjava.vscode-java-pack`) e um JDK
  - JavaScript e TypeScript: nada a instalar além do Node.js; o debugger vem no VS Code
  - Python: extensão **Python** (`code --install-extension ms-python.python`), que traz o debugpy, e o Python instalado

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

Abra a pasta no VS Code e aperte **F5**. A configuração "Rodar extensão" compila o projeto e abre uma segunda janela, o *Extension Development Host*, já com os exemplos de Java, JavaScript e Python abertos (`samples/exemplos.code-workspace`).

Durante o desenvolvimento, `npm run watch` recompila a cada alteração; recarregue a janela de teste com `Ctrl+R`.

## Testando com os exemplos

Na janela do Extension Development Host:

1. Abra um dos exemplos e coloque um breakpoint na linha indicada pelo comentário.
2. Na aba **Run and Debug**, escolha a configuração e aperte F5. No Java, cada exemplo tem uma configuração com o mesmo nome; em JavaScript e Python, use "Arquivo aberto". O painel do Code Scope abre sozinho na primeira parada.
3. Avance com **F10** (step over) e acompanhe o painel.

| Exemplo | O que observar |
|---|---|
| `java/BubbleSort.java` | Setas `i` e `j`; trocas feitas com `temp` aparecendo como caixas que se cruzam; if verdadeiro e falso |
| `java/BuscaLinear.java` | A seta `i` percorrendo o array; `alvo` guarda um valor, então não vira seta; o break encerrando o laço |
| `java/InverterArray.java` | As setas `inicio` e `fim` se aproximando enquanto as pontas trocam de lugar |
| `java/Palindromo.java` | `char[]` com aspas simples; o boolean `ehPalindromo` entre as variáveis |
| `java/Matriz.java` | Grade 2 por 3 com a linha `i` e a coluna `j` marcadas, célula a célula |
| `java/ListaDeCompras.java` | Lista nascendo vazia, itens entrando no fim e no meio, item saindo do começo |
| `java/Pilha.java` | Pilha de pratos: `push` no topo, `peek` que só olha, `pop` que tira o último que entrou |
| `java/Fila.java` | Fila do banco: clientes entram pelo fim e são atendidos pela frente |
| `java/Parenteses.java` | Uso clássico de pilha: conferir se `{[()]}` está balanceado, empilhando cada abertura |
| `javascript/bubbleSort.js` | O mesmo BubbleSort em JavaScript, com `let` e `const` dentro dos laços |
| `javascript/pilha.js` | Histórico de "desfazer": um array usado com `push` e `pop` vira pilha |
| `javascript/fila.js` | Fila da impressora: um array usado com `push` e `shift` vira fila |
| `python/bubble_sort.py` | BubbleSort em Python; a troca `a, b = b, a` acontece num passo só |
| `python/pilha.py` | Botão "voltar" do navegador: `append` e `pop()` numa lista |
| `python/fila.py` | Pedidos da lanchonete: `deque` com `append` e `popleft()` |

Com o painel em foco: setas esquerda e direita andam um passo, Home e End vão para o primeiro e para o último.

Se o painel não mostrar o que você esperava, abra **Output**, escolha **Code Scope** e mude o nível para *Debug*. O canal registra qual adaptador foi usado, cada snapshot e o que o debugger devolveu.

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
debugger da linguagem -- evento "stopped" --> trackerFactory
                                                 |
          stackTrace, scopes, variables  <------ dapCollector (customRequest)
                                                 |  adaptador da linguagem traduz
                                                 |  "int[5]@10", "(5) [5, 1, 4]", "[5, 1, 4]"...
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
| `src/debug` | Fala o Debug Adapter Protocol. `adapters/` tem um adaptador por linguagem e o modo genérico; é a única parte que conhece o formato de cada debugger. |
| `src/model` | `Snapshot`, diff entre passos, histórico, setas, linha e coluna da matriz, texto explicativo. Não depende do VS Code, do DAP nem da linguagem. |
| `src/webview` | `WebviewViewProvider` do painel e o protocolo de mensagens. |
| `media` | HTML, CSS e JS do painel. Cores, fontes e bordas vêm do tema do VS Code. |
| `samples` | Exemplos em Java, JavaScript e Python, com `launch.json` pronto. |
| `test` | Testes unitários (mocha) e de integração com debuggers reais. |

## Testes

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários do modelo, dos adaptadores e do coletor, com respostas gravadas dos debuggers reais |
| `npm run test:integration` | Baixa um VS Code isolado em `.vscode-test/`, instala o Java Extension Pack só nele e debuga os exemplos de Java e JavaScript de verdade. Seu VS Code não é tocado. Leva alguns minutos na primeira vez |

O CI roda os dois a cada push e publica o `.vsix` como artefato.

## Limites conhecidos

- Lê só as variáveis locais da função atual; campos de objetos e chamadas anteriores na pilha ainda não aparecem.
- Python ainda não foi conferido com o debugpy real; os testes usam o formato documentado.
- No modo genérico, só aparecem coleções que o debugger marca como indexadas ou cujo tamanho está escrito no valor.
- Matrizes de três ou mais dimensões mostram o terceiro nível como texto.
- Uma lista que ganha ou perde mais de um item num só passo aparece como redimensionada, sem animação de deslize.
- Fora de matrizes, um inteiro vira seta pelo valor: qualquer inteiro que caiba nos índices aponta para uma caixa, a menos que o nome esteja em `codeScope.valueNames`.
- Pilha e fila são reconhecidas pelo nome da variável, lendo o arquivo inteiro: os métodos usados (`push`, `poll`, `popleft`...) são somados de todos os lugares. Duas variáveis com o mesmo nome usadas de jeitos diferentes no mesmo arquivo podem ser classificadas errado.
- Se você usar F5 (continue) entre breakpoints em vez de F10, o painel mostra a diferença acumulada entre as duas paradas e a linha "Executou" é a do breakpoint anterior.

## Roadmap

1. Validar Python com o debugpy real e adicionar `dict`
2. `HashMap`, `HashSet` e objetos de JavaScript
3. Recursão, com a pilha de chamadas
4. Stack vs heap, com setas de referência entre objetos
5. Lista ligada desenhada como nós e setas
6. Adaptadores próprios para C#, C/C++ e Go

## Contribuindo

O Code Scope é open source para ajudar o máximo de pessoas a entrar na programação, e quem já está nela a entender melhor o próprio código. Você pode ajudar mesmo começando agora:

- relate o que te confundiu no painel, abrindo uma [issue](https://github.com/celoramos/Code-Scope/issues/new/choose);
- escreva um exemplo novo em `samples/`, em qualquer linguagem;
- melhore uma frase de explicação;
- escreva o adaptador da sua linguagem favorita;
- implemente um item do roadmap.

O [guia de contribuição](CONTRIBUTING.md) explica como preparar o ambiente, rodar os testes e onde fica cada parte do código. Toda participação segue o [código de conduta](CODE_OF_CONDUCT.md).

## Licença

[MIT](LICENSE). Pode usar, estudar, modificar e distribuir, inclusive em aulas e cursos.
