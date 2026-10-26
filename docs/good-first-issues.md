# Good first issues

**English** | [Português](tarefas-para-comecar.md)

Tasks that are a good way into the project. Each one says why it matters, where to look and how to know you are done. If you want one, open an issue (or comment on the existing one) saying so, so two people do not do the same thing.

Levels: **no code** (you do not need to program), **beginner** (a few lines, one file), **intermediate** (several files, tests).

## No code

### 1. Tell us what confused you

- **Why:** the panel is for people who are learning. If something in it confused you, that is the most useful feedback the project can get.
- **How:** use the panel on your own code or on the samples, and open an issue with what you expected and what you saw. A screenshot (the "Save image" button) helps.

### 2. Review the English texts

- **Why:** the explanations were written in Portuguese and translated. A native speaker will catch what sounds unnatural.
- **Where:** `src/model/messages.ts` (explanations), `src/webview/strings.ts` (panel), `package.nls.json` (commands and settings).
- **Done when:** a pull request (or an issue listing the sentences) with clearer English, keeping the meaning.

### 3. Try the panel with a screen reader

- **Why:** the panel has labels for screen readers and passes an automated check (axe-core), but nobody has listened to it with NVDA, JAWS or VoiceOver yet. A tool cannot tell whether what is read aloud makes sense.
- **How:** step through `samples/java/BubbleSort.java` and `samples/java/ListaLigada.java` and tell us, in an issue, what is read aloud and what is missing.

### 4. Check light and high contrast themes

- **Why:** all colors come from the VS Code theme. The panel was checked in a browser with the colors of the light and high contrast themes copied in, but not yet inside VS Code with those themes on.
- **How:** switch to "Light Modern" and to "High Contrast", go through a few samples and open an issue with screenshots of anything hard to read.

## Beginner

### 5. A new sample: selection sort

- **Why:** each classic algorithm is a new lesson the panel can teach.
- **Where:** `samples/java`, `samples/javascript`, `samples/python`. Follow `BubbleSort.java` and `bubbleSort.js`. In Java, add the configuration to `samples/java/.vscode/launch.json`.
- **Done when:** the sample runs with F5, the comment says where to put the breakpoint, and the samples table in both READMEs lists it.

### 6. More samples: insertion sort, matrix sum, stack calculator

- Same as above. One sample per pull request is fine.

### 7. Record new GIFs for the README

- **Why:** the README GIFs only show arrays, stacks and queues. The call stack, the recursion tree, linked lists and the trace table have no demo yet.
- **Where:** `docs/`, referenced from `README.md` and `README.pt-br.md`.
- **Done when:** a short GIF (under 2 MB) for one of these, added to both READMEs.

## Intermediate

### 8. Python `set` and Java `HashSet`

- **Why:** sets are the one common collection the panel does not draw yet.
- **Where:** the adapters in `src/debug/adapters/`, a new kind in `src/model/snapshot.ts`, the drawing in `media/src/` (arrays in `arrays.js`, objects in `heap.js`). Start by running the discovery test (see CONTRIBUTING) to see the real format.
- **Done when:** a set is drawn as boxes without positions, adding and removing are explained, with unit and integration tests.

### 9. JavaScript in the browser

- **Why:** the JavaScript adapter was only tested on Node. The browser debugger (`pwa-chrome`) may format values differently.
- **How:** debug a page with a script in Chrome or Edge from VS Code, with the Code Scope panel open and the log at *Debug*, and report (or fix) what is different.

### 10. More C#: lists of objects, inheritance and try/catch

- **Why:** the C# adapter (`src/debug/adapters/csharp.ts`) already draws arrays, `List`, `Stack`, `Queue`, `Dictionary` and objects, but the newer concepts (list of objects, polymorphism, handled errors, recursion tree) have no C# sample or test yet.
- **Where:** `samples/csharp` (one class per sample, registered in `Program.cs` and `launch.json`) and `test/integration/csharp.itest.ts`.
- **Done when:** each concept has a C# sample and an integration test.

### 11. C++ containers: `std::vector`, `std::map`, `std::stack`

- **Why:** the C adapter (`src/debug/adapters/c.ts`) draws arrays and pointers to structs, but with gdb without pretty-printers the C++ containers only show their internals (`_M_impl`). `samples/c/vetor.cpp` is ready for this.
- **Where:** either enable gdb pretty-printers (`-enable-pretty-printing` in `setupCommands`, needs a gdb with Python) or read the containers through `evaluate` (`v.size()`, `v[i]`); MSVC (`cppvsdbg`) shows them through natvis.
- **Done when:** `std::vector`, `std::map` and `std::stack` are drawn, with an integration test.

### 12. Variables of earlier calls with arrays and objects

- **Why:** in the call stack, calls below the current one show only simple values. In merge sort, for example, each call has its own piece of the array.
- **Where:** `readCalls` in `src/debug/dapCollector.ts` and `renderCalls` in `media/src/calls.js`.
