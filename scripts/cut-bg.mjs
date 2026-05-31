// cut-bg.mjs — remove the opaque white background from Emerald.png by flood-filling
// from the image border, leaving interior near-white pixels (gold gloss, specular dots)
// intact because the black outline stops the fill. Re-encodes a transparent RGBA PNG.
//
// Usage: node scripts/cut-bg.mjs
// Reads ../Emerald.png, writes ../emerald-cut.png, prints a base64 data URI to stdout.
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "Emerald.png");
const OUT = path.join(__dirname, "..", "emerald-cut.png");

// ---------- decode ----------
const buf = fs.readFileSync(SRC);
if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
const W = buf.readUInt32BE(16),
  H = buf.readUInt32BE(20);
const bitDepth = buf[24],
  colorType = buf[25];
if (bitDepth !== 8 || colorType !== 6) throw new Error(`expected 8-bit RGBA, got bd=${bitDepth} ct=${colorType}`);

let i = 8;
const idat = [];
while (i < buf.length) {
  const len = buf.readUInt32BE(i);
  const type = buf.toString("ascii", i + 4, i + 8);
  if (type === "IDAT") idat.push(buf.slice(i + 8, i + 8 + len));
  if (type === "IEND") break;
  i += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = W * 4;
const px = Buffer.alloc(H * stride); // unfiltered RGBA

const paeth = (a, b, c) => {
  const p = a + b - c,
    pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

let pos = 0;
for (let y = 0; y < H; y++) {
  const ft = raw[pos++];
  for (let x = 0; x < stride; x++) {
    const v = raw[pos++];
    const a = x >= 4 ? px[y * stride + x - 4] : 0;
    const b = y > 0 ? px[(y - 1) * stride + x] : 0;
    const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
    let r;
    switch (ft) {
      case 0: r = v; break;
      case 1: r = v + a; break;
      case 2: r = v + b; break;
      case 3: r = v + ((a + b) >> 1); break;
      case 4: r = v + paeth(a, b, c); break;
      default: throw new Error("bad filter " + ft);
    }
    px[y * stride + x] = r & 255;
  }
}

// ---------- flood-fill the background ----------
// "Background-ish": bright and low-saturation (near white). The black outline (dark) blocks the fill,
// so enclosed near-white regions (gloss, specular dots) are never reached.
const HI = 232; // min channel must exceed this to count as background
const SAT = 18; // max(r,g,b)-min(r,g,b) must be under this
const isBg = (o) => {
  const r = px[o], g = px[o + 1], b = px[o + 2];
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  return mn > HI && mx - mn < SAT;
};
// "whiteness" 0..1 for feathering edge pixels
const whiteness = (o) => {
  const mn = Math.min(px[o], px[o + 1], px[o + 2]);
  return Math.max(0, Math.min(1, (mn - 200) / 55));
};

const cleared = new Uint8Array(W * H);
const stack = [];
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const idx = y * W + x;
  if (cleared[idx]) return;
  if (!isBg(idx * 4)) return;
  cleared[idx] = 1;
  stack.push(idx);
};
for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
while (stack.length) {
  const idx = stack.pop();
  const x = idx % W, y = (idx / W) | 0;
  pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1);
}

// Apply: fully-cleared pixels -> alpha 0. Then feather a 1px boundary: any kept pixel adjacent to a
// cleared one gets its alpha reduced by its whiteness, softening the cut edge against the dark bg.
for (let idx = 0; idx < W * H; idx++) {
  if (cleared[idx]) px[idx * 4 + 3] = 0;
}
let feathered = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (cleared[idx]) continue;
    const o = idx * 4;
    if (px[o + 3] === 0) continue;
    const nb =
      (x > 0 && cleared[idx - 1]) ||
      (x < W - 1 && cleared[idx + 1]) ||
      (y > 0 && cleared[idx - W]) ||
      (y < H - 1 && cleared[idx + W]);
    if (nb) {
      const wv = whiteness(o);
      if (wv > 0) { px[o + 3] = Math.round(px[o + 3] * (1 - wv)); feathered++; }
    }
  }
}

// ---------- encode ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (b) => {
    let c = 0xffffffff;
    for (let n = 0; n < b.length; n++) c = t[(c ^ b[n]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const filtered = Buffer.alloc(H * (stride + 1));
for (let y = 0; y < H; y++) {
  filtered[y * (stride + 1)] = 0; // filter: none
  px.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
}
const out = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.writeFileSync(OUT, out);

const clearedCount = cleared.reduce((s, v) => s + v, 0);
console.error(
  `wrote ${OUT}  (${W}x${H}, ${clearedCount} px cleared = ${((clearedCount / (W * H)) * 100).toFixed(1)}%, ${feathered} feathered, ${out.length} bytes)`
);
// data URI to stdout for inlining
process.stdout.write("data:image/png;base64," + out.toString("base64"));
