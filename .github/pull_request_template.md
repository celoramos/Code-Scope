## O que muda / What changes

<!-- Descreva a mudança e o motivo. Se fecha uma issue, escreva "Fecha #número". -->
<!-- Describe the change and why. If it closes an issue, write "Closes #number". -->

## Como testei / How I tested

- [ ] `npm run compile`
- [ ] `npm test`
- [ ] `npm run test:integration` (se mexeu em `src/debug` ou no comportamento com o debugger / if you changed `src/debug` or how the extension talks to the debugger)
- [ ] `cd jetbrains && ./gradlew buildPlugin` (se mexeu em `jetbrains/`, `src/core`, `src/host` ou em `src/debug/adapters/java.ts` / if you changed any of those)
- [ ] Abri o painel no VS Code com F5 e conferi em tema claro e escuro / Opened the panel in VS Code with F5 and checked it in a light and a dark theme (se mudou algo visual / if something visual changed)

<!-- Se mudou algo visual, uma imagem do painel ajuda bastante (botão "Salvar imagem"). -->
<!-- If something visual changed, an image of the panel helps a lot ("Save image" button). -->
