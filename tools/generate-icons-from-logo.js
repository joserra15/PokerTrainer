#!/usr/bin/env node
/**
 * Genera iconos cuadrados desde icons/logo-source.jpg
 * Uso: npm install sharp (dev) && node tools/generate-icons-from-logo.js
 */
const path = require('path');
const fs = require('fs');

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
    const out = path.join(root, rel);
    await sharp(src)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(out);
    const buf = fs.readFileSync(out);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    console.log('OK', rel, w + 'x' + h);
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
