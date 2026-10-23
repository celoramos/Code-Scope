// @ts-check
(function () {
  // @ts-ignore acquireVsCodeApi é injetado pelo VS Code
  const vscode = acquireVsCodeApi();
  const status = /** @type {HTMLElement} */ (document.getElementById('status'));

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'status') {
      status.textContent = msg.text;
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
