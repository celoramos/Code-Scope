// @ts-check
(function () {
  // @ts-ignore acquireVsCodeApi é injetado pelo VS Code
  const vscode = acquireVsCodeApi();
  const status = byId('status');
  const location = byId('location');
  const varsEl = byId('vars');
  const arraysEl = byId('arrays');
  const nav = byId('nav');
  const counter = byId('counter');
  const backBtn = /** @type {HTMLButtonElement} */ (byId('back'));
  const forwardBtn = /** @type {HTMLButtonElement} */ (byId('forward'));
  const explanationEl = byId('explanation');

  const SESSION_TEXT = {
    idle: 'Aguardando debug. Coloque um breakpoint num programa Java e aperte F5.',
    running: 'Sessão iniciada. Aguardando um breakpoint.',
    ended: 'Sessão encerrada. O histórico continua aqui até o próximo debug.',
  };

  /** @type {'idle' | 'running' | 'ended'} */
  let session = 'idle';
  /** @type {Frame | undefined} */
  let current;
  /** @type {string | undefined} */
  let error;

  /**
   * @typedef {{ name: string, values: string[], length: number }} ArrayVar
   * @typedef {{ name: string, value: number }} Pointer
   * @typedef {{ name: string, index: number }} Arrow
   * @typedef {{ kind: string, array?: string, index?: number, a?: number, b?: number, name?: string }} Change
   * @typedef {{ snapshot: { file: string, line: number, arrays: ArrayVar[], pointers: Pointer[] },
   *             changes: Change[], arrows: Record<string, Arrow[]>,
   *             explanation: string[], step: number, total: number }} Frame
   */

  /** Um bloco por array, reaproveitado entre passos para poder animar. */
  /** @type {Map<string, HTMLElement>} */
  const blocks = new Map();

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'render') {
      error = undefined;
      render(msg.frame);
    } else if (msg.type === 'session') {
      session = msg.state;
    } else if (msg.type === 'reset') {
      reset();
    } else if (msg.type === 'error') {
      error = msg.text;
    }
    updateStatus();
  });

  backBtn.addEventListener('click', () => vscode.postMessage({ type: 'back' }));
  forwardBtn.addEventListener('click', () => vscode.postMessage({ type: 'forward' }));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !current) return;
    if (e.key === 'ArrowLeft') vscode.postMessage({ type: 'back' });
    else if (e.key === 'ArrowRight') vscode.postMessage({ type: 'forward' });
  });

  /** Uma linha só: erro, estado da sessão quando importa, e o caso sem arrays. */
  function updateStatus() {
    const parts = [];
    if (error) parts.push(error);
    if (!current || session === 'ended') parts.push(SESSION_TEXT[session]);
    if (current && current.snapshot.arrays.length === 0) parts.push('Nenhum array nas variáveis locais deste ponto.');
    status.textContent = parts.join(' ');
    status.classList.toggle('is-error', Boolean(error));
  }

  function reset() {
    current = undefined;
    error = undefined;
    for (const block of blocks.values()) block.remove();
    blocks.clear();
    varsEl.replaceChildren();
    explanationEl.replaceChildren();
    location.hidden = true;
    nav.hidden = true;
  }

  /** @param {Frame} frame */
  function render(frame) {
    current = frame;
    const s = frame.snapshot;
    nav.hidden = false;
    counter.textContent = `passo ${frame.step} de ${frame.total}`;
    backBtn.disabled = frame.step <= 1;
    forwardBtn.disabled = frame.step >= frame.total;
    location.hidden = false;
    location.textContent = `${basename(s.file)}, linha ${s.line}`;
    explanationEl.replaceChildren(
      ...frame.explanation.map((text) => {
        const li = el('li', 'explanation-item');
        li.textContent = text;
        return li;
      }),
    );
    renderVars(s.pointers, frame.changes);

    const seen = new Set();
    for (const arr of s.arrays) {
      seen.add(arr.name);
      let block = blocks.get(arr.name);
      const isNew = !block;
      if (!block) {
        block = createBlock(arr.name);
        blocks.set(arr.name, block);
      }
      arraysEl.appendChild(block); // mantém a ordem das variáveis
      updateBlock(block, arr);
      animateBlock(block, arr.name, frame.changes, isNew);
      updateArrows(block, frame.arrows[arr.name] ?? []);
    }
    for (const [name, block] of blocks) {
      if (!seen.has(name)) {
        block.remove();
        blocks.delete(name);
      }
    }
  }

  /**
   * @param {Pointer[]} pointers
   * @param {Change[]} changes
   */
  function renderVars(pointers, changes) {
    const changed = new Set(changes.filter((c) => c.kind === 'pointer').map((c) => c.name));
    varsEl.replaceChildren(
      ...pointers.map((p) => {
        const li = el('li', changed.has(p.name) ? 'var is-changed' : 'var');
        li.textContent = `${p.name} = ${p.value}`;
        return li;
      }),
    );
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
    const pointers = el('div', 'pointers');
    pointers.setAttribute('aria-hidden', 'true'); // as setas já estão no aria-label das caixas
    track.append(cells, pointers);
    block.append(header, track);
    return block;
  }

  /**
   * @param {HTMLElement} block
   * @param {ArrayVar} arr
   */
  function updateBlock(block, arr) {
    const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
    meta.textContent =
      arr.values.length < arr.length
        ? `mostrando ${arr.values.length} de ${arr.length} posições`
        : `${arr.length} ${arr.length === 1 ? 'posição' : 'posições'}`;

    const cells = cellsOf(block);
    while (cells.length > arr.values.length) cells.pop()?.remove();
    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    while (list.children.length < arr.values.length) list.append(createCell(list.children.length));
    arr.values.forEach((value, i) => {
      const cell = /** @type {HTMLElement} */ (list.children[i]);
      const v = /** @type {HTMLElement} */ (cell.querySelector('.cell-value'));
      v.textContent = value;
      v.title = value;
      cell.dataset.label = `${arr.name}[${i}] = ${value}`;
      cell.setAttribute('aria-label', cell.dataset.label);
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

  /**
   * Destaca o que mudou neste passo. Uma troca anima as duas caixas se
   * cruzando: cada valor sai da posição antiga e faz um arco até a nova.
   * @param {HTMLElement} block
   * @param {string} name
   * @param {Change[]} changes
   * @param {boolean} isNew
   */
  function animateBlock(block, name, changes, isNew) {
    const cells = cellsOf(block);
    for (const cell of cells) {
      cell.classList.remove('is-changed', 'swap-up', 'swap-down');
      cell.style.removeProperty('--dx');
    }
    block.classList.remove('is-new');
    void block.offsetWidth; // reinicia as animações CSS

    if (isNew) block.classList.add('is-new');
    /** @type {HTMLElement | undefined} */
    let first;
    for (const c of changes) {
      if (c.array !== name) continue;
      if (c.kind === 'set' && c.index !== undefined && cells[c.index]) {
        cells[c.index].classList.add('is-changed');
        first ??= cells[c.index];
      } else if (c.kind === 'swap' && c.a !== undefined && c.b !== undefined && cells[c.a] && cells[c.b]) {
        const a = cells[c.a];
        const b = cells[c.b];
        const dx = b.offsetLeft - a.offsetLeft;
        a.style.setProperty('--dx', `${dx}px`);
        b.style.setProperty('--dx', `${-dx}px`);
        a.classList.add('is-changed', 'swap-up');
        b.classList.add('is-changed', 'swap-down');
        first ??= a;
      }
    }
    first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Setas embaixo das caixas. Cada seta é um elemento fixo por nome e só
   * muda de posição, então "i++" aparece como a seta deslizando.
   * @param {HTMLElement} block
   * @param {Arrow[]} arrows
   */
  function updateArrows(block, arrows) {
    const layer = /** @type {HTMLElement} */ (block.querySelector('.pointers'));
    const cells = cellsOf(block);
    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    layer.style.width = `${list.scrollWidth}px`;

    /** @type {Map<number, number>} quantas setas já empilhadas por posição */
    const stack = new Map();
    const keep = new Set();
    for (const arrow of arrows) {
      keep.add(arrow.name);
      const cell = cells[arrow.index];
      const row = stack.get(arrow.index) ?? 0;
      stack.set(arrow.index, row + 1);

      let p = /** @type {HTMLElement | null} */ (layer.querySelector(`[data-name="${CSS.escape(arrow.name)}"]`));
      const appearing = !p;
      if (!p) {
        p = el('span', 'pointer');
        p.dataset.name = arrow.name;
        const head = el('span', 'pointer-head');
        head.textContent = '▲';
        const label = el('span', 'pointer-name');
        label.textContent = arrow.name;
        p.append(head, label);
        layer.append(p);
      }
      const x = cell.offsetLeft + cell.offsetWidth / 2;
      p.style.setProperty('--x', `${x}px`);
      p.style.setProperty('--row', String(row));
      if (appearing) {
        p.classList.add('no-move');
        void p.offsetWidth;
        p.classList.remove('no-move');
      }
    }
    for (const p of Array.from(layer.querySelectorAll('.pointer'))) {
      if (!keep.has(/** @type {HTMLElement} */ (p).dataset.name)) p.remove();
    }
    const rows = Math.max(0, ...stack.values());
    layer.style.setProperty('--rows', String(rows));

    // Leitores de tela: a caixa diz quem aponta para ela.
    cells.forEach((cell, i) => {
      const names = arrows.filter((a) => a.index === i).map((a) => a.name);
      const base = cell.dataset.label ?? '';
      cell.setAttribute('aria-label', names.length ? `${base}, apontada por ${names.join(', ')}` : base);
    });
  }

  /** @param {HTMLElement} block */
  function cellsOf(block) {
    return /** @type {HTMLElement[]} */ (Array.from(block.querySelectorAll('.cell')));
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
