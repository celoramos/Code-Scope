// @ts-check
// Formas dos dados que a extensão manda ao painel (ver src/model/frame.ts).
/**
 * @typedef {{ name: string, values: string[], length: number, kind?: 'array' | 'list' | 'stack' | 'queue' | 'text' | 'set', rows?: ArrayVar[], id?: string }} ArrayVar
 * @typedef {{ name: string, value: number }} Pointer
 * @typedef {{ name: string, value: string }} Scalar
 * @typedef {{ name: string, index: number }} Arrow
 * @typedef {{ row?: Arrow, col?: Arrow }} Axes
 * @typedef {{ kind: string, array?: string, map?: string, key?: string, from?: string | number, to?: string | number, index?: number, a?: number, b?: number, name?: string, value?: string }} Change
 * @typedef {{ line: number, code?: string }} LineRef
 * @typedef {{ snapshot: { file: string, line: number, code?: string, arrays: ArrayVar[], pointers: Pointer[], scalars?: Scalar[], calls?: CallFrame[], maps?: MapVar[], condition?: Condition, refs?: { name: string, ref: string | null }[] },
 *             executed?: LineRef, changes: Change[], arrows: Record<string, Arrow[]>, axes: Record<string, Axes>,
 *             explanation: string[], trace: Trace, error?: ErrorView, calls?: CallChange[], heap?: HeapView, heapDelta?: HeapDelta,
 *             focus?: Record<string, ArrayFocus>, prediction?: { target: string }, answers?: Record<string, string>, graphs?: GraphViewT[], callTree?: CallTreeT, shadows?: Record<string, string>, stats?: { comparisons: number, swaps: number },
 *             step: number, total: number }} Frame
 * @typedef {{ name: string, line: number, program?: boolean, owner?: string, vars: Scalar[] }} CallFrame
 * @typedef {{ kind: 'call' | 'return', name: string, depth: number, value?: string }} CallChange
 * @typedef {{ id: string, value: string, names: string[] }} NodeViewT
 * @typedef {NodeViewT & { children: (TreeNodeViewT | null)[] }} TreeNodeViewT
 * @typedef {{ type: string, link: string, nodes: NodeViewT[], cycle: boolean }} ListViewT
 * @typedef {{ type: string, links: string[], root: TreeNodeViewT }} TreeViewT
 * @typedef {{ id: string, type: string, names: string[], fields: { name: string, value: string, ref?: string | null, target?: string }[], truncated?: boolean }} ObjectViewT
 * @typedef {{ index: number, id: string, details: string[], names: string[], type?: string }} CellObjectT
 * @typedef {{ name: string, nodes: string[], edges: string[][], directed: boolean, visited: string[], current?: string, frontier: string[] }} GraphViewT
 * @typedef {{ lists: ListViewT[], trees: TreeViewT[], objects: ObjectViewT[], nulls: string[], cells?: Record<string, CellObjectT[]> }} HeapView
 * @typedef {{ added: string[], fields: Record<string, string[]> }} HeapDelta
 * @typedef {{ id: number, name: string, label: string, returned?: string, done: boolean, active: boolean, children: CallNodeT[] }} CallNodeT
 * @typedef {{ root: CallNodeT, calls: number, repeated: Record<string, number> }} CallTreeT
 * @typedef {{ name: string, entries: { key: string, value: string }[], length: number }} MapVar
 * @typedef {{ compare?: number[], range?: { from: number, to: number, names: string[] } }} ArrayFocus
 * @typedef {{ text: string, values?: string, value?: boolean, skipped?: boolean }} ConditionPart
 * @typedef {{ keyword: string, line: number, text: string, parts: ConditionPart[], ops: string[], result?: boolean }} Condition
 * @typedef {{ type: string, message: string, kind: string, title: string, sentences: string[], handled?: boolean, missing?: { array: string, index: number } }} ErrorView
 * @typedef {{ columns: string[], showCalls?: boolean, rows: { step: number, line: number, call?: string, values: (string | null | undefined)[], changed: boolean[] }[], hidden: number }} Trace
 */

export {};
