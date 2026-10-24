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
  const conditionEl = byId('condition');
  const endedBadge = byId('ended');
  const status = byId('status');
  const explanationEl = byId('explanation');
  const varsEl = byId('vars');
  const arraysEl = byId('arrays');
  const heapEl = byId('heap');
  const statsEl = byId('stats');
  const mapsEl = byId('maps');
  const callsEl = byId('calls');
  const callsTitleEl = byId('calls-title');
  const callsCountEl = byId('calls-count');
  const callsRuleEl = byId('calls-rule');
  const callStackEl = byId('call-stack');
  const errorEl = byId('error');
  const errorTitleEl = byId('error-title');
  const errorTextEl = byId('error-text');
  const errorRawEl = byId('error-raw');
  const traceEl = /** @type {HTMLDetailsElement} */ (byId('trace'));
  const traceTitleEl = byId('trace-title');
  const traceCountEl = byId('trace-count');
  const traceHiddenEl = byId('trace-hidden');
  const traceTableEl = byId('trace-table');

  /** Textos no idioma do VS Code, que a extensão põe no HTML. */
  /** @type {Record<string, string>} */
  const T = JSON.parse(byId('strings').textContent || '{}');
  // O CSS escreve "vazia" dentro da pilha e da fila sem itens.
  document.documentElement.style.setProperty('--cs-empty-label', JSON.stringify(t('empty')));

  /**
   * @typedef {{ name: string, values: string[], length: number, kind?: 'array' | 'list' | 'stack' | 'queue', rows?: ArrayVar[], id?: string }} ArrayVar
   * @typedef {{ name: string, value: number }} Pointer
   * @typedef {{ name: string, value: string }} Scalar
   * @typedef {{ name: string, index: number }} Arrow
   * @typedef {{ row?: Arrow, col?: Arrow }} Axes
   * @typedef {{ kind: string, array?: string, map?: string, key?: string, from?: string, index?: number, a?: number, b?: number, name?: string, value?: string }} Change
   * @typedef {{ line: number, code?: string }} LineRef
   * @typedef {{ snapshot: { file: string, line: number, code?: string, arrays: ArrayVar[], pointers: Pointer[], scalars?: Scalar[], calls?: CallFrame[], maps?: MapVar[], condition?: Condition },
   *             executed?: LineRef, changes: Change[], arrows: Record<string, Arrow[]>, axes: Record<string, Axes>,
   *             explanation: string[], trace: Trace, error?: ErrorView, calls?: CallChange[], heap?: HeapView, heapDelta?: HeapDelta,
   *             focus?: Record<string, ArrayFocus>, stats?: { comparisons: number, swaps: number },
   *             step: number, total: number }} Frame
   * @typedef {{ name: string, line: number, program?: boolean, vars: Scalar[] }} CallFrame
   * @typedef {{ kind: 'call' | 'return', name: string, depth: number, value?: string }} CallChange
   * @typedef {{ id: string, value: string, names: string[] }} NodeViewT
   * @typedef {NodeViewT & { children: (TreeNodeViewT | null)[] }} TreeNodeViewT
   * @typedef {{ type: string, link: string, nodes: NodeViewT[], cycle: boolean }} ListViewT
   * @typedef {{ type: string, links: string[], root: TreeNodeViewT }} TreeViewT
   * @typedef {{ id: string, type: string, names: string[], fields: { name: string, value: string, ref?: string | null, target?: string }[], truncated?: boolean }} ObjectViewT
   * @typedef {{ lists: ListViewT[], trees: TreeViewT[], objects: ObjectViewT[], nulls: string[] }} HeapView
   * @typedef {{ added: string[], fields: Record<string, string[]> }} HeapDelta
   * @typedef {{ name: string, entries: { key: string, value: string }[], length: number }} MapVar
   * @typedef {{ compare?: number[], range?: { from: number, to: number, names: string[] } }} ArrayFocus
   * @typedef {{ text: string, values?: string, value?: boolean, skipped?: boolean }} ConditionPart
   * @typedef {{ keyword: string, line: number, text: string, parts: ConditionPart[], ops: string[], result?: boolean }} Condition
   * @typedef {{ type: string, message: string, kind: string, title: string, sentences: string[], missing?: { array: string, index: number } }} ErrorView
   * @typedef {{ columns: string[], showCalls?: boolean, rows: { step: number, line: number, call?: string, values: (string | null | undefined)[], changed: boolean[] }[], hidden: number }} Trace
   */

  /** Multiplicador das durações em CSS; 0 desliga o movimento. */
  const SPEED = { lenta: 2, normal: 1, rapida: 0.5, desligada: 0 };

  const EMPTY_TITLE = { idle: t('idle'), running: t('running'), ended: t('ended') };

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
    // Só avisa quando não há nada para desenhar: sem arrays, sem variáveis e sem chamadas.
    const s = current?.snapshot;
    if (s && s.arrays.length === 0 && s.pointers.length === 0 && !(s.scalars ?? []).length && callsEl.hidden && heapEl.hidden && mapsEl.hidden) parts.push(t('noArrays'));
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
    const arrowNames = new Set([
      ...Object.values(frame.arrows).flatMap((list) => list.map((a) => a.name)),
      ...Object.values(frame.axes ?? {}).flatMap((ax) => [ax.row?.name, ax.col?.name].filter(isString)),
    ]);

    counter.textContent = t('step', frame.step, frame.total);
    timeline.max = String(frame.total);
    timeline.value = String(frame.step);
    timeline.disabled = frame.total <= 1;
    timeline.setAttribute('aria-valuetext', t('step', frame.step, frame.total));
    timeline.style.setProperty('--progress', String(frame.total > 1 ? (frame.step - 1) / (frame.total - 1) : 1));
    backBtn.disabled = frame.step <= 1;
    forwardBtn.disabled = frame.step >= frame.total;
    liveBtn.hidden = frame.step >= frame.total;
    fileEl.textContent = basename(s.file);
    renderCode(frame.executed, { line: s.line, code: s.code });
    renderCondition(s.condition);

    explanationEl.replaceChildren(
      ...frame.explanation.map((text) => {
        const li = el('li', 'explanation-item');
        li.append(...highlightCode(text));
        return li;
      }),
    );
    renderError(frame.error);
    renderCalls(s.calls ?? [], frame.calls ?? []);
    renderVars(s.pointers, s.scalars ?? [], frame.changes, arrowNames);
    renderTrace(frame.trace, frame.step);

    // Dois nomes para o mesmo array (b = a): um desenho só, com os dois nomes.
    /** @type {Map<string, string[]>} */
    const aliasNames = new Map();
    for (const arr of s.arrays) if (arr.id) aliasNames.set(arr.id, [...(aliasNames.get(arr.id) ?? []), arr.name]);
    const seen = new Set();
    for (const arr of s.arrays) {
      const names = (arr.id && aliasNames.get(arr.id)) || [arr.name];
      if (names[0] !== arr.name) continue;
      seen.add(arr.name);
      const kind = arr.rows ? 'matrix' : arr.kind === 'stack' || arr.kind === 'queue' ? arr.kind : 'array';
      let block = blocks.get(arr.name);
      if (block && block.dataset.kind !== kind) {
        block.remove();
        block = undefined;
      }
      const isNew = !block;
      if (!block) {
        block = kind === 'matrix' ? createMatrixBlock(arr.name) : createBlock(arr.name, kind);
        block.dataset.kind = kind;
        blocks.set(arr.name, block);
      }
      arraysEl.appendChild(block); // mantém a ordem das variáveis
      setNames(block, names);
      if (kind === 'matrix') {
        updateMatrix(block, arr, frame.axes[arr.name] ?? {}, frame.changes, isNew);
      } else {
        updateBlock(block, arr);
        animateBlock(block, arr.name, frame.changes, isNew);
        if (kind === 'array') updateMissing(block, arr.name, frame.error?.missing);
        if (kind === 'array') updateArrows(block, frame.arrows[arr.name] ?? []);
        if (kind === 'array') updateFocus(block, frame.focus?.[arr.name]);
        else updateMarkers(block, kind);
      }
    }
    for (const [name, block] of blocks) {
      if (!seen.has(name)) {
        block.remove();
        blocks.delete(name);
      }
    }
    renderStats(frame.stats);
    renderMaps(s.maps ?? [], frame.changes);
    renderHeap(frame.heap, frame.heapDelta);
  }

  /**
   * Posições que a próxima condição compara ficam contornadas; as que a busca
   * já descartou ficam apagadas.
   * @param {HTMLElement} block
   * @param {ArrayFocus | undefined} focus
   */
  function updateFocus(block, focus) {
    const compare = new Set(focus?.compare ?? []);
    const range = focus?.range;
    cellsOf(block).forEach((cell, i) => {
      const compared = compare.has(i);
      const outside = !!range && (i < range.from || i > range.to);
      cell.classList.toggle('is-compared', compared);
      cell.classList.toggle('is-outside', outside);
      const extra = [compared ? t('comparing') : '', outside ? t('outside') : ''].filter(Boolean).join(', ');
      const base = cell.getAttribute('aria-label') ?? '';
      cell.setAttribute('aria-label', extra ? `${base}, ${extra}` : base);
    });
  }

  /**
   * Contas que se usam para comparar algoritmos: quantas vezes o programa
   * comparou posições e quantas trocas fez até aqui.
   * @param {{ comparisons: number, swaps: number } | undefined} stats
   */
  function renderStats(stats) {
    const parts = [];
    if (stats?.comparisons) parts.push(t('statsComparisons', stats.comparisons));
    if (stats?.swaps) parts.push(t('statsSwaps', stats.swaps));
    statsEl.textContent = parts.join(' · ');
    statsEl.hidden = parts.length === 0;
  }

  /**
   * Dicionários: uma tabela chave e valor. A chave nova entra deslizando; o
   * valor trocado pisca.
   * @param {MapVar[]} maps
   * @param {Change[]} changes
   */
  function renderMaps(maps, changes) {
    mapsEl.replaceChildren(
      ...maps.map((map) => {
        const n = map.length;
        const block = heapCard('map', map.name, n === 0 ? t('emptyMap') : n === 1 ? t('oneKey') : t('keys', n));
        const puts = changes.filter((c) => c.kind === 'map-put' && c.map === map.name);
        const table = el('table', 'map-table');
        table.setAttribute('aria-label', map.name);
        const head = el('tr', '');
        for (const label of [t('mapKey'), t('mapValue')]) {
          const th = el('th', '');
          th.setAttribute('scope', 'col');
          th.textContent = label;
          head.append(th);
        }
        const thead = el('thead', '');
        thead.append(head);
        const body = el('tbody', '');
        for (const e of map.entries) {
          const put = puts.find((c) => c.key === e.key);
          const tr = el('tr', put ? (put.from === undefined ? 'is-new' : 'is-changed') : '');
          const k = el('th', 'map-key');
          k.setAttribute('scope', 'row');
          k.textContent = e.key;
          const v = el('td', 'map-value');
          v.textContent = e.value;
          v.title = e.value;
          tr.append(k, v);
          body.append(tr);
        }
        table.append(thead, body);
        const track = el('div', 'array-track');
        track.append(table);
        block.append(track);
        return block;
      }),
    );
    mapsEl.hidden = maps.length === 0;
  }

  /**
   * Título do array com todos os nomes que apontam para ele e o aviso de que
   * não é cópia.
   * @param {HTMLElement} block
   * @param {string[]} names
   */
  function setNames(block, names) {
    const title = /** @type {HTMLElement} */ (block.querySelector('.array-name'));
    title.textContent = names.join(', ');
    let badge = /** @type {HTMLElement | null} */ (block.querySelector('.array-alias'));
    if (names.length < 2) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = el('span', 'array-alias');
      title.after(badge);
    }
    badge.textContent = t('sameArray');
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
    if (executed) rows.push(...codeRow(t('executed'), executed, 'is-executed'));
    rows.push(...codeRow(t('nextLine'), next, 'is-next'));
    codeEl.replaceChildren(...rows);
  }

  /**
   * A condição da próxima linha quebrada nas partes, cada uma com o valor que
   * vai dar. As partes que o curto-circuito pula ficam apagadas.
   * @param {Condition | undefined} c
   */
  function renderCondition(c) {
    conditionEl.hidden = !c;
    if (!c) {
      conditionEl.replaceChildren();
      return;
    }
    const title = el('p', 'condition-title');
    title.textContent = t('condTitle', c.line);
    const list = el('ol', 'condition-parts');
    c.parts.forEach((part, k) => {
      if (k > 0) {
        const op = el('li', 'condition-op');
        op.textContent = c.ops[k - 1] === '||' ? t('condOr') : t('condAnd');
        list.append(op);
      }
      const li = el('li', `condition-part${part.skipped ? ' is-skipped' : ''}`);
      const code = el('code', 'code');
      code.textContent = part.text;
      li.append(code);
      if (part.values) {
        const values = el('span', 'condition-values');
        values.textContent = part.values;
        li.append(values);
      }
      li.append(verdict(part.skipped ? undefined : part.value, part.skipped));
      list.append(li);
    });
    conditionEl.replaceChildren(title, list);
    if (c.parts.length > 1 && c.result !== undefined) {
      const result = el('p', 'condition-result');
      result.append(document.createTextNode(`${t('condResult')}: `), verdict(c.result, false));
      conditionEl.append(result);
    }
  }

  /**
   * @param {boolean | undefined} value
   * @param {boolean | undefined} skipped
   */
  function verdict(value, skipped) {
    const v = el('span', `verdict ${skipped ? 'is-skipped' : value === true ? 'is-true' : value === false ? 'is-false' : 'is-unknown'}`);
    v.textContent = skipped ? t('condSkipped') : value === true ? t('condTrue') : value === false ? t('condFalse') : t('condUnknown');
    return v;
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
    for (const m of text.matchAll(/[A-Za-z_$][\w$]*((?:\[\d+\])+)?/g)) {
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
   * Variáveis simples: inteiros primeiro, depois boolean, char, String...
   * Os inteiros desenhados como seta levam a cor da seta.
   * @param {Pointer[]} pointers
   * @param {Scalar[]} scalars
   * @param {Change[]} changes
   * @param {Set<string>} arrowNames
   */
  function renderVars(pointers, scalars, changes, arrowNames) {
    const changed = new Set(changes.filter((c) => c.kind === 'pointer' || c.kind === 'scalar').map((c) => c.name));
    /** @param {string} n @param {string} v */
    const chip = (n, v) => {
      const li = el('li', changed.has(n) ? 'var is-changed' : 'var');
      const name = el('span', 'var-name');
      name.textContent = `${n} =`;
      const value = el('span', 'var-value');
      value.textContent = v;
      li.append(name, value);
      return li;
    };
    varsEl.replaceChildren(
      ...pointers.map((p) => {
        const li = chip(p.name, String(p.value));
        if (arrowNames.has(p.name)) {
          li.classList.add('is-pointer');
          li.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(p.name)})`);
        }
        return li;
      }),
      ...scalars.map((sc) => chip(sc.name, sc.value)),
    );
  }

  /** @param {string} name */
  /**
   * @param {string} name
   * @param {'array' | 'stack' | 'queue'} kind
   */
  function createBlock(name, kind) {
    const block = el('article', `array is-${kind}`);
    const header = el('header', 'array-header');
    const title = el('h3', 'array-name');
    title.textContent = name;
    header.append(title, el('span', 'array-meta'));
    const track = el('div', 'array-track');
    const cells = el('ol', 'cells');
    const markers = el('div', kind === 'array' ? 'pointers' : 'markers');
    markers.setAttribute('aria-hidden', 'true'); // setas e etiquetas já estão no aria-label das caixas
    block.append(header, track);

    if (kind === 'stack') {
      cells.setAttribute('aria-label', t('stackLabel', name));
      track.append(cells, markers);
      block.append(rule(t('stackRule')));
    } else if (kind === 'queue') {
      cells.setAttribute('aria-label', t('queueLabel', name));
      track.append(laneEnd('exit'), cells, laneEnd('entry'), markers);
      block.append(rule(t('queueRule')));
    } else {
      cells.setAttribute('aria-label', t('arrayLabel', name));
      track.append(cells, markers);
    }
    return block;
  }

  /** Lembrete da regra da estrutura, embaixo do desenho. @param {string} text */
  function rule(text) {
    const p = el('p', 'array-rule');
    p.textContent = text;
    return p;
  }

  /**
   * Ponta da esteira da fila. As duas setas apontam para a esquerda: é o
   * sentido em que a fila anda.
   * @param {'exit' | 'entry'} side
   */
  function laneEnd(side) {
    const end = el('div', `lane-end is-${side}`);
    end.setAttribute('aria-hidden', 'true');
    end.innerHTML = '<svg viewBox="0 0 16 16"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>';
    const text = el('span', 'lane-label');
    text.textContent = t(side);
    end.append(text);
    return end;
  }

  /**
   * @param {HTMLElement} block
   * @param {ArrayVar} arr
   */
  function updateBlock(block, arr) {
    const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
    const collection = arr.kind === 'list' || arr.kind === 'stack' || arr.kind === 'queue';
    const unit = collection ? [t('item'), t('items')] : [t('position'), t('positions')];
    const count =
      arr.values.length < arr.length
        ? t('partial', arr.values.length, arr.length, unit[1])
        : `${arr.length} ${arr.length === 1 ? unit[0] : unit[1]}`;
    const noun = collection ? t(arr.kind ?? '') : undefined;
    meta.textContent = noun ? (arr.length === 0 ? t('emptyCollection', noun) : t('collectionCount', noun, count)) : count;
    block.classList.toggle('is-list', arr.kind === 'list');
    if (arr.kind === 'stack') {
      // A torre reserva altura e nunca encolhe: a base fica parada e os itens entram e saem por cima.
      const reserve = Math.max(4, arr.values.length, Number(block.dataset.reserve ?? 0));
      block.dataset.reserve = String(reserve);
      block.style.setProperty('--reserve', String(reserve));
    }

    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    for (const ghost of Array.from(list.querySelectorAll('.ghost, .is-missing'))) ghost.remove();
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
    block.classList.remove('is-new');
    const cells = cellsOf(block);
    resetCells(cells);
    void block.offsetWidth; // reinicia as animações CSS
    if (isNew) block.classList.add('is-new');
    const mode = /** @type {'array' | 'stack' | 'queue'} */ (block.dataset.kind ?? 'array');
    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    animateCells(cells, name, changes, mode, list)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** @param {HTMLElement[]} cells */
  function resetCells(cells) {
    for (const cell of cells) {
      cell.classList.remove('is-changed', 'swap-up', 'swap-down', 'slide', 'is-inserted', 'drop-in', 'enter-back');
      cell.style.removeProperty('--dx');
    }
  }

  /**
   * Aplica as classes de animação às caixas de um array (ou de uma linha da
   * matriz) e devolve a primeira caixa que mudou, para rolar até ela.
   * @param {HTMLElement[]} cells
   * @param {string} name
   * @param {Change[]} changes
   * @param {'array' | 'stack' | 'queue' | 'matrix'} [mode]
   * @param {HTMLElement} [list] onde pôr o fantasma de um item que saiu
   * @returns {HTMLElement | undefined}
   */
  function animateCells(cells, name, changes, mode = 'array', list) {
    /** @type {HTMLElement | undefined} */
    let first;
    // Distância entre duas caixas vizinhas: o quanto um item anda quando a lista abre ou fecha espaço.
    const step = cells.length > 1 ? cells[1].offsetLeft - cells[0].offsetLeft : 0;
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
      } else if (c.kind === 'insert' && c.index !== undefined && cells[c.index]) {
        // Pilha: o item cai no topo. Fila: entra pela direita. Lista: surge no lugar e empurra os seguintes.
        const entry = { stack: 'drop-in', queue: 'enter-back' }[mode] ?? 'is-inserted';
        cells[c.index].classList.add('is-changed', entry);
        if (entry === 'is-inserted') cells.slice(c.index + 1).forEach((cell) => slide(cell, -step));
        first ??= cells[c.index];
      } else if (c.kind === 'remove' && c.index !== undefined && list) {
        // O item que saiu continua um instante na tela, indo embora; os outros fecham o espaço junto.
        first ??= ghostOut(list, cells[c.index], c.value ?? '', mode);
      }
    }
    return first;
  }

  /**
   * Cópia do item removido, posta onde ele estava, que sai na direção da
   * estrutura (sobe do topo da pilha, sai pela frente da fila, cai da lista)
   * enquanto encolhe; os vizinhos ocupam o espaço ao mesmo tempo.
   * @param {HTMLElement} list
   * @param {HTMLElement | undefined} before
   * @param {string} value
   * @param {string} mode
   */
  function ghostOut(list, before, value, mode) {
    const ghost = el('li', `cell ghost ghost-${mode}`);
    ghost.setAttribute('aria-hidden', 'true');
    const idx = el('span', 'cell-index');
    const v = el('span', 'cell-value');
    v.textContent = value;
    ghost.append(idx, v);
    list.insertBefore(ghost, before ?? null);
    ghost.addEventListener('animationend', (e) => {
      if (e.target !== ghost) return;
      ghost.remove();
      // Sem o fantasma os vizinhos assentam no lugar final; as etiquetas vão atrás.
      const block = /** @type {HTMLElement | null} */ (list.closest('.array'));
      const kind = block?.dataset.kind;
      if (block && (kind === 'stack' || kind === 'queue')) updateMarkers(block, kind);
    });
    // Sem animação (velocidade desligada ou movimento reduzido) não haverá animationend.
    const style = getComputedStyle(ghost);
    if (style.animationName === 'none' || parseFloat(style.animationDuration) === 0) {
      ghost.remove();
      return undefined;
    }
    return ghost;
  }

  /**
   * Etiquetas que dizem o papel de cada ponta: "top" na pilha, "front" e
   * "back" na fila (o texto vem traduzido). São elementos fixos que só mudam de lugar, então deslizam
   * quando a ponta muda.
   * @param {HTMLElement} block
   * @param {'stack' | 'queue'} kind
   */
  function updateMarkers(block, kind) {
    const layer = /** @type {HTMLElement} */ (block.querySelector('.markers'));
    const cells = cellsOf(block);
    /** @type {[string, HTMLElement | undefined][]} */
    const wanted =
      kind === 'stack'
        ? [['top', cells.at(-1)]]
        : [
            ['front', cells[0]],
            ['back', cells.length > 1 ? cells.at(-1) : undefined],
          ];
    for (const [label, cell] of wanted) {
      let m = /** @type {HTMLElement | null} */ (layer.querySelector(`[data-label="${label}"]`));
      if (!cell) {
        m?.remove();
        continue;
      }
      const appearing = !m;
      if (!m) {
        m = el('span', `marker is-${kind}`);
        m.dataset.label = label;
        const head = el('span', 'marker-head');
        const text = el('span', 'marker-text');
        text.textContent = cells.length === 1 && kind === 'queue' ? t('frontAndBack') : t(label);
        m.append(head, text);
        layer.append(m);
      }
      const text = /** @type {HTMLElement} */ (m.querySelector('.marker-text'));
      text.textContent = kind === 'queue' && label === 'front' && cells.length === 1 ? t('frontAndBack') : t(label);
      // Medidas de layout (offset*), não getBoundingClientRect: o item pode estar no meio
      // da animação de entrada, e a etiqueta deve ir para onde ele vai parar.
      const value = /** @type {HTMLElement} */ (cell.querySelector('.cell-value'));
      const left = cell.offsetLeft + value.offsetLeft;
      const top = cell.offsetTop + value.offsetTop;
      // Pilha: etiqueta à direita do item, no meio da altura. Fila: embaixo, no meio da largura.
      const x = kind === 'stack' ? left + value.offsetWidth + 6 : left + value.offsetWidth / 2;
      const y = kind === 'stack' ? top + value.offsetHeight / 2 : top + value.offsetHeight + 4;
      m.style.setProperty('--x', `${x}px`);
      m.style.setProperty('--y', `${y}px`);
      if (appearing) {
        m.classList.add('no-move');
        void m.offsetWidth;
        m.classList.remove('no-move');
      }
    }
    // Cada caixa também diz o próprio papel para leitores de tela.
    cells.forEach((cell, i) => {
      const base = cell.dataset.label ?? '';
      const role =
        kind === 'stack'
          ? i === cells.length - 1 ? `, ${t('top')}` : ''
          : [i === 0 ? t('front') : '', i === cells.length - 1 ? t('back') : ''].filter(Boolean).join(t('and'));
      cell.setAttribute('aria-label', role ? `${base}${kind === 'stack' ? role : `, ${role}`}` : base);
    });
  }

  /**
   * Caixa que mudou de posição sem mudar de valor: parte de onde estava.
   * @param {HTMLElement} cell
   * @param {number} dx
   */
  function slide(cell, dx) {
    cell.style.setProperty('--dx', `${dx}px`);
    cell.classList.add('slide');
  }

  /** @param {string} name */
  function createMatrixBlock(name) {
    const block = el('article', 'array is-matrix');
    const header = el('header', 'array-header');
    const title = el('h3', 'array-name');
    title.textContent = name;
    header.append(title, el('span', 'array-meta'));
    const track = el('div', 'array-track');
    const grid = el('div', 'matrix');
    grid.setAttribute('role', 'table');
    grid.setAttribute('aria-label', t('matrixLabel', name));
    track.append(grid);
    block.append(header, track);
    return block;
  }

  /**
   * Matriz como grade: índices das colunas em cima, das linhas à esquerda.
   * A variável que indexa a linha aparece ao lado da linha; a da coluna, em
   * cima da coluna; a célula onde as duas se cruzam ganha contorno. A grade é
   * refeita a cada passo, e as animações tocam nas células novas.
   * @param {HTMLElement} block
   * @param {ArrayVar} arr
   * @param {Axes} axes
   * @param {Change[]} changes
   * @param {boolean} isNew
   */
  function updateMatrix(block, arr, axes, changes, isNew) {
    const rows = arr.rows ?? [];
    const cols = Math.max(0, ...rows.map((r) => r.values.length));
    const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
    meta.textContent = `${rows.length} ${t(rows.length === 1 ? 'row' : 'rows')}, ${cols} ${t(cols === 1 ? 'column' : 'columns')}`;

    const grid = /** @type {HTMLElement} */ (block.querySelector('.matrix'));
    grid.style.setProperty('--cols', String(cols));
    /** @type {HTMLElement[]} */
    const parts = [el('div', 'matrix-corner')];
    for (let c = 0; c < cols; c++) {
      const head = el('div', 'matrix-col');
      head.setAttribute('role', 'columnheader');
      if (axes.col?.index === c) head.append(axisPointer(axes.col.name, 'col'));
      const idx = el('span', 'cell-index');
      idx.textContent = String(c);
      head.append(idx);
      parts.push(head);
    }
    /** @type {HTMLElement[][]} */
    const rowCells = [];
    rows.forEach((row, r) => {
      const head = el('div', 'matrix-row');
      head.setAttribute('role', 'rowheader');
      if (axes.row?.index === r) head.append(axisPointer(axes.row.name, 'row'));
      const idx = el('span', 'cell-index');
      idx.textContent = String(r);
      head.append(idx);
      parts.push(head);
      /** @type {HTMLElement[]} */
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const cell = el('div', 'cell');
        cell.setAttribute('role', 'cell');
        const v = el('span', 'cell-value');
        const value = row.values[c] ?? '';
        v.textContent = value;
        v.title = value;
        cell.append(v);
        cell.setAttribute('aria-label', `${row.name}[${c}] = ${value}`);
        if (c >= row.values.length) cell.classList.add('is-empty');
        if (axes.row?.index === r && axes.col?.index === c) cell.classList.add('is-cursor');
        cells.push(cell);
        parts.push(cell);
      }
      rowCells.push(cells);
    });
    grid.replaceChildren(...parts);

    block.classList.remove('is-new');
    void block.offsetWidth;
    if (isNew) block.classList.add('is-new');
    /** @type {HTMLElement | undefined} */
    let first;
    rowCells.forEach((cells, r) => {
      first ??= animateCells(cells, rows[r].name, changes);
    });
    first ??= /** @type {HTMLElement | null} */ (grid.querySelector('.is-cursor')) ?? undefined;
    first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Etiqueta de ponteiro presa a um cabeçalho da matriz.
   * @param {string} name
   * @param {'row' | 'col'} axis
   */
  function axisPointer(name, axis) {
    const p = el('span', `axis-pointer is-${axis}`);
    p.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(name)})`);
    const label = el('span', 'pointer-name');
    label.textContent = name;
    p.append(label, el('span', 'pointer-head'));
    return p;
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
      cell.setAttribute('aria-label', names.length ? t('pointedBy', base, names.join(', ')) : base);
    });
  }

  /**
   * Erro que parou o programa: o que aconteceu em palavras simples e, embaixo,
   * a mensagem original do debugger, para o aluno aprender a ler as duas.
   * @param {ErrorView | undefined} error
   */
  function renderError(error) {
    errorEl.hidden = !error;
    if (!error) return;
    errorTitleEl.textContent = error.title;
    errorTextEl.replaceChildren(
      ...error.sentences.map((text) => {
        const li = el('li', 'error-item');
        li.append(...highlightCode(text));
        return li;
      }),
    );
    errorRawEl.textContent = [error.type, error.message].filter(Boolean).join(': ');
    errorRawEl.hidden = !errorRawEl.textContent;
  }

  /**
   * Objetos: listas ligadas como nós e setas, árvores como árvores, os outros
   * como cartões. Cada variável vira uma etiqueta colorida no objeto para onde
   * aponta; duas etiquetas no mesmo objeto são duas variáveis no mesmo objeto.
   * @param {HeapView | undefined} view
   * @param {HeapDelta | undefined} delta
   */
  function renderHeap(view, delta) {
    const added = new Set(delta?.added ?? []);
    const changed = delta?.fields ?? {};
    /** @type {HTMLElement[]} */
    const parts = [];
    if (view) {
      for (const list of view.lists) parts.push(renderList(list, added, changed));
      for (const tree of view.trees) parts.push(renderTree(tree, added, changed));
      for (const obj of view.objects) parts.push(renderObject(obj, added, changed));
      if (view.nulls.length > 0) {
        const line = el('p', 'heap-nulls');
        for (const name of view.nulls) {
          const chip = el('span', 'heap-null');
          chip.append(nameTag(name), document.createTextNode(` ${t('pointsToNull')}`));
          line.append(chip);
        }
        parts.push(line);
      }
    }
    heapEl.replaceChildren(...parts);
    heapEl.hidden = parts.length === 0;
  }

  /**
   * Etiqueta de variável, na cor fixa daquele nome (a mesma das setas).
   * @param {string} name
   */
  function nameTag(name) {
    const tag = el('span', 'name-tag');
    tag.style.setProperty('--ptr', `var(--cs-ptr-${colorOf(name)})`);
    tag.textContent = name;
    return tag;
  }

  /**
   * Cartão com o título da estrutura, igual aos dos arrays.
   * @param {string} kind
   * @param {string} title
   * @param {string} meta
   */
  function heapCard(kind, title, meta) {
    const block = el('article', `array heap-card is-${kind}`);
    const header = el('header', 'array-header');
    const h = el('h3', 'array-name');
    h.textContent = title;
    const m = el('span', 'array-meta');
    m.textContent = meta;
    header.append(h, m);
    block.append(header);
    return block;
  }

  /**
   * @param {NodeViewT} node
   * @param {Set<string>} added
   * @param {Record<string, string[]>} changed
   */
  function nodeBox(node, added, changed) {
    const box = el('div', 'node-box');
    if (added.has(node.id)) box.classList.add('is-new');
    if (changed[node.id]?.length) box.classList.add('is-changed');
    const value = el('span', 'node-value');
    value.textContent = node.value;
    value.title = node.value;
    box.append(value);
    return box;
  }

  /** @param {string[]} names */
  function nameRow(names) {
    const row = el('div', 'node-names');
    for (const n of names) row.append(nameTag(n));
    return row;
  }

  /**
   * Lista ligada: [10 •]→[20 •]→[30 •]→ null, com as variáveis embaixo de cada nó.
   * @param {ListViewT} list
   * @param {Set<string>} added
   * @param {Record<string, string[]>} changed
   */
  function renderList(list, added, changed) {
    const count = list.nodes.length;
    const block = heapCard('linked', t('linkedTitle', list.type), count === 1 ? t('oneNode') : t('nodes', count));
    const track = el('div', 'array-track');
    const chain = el('ol', 'chain');
    chain.setAttribute('aria-label', t('linkedTitle', list.type));
    list.nodes.forEach((node, i) => {
      const li = el('li', 'chain-node');
      const box = nodeBox(node, added, changed);
      const link = el('span', 'node-link');
      link.setAttribute('aria-hidden', 'true');
      // O campo de ligação que mudou neste passo pisca na seta.
      if (changed[node.id]?.includes(list.link)) link.classList.add('is-changed');
      box.append(link);
      li.append(box, nameRow(node.names));
      li.setAttribute('aria-label', [node.value, ...node.names].join(', '));
      chain.append(li);
      if (i < count - 1 || list.cycle) chain.append(arrowEl());
    });
    const end = el('li', 'chain-end');
    end.textContent = list.cycle ? t('cycle') : 'null';
    if (!list.cycle) chain.append(arrowEl());
    chain.append(end);
    track.append(chain);
    block.append(track);
    return block;
  }

  function arrowEl() {
    const a = el('li', 'chain-arrow');
    a.setAttribute('aria-hidden', 'true');
    return a;
  }

  /**
   * Árvore: cada nó na coluna da sua ordem (em ordem, esquerda para a direita)
   * e na linha da sua profundidade; as ligações são linhas de SVG.
   * @param {TreeViewT} tree
   * @param {Set<string>} added
   * @param {Record<string, string[]>} changed
   */
  function renderTree(tree, added, changed) {
    /** @type {{ node: TreeNodeViewT, x: number, y: number, parent?: { x: number, y: number } }[]} */
    const placed = [];
    let column = 0;
    let depth = 0;
    // Em ordem: a subárvore da esquerda, o nó, a da direita. Cada nó ganha a próxima coluna.
    /**
     * @param {TreeNodeViewT | null} node
     * @param {number} y
     */
    const walk = (node, y) => {
      if (!node) return;
      depth = Math.max(depth, y);
      const [left, ...rest] = node.children;
      walk(left ?? null, y + 1);
      placed.push({ node, x: column++, y });
      for (const child of rest) walk(child, y + 1);
    };
    walk(tree.root, 0);
    // Os filhos só sabem onde está o pai depois que todos têm coluna.
    const where = new Map(placed.map((p) => [p.node.id, p]));
    /** @param {TreeNodeViewT} n */
    const link = (n) => {
      for (const c of n.children) {
        if (!c) continue;
        const child = where.get(c.id);
        const parent = where.get(n.id);
        if (child && parent) child.parent = { x: parent.x, y: parent.y };
        link(c);
      }
    };
    link(tree.root);

    const block = heapCard('tree', t('treeTitle', tree.type), placed.length === 1 ? t('oneNode') : t('nodes', placed.length));
    const track = el('div', 'array-track');
    const area = el('div', 'tree');
    area.style.setProperty('--cols', String(column));
    area.style.setProperty('--rows', String(depth + 1));
    area.setAttribute('role', 'tree');
    area.setAttribute('aria-label', t('treeTitle', tree.type));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-edges');
    svg.setAttribute('viewBox', `0 0 ${column * 2} ${(depth + 1) * 2}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    for (const p of placed) {
      if (!p.parent) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(p.parent.x * 2 + 1));
      line.setAttribute('y1', String(p.parent.y * 2 + 0.7));
      line.setAttribute('x2', String(p.x * 2 + 1));
      line.setAttribute('y2', String(p.y * 2 + 0.7));
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      if (added.has(p.node.id)) line.classList.add('is-new');
      svg.append(line);
    }
    area.append(svg);
    for (const p of placed) {
      const cell = el('div', 'tree-node');
      cell.style.setProperty('--x', String(p.x));
      cell.style.setProperty('--y', String(p.y));
      cell.setAttribute('role', 'treeitem');
      cell.setAttribute('aria-label', [p.node.value, ...p.node.names].join(', '));
      cell.append(nodeBox(p.node, added, changed), nameRow(p.node.names));
      area.append(cell);
    }
    track.append(area);
    block.append(track);
    return block;
  }

  /**
   * Objeto comum: o tipo, as variáveis que apontam para ele e os campos.
   * @param {ObjectViewT} obj
   * @param {Set<string>} added
   * @param {Record<string, string[]>} changed
   */
  function renderObject(obj, added, changed) {
    const block = heapCard('object', obj.type, obj.names.length === 0 ? t('noVariable') : '');
    if (added.has(obj.id)) block.classList.add('is-new');
    const header = /** @type {HTMLElement} */ (block.querySelector('.array-header'));
    const tags = el('span', 'object-names');
    for (const n of obj.names) tags.append(nameTag(n));
    header.querySelector('.array-name')?.after(tags);
    block.setAttribute('aria-label', t('objectLabel', obj.type, obj.names.join(', ') || t('noVariable')));
    const fields = el('dl', 'object-fields');
    for (const f of obj.fields) {
      const dt = el('dt', 'object-field');
      dt.textContent = f.name;
      const dd = el('dd', 'object-value');
      if (changed[obj.id]?.includes(f.name)) dd.classList.add('is-changed');
      if (f.ref === null) dd.textContent = 'null';
      else if (f.ref) dd.textContent = `→ ${f.target ?? ''}`;
      else dd.textContent = f.value;
      dd.title = dd.textContent ?? '';
      fields.append(dt, dd);
    }
    if (obj.truncated) {
      const more = el('p', 'array-rule');
      more.textContent = t('truncated');
      block.append(fields, more);
    } else {
      block.append(fields);
    }
    return block;
  }

  /**
   * Pilha de chamadas: um cartão por chamada, a atual em cima. Só aparece com
   * duas funções ou mais em andamento; o código de fora das funções não conta.
   * Quem acabou de entrar desce no topo; quem terminou sobe e some, dizendo o
   * que devolveu.
   * @param {CallFrame[]} calls do mais antigo ao atual
   * @param {CallChange[]} changes
   */
  function renderCalls(calls, changes) {
    const visible = calls.filter((c) => !c.program).length;
    callsEl.hidden = visible < 2 && !changes.some((c) => c.kind === 'return');
    if (callsEl.hidden) {
      callStackEl.replaceChildren();
      return;
    }
    callsTitleEl.textContent = t('callsTitle');
    callsCountEl.textContent = t('callsCount', visible);
    callsRuleEl.textContent = t('callsRule');

    const entered = new Set(changes.filter((c) => c.kind === 'call').map((c) => c.depth));
    /** @type {HTMLElement[]} */
    const items = [];
    // O topo da pilha fica em cima: a lista é desenhada da chamada atual para a mais antiga.
    for (const c of changes) {
      if (c.kind !== 'return') continue;
      const ghost = el('li', 'call-frame is-leaving');
      ghost.setAttribute('aria-hidden', 'true');
      const head = el('div', 'call-head');
      const name = el('span', 'call-name');
      name.textContent = c.name;
      const note = el('span', 'call-note');
      note.textContent = c.value !== undefined ? t('returned', c.value) : t('finished');
      head.append(name, note);
      ghost.append(head);
      ghost.addEventListener('animationend', () => ghost.remove());
      items.push(ghost);
    }
    for (let k = calls.length - 1; k >= 0; k--) {
      const call = calls[k];
      const isTop = k === calls.length - 1;
      const li = el('li', `call-frame${isTop ? ' is-current' : ''}${entered.has(k) ? ' is-entering' : ''}${call.program ? ' is-program' : ''}`);
      const head = el('div', 'call-head');
      const name = el('span', 'call-name');
      name.textContent = call.program ? t('programFrame') : call.name;
      const line = el('span', 'call-line');
      line.textContent = isTop ? t('callRunning') : t('callLine', call.line);
      head.append(name, line);
      li.append(head);
      // As variáveis da chamada atual já estão logo abaixo; repetir só confundiria.
      if (!isTop && call.vars.length > 0) {
        const vars = el('p', 'call-vars');
        vars.textContent = call.vars.map((v) => `${v.name} = ${v.value}`).join('   ');
        li.append(vars);
      }
      items.push(li);
    }
    callStackEl.replaceChildren(...items);
  }

  /**
   * Caixa tracejada depois do array, na posição que o código tentou usar e
   * não existe. Ela some no passo seguinte.
   * @param {HTMLElement} block
   * @param {string} name
   * @param {{ array: string, index: number } | undefined} missing
   */
  function updateMissing(block, name, missing) {
    const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
    list.querySelector('.cell.is-missing')?.remove();
    if (!missing || missing.array !== name) return;
    const cell = el('li', 'cell is-missing');
    const idx = el('span', 'cell-index');
    idx.textContent = String(missing.index);
    const value = el('span', 'cell-value');
    value.textContent = '?';
    const label = el('span', 'cell-missing-label');
    label.textContent = t('missing');
    cell.append(idx, value, label);
    cell.setAttribute('aria-label', t('missingLabel', name, missing.index));
    list.append(cell);
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Teste de mesa: refeito a cada passo, porque voltar no histórico também
   * encolhe a tabela. A linha atual fica marcada e visível.
   * @param {Trace | undefined} trace
   * @param {number} step
   */
  function renderTrace(trace, step) {
    traceEl.hidden = !trace || trace.columns.length === 0;
    if (!trace || traceEl.hidden) return;
    traceTitleEl.textContent = t('traceTitle');
    traceCountEl.textContent = t('traceSteps', trace.rows.length + trace.hidden);
    traceHiddenEl.hidden = trace.hidden === 0;
    traceHiddenEl.textContent = t('traceHidden', trace.hidden);

    const head = el('thead', '');
    const headRow = el('tr', '');
    for (const label of [t('traceStep'), t('traceLine'), ...(trace.showCalls ? [t('traceCall')] : [])]) {
      const th = el('th', 'trace-meta');
      th.setAttribute('scope', 'col');
      th.textContent = label;
      headRow.append(th);
    }
    for (const name of trace.columns) {
      const th = el('th', 'trace-var');
      th.setAttribute('scope', 'col');
      th.textContent = name;
      headRow.append(th);
    }
    head.append(headRow);

    const body = el('tbody', '');
    /** @type {HTMLElement | undefined} */
    let currentRow;
    for (const row of trace.rows) {
      const tr = el('tr', row.step === step ? 'is-current' : '');
      if (row.step === step) currentRow = tr;
      const stepCell = el('th', 'trace-meta');
      stepCell.setAttribute('scope', 'row');
      const go = el('button', 'trace-goto');
      go.setAttribute('type', 'button');
      go.textContent = String(row.step);
      go.setAttribute('aria-label', t('traceGoto', row.step));
      go.addEventListener('click', () => gotoStep(row.step));
      stepCell.append(go);
      const lineCell = el('td', 'trace-meta');
      lineCell.textContent = String(row.line);
      tr.append(stepCell, lineCell);
      if (trace.showCalls) {
        const callCell = el('td', 'trace-meta trace-call');
        callCell.textContent = row.call ?? '';
        tr.append(callCell);
      }
      row.values.forEach((value, i) => {
        const td = el('td', row.changed[i] ? 'trace-value is-changed' : 'trace-value');
        td.textContent = value ?? '';
        if (value != null) td.title = value;
        tr.append(td);
      });
      body.append(tr);
    }
    traceTableEl.replaceChildren(head, body);
    if (traceEl.open) currentRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    return /** @type {HTMLElement[]} */ (Array.from(block.querySelectorAll('.cell:not(.ghost):not(.is-missing)')));
  }

  /**
   * Texto traduzido, trocando {0}, {1}... pelos valores.
   * @param {string} key
   * @param {...(string | number)} args
   */
  function t(key, ...args) {
    return (T[key] ?? key).replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)]));
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

  /** @param {unknown} v @returns {v is string} */
  function isString(v) {
    return typeof v === 'string';
  }

  /** @param {string} path */
  function basename(path) {
    return path.split(/[\\/]/).pop() || path;
  }

  // Aberto ou fechado, o teste de mesa fica como o aluno deixou.
  /** @type {{ traceOpen?: boolean }} */
  const saved = vscode.getState() ?? {};
  if (saved.traceOpen === false) traceEl.open = false;
  traceEl.addEventListener('toggle', () => vscode.setState({ ...(vscode.getState() ?? {}), traceOpen: traceEl.open }));

  updateChrome();
  vscode.postMessage({ type: 'ready' });
})();
