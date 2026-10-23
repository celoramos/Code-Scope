// @ts-check
(function () {
  // @ts-ignore acquireVsCodeApi é injetado pelo VS Code
  const vscode = acquireVsCodeApi();
  const status = /** @type {HTMLElement} */ (document.getElementById('status'));
  const app = /** @type {HTMLElement} */ (document.getElementById('app'));

  /** @type {HTMLPreElement | undefined} */
  let pre;

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'status') {
      status.textContent = msg.text;
    } else if (msg.type === 'raw') {
      status.textContent = `Parado na linha ${msg.snapshot.line}.`;
      if (!pre) {
        pre = document.createElement('pre');
        pre.className = 'raw';
        app.appendChild(pre);
      }
      pre.textContent = JSON.stringify({ snapshot: msg.snapshot, dap: msg.raw }, null, 2);
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
