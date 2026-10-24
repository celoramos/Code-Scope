# Como contribuir com o Code Scope

O Code Scope existe para ajudar quem está entrando na programação a enxergar o que o código faz. Toda contribuição que deixa isso mais claro é bem-vinda: código, um exemplo novo em `samples/`, uma frase de explicação melhor, uma correção no README, um relato de bug.

Você não precisa ser experiente para ajudar. Se está aprendendo e alguma coisa no painel te confundiu, abrir uma issue contando isso já é uma contribuição valiosa: é exatamente o tipo de retorno que o projeto precisa.

## Antes de começar

- Procure nas [issues](https://github.com/celoramos/Code-Scope/issues) se o assunto já está sendo discutido.
- Para mudanças grandes (uma estrutura de dados nova, outra linguagem), abra uma issue antes para combinar o caminho.
- Bons pontos de partida: um exemplo novo em `samples/java`, uma frase de explicação mais clara, ou um item do roadmap no README.

## Preparando o ambiente

Você precisa de Node.js 22 ou mais novo e VS Code. Para os testes de integração do Java, também de um JDK (os testes usam o 21).

```bash
git clone https://github.com/celoramos/Code-Scope.git
cd Code-Scope
npm install
```

Abra a pasta no VS Code e aperte **F5**. Uma segunda janela do VS Code abre com a extensão carregada e os exemplos de Java, JavaScript e Python abertos. Para debugar Java, instale o Extension Pack for Java (`vscjava.vscode-java-pack`); para Python, a extensão Python (`ms-python.python`).

## Verificando sua mudança

Rode antes de abrir o pull request:

```bash
npm run compile            # checa os tipos (extensão e painel) e gera dist/
npm test                   # testes unitários, rápidos
npm run test:integration   # debuga os exemplos de Java, JavaScript e Python com os debuggers reais
```

Para rodar só parte dos testes de integração, use `CODE_SCOPE_GREP` com um pedaço do nome (`CODE_SCOPE_GREP=JavaScript npm run test:integration`).

O teste de integração baixa um VS Code isolado em `.vscode-test/` na primeira vez e leva alguns minutos. Os testes de Python precisam de um interpretador; o README (seção Testes) explica como usar um Python portátil, sem instalar nada. Ele não mexe no seu VS Code. O CI roda os três a cada pull request.

Se mudou algo visual, teste no VS Code com um tema claro e um escuro, e com animações desligadas (`codeScope.animationSpeed: desligada`).

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `src/debug` | Conversa com o debugger pelo Debug Adapter Protocol. Em `adapters/` fica um arquivo por linguagem (`java.ts`, `javascript.ts`, `python.ts`), o modo genérico (`generic.ts`), a interface comum (`adapter.ts`) e o registro que escolhe o adaptador (`index.ts`). `dapCollector.ts` monta o passo; `heapCollector.ts` lê os objetos; `conditionEval.ts` pergunta ao programa o valor de cada parte de uma condição; `pauseOnErrors.ts` liga a pausa nas exceções não tratadas. |
| `src/model` | O modelo neutro de linguagem: `Snapshot`, diff entre passos, histórico, setas, textos explicativos, e um módulo por conceito: `calls.ts` (pilha de chamadas), `heap.ts` e `heapIdentity.ts` (objetos, listas ligadas, árvores), `errors.ts`, `condition.ts`, `focus.ts` (comparações e intervalo de busca), `scope.ts`, `trace.ts` (teste de mesa). Não importa nada do VS Code. |
| `src/webview` | O provider do painel e o protocolo de mensagens entre extensão e painel. |
| `media` | HTML, CSS e JS do painel, sem framework. |
| `samples` | Exemplos por linguagem, cada pasta com o seu `launch.json`, e `exemplos.code-workspace` que abre todas juntas. |
| `test` | Testes unitários (`*.test.ts`) e de integração (`test/integration`). |

A regra mais importante da arquitetura: **nada do formato do debugger sai de `src/debug`**. O resto do projeto só conhece o `Snapshot`. É isso que permite suportar outras linguagens sem reescrever o painel.

## Receitas

### Adicionar um exemplo

1. Crie o arquivo na pasta da linguagem em `samples/`, com um comentário indicando onde pôr o breakpoint.
2. No Java, adicione uma configuração com o mesmo nome em `samples/java/.vscode/launch.json`. Em JavaScript e Python a configuração "Arquivo aberto" já serve.
3. Inclua o exemplo na tabela dos dois READMEs (`README.md` e `README.pt-br.md`).

### Melhorar um texto explicativo

As frases ficam em `src/model/messages.ts`, em português e em inglês lado a lado; `src/model/explain.ts` (o que mudou) e `src/model/flow.ts` (o caminho do programa) escolhem qual usar. Os textos do painel ficam em `src/webview/strings.ts`, e os de comandos e configurações em `package.nls.json` (inglês) e `package.nls.pt-br.json`. Mudou uma frase? Mude nos dois idiomas. Cada frase tem teste em `test/explain.test.ts`, `test/flow.test.ts` ou `test/i18n.test.ts`; atualize o teste junto. Escreva para quem está vendo código pela primeira vez: frases curtas, sem jargão que o aluno ainda não conhece.

### Suportar uma estrutura de dados nova

1. Rode o teste de integração com um exemplo que use a estrutura e veja em `out-test/<Exemplo>.json` o que o debugger devolve (a parte `probe`). Para ver tudo, inclusive a pilha de chamadas inteira e objetos abertos em três níveis, acrescente o exemplo em `test/integration/discover.itest.ts` e rode com `CODE_SCOPE_DISCOVER=1 CODE_SCOPE_GREP=Descoberta`: o resultado fica em `out-test/discover-*.json`.
2. Ensine o adaptador da linguagem (`src/debug/adapters/`) a reconhecer o formato no `shape()`; o `dapCollector.ts` converte para o `Snapshot`.
3. Se o `Snapshot` não comportar a estrutura, estenda o modelo em `src/model/snapshot.ts` sem colocar nada específico de uma linguagem nele.
4. Cubra o diff e o texto em `test/`, e adicione um caso no teste de integração.

### Suportar outra linguagem

Sem fazer nada, a linguagem já usa o modo genérico. Para ela ganhar um adaptador próprio:

1. Debugue um programa curto na linguagem com o painel aberto e o canal **Output > Code Scope** no nível *Debug*: as linhas `scopes` e `locals` mostram o formato que o debugger usa.
2. Crie `src/debug/adapters/<linguagem>.ts` implementando `LanguageAdapter` (veja `adapter.ts`). O comentário no topo deve listar os formatos observados, como em `java.ts` e `javascript.ts`.
3. Registre o adaptador em `ADAPTERS`, no `src/debug/adapters/index.ts`, com os tipos de sessão (`session.type`) e as extensões de arquivo.
4. Se a linguagem tiver pilha e fila próprias, implemente `collectionRole` olhando os métodos usados no código (`methodsCalledOn` ajuda).
5. Cubra o adaptador em `test/adapters.test.ts` com valores reais do debugger e, se der, crie exemplos em `samples/` e um teste de integração.

O modelo, o histórico e o painel não mudam. A explicação de fluxo (`flow.ts`) entende `if`, `for` e `while` no começo da linha, então serve para a maioria das linguagens.

## Estilo

- Código, comentários, textos do painel e mensagens de commit em português.
- Comentários explicam o porquê, não o que a linha faz.
- No painel, nenhuma cor escrita direto no CSS fora do bloco `:root`: tudo vem do tema do VS Code, para funcionar em qualquer tema e em alto contraste.
- Todo movimento respeita `prefers-reduced-motion` e a configuração de velocidade.
- Sem emojis na interface, na documentação e nos commits.
- Mensagens de commit no formato `tipo: descrição` (`feat`, `fix`, `docs`, `style`, `test`, `chore`).

## Pull requests

- Um assunto por pull request.
- Descreva o que mudou e como testou. Se mudou algo visual, uma captura do painel ajuda muito.
- Testes novos para comportamento novo.

Ao contribuir, você concorda que sua contribuição é licenciada sob a [licença MIT](LICENSE) do projeto, e se compromete a seguir o [código de conduta](CODE_OF_CONDUCT.md).
