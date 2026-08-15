/**
 * Compartir Escuela: logro + resumen hub (imagen oculta, botón único).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');
const shareSrc = fs.readFileSync(path.join(root, 'js/school-share.js'), 'utf8');
const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'2.5.37'/.test(version), 'versión 2.5.37');
assert.ok(/school-share\.js/.test(chunks), 'chunk school incluye school-share.js');
assert.ok(/buildHubPanelHtml/.test(shareSrc) && /drawHubSummaryCard/.test(shareSrc), 'share hub');
assert.ok(/mountHubSharePanel/.test(shareSrc), 'mount hub share');
assert.ok(/Se ha compartido correctamente/.test(shareSrc), 'mensaje éxito');
assert.ok(!/Se comparte la imagen del logro/.test(shareSrc), 'sin texto auxiliar logro');
assert.ok(!/Listo para compartir/.test(shareSrc), 'sin Listo para compartir');
assert.ok(/buildHubPanelHtml/.test(schoolSrc) && /mountHubSharePanel/.test(schoolSrc), 'hub monta share');
assert.ok(/SCHOOL_PUBLIC\s*=\s*true/.test(schoolSrc), 'Escuela pública');
assert.ok(/isSchoolHand/.test(storageSrc) && /isSchoolError/.test(storageSrc), 'filtro errores Escuela');
assert.ok(/schoolHand/.test(storageSrc), 'saveHand omite errores Escuela');
assert.ok(/school-share-hub/.test(styles), 'estilos hub share');

const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean,
  encodeURIComponent, decodeURIComponent, URL,
  Blob: function Blob(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; },
  File: function File(parts, name, opts) { this.name = name; this.type = (opts && opts.type) || ''; },
  Uint8Array, atob: function () { return ''; }, setTimeout, clearTimeout
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.PT_SITE = { appUrl: 'https://www.pokerforgeai.com/' };
sandbox.location = { origin: 'https://www.pokerforgeai.com', pathname: '/' };
sandbox.navigator = { share: function () { return Promise.resolve(); }, canShare: function () { return true; } };
sandbox.document = {
  createElement: function () {
    return { style: {}, setAttribute: function () {}, appendChild: function () {}, remove: function () {}, click: function () {} };
  },
  body: { appendChild: function () {} }
};

function FakeCtx() {
  this.texts = [];
}
FakeCtx.prototype.createLinearGradient = function () { return { addColorStop: function () {} }; };
FakeCtx.prototype.createRadialGradient = function () { return { addColorStop: function () {} }; };
FakeCtx.prototype.fillRect = function () {};
FakeCtx.prototype.beginPath = function () {};
FakeCtx.prototype.moveTo = function () {};
FakeCtx.prototype.arcTo = function () {};
FakeCtx.prototype.closePath = function () {};
FakeCtx.prototype.stroke = function () {};
FakeCtx.prototype.fill = function () {};
FakeCtx.prototype.arc = function () {};
FakeCtx.prototype.measureText = function (t) { return { width: String(t).length * 12 }; };
FakeCtx.prototype.fillText = function (t) { this.texts.push(String(t)); };
Object.defineProperty(FakeCtx.prototype, 'fillStyle', { set: function () {}, get: function () { return ''; } });
Object.defineProperty(FakeCtx.prototype, 'font', { set: function () {}, get: function () { return ''; } });
Object.defineProperty(FakeCtx.prototype, 'strokeStyle', { set: function () {}, get: function () { return ''; } });
Object.defineProperty(FakeCtx.prototype, 'lineWidth', { set: function () {}, get: function () { return 1; } });
Object.defineProperty(FakeCtx.prototype, 'textAlign', { set: function () {}, get: function () { return 'left'; } });

vm.createContext(sandbox);
vm.runInContext(shareSrc, sandbox, { filename: 'school-share.js' });
const Share = sandbox.PTSchoolShare;

const lessonPanel = Share.buildPanelHtml({ title: 'X', exam: false }, { passed: true, pct: 90 });
assert.ok(/data-school-share="native"/.test(lessonPanel), 'botón logro');
assert.ok(!/Se comparte la imagen/.test(lessonPanel), 'sin helper text');

const hubPanel = Share.buildHubPanelHtml();
assert.ok(/data-school-share="hub"/.test(hubPanel), 'botón resumen');
assert.ok(/school-share-canvas-hidden/.test(hubPanel), 'canvas hub oculto');

const hub = {
  eyebrow: 'Cash · Ruta principal',
  title: 'Escuela de Póker',
  lead: 'Fundamentos → preflop → postflop → Pro Coach.',
  level: 10,
  xp: 1885,
  routePassed: 10,
  routeTotal: 27,
  gold: 7,
  xpPct: 40,
  routeId: 'cash'
};
const hubText = Share.buildHubShareText(hub);
assert.ok(/1885/.test(hubText) && /pokerforgeai\.com/.test(hubText), 'texto hub con XP+URL');

const ctx = new FakeCtx();
Share.drawHubSummaryCard({
  width: 0, height: 0,
  getContext: function () { return ctx; }
}, hub);
assert.ok(ctx.texts.some(function (t) { return /Escuela de Póker/.test(t); }), 'título en imagen hub');
assert.ok(ctx.texts.some(function (t) { return /Nv\. 10/.test(t); }), 'nivel en imagen');
assert.ok(ctx.texts.some(function (t) { return t === '1885'; }), 'XP en imagen');
assert.ok(ctx.texts.some(function (t) { return t === '10/27'; }), 'ruta en imagen');
assert.ok(ctx.texts.some(function (t) { return /pokerforgeai\.com/.test(t); }), 'URL en imagen hub');

console.log('*** test-school-share OK ***');
