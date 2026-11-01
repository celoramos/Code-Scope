import * as assert from 'node:assert/strict';
// @ts-expect-error o codificador é JavaScript do painel, sem declaração de tipos
import { encodeGif, pickSteps, quantize } from '../media/src/gif.js';

/** Lê o GIF como um visualizador leria: é a prova de que o codificador segue o formato. */
function decode(gif: Uint8Array) {
  const text = (from: number, to: number) => String.fromCharCode(...gif.subarray(from, to));
  assert.equal(text(0, 6), 'GIF89a');
  const word = (at: number) => gif[at] | (gif[at + 1] << 8);
  const width = word(6);
  const height = word(8);
  let p = 13;
  const frames: { delay: number; pixels: number[][] }[] = [];
  let delay = 0;
  while (gif[p] !== 0x3b) {
    if (gif[p] === 0x21) {
      if (gif[p + 1] === 0xf9) delay = word(p + 4);
      p += 2;
      while (gif[p] !== 0) p += gif[p] + 1;
      p++;
      continue;
    }
    assert.equal(gif[p], 0x2c);
    const flags = gif[p + 9];
    const colors = 2 << (flags & 7);
    const table = gif.subarray(p + 10, p + 10 + colors * 3);
    p += 10 + colors * 3;
    const minCode = gif[p++];
    const data: number[] = [];
    while (gif[p] !== 0) {
      data.push(...gif.subarray(p + 1, p + 1 + gif[p]));
      p += gif[p] + 1;
    }
    p++;
    const indices = lzw(data, minCode);
    assert.equal(indices.length, width * height);
    frames.push({ delay, pixels: indices.map((i) => [table[i * 3], table[i * 3 + 1], table[i * 3 + 2]]) });
  }
  return { width, height, frames };
}

function lzw(data: number[], minCode: number): number[] {
  const clear = 1 << minCode;
  const end = clear + 1;
  let size = minCode + 1;
  let dict: number[][] = [];
  const reset = () => {
    dict = Array.from({ length: end + 1 }, (_, i) => [i]);
    size = minCode + 1;
  };
  reset();
  const out: number[] = [];
  let bits = 0;
  let buffer = 0;
  let prev: number[] | undefined;
  for (const byte of data) {
    buffer |= byte << bits;
    bits += 8;
    while (bits >= size) {
      const code = buffer & ((1 << size) - 1);
      buffer >>>= size;
      bits -= size;
      if (code === clear) {
        reset();
        prev = undefined;
        continue;
      }
      if (code === end) return out;
      const entry = dict[code] ?? (prev ? [...prev, prev[0]] : []);
      out.push(...entry);
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === 1 << size && size < 12) size++;
    }
  }
  return out;
}

/** Imagem de duas cores: metade de cima vermelha, metade de baixo azul. */
function image(width: number, height: number) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const top = y < height / 2;
      rgba.set(top ? [240, 8, 8, 255] : [8, 8, 240, 255], (y * width + x) * 4);
    }
  }
  return rgba;
}

describe('GIF do painel', () => {
  it('quantize guarda as cores usadas', () => {
    const frame = quantize(image(4, 4), 4, 4);
    assert.equal(frame.palette.length, 6);
    assert.equal(new Set(frame.indices).size, 2);
  });

  it('mais de 256 cores vão para a mais próxima', () => {
    const rgba = new Uint8ClampedArray(1000 * 4);
    for (let i = 0; i < 1000; i++) rgba.set([i % 256, (i * 7) % 256, (i * 13) % 256, 255], i * 4);
    const frame = quantize(rgba, 1000, 1);
    assert.ok(frame.palette.length <= 768);
    assert.equal(frame.indices.length, 1000);
  });

  it('o GIF decodifica nos mesmos pixels', () => {
    const gif = decode(encodeGif([quantize(image(8, 6), 8, 6)], 90, 300));
    assert.equal(gif.width, 8);
    assert.equal(gif.height, 6);
    assert.equal(gif.frames.length, 1);
    assert.equal(gif.frames[0].delay, 300);
    assert.deepEqual(gif.frames[0].pixels[0], [240, 8, 8]);
    assert.deepEqual(gif.frames[0].pixels[47], [8, 8, 240]);
  });

  it('frames de alturas diferentes viram uma tela só', () => {
    const gif = decode(encodeGif([quantize(image(4, 2), 4, 2), quantize(image(4, 6), 4, 6)], 90, 300));
    assert.equal(gif.height, 6);
    assert.equal(gif.frames[0].delay, 90);
    assert.deepEqual(gif.frames[0].pixels[23], [240, 8, 8]);
  });

  it('imagem grande passa do limite do dicionário sem quebrar', () => {
    const size = 200;
    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) rgba.set([(i * 37) % 256, (i * 91) % 256, (i * 17) % 256, 255], i * 4);
    const frame = quantize(rgba, size, size);
    const gif = decode(encodeGif([frame], 90, 300));
    const expected = [...frame.indices].map((i) => [...frame.palette.subarray(i * 3, i * 3 + 3)]);
    assert.deepEqual(gif.frames[0].pixels, expected);
  });

  it('pickSteps espalha os passos com o primeiro e o último', () => {
    assert.deepEqual(pickSteps(3, 80), [1, 2, 3]);
    assert.deepEqual(pickSteps(100, 5), [1, 26, 51, 75, 100]);
  });
});
