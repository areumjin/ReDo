#!/usr/bin/env node
// Chrome Extension 아이콘 생성 (외부 의존성 없음)
// Usage: node scripts/generate-extension-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// (same CRC32, makeChunk, createPNG, renderIcon, drawReLogo functions as above)
// Copy-paste the full implementation from generate-icons.js above

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crcBuf]);
}

function createPNG(w, h, pixels) {
  const rowSize = w * 4 + 1;
  const raw = Buffer.alloc(h * rowSize);
  for (let y = 0; y < h; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * rowSize + 1 + x * 4;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.46;
  const BG = [106, 112, 255, 255];
  const WHITE = [255, 255, 255, 255];
  const TRANS = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const idx = (y * size + x) * 4;
      if (dist > radius + 0.5) {
        pixels.set(TRANS, idx);
      } else {
        pixels.set(BG, idx);
        const rx = dx / size * 2 + 0.5;
        const ry = dy / size * 2 + 0.5;
        if (drawReLogo(rx, ry)) pixels.set(WHITE, idx);
      }
    }
  }
  return pixels;
}

function drawReLogo(x, y) {
  const sw = 0.10;
  if (x >= 0.28 && x <= 0.28 + sw && y >= 0.20 && y <= 0.80) return true;
  if (x >= 0.28 && x <= 0.68 && y >= 0.20 && y <= 0.20 + sw) return true;
  if (x >= 0.28 && x <= 0.68 && y >= 0.48 && y <= 0.48 + sw) return true;
  if (x >= 0.68 && x <= 0.68 + sw && y >= 0.20 && y <= 0.48 + sw) return true;
  const legX1 = 0.58, legY1 = 0.58, legX2 = 0.78, legY2 = 0.80;
  const lenSq = (legX2-legX1)**2 + (legY2-legY1)**2;
  const t = Math.max(0, Math.min(1, ((x-legX1)*(legX2-legX1)+(y-legY1)*(legY2-legY1))/lenSq));
  const px = legX1 + t*(legX2-legX1), py = legY1 + t*(legY2-legY1);
  if (Math.sqrt((x-px)**2 + (y-py)**2) < sw * 0.55 && y >= legY1 - 0.01) return true;
  return false;
}

const iconsDir = path.join(__dirname, '..', '..', 'redo-extension', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const pixels = renderIcon(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`✓ icon-${size}.png`);
}

console.log('\n✅ 확장 프로그램 아이콘 생성 완료!');
