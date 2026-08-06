/* Regresión UX: drill adaptativo + selectores de cartas en modal. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const haJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'hand-analysis.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
const chunks = fs.readFileSync(path.join(__dirname, '..', 'js', 'bundle-chunks.js'), 'utf8');

assert.ok(/adaptive-drill-help/.test(html), 'HTML tiene ayuda del drill adaptativo');
assert.ok(/¿Qué es el drill adaptativo\?/.test(html), 'HTML explica el drill adaptativo');
assert.ok(/EV perdido/.test(html), 'HTML menciona EV perdido');
assert.ok(/ranges-board-pick-btn/.test(html), 'HTML tiene botón de board en rangos');
assert.ok(!/id="ranges-board-input"/.test(html), 'HTML ya no usa input de texto para el board');
assert.ok(/id="card-picker-modal"/.test(html), 'HTML tiene modal card-picker');

assert.ok(/PTCardPicker\.open/.test(appJs), 'Rangos abre PTCardPicker');
assert.ok(/ranges-board-pick-btn/.test(appJs), 'Rangos enlaza el botón de flop');
assert.ok(/adaptive-drill-help-inline/.test(appJs), 'Stats incluye descripción del drill');
assert.ok(/max:\s*3/.test(appJs), 'Rangos pide 3 cartas de flop');

assert.ok(/openCardPickerModal/.test(haJs), 'Análisis usa modal de cartas');
assert.ok(/PTCardPicker\.open/.test(haJs), 'Análisis llama a PTCardPicker.open');
assert.ok(!/data-ha-picker/.test(haJs), 'Análisis ya no renderiza panel inline de deck');
assert.ok(/pickerTitleForKey/.test(haJs), 'Análisis tiene títulos por contexto');
assert.ok(/Flop \(3 cartas\)/.test(haJs) && /Turn \(1 carta\)/.test(haJs) && /River \(1 carta\)/.test(haJs),
  'Análisis distingue flop/turn/river');

assert.ok(/card-picker-modal/.test(css), 'CSS del modal card-picker');
assert.ok(/ranges-board-btn/.test(css), 'CSS del botón de board');
assert.ok(/js\/card-picker\.js/.test(chunks), 'card-picker en bundle core');

const localStore = {};
const created = [];
const sandbox = {
  window: {},
  console,
  document: {
    body: {
      appendChild(el) { created.push(el); },
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); }
      }
    },
    getElementById(id) {
      return created.find((el) => el.id === id) || null;
    },
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        id: '',
        className: '',
        classList: {
          _set: new Set(),
          add(c) { this._set.add(c); el.className = Array.from(this._set).join(' '); },
          remove(c) { this._set.delete(c); el.className = Array.from(this._set).join(' '); },
          contains(c) { return this._set.has(c); }
        },
        style: {},
        innerHTML: '',
        children: [],
        _listeners: {},
        setAttribute(k, v) { this[k] = v; if (k === 'id') this.id = v; },
        getAttribute(k) { return this[k] == null ? null : String(this[k]); },
        appendChild(child) { this.children.push(child); return child; },
        addEventListener(type, fn) {
          (this._listeners[type] = this._listeners[type] || []).push(fn);
        },
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
      el.classList.add = function (c) { this._set.add(c); el.className = Array.from(this._set).join(' '); };
      return el;
    },
    addEventListener() {},
    removeEventListener() {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
sandbox.window.document = sandbox.document;
sandbox.window.Cards = {
  fullDeck() {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['s', 'h', 'd', 'c'];
    const out = [];
    ranks.forEach((r) => suits.forEach((s) => out.push(r + s)));
    return out;
  },
  cardToHTML(c) { return '<span class="card">' + c + '</span>'; }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'card-picker.js'), 'utf8'), sandbox, {
  filename: 'card-picker.js'
});

const P = sandbox.window.PTCardPicker;
assert.ok(P && P.open && P.close && P.isOpen, 'PTCardPicker API');
assert.strictEqual(P.cardsToText(['As', 'Kd', '7c']), 'As Kd 7c');

let doneCards = null;
P.open({
  title: 'Flop',
  max: 3,
  selected: ['As', 'Kd'],
  onDone: (cards) => { doneCards = cards; }
});
assert.ok(P.isOpen(), 'picker abierto');
assert.ok(sandbox.document.body.classList.contains('card-picker-open'), 'body bloqueado');
P.close(true);
assert.ok(!P.isOpen(), 'picker cerrado');
assert.strictEqual(JSON.stringify(doneCards), JSON.stringify(['As', 'Kd']), 'onDone recibe selección');
assert.ok(!sandbox.document.body.classList.contains('card-picker-open'), 'body desbloqueado');

console.log('test-card-picker-ux: OK');
