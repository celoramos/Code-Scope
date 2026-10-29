// @ts-check
// Arrays, listas, pilhas, filas e matrizes: células, setas, marcadores e animações.
import { el, t } from './dom.js';
import { nameRow } from './heap.js';
import { cellsOf, colorOf } from './state.js';
/** @typedef {import('./types.js').ArrayVar} ArrayVar */
/** @typedef {import('./types.js').Arrow} Arrow */
/** @typedef {import('./types.js').Axes} Axes */
/** @typedef {import('./types.js').Change} Change */
/** @typedef {import('./types.js').CellObjectT} CellObjectT */
/** @typedef {import('./types.js').HeapDelta} HeapDelta */
/** @typedef {import('./types.js').ArrayFocus} ArrayFocus */

/**
 * Posições que guardam objetos: embaixo do valor principal vão os outros
 * campos e as variáveis que apontam para aquele objeto (melhor = turma[0]).
 * @param {HTMLElement} block
 * @param {CellObjectT[] | undefined} objects
 * @param {HeapDelta | undefined} delta
 */
export function updateCellObjects(block, objects, delta) {
  const cells = cellsOf(block);
  for (const cell of cells) {
    cell.classList.remove('is-object', 'is-field-changed');
    cell.querySelector('.cell-object')?.remove();
  }
  for (const o of objects ?? []) {
    const cell = cells[o.index];
    if (!cell) continue;
    cell.classList.add('is-object');
    if (delta?.fields[o.id]?.length) cell.classList.add('is-field-changed');
    const extra = el('div', 'cell-object');
    if (o.type) {
      const type = el('span', 'cell-type');
      type.textContent = o.type;
      extra.append(type);
    }
    for (const d of o.details) {
      const line = el('span', 'cell-detail');
      line.textContent = d;
      extra.append(line);
    }
    if (o.names.length > 0) extra.append(nameRow(o.names));
    cell.append(extra);
    const base = cell.getAttribute('aria-label') ?? '';
    cell.setAttribute('aria-label', [base, ...o.details, ...o.names].filter(Boolean).join(', '));
  }
}

/**
 * Posições que a próxima condição compara ficam contornadas; as que a busca
 * já descartou ficam apagadas.
 * @param {HTMLElement} block
 * @param {ArrayFocus | undefined} focus
 */
export function updateFocus(block, focus) {
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
 * Título do array com todos os nomes que apontam para ele e o aviso de que
 * não é cópia.
 * @param {HTMLElement} block
 * @param {string[]} names
 */
export function setNames(block, names) {
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

/** @param {string} name */
/**
 * @param {string} name
 * @param {'array' | 'stack' | 'queue'} kind
 */
export function createBlock(name, kind) {
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
export function updateBlock(block, arr) {
  const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
  const collection = arr.kind === 'list' || arr.kind === 'stack' || arr.kind === 'queue' || arr.kind === 'text' || arr.kind === 'set';
  const unit = arr.kind === 'text' ? [t('letter'), t('letters')] : collection ? [t('item'), t('items')] : [t('position'), t('positions')];
  const count =
    arr.values.length < arr.length
      ? t('partial', arr.values.length, arr.length, unit[1])
      : `${arr.length} ${arr.length === 1 ? unit[0] : unit[1]}`;
  const noun = collection ? t(arr.kind ?? '') : undefined;
  const empty = arr.kind === 'text' ? t('emptyText') : arr.kind === 'set' ? t('emptySet') : t('emptyCollection', noun ?? '');
  meta.textContent = noun ? (arr.length === 0 ? empty : t('collectionCount', noun, count)) : count;
  block.classList.toggle('is-list', arr.kind === 'list');
  // Conjunto não tem posição: as caixas ficam sem o número em cima.
  block.classList.toggle('is-set', arr.kind === 'set');
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
    cell.dataset.label = arr.kind === 'set' ? t('setItemLabel', arr.name, value) : `${arr.name}[${i}] = ${value}`;
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
export function animateBlock(block, name, changes, isNew) {
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
    } else if (c.kind === 'insert-many' && c.index !== undefined && c.values) {
      // O bloco inteiro surge junto, e os itens depois dele andam o tamanho do bloco.
      const block = cells.slice(c.index, c.index + c.values.length);
      block.forEach((cell) => cell.classList.add('is-changed', 'is-inserted'));
      if (c.shifted) cells.slice(c.index + c.values.length).forEach((cell) => slide(cell, -step * block.length));
      first ??= block[0];
    } else if (c.kind === 'remove-many' && c.index !== undefined && c.values && list) {
      for (const value of c.values) first ??= ghostOut(list, cells[c.index], value, mode);
    } else if (c.kind === 'set-add') {
      // Conjunto: o item novo aparece onde o debugger o pôs, sem empurrar ninguém.
      const cell = cells.find((x) => x.querySelector('.cell-value')?.textContent === c.value);
      if (cell) {
        cell.classList.add('is-changed', 'is-inserted');
        first ??= cell;
      }
    } else if (c.kind === 'set-remove' && list) {
      first ??= ghostOut(list, undefined, c.value ?? '', mode);
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
export function updateMarkers(block, kind) {
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
export function createMatrixBlock(name) {
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
export function updateMatrix(block, arr, axes, changes, isNew) {
  const rows = arr.rows ?? [];
  const cols = Math.max(0, ...rows.map((r) => r.values.length));
  const meta = /** @type {HTMLElement} */ (block.querySelector('.array-meta'));
  meta.textContent = `${rows.length} ${t(rows.length === 1 ? 'row' : 'rows')}, ${cols} ${t(cols === 1 ? 'column' : 'columns')}`;

  const grid = /** @type {HTMLElement} */ (block.querySelector('.matrix'));
  grid.style.setProperty('--cols', String(cols));
  // Cada linha num role="row" com display: contents: o leitor de tela lê uma tabela, e a grade CSS
  // continua vendo as células como filhas diretas.
  const headRow = matrixRow();
  headRow.append(el('div', 'matrix-corner'));
  /** @type {HTMLElement[]} */
  const parts = [headRow];
  for (let c = 0; c < cols; c++) {
    const head = el('div', 'matrix-col');
    head.setAttribute('role', 'columnheader');
    if (axes.col?.index === c) head.append(axisPointer(axes.col.name, 'col'));
    const idx = el('span', 'cell-index');
    idx.textContent = String(c);
    head.append(idx);
    headRow.append(head);
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
    const line = matrixRow();
    line.append(head);
    parts.push(line);
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
      line.append(cell);
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

/** Uma linha da tabela da matriz, para o leitor de tela; na tela ela não existe. */
function matrixRow() {
  const row = el('div', 'matrix-line');
  row.setAttribute('role', 'row');
  return row;
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
export function updateArrows(block, arrows) {
  const layer = /** @type {HTMLElement} */ (block.querySelector('.pointers'));
  const cells = cellsOf(block);
  const list = /** @type {HTMLElement} */ (block.querySelector('.cells'));
  layer.style.width = `${list.scrollWidth}px`;

  const keep = new Set();
  /** @type {{ p: HTMLElement, x: number }[]} */
  const placed = [];
  for (const arrow of arrows) {
    keep.add(arrow.name);
    const cell = cells[arrow.index];

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
    placed.push({ p, x });
    if (appearing) {
      p.classList.add('no-move');
      void p.offsetWidth;
      p.classList.remove('no-move');
    }
  }
  for (const p of Array.from(layer.querySelectorAll('.pointer'))) {
    if (!keep.has(/** @type {HTMLElement} */ (p).dataset.name)) p.remove();
  }

  // Etiqueta que encostaria na anterior desce uma linha: duas setas na mesma posição, e também
  // um nome comprido ao lado de outro ("inicio" e "encontradoEm" em posições vizinhas).
  /** @type {number[]} onde termina a última etiqueta de cada linha, em px */
  const ends = [];
  placed.sort((a, b) => a.x - b.x);
  for (const { p, x } of placed) {
    const half = p.offsetWidth / 2;
    // Na posição 0, um nome mais largo que a caixa passaria da borda: só a etiqueta anda para dentro.
    const nudge = Math.max(0, half - x);
    p.style.setProperty('--nudge', `${nudge}px`);
    let row = ends.findIndex((end) => x - half + nudge >= end + 4);
    if (row < 0) row = ends.push(0) - 1;
    ends[row] = x + half + nudge;
    p.style.setProperty('--row', String(row));
  }
  layer.style.setProperty('--rows', String(ends.length));

  // Leitores de tela: a caixa diz quem aponta para ela.
  cells.forEach((cell, i) => {
    const names = arrows.filter((a) => a.index === i).map((a) => a.name);
    const base = cell.dataset.label ?? '';
    cell.setAttribute('aria-label', names.length ? t('pointedBy', base, names.join(', ')) : base);
  });
}

/**
 * Caixa tracejada depois do array, na posição que o código tentou usar e
 * não existe. Ela some no passo seguinte.
 * @param {HTMLElement} block
 * @param {string} name
 * @param {{ array: string, index: number } | undefined} missing
 */
export function updateMissing(block, name, missing) {
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
