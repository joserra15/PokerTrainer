#!/usr/bin/env node
/* Concatena JS en bundles dist/ para carga rápida en producción. */
'use strict';

const fs = require('fs');
const path = require('path');
const { CHUNKS } = require('./bundle-manifest');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

function readBuild() {
  const raw = fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8');
  const m = raw.match(/PT_BUILD\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '1';
}

function concatFiles(files) {
  return files.map(function (rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) throw new Error('Missing: ' + rel);
    return fs.readFileSync(abs, 'utf8');
  }).join('\n');
}

function writeBundle(name, files) {
  const outPath = path.join(OUT, 'pt-' + name + '.js');
  const banner = '/* PokerForgeAI bundle: pt-' + name + '.js — do not edit */\n';
  fs.writeFileSync(outPath, banner + concatFiles(files), 'utf8');
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log('  pt-' + name + '.js  (' + files.length + ' files, ' + kb + ' KB)');
}

function main() {
  const build = readBuild();
  console.log('Building bundles for PT_BUILD=' + build);
  fs.mkdirSync(OUT, { recursive: true });

  Object.keys(CHUNKS).forEach(function (name) {
    writeBundle(name, CHUNKS[name]);
  });

  const manifest = {
    build: build,
    chunks: Object.keys(CHUNKS).reduce(function (acc, name) {
      acc[name] = 'dist/pt-' + name + '.js';
      return acc;
    }, {})
  };
  fs.writeFileSync(path.join(OUT, 'bundles.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Done → dist/');
}

main();
