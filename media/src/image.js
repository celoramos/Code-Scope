// @ts-check
// Imagem do passo (PNG) e a execução inteira (GIF).
import { byId, status, t, timeline, vscode } from './dom.js';
import { encodeGif, pickSteps, quantize } from './gif.js';
import { current, nextRender } from './state.js';

// ---------- Imagem do passo ----------
// O painel vira um SVG com o próprio HTML e o CSS dentro (foreignObject), que
// é desenhado num canvas e salvo como PNG: serve para slides e listas de exercício.
/** @type {((css: string) => void) | undefined} */
let cssReady;
const saveImageBtn = byId('save-image');
const saveGifBtn = /** @type {HTMLButtonElement} */ (byId('save-gif'));
saveImageBtn.addEventListener('click', () => void exportImage());
saveGifBtn.addEventListener('click', () => void exportGif());

/** Passos no GIF: mais que isso pesa demais para compartilhar. */
const MAX_GIF_STEPS = 80;
/** Centésimos de segundo em cada passo e no último, antes de recomeçar. */
const GIF_DELAY = 90;
const GIF_LAST_DELAY = 300;

/**
 * A extensão respondeu com o CSS que a imagem leva dentro.
 * @param {string} css
 */
export function cssArrived(css) {
  cssReady?.(css);
  cssReady = undefined;
}

/** @returns {Promise<string>} */
function requestCss() {
  return new Promise((resolve) => {
    cssReady = resolve;
    vscode.postMessage({ type: 'export-css' });
  });
}

/**
 * Desenha o painel como está agora num canvas.
 * @param {string} css
 * @param {number} scale
 */
async function drawPanel(css, scale) {
  const app = byId('app');
  // Durante a exportação o teste de mesa abre inteiro, para a altura medida ser a da imagem.
  document.documentElement.classList.add('is-exporting');
  const pad = 16;
  const width = Math.ceil(app.scrollWidth) + pad * 2;
  const height = Math.ceil(app.scrollHeight) + pad * 2;
  // As cores do tema vêm do VS Code no style do <html>; vão junto para a imagem.
  const themeVars = document.documentElement.getAttribute('style') ?? '';
  const bg = getComputedStyle(document.body).backgroundColor;
  const style =
    css.replace(/:root/g, '.cs-export').replace(/\bbody\b/g, '.cs-export') +
    // Sem animação: na imagem, quem estivesse no começo de uma entrada sairia invisível.
    '*{animation:none!important;transition:none!important}.toolbar-actions,.predict-form,.find{display:none!important}';
  // O valor atual de um controle é propriedade, não atributo: sem isto a linha do tempo sairia no começo.
  timeline.setAttribute('value', timeline.value);
  const content = new XMLSerializer().serializeToString(app);
  const rootClass = document.documentElement.className;
  document.documentElement.classList.remove('is-exporting');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="cs-export ${rootClass}" style="${escapeXml(themeVars)};background:${bg};padding:${pad}px;box-sizing:border-box;width:${width}px;min-height:${height}px">` +
    `<style>${escapeXml(style)}</style>${content}</div></foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d', { willReadFrequently: scale === 1 });
  if (!ctx) return undefined;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

async function exportImage() {
  if (!current) return;
  const step = current.step;
  // Dobro de pixels: a imagem fica nítida no projetor e no slide.
  const drawn = await drawPanel(await requestCss(), 2);
  if (!drawn) return;
  const data = drawn.canvas.toDataURL('image/png').split(',')[1];
  vscode.postMessage({ type: 'save-image', data, step });
}

/** Passa por cada passo do histórico desenhando, e devolve o painel onde estava. */
async function exportGif() {
  if (!current || saveGifBtn.disabled) return;
  saveGifBtn.disabled = true;
  const back = current.step;
  const total = current.total;
  const steps = pickSteps(total, MAX_GIF_STEPS);
  try {
    const css = await requestCss();
    /** @type {import('./gif.js').GifFrame[]} */
    const frames = [];
    for (const [k, step] of steps.entries()) {
      status.textContent = t('gifProgress', k + 1, steps.length);
      await showStep(step);
      const drawn = await drawPanel(css, 1);
      if (!drawn) return;
      const { width, height } = drawn.canvas;
      frames.push(quantize(drawn.ctx.getImageData(0, 0, width, height).data, width, height));
    }
    await showStep(back);
    vscode.postMessage({ type: 'save-gif', data: toBase64(encodeGif(frames, GIF_DELAY, GIF_LAST_DELAY)) });
    status.textContent = steps.length < total ? t('gifSampled', steps.length, total) : '';
  } finally {
    saveGifBtn.disabled = false;
  }
}

/** @param {number} step */
async function showStep(step) {
  if (current?.step === step) return;
  const rendered = nextRender();
  vscode.postMessage({ type: 'goto', step });
  await rendered;
}

/** @param {Uint8Array} bytes */
function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return window.btoa(binary);
}

/** @param {string} text */
function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
