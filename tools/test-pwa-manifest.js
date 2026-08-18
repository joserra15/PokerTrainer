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
assert.ok(/PTBusy/.test(pwa), 'PTBusy evita reload a mitad de import');
assert.ok(/importInProgress/.test(pwa), 'controllerchange respeta import en curso');
assert.ok(/pt-push-open/.test(pwa), 'PWA maneja clic de push');

assert.ok(/addEventListener\('push'/.test(sw), 'SW push');
assert.ok(/notificationclick/.test(sw), 'SW notificationclick');
assert.ok(/showNotification/.test(sw), 'SW showNotification');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/import-progress-clock/.test(indexHtml), 'reloj de importación en UI');
const styles = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
assert.ok(/pt-import-spin/.test(styles), 'animación reloj import');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.ok(/Cargando manos/.test(app) && /Guardando/.test(app), 'fases de progreso con ETA');
assert.ok(/session-hands-more/.test(app), 'lista de manos paginada');

const offline = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
assert.ok(/PokerForgeAI|offline|conexión/i.test(offline), 'offline copy');

console.log('*** pwa-manifest OK ***');
