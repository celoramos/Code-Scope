import type { Language } from '../model/messages';
import { PANEL_STRINGS } from './strings';

export interface PanelHtmlOptions {
  cspSource: string;
  cssUri: string;
  jsUri: string;
  nonce: string;
  /** Modo apresentação: o mesmo painel, com letra maior. */
  present: boolean;
  language: Language;
}

/** HTML do painel. Fica fora do provider para os testes montarem o painel sem o VS Code. */
export function panelHtml({ cspSource, cssUri: css, jsUri: js, nonce, present, language }: PanelHtmlOptions): string {
  const { html: t, script } = PANEL_STRINGS[language];
  // JSON dentro de <script>: "<" escapado para nenhum texto fechar a tag.
  const strings = JSON.stringify(script).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="${t.lang}"${present ? ' class="is-present"' : ''}>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'; img-src data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${css}">
  <title>Code Scope</title>
</head>
<body>
  <main id="app">
    <section id="empty" class="empty">
      <svg class="empty-art" viewBox="0 0 120 64" aria-hidden="true">
        <rect x="6" y="14" width="30" height="30" rx="5" />
        <rect x="45" y="14" width="30" height="30" rx="5" class="empty-art-accent" />
        <rect x="84" y="14" width="30" height="30" rx="5" />
        <path d="M60 52 l-5 8 h10 z" class="empty-art-pointer" />
      </svg>
      <h2 id="empty-title" class="empty-title">${t.emptyIdle}</h2>
      <ol class="empty-steps">
        ${t.emptySteps.map((s) => `<li><span>${s}</span></li>`).join('\n        ')}
      </ol>
    </section>

    <header id="toolbar" class="toolbar" hidden>
      <nav class="stepper" aria-label="${t.history}">
        <button id="back" class="icon-button" type="button" aria-label="${t.previous}" title="${t.previousTitle}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
        </button>
        <div class="step">
          <span id="counter" class="counter"></span>
          <input id="timeline" class="timeline" type="range" min="1" max="1" value="1" aria-label="${t.gotoStep}">
        </div>
        <button id="forward" class="icon-button" type="button" aria-label="${t.next}" title="${t.nextTitle}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
        </button>
      </nav>
      <div class="toolbar-actions">
        <button id="live" class="link-button" type="button" hidden>${t.live}</button>
        <button id="predict-toggle" class="toggle-button" type="button" aria-pressed="false">${t.predictMode}</button>
        <button id="save-image" class="toggle-button" type="button">${t.saveImage}</button>
      </div>
      <p class="location">
        <span id="file" class="location-file"></span>
        <span id="ended" class="badge" hidden>${t.sessionEnded}</span>
      </p>
      <dl id="code" class="code-lines"></dl>
      <div id="condition" class="condition" hidden></div>
      <section id="predict" class="predict" aria-live="polite" hidden>
        <form id="predict-form" class="predict-form" hidden>
          <label id="predict-question" class="predict-question" for="predict-input"></label>
          <div class="predict-row">
            <input id="predict-input" class="predict-input" type="text" autocomplete="off" spellcheck="false">
            <button id="predict-save" class="predict-save" type="submit">${t.predictSave}</button>
          </div>
        </form>
        <p id="predict-status" class="predict-status"></p>
      </section>
    </header>

    <p id="status" class="status" role="status" aria-live="polite"></p>
    <section id="error" class="error-card" role="alert" hidden>
      <h2 id="error-title" class="error-title"></h2>
      <ul id="error-text" class="error-text"></ul>
      <p id="error-raw" class="error-raw"></p>
    </section>
    <ul id="explanation" class="explanation" aria-live="polite" aria-label="${t.explanation}"></ul>
    <section id="calls" class="calls" aria-labelledby="calls-title" hidden>
      <header class="calls-header">
        <h3 id="calls-title" class="calls-title"></h3>
        <span id="calls-count" class="calls-count"></span>
      </header>
      <ol id="call-stack" class="call-stack"></ol>
      <p id="calls-rule" class="array-rule"></p>
    </section>
    <section id="call-tree" class="arrays heap" aria-label="${t.callTree}" hidden></section>
    <ul id="vars" class="vars" aria-label="${t.variables}"></ul>
    <p id="stats" class="stats" hidden></p>
    <details id="cost" class="cost" hidden>
      <summary id="cost-title"></summary>
      <table class="cost-table"><thead><tr id="cost-head"></tr></thead><tbody id="cost-rows"></tbody></table>
      <p id="cost-program" class="cost-note"></p>
    </details>
    <section id="arrays" class="arrays" aria-label="${t.arrays}"></section>
    <section id="maps" class="arrays heap" aria-label="${t.maps}" hidden></section>
    <section id="heap" class="arrays heap" aria-label="${t.objects}" hidden></section>
    <details id="trace" class="trace" open hidden>
      <summary class="trace-summary"><span id="trace-title" class="trace-title"></span><span id="trace-count" class="trace-count"></span></summary>
      <p id="trace-hidden" class="trace-note" hidden></p>
      <div class="trace-scroll"><table id="trace-table" class="trace-table"></table></div>
    </details>
  </main>
  <script id="strings" type="application/json">${strings}</script>
  <script nonce="${nonce}" src="${js}"></script>
</body>
</html>`;
}
