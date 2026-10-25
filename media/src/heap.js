// @ts-check
// Objetos: listas ligadas, árvores e objetos soltos.
import { el, heapEl, t } from './dom.js';
import { colorOf } from './state.js';
/** @typedef {import('./types.js').NodeViewT} NodeViewT */
/** @typedef {import('./types.js').TreeNodeViewT} TreeNodeViewT */
/** @typedef {import('./types.js').ListViewT} ListViewT */
/** @typedef {import('./types.js').TreeViewT} TreeViewT */
/** @typedef {import('./types.js').ObjectViewT} ObjectViewT */
/** @typedef {import('./types.js').HeapView} HeapView */
/** @typedef {import('./types.js').HeapDelta} HeapDelta */

/**
 * Objetos: listas ligadas como nós e setas, árvores como árvores, os outros
 * como cartões. Cada variável vira uma etiqueta colorida no objeto para onde
 * aponta; duas etiquetas no mesmo objeto são duas variáveis no mesmo objeto.
 * @param {HeapView | undefined} view
 * @param {HeapDelta | undefined} delta
 */
export function renderHeap(view, delta) {
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
export function heapCard(kind, title, meta) {
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
export function nameRow(names) {
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
