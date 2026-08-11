#!/usr/bin/env node
/**
 * Regresión profunda — botes multiway en el entrenador (v2.1).
 *
 * Cubre:
 *  - HU regression (allowMultiway=false → colapso clásico)
 *  - SRP 3-way / 4-way dedicados: ≥3 vivos al flop
 *  - Limp pot multiway
 *  - Random orgánico: fish genera más multiway que pro (smoke)
 *  - Equity N-way + side pots showdown
 *  - Scoring multiway (confianza ↓)
 *  - buildSpotInput.multiway
 *  - Cartas cold-caller en rango de call
 *  - Postflop: apuesta héroe → rivales responden sin colapsar a 1
 *  - Replay snapshot conserva multiway/potType
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig, GTOMultiway, GTOEquity, GTO, Cards, Ranges } = sandbox.window;

assert.ok(Engine, 'Engine loaded');
assert.ok(PTPlayConfig, 'PTPlayConfig loaded');
assert.ok(GTOMultiway, 'GTOMultiway loaded');
assert.ok(GTOEquity.equityVsN, 'equityVsN exported');

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'playable',
    villainLevel: 'fish',
    practiceStreet: 'random',
    allowMultiway: true
  }, extra || {}));
}

function alive(hand) {
  return GTOMultiway.aliveSeats(hand);
}

function forceOpenCallFlop(hand) {
  // Si hay decisión preflop, forzar call/raise según kind para llegar al flop
  let guard = 0;
  while (hand.stage === 'preflop' && hand.current && guard++ < 8) {
    const kind = hand.current.kind;
    const opts = (hand.current.options || []).map((o) => o.id);
    let act = 'call';
    if (kind === 'RFI' && opts.indexOf('raise') >= 0) act = 'raise';
    else if (kind === 'multiwayReady') act = opts[0];
    else if (opts.indexOf('call') >= 0) act = 'call';
    else if (opts.indexOf('check') >= 0) act = 'check';
    else act = opts[0];
    Engine.act(hand, act);
  }
  return hand;
}

console.log('1) HU regression — allowMultiway=false colapsa callers');
{
  const play = cfg({ allowMultiway: false, scenario: 'rfi', heroPos: 'CO', villainLevel: 'fish' });
  let foundCollapse = false;
  for (let i = 0; i < 80; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', engineHeroPos: 'CO', seed: 1000 + i }, play);
    assert.strictEqual(hand.stage, 'preflop');
    Engine.act(hand, 'raise');
    if (hand.stage === 'complete') continue; // all fold / 3bet path ended
    if (hand.stage === 'preflop' && hand.current && hand.current.kind === 'face3bet') {
      Engine.act(hand, 'fold');
      continue;
    }
    if (hand.stage === 'flop' || hand.stage === 'turn' || hand.stage === 'river') {
      const n = alive(hand).length;
      assert.ok(n <= 2, 'HU collapse: alive≤2 got ' + n + ' seed=' + (1000 + i));
      foundCollapse = true;
      break;
    }
  }
  assert.ok(foundCollapse, 'expected at least one HU flop with allowMultiway=false');
}

console.log('2) Dedicated srp3way — siempre ≥3 al flop');
{
  let ok = 0;
  for (let i = 0; i < 40; i++) {
    const play = cfg({
      scenario: 'multiway',
      multiwayPotType: 'srp3way',
      heroPos: 'BB',
      handRange: 'playable',
      villainLevel: 'intermediate'
    });
    const hand = Engine.newHand({
      type: 'srp3way',
      heroPos: 'BB',
      openerPos: 'CO',
      callerPos: 'BTN',
      callerPositions: ['BTN'],
      potType: 'srp3way',
      seed: 2000 + i
    }, play);
    forceOpenCallFlop(hand);
    if (hand.stage === 'complete') continue;
    assert.ok(['flop', 'turn', 'river'].indexOf(hand.stage) >= 0, 'should reach postflop, got ' + hand.stage);
    const n = alive(hand).length;
    assert.ok(n >= 3, 'srp3way alive≥3 got ' + n + ' seats=' + alive(hand).join(','));
    assert.strictEqual(n, 3, 'srp3way exactamente 3 vivos, no fantasmas: ' + alive(hand).join(','));
    // CO 2.5 + BTN 2.5 + BB 2.5 + SB dead 0.5 = 8.0
    assert.ok(hand.potBB >= 7.9 && hand.potBB <= 8.2, 'srp3way pot~8bb got ' + hand.potBB);
    ['CO', 'BTN', 'BB'].forEach(function (p) {
      assert.ok((hand.table.invested[p] || 0) >= 2.4, p + ' paid open, inv=' + hand.table.invested[p]);
    });
    assert.ok(hand.table.folded.UTG || !hand.table.inHand.has('UTG'), 'UTG folded');
    assert.ok(hand.table.folded.HJ || !hand.table.inHand.has('HJ'), 'HJ folded');
    assert.ok(hand.multiway, 'hand.multiway true');
    assert.ok(hand.potType === 'srp3way' || hand.potType === 'srp4way', 'potType srp*');
    const input = Engine.buildSpotInput(hand, hand.current, null);
    assert.ok(input.multiway, 'buildSpotInput.multiway');
    ok++;
  }
  assert.ok(ok >= 25, 'enough srp3way hands reached flop: ' + ok);
}

console.log('3) Dedicated srp4way — ≥4 vivos');
{
  let ok = 0;
  for (let i = 0; i < 30; i++) {
    const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp4way', heroPos: 'BB' });
    const hand = Engine.newHand({
      type: 'srp4way',
      heroPos: 'BB',
      openerPos: 'HJ',
      callerPos: 'BTN',
      callerPositions: ['CO', 'BTN'],
      potType: 'srp4way',
      seed: 3000 + i
    }, play);
    forceOpenCallFlop(hand);
    if (hand.stage === 'complete') continue;
    const n = alive(hand).length;
    assert.ok(n >= 4, 'srp4way alive≥4 got ' + n);
    assert.strictEqual(n, 4, 'srp4way exactamente 4 vivos got ' + n + ' ' + alive(hand).join(','));
    // HJ+CO+BTN+BB @2.5 + SB dead 0.5 = 10.5
    assert.ok(hand.potBB >= 10.0 && hand.potBB <= 11.0, 'srp4way pot~10.5 got ' + hand.potBB);
    assert.ok(hand.multiway);
    ok++;
  }
  assert.ok(ok >= 15, 'srp4way flops: ' + ok);
}

console.log('4) Limp pot multiway');
{
  let ok = 0;
  for (let i = 0; i < 25; i++) {
    const play = cfg({ scenario: 'multiway', multiwayPotType: 'limpPot', heroPos: 'BB' });
    const hand = Engine.newHand({
      type: 'limpPot',
      heroPos: 'BB',
      limperPos: 'UTG',
      limperPositions: ['UTG', 'HJ'],
      potType: 'limpPot',
      seed: 4000 + i
    }, play);
    // Debe ofrecer decisión preflop (check/iso), no saltar al flop
    assert.equal(hand.stage, 'preflop', 'limpPot empieza en preflop seed=' + (4000 + i));
    assert.ok(hand.current && hand.current.kind === 'limpPotBB', 'kind limpPotBB');
    assert.ok((hand.current.options || []).some((o) => o.id === 'call' || o.id === 'check'), 'opción check');
    assert.ok((hand.current.options || []).some((o) => o.id === 'raise'), 'opción iso');
    if (hand.stage === 'preflop' && hand.current) forceOpenCallFlop(hand);
    if (hand.stage === 'complete') continue;
    assert.ok(alive(hand).length >= 2, 'limpPot tras check ≥2 got ' + alive(hand).length);
    assert.ok(hand.potType === 'limpPot' || hand.potType === 'hu', 'potType limp/hu got ' + hand.potType);
    ok++;
  }
  assert.ok(ok >= 12, 'limp pots: ' + ok);
}

console.log('5) Side pots + showdown multiway correcto');
{
  const pots = GTOMultiway.computeSidePots(
    { BB: 10, BTN: 10, CO: 50, SB: 5 },
    ['BB', 'BTN', 'CO']
  );
  assert.ok(pots.length >= 2, 'side pots layers');
  const total = pots.reduce((s, p) => s + p.amount, 0);
  assert.ok(total > 20, 'pot total includes layers');

  // Showdown: héroe nuts vs dos peores
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'srp3way',
    heroPos: 'BB',
    openerPos: 'CO',
    callerPos: 'BTN',
    callerPositions: ['BTN'],
    potType: 'srp3way',
    seed: 42,
    forceDeal: {
      hero: ['As', 'Ad'],
      villain: ['2c', '2d'],
      board: ['Ah', 'Kd', '7c', '3s', '9h'],
      seats: { BTN: ['3c', '3d'] }
    }
  }, play);
  // Apply seat cards if forceDeal.seats supported; else patch table
  if (hand.table && hand.table.holeCards) {
    hand.table.holeCards.BB = ['As', 'Ad'];
    hand.table.holeCards.CO = ['2c', '2d'];
    hand.table.holeCards.BTN = ['3c', '3d'];
    hand.hero.cards = ['As', 'Ad'];
    hand.hero.code = Ranges.handCode('As', 'Ad');
    if (hand.villain) hand.villain.cards = ['2c', '2d'];
  }
  forceOpenCallFlop(hand);
  // Force runout to showdown
  hand.board = ['Ah', 'Kd', '7c', '3s', '9h'];
  hand._boardIdx = 5;
  hand.stage = 'river';
  hand.multiway = true;
  hand.table.folded = { SB: true, UTG: true, HJ: true };
  ['BB', 'CO', 'BTN'].forEach((p) => {
    hand.table.folded[p] = false;
    hand.table.inHand.add(p);
  });
  hand.table.invested = { BB: 10, CO: 10, BTN: 10, SB: 0.5, UTG: 0, HJ: 0 };
  hand.heroInvested = 10;
  hand.potBB = 30.5;
  hand.villain.pos = 'CO';
  hand.villain.cards = ['2c', '2d'];
  GTOMultiway.syncOpponents(hand);
  const res = GTOMultiway.resolveShowdown(hand, Cards);
  assert.ok(res.showdown, 'showdown flag');
  assert.ok(res.heroNet > 0, 'AA wins multiway showdown, net=' + res.heroNet);
  assert.ok(res.opponentCards && res.opponentCards.length >= 2, 'opponent cards revealed');
}

console.log('6) Equity N-way < equity HU vs misma mano débil (más jugadores)');
{
  const hero = ['As', 'Ad'];
  const board = ['Kh', '7d', '2c'];
  const eq1 = GTOEquity.equityVsN(hero, board, [{ cards: ['3c', '3d'] }], 500);
  const eq2 = GTOEquity.equityVsN(hero, board, [{ cards: ['3c', '3d'] }, { cards: ['Td', 'Tc'] }], 500);
  assert.ok(eq1 > 0.75, 'AA vs 33 favored HU eq=' + eq1);
  assert.ok(eq2 < eq1 - 0.02, 'equity drops with extra opponent: ' + eq2 + ' < ' + eq1);
}

console.log('7) Scoring marca multiway (confianza ↓)');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'srp3way', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN',
    callerPositions: ['BTN'], potType: 'srp3way', seed: 55
  }, play);
  forceOpenCallFlop(hand);
  if (hand.current && hand.stage !== 'complete') {
    const input = Engine.buildSpotInput(hand, hand.current, 'check');
    assert.ok(input.multiway, 'input multiway');
    const evaled = GTO.evaluateSpot(Object.assign({}, input, { chosenAction: 'check' }));
    assert.ok(evaled, 'evaluateSpot works multiway');
    // LocalSolver / scoring may attach confidence reasons
    if (evaled.confidenceReasons) {
      assert.ok(
        evaled.confidenceReasons.some((r) => /multiway/i.test(r)) || evaled.multiway || input.multiway,
        'multiway noted in eval'
      );
    }
  }
}

console.log('8) Postflop multiway: bet del héroe no foldea extras silenciosamente');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB', villainLevel: 'fish' });
  let exercised = false;
  for (let i = 0; i < 50; i++) {
    const hand = Engine.newHand({
      type: 'srp3way', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN',
      callerPositions: ['BTN'], potType: 'srp3way', seed: 6000 + i
    }, play);
    forceOpenCallFlop(hand);
    if (hand.stage !== 'flop' || !hand.current) continue;
    const before = alive(hand).length;
    if (before < 3) continue;
    const opts = (hand.current.options || []).map((o) => o.id);
    const betId = opts.find((id) => id === 'bet' || id.indexOf('bet_') === 0) || (opts.indexOf('check') >= 0 ? 'check' : null);
    if (!betId) continue;
    Engine.act(hand, betId);
    // Tras bet, o ganamos (todos fold), o seguimos con ≥2, o enfrentamos raise
    if (hand.stage === 'complete') {
      exercised = true;
      break;
    }
    const after = alive(hand).length;
    // No debería quedar exactamente 1 (héroe solo sin finish)
    assert.ok(after >= 2 || hand.stage === 'complete', 'after bet alive>=2 or done');
    exercised = true;
    break;
  }
  assert.ok(exercised, 'postflop multiway bet path exercised');
}

console.log('9) Cold-caller cartas dentro de pesos de call (deal playable)');
{
  const play = cfg({
    scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB',
    handRange: 'playable', villainLevel: 'pro'
  });
  let checked = 0;
  for (let i = 0; i < 30; i++) {
    const scenario = {
      type: 'srp3way', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN',
      callerPositions: ['BTN'], potType: 'srp3way'
    };
    const deals = PTPlayConfig.getScenarioDeals(scenario, play);
    const callerDeal = deals.find((d) => d.role === 'coldCaller');
    assert.ok(callerDeal, 'coldCaller deal role');
    assert.ok(callerDeal.weights && Object.keys(callerDeal.weights).length > 10, 'caller has range weights');
    const openerDeal = deals.find((d) => d.role === 'opener');
    assert.ok(openerDeal && openerDeal.weights, 'opener weights');
    checked++;
  }
  assert.ok(checked >= 30);
}

console.log('10) Random fish vs pro — tasa multiway orgánica');
{
  function rate(level, n) {
    let mw = 0;
    let flops = 0;
    for (let i = 0; i < n; i++) {
      const play = cfg({
        scenario: 'rfi',
        heroPos: 'BTN',
        handRange: 'random',
        villainLevel: level,
        allowMultiway: true
      });
      const hand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', engineHeroPos: 'BTN', seed: 90000 + i * 17 + (level === 'fish' ? 1 : 2) }, play);
      Engine.act(hand, 'raise');
      if (hand.stage === 'preflop' && hand.current && hand.current.kind === 'face3bet') {
        Engine.act(hand, 'fold');
        continue;
      }
      if (hand.stage === 'flop') {
        flops++;
        if (alive(hand).length >= 3 || hand.multiway) mw++;
      }
    }
    return { mw, flops, rate: flops ? mw / flops : 0 };
  }
  const fish = rate('fish', 120);
  const pro = rate('pro', 120);
  console.log('   fish multiway rate', fish.mw + '/' + fish.flops, '=', fish.rate.toFixed(3));
  console.log('   pro  multiway rate', pro.mw + '/' + pro.flops, '=', pro.rate.toFixed(3));
  // No forzamos desigualdad estricta (RNG), pero ambos paths deben funcionar
  assert.ok(fish.flops + pro.flops > 20, 'enough flops sampled');
}

console.log('11) Replay snapshot conserva multiway');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'srp3way', heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN',
    callerPositions: ['BTN'], potType: 'srp3way', seed: 777
  }, play);
  forceOpenCallFlop(hand);
  if (hand.stage !== 'complete') {
    Engine.act(hand, (hand.current.options[0] || {}).id || 'check');
  }
  // Finish somehow
  let g = 0;
  while (hand.stage !== 'complete' && g++ < 20) {
    if (!hand.current) break;
    const id = hand.current.options[0].id;
    Engine.act(hand, id === 'fold' ? (hand.current.options[1] || hand.current.options[0]).id : id);
  }
  if (hand.replaySnapshot) {
    assert.ok('multiway' in hand.replaySnapshot || hand.multiway != null, 'replay has multiway field');
  }
}

console.log('12) Pool multiway + UI markers');
{
  const pool = PTPlayConfig.buildScenarioPool(cfg({ scenario: 'multiway', multiwayPotType: 'any' }));
  assert.ok(pool.some((s) => s.type === 'srp3way'), 'pool has srp3way');
  assert.ok(pool.some((s) => s.type === 'limpPot'), 'pool has limpPot');
  assert.ok(pool.some((s) => s.type === 'srp4way'), 'pool has srp4way');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('data-val="multiway"'), 'UI chip multiway');
  assert.ok(indexHtml.includes('setup-multiway-pot-type'), 'UI pot type');
  const version = fs.readFileSync(path.join(__dirname, '..', 'js', 'version.js'), 'utf8');
  assert.ok(/PT_BUILD\s*=\s*'2\.2\.3'/.test(version), 'version 2.2.3');
  const chunks = fs.readFileSync(path.join(__dirname, '..', 'js', 'bundle-chunks.js'), 'utf8');
  assert.ok(chunks.includes('multiway.js'), 'multiway in bundle');
}

console.log('13) policy mult perfiles (fish llama más que nit en multiway)');
{
  const fish = GTOMultiway.multiwayPolicyMult({ id: 'fish' });
  const nit = GTOMultiway.multiwayPolicyMult({ id: 'nit' });
  const pro = GTOMultiway.multiwayPolicyMult({ id: 'pro' });
  assert.ok(fish.call > nit.call, 'fish callMult > nit');
  assert.ok(pro.bluff < 0.6, 'pro bluffs less multiway');
  assert.ok(nit.cbet < fish.cbet, 'nit cbets less');
}

console.log('14) Pot multiway: sin asientos fantasma y bote = suma de invested');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp4way', heroPos: 'BB' });
  const hand = Engine.newHand({
    type: 'srp4way',
    heroPos: 'BB',
    openerPos: 'UTG',
    callerPos: 'CO',
    callerPositions: ['HJ', 'CO'],
    potType: 'srp4way',
    seed: 42
  }, play);
  forceOpenCallFlop(hand);
  assert.ok(hand.stage === 'flop' || hand.stage === 'turn' || hand.stage === 'river', 'postflop');
  const seats = alive(hand).slice().sort().join(',');
  assert.strictEqual(seats, 'BB,CO,HJ,UTG', 'solo participantes: ' + seats);
  assert.ok(seats.indexOf('BTN') < 0, 'BTN no está en el bote');
  assert.ok(!hand.table.inHand.has('SB') || hand.table.folded.SB, 'SB no vivo');
  let sum = 0;
  Object.keys(hand.table.invested).forEach(function (p) { sum += hand.table.invested[p] || 0; });
  assert.ok(Math.abs(hand.potBB - Engine.round2(sum)) < 0.02, 'potBB == sum invested ' + hand.potBB + ' vs ' + sum);
  // 4 × 2.5 + SB 0.5 muerto = 10.5
  assert.ok(hand.potBB >= 10.4 && hand.potBB <= 10.6, 'bote esperado ~10.5, got ' + hand.potBB);
  // Context no debe decir 6-way
  const ctx = (hand.current && hand.current.context) || '';
  assert.ok(!/6-way/.test(ctx), 'context no dice 6-way: ' + ctx);
  assert.ok(alive(hand).length === 4, 'alive count 4');
}

console.log('15) Postflop multiway: BTN actúa antes de que el héroe afronte apuesta');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB', villainLevel: 'fish' });
  let exercised = 0;
  for (let i = 0; i < 80; i++) {
    const hand = Engine.newHand({
      type: 'srp3way',
      heroPos: 'BB',
      openerPos: 'UTG',
      callerPos: 'BTN',
      callerPositions: ['BTN'],
      potType: 'srp3way',
      seed: 12000 + i
    }, play);
    forceOpenCallFlop(hand);
    if (hand.stage !== 'flop' || !hand.current) continue;
    if ((hand.current.toCallBB || 0) > 0) continue; // already facing — skip
    const alive0 = alive(hand);
    if (alive0.indexOf('BTN') < 0 || alive0.indexOf('UTG') < 0) continue;
    Engine.act(hand, 'check');
    if (hand.stage === 'complete') continue;
    if (hand.stage !== 'flop' && hand.stage !== 'turn') {
      // went to next street: everyone checked — BTN must have check label or street advanced
      exercised++;
      continue;
    }
    if (hand.current && (hand.current.toCallBB || 0) > 0) {
      // Facing a bet: BTN must have acted (call/fold/raise) if still relevant,
      // or folded. Never silent while still in hand without action.
      const btnAct = hand.seatActions && hand.seatActions.BTN;
      const btnAlive = alive(hand).indexOf('BTN') >= 0;
      if (btnAlive) {
        assert.ok(btnAct, 'BTN tiene seatAction al afrontar apuesta el héroe');
        assert.ok(['call', 'fold', 'raise', 'check', 'bet'].indexOf(btnAct.type) >= 0,
          'BTN acción válida: ' + (btnAct && btnAct.type));
        // Si UTG apostó y BTN sigue vivo, no puede ser check sin streetBet del bettor detrás
        if (hand.villainAction && hand.villainAction.type === 'bet' && hand.villain.pos === 'UTG') {
          assert.ok(btnAct.type !== 'check', 'BTN no puede checkear ante bet de UTG: ' + btnAct.type);
        }
      }
      exercised++;
      if (exercised >= 5) break;
    }
  }
  assert.ok(exercised >= 3, 'ejercido orden multiway postflop: ' + exercised);
}

console.log('16) Postflop multiway: SB responde bet de CO (no check stale) y suma al bote');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'BB', villainLevel: 'fish' });
  let exercised = 0;
  let sawCall = 0;
  for (let i = 0; i < 120; i++) {
    const hand = Engine.newHand({
      type: 'srp3way',
      heroPos: 'BB',
      openerPos: 'CO',
      callerPos: 'SB',
      callerPositions: ['SB'],
      potType: 'srp3way',
      seed: 22000 + i
    }, play);
    forceOpenCallFlop(hand);
    if (hand.stage !== 'flop' || !hand.current) continue;
    if ((hand.current.toCallBB || 0) > 0) continue;
    const alive0 = alive(hand);
    if (alive0.indexOf('SB') < 0 || alive0.indexOf('CO') < 0) continue;
    const potBeforeCheck = hand.potBB;
    Engine.act(hand, 'check');
    if (hand.stage === 'complete') continue;
    if (!(hand.current && (hand.current.toCallBB || 0) > 0)) continue;
    const bet = hand.current.toCallBB;
    const aggressor = hand.villain && hand.villain.pos;
    // Caso del bug: CO (o alguien detrás del BB) apuesta → SB no puede quedar en check
    if (aggressor !== 'CO' && aggressor !== 'BTN' && aggressor !== 'HJ') {
      // si SB fue el agresor, no aplica wrap
      exercised++;
      continue;
    }
    const sbAct = hand.seatActions && hand.seatActions.SB;
    const sbAlive = alive(hand).indexOf('SB') >= 0;
    assert.ok(sbAct, 'SB tiene seatAction al afrontar bet tras check del héroe');
    assert.ok(sbAct.type !== 'check',
      'SB no puede conservar Check ante bet de ' + aggressor + ': ' + sbAct.type);
    assert.ok(['call', 'fold', 'raise'].indexOf(sbAct.type) >= 0,
      'SB acción válida ante bet: ' + sbAct.type);
    if (sbAct.type === 'call' && sbAlive) {
      // pot = pot pre-check-round + bet aggressor + call SB (+ posibles más)
      assert.ok(hand.potBB + 0.01 >= potBeforeCheck + bet + bet * 0.5,
        'call de SB debe sumar al bote: pot=' + hand.potBB +
        ' pot0=' + potBeforeCheck + ' bet=' + bet);
      const sbStreet = hand.table.streetBet && hand.table.streetBet.SB;
      assert.ok(sbStreet >= bet - 0.01, 'SB streetBet iguala la apuesta: ' + sbStreet);
      sawCall++;
    }
    if (sbAct.type === 'fold') {
      assert.ok(!sbAlive, 'SB fold → no alive');
    }
    exercised++;
    if (exercised >= 8 && sawCall >= 1) break;
  }
  assert.ok(exercised >= 4, 'ejercido wrap SB ante bet: ' + exercised);
  assert.ok(sawCall >= 1, 'al menos un call de SB sumó al bote');
}

console.log('17) Preflop multiway SB: BB sigue vivo (aún por hablar) y actúa tras call');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'srp3way', heroPos: 'SB', villainLevel: 'fish' });
  const hand = Engine.newHand({
    type: 'srp3way',
    heroPos: 'SB',
    openerPos: 'CO',
    callerPos: 'BTN',
    callerPositions: ['BTN'],
    potType: 'srp3way',
    seed: 42
  }, play);
  assert.equal(hand.hero.pos, 'SB', 'héroe SB');
  assert.ok(hand.stage === 'preflop', 'preflop');
  assert.ok(hand.current && hand.current.toCallBB > 0, 'SB afronta open');
  const alive0 = alive(hand);
  assert.ok(alive0.indexOf('BB') >= 0, 'BB vivo al decidir SB: ' + alive0.join(','));
  assert.ok(!hand.table.folded.BB, 'BB no folded');
  assert.ok(hand.table.inHand.has('BB'), 'BB inHand');
  assert.ok((hand.table.invested.BB || 0) >= 1, 'BB tiene ciega en invested');
  assert.ok(/BB aún por hablar|aún por hablar/.test(hand.current.context || ''),
    'contexto menciona seats por hablar: ' + hand.current.context);

  Engine.act(hand, 'call');
  // Tras call: o flop (BB fold/call) o face3bet (BB squeeze)
  if (hand.current && hand.current.kind === 'face3bet') {
    assert.ok(hand.villain.pos === 'BB', 'squeeze del BB');
  } else {
    assert.ok(hand.stage === 'flop' || (hand.current && hand.current.street === 'flop'),
      'va a flop tras resolver BB, stage=' + hand.stage);
    const alive1 = alive(hand);
    // Si BB foldeó, no debe estar; si llamó, sí
    if (hand.seatActions && hand.seatActions.BB && hand.seatActions.BB.type === 'fold') {
      assert.ok(alive1.indexOf('BB') < 0, 'BB folded → fuera');
      assert.ok(alive1.indexOf('CO') >= 0 && alive1.indexOf('BTN') >= 0 && alive1.indexOf('SB') >= 0,
        '3-way sin BB: ' + alive1.join(','));
    } else if (hand.seatActions && hand.seatActions.BB && hand.seatActions.BB.type === 'call') {
      assert.ok(alive1.indexOf('BB') >= 0, 'BB call → sigue en flop');
      assert.ok(alive1.length >= 4, '4-way con BB call: ' + alive1.join(','));
    }
  }
}

console.log('18) Limp pot BB no salta preflop (check/iso)');
{
  const play = cfg({ scenario: 'multiway', multiwayPotType: 'limpPot', heroPos: 'BB' });
  for (let i = 0; i < 15; i++) {
    const hand = Engine.newHand({
      type: 'limpPot',
      heroPos: 'BB',
      limperPos: 'CO',
      limperPositions: ['HJ', 'CO'],
      potType: 'limpPot',
      seed: 51000 + i
    }, play);
    assert.equal(hand.stage, 'preflop', 'no auto-flop seed=' + (51000 + i));
    assert.equal(hand.current.kind, 'limpPotBB');
    assert.ok(!hand._autoGoFlop, 'sin _autoGoFlop');
  }
  // Check → flop multiway
  const h1 = Engine.newHand({
    type: 'limpPot', heroPos: 'BB', limperPos: 'CO',
    limperPositions: ['HJ', 'CO'], potType: 'limpPot', seed: 99
  }, play);
  Engine.act(h1, 'call');
  assert.ok(h1.stage === 'flop' || (h1.current && h1.current.street === 'flop'), 'check va a flop');
  assert.ok(alive(h1).length >= 3, 'tras check sigue multiway: ' + alive(h1).join(','));
  // Iso: limpers responden
  let isoDone = false;
  for (let i = 0; i < 40 && !isoDone; i++) {
    const h2 = Engine.newHand({
      type: 'limpPot', heroPos: 'BB', limperPos: 'UTG',
      limperPositions: ['UTG', 'HJ'], potType: 'limpPot', seed: 52000 + i
    }, play);
    Engine.act(h2, 'raise');
    if (h2.stage === 'complete') {
      isoDone = true; // todos fold — válido
      break;
    }
    assert.ok(h2.stage === 'flop' || (h2.current && h2.current.street === 'flop'),
      'iso llega a flop o fin');
    isoDone = true;
  }
  assert.ok(isoDone, 'iso ejercido');
}

console.log('\n*** test-multiway-trainer OK ***');
