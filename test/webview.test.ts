import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import { makeFrame } from '../src/model/frame';
import { History } from '../src/model/history';
import type { Language } from '../src/model/messages';
import { VALUE_NAMES } from '../src/model/pointers';
import type { Snapshot } from '../src/model/snapshot';
import { panelHtml } from '../src/webview/html';
import type { FromWebview, ToWebview } from '../src/webview/scopeViewProvider';

const root = path.join(__dirname, '..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webview } = require('../esbuild.js') as { webview: esbuild.BuildOptions };
// O script do painel empacotado na hora, com as opções do build: o teste nunca roda um dist velho.
const mainJs = esbuild.buildSync({ ...webview, absWorkingDir: root, write: false }).outputFiles[0].text;
const axeJs = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Snapshots coletados dos exemplos em Java com o debugger real (só os snapshots, sem o caminho local). */
function fixture(name: string): Snapshot[] {
  return JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'panel', `${name}.json`), 'utf8'));
}

/** O painel de verdade (HTML e main.js) num DOM, com um VS Code falso do outro lado. */
function openPanel(language: Language = 'pt') {
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.message));
  const html = panelHtml({ cspSource: '', cssUri: 'main.css', jsUri: 'main.js', nonce: 'n', present: false, language });
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const win = dom.window as unknown as Window & { eval(code: string): unknown; CSS: unknown; acquireVsCodeApi: unknown };
  const sent: FromWebview[] = [];
  win.acquireVsCodeApi = () => ({ postMessage: (m: FromWebview) => sent.push(m), getState: () => undefined, setState: () => {} });
  // O jsdom não tem CSS.escape (os nomes dos exemplos são simples) nem rolagem.
  win.CSS = { escape: (s: string) => s };
  dom.window.Element.prototype.scrollIntoView = () => {};
  win.eval(mainJs);

  const post = (msg: ToWebview) => win.dispatchEvent(new dom.window.MessageEvent('message', { data: msg }));
  const history = new History();
  const options = { valueNames: VALUE_NAMES, beginnerMode: true, language };
  const show = () => {
    const step = history.current();
    if (step) post({ type: 'render', frame: makeFrame(step, options) });
  };
  post({ type: 'session', state: 'running' });
  return {
    doc: dom.window.document,
    errors,
    sent,
    /** Uma parada do debugger: entra no histórico e é desenhada, como no F10. */
    stop(snapshot: Snapshot) {
      history.push(snapshot);
      show();
    },
    goto(step: number) {
      history.goto(step);
      show();
    },
    post,
  };
}

/** Roda o exemplo inteiro, passo a passo, e devolve o painel no último passo. */
function replay(name: string, language: Language = 'pt', each?: (panel: ReturnType<typeof openPanel>, i: number) => void) {
  const panel = openPanel(language);
  fixture(name).forEach((s, i) => {
    panel.stop(s);
    each?.(panel, i);
  });
  assert.deepEqual(panel.errors, [], `erros no painel em ${name}`);
  return panel;
}

const visible = (doc: Document, id: string) => !(doc.getElementById(id) as HTMLElement).hidden;
const texts = (doc: Document, selector: string) => [...doc.querySelectorAll(selector)].map((e) => e.textContent ?? '');

describe('painel (main.js num DOM)', () => {
  for (const name of ['BubbleSort', 'Pilha', 'Fila', 'Matriz', 'ListaLigada', 'Fibonacci', 'Grafo', 'Dicionario', 'TrataErro', 'Texto', 'BuscaBinaria']) {
    it(`${name}: todos os passos desenham sem erro, em português e em inglês`, () => {
      replay(name, 'pt');
      replay(name, 'en');
    });
  }

  it('leitor de tela: o axe-core não acha problema de ARIA nem de rótulo no começo, no meio e no fim dos exemplos', async function () {
    this.timeout(60_000);
    // Só as regras de estrutura (ARIA, rótulos, listas); contraste fica de fora, o jsdom não calcula CSS.
    const runOnly = { type: 'tag' as const, values: ['cat.aria', 'cat.forms', 'cat.name-role-value', 'cat.structure'] };
    const problems = new Set<string>();
    for (const name of ['BubbleSort', 'Pilha', 'Fila', 'Matriz', 'ListaLigada', 'Fibonacci', 'Grafo', 'Dicionario', 'TrataErro', 'Texto', 'BuscaBinaria', 'Conjunto']) {
      const panel = openPanel();
      const win = panel.doc.defaultView as unknown as { eval(code: string): unknown; axe: typeof import('axe-core') };
      win.eval(axeJs);
      // Começo, meio e fim de cada exemplo: o axe leva centenas de ms por passo no jsdom.
      const steps = fixture(name);
      const check = new Set([1, Math.ceil(steps.length / 2), steps.length]);
      for (const [i, s] of steps.entries()) {
        panel.stop(s);
        if (!check.has(i + 1)) continue;
        const result = await win.axe.run(panel.doc.documentElement, { runOnly, resultTypes: ['violations'] });
        for (const v of result.violations) for (const node of v.nodes) problems.add(`${name} passo ${i + 1}: ${v.id} em ${node.target.join(' ')}`);
      }
    }
    assert.deepEqual([...problems], []);
  });

  it('antes do debug mostra o estado vazio e, depois da primeira parada, a barra de passos', () => {
    const panel = openPanel();
    assert.equal(visible(panel.doc, 'empty'), true);
    assert.equal(visible(panel.doc, 'toolbar'), false);
    panel.stop(fixture('BubbleSort')[0]);
    assert.equal(visible(panel.doc, 'empty'), false);
    assert.equal(visible(panel.doc, 'toolbar'), true);
    assert.equal(panel.doc.getElementById('file')?.textContent, 'BubbleSort.java');
  });

  it('conjunto: caixas sem posição, "conjunto" no título e o add repetido explicado', () => {
    const panel = replay('Conjunto');
    const block = panel.doc.querySelector('.array.is-set');
    assert.ok(block, 'o conjunto não foi desenhado como conjunto');
    assert.match(block.querySelector('.array-meta')?.textContent ?? '', /^conjunto, 3 itens$/);
    assert.deepEqual([...block.querySelectorAll('.cell-value')].map((c) => c.textContent).sort(), ['1', '2', '3']);
    assert.match(block.querySelector('.cell')?.getAttribute('aria-label') ?? '', /^vistos contém /);
    // Algum passo do exemplo adiciona um número que já estava.
    const seen: string[] = [];
    replay('Conjunto', 'pt', (p) => seen.push(texts(p.doc, '#explanation li').join(' ')));
    assert.ok(seen.some((t) => t.includes('não guarda repetidos')), `explicações: ${JSON.stringify(seen)}`);
  });

  it('lista que ganha um bloco de itens num passo: todos surgem juntos e a frase lista os itens', () => {
    const panel = openPanel();
    const step = (values: string[], line: number): Snapshot => ({
      line,
      file: 'Lista.java',
      arrays: [{ name: 'lista', values, length: values.length, kind: 'list' }],
      pointers: [],
    });
    panel.stop(step(['"a"'], 5));
    panel.stop(step(['"a"', '"b"', '"c"'], 6));
    const inserted = [...panel.doc.querySelectorAll('.array .cell.is-inserted .cell-value')].map((c) => c.textContent);
    assert.deepEqual(inserted, ['"b"', '"c"']);
    assert.ok(texts(panel.doc, '#explanation li').some((t) => t.includes('ganhou "b" e "c" no fim')), texts(panel.doc, '#explanation li').join(' | '));
    assert.deepEqual(panel.errors, []);
  });

  it('array: uma célula por posição, com os valores do programa', () => {
    const panel = replay('BubbleSort');
    const values = texts(panel.doc, '#arrays .cell-value');
    const last = fixture('BubbleSort').at(-1) as Snapshot;
    assert.deepEqual(values, last.arrays[0].values);
  });

  it('linha do tempo: voltar redesenha o passo antigo e liga o botão de avançar', () => {
    const panel = replay('BubbleSort');
    const counter = () => panel.doc.getElementById('counter')?.textContent;
    const total = fixture('BubbleSort').length;
    assert.match(counter() ?? '', new RegExp(`${total}`));
    panel.goto(1);
    assert.deepEqual(texts(panel.doc, '#arrays .cell-value'), fixture('BubbleSort')[0].arrays[0].values);
    assert.equal((panel.doc.getElementById('forward') as HTMLButtonElement).disabled, false);
    assert.equal((panel.doc.getElementById('back') as HTMLButtonElement).disabled, true);
    assert.equal(panel.errors.length, 0);
  });

  it('botões e teclas pedem passos à extensão', () => {
    const panel = replay('BubbleSort');
    panel.goto(3);
    (panel.doc.getElementById('back') as HTMLButtonElement).click();
    (panel.doc.getElementById('forward') as HTMLButtonElement).click();
    assert.deepEqual(
      panel.sent.filter((m) => m.type === 'back' || m.type === 'forward').map((m) => m.type),
      ['back', 'forward'],
    );
  });

  it('pilha e fila ganham o desenho próprio', () => {
    assert.ok(replay('Pilha').doc.querySelector('#arrays [data-kind="stack"]'));
    assert.ok(replay('Fila').doc.querySelector('#arrays [data-kind="queue"]'));
    assert.ok(replay('Matriz').doc.querySelector('#arrays [data-kind="matrix"]'));
  });

  it('a matriz é uma tabela para o leitor de tela: linhas com cabeçalho e células', () => {
    const table = replay('Matriz').doc.querySelector('.matrix[role="table"]') as HTMLElement;
    const rows = [...table.children];
    assert.ok(rows.every((r) => r.getAttribute('role') === 'row'), 'filho da tabela fora de uma linha');
    const [head, ...body] = rows;
    const cols = head.querySelectorAll('[role="columnheader"]').length;
    assert.ok(cols > 0);
    for (const r of body) {
      assert.equal(r.querySelectorAll('[role="rowheader"]').length, 1);
      assert.equal(r.querySelectorAll('[role="cell"]').length, cols);
    }
  });

  it('condição do laço aparece com os valores', () => {
    let seen = false;
    replay('BubbleSort', 'pt', (p) => {
      if (visible(p.doc, 'condition')) seen ||= (p.doc.querySelector('.condition-values')?.textContent ?? '') !== '';
    });
    assert.ok(seen, 'nenhum passo mostrou a condição com valores');
  });

  it('lista ligada aparece como objetos ligados', () => {
    let seen = false;
    replay('ListaLigada', 'pt', (p) => {
      seen ||= visible(p.doc, 'heap') && p.doc.querySelectorAll('#heap .node-value').length > 1;
    });
    assert.ok(seen);
  });

  it('recursão dividida desenha a árvore de chamadas', () => {
    let seen = false;
    replay('Fibonacci', 'pt', (p) => {
      seen ||= visible(p.doc, 'call-tree') && p.doc.querySelectorAll('#call-tree .call-node-label').length > 2;
    });
    assert.ok(seen);
  });

  it('dicionário vira tabela e o grafo ganha legenda', () => {
    let table = false;
    replay('Dicionario', 'pt', (p) => {
      table ||= visible(p.doc, 'maps') && p.doc.querySelectorAll('#maps .map-key').length > 0;
    });
    assert.ok(table);
    let graph = false;
    replay('Grafo', 'pt', (p) => {
      graph ||= p.doc.querySelector('#maps .graph-legend') !== null;
    });
    assert.ok(graph);
  });

  it('erro do programa vira o cartão de erro', () => {
    let seen = false;
    replay('TrataErro', 'pt', (p) => {
      seen ||= visible(p.doc, 'error') && (p.doc.getElementById('error-title')?.textContent ?? '') !== '';
    });
    assert.ok(seen);
  });

  it('busca binária mostra o custo com as curvas', () => {
    let seen = false;
    replay('BuscaBinaria', 'pt', (p) => {
      seen ||= visible(p.doc, 'cost') && p.doc.querySelectorAll('#cost-rows tr').length > 0;
    });
    assert.ok(seen);
  });

  it('em inglês o texto do painel é inglês', () => {
    const panel = replay('BubbleSort', 'en');
    assert.equal(panel.doc.documentElement.lang, 'en');
    assert.match(panel.doc.getElementById('counter')?.textContent ?? '', /Step/);
  });

  it('reset volta ao estado vazio', () => {
    const panel = replay('Pilha');
    panel.post({ type: 'reset' });
    panel.post({ type: 'session', state: 'idle' });
    assert.equal(visible(panel.doc, 'empty'), true);
    assert.equal(panel.doc.querySelectorAll('#arrays > *').length, 0);
  });
});
