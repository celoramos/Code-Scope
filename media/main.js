// @ts-check
(function () {
  // @ts-ignore acquireVsCodeApi é injetado pelo VS Code
  const vscode = acquireVsCodeApi();
  const status = byId('status');
  const location = byId('location');
  const arraysEl = byId('arrays');

  /** Um bloco por array, reaproveitado entre passos para poder animar. */
  /** @type {Map<string, HTMLElement>} */
  const blocks = new Map();

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'status') {
      status.textContent = msg.text;
    } else if (msg.type === 'render') {
      render(msg.frame);
    }
  });

  /** @param {{ snapshot: { file: string, line: number, arrays: { name: string, values: string[], length: number }[] } }} frame */
  function render(frame) {
    const s = frame.snapshot;
    location.hidden = false;
    location.textContent = `${basename(s.file)}, linha ${s.line}`;
    status.textContent = s.arrays.length === 0 ? 'Nenhum array nas variáveis locais deste ponto.' : '';

    const seen = new Set();
    for (const arr of s.arrays) {
      seen.add(arr.name);
      let block = blocks.get(arr.name);
      if (!block) {
        block = createBlock(arr.name);
        blocks.set(arr.name, block);
      }
      arraysEl.appendChild(block); // mantém a ordem das variáveis
      updateBlock(block, arr);
    }
    for (const [name, block] of blocks) {
      if (!seen.has(name)) {
        block.remove();
        blocks.delete(name);
      }
    }
  }

  /** @param {string} name */
  function createBlock(name) {
    const block = el('div', 'array');
    const header = el('div', 'array-header');
    const title = el('span', 'array-name');
    title.textContent = name;
    header.append(title, el('span', 'array-meta'));
    const track = el('div', 'array-track');
    const cells = el('ol', 'cells');
    cells.setAttribute('aria-label', `Posições de ${name}`);
    track.append(cells);
    block.append(header, track);
    return block;
  }

  /**
   * @param {HTMLElement} block
   * @param {{ name: string, values: string[], length: number }} arr
   */
  function updateBlock(block, arr) {
    const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
    meta.textContent =
      arr.values.length < arr.length
        ? `mostrando ${arr.values.length} de ${arr.length} posições`
        : `${arr.length} ${arr.length === 1 ? 'posição' : 'posições'}`;

    const cells = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    while (cells.children.length > arr.values.length) cells.lastElementChild?.remove();
    while (cells.children.length < arr.values.length) cells.append(createCell(cells.children.length));
    arr.values.forEach((value, i) => {
      const cell = /** @type {HTMLElement} */ (cells.children[i]);
      const v = /** @type {HTMLElement} */ (cell.querySelector('.cell-value'));
      v.textContent = value;
      v.title = value;
      cell.setAttribute('aria-label', `${arr.name}[${i}] = ${value}`);
    });
  }

  /** @param {number} index */
  function createCell(index) {
    const cell = el('li', 'cell');
    const idx = el('span', 'cell-index');
    idx.textContent = String(index);
    idx.setAttribute('aria-hidden', 'true');
    cell.append(idx, el('span', 'cell-value'));
    return cell;
  }

  /** @param {string} id */
  function byId(id) {
    return /** @type {HTMLElement} */ (document.getElementById(id));
  }

  /**
   * @param {string} tag
   * @param {string} className
   */
  function el(tag, className) {
    const e = document.createElement(tag);
    e.className = className;
    return e;
  }

  /** @param {string} path */
  function basename(path) {
    return path.split(/[\\/]/).pop() || path;
  }

  vscode.postMessage({ type: 'ready' });
})();
