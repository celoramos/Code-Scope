# Contributing to Code Scope

**English** | [Português](CONTRIBUTING.pt-br.md)

Code Scope exists to help people who are learning to program see what their code does. Any contribution that makes that clearer is welcome: code, a new sample in `samples/`, a better explanation sentence, a README fix, a bug report.

You do not need to be experienced to help. If you are learning and something in the panel confused you, opening an issue about it is already a valuable contribution: it is exactly the kind of feedback the project needs.

## Before you start

- Check the [issues](https://github.com/celoramos/Code-Scope/issues) to see if the subject is already being discussed.
- For big changes (a new data structure, another language), open an issue first so we can agree on the approach.
- Good places to start: the list of [good first issues](docs/good-first-issues.md), with what to do, where to look and how to know you are done.
- You can write in English or Portuguese, in issues, pull requests, comments and commit messages.

## Setting up

You need Node.js 22 or newer and VS Code. For the Java integration tests, also a JDK (the tests use 21).

```bash
git clone https://github.com/celoramos/Code-Scope.git
cd Code-Scope
npm install
```

Open the folder in VS Code and press **F5**. A second VS Code window opens with the extension loaded and the Java, JavaScript and Python samples open. To debug Java, install the Extension Pack for Java (`vscjava.vscode-java-pack`); for Python, the Python extension (`ms-python.python`).

## Checking your change

Run before opening the pull request:

```bash
npm run compile            # type-checks (extension and panel) and builds dist/
npm test                   # unit tests, fast
npm run test:integration   # debugs the Java, JavaScript and Python samples with the real debuggers
```

To run only part of the integration tests, set `CODE_SCOPE_GREP` to part of the test name, or a regular expression (`CODE_SCOPE_GREP=JavaScript npm run test:integration`, `CODE_SCOPE_GREP="JavaScript|Python"`). `CODE_SCOPE_EXTENSIONS` replaces the list of extensions installed in the test VS Code (comma separated; empty installs none), and `CODE_SCOPE_VSCODE` picks its version (default `stable`).

The integration test downloads an isolated VS Code into `.vscode-test/` the first time and takes a few minutes. The Python tests need an interpreter; the README (Tests section) explains how to use a portable Python without installing anything. It does not touch your VS Code. CI runs all three on every pull request.

If you changed something visual, check it in VS Code with a light theme and a dark one, and with animations off (`codeScope.animationSpeed: desligada`).

## Where things live

| Folder | What it has |
|---|---|
| `src/debug` | Talks to the debugger through the Debug Adapter Protocol. `adapters/` has one file per language (`java.ts`, `javascript.ts`, `python.ts`), the generic mode (`generic.ts`), the shared interface (`adapter.ts`) and the registry that picks the adapter (`index.ts`). `dapCollector.ts` builds each step; `heapCollector.ts` reads objects; `conditionEval.ts` asks the program for the value of each part of a condition; `pauseOnErrors.ts` turns on pausing on uncaught exceptions. |
| `src/model` | The language-neutral model: `Snapshot`, step diff, history, arrows, explanation texts, and one module per concept: `calls.ts` and `callTree.ts` (call stack and call tree), `heap.ts` and `heapIdentity.ts` (objects, linked lists, trees), `graph.ts`, `classes.ts` (inheritance), `errors.ts` (errors and try/catch), `condition.ts`, `focus.ts` (comparisons and search range), `scope.ts`, `text.ts`, `numbers.ts`, `predict.ts` (guess mode), `trace.ts` (trace table). It imports nothing from VS Code. |
| `src/core` | `collectStep.ts`: one debugger stop turned into a `Snapshot`, shared by the VS Code extension and the JetBrains plugin. |
| `src/host` | `standalone.ts`: the panel, model and collector bundled for the JetBrains plugin, talking to the IDE through `bridge.ts`. |
| `src/webview` | The panel provider, the message protocol between extension and panel, and the panel texts (`strings.ts`). |
| `jetbrains` | The IntelliJ plugin in Kotlin. `JavaDap.kt` reads the JVM through JDI and answers `threads`, `stackTrace`, `scopes`, `variables`, `evaluate` and `exceptionInfo` in the format of VS Code's Java Debugger, so `src/debug/adapters/java.ts` works unchanged. `bundle-panel.ts` builds the panel HTML the plugin loads. Build with `./gradlew buildPlugin`; try it with `./gradlew runIde`. |
| `media` | The panel's HTML, CSS and JS, no framework. |
| `samples` | Samples per language, each folder with its `launch.json`, and `exemplos.code-workspace`, which opens them all. |
| `test` | Unit tests (`*.test.ts`) and integration tests (`test/integration`). |

The most important rule of the architecture: **nothing about the debugger's format leaves `src/debug`**. The rest of the project only knows the `Snapshot`. That is what lets it support other languages without rewriting the panel.

## Recipes

### Add a sample

1. Create the file in the language folder under `samples/`, with a comment saying where to put the breakpoint.
2. In Java, add a configuration with the same name to `samples/java/.vscode/launch.json`. In JavaScript and Python the "Arquivo aberto" configuration already works.
3. Add the sample to the table in both READMEs (`README.md` and `README.pt-br.md`).

### Improve an explanation

The sentences live in `src/model/messages.ts`, in Portuguese and English side by side. The panel texts live in `src/webview/strings.ts`, and the command and setting texts in `package.nls.json` (English) and `package.nls.pt-br.json`. Changed a sentence? Change it in both languages. Each sentence has a test (`test/explain.test.ts`, `test/flow.test.ts`, `test/i18n.test.ts` and others); update the test too. Write for someone seeing code for the first time: short sentences, no jargon the student does not know yet.

### Support a new data structure

1. Run the integration test with a sample that uses the structure and look at `out-test/<Sample>.json` to see what the debugger returns (the `probe` part). To see everything, including the whole call stack and objects opened three levels deep, add the sample to `test/integration/discover.itest.ts` and run with `CODE_SCOPE_DISCOVER=1 CODE_SCOPE_GREP=Descoberta`: the result goes to `out-test/discover-*.json`.
2. Teach the language adapter (`src/debug/adapters/`) to recognize the format in `shape()`; `dapCollector.ts` turns it into the `Snapshot`.
3. If the `Snapshot` cannot hold the structure, extend the model in `src/model/snapshot.ts` without putting anything language-specific in it.
4. Cover the diff and the text in `test/`, and add a case to the integration test.

### Support another language

With no work at all, the language already uses the generic mode. To give it its own adapter:

1. Debug a short program in the language with the panel open and the **Output > Code Scope** channel at the *Debug* level: the `scopes` and `locals` lines show the debugger's format. The discovery test above shows even more.
2. Create `src/debug/adapters/<language>.ts` implementing `LanguageAdapter` (see `adapter.ts`). The comment at the top should list the observed formats, as in `java.ts` and `javascript.ts`.
3. Register the adapter in `ADAPTERS`, in `src/debug/adapters/index.ts`, with the session types (`session.type`) and file extensions.
4. If the language has its own stacks and queues, implement `collectionRole` by looking at the methods used in the code (`methodsCalledOn` helps).
5. Cover the adapter in `test/adapters.test.ts` with real debugger values and, if you can, add samples in `samples/` and an integration test.

The model, the history and the panel do not change.

## Style

- Comments and commit messages in Portuguese or English. Panel texts and explanations always in both languages.
- Comments explain why, not what the line does.
- In the panel, no color is written directly in CSS outside the `:root` block: everything comes from the VS Code theme, so it works in any theme and in high contrast.
- Every movement respects `prefers-reduced-motion` and the speed setting.
- No emojis in the interface, the docs or the commits.
- Commit messages in the `type: description` format (`feat`, `fix`, `docs`, `style`, `test`, `chore`).

## Pull requests

- One subject per pull request.
- Describe what changed and how you tested it. If you changed something visual, a screenshot of the panel helps a lot (the panel's "Save image" button makes one).
- New tests for new behavior.

By contributing, you agree that your contribution is licensed under the project's [MIT license](LICENSE), and you commit to following the [code of conduct](CODE_OF_CONDUCT.md).
