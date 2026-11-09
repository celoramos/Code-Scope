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

### 5. Gravar GIFs novos para o README

- **Issue:** [#8](https://github.com/celoramos/Code-Scope/issues/8)
- **Por quê:** o README mostra arrays, pilhas, filas, recursão, erros, grafos e objetos. A pilha de chamadas, as listas ligadas, o teste de mesa, os exercícios e as filas de prioridade ainda não têm demonstração.
- **Onde:** `docs/`, usados no `README.md` e no `README.pt-br.md`.
- **Pronto quando:** um GIF curto (menos de 2 MB) de um desses, nos dois READMEs.
