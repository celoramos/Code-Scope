// @ts-check
// Pilha de chamadas e árvore de recursão.
import { callStackEl, callTreeEl, callsCountEl, callsEl, callsRuleEl, callsTitleEl, el, t } from './dom.js';
import { heapCard } from './heap.js';
/** @typedef {import('./types.js').CallFrame} CallFrame */
/** @typedef {import('./types.js').CallChange} CallChange */
/** @typedef {import('./types.js').CallNodeT} CallNodeT */
/** @typedef {import('./types.js').CallTreeT} CallTreeT */

/**
 * Árvore de recursão: as folhas ganham as colunas em ordem e cada chamada
 * fica centrada em cima das que ela fez. Quem ainda roda tem a borda da
 * linha ativa; quem terminou mostra o que devolveu.
 * @param {CallTreeT | undefined} tree
 */
export function renderCallTree(tree) {
  callTreeEl.hidden = !tree;
  if (!tree) {
    callTreeEl.replaceChildren();
    return;
  }
  /** @type {{ node: CallNodeT, x: number, y: number, parent?: { x: number, y: number } }[]} */
  const placed = [];
  let column = 0;
  let depth = 0;
  /**
   * @param {CallNodeT} node
   * @param {number} y
   * @returns {number} a coluna do nó
   */
  const place = (node, y) => {
    depth = Math.max(depth, y);
    const xs = node.children.map((c) => place(c, y + 1));
    const x = xs.length > 0 ? (xs[0] + xs[xs.length - 1]) / 2 : column++;
    const spot = { node, x, y };
    placed.push(spot);
    return x;
  };
  // O tronco (main, código principal) fica de fora: a árvore começa na primeira chamada que chama a si mesma.
  /** @type {CallNodeT[]} */
  const queue = [tree.root];
  let top = tree.root;
  while (queue.length > 0) {
    const n = /** @type {CallNodeT} */ (queue.shift());
    if (isRecursive(n)) {
      top = n;
      break;
    }
    queue.push(...n.children);
  }
  place(top, 0);
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  for (const p of placed) {
    for (const c of p.node.children) {
      const child = byId.get(c.id);
      if (child) child.parent = { x: p.x, y: p.y };
    }
  }

  const block = heapCard('call-tree', t('callTreeTitle'), t('callTreeMeta', tree.calls));
  const track = el('div', 'array-track');
  const area = el('div', 'tree call-tree');
  area.style.setProperty('--cols', String(Math.max(column, 1)));
  area.style.setProperty('--rows', String(depth + 1));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tree-edges');
  svg.setAttribute('viewBox', `0 0 ${Math.max(column, 1) * 2} ${(depth + 1) * 2}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  for (const p of placed) {
    if (!p.parent) continue;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(p.parent.x * 2 + 1));
    line.setAttribute('y1', String(p.parent.y * 2 + 0.6));
    line.setAttribute('x2', String(p.x * 2 + 1));
    line.setAttribute('y2', String(p.y * 2 + 0.6));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
  }
  area.append(svg);
  for (const p of placed) {
    const cell = el('div', `tree-node call-node${p.node.active ? ' is-active' : ''}${p.node.done ? ' is-done' : ''}`);
    cell.style.setProperty('--x', String(p.x));
    cell.style.setProperty('--y', String(p.y));
    const box = el('span', 'call-node-label');
    box.textContent = p.node.label;
    cell.append(box);
    if (p.node.returned !== undefined) {
      const ret = el('span', 'call-node-returned');
      ret.textContent = `= ${p.node.returned}`;
      cell.append(ret);
    }
    area.append(cell);
  }
  track.append(area);
  block.append(track);
  const rule = el('p', 'array-rule');
  const worst = Object.entries(tree.repeated).sort((a, b) => b[1] - a[1])[0];
  rule.textContent = worst ? `${t('callTreeRule')} ${t('callTreeRepeated', worst[0], worst[1])}` : t('callTreeRule');
  block.append(rule);
  callTreeEl.replaceChildren(block);
}

/** @param {CallNodeT} n */
function isRecursive(n) {
  return n.children.some((c) => c.name === n.name);
}

/**
 * Pilha de chamadas: um cartão por chamada, a atual em cima. Só aparece com
 * duas funções ou mais em andamento; o código de fora das funções não conta.
 * Quem acabou de entrar desce no topo; quem terminou sobe e some, dizendo o
 * que devolveu.
 * @param {CallFrame[]} calls do mais antigo ao atual
 * @param {CallChange[]} changes
 */
export function renderCalls(calls, changes) {
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
    name.textContent = call.program ? t('programFrame') : call.owner ? `${call.owner}.${call.name}` : call.name;
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
