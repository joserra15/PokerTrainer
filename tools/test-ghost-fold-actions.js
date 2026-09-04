#!/usr/bin/env node
'use strict';
/**
 * Regresión: en 9-max multiway, la apuesta/check del villano vivo no debe
 * registrarse ni revelarse sobre un asiento ya en FOLD (p. ej. el opener del
 * escenario cuando el lead postflop lo hace otro).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sb = createSandbox();
loadTrainer(sb);
const { Engine, PTPlayConfig: PC } = sb.window;

const cfg = PC.normalize({
  gameType: 'cash9',
  stackDepth: 'bb100',
  scenario: 'random',
  villainLevel: 'fish',
  actionMode: 'complete',
  formatHub: 'cash'
});

let cases = 0;
let checked = 0;
for (let seed = 1; seed < 12000 && cases < 12; seed++) {
  const h = Engine.newHand({ seed }, cfg);
  if (!h || !h.current) continue;
  let guard = 0;
  while (h.current && h.stage !== 'complete' && guard++ < 16) {
    const opts = (h.current.options || []).map((o) => o.id);
    const aid = opts.indexOf('check') >= 0
      ? 'check'
      : (opts.indexOf('call') >= 0 ? 'call' : opts[0]);
    Engine.act(h, aid);
    const rev = h._reveal || [];
    const ghost = rev.filter((e) =>
      e.kind === 'act' && e.pos && e.type !== 'fold' && h.table.folded[e.pos]
    );
    assert.strictEqual(
      ghost.length, 0,
      'reveal sobre FOLD (seed ' + seed + '): ' + ghost.map((e) => e.pos + ':' + e.type).join(',')
    );
    const vPos = h.villain && h.villain.pos;
    const vSeat = PC.villainTableSeat(h);
    if (vPos && h.table.inHand.has(vPos) && !h.table.folded[vPos]) {
      assert.strictEqual(
        vSeat, vPos,
        'villainTableSeat debe ser el vivo (seed ' + seed + ', villain=' + vPos + ', vSeat=' + vSeat + ')'
      );
    }
    const betEv = rev.filter((e) => e.kind === 'act' && (e.type === 'bet' || e.type === 'raise'));
    betEv.forEach((e) => {
      assert.ok(
        !h.table.folded[e.pos],
        'bet/raise en reveal no puede ser un fold (seed ' + seed + ', ' + e.pos + ')'
      );
    });
    checked++;
    if (h.stage === 'river' && h.current && (h.current.toCallBB || 0) > 0) {
      cases++;
      break;
    }
    if (h.result || !h.current) break;
  }
}

assert.ok(cases >= 3, 'pocos river facing bet para validar (' + cases + ')');
assert.ok(checked >= 20, 'pocas acciones comprobadas');

const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
assert.ok(/!isFolded/.test(app) && /act\.type !== 'fold'/.test(app),
  'render no pinta actividad sobre FOLD');
assert.ok(/order:\s*-1/.test(css) && /\.seat\.seat-top \.seat-act-wrap[\s\S]{0,80}order:\s*1/.test(css),
  'burbuja encima de cartas / bajo cartas en arco superior');
assert.ok(!/\.seat\.seat-edge-left \.seat-act-wrap[\s\S]{0,80}top:\s*calc\(100%/.test(css),
  'laterales no cuelgan la burbuja bajo el hueco (tapaba el stack)');

console.log('OK: sin acciones fantasma sobre FOLD (' + cases + ' river-facing, ' + checked + ' actos)');
