// @ts-check
(function () {
  // @ts-ignore acquireVsCodeApi é injetado pelo VS Code
  const vscode = acquireVsCodeApi();

  const empty = byId('empty');
  const emptyTitle = byId('empty-title');
  const toolbar = byId('toolbar');
  const counter = byId('counter');
  const timeline = /** @type {HTMLInputElement} */ (byId('timeline'));
  const backBtn = /** @type {HTMLButtonElement} */ (byId('back'));
  const forwardBtn = /** @type {HTMLButtonElement} */ (byId('forward'));
  const liveBtn = byId('live');
  const fileEl = byId('file');
  const codeEl = byId('code');
  const endedBadge = byId('ended');
  const status = byId('status');
  const explanationEl = byId('explanation');
  const varsEl = byId('vars');
  const arraysEl = byId('arrays');

  /**
   * @typedef {{ name: string, values: string[], length: number }} ArrayVar
   * @typedef {{ name: string, value: number }} Pointer
   * @typedef {{ name: string, index: number }} Arrow
   * @typedef {{ kind: string, array?: string, index?: number, a?: number, b?: number, name?: string }} Change
   * @typedef {{ line: number, code?: string }} LineRef
   * @typedef {{ snapshot: { file: string, line: number, code?: string, arrays: ArrayVar[], pointers: Pointer[] },
   *             executed?: LineRef, changes: Change[], arrows: Record<string, Arrow[]>,
   *             explanation: string[], step: number, total: number }} Frame
   */

  /** Multiplicador das durações em CSS; 0 desliga o movimento. */
  const SPEED = { lenta: 2, normal: 1, rapida: 0.5, desligada: 0 };

  const EMPTY_TITLE = {
    idle: 'Pronto para visualizar',
    running: 'Aguardando um breakpoint',
    ended: 'Sessão encerrada',
  };

  /** Quantas cores de ponteiro o CSS declara (--cs-ptr-0 até --cs-ptr-3). */
  const POINTER_COLORS = 4;

  /** @type {'idle' | 'running' | 'ended'} */
  let session = 'idle';
  /** @type {Frame | undefined} */
  let current;
  /** @type {string | undefined} */
  let error;

  /** Um bloco por array, reaproveitado entre passos para poder animar. */
  /** @type {Map<string, HTMLElement>} */
  const blocks = new Map();
  /** Cada ponteiro guarda a cor da primeira vez que apareceu: i é sempre azul. */
  /** @type {Map<string, number>} */
  const pointerColor = new Map();

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'render') {
      error = undefined;
      render(msg.frame);
    } else if (msg.type === 'session') {
      session = msg.state;
    } else if (msg.type === 'settings') {
      document.documentElement.style.setProperty('--cs-speed', String(SPEED[msg.animationSpeed] ?? 1));
    } else if (msg.type === 'reset') {
      reset();
    } else if (msg.type === 'error') {
      error = msg.text;
    }
    updateChrome();
  });

  backBtn.addEventListener('click', () => vscode.postMessage({ type: 'back' }));
  forwardBtn.addEventListener('click', () => vscode.postMessage({ type: 'forward' }));
  liveBtn.addEventListener('click', () => gotoStep(Infinity));
  // "input" dispara a cada movimento do controle: arrastar a linha do tempo passa pelos passos.
  timeline.addEventListener('input', () => gotoStep(Number(timeline.value)));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !current) return;
    // O slider já trata as setas sozinho; aqui só os atalhos do resto do painel.
    if (e.target === timeline) return;
    if (e.key === 'ArrowLeft') vscode.postMessage({ type: 'back' });
    else if (e.key === 'ArrowRight') vscode.postMessage({ type: 'forward' });
    else if (e.key === 'Home') gotoStep(1);
    else if (e.key === 'End') gotoStep(Infinity);
    else return;
    e.preventDefault();
  });

  /** @param {number} step */
  function gotoStep(step) {
    if (!current) return;
    vscode.postMessage({ type: 'goto', step: Math.min(step, current.total) });
  }

  /** Estado vazio, selo de sessão encerrada e a linha de status. */
  function updateChrome() {
    empty.hidden = Boolean(current);
    emptyTitle.textContent = EMPTY_TITLE[session];
    toolbar.hidden = !current;
    endedBadge.hidden = session !== 'ended';

    const parts = [];
    if (error) parts.push(error);
    if (current && current.snapshot.arrays.length === 0) parts.push('Nenhum array nas variáveis locais deste ponto.');
    status.textContent = parts.join(' ');
    status.classList.toggle('is-error', Boolean(error));
  }

  function reset() {
    current = undefined;
    error = undefined;
    for (const block of blocks.values()) block.remove();
    blocks.clear();
    pointerColor.clear();
    varsEl.replaceChildren();
    explanationEl.replaceChildren();
    codeEl.replaceChildren();
  }

  /** @param {Frame} frame */
  function render(frame) {
    current = frame;
    const s = frame.snapshot;
    const arrowNames = new Set(Object.values(frame.arrows).flatMap((list) => list.map((a) => a.name)));

    counter.textContent = `Passo ${frame.step} de ${frame.total}`;
    timeline.max = String(frame.total);
    timeline.value = String(frame.step);
    timeline.disabled = frame.total <= 1;
    timeline.setAttribute('aria-valuetext', `Passo ${frame.step} de ${frame.total}`);
    timeline.style.setProperty('--progress', String(frame.total > 1 ? (frame.step - 1) / (frame.total - 1) : 1));
    backBtn.disabled = frame.step <= 1;
    forwardBtn.disabled = frame.step >= frame.total;
    liveBtn.hidden = frame.step >= frame.total;
    fileEl.textContent = basename(s.file);
    renderCode(frame.executed, { line: s.line, code: s.code });

    explanationEl.replaceChildren(
      ...frame.explanation.map((text) => {
        const li = el('li', 'explanation-item');
        li.append(...highlightCode(text));
        return li;
      }),
    );
    renderVars(s.pointers, frame.changes, arrowNames);

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
   * A linha que acabou de rodar e a próxima. O debugger para antes de executar
   * a linha marcada no editor, e é a linha anterior que causou as mudanças.
   * @param {LineRef | undefined} executed
   * @param {LineRef} next
   */
  function renderCode(executed, next) {
    /** @type {HTMLElement[]} */
    const rows = [];
    if (executed) rows.push(...codeRow('Executou', executed, 'is-executed'));
    rows.push(...codeRow('Próxima', next, 'is-next'));
    codeEl.replaceChildren(...rows);
  }

  /**
   * @param {string} label
   * @param {LineRef} ref
   * @param {string} modifier
   */
  function codeRow(label, ref, modifier) {
    const dt = el('dt', `code-label ${modifier}`);
    dt.textContent = label;
    const dd = el('dd', `code-line ${modifier}`);
    const num = el('span', 'code-num');
    num.textContent = String(ref.line);
    const text = el('code', 'code-text');
    text.textContent = ref.code ?? '';
    text.title = ref.code ?? '';
    dd.append(num, text);
    return [dt, dd];
  }

  /**
   * Destaca "arr[2]" e nomes de variáveis conhecidos dentro da frase,
   * sem passar texto do debug por innerHTML.
   * @param {string} text
   */
  function highlightCode(text) {
    const s = current?.snapshot;
    const known = new Set([
      ...(s?.arrays.map((a) => a.name) ?? []),
      ...(s?.pointers.map((p) => p.name) ?? []),
      // Quem acabou de sair de escopo não está mais no snapshot, mas aparece na frase.
      ...(current?.changes.map((c) => c.name ?? c.array ?? '') ?? []),
    ]);
    /** @type {(string | HTMLElement)[]} */
    const out = [];
    let last = 0;
    for (const m of text.matchAll(/[A-Za-z_$][\w$]*(\[\d+\])?/g)) {
      if (!m[1] && !known.has(m[0])) continue;
      if (m.index > last) out.push(text.slice(last, m.index));
      const code = el('code', 'code');
      code.textContent = m[0];
      out.push(code);
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  /**
   * Variáveis inteiras. As que estão desenhadas como seta levam a cor da seta.
   * @param {Pointer[]} pointers
   * @param {Change[]} changes
   * @param {Set<string>} arrowNames
   */
  function renderVars(pointers, changes, arrowNames) {
    const changed = new Set(changes.filter((c) => c.kind === 'pointer').map((c) => c.name));
    varsEl.replaceChildren(
      ...pointers.map((p) => {
        const li = el('li', changed.has(p.name) ? 'var is-changed' : 'var');
        if (arrowNames.has(p.name)) {
          li.classList.add('is-pointer');
          li.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(p.name)})`);
        }
        const name = el('span', 'var-name');
        name.textContent = `${p.name} =`;
        const value = el('span', 'var-value');
        value.textContent = String(p.value);
        li.append(name, value);
        return li;
      }),
    );
  }

  /** @param {string} name */
  function createBlock(name) {
    const block = el('article', 'array');
    const header = el('header', 'array-header');
    const title = el('h3', 'array-name');
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
        ? `${arr.values.length} de ${arr.length} posições`
        : `${arr.length} ${arr.length === 1 ? 'posição' : 'posições'}`;

    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    while (list.children.length > arr.values.length) list.lastElementChild?.remove();
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
        p.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(arrow.name)})`);
        const label = el('span', 'pointer-name');
        label.textContent = arrow.name;
        p.append(el('span', 'pointer-head'), label);
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
    layer.style.setProperty('--rows', String(Math.max(0, ...stack.values())));

    // Leitores de tela: a caixa diz quem aponta para ela.
    cells.forEach((cell, i) => {
      const names = arrows.filter((a) => a.index === i).map((a) => a.name);
      const base = cell.dataset.label ?? '';
      cell.setAttribute('aria-label', names.length ? `${base}, apontada por ${names.join(', ')}` : base);
    });
  }

  /** @param {string} name */
  function colorOf(name) {
    let c = pointerColor.get(name);
    if (c === undefined) {
      c = pointerColor.size % POINTER_COLORS;
      pointerColor.set(name, c);
    }
    return c;
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

  updateChrome();
  vscode.postMessage({ type: 'ready' });
})();
