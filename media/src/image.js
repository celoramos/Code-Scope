// @ts-check
// Imagem do passo (PNG).
import { byId, timeline, vscode } from './dom.js';
import { current } from './state.js';

// ---------- Imagem do passo ----------
// O painel vira um SVG com o próprio HTML e o CSS dentro (foreignObject), que
// é desenhado num canvas e salvo como PNG: serve para slides e listas de exercício.
/** @type {((css: string) => void) | undefined} */
let cssReady;
const saveImageBtn = byId('save-image');
saveImageBtn.addEventListener('click', () => void exportImage());

/**
 * A extensão respondeu com o CSS que a imagem leva dentro.
 * @param {string} css
 */
export function cssArrived(css) {
  cssReady?.(css);
  cssReady = undefined;
}

async function exportImage() {
  if (!current) return;
  const step = current.step;
  const css = await new Promise((resolve) => {
    cssReady = resolve;
    vscode.postMessage({ type: 'export-css' });
  });
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
    String(css).replace(/:root/g, '.cs-export').replace(/\bbody\b/g, '.cs-export') +
    // Sem animação: na imagem, quem estivesse no começo de uma entrada sairia invisível.
    '*{animation:none!important;transition:none!important}.toolbar-actions,.predict-form{display:none!important}';
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
  // Dobro de pixels: a imagem fica nítida no projetor e no slide.
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  const data = canvas.toDataURL('image/png').split(',')[1];
  vscode.postMessage({ type: 'save-image', data, step });
}

/** @param {string} text */
function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
