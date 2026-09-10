#!/usr/bin/env node
/**
 * Genera iconos cuadrados desde icons/logo-source.jpg (PokerForge)
 * y icons/mttlab-logo-source.jpg (MTT LAB).
 * Uso: npm install sharp (dev) && node tools/generate-icons-from-logo.js
 */
const path = require('path');
const fs = require('fs');

async function writePng(sharp, src, out, size) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(out);
  const buf = fs.readFileSync(out);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log('OK', path.relative(path.join(__dirname, '..'), out), w + 'x' + h, buf.length + 'B');
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Instala sharp: npm install --no-save sharp');
    process.exit(1);
  }

  const root = path.join(__dirname, '..');
  const src = path.join(root, 'icons', 'logo-source.jpg');
  if (!fs.existsSync(src)) {
    console.error('Falta icons/logo-source.jpg');
    process.exit(1);
  }

  const sizes = [
    ['icons/apple-touch-icon.png', 180],
    ['icons/icon-192.png', 192],
    ['icons/favicon-32x32.png', 32],
    ['icons/logo-header.png', 96],
    ['icons/logo-512.png', 512]
  ];

  for (const [rel, size] of sizes) {
    await writePng(sharp, src, path.join(root, rel), size);
  }

  const mttSrc = path.join(root, 'icons', 'mttlab-logo-source.jpg');
  if (!fs.existsSync(mttSrc)) {
    console.warn('Skip MTT LAB: falta icons/mttlab-logo-source.jpg');
    return;
  }
  await writePng(sharp, mttSrc, path.join(root, 'icons', 'mttlab-logo-header.png'), 96);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
