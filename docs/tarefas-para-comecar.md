# Tarefas para começar

[English](good-first-issues.md) | **Português**

Tarefas que são uma boa porta de entrada no projeto. Cada uma diz por que importa, onde mexer e como saber que terminou. Se quiser pegar uma, comente na issue dela (o link está em cada tarefa) avisando, para duas pessoas não fazerem a mesma coisa.

Níveis: **sem código** (não precisa programar), **iniciante** (poucas linhas, um arquivo), **intermediário** (vários arquivos, testes).

## Sem código

### 1. Conte o que te confundiu

- **Issue:** [#2](https://github.com/celoramos/Code-Scope/issues/2)
- **Por quê:** o painel é para quem está aprendendo. Se alguma coisa nele te confundiu, esse é o retorno mais útil que o projeto pode ter.
- **Como:** use o painel no seu código ou nos exemplos e abra uma issue com o que você esperava e o que viu. Uma imagem (botão "Salvar imagem") ajuda.

### 2. Revisar os textos em inglês

- **Issue:** [#3](https://github.com/celoramos/Code-Scope/issues/3)
- **Por quê:** as explicações foram escritas em português e traduzidas. Quem fala inglês nativamente vai achar o que soa estranho.
- **Onde:** `src/model/messages.ts` (explicações), `src/webview/strings.ts` (painel), `package.nls.json` (comandos e configurações).
- **Pronto quando:** um pull request (ou uma issue com a lista de frases) com o inglês mais claro, sem mudar o sentido.

### 3. Usar o painel com leitor de tela

- **Issue:** [#4](https://github.com/celoramos/Code-Scope/issues/4)
- **Por quê:** o painel tem rótulos para leitores de tela e passa numa verificação automática (axe-core), mas ninguém ouviu ainda com NVDA, JAWS ou VoiceOver. Uma ferramenta não diz se o que é lido faz sentido.
- **Como:** avance pelo `samples/java/BubbleSort.java` e pelo `samples/java/ListaLigada.java` e conte, numa issue, o que é lido e o que falta.

### 4. Conferir outros temas de cores

- **Issue:** [#5](https://github.com/celoramos/Code-Scope/issues/5)
- **Por quê:** todas as cores vêm do tema do VS Code. Os temas escuro, claro e de alto contraste que vêm com o VS Code foram conferidos dentro dele com os exemplos em JavaScript. Os temas populares do Marketplace (Solarized, Monokai, One Dark, GitHub) não.
- **Como:** instale um desses temas, passe por alguns exemplos em Java ou Python e abra uma issue com imagens do que ficar difícil de ler.

## Iniciante

### 5. Um exemplo novo: ordenação por seleção

- **Issue:** [#6](https://github.com/celoramos/Code-Scope/issues/6)
- **Por quê:** cada algoritmo clássico é uma aula nova que o painel pode dar.
- **Onde:** `samples/java`, `samples/javascript`, `samples/python`. Siga o `BubbleSort.java` e o `bubbleSort.js`. No Java, acrescente a configuração em `samples/java/.vscode/launch.json`.
- **Pronto quando:** o exemplo roda com F5 e o comentário diz onde pôr o breakpoint.

### 6. Mais exemplos: ordenação por inserção, soma de matriz, calculadora com pilha

- **Issue:** [#7](https://github.com/celoramos/Code-Scope/issues/7)
- Igual ao anterior. Um exemplo por pull request está ótimo.

### 7. Gravar GIFs novos para o README

- **Issue:** [#8](https://github.com/celoramos/Code-Scope/issues/8)
- **Por quê:** os GIFs do README só mostram arrays, pilha e fila. A pilha de chamadas, a árvore de recursão, a lista ligada e o teste de mesa ainda não têm demonstração.
- **Onde:** `docs/`, usados no `README.md` e no `README.pt-br.md`.
- **Pronto quando:** um GIF curto (menos de 2 MB) de um desses, nos dois READMEs.

## Intermediário

### 8. `set` do Python e `HashSet` do Java

- **Issue:** [#9](https://github.com/celoramos/Code-Scope/issues/9)
- **Por quê:** conjunto é a coleção comum que o painel ainda não desenha.
- **Onde:** os adaptadores em `src/debug/adapters/`, um tipo novo em `src/model/snapshot.ts`, o desenho em `media/src/` (arrays em `arrays.js`, objetos em `heap.js`). Comece rodando o teste de descoberta (veja o CONTRIBUTING) para ver o formato real.
- **Pronto quando:** o conjunto aparece como caixas sem posição, entrar e sair são explicados, com testes unitários e de integração.

### 9. JavaScript no navegador

- **Issue:** [#10](https://github.com/celoramos/Code-Scope/issues/10)
- **Por quê:** o adaptador de JavaScript só foi testado no Node. O debugger do navegador (`pwa-chrome`) pode formatar os valores de outro jeito.
- **Como:** debugue uma página com script no Chrome ou no Edge pelo VS Code, com o painel aberto e o log em *Debug*, e conte (ou corrija) o que mudar.

### 10. Mais C#: lista de objetos, herança e try/catch

- **Issue:** [#11](https://github.com/celoramos/Code-Scope/issues/11)
- **Por quê:** o adaptador de C# (`src/debug/adapters/csharp.ts`) já desenha arrays, `List`, `Stack`, `Queue`, `Dictionary` e objetos, mas os conceitos mais novos (lista de objetos, polimorfismo, erro tratado, árvore de recursão) ainda não têm exemplo nem teste em C#.
- **Onde:** `samples/csharp` (uma classe por exemplo, registrada no `Program.cs` e no `launch.json`) e `test/integration/csharp.itest.ts`.
- **Pronto quando:** cada conceito tem um exemplo e um teste de integração em C#.

### 11. Coleções do C++: `std::vector`, `std::map`, `std::stack`

- **Issue:** [#12](https://github.com/celoramos/Code-Scope/issues/12)
- **Por quê:** o adaptador de C (`src/debug/adapters/c.ts`) desenha arrays e ponteiros para struct, mas com um gdb sem pretty-printers as coleções do C++ só mostram o que têm por dentro (`_M_impl`). O `samples/c/vetor.cpp` já está pronto para isso.
- **Onde:** ligar os pretty-printers do gdb (`-enable-pretty-printing` em `setupCommands`, precisa de um gdb com Python) ou ler as coleções por `evaluate` (`v.size()`, `v[i]`); o MSVC (`cppvsdbg`) mostra pelo natvis.
- **Pronto quando:** `std::vector`, `std::map` e `std::stack` aparecem desenhados, com teste de integração.

### 12. Variáveis das chamadas de baixo com arrays e objetos

- **Issue:** [#13](https://github.com/celoramos/Code-Scope/issues/13)
- **Por quê:** na pilha de chamadas, as chamadas de baixo só mostram valores simples. No merge sort, por exemplo, cada chamada tem o seu pedaço do array.
- **Onde:** `readCalls` em `src/debug/dapCollector.ts` e `renderCalls` em `media/src/calls.js`.
