// @ts-check
// Dicionários e grafos.
import { el, mapsEl, t } from './dom.js';
import { heapCard } from './heap.js';
/** @typedef {import('./types.js').Change} Change */
/** @typedef {import('./types.js').GraphViewT} GraphViewT */
/** @typedef {import('./types.js').MapVar} MapVar */

/**
 * Grafo: os nós num círculo e as ligações entre eles. Visitado fica
 * preenchido, o atual ganha contorno forte, quem espera na fila ou na pilha
 * fica tracejado com a ordem de saída.
 * @param {GraphViewT} g
 */
function renderGraph(g) {
  const block = heapCard('graph', g.name, t('graphMeta', g.nodes.length, g.edges.length));
  const svgNs = 'http://www.w3.org/2000/svg';
  const size = 200;
  const radius = g.nodes.length <= 2 ? 50 : 72;
  // Ordem no círculo seguindo as ligações (em profundidade): vizinhos ficam lado a lado
  // e as linhas quase não se cruzam no meio.
  /** @type {Map<string, string[]>} */
  const adj = new Map(g.nodes.map((n) => [n, []]));
  for (const [a, b] of g.edges) {
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }
  /** @type {string[]} */
  const ring = [];
  /** @param {string} n */
  const visit = (n) => {
    if (ring.includes(n)) return;
    ring.push(n);
    for (const m of adj.get(n) ?? []) visit(m);
  };
  for (const n of g.nodes) visit(n);
  /** @type {Map<string, { x: number, y: number }>} */
  const pos = new Map();
  ring.forEach((n, i) => {
    const angle = (i / g.nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos.set(n, { x: size / 2 + radius * Math.cos(angle), y: size / 2 + radius * Math.sin(angle) });
  });
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('class', 'graph');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('graphLabel', g.name, g.nodes.join(', '), g.visited.join(', ') || '-'));
  const r = 15;
  for (const [a, b] of g.edges) {
    const p = pos.get(a);
    const q = pos.get(b);
    if (!p || !q) continue;
    // A linha começa e termina na borda dos círculos, para a ponta da seta aparecer.
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const line = document.createElementNS(svgNs, 'line');
    line.setAttribute('x1', String(p.x + (dx / len) * r));
    line.setAttribute('y1', String(p.y + (dy / len) * r));
    line.setAttribute('x2', String(q.x - (dx / len) * (r + (g.directed ? 3 : 0))));
    line.setAttribute('y2', String(q.y - (dy / len) * (r + (g.directed ? 3 : 0))));
    line.setAttribute('class', 'graph-edge');
    if (g.directed) line.setAttribute('marker-end', 'url(#cs-arrow)');
    svg.append(line);
  }
  if (g.directed) {
    const defs = document.createElementNS(svgNs, 'defs');
    defs.innerHTML = '<marker id="cs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="graph-arrow" /></marker>';
    svg.prepend(defs);
  }
  for (const n of g.nodes) {
    const p = pos.get(n);
    if (!p) continue;
    const order = g.frontier.indexOf(n);
    const cls = ['graph-node'];
    if (g.visited.includes(n)) cls.push('is-visited');
    if (g.current === n) cls.push('is-current');
    if (order >= 0) cls.push('is-waiting');
    const group = document.createElementNS(svgNs, 'g');
    group.setAttribute('class', cls.join(' '));
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', String(p.x));
    circle.setAttribute('cy', String(p.y));
    circle.setAttribute('r', String(r));
    const label = document.createElementNS(svgNs, 'text');
    label.setAttribute('x', String(p.x));
    label.setAttribute('y', String(p.y));
    label.textContent = n;
    group.append(circle, label);
    if (order >= 0) {
      const badge = document.createElementNS(svgNs, 'text');
      badge.setAttribute('x', String(p.x + r));
      badge.setAttribute('y', String(p.y - r));
      badge.setAttribute('class', 'graph-order');
      badge.textContent = String(order + 1);
      group.append(badge);
    }
    svg.append(group);
  }
  const track = el('div', 'array-track');
  track.append(svg);
  const legend = el('p', 'graph-legend');
  for (const [cls, text] of [
    ['is-visited', t('legendVisited')],
    ['is-current', t('legendCurrent')],
    ['is-waiting', t('legendWaiting')],
  ]) {
    const item = el('span', `graph-key ${cls}`);
    item.textContent = text;
    legend.append(item);
  }
  block.append(track, legend);
  return block;
}

/**
 * Dicionários: uma tabela chave e valor. A chave nova entra deslizando; o
 * valor trocado pisca.
 * @param {MapVar[]} maps
 * @param {Change[]} changes
 * @param {GraphViewT[]} [graphs] dicionários que são grafos: desenhados como grafo
 */
export function renderMaps(maps, changes, graphs = []) {
  const graphNames = new Set(graphs.map((g) => g.name));
  mapsEl.replaceChildren(
    ...graphs.map(renderGraph),
    ...maps.filter((map) => !graphNames.has(map.name)).map((map) => {
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
