# Como contribuir com o Code Scope

O Code Scope existe para ajudar quem está entrando na programação a enxergar o que o código faz. Toda contribuição que deixa isso mais claro é bem-vinda: código, um exemplo novo em `samples/`, uma frase de explicação melhor, uma correção no README, um relato de bug.

Você não precisa ser experiente para ajudar. Se está aprendendo e alguma coisa no painel te confundiu, abrir uma issue contando isso já é uma contribuição valiosa: é exatamente o tipo de retorno que o projeto precisa.

## Antes de começar

- Procure nas [issues](https://github.com/celoramos/Code-Scope/issues) se o assunto já está sendo discutido.
- Para mudanças grandes (uma estrutura de dados nova, outra linguagem), abra uma issue antes para combinar o caminho.
- Bons pontos de partida: um exemplo novo em `samples/java`, uma frase de explicação mais clara, ou um item do roadmap no README.

## Preparando o ambiente

Você precisa de Node.js 20 ou mais novo, VS Code e um JDK (os testes usam o 21).

```bash
git clone https://github.com/celoramos/Code-Scope.git
cd Code-Scope
npm install
```

Abra a pasta no VS Code e aperte **F5**. Uma segunda janela do VS Code abre com a extensão carregada e a pasta `samples/java` aberta. Instale nela o Extension Pack for Java (`vscjava.vscode-java-pack`) se ainda não tiver.

## Verificando sua mudança

Rode antes de abrir o pull request:

```bash
npm run compile            # checa os tipos (extensão e painel) e gera dist/
npm test                   # testes unitários, rápidos
npm run test:integration   # debuga os samples com o Java Debugger real
```

O teste de integração baixa um VS Code isolado em `.vscode-test/` na primeira vez e leva alguns minutos. Ele não mexe no seu VS Code. O CI roda os três a cada pull request.

Se mudou algo visual, teste no VS Code com um tema claro e um escuro, e com animações desligadas (`codeScope.animationSpeed: desligada`).

## Onde fica cada coisa

| Pasta | O que tem |
|---|---|
| `src/debug` | Conversa com o debugger pelo Debug Adapter Protocol. O que é específico do Java fica em `javaAdapter.ts` (formato das respostas do debugger) e `javaSource.ts` (o que só o código-fonte diz, como uma coleção ser usada como pilha ou fila). |
| `src/model` | O modelo neutro de linguagem: `Snapshot`, diff entre passos, histórico, setas, textos explicativos. Não importa nada do VS Code. |
| `src/webview` | O provider do painel e o protocolo de mensagens entre extensão e painel. |
| `media` | HTML, CSS e JS do painel, sem framework. |
| `samples/java` | Programas de exemplo com `launch.json`. |
| `test` | Testes unitários (`*.test.ts`) e de integração (`test/integration`). |

A regra mais importante da arquitetura: **nada do formato do debugger sai de `src/debug`**. O resto do projeto só conhece o `Snapshot`. É isso que permite suportar outras linguagens sem reescrever o painel.

## Receitas

### Adicionar um exemplo

1. Crie o arquivo em `samples/java/`, com um comentário indicando onde pôr o breakpoint.
2. Adicione uma configuração com o mesmo nome em `samples/java/.vscode/launch.json`.
3. Inclua o exemplo na tabela do README.

### Melhorar um texto explicativo

As frases ficam em `src/model/explain.ts` (o que mudou) e `src/model/flow.ts` (o caminho do programa). Cada frase tem teste em `test/explain.test.ts` ou `test/flow.test.ts`; atualize o teste junto. Escreva para quem está vendo código pela primeira vez: frases curtas, sem jargão que o aluno ainda não conhece.

### Suportar uma estrutura de dados nova

1. Rode o teste de integração com um exemplo que use a estrutura e veja em `out-test/<Exemplo>.json` o que o debugger devolve (a parte `probe`).
2. Ensine o `javaAdapter.ts` a reconhecer o formato, e o `dapCollector.ts` a convertê-lo para o `Snapshot`.
3. Se o `Snapshot` não comportar a estrutura, estenda o modelo em `src/model/snapshot.ts` sem colocar nada específico do Java nele.
4. Cubra o diff e o texto em `test/`, e adicione um caso no teste de integração.

### Suportar outra linguagem

Escreva um adaptador equivalente ao `javaAdapter.ts` para o debugger da linguagem. Hoje o `dapCollector.ts` usa sempre o adaptador Java; a primeira linguagem nova vai precisar escolher o adaptador pelo `session.type` da sessão de debug. O modelo, o histórico e o painel não precisam mudar. A explicação de fluxo (`flow.ts`) entende sintaxe no estilo de C; Python precisaria de regras próprias.

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
