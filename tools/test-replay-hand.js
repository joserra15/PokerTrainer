/* Verifica estado de replay para mano Winamax #1783117258 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/parsers/winamax.js', 'import.js'
];

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer } = sandbox.window;

const txt = fs.readFileSync(path.join(__dirname, '..', 'sesiones', '20260703_Colorado_real_holdem_no-limit.txt'), 'utf8');
const blocks = txt.split(/(?=^Winamax Poker - )/m);
const block = blocks.find((b) => b.includes('1783117258'));
if (!block) { console.error('Hand not found'); process.exit(1); }

const hand = Importer.analyzeHand(Importer.parseHand(block));

function timelineHeroCountsAsDecision(street, type) {
  if (street === 'preflop') return type === 'fold' || type === 'call' || type === 'raise';
  return ['fold', 'check', 'call', 'raise', 'bet'].includes(type);
}

function computeSessionReplayState(h, decisionIdx) {
  const heroPos = h.heroPos;
  const bb = h.bb || 0.05;
  const target = h.decisions[decisionIdx];
  const targetStreet = target.street;
  const tl = h.summary || [];

  let heroDecIdx = 0;
  let street = 'preflop';
  const folded = {};
  const streetBetBB = {};
  const totalInvBB = {};
  const lastAction = {};
  const streetCommittedEuro = {};
  const streetLog = [];
  let lastAggressorPos = null;
  let toMatchEuro = 0;

  function euroToBB(x) { return bb ? Math.round((x / bb) * 100) / 100 : x; }
  function resetStreetState() {
    Object.keys(streetBetBB).forEach((k) => { delete streetBetBB[k]; });
    Object.keys(streetCommittedEuro).forEach((k) => { delete streetCommittedEuro[k]; });
    Object.keys(lastAction).forEach((k) => { delete lastAction[k]; });
    toMatchEuro = 0;
    lastAggressorPos = null;
  }

  if (h.posts && h.positions) {
    Object.keys(h.posts).forEach((player) => {
      const pos = h.positions[player];
      if (pos) totalInvBB[pos] = euroToBB(h.posts[player]);
    });
  }

  function recordAction(item) {
    const pos = item.pos;
    if (!pos) return;
    const cur = streetCommittedEuro[pos] || 0;
    if (item.type === 'fold') { folded[pos] = true; lastAction[pos] = { type: 'fold' }; }
    else if (item.type === 'check') lastAction[pos] = { type: 'check' };
    else if (item.type === 'call') {
      streetCommittedEuro[pos] = toMatchEuro;
      const addedBB = euroToBB(item.amount != null ? item.amount : Math.max(0, toMatchEuro - cur));
      streetBetBB[pos] = euroToBB(toMatchEuro);
      totalInvBB[pos] = (totalInvBB[pos] || 0) + addedBB;
      lastAction[pos] = { type: 'call', amount: addedBB };
    } else if (item.type === 'bet') {
      toMatchEuro = item.amount;
      streetCommittedEuro[pos] = item.amount;
      const bbAmt = euroToBB(item.amount);
      streetBetBB[pos] = bbAmt;
      totalInvBB[pos] = (totalInvBB[pos] || 0) + euroToBB(Math.max(0, item.amount - cur));
      lastAction[pos] = { type: 'bet', amount: bbAmt };
      if (pos !== heroPos) lastAggressorPos = pos;
    } else if (item.type === 'raise') {
      toMatchEuro = item.to;
      streetCommittedEuro[pos] = item.to;
      const bbAmt = euroToBB(item.to);
      streetBetBB[pos] = bbAmt;
      const addedEuro = item.amount != null ? item.amount : Math.max(0, item.to - cur);
      totalInvBB[pos] = (totalInvBB[pos] || 0) + euroToBB(addedEuro);
      lastAction[pos] = { type: 'raise', amount: bbAmt };
      if (pos !== heroPos) lastAggressorPos = pos;
    }
  }

  for (let i = 0; i < tl.length; i++) {
    const item = tl[i];
    if (item.kind === 'street') { street = item.street; resetStreetState(); continue; }
    const isHero = item.pos === heroPos;
    const countsAsDecision = timelineHeroCountsAsDecision(street, item.type);
    if (isHero && countsAsDecision && heroDecIdx === decisionIdx) break;
    if (street === targetStreet) streetLog.push(item);
    recordAction(item);
    if (isHero && countsAsDecision) heroDecIdx++;
  }

  const heroCommitEuro = streetCommittedEuro[heroPos] || 0;
  const facingBet = toMatchEuro > heroCommitEuro + 0.0001;
  let villainPos = target.vsPosition || null;
  if (!villainPos && facingBet && lastAggressorPos && lastAggressorPos !== heroPos) villainPos = lastAggressorPos;

  const toCallBB = euroToBB(Math.max(0, toMatchEuro - heroCommitEuro));
  const potBB = Object.values(totalInvBB).reduce((s, v) => s + (v || 0), 0);

  return { streetBetBB, lastAction, villainPos, toCallBB, potBB, facingBet, targetStreet };
}

console.log('Decisions:', hand.decisions.length);
hand.decisions.forEach((d, i) => {
  const s = computeSessionReplayState(hand, i);
  const btnStreet = s.streetBetBB.BTN || 0;
  const btnAct = s.lastAction.BTN;
  console.log(
    i + 1, d.street, d.chosen, 'toCall(import)=', d.toCallBB,
    '| replay toCall=', s.toCallBB, 'pot=', s.potBB.toFixed(2),
    'villain=', s.villainPos, 'BTN streetBet=', btnStreet,
    btnAct ? 'BTN act=' + btnAct.type + ' ' + (btnAct.amount || '') : 'no BTN act'
  );
});

const d5 = computeSessionReplayState(hand, 4);
const d6 = computeSessionReplayState(hand, 5);
const ok5 = !d5.facingBet && !d5.streetBetBB.BTN && d5.targetStreet === 'river';
const ok6 = d6.facingBet && d6.toCallBB === 73 && d6.streetBetBB.BTN === 91;
console.log('\nDecision 5 (river first):', ok5 ? 'OK' : 'FAIL', d5);
console.log('Decision 6 (vs raise):', ok6 ? 'OK' : 'FAIL', d6);
if (!ok5 || !ok6) process.exit(1);
