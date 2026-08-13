#!/usr/bin/env node
/**
 * Modo completo vs rápido: guion preflop (UTG→héroe), reveal post-acción,
 * UI de setup y timing de reproducción.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const ROOT = path.join(__dirname, '..');
const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig } = sandbox.window;

assert.ok(Engine, 'Engine loaded');
assert.ok(Engine.buildOpeningActionScript, 'buildOpeningActionScript exported');
assert.ok(Engine.buildStreetIntroScript, 'buildStreetIntroScript exported');
assert.ok(PTPlayConfig, 'PTPlayConfig loaded');

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'playable',
    villainLevel: 'fish',
    practiceStreet: 'preflop',
    actionMode: 'complete'
  }, extra || {}));
}

function scriptKey(e) {
  return (e.pos || '') + ':' + (e.type || e.kind);
}

console.log('1) normalize + labelFor actionMode');
{
  assert.strictEqual(PTPlayConfig.normalize({}).actionMode, 'quick');
  assert.strictEqual(PTPlayConfig.normalize({ actionMode: 'complete' }).actionMode, 'complete');
  assert.strictEqual(PTPlayConfig.normalize({ actionMode: 'nope' }).actionMode, 'quick');
  const quick = PTPlayConfig.normalize({ actionMode: 'quick' });
  const full = PTPlayConfig.normalize({ actionMode: 'complete' });
  assert.ok(/Modo rápido/.test(PTPlayConfig.labelFor(quick)), 'label rápido');
  assert.ok(/Modo completo/.test(PTPlayConfig.labelFor(full)), 'label completo');
}

console.log('2) RFI BB: folds UTG→SB, héroe no actúa');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'BB', engineHeroPos: 'BB', seed: 11 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  assert.ok(script.length >= 4, 'al menos UTG HJ CO BTN');
  script.forEach((e) => {
    assert.strictEqual(e.kind, 'act');
    assert.strictEqual(e.type, 'fold');
    assert.notStrictEqual(e.pos, 'BB');
  });
  const pos = script.map((e) => e.pos);
  assert.strictEqual(pos[0], 'UTG', 'empieza en UTG');
  assert.ok(pos.indexOf('SB') >= 0, 'SB foldea antes de BB');
  assert.strictEqual(pos.join(','), 'UTG,HJ,CO,BTN,SB');
}

console.log('3) RFI UTG: guion vacío (la acción ya es del héroe)');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'UTG' });
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'UTG', engineHeroPos: 'UTG', seed: 12 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  assert.strictEqual(script.length, 0, 'nadie actúa antes de UTG');
}

console.log('4) vsRFI: folds + open + folds hasta héroe');
{
  const play = cfg({ scenario: '3bet', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_UTG', seed: 22 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const open = script.find((e) => e.type === 'open');
  assert.ok(open, 'hay open');
  assert.strictEqual(open.pos, 'UTG');
  assert.ok(open.amount > 0);
  const afterOpen = script.slice(script.indexOf(open) + 1);
  afterOpen.forEach((e) => {
    assert.strictEqual(e.type, 'fold');
    assert.notStrictEqual(e.pos, 'BB');
  });
}

console.log('5) face3bet: open automático del héroe + 3-bet villano');
{
  const play = cfg({ scenario: 'face3bet', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'face3bet', key: 'CO_vs_BB', seed: 33 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const auto = script.filter((e) => e.autoHero);
  assert.strictEqual(auto.length, 1, 'una acción automática del héroe');
  assert.strictEqual(auto[0].type, 'open');
  assert.strictEqual(auto[0].pos, 'CO');
  const last = script[script.length - 1];
  assert.strictEqual(last.type, 'raise');
  assert.strictEqual(last.pos, 'BB');
  const autoIdx = script.indexOf(auto[0]);
  assert.ok(autoIdx < script.length - 1, 'el 3-bet va después del open del héroe');
}

console.log('5b) face3bet CO vs BTN: SB y BB foldean tras el 3-bet');
{
  const play = cfg({ scenario: 'face3bet', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'face3bet', key: 'CO_vs_BTN', seed: 34 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const keys = script.map(scriptKey);
  assert.ok(keys.indexOf('CO:open') >= 0, 'héroe abre');
  assert.ok(keys.indexOf('BTN:raise') >= 0, 'BTN 3-betea');
  assert.ok(keys.indexOf('SB:fold') >= 0, 'SB foldea al 3-bet');
  assert.ok(keys.indexOf('BB:fold') >= 0, 'BB foldea al 3-bet');
  assert.ok(keys.indexOf('BTN:raise') < keys.indexOf('SB:fold'), 'SB actúa después del 3-bet');
  assert.ok(keys.indexOf('SB:fold') < keys.indexOf('BB:fold'), 'BB actúa después de SB');
  assert.strictEqual(keys[keys.length - 1], 'BB:fold', 'la acción vuelve al héroe tras las ciegas');
  assert.ok(hand.table.folded.SB, 'SB folded en el motor');
  assert.ok(hand.table.folded.BB, 'BB folded en el motor');
  assert.ok(!hand.table.folded.CO && !hand.table.folded.BTN, 'CO y BTN siguen vivos');
}

console.log('6) face4bet: 3-bet automático del héroe + 4-bet villano');
{
  const play = cfg({ scenario: '4bet', heroPos: 'BB' });
  const hand = Engine.newHand({ type: 'face4bet', key: 'BB_vs_UTG', seed: 44 }, play);
  const script = Engine.buildOpeningActionScript(hand);
  const keys = script.map(scriptKey);
  assert.ok(keys.indexOf('UTG:open') >= 0, 'UTG abre');
  const auto = script.filter((e) => e.autoHero);
  assert.strictEqual(auto.length, 1, '3-bet automático');
  assert.strictEqual(auto[0].type, 'raise');
  assert.strictEqual(auto[0].pos, 'BB');
  const last = script[script.length - 1];
  assert.strictEqual(last.type, 'raise');
  assert.strictEqual(last.pos, 'UTG');
  assert.ok(keys.indexOf('BB:raise') < keys.lastIndexOf('UTG:raise'), '4-bet después del 3-bet');
}

console.log('6b) face4bet CO vs UTG: BTN/SB/BB foldean tras el 3-bet del héroe');
{
  const play = cfg({ scenario: '4bet', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'face4bet', key: 'CO_vs_UTG', seed: 45 }, play);
  const keys = Engine.buildOpeningActionScript(hand).map(scriptKey);
  const hero3 = keys.indexOf('CO:raise');
  const vill4 = keys.lastIndexOf('UTG:raise');
  assert.ok(hero3 >= 0 && vill4 > hero3, '4-bet del opener después del 3-bet');
  ['BTN', 'SB', 'BB'].forEach(function (pos) {
    const idx = keys.indexOf(pos + ':fold');
    assert.ok(idx > hero3 && idx < vill4, pos + ' foldea al 3-bet antes del 4-bet');
  });
}

console.log('7) squeeze: open + call + folds');
{
  const play = cfg({ scenario: 'squeeze', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'squeeze', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN', seed: 55
  }, play);
  const keys = Engine.buildOpeningActionScript(hand).map(scriptKey);
  assert.ok(keys.indexOf('CO:open') >= 0, 'CO abre');
  assert.ok(keys.indexOf('BTN:call') >= 0, 'BTN paga');
  assert.ok(keys.indexOf('CO:open') < keys.indexOf('BTN:call'), 'open antes del call');
  assert.ok(keys.every((k) => k.indexOf('BB:') !== 0), 'héroe aún no actúa');
}

console.log('8) iso limp + BB vs SB limp + cold 4-bet');
{
  const iso = Engine.newHand({
    type: 'isoLimp', heroPos: 'BTN', limperPos: 'CO', seed: 71
  }, cfg({ scenario: 'iso', heroPos: 'BTN' }));
  const isoScript = Engine.buildOpeningActionScript(iso);
  assert.ok(isoScript.some((e) => e.pos === 'CO' && e.type === 'call'), 'limper visible');
  assert.ok(!isoScript.some((e) => e.pos === 'BTN'), 'héroe decide el iso');

  const bb = Engine.newHand({ type: 'bbVsSbLimp', heroPos: 'BB', seed: 72 }, cfg({ scenario: 'bbvsb' }));
  const bbScript = Engine.buildOpeningActionScript(bb);
  assert.ok(bbScript.some((e) => e.pos === 'SB' && e.type === 'call'), 'SB limpea');
  assert.ok(bbScript.filter((e) => e.type === 'fold').length >= 3, 'folds hasta SB');

  const c4 = Engine.newHand({
    type: 'cold4bet', heroPos: 'CO', openerPos: 'UTG', threeBettorPos: 'HJ', seed: 73
  }, cfg({ scenario: 'cold4bet', heroPos: 'CO' }));
  const c4s = Engine.buildOpeningActionScript(c4);
  const c4k = c4s.map(scriptKey);
  assert.ok(c4k.indexOf('UTG:open') >= 0, 'open');
  assert.ok(c4k.indexOf('HJ:raise') >= 0, '3-bet');
  assert.ok(!c4s.some((e) => e.pos === 'CO'), 'héroe decide el cold 4-bet');
}

console.log('9) 9-max y spin: orden de asientos');
{
  const nine = Engine.newHand(
    { type: 'RFI', heroPos: 'BB', engineHeroPos: 'BB', seed: 81 },
    cfg({ gameType: 'cash9', heroPos: 'BB', scenario: 'rfi' })
  );
  const ninePos = Engine.buildOpeningActionScript(nine).map((e) => e.pos);
  assert.ok(ninePos.indexOf('UTG') === 0, '9-max empieza UTG');
  assert.ok(ninePos.indexOf('UTG1') >= 0 && ninePos.indexOf('LJ') >= 0, 'incluye UTG1 y LJ');
  assert.ok(ninePos.indexOf('BB') < 0);

  const spin = Engine.newHand(
    { type: 'RFI', heroPos: 'BB', engineHeroPos: 'BB', seed: 82 },
    cfg({ formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb25', heroPos: 'BB', scenario: 'rfi' })
  );
  const spinPos = Engine.buildOpeningActionScript(spin).map((e) => e.pos);
  assert.strictEqual(spinPos.join(','), 'BTN,SB');
}

console.log('10) act() registra reveal del héroe');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'CO' });
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 66 }, play);
  Engine.act(hand, 'raise');
  assert.ok(Array.isArray(hand._reveal), 'reveal array');
  assert.ok(hand._reveal.some((e) => e.kind === 'act' && e.isHero), 'incluye acción del héroe');
  const heroActs = hand._reveal.filter((e) => e.kind === 'act' && e.isHero);
  assert.ok(heroActs.length >= 1);
}

console.log('11) reveal postflop incluye calle cuando la mano llega al flop');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'CO' });
  let foundStreet = false;
  for (let i = 0; i < 40; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 300 + i }, play);
    if (!hand.current) continue;
    const opt = (hand.current.options || []).map((o) => o.id);
    const actId = opt.indexOf('raise') >= 0 ? 'raise' : opt[0];
    Engine.act(hand, actId);
    if (hand._reveal && hand._reveal.some((e) => e.kind === 'street' && e.street === 'flop')) {
      foundStreet = true;
      const intro = Engine.buildStreetIntroScript(hand);
      if (hand.stage === 'flop' && hand.current) {
        assert.ok(intro.length >= 1);
        assert.strictEqual(intro[0].kind, 'street');
      }
      break;
    }
  }
  assert.ok(foundStreet, 'algún seed llega al flop con evento street');
}

console.log('12) street intro postflop tras fast-forward');
{
  const play = cfg({ scenario: 'rfi', heroPos: 'CO', practiceStreet: 'flop' });
  let intro = [];
  for (let i = 0; i < 20; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 200 + i }, play);
    Engine.fastForwardToStreet(hand, 'flop');
    if (hand.stage === 'flop' && hand.current) {
      intro = Engine.buildStreetIntroScript(hand);
      if (intro.length) break;
    }
  }
  assert.ok(intro.length >= 1, 'street intro no vacío');
  assert.strictEqual(intro[0].kind, 'street');
  assert.strictEqual(intro[0].street, 'flop');
}

console.log('13) UI / i18n / timing del modo');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  const i18n = fs.readFileSync(path.join(ROOT, 'js', 'i18n.js'), 'utf8');
  const ci = fs.readFileSync(path.join(ROOT, 'tools', 'run-ci-tests.js'), 'utf8');

  assert.ok(/id="setup-action-mode"/.test(html), 'chips modo de mesa');
  assert.ok(/data-val="quick"/.test(html) && /data-val="complete"/.test(html), 'chips rápido/completo');
  assert.ok(/play\.actionMode/.test(html) && /play\.actionModeHint/.test(html), 'i18n en setup');
  assert.ok(/pt_action_mode/.test(appJs), 'persiste preferencia');
  assert.ok(/function playActionScript/.test(appJs), 'reproductor de acción');
  assert.ok(/function shouldPlayOpening/.test(appJs) && /function shouldPlayReveal/.test(appJs), 'gates rápido/completo');
  assert.ok(/currentActionMode\(\) === 'complete'/.test(appJs), 'preflop completo solo si está activado');
  assert.ok(/if \(postflop\) return true/.test(appJs), 'postflop siempre completo');
  assert.ok(/action-play-skip/.test(appJs) && /play\.actionSkip/.test(appJs), 'botón saltar');
  assert.ok(/t === 'fold'\) return 300/.test(appJs), 'timing fold 300ms');
  assert.ok(/t === 'call'\) return 420/.test(appJs), 'timing call 420ms');
  assert.ok(/return 500/.test(appJs), 'timing raise/bet 500ms');
  assert.ok(/kind === 'street'\) return 560/.test(appJs), 'timing calle 560ms');
  assert.ok(/\.seat\.acting/.test(css) && /\.action-play-status/.test(css), 'CSS highlight y status');
  assert.ok(/'play\.actionComplete': 'Completo'/.test(i18n), 'i18n ES');
  assert.ok(/'play\.actionComplete': 'Full'/.test(i18n), 'i18n EN');
  assert.ok(/'play\.actionPlaying'/.test(i18n) && /'play\.actionSkip'/.test(i18n), 'i18n playback');
  assert.ok(/test-action-mode\.js/.test(ci), 'registrado en test:ci');
}

console.log('Modo de acción: OK');
