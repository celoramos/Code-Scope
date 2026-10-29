# Changelog

## 0.8.0

### Novo

- Setas pelo código: só vira seta embaixo do array a variável que o código usa como posição (colchetes, `get(i)`, comparação com o tamanho, conta de outra posição). `soma = 2` não aponta mais para a posição 2.
- Lista que ganha ou perde vários itens num passo (`addAll`, `extend`, `splice`, `del lista[1:3]`) anima o bloco inteiro e diz quais itens entraram ou saíram, em vez de só "redimensionada".
- Pilha de chamadas: arrays e listas das chamadas de baixo mostram os itens (`[38, 27, 43, 3]`), não só o tamanho. Na recursão sobre arrays dá para ver o pedaço que cada chamada recebeu. Exemplos novos de merge sort e quick sort em Java, Python e JavaScript.
- Plugin JetBrains: sem o navegador embutido (JCEF), o painel explica como ligar em vez de ficar vazio.
- Conjuntos: `HashSet` (Java), `set` (Python) e `Set` (JavaScript) aparecem como conjunto, sem índice nas caixas. As frases dizem o que entrou e o que saiu, e um `add` de um valor que já estava explica que nada mudou porque conjunto não guarda repetidos. Exemplos novos: `Conjunto.java`, `conjunto.py`, `conjunto.js`.
- Plugin JetBrains: configurações em Settings > Tools > Code Scope (velocidade das animações, modo iniciante, posições lidas, abrir o painel e parar em erros).
- Tour de primeiro uso no VS Code (Help > Get Started): abrir um exemplo, pôr o breakpoint e apertar F10, e os modos de adivinhar e de apresentação.
- Comando "Code Scope: Abrir um exemplo": copia os exemplos de Java, JavaScript ou Python, com o launch.json, para uma pasta que você escolhe e abre essa pasta. Os exemplos agora vão dentro da extensão.
- Cursor, Windsurf, VSCodium, Antigravity e outros editores feitos a partir do VS Code: o CI roda os testes de Java, JavaScript e Python no VSCodium, com os debuggers baixados do Open VSX, e cada tag `v*` publica o `.vsix` no Open VSX.
- IntelliJ IDEA e Android Studio (beta): plugin JetBrains para Java em `jetbrains/`. O painel e o coletor são os mesmos da extensão, rodando no navegador embutido da IDE; o depurador de Java da IDE responde as requisições do DAP. Como no VS Code, o programa para no erro que ninguém tratou e o painel explica o erro. Testado no IntelliJ IDEA 2026.2 com os exemplos de Java, comparando passo a passo com o VS Code (`jetbrains/self-test.ts`).
- Release: uma tag `v*` anexa o `.vsix` e o `.zip` do plugin JetBrains à release do GitHub e publica no Open VSX (quando o segredo `OVSX_PAT` existe).

## 0.7.0 (beta)

### Mudou

- `codeScope.animationSpeed` agora usa `slow`, `normal`, `fast` e `off` no `settings.json`. Os valores antigos (`lenta`, `rapida`, `desligada`) continuam funcionando.
- Pede VS Code 1.95 ou mais novo (antes, 1.90). No 1.90 até o 1.94, o debugger de JavaScript que vem com o VS Code não mostrava os objetos ao dar F10 por cima de um `new`; o teste de integração agora roda no 1.95 para garantir.

### Corrigido

- Temas de alto contraste: as bordas dos cartões, caixas e tabelas usam a borda do tema (antes quase sumiam sobre o preto ou o branco), e a próxima linha ganha um contorno, já que esses temas não pintam o fundo dela.
- A árvore de recursão encostava nas variáveis logo abaixo dela.
- Leitor de tela: a matriz agora é lida como tabela, linha por linha (as células estavam fora de qualquer linha).
- Contraste: texto cinza sobre o fundo amarelo de "mudou" e sobre a próxima linha, a variável que saiu de escopo e as posições fora do intervalo da busca ficavam abaixo de 4,5:1. As posições fora do intervalo agora ficam com borda tracejada e número cinza, em vez de transparentes.
- Setas com nome comprido em posições vizinhas se cobriam ("inicio" e "encontradoEm" na busca binária). Agora a etiqueta que encostaria na outra desce uma linha.
- Árvore de recursão: as chamadas que ficam no meio de duas outras (`fib(3)`, `fib(4)`) se amontoavam numa coluna, longe das linhas que as ligam. Agora cada uma fica na ponta da sua linha.
- Alto contraste claro: o trecho de código na caixa da condição ficava branco sobre fundo claro. O VS Code dá cor própria ao `<code>` dos painéis; o painel agora usa as cores dele.
- Seta na posição 0 com nome mais largo que a caixa ("inicio") saía pela borda esquerda.

## 0.6.0 (beta)

### Novo

- Árvore de recursão: quando a recursão se divide (`fib(n - 1) + fib(n - 2)`), todas as chamadas aparecem com o que devolveram, e o painel diz quantas vezes a mesma conta foi refeita.
- Modo de adivinhar ("Adivinhar antes"): antes de uma linha rodar, o painel pergunta quanto a variável vai valer e, depois do F10, diz se o palpite acertou, com placar.
- Modo apresentação (comando "Code Scope: Modo apresentação"): o painel grande ao lado do código, com letra maior e animações mais lentas, para projetar ou gravar a tela.
- Salvar imagem: o passo atual vira PNG, para slides e listas de exercício.
- Lista de objetos: cada objeto aparece dentro da sua posição, com a classe quando o array mistura classes.
- Grafo: dicionário de listas que apontam para as próprias chaves vira grafo, com visitados, nó atual e fila.
- try/catch: o passo que entra no catch explica a linha que deu erro e o pulo.
- Herança e polimorfismo: a explicação diz quando rodou a versão da subclasse ou a herdada.
- Texto lido letra por letra vira uma fileira de letras com a seta do índice.
- Pegadinhas de número: divisão de inteiros, `//` do Python, `0.1 + 0.2` e overflow.
- Identidade e igualdade: quando a condição compara dois objetos, a explicação diz se a pergunta foi "é o mesmo objeto?" ou "tem o mesmo conteúdo?", com as pegadinhas do `==` entre textos no Java, do `equals` (ou `__eq__`) que a classe não escreveu e do `equals` de array.
- Mudar no lugar ou criar outro: `sort` e `reverse` mudam a própria lista (e o outro nome dela também), `sorted`, `slice`, `[:]` e `Arrays.copyOf` criam outra, e o texto novo de `s.trim();` que ninguém guardou é explicado com a linha que guardaria.
- Quanto custa: embaixo do contador de comparações, a contagem do programa ao lado das curvas log n, n, n log n e n², para o n dele e para 1000. O painel não afirma qual curva o programa segue: passos pulados com F5 não são contados.
- C#: adaptador próprio para o debugger da extensão C# (arrays, `List`, `Stack`, `Queue`, `Dictionary`, objetos e listas ligadas), validado com o debugger real, e exemplos em `samples/csharp`.
- C: adaptador próprio para a extensão C/C++ com gdb (arrays, ponteiros para struct e listas ligadas), validado com o debugger real, e exemplos em `samples/c`. Variável declarada abaixo da linha parada ainda guarda lixo de memória, então só aparece depois que a declaração roda; um ponteiro com lixo não vira nó.
- Para quem quer contribuir: guia em inglês (`CONTRIBUTING.md`) e português, lista de tarefas para começar (`docs/good-first-issues.md`), formulários de issue e de pull request nos dois idiomas.

## 0.5.0

### Novo

- Teste de mesa: uma linha por passo e uma coluna por variável, com a célula que mudou marcada e uma coluna de chamada quando há recursão. Clicar no passo leva até ele.
- Erros explicados: o programa para nas exceções que ninguém trata (configuração `codeScope.pauseOnErrors`) e o painel diz o que aconteceu em palavras simples. Índice fora do limite desenha a posição que não existe; também há explicação para null/undefined/None, divisão por zero, chave inexistente, recursão sem fim e outros.
- Pilha de chamadas e recursão: um cartão por chamada, cada um com as próprias variáveis, e o valor devolvido quando a chamada termina.
- Objetos e referências: um cartão por objeto, com as variáveis que apontam para ele. Duas variáveis no mesmo objeto (ou no mesmo array) aparecem como uma coisa só, com a explicação de que não é cópia.
- Listas ligadas desenhadas como nós e setas e árvores binárias como árvores, reconhecidas pela classe que aponta para ela mesma.
- Dicionários: `HashMap` e outros `Map` do Java, `dict` do Python, objeto literal e `Map` do JavaScript, numa tabela de chave e valor.
- Condições quebradas em partes antes de rodar, cada uma verdadeira ou falsa com os valores no lugar dos nomes, respeitando o curto-circuito.
- Buscas e ordenações: posições comparadas contornadas, intervalo da busca (inicio e fim, lo e hi...) com o resto apagado, e contadores de comparações e trocas.
- Escopo: a variável que sai de escopo fica um passo, riscada; a variável de um bloco que esconde outra de mesmo nome e o parâmetro com o nome de um campo do objeto são explicados.
- O painel fala inglês e português e segue o idioma do VS Code: português quando o VS Code está em português, inglês nos outros casos. Valem as explicações, os rótulos do painel, os textos para leitores de tela, os comandos e as configurações.
- README em inglês (`README.md`) e em português (`README.pt-br.md`).
- Exemplos novos nas três linguagens: fatorial, erro de índice, referências, lista ligada, árvore binária, dicionário, busca binária e escopo.

### Corrigido

- `HashMap` aparecia como lista, com valores como `HashMap$Node@44 "sol":"1"`.
- As variáveis "Return value" (JavaScript) e "(return) f" (Python) apareciam no painel como se fossem do aluno.
- `double` no Java aparecia com a vírgula e as casas do sistema ("150,000000"); agora sai como no código ("150.0").
- A tela inicial do painel pedia um breakpoint "num programa Java"; agora vale para qualquer linguagem.
- CI: os testes de JavaScript falhavam com o Node 20, que o js-debug do VS Code 1.143 não consegue debugar; o CI passa a usar o Node 24, e a documentação pede o Node 22 ou mais novo.

## 0.4.0

### Novo

- Funciona com qualquer linguagem que tenha debugger no VS Code. Cada linguagem tem um adaptador que traduz o formato do seu debugger; as que não têm usam o modo genérico.
- JavaScript e TypeScript: arrays, matrizes, pilha (`push`/`pop`) e fila (`push`/`shift`), validados com o debugger real do Node que vem no VS Code. Variáveis de `let` e `const` dentro de laços aparecem, e as que o Node põe em todo módulo (`__dirname`, `require`...) ficam de fora.
- Python: `list`, `tuple`, `deque`, matrizes, pilha (`append`/`pop()`) e fila (`pop(0)`/`popleft()`), validados com o debugpy real. A troca `a, b = b, a` é reconhecida num passo só.
- Modo genérico para C#, C/C++, Go, Rust e outras: coleções indexadas, inteiros e valores simples.
- A explicação de fluxo entende `elif` e a sintaxe do Python.
- Exemplos em JavaScript e Python, e um workspace que abre os exemplos das três linguagens no F5.
- Testes de integração com os debuggers reais de JavaScript e Python, também no CI.

## 0.3.0

### Novo

- Pilha desenhada como uma torre aberta em cima: `push` faz o item cair no topo, `pop` faz ele subir e sumir, e a etiqueta "topo" acompanha. A torre fica presa pela base, então empilhar não empurra os itens de baixo.
- Fila desenhada como uma esteira com saída e entrada: `offer` entra pela direita, `poll` sai pela frente, com as etiquetas "frente" e "fim".
- O papel da coleção vem do código: `Stack` e `Queue` pelo tipo, e `ArrayDeque`/`LinkedList` pelos métodos usados (`push`/`pop` ou `offer`/`poll`). A ordem do `ArrayDeque` usado como pilha é corrigida para o topo ficar em cima.
- Explicações com a regra de cada estrutura ("na pilha, sai sempre o último que entrou") e uma nota para `peek()`, que só olha a ponta sem tirar nada.
- Item removido de lista, pilha ou fila sai animado, e os vizinhos fecham o espaço no mesmo movimento.
- Exemplos novos: Pilha, Fila e Parenteses.

### Corrigido

- Elementos de coleções com tipos embrulhados (`Character`, `Integer`...) apareciam como `'Character'`; agora o valor de verdade é lido.

## 0.2.0

### Corrigido

- O painel mostrava `?` em todas as posições com o Java Debugger real: os elementos se chamam `0`, `1`... e não `[0]`, e objetos vêm como `int[5]@10`. Encontrado pelo novo teste de integração.

### Novo

- Matrizes (`int[][]`) desenhadas como grade, com a linha e a coluna lidas do código (`grade[i][j]`).
- Listas (`ArrayList`, `LinkedList`...): inserção e remoção animadas, lista vazia visível desde a criação.
- `char` com aspas simples; boolean, char, double e String entre as variáveis.
- Linha que executou e próxima linha, com o texto do código.
- Explicação do caminho do programa: if verdadeiro ou falso, laço que continua ou termina, volta ao início do laço, break.
- Frases de ponteiro mais naturais: "avançou", "recuou", "voltou para 0".
- Linha do tempo com controle deslizante, Home/End e "voltar ao passo mais recente".
- Configurações: modo iniciante, velocidade da animação, limite de elementos, nomes que não viram seta, abrir o painel ao iniciar o debug.
- Comandos "Mostrar painel" e "Limpar histórico".
- Teste de integração com o Java Debugger real e CI no GitHub Actions, que também gera o `.vsix`.

## 0.0.1

- Primeira versão: arrays Java como caixas, ponteiros `i`/`j`, animação de troca, histórico de passos e texto explicativo.
