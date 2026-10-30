# Known limits

What Code Scope does not do yet, or does differently from what you might expect.

- Earlier calls on the call stack show their simple variables and the first 8 items of their arrays and lists, not their objects. At most 12 calls are read.
- Only objects of classes declared in the file being debugged are drawn, at most 40 per step. Objects inside arrays show only as text.
- JavaScript does not show object identity, so the program itself is asked (`a === b`); across steps, an object keeps its identity by the paths that lead to it. A list rebuilt from scratch in a single step can look like new objects.
- A condition part that calls a method is only evaluated when the method just reads (`len`, `.length`, `.size()`, `.equals`, `.get`...); otherwise it shows "cannot tell beforehand".
- Hidden variables (one name hiding another) are detected in JavaScript blocks and in parameters with the same name as a field. Java and Python have no block scope for local variables.
- In generic mode, only collections the debugger marks as indexed, or whose size is written in the value, show up.
- Matrices with three or more dimensions show the third level as text.
- A list that gains or loses several items in one step is animated when they form one block (`addAll`, `extend`, `splice`); items added in different places show as resized.
- Outside matrices, an integer becomes an arrow when the code uses it as a position: inside brackets (`v[i]`), in `get(i)`, `insert(i, x)` and the like, compared with the length, or in the math of another position (`meio = (inicio + fim) / 2`). Names in `codeScope.valueNames` never become arrows. Without the source file, any integer that fits the indexes does.
- Stacks and queues are recognized by variable name, reading the whole file: the methods used (`push`, `poll`, `popleft`...) are added up from every place. Two variables with the same name used in different ways in the same file can be classified wrong.
- If you use F5 (continue) between breakpoints instead of F10, the panel shows the accumulated difference between the two stops, and the "ran" line is the previous breakpoint's.
- The JetBrains plugin covers Java only (settings in Settings > Tools > Code Scope). Presentation mode is VS Code only. IntelliJ's F8 also stops on the `}` that closes an `if`, which VS Code skips, so the same program can take a few more steps there. After F7, the value a call returned does not show up in IntelliJ.
