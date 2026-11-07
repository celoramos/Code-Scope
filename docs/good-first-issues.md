# Good first issues

**English** | [Português](tarefas-para-comecar.md)

Tasks that are a good way into the project. Each one says why it matters, where to look and how to know you are done. If you want one, comment on its issue (linked under each task) saying so, so two people do not do the same thing.

Levels: **no code** (you do not need to program), **beginner** (a few lines, one file), **intermediate** (several files, tests).

## No code

### 1. Tell us what confused you

- **Issue:** [#2](https://github.com/celoramos/Code-Scope/issues/2)
- **Why:** the panel is for people who are learning. If something in it confused you, that is the most useful feedback the project can get.
- **How:** use the panel on your own code or on the samples, and open an issue with what you expected and what you saw. A screenshot (the "Save image" button) helps.

### 2. Review the English texts

- **Issue:** [#3](https://github.com/celoramos/Code-Scope/issues/3)
- **Why:** the explanations were written in Portuguese and translated. A native speaker will catch what sounds unnatural.
- **Where:** `src/model/messages.ts` (explanations), `src/webview/strings.ts` (panel), `package.nls.json` (commands and settings).
- **Done when:** a pull request (or an issue listing the sentences) with clearer English, keeping the meaning.

### 3. Try the panel with a screen reader

- **Issue:** [#4](https://github.com/celoramos/Code-Scope/issues/4)
- **Why:** the panel has labels for screen readers and passes an automated check (axe-core), but nobody has listened to it with NVDA, JAWS or VoiceOver yet. A tool cannot tell whether what is read aloud makes sense.
- **How:** step through `samples/java/BubbleSort.java` and `samples/java/ListaLigada.java` and tell us, in an issue, what is read aloud and what is missing.

### 4. Check other color themes

- **Issue:** [#5](https://github.com/celoramos/Code-Scope/issues/5)
- **Why:** all colors come from the VS Code theme. The built-in dark, light and high contrast themes were checked inside VS Code with the JavaScript samples. Popular themes from the Marketplace (Solarized, Monokai, One Dark, GitHub) were not.
- **How:** install one of those themes, go through a few samples in Java or Python and open an issue with screenshots of anything hard to read.

## Beginner

### 5. Record new GIFs for the README

- **Issue:** [#8](https://github.com/celoramos/Code-Scope/issues/8)
- **Why:** the README shows arrays, stacks, queues, recursion, errors, graphs and objects. The call stack, linked lists, the trace table, exercises and priority queues have no demo yet.
- **Where:** `docs/`, referenced from `README.md` and `README.pt-br.md`.
- **Done when:** a short GIF (under 2 MB) for one of these, added to both READMEs.

## Intermediate

### 6. JavaScript in the browser

- **Issue:** [#10](https://github.com/celoramos/Code-Scope/issues/10)
- **Why:** the JavaScript adapter was only tested on Node. The browser debugger (`pwa-chrome`) may format values differently.
- **How:** debug a page with a script in Chrome or Edge from VS Code, with the Code Scope panel open and the log at *Debug*, and report (or fix) what is different.
