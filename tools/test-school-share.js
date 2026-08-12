/**
 * Compartir logro Escuela: texto+URL, canvas y panel social.
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

assert.ok(/PT_BUILD\s*=\s*'2\.5\.9'/.test(version), 'versión 2.5.9');
assert.ok(/school-share\.js/.test(chunks), 'chunk school incluye school-share.js');
assert.ok(/PTSchoolShare/.test(shareSrc), 'API PTSchoolShare');
assert.ok(/buildPanelHtml/.test(shareSrc) && /mountSharePanel/.test(shareSrc), 'panel share');
assert.ok(/drawAchievementCard/.test(shareSrc), 'canvas logro');
assert.ok(/wa\.me|whatsapp/i.test(shareSrc), 'WhatsApp');
assert.ok(/twitter\.com\/intent|intent\/tweet/.test(shareSrc), 'X/Twitter');
assert.ok(/facebook\.com\/sharer/.test(shareSrc), 'Facebook');
assert.ok(/nav\.share|\.share\s*=/.test(shareSrc) && /canShare/.test(shareSrc), 'Web Share API');
assert.ok(/pokerforgeai\.com/.test(shareSrc), 'URL web en tarjeta/texto');
assert.ok(/PTSchoolShare\.buildPanelHtml/.test(schoolSrc), 'resultado Escuela monta panel');
assert.ok(/mountSharePanel/.test(schoolSrc), 'resultado Escuela mountSharePanel');
assert.ok(/\.school-share\s*\{/.test(styles), 'estilos school-share');
assert.ok(/school-share-canvas/.test(styles), 'estilos preview canvas');

const calls = [];
const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  encodeURIComponent,
  decodeURIComponent,
  URL,
  Blob: function Blob(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; },
  File: function File(parts, name, opts) { this.name = name; this.type = (opts && opts.type) || ''; },
  Uint8Array,
  atob: function () { return ''; },
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.PT_SITE = { appUrl: 'https://www.pokerforgeai.com/' };
sandbox.location = { origin: 'https://www.pokerforgeai.com', pathname: '/' };
sandbox.navigator = {
  share: function () { return Promise.resolve(); },
  canShare: function () { return true; },
  clipboard: { writeText: function (t) { calls.push(['copy', t]); return Promise.resolve(); } }
};
sandbox.document = {
  createElement: function (tag) {
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      setAttribute: function () {},
      appendChild: function () {},
      remove: function () {},
      click: function () { calls.push(['click-download']); }
    };
  },
  body: { appendChild: function () {} }
};

function FakeCtx() {
  this._fill = '';
  this._font = '';
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
Object.defineProperty(FakeCtx.prototype, 'fillStyle', {
  set: function (v) { this._fill = v; },
  get: function () { return this._fill; }
});
Object.defineProperty(FakeCtx.prototype, 'font', {
  set: function (v) { this._font = v; },
  get: function () { return this._font; }
});
Object.defineProperty(FakeCtx.prototype, 'strokeStyle', { set: function () {}, get: function () { return ''; } });
Object.defineProperty(FakeCtx.prototype, 'lineWidth', { set: function () {}, get: function () { return 1; } });
Object.defineProperty(FakeCtx.prototype, 'textAlign', { set: function () {}, get: function () { return 'left'; } });

vm.createContext(sandbox);
vm.runInContext(shareSrc, sandbox, { filename: 'school-share.js' });
const Share = sandbox.PTSchoolShare;
assert.ok(Share, 'PTSchoolShare cargado');

const lesson = {
  id: 'S-03',
  title: 'Examen M0 · Spins',
  exam: true,
  route: 'spin',
  module: 'M0'
};
const summary = { passed: true, pct: 92, gold: true, perfect: false, xpGain: 40 };

assert.strictEqual(Share.siteUrl(), 'https://www.pokerforgeai.com/');
const text = Share.buildShareText(lesson, summary);
assert.ok(/Examen M0/.test(text), 'texto menciona lección');
assert.ok(/92%/.test(text), 'texto menciona %');
assert.ok(/pokerforgeai\.com/.test(text), 'texto incluye URL');
assert.ok(/oro|Marca oro|¡Marca oro!/i.test(text), 'texto marca oro');

const panel = Share.buildPanelHtml(lesson, summary);
assert.ok(/data-school-share="whatsapp"/.test(panel), 'botón WhatsApp');
assert.ok(/data-school-share="x"/.test(panel), 'botón X');
assert.ok(/data-school-share="facebook"/.test(panel), 'botón Facebook');
assert.ok(/data-school-share="download"/.test(panel), 'botón descargar');
assert.ok(/data-school-share="native"/.test(panel), 'botón nativo');
assert.ok(/school-share-canvas/.test(panel), 'canvas preview');

const canvas = {
  width: 0,
  height: 0,
  getContext: function () { return new FakeCtx(); },
  toBlob: function (cb) { cb(new sandbox.Blob(['x'], { type: 'image/png' })); }
};
const ctx = canvas.getContext();
// drawAchievementCard uses getContext internally
const drawn = Share.drawAchievementCard({
  width: 0,
  height: 0,
  getContext: function () { return ctx; }
}, lesson, summary);
assert.ok(drawn, 'drawAchievementCard retorna canvas');
assert.ok(ctx.texts.some(function (t) { return /PokerForgeAI/.test(t); }), 'marca en imagen');
assert.ok(ctx.texts.some(function (t) { return /Examen superado|Lección superada/.test(t); }), 'estado en imagen');
assert.ok(ctx.texts.some(function (t) { return /pokerforgeai\.com/.test(t); }), 'URL visible en imagen');
assert.ok(ctx.texts.some(function (t) { return t === '92%'; }), '% en imagen');

console.log('*** test-school-share OK ***');
