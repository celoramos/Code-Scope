# Known limits

What Code Scope does not do yet, or does differently from what you might expect.

- Earlier calls on the call stack show their simple variables and the first 8 items of their arrays and lists, not their objects. At most 12 calls are read.
- Only objects of classes declared in the file being debugged are drawn, at most 40 per step. Objects inside a matrix show their main value in the cell and their card below. Enums declared in the file show as the constant (`Cor.AZUL`); enums from libraries are left out.
- JavaScript does not show object identity, so the program itself is asked (`a === b`); across steps, an object keeps its identity by the paths that lead to it. A list rebuilt from scratch in a single step can look like new objects.
- A condition part that calls a method is only evaluated when the method just reads (`len`, `.length`, `.size()`, `.equals`, `.get`...); otherwise it shows "cannot tell beforehand".
- Hidden variables (one name hiding another) are detected in JavaScript blocks and in parameters with the same name as a field. Java and Python have no block scope for local variables.
- In generic mode, only collections the debugger marks as indexed, or whose size is written in the value, show up.
- Arrays with three dimensions show the first 8 layers, each as a matrix. From the fourth dimension on, the rest shows as text.
- `std::map` needs a gdb with the Python pretty-printers; without them it is left out. `std::vector`, `std::vector<bool>` included, works with or without them.
- In Go, stepping into `fmt` or past the end of `main` shows library code. A pointer shows the object again as new after a call returns.
- Text longer than 500 characters is cut. A JavaScript object with tens of thousands of named keys takes seconds per step, because js-debug does not page named properties; arrays, `Map` and `Set` are read one page at a time.
- A GIF shows at most 80 steps, spread evenly over the run. An `@expect` passes as soon as one step has every value right, even if they change later.
- A list that gains or loses several items in one step is animated when they form one block (`addAll`, `extend`, `splice`); items added in different places show as resized.
- Outside matrices, an integer becomes an arrow when the code uses it as a position: inside brackets (`v[i]`), in `get(i)`, `insert(i, x)` and the like, compared with the length, or in the math of another position (`meio = (inicio + fim) / 2`). Names in `codeScope.valueNames` never become arrows. Without the source file, any integer that fits the indexes does.
- Stacks and queues are recognized by how the stopped function uses the variable, and by the whole file when that function says nothing. A collection used by a helper in another function can change role when the program stops there.
- If you use F5 (continue) between breakpoints, the panel says so and shows the accumulated difference between the two stops: it cannot see the lines in between.
- The JetBrains plugin covers Java only (settings in Settings > Tools > Code Scope). Presentation mode and **Open a Sample** are in **Tools > Code Scope**; the sample folder opens as a plain project, so pick a JDK if the IDE asks. IntelliJ's F8 also stops on the `}` that closes an `if`, which VS Code skips, so the same program can take a few more steps there. After F7, the value a call returned does not show up in IntelliJ.
