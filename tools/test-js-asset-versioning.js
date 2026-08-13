/* Regresión: todos los JS/CSS locales en HTML de entrada van versionados (?v= / ?t=). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');

function walkHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      out.push.apply(out, walkHtml(p));
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const htmlFiles = walkHtml(root).filter(function (p) {
  return !p.includes('/node_modules/') && !p.includes('/playwright-report/');
});

const bareSrc = /<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/gi;
const EXTERNAL = /^(https?:)?\/\//i;
const bad = [];

htmlFiles.forEach(function (file) {
  let html = fs.readFileSync(file, 'utf8');
  // Quitar document.write / asignaciones dinámicas para no confundir con tags HTML reales
  html = html
    .replace(/document\.write\([\s\S]*?\);/g, '')
    .replace(/\.src\s*=\s*[^;]+;/g, '');
  let m;
  bareSrc.lastIndex = 0;
  while ((m = bareSrc.exec(html))) {
    const src = m[1];
    if (EXTERNAL.test(src)) continue;
    if (/\?[vt]=/.test(src)) continue;
    bad.push(path.relative(root, file) + ' → ' + src);
  }
});

assert.strictEqual(bad.length, 0, 'Scripts locales sin versionar:\n' + bad.join('\n'));

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(/bundle-chunks\.js['"]?\s*\+\s*v/.test(index) || /bundle-chunks\.js' \+ v/.test(index),
  'index versiona bundle-chunks.js');
assert(/pt-loader\.js['"]?\s*\+\s*v/.test(index) || /pt-loader\.js' \+ v/.test(index),
  'index versiona pt-loader.js');
assert(/version\.js\?t=/.test(index), 'index carga version.js con ?t=');

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert(/isVersionJs/.test(sw), 'SW trata version.js aparte');
assert(/pt-shell-v18/.test(sw), 'SW cache v17');
assert(/networkFirst\(req,\s*false,\s*false\)/.test(sw), 'version.js network-first no-store');

const pwa = fs.readFileSync(path.join(root, 'js/pwa.js'), 'utf8');
assert(/updateViaCache:\s*'none'/.test(pwa), 'SW register updateViaCache none');

const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
assert(/PT_BUILD\s*=\s*'2\.5\.12'/.test(version), 'PT_BUILD 2.5.11');

console.log('*** js-asset-versioning OK (' + htmlFiles.length + ' html) ***');
