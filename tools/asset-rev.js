/*
 * Huella del contenido de los assets que se sirven con ?v= (js, css, dist, data).
 *
 * El token de invalidación de caché se deriva de aquí en lugar de depender de
 * que alguien recuerde subir PT_BUILD: un deploy que cambia bundles o CSS sin
 * tocar la versión dejaba al service worker sirviendo los ficheros viejos de su
 * caché (cache-first por ?v=), con la app mezclando HTML nuevo y assets viejos.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIRS = ['js', 'css', 'dist', 'data'];
const HASHED_EXT = /\.(js|css|json)$/i;
const SKIP_DIRS = new Set(['node_modules', 'vendor']);
// Ficheros donde se escribe la propia huella: incluirlos no tendría punto fijo.
const EXCLUDED = new Set([
  path.join('js', 'version.js'),
  path.join('dist', 'bundles.json')
]);

function walk(relDir, out) {
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return out;
  fs.readdirSync(abs).sort().forEach(function (name) {
    const rel = path.join(relDir, name);
    const st = fs.statSync(path.join(ROOT, rel));
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(rel, out);
      return;
    }
    if (!HASHED_EXT.test(name)) return;
    if (EXCLUDED.has(rel)) return;
    out.push(rel);
  });
  return out;
}

/** Ficheros que entran en la huella, en orden estable. */
function assetFiles() {
  const out = [];
  DIRS.forEach(function (dir) { walk(dir, out); });
  return out.sort();
}

function readBuild() {
  const raw = fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8');
  const m = raw.match(/PT_BUILD\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : '1';
}

/** `<PT_BUILD>-<sha256 corto>` del contenido de todos los assets versionados. */
function computeAssetRev(build) {
  const h = crypto.createHash('sha256');
  assetFiles().forEach(function (rel) {
    h.update(rel.split(path.sep).join('/'));
    h.update('\0');
    h.update(fs.readFileSync(path.join(ROOT, rel)));
    h.update('\0');
  });
  return String(build || readBuild()) + '-' + h.digest('hex').slice(0, 10);
}

function readAssetRev() {
  const raw = fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8');
  const m = raw.match(/PT_ASSET_REV\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

/** Reescribe la línea de PT_ASSET_REV en js/version.js (idempotente). */
function writeAssetRev(rev) {
  const file = path.join(ROOT, 'js/version.js');
  const raw = fs.readFileSync(file, 'utf8');
  if (!/PT_ASSET_REV\s*=/.test(raw)) {
    throw new Error('js/version.js sin línea PT_ASSET_REV que actualizar');
  }
  const next = raw.replace(/(PT_ASSET_REV\s*=\s*')[^']*(')/, '$1' + rev + '$2');
  if (next !== raw) fs.writeFileSync(file, next, 'utf8');
  return next !== raw;
}

module.exports = {
  assetFiles: assetFiles,
  computeAssetRev: computeAssetRev,
  readAssetRev: readAssetRev,
  readBuild: readBuild,
  writeAssetRev: writeAssetRev
};
