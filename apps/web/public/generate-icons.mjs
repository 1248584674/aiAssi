// 生成简约 PWA 图标 PNG（192x192 + 512x512）
import { writeFileSync } from "fs";

function createPNG(size) {
  // 最小 PNG：橙色方块带白色 V 形
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  const strokeW = size * 0.08;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < r + strokeW / 2 && dist > r - strokeW / 2) {
        pixels[idx] = 255; pixels[idx+1] = 254; pixels[idx+2] = 251; pixels[idx+3] = 255; // #fffefb
      } else if (Math.abs(x - cx + size * 0.1) < strokeW && y > size * 0.35 && y < size * 0.65) {
        pixels[idx] = 255; pixels[idx+1] = 254; pixels[idx+2] = 251; pixels[idx+3] = 255;
      } else if (Math.abs(x - cx - size * 0.1) < strokeW && y > size * 0.35 && y < size * 0.65) {
        pixels[idx] = 255; pixels[idx+1] = 254; pixels[idx+2] = 251; pixels[idx+3] = 255;
      } else {
        pixels[idx] = 255; pixels[idx+1] = 79; pixels[idx+2] = 0; pixels[idx+3] = 255; // #ff4f00
      }
    }
  }
  return pixels;
}

// PNG 编码（仅支持 RGBA 原始数据）
import { deflateSync } from "zlib";

function makePNG(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; // bit depth 8, color type 6 (RGBA)
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  // IDAT
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: none
    pixels.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = deflateSync(raw);
  const idat = makeChunk("IDAT", compressed);

  // IEND
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeB, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeB, data, crcBuf]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

writeFileSync("icon-192.png", makePNG(192, createPNG(192)));
writeFileSync("icon-512.png", makePNG(512, createPNG(512)));
console.log("Icons generated: icon-192.png, icon-512.png");
