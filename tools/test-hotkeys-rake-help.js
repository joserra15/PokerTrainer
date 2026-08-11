/* Regresión: hotkeys, rake configurable y menú de ayuda (SN-52/53). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const playCfg = fs.readFileSync(path.join(root, 'js', 'play-config.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'js', 'engine.js'), 'utf8');
const chunks = fs.readFileSync(path.join(root, 'js', 'bundle-chunks.js'), 'utf8');
const hotkeys = fs.readFileSync(path.join(root, 'js', 'hotkeys.js'), 'utf8');
const help = fs.readFileSync(path.join(root, 'js', 'help.js'), 'utf8');
const faq = fs.readFileSync(path.join(root, 'legal', 'faq.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const version = fs.readFileSync(path.join(root, 'js', 'version.js'), 'utf8');

assert.ok(/id="setup-rake-mode"/.test(html), 'HTML tiene chips de rake');
assert.ok(/id="setup-rake-pct"/.test(html) && /id="setup-rake-cap"/.test(html), 'HTML tiene inputs rake custom');
assert.ok(/id="help-modal"/.test(html), 'HTML tiene modal de ayuda');
assert.ok(/id="btn-help"/.test(html) || /data-open-help/.test(html), 'HTML tiene botón de ayuda');
assert.ok(/js\/hotkeys\.js/.test(chunks), 'hotkeys en bundle core');
assert.ok(/js\/help\.js/.test(chunks), 'help en bundle core');
assert.ok(/PTHotkeys\.bind/.test(appJs), 'app enlaza hotkeys');
assert.ok(/PTHelp\.bind/.test(appJs), 'app enlaza ayuda');
assert.ok(/syncRakeUI/.test(appJs) && /persistRakeFromSetup/.test(appJs), 'app gestiona UI rake');
assert.ok(/rakeMode/.test(appJs) && /rakePct/.test(appJs), 'readPlayConfig incluye rake');
assert.ok(/action-hotkey/.test(appJs), 'botones de acción muestran atajos');
assert.ok(/rakeMode:\s*'none'/.test(playCfg), 'DEFAULT incluye rakeMode');
assert.ok(/estimateRakeBB/.test(playCfg) && /potAfterRakeBB/.test(playCfg), 'play-config estima rake');
assert.ok(/potAfterRakeBB/.test(engine), 'engine aplica rake al spot EV');
assert.ok(/Atajos de teclado/.test(help) || /Atajos de teclado/.test(help.replace(/\\n/g, '\n')), 'help documenta atajos');
assert.ok(/Rake en el entrenador/.test(help), 'help documenta rake');
assert.ok(/atajos de teclado/i.test(faq), 'FAQ menciona atajos');
assert.ok(/entrenar con rake/i.test(faq), 'FAQ menciona rake');
assert.ok(/888poker/i.test(faq), 'FAQ menciona 888poker');
assert.ok(/Cash/i.test(faq) && /Spins/i.test(faq) && /Torneos/i.test(faq), 'FAQ menciona pestañas Cash/Spins/Torneos');
assert.ok(/PLO/i.test(faq) && /Short Deck/i.test(faq), 'FAQ menciona PLO/Short Deck');
assert.ok(/help-modal-content/.test(css) && /action-hotkey/.test(css), 'CSS ayuda y hotkeys');
assert.ok(/action-hotkey\s*\{\s*display:\s*none/.test(css.replace(/\s+/g, ' ')) ||
  /@media[^{]*max-width:\s*720px[\s\S]*?\.action-hotkey\s*\{\s*display:\s*none/.test(css),
  'hotkeys ocultas en móvil');
assert.ok(/PT_BUILD\s*=\s*'2\.2\.6'/.test(version), 'versión 2.2.6');

const localStore = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null; },
    setItem(k, v) { localStore[k] = String(v); },
    removeItem(k) { delete localStore[k]; }
  },
  console
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.GTORangesNotation = {};
sandbox.GTORangesData = { VS_3BET_PAIRS: {} };
sandbox.GTORangesWeights = {};
sandbox.GTOEquity = {};

vm.runInNewContext(playCfg, sandbox);
const PC = sandbox.PTPlayConfig || sandbox.window.PTPlayConfig;
assert.ok(PC, 'PTPlayConfig exportado');

const none = PC.normalize({ rakeMode: 'none' });
assert.strictEqual(none.rakeMode, 'none');
assert.strictEqual(PC.estimateRakeBB(100, none), 0);

const std = PC.normalize({ rakeMode: 'standard' });
assert.strictEqual(std.rakePct, 5);
assert.strictEqual(std.rakeCapBB, 3);
assert.strictEqual(PC.estimateRakeBB(100, std), 3);
assert.strictEqual(PC.estimateRakeBB(40, std), 2);
assert.ok(PC.potAfterRakeBB(40, std) < 40);

const custom = PC.normalize({ rakeMode: 'custom', rakePct: 10, rakeCapBB: 2 });
assert.strictEqual(PC.estimateRakeBB(50, custom), 2);
assert.ok(/Sin rake/.test(PC.labelFor(none)));
assert.ok(/Rake/.test(PC.labelFor(std)));

PC.saveRakePrefs({ rakeMode: 'custom', rakePct: 7, rakeCapBB: 4 });
const prefs = PC.loadRakePrefs();
assert.strictEqual(prefs.rakeMode, 'custom');
assert.strictEqual(Number(prefs.rakePct), 7);

vm.runInNewContext(hotkeys, sandbox);
assert.ok(sandbox.PTHotkeys && typeof sandbox.PTHotkeys.bind === 'function', 'PTHotkeys.bind');
assert.strictEqual(sandbox.PTHotkeys.hintForAction('fold'), 'F');
assert.strictEqual(sandbox.PTHotkeys.hintForAction('call'), 'C');

vm.runInNewContext(help, sandbox);
assert.ok(sandbox.PTHelp && typeof sandbox.PTHelp.toggle === 'function', 'PTHelp.toggle');
assert.ok(typeof sandbox.PTHelp.open === 'function', 'PTHelp.open');

console.log('test-hotkeys-rake-help: OK');
