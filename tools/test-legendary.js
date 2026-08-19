'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cssLegendary = fs.readFileSync(path.join(root, 'css/legendary.css'), 'utf8');
const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'js/pt-loader.js'), 'utf8');
const catalogSrc = fs.readFileSync(path.join(root, 'js/legendary-hands-catalog.js'), 'utf8');
const forceSrc = fs.readFileSync(path.join(root, 'js/legendary-force.js'), 'utf8');
const legendarySrc = fs.readFileSync(path.join(root, 'js/legendary-hands.js'), 'utf8');

assert.ok(/data-tab="legendary"/.test(html), 'tab legendary in index');
assert.ok(/id="tab-legendary"/.test(html), 'panel legendary');
assert.ok(/tab-legendary hidden/.test(html), 'tab hidden by default');
assert.ok(/legendary\.css/.test(html), 'legendary css linked');
assert.ok(/legendary-scene-wrap/.test(cssLegendary), 'broadcast scene css');
assert.ok(/legendary-briefing/.test(cssLegendary), 'briefing css');
assert.ok(/CHUNKS\.legendary/.test(chunks), 'legendary chunk in bundle-chunks');
assert.ok(/legendary:\s*'dist\/pt-legendary\.js'/.test(loader), 'legendary chunk in pt-loader');

const ctx = { window: {}, global: null, console: console };
ctx.global = ctx.window;
vm.runInNewContext(chunks, ctx);
vm.runInNewContext(catalogSrc, ctx);
vm.runInNewContext(forceSrc, ctx);
vm.runInNewContext(legendarySrc, ctx);

const cat = ctx.window.PTLegendaryCatalog;
const force = ctx.window.PTLegendaryForce;
const leg = ctx.window.PTLegendary;

assert.ok(cat, 'PTLegendaryCatalog');
assert.ok(force, 'PTLegendaryForce');
assert.ok(leg, 'PTLegendary');
assert.ok(typeof force.buildBriefing === 'function', 'buildBriefing');

const hands = cat.list();
assert.ok(hands.length >= 10, 'at least 10 hands');

const spoilerPattern = /fold|bluff|cracked|full house|elimina|two pair|call-down|shove|perspectiva|imposible|runner/i;

hands.forEach(function (h) {
  assert.ok(h.id && h.titleBlind && h.cast && h.play, 'hand shape: ' + h.id);
  assert.ok(!spoilerPattern.test(h.titleBlind), 'neutral titleBlind: ' + h.titleBlind);
  assert.ok(h.play.stacks, 'real stacks on ' + h.id);
  (h.heroCandidates || []).forEach(function (hid) {
    const f = force.toForce(h, hid);
    assert.ok(f && f.forceDeal && f.forceScript, 'force for ' + h.id + ' / ' + hid);
    assert.ok(f.type === 'RFI' || f.type === 'vsRFI', 'start scenario RFI/vsRFI for ' + h.id + ' / ' + hid + ' got ' + f.type);
    if (f.type === 'vsRFI') {
      assert.ok(f.key, 'scenario key for ' + h.id + ' / ' + hid + ' (' + f.type + ')');
      assert.ok(/^[A-Z0-9]+_vs_[A-Z0-9]+$/.test(f.key), 'key format ' + f.key);
    }
    const pc = force.playConfig(h, hid);
    assert.ok(pc.legendaryMode && pc.legendaryHandId === h.id, 'playConfig legendary');
    assert.strictEqual(pc.actionMode, 'complete', 'complete action mode');
    assert.ok(pc.legendaryStacks, 'legendaryStacks');
    assert.ok(pc.legendaryBriefing && pc.legendaryBriefing.body, 'briefing text');
    const briefing = force.buildBriefing(h, hid);
    assert.ok(briefing.body.indexOf('¿Qué harías?') >= 0, 'briefing question');
  });
});

console.log('test-legendary: OK (' + hands.length + ' hands)');
