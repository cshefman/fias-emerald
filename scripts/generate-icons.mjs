// generate-icons.mjs — build square PWA icons from the transparent gem (emerald-cut.png).
// Composites the gem (area-averaged downscale, alpha over an emerald-gradient background) onto
// square canvases. Pure Node (no sharp/PIL). Outputs to public/icons/.
//
// Usage: node scripts/generate-icons.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "emerald-cut.png");
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

// ---------- PNG decode (8-bit RGBA) ----------
function decode(file) {
  const b = fs.readFileSync(file);
  const W = b.readUInt32BE(16);
  const H = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6) throw new Error("expected 8-bit RGBA source");
  let i = 8;
  const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    const type = b.toString("ascii", i + 4, i + 8);
    if (type === "IDAT") idat.push(b.slice(i + 8, i + 8 + len));
    if (type === "IEND") break;
    i += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = W * 4;
  const px = Buffer.alloc(H * stride);
  const paeth = (a, bb, c) => {
    const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };
  let pos = 0;
  for (let y = 0; y < H; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const v = raw[pos++];
      const a = x >= 4 ? px[y * stride + x - 4] : 0;
      const bb = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + bb; break;
        case 3: r = v + ((a + bb) >> 1); break;
        case 4: r = v + paeth(a, bb, c); break;
        default: throw new Error("bad filter " + ft);
      }
      px[y * stride + x] = r & 255;
    }
  }
  return { W, H, px };
}

// ---------- PNG encode (opaque RGBA) ----------
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
function encode(W, H, px) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const stride = W * 4;
  const filtered = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y++) {
    filtered[y * (stride + 1)] = 0;
    px.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- area-average resize (premultiplied alpha) ----------
function resize(src, tw, th) {
  const { W: sw, H: sh, px: sp } = src;
  const out = Buffer.alloc(tw * th * 4);
  for (let dy = 0; dy < th; dy++) {
    const sy0 = (dy * sh) / th, sy1 = ((dy + 1) * sh) / th;
    const y0 = Math.floor(sy0), y1 = Math.max(y0 + 1, Math.ceil(sy1));
    for (let dx = 0; dx < tw; dx++) {
      const sx0 = (dx * sw) / tw, sx1 = ((dx + 1) * sw) / tw;
      const x0 = Math.floor(sx0), x1 = Math.max(x0 + 1, Math.ceil(sx1));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1 && y < sh; y++) {
        for (let x = x0; x < x1 && x < sw; x++) {
          const o = (y * sw + x) * 4;
          const al = sp[o + 3] / 255;
          r += sp[o] * al; g += sp[o + 1] * al; b += sp[o + 2] * al; a += sp[o + 3];
          n++;
        }
      }
      const d = (dy * tw + dx) * 4;
      if (n > 0 && a > 0) {
        const aa = a / n; // 0..255
        const af = aa / 255;
        out[d] = Math.round(r / n / af);
        out[d + 1] = Math.round(g / n / af);
        out[d + 2] = Math.round(b / n / af);
        out[d + 3] = Math.round(aa);
      }
    }
  }
  return { W: tw, H: th, px: out };
}

// ---------- compose one icon ----------
function makeIcon(size, gemFraction) {
  const px = Buffer.alloc(size * size * 4);
  // emerald vertical gradient background (opaque) — bg2 → bg0 from the Balanced palette
  const top = [0x12, 0x30, 0x26], bot = [0x06, 0x10, 0x0b];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(top[0] + (bot[0] - top[0]) * t);
    const g = Math.round(top[1] + (bot[1] - top[1]) * t);
    const b = Math.round(top[2] + (bot[2] - top[2]) * t);
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  // scale gem to fit the content box, preserve aspect
  const box = Math.round(size * gemFraction);
  const scale = Math.min(box / src.W, box / src.H);
  const gw = Math.max(1, Math.round(src.W * scale));
  const gh = Math.max(1, Math.round(src.H * scale));
  const gem = resize(src, gw, gh);
  const ox = Math.round((size - gw) / 2), oy = Math.round((size - gh) / 2);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const go = (y * gw + x) * 4;
      const af = gem.px[go + 3] / 255;
      if (af === 0) continue;
      const d = ((oy + y) * size + (ox + x)) * 4;
      px[d] = Math.round(gem.px[go] * af + px[d] * (1 - af));
      px[d + 1] = Math.round(gem.px[go + 1] * af + px[d + 1] * (1 - af));
      px[d + 2] = Math.round(gem.px[go + 2] * af + px[d + 2] * (1 - af));
      px[d + 3] = 255;
    }
  }
  return encode(size, size, px);
}

const src = decode(SRC);
fs.mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ["icon-192.png", 192, 0.82],
  ["icon-512.png", 512, 0.82],
  ["icon-maskable-512.png", 512, 0.62], // extra margin for the maskable safe zone
  ["apple-touch-icon.png", 180, 0.82],
];
for (const [name, size, frac] of targets) {
  fs.writeFileSync(path.join(OUT_DIR, name), makeIcon(size, frac));
  console.log("wrote", name, `${size}x${size}`);
}
