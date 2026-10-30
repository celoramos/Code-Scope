# Code Scope

**English** | [Português](README.pt-br.md)

Shows your code running, visually, for people learning to program. While you debug, a side panel draws your program and explains each step. Free and open source ([MIT](LICENSE)).

Runs in VS Code, in Cursor, Windsurf, VSCodium and Antigravity, and in IntelliJ IDEA (beta, Java). Everything stays inside your editor: no browser, no account, nothing sent to the internet.

![Code Scope stepping through BubbleSort](docs/demo.gif)

## What it draws

- Arrays, matrices, lists, sets, stacks and queues, with colored arrows for `i` and `j`
- Dictionaries, objects and references, linked lists, trees and graphs
- The call stack and the recursion tree
- A plain-language sentence for each step, each condition split into true and false parts, and every crash explained
- A trace table filled in step by step, like the desk check done on paper

Three extra tools: **Guess first** asks what a variable will be before the line runs, **Presentation mode** opens the panel large for projecting, and **Save image** turns the current step into a PNG.

The panel speaks English and Portuguese and follows the language of your editor.

| Recursion tree | Error explained |
|---|---|
| ![fib(4): every call with what it returned](docs/recursao.gif) | ![Index out of range: the position that does not exist](docs/erro.gif) |

| Binary search | Graph |
|---|---|
| ![The condition with its values, the compared position and the discarded half](docs/busca.gif) | ![Breadth-first search: visited, current and waiting nodes](docs/grafo.gif) |

## Install

**VS Code** (1.95 or newer): install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=code-scope.code-scope), or run:

```bash
code --install-extension code-scope.code-scope
```

**Cursor, Windsurf, VSCodium, Antigravity**: Code Scope is not on Open VSX yet. Download `code-scope.vsix` from the [latest release](https://github.com/celoramos/Code-Scope/releases/latest) and use **Install from VSIX...** in the Extensions view. Microsoft's C# and C/C++ debuggers do not run in these editors.

**IntelliJ IDEA 2026.2 or newer, or an Android Studio built on it** (beta, Java only): download `code-scope-jetbrains-*.zip` from the [latest release](https://github.com/celoramos/Code-Scope/releases/latest), then go to **Settings > Plugins > gear icon > Install Plugin from Disk...**.

## Languages

| Language | What you need |
|---|---|
| Java | [Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack) and a JDK |
| JavaScript, TypeScript | Node.js 22 or newer |
| Python | [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) and Python |
| C# | [C# extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp) and the .NET SDK |
| C | [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools), a compiler and gdb |
| Others (Go, Rust, PHP...) | Any VS Code debugger. Generic mode shows indexed collections and simple values |

## Get started

1. Run **Code Scope: Open a sample** from the command palette and pick a language.
2. Set a breakpoint on the line the comment points to and press F5.
3. Step with F10 and watch the panel.

In IntelliJ, debug any Java file and step with F8.

Something looks wrong? Check the [known limits](docs/known-limits.md), then [open an issue](https://github.com/celoramos/Code-Scope/issues/new/choose). Code Scope is a beta, and that is the most useful help right now.

## Roadmap

1. PyCharm and WebStorm: Python and JavaScript in the JetBrains plugin
2. JetBrains Marketplace and Open VSX
3. C++ containers (`std::vector`, `std::map`) and the newer concepts in C#
4. Objects in the variables of earlier calls
5. JavaScript in the browser, tested with the real debugger
6. Adapter for Go

## Contributing

You can help even if you are just starting. The [good first issues](docs/good-first-issues.md) say what to do and how to know you are done, and the [contributing guide](CONTRIBUTING.md) covers setup, tests and where each part of the code lives. All participation follows the [code of conduct](CODE_OF_CONDUCT.md). What changed in each version is in the [changelog](CHANGELOG.md) (in Portuguese).

## License

[MIT](LICENSE). Created and maintained by [@celoramos](https://github.com/celoramos).
