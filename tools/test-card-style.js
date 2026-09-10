/* RG — mazo cuatro colores: persistencia, HTML de palo y default del entrenador. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sandbox = {
  window: {},
  console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  document: {
    documentElement: {
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] || null; }
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  addEventListener() {},
  dispatchEvent() { return true; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/cards.js'), 'utf8'),
  sandbox,
  { filename: 'cards.js' }
);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/play-config.js'), 'utf8'),
  sandbox,
  { filename: 'play-config.js' }
);

const Cards = sandbox.window.Cards;
const PTCardStyle = sandbox.window.PTCardStyle;
const PTPlayConfig = sandbox.window.PTPlayConfig;

assert.ok(Cards, 'Cards');
assert.ok(PTCardStyle, 'PTCardStyle');
assert.ok(PTPlayConfig, 'PTPlayConfig');

assert.strictEqual(PTCardStyle.load(), 'normal');
assert.strictEqual(PTCardStyle.save('colored'), 'colored');
assert.strictEqual(localStore.pt_card_style_v1, 'colored');
assert.strictEqual(PTCardStyle.load(), 'colored');
assert.strictEqual(PTCardStyle.apply('colored'), 'colored');
assert.strictEqual(sandbox.document.documentElement.attrs['data-card-style'], 'colored');
assert.strictEqual(PTCardStyle.normalize('nope'), 'normal');

const ah = Cards.cardToHTML('Ah');
const td = Cards.cardFaceHTML('Td');
const kc = Cards.cardToHTML('Kc');
const js = Cards.cardFaceHTML('Js');
assert.ok(/suit-h/.test(ah) && /red/.test(ah), 'Ah suit-h red: ' + ah);
assert.ok(/suit-d/.test(td) && /card-face/.test(td), 'Td suit-d face: ' + td);
assert.ok(/suit-c/.test(kc) && /black/.test(kc), 'Kc suit-c black: ' + kc);
assert.ok(/suit-s/.test(js), 'Js suit-s: ' + js);
assert.strictEqual(Cards.suitClass('h'), 'suit-h');

localStore.pt_card_style_v1 = 'colored';
const fromUser = PTPlayConfig.normalize({});
assert.strictEqual(fromUser.cardStyle, 'colored', 'default desde preferencia usuario');

const forced = PTPlayConfig.normalize({ cardStyle: 'normal' });
assert.strictEqual(forced.cardStyle, 'normal', 'override explícito del entrenador');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="setup-card-style"/.test(html), 'chips entrenador Avanzadas');
assert.ok(/id="setup-group-card-style"/.test(html), 'grupo estilo cartas');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'js/account-settings.js'), 'utf8');
assert.ok(/settings-card-style/.test(settingsSrc), 'UI configuración usuario');
assert.ok(/syncCardStyleFromSettings|PTCardStyle\.save/.test(settingsSrc), 'persistencia desde settings');

const css = fs.readFileSync(path.join(__dirname, '..', 'css/styles.css'), 'utf8');
assert.ok(/\[data-card-style="colored"\][\s\S]*\.card\.suit-h/.test(css), 'CSS corazones');
assert.ok(/\[data-card-style="colored"\][\s\S]*color:\s*#fff/.test(css), 'glifos blancos');

const appSrc = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
assert.ok(/cardStyle:/.test(appSrc) && /applyActiveCardStyle/.test(appSrc), 'cableado entrenador');
assert.ok(/restoreUserCardStyle/.test(appSrc), 'restaurar preferencia usuario');

console.log('*** card-style OK (persistencia + HTML palo + default entrenador) ***');
