// @ts-check
// Codificador de GIF, sem dependências: o painel não pode carregar nada de fora.

/**
 * @typedef {{ width: number, height: number, palette: Uint8Array, indices: Uint8Array }} GifFrame
 */

/**
 * Reduz a imagem a no máximo 256 cores: o painel tem cores chapadas, então as
 * mais frequentes bastam; o resto (bordas suavizadas) vai para a mais próxima.
 * @param {Uint8ClampedArray} rgba
 * @param {number} width
 * @param {number} height
 * @returns {GifFrame}
 */
export function quantize(rgba, width, height) {
  /** 5 bits por canal: tons quase iguais contam como um só. */
  const key = (/** @type {number} */ i) => ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
  const count = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const k = key(i);
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => k);
  const palette = new Uint8Array(top.length * 3);
  top.forEach((k, n) => {
    palette[n * 3] = ((k >> 10) & 31) << 3;
    palette[n * 3 + 1] = ((k >> 5) & 31) << 3;
    palette[n * 3 + 2] = (k & 31) << 3;
  });
  /** @type {Map<number, number>} */
  const nearest = new Map(top.map((k, n) => [k, n]));
  const closest = (/** @type {number} */ k) => {
    let best = 0;
    let bestDist = Infinity;
    const [r, g, b] = [(k >> 10) & 31, (k >> 5) & 31, k & 31];
    for (let n = 0; n < top.length; n++) {
      const dr = ((top[n] >> 10) & 31) - r;
      const dg = ((top[n] >> 5) & 31) - g;
      const db = (top[n] & 31) - b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    return best;
  };
  const indices = new Uint8Array(width * height);
  for (let p = 0; p < indices.length; p++) {
    const k = key(p * 4);
    let n = nearest.get(k);
    if (n === undefined) {
      n = closest(k);
      nearest.set(k, n);
    }
    indices[p] = n;
  }
  return { width, height, palette, indices };
}

/** Bytes de um GIF animado, crescendo sob demanda. */
class Output {
  /** @param {number} size */
  constructor(size) {
    this.bytes = new Uint8Array(size);
    this.length = 0;
  }

  /** @param {number} extra */
  reserve(extra) {
    if (this.length + extra <= this.bytes.length) return;
    const bigger = new Uint8Array(Math.max(this.bytes.length * 2, this.length + extra));
    bigger.set(this.bytes.subarray(0, this.length));
    this.bytes = bigger;
  }

  /** @param {number[] | Uint8Array} data */
  push(data) {
    this.reserve(data.length);
    this.bytes.set(data, this.length);
    this.length += data.length;
  }

  /** @param {number} n */
  word(n) {
    this.push([n & 255, (n >> 8) & 255]);
  }
}

/**
 * Compressão LZW do formato GIF, em blocos de até 255 bytes.
 * @param {Output} out
 * @param {Uint8Array} indices
 * @param {number} minCodeSize
 */
function writeLzw(out, indices, minCodeSize) {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  /** @type {Map<number, number>} */
  let dict = new Map();
  let next = end + 1;
  let codeSize = minCodeSize + 1;
  let buffer = 0;
  let bits = 0;
  /** @type {number[]} */
  let block = [];
  const flushBlock = () => {
    if (block.length === 0) return;
    out.push([block.length]);
    out.push(block);
    block = [];
  };
  const emit = (/** @type {number} */ code) => {
    buffer |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      block.push(buffer & 255);
      buffer >>>= 8;
      bits -= 8;
      if (block.length === 255) flushBlock();
    }
  };
  out.push([minCodeSize]);
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const pair = (prefix << 8) | k;
    const known = dict.get(pair);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      dict = new Map();
      next = end + 1;
      codeSize = minCodeSize + 1;
    } else {
      dict.set(pair, next);
      if (next === 1 << codeSize) codeSize++;
      next++;
    }
    prefix = k;
  }
  emit(prefix);
  emit(end);
  if (bits > 0) block.push(buffer & 255);
  flushBlock();
  out.push([0]);
}

/**
 * Passos usados no GIF: todos, ou espalhados por igual com o primeiro e o último.
 * @param {number} total
 * @param {number} max
 */
export function pickSteps(total, max) {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  return Array.from({ length: max }, (_, i) => 1 + Math.round((i * (total - 1)) / (max - 1)));
}

/**
 * Frames de alturas diferentes viram uma tela só: o que falta é preenchido com a
 * cor do canto, que é o fundo do painel.
 * @param {GifFrame} f
 * @param {number} width
 * @param {number} height
 */
function pad(f, width, height) {
  if (f.width === width && f.height === height) return f.indices;
  const out = new Uint8Array(width * height).fill(f.indices[0]);
  for (let y = 0; y < f.height; y++) out.set(f.indices.subarray(y * f.width, (y + 1) * f.width), y * width);
  return out;
}

/**
 * @param {GifFrame[]} frames
 * @param {number} delay centésimos de segundo por frame
 * @param {number} lastDelay o último fica mais tempo, antes de recomeçar
 */
export function encodeGif(frames, delay, lastDelay) {
  const width = Math.max(...frames.map((f) => f.width));
  const height = Math.max(...frames.map((f) => f.height));
  const out = new Output(1 << 20);
  out.push([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  out.word(width);
  out.word(height);
  out.push([0x70, 0, 0]); // sem paleta global: cada frame traz a dele
  // Repetir para sempre (extensão NETSCAPE2.0).
  out.push([0x21, 0xff, 11, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 3, 1, 0, 0, 0]);
  frames.forEach((f, n) => {
    const time = n === frames.length - 1 ? lastDelay : delay;
    out.push([0x21, 0xf9, 4, 0x04, time & 255, (time >> 8) & 255, 0, 0]);
    out.push([0x2c]);
    out.word(0);
    out.word(0);
    out.word(width);
    out.word(height);
    let bits = 1;
    while (1 << bits < f.palette.length / 3) bits++;
    out.push([0x80 | (bits - 1)]);
    const table = new Uint8Array((1 << bits) * 3);
    table.set(f.palette);
    out.push(table);
    writeLzw(out, pad(f, width, height), Math.max(bits, 2));
  });
  out.push([0x3b]);
  return out.bytes.subarray(0, out.length);
}
