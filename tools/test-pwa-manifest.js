/* RG-G05 — PWA: sw.js, manifest, offline.html. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'sw.js')), 'sw.js');
assert.ok(fs.existsSync(path.join(root, 'offline.html')), 'offline.html');
assert.ok(fs.existsSync(path.join(root, 'site.webmanifest')), 'site.webmanifest');

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(/offline\.html/.test(sw), 'sw precache offline');
assert.ok(/caches|cache/.test(sw), 'cache API');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
assert.ok(manifest.name || manifest.short_name, 'manifest name');
assert.ok(manifest.start_url || manifest.scope, 'start_url/scope');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length, 'icons');

const pwa = fs.readFileSync(path.join(root, 'js/pwa.js'), 'utf8');
assert.ok(/serviceWorker|sw\.js/.test(pwa), 'pwa registra SW');

const offline = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
assert.ok(/PokerForgeAI|offline|conexión/i.test(offline), 'offline copy');

console.log('*** pwa-manifest OK ***');
