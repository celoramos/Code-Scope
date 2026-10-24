# Code Scope

**English** | [Português](README.pt-br.md)

A VS Code extension that shows your code running, visually, for people learning to program. Free and open source ([MIT](LICENSE)).

Everything happens inside VS Code: the panel sits in the sidebar, next to your code, and uses your theme's colors. It opens no browser, needs no account and sends nothing to the internet.

While you debug, a side panel draws your local variables: arrays, matrices, lists, stacks and queues. Think of it as someone drawing your program on a whiteboard. It works with Java, JavaScript, TypeScript and Python, and with any other language that has a debugger in VS Code (see [Languages](#languages)). On every F10 the panel animates what changed and explains what happened:

- the changed box flashes and stays highlighted;
- a swap shows the two boxes crossing over, even when the code uses a `temp` variable and takes two steps;
- `i`, `j`, `inicio` and `fim` become colored arrows that slide under the boxes;
- in a list, a new item appears and the ones after it make room; an item that leaves goes away and its neighbors close the gap;
- in a stack, a pushed item drops onto the top of the tower and a popped one rises and fades, with the "top" label following along;
- in a queue, items enter from the right of the conveyor belt and the one in front leaves on the left;
- in a matrix, the row and column the code reads are highlighted and the cell where they cross gets an outline;
- the text says what changed and which path the program took: "numeros[0] and numeros[1] swapped places", "the condition on line 8 was false: the program skipped the if block", "end of one loop iteration".

> **Language of the panel:** the explanations and the panel text are in Portuguese for now. English is on the way, and the panel will follow the language of your VS Code.

![Code Scope stepping through BubbleSort](docs/demo.gif)

| Stack | Queue |
|---|---|
| ![Stack of plates: push and pop at the top](docs/pilha.gif) | ![Bank line: enter at the back, leave at the front](docs/fila.gif) |

| Matrix | List |
|---|---|
| ![Matrix with row i and column j highlighted](docs/matriz.png) | ![ArrayList receiving an item in the middle](docs/lista.png) |

*Panel captures made with data from real Java Debugger sessions.*

## Languages

Code Scope talks to the debugger through the **Debug Adapter Protocol**, the protocol VS Code uses with every debugger. Each debugger formats values its own way, so each language has an adapter that translates that text for the panel. Languages without their own adapter use the generic mode.

| Language | Debugger | Structures | Status |
|---|---|---|---|
| Java | Debugger for Java (`vscjava.vscode-java-debug`) | arrays, matrices, `ArrayList`, `Stack`, `Queue`, `ArrayDeque` | validated with the real debugger |
| JavaScript and TypeScript | the one built into VS Code (Node, Chrome, Edge) | arrays, matrices, stack (`push`/`pop`), queue (`push`/`shift`) | validated with the real debugger on Node; the browser uses the same adapter, not tested yet |
| Python | Python Debugger (`ms-python.debugpy`) | `list`, `tuple`, `deque`, matrices, stack (`append`/`pop()`), queue (`pop(0)`/`popleft()`) | validated with the real debugger |
| Others (C#, C/C++, Go, Rust, PHP...) | any VS Code debugger | collections the debugger marks as indexed, integers and simple values | generic mode: shows what the protocol guarantees and leaves out what it does not understand |

The flow explanations (if, loops, break) understand the C family (Java, JavaScript, C#, C, Go) and Python. If the panel does not recognize something in your language, open an [issue](https://github.com/celoramos/Code-Scope/issues/new/choose) with the log (see below): that is how a new adapter starts.

## What the panel shows

| Part | What it shows |
|---|---|
| Timeline | "Step 7 of 13", previous and next buttons, and a slider to jump to any step. Reviewing the history does not rewind the program. |
| Code | The line that just ran and the next one, in the same color the editor uses for the stopped line. |
| Explanation | One sentence per change, plus the path the program took (if, loop, break). Can be turned off. |
| Variables | Integers, strings, booleans, characters and decimal numbers. Integers that become arrows take the arrow's color. |
| Structures | Arrays, matrices, lists, stacks and queues. Stacks and queues are recognized by how the code uses the collection. |

## Requirements

- VS Code 1.90 or newer
- The debugger for your language:
  - Java: **Extension Pack for Java** (`code --install-extension vscjava.vscode-java-pack`) and a JDK
  - JavaScript and TypeScript: Node.js 22 or newer; the debugger ships with VS Code. With Node.js 20 the VS Code debugger (js-debug 1.140) runs the program without stopping at breakpoints
  - Python: the **Python** extension (`code --install-extension ms-python.python`), which brings debugpy, and Python installed

## Install

Download `code-scope.vsix` from the latest CI run (the repository's **Actions** tab, artifact `code-scope-vsix`) or build your own:

```bash
npm install
npm run vsix
code --install-extension code-scope.vsix
```

## Run from source

```bash
git clone https://github.com/celoramos/Code-Scope.git
cd Code-Scope
npm install
```

Open the folder in VS Code and press **F5**. The "Rodar extensão" configuration builds the project and opens a second window, the *Extension Development Host*, with the Java, JavaScript and Python samples already open (`samples/exemplos.code-workspace`).

While developing, `npm run watch` rebuilds on every change; reload the test window with `Ctrl+R`.

## Trying the samples

In the Extension Development Host window:

1. Open one of the samples and set a breakpoint on the line its comment points to.
2. In the **Run and Debug** tab, pick the configuration and press F5. In Java, each sample has a configuration with the same name; in JavaScript and Python, use "Arquivo aberto". The Code Scope panel opens by itself on the first stop.
3. Step with **F10** (step over) and watch the panel.

| Sample | What to look for |
|---|---|
| `java/BubbleSort.java` | Arrows `i` and `j`; swaps done with `temp` shown as boxes crossing over; true and false ifs |
| `java/BuscaLinear.java` | Linear search: arrow `i` walking the array; `alvo` holds a value, so it does not become an arrow; the break ending the loop |
| `java/InverterArray.java` | Reversing an array: arrows `inicio` and `fim` closing in while the ends swap |
| `java/Palindromo.java` | `char[]` in single quotes; the boolean `ehPalindromo` among the variables |
| `java/Matriz.java` | 2 by 3 grid with row `i` and column `j` highlighted, cell by cell |
| `java/ListaDeCompras.java` | Shopping list: starts empty, items added at the end and in the middle, an item removed from the front |
| `java/Pilha.java` | Stack of plates: `push` on top, `peek` that only looks, `pop` that removes the last one in |
| `java/Fila.java` | Bank line: customers join at the back and are served from the front |
| `java/Parenteses.java` | Classic stack use: checking whether `{[()]}` is balanced by pushing every opening bracket |
| `javascript/bubbleSort.js` | The same BubbleSort in JavaScript, with `let` and `const` inside the loops |
| `javascript/pilha.js` | Undo history: an array used with `push` and `pop` becomes a stack |
| `javascript/fila.js` | Printer queue: an array used with `push` and `shift` becomes a queue |
| `python/bubble_sort.py` | BubbleSort in Python; the swap `a, b = b, a` happens in a single step |
| `python/pilha.py` | Browser back button: `append` and `pop()` on a list |
| `python/fila.py` | Snack bar orders: `deque` with `append` and `popleft()` |

With the panel focused: left and right arrows move one step, Home and End jump to the first and last.

If the panel does not show what you expected, open **Output**, pick **Code Scope** and set the level to *Debug*. The channel logs which adapter was used, each snapshot and what the debugger returned.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `codeScope.beginnerMode` | `true` | Shows the sentence explaining each step |
| `codeScope.animationSpeed` | `normal` | `lenta` (slow), `normal`, `rapida` (fast) or `desligada` (off). If the system asks for reduced motion, animations are off regardless |
| `codeScope.maxElements` | `50` | How many positions of each array, list or matrix row are read |
| `codeScope.valueNames` | `temp`, `aux`, `alvo`, `soma`... | Integers with these names hold a value, not a position, and do not become arrows |
| `codeScope.revealOnDebug` | `true` | Opens the panel on the first stop of each debug session |

Commands in the palette: **Code Scope: Mostrar painel** (show panel) and **Code Scope: Limpar histórico** (clear history).

## How it works

```
language debugger -- "stopped" event --> trackerFactory
                                              |
       stackTrace, scopes, variables  <------ dapCollector (customRequest)
                                              |  the language adapter translates
                                              |  "int[5]@10", "(5) [5, 1, 4]", "[5, 1, 4]"...
                                              v
                   Snapshot { line, code, arrays, pointers, scalars }
                                              |
        History --> diff + explain + flow + arrows --> Frame
                                              | postMessage
                                              v
                             Webview (plain HTML, CSS and JS)
```

| Folder | Responsibility |
|---|---|
| `src/debug` | Speaks the Debug Adapter Protocol. `adapters/` has one adapter per language plus the generic mode; it is the only part that knows each debugger's format. |
| `src/model` | `Snapshot`, step diff, history, arrows, matrix row and column, explanation text. Does not depend on VS Code, DAP or the language. |
| `src/webview` | The panel's `WebviewViewProvider` and the message protocol. |
| `media` | The panel's HTML, CSS and JS. Colors, fonts and borders come from the VS Code theme. |
| `samples` | Samples in Java, JavaScript and Python, with a ready `launch.json`. |
| `test` | Unit tests (mocha) and integration tests with real debuggers. |

## Tests

| Command | What it does |
|---|---|
| `npm test` | Unit tests for the model, adapters and collector, with responses recorded from the real debuggers |
| `npm run test:integration` | Downloads an isolated VS Code into `.vscode-test/`, installs the Java Extension Pack and the Python Debugger in it, and really debugs the Java, JavaScript and Python samples. Your VS Code is not touched. Takes a few minutes the first time |

CI runs both on every push and publishes the `.vsix` as an artifact.

The Python tests need an interpreter. Point to one with the `CODE_SCOPE_PYTHON` variable or, without installing anything, unzip the *Windows embeddable package* from python.org into `.vscode-test/python` and rename the `python3XX._pth` file that comes with it. Without an interpreter, they are skipped with a warning.

## Known limits

- Reads only the local variables of the current function; object fields and earlier calls on the stack do not show up yet.
- In generic mode, only collections the debugger marks as indexed, or whose size is written in the value, show up.
- Matrices with three or more dimensions show the third level as text.
- A list that gains or loses more than one item in a single step shows as resized, without the slide animation.
- Outside matrices, an integer becomes an arrow by its value: any integer that fits the indexes points to a box, unless its name is in `codeScope.valueNames`.
- Stacks and queues are recognized by variable name, reading the whole file: the methods used (`push`, `poll`, `popleft`...) are added up from every place. Two variables with the same name used in different ways in the same file can be classified wrong.
- If you use F5 (continue) between breakpoints instead of F10, the panel shows the accumulated difference between the two stops, and the "ran" line is the previous breakpoint's.

## Roadmap

1. English panel and explanations, following the VS Code language
2. Python `dict`
3. `HashMap`, `HashSet` and JavaScript objects
4. Recursion, with the call stack
5. Stack vs heap, with reference arrows between objects
6. Linked list drawn as nodes and arrows
7. Dedicated adapters for C#, C/C++ and Go

## Contributing

Code Scope is open source to help as many people as possible get into programming, and to help those already in it understand their own code better. You can help even if you are just starting:

- report what confused you in the panel by opening an [issue](https://github.com/celoramos/Code-Scope/issues/new/choose);
- write a new sample in `samples/`, in any language;
- improve an explanation sentence;
- write the adapter for your favorite language;
- implement a roadmap item.

The [contributing guide](CONTRIBUTING.md) (in Portuguese) explains how to set up the environment, run the tests and where each part of the code lives. All participation follows the [code of conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE). You may use, study, modify and distribute it, including in classes and courses.
