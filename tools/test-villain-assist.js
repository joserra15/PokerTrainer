/**
 * tools/test-villain-assist.js — Regresión específica: asistente IA villanos (torneos Pro).
 * Cobertura: complejidad (veto/impacto/fase/nivel), flags, caché L1, merge/audit helpers,
 * decideWithAssist sin red, bundle chunks, contrato edge villain_action.
 * Run: node tools/test-villain-assist.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let passed = 0;

function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}

function eq(a, b, msg) {
  assert.strictEqual(a, b, msg);
  passed++;
}

function loadFiles(files, extra) {
  const sandbox = Object.assign({
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Promise: Promise,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    parseFloat: parseFloat,
    parseInt: parseInt,
    isNaN: isNaN,
    isFinite: isFinite,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    RegExp: RegExp,
    localStorage: {
      _s: {},
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
      setItem: function (k, v) { this._s[k] = String(v); },
      removeItem: function (k) { delete this._s[k]; }
    }
  }, extra || {});
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  files.forEach(function (rel) {
    vm.runInContext(
      fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      sandbox,
      { filename: path.basename(rel) }
    );
  });
  return sandbox;
}

/* ---------- Complejidad ---------- */
const gComp = loadFiles(['js/tournament/villain-assist-complexity.js']);
const Comp = gComp.PTVillainAssistComplexity;
ok(!!Comp, 'PTVillainAssistComplexity');

gComp.PTTournamentVillainDecide = { handCode: function () { return 'AA'; } };
{
  const v = Comp.hardVeto(
    { street: 'preflop' },
    { freqs: { raise: 0.9, fold: 0.1 }, action: { id: 'raise' } },
    { cards: [{ code: 'As' }, { code: 'Ad' }] },
    { street: 'preflop' }
  );
  eq(v.veto, true, 'AA trivial veto');
  ok(
    v.reason === 'veto_premium_preflop' || v.reason === 'veto_motor_seguro',
    'AA reason premium o motor seguro: ' + v.reason
  );
}

/* Premium con freqs no “seguras” → veto_premium_preflop */
{
  const v = Comp.hardVeto(
    { street: 'preflop' },
    { freqs: { raise: 0.72, call: 0.28 }, action: { id: 'raise' } },
    { cards: [{ code: 'As' }, { code: 'Ad' }] },
    { street: 'preflop' }
  );
  eq(v.veto, true, 'AA con mezcla media sigue veto');
  eq(v.reason, 'veto_premium_preflop', 'AA reason premium');
}

{
  const v = Comp.hardVeto({}, { freqs: { fold: 0.85, call: 0.15 } }, null, null);
  eq(v.veto, true, 'motor seguro veto');
}

{
  const v = Comp.hardVeto({}, { freqs: { call: 0.55, fold: 0.45 } }, null, null);
  eq(v.veto, false, 'mezcla cerrada no veto');
}

eq(Comp.impactMult({ potBB: 3, stackBB: 80, effStackBB: 80, toCallBB: 0 }), 0, 'micro-pote impact 0');
ok(Comp.impactMult({ potBB: 20, stackBB: 25, effStackBB: 25, toCallBB: 24, facingJam: true }) >= 1, 'jam impact');
ok(Comp.impactMult({ potBB: 40, stackBB: 50, effStackBB: 50, committedFrac: 0.4 }) >= 1, 'committed impact');

eq(Comp.phaseMult('early'), 0.55, 'phase early');
eq(Comp.phaseMult('bubble'), 1.20, 'phase bubble');
eq(Comp.phaseMult('hu'), 1.25, 'phase hu');

{
  const ctx = {
    potBB: 40,
    stackBB: 35,
    effStackBB: 35,
    toCallBB: 20,
    street: 'river',
    handBand: 'bluffcatch',
    freqs: { call: 0.48, fold: 0.42, raise: 0.1 },
    mttPhase: 'bubble',
    facingJam: false,
    committedFrac: 0.2
  };
  const local = { freqs: ctx.freqs, handBand: 'bluffcatch' };
  const hi = Comp.evaluate(ctx, local, null, { street: 'river' }, 'high');
  const lo = Comp.evaluate(ctx, local, null, { street: 'river' }, 'low');
  ok(hi.shouldAssist, 'alta dispara en river bubble ambiguo');
  /* Baja puede o no; umbral más alto — score debe ser el mismo, umbral distinto */
  eq(hi.score, lo.score, 'mismo score entre niveles');
  ok(hi.threshold < lo.threshold, 'alta umbral menor que baja');
}

{
  const ev = Comp.evaluate(
    { potBB: 4, stackBB: 100, street: 'flop', handBand: 'merge', freqs: { bet: 0.5, check: 0.5 }, mttPhase: 'hu' },
    { freqs: { bet: 0.5, check: 0.5 }, handBand: 'merge' },
    null,
    { street: 'flop' },
    'high'
  );
  eq(ev.shouldAssist, false, 'HU micro-pote no assist aunque Alta');
  eq(ev.reason, 'low_impact', 'reason low_impact');
}

eq(Comp.normalizeLevel('alta'), 'high');
eq(Comp.normalizeLevel('baja'), 'low');
eq(Comp.normalizeLevel('media'), 'medium');
ok(Comp.isProPreset('mttPro') && Comp.isProPreset('huPro'), 'pro presets');
ok(!Comp.isProPreset('easy') && !Comp.isProPreset('hard'), 'no-pro presets');

/* ---------- Flags (ocultar cuando off) ---------- */
const gFlags = loadFiles(['js/tournament/villain-assist-flags.js']);
const Flags = gFlags.PTVillainAssistFlags;
ok(!!Flags, 'flags');
Flags.setLocalEnabled(false);
eq(Flags.isEnabled(), false, 'flag off');
eq(Flags.isVisible(), false, 'visible off → oculto');
Flags.setLocalEnabled(true);
eq(Flags.isVisible(), true, 'visible on');

/* ---------- Caché L1 ---------- */
const gCache = loadFiles(['js/tournament/villain-assist-cache.js']);
const Cache = gCache.PTVillainAssistCache;
ok(!!Cache, 'cache');
const key = Cache.buildKeyFromCtx({
  street: 'river',
  potBB: 40,
  stackBB: 30,
  toCallBB: 20,
  handBand: 'bluffcatch',
  formatHub: 'mtt',
  effectivePhase: 'bubble',
  board: ['As', 'Kd', '7c', '2h', '9s']
});
ok(key.indexOf('bluffcatch') >= 0, 'key band');
ok(key.indexOf('v1') === 0 || key.indexOf('|') > 0, 'key shape');
Cache.l1Set(key, { action: { id: 'fold' }, freqs: { fold: 1 }, samples: 1 });
ok(!!Cache.l1Get(key), 'l1 set/get');
Cache.clearL1();
eq(Cache.l1Get(key), null, 'l1 clear');

/* ---------- Assist module (sin red) ---------- */
const gAssist = loadFiles([
  'js/tournament/villain-assist-complexity.js',
  'js/tournament/villain-assist-flags.js',
  'js/tournament/villain-assist-cache.js',
  'js/tournament/villain-ai-assist.js'
]);
const Assist = gAssist.PTVillainAiAssist;
ok(!!Assist, 'PTVillainAiAssist');
ok(Assist.sameActionFamily({ id: 'raise' }, { id: 'allin' }), 'raise~allin');
ok(!Assist.sameActionFamily({ id: 'fold' }, { id: 'call' }), 'fold!=call');
eq(Assist.mergePreferRemote({ id: 'fold' }, { action: { id: 'call' } }).id, 'call', 'merge remote');
eq(Assist.mergePreferRemote({ id: 'fold' }, { action: { id: 'explode' } }).id, 'fold', 'merge illegal → local');

gAssist.PTVillainAssistFlags.setLocalEnabled(false);
gAssist.PTTournamentVillainDecide = {
  decide: function () { return { id: 'check' }; },
  profileForSeat: function () { return { id: 'pro', preflopStrict: 0.99 }; },
  strength01: function () { return 0.5; },
  handCode: function () { return '72o'; }
};

(async function () {
  const handOff = {
    street: 'flop',
    pot: 200,
    bb: 20,
    currentBet: 0,
    board: ['As', '7d', '2c'],
    seats: [],
    tournamentConfig: { id: 'mttPro' },
    villainAssist: { enabled: true, level: 'high', calls: 0, usedThisHand: 0 },
    mttPhase: 'bubble'
  };
  const seat = {
    id: 'v1', stack: 400, invested: 40, streetInvested: 0, startStack: 500,
    pos: 'BTN', roleId: 'pro', cards: [{ code: 'Kh' }, { code: 'Qd' }], folded: false
  };
  handOff.seats = [seat];

  const a1 = await Assist.decideWithAssist(handOff, seat);
  eq(a1.id, 'check', 'flags off → local sin IA');

  gAssist.PTVillainAssistFlags.setLocalEnabled(true);
  handOff.villainAssist.enabled = false;
  const a2 = await Assist.decideWithAssist(handOff, seat);
  eq(a2.id, 'check', 'assist off en torneo → local');

  /* Micro-pote: aunque flags on, impacto 0 → local (sin fetch) */
  handOff.villainAssist.enabled = true;
  handOff.pot = 40; /* 2 bb vs stack 20 bb → potFrac baja si stack alto */
  seat.stack = 2000;
  seat.startStack = 2000;
  const a3 = await Assist.decideWithAssist(handOff, seat);
  eq(a3.id, 'check', 'micro-pote → local (low_impact/veto path)');

  /* Bundle chunks incluye módulos assist */
  const chunks = fs.readFileSync(path.join(ROOT, 'js/bundle-chunks.js'), 'utf8');
  ok(chunks.indexOf('villain-assist-complexity.js') >= 0, 'bundle complexity');
  ok(chunks.indexOf('villain-ai-assist.js') >= 0, 'bundle assist');
  ok(chunks.indexOf('villain-assist-cache.js') >= 0, 'bundle cache');
  ok(chunks.indexOf('villain-assist-flags.js') >= 0, 'bundle flags');

  /* Edge contract: modo villain_action */
  const edge = fs.readFileSync(path.join(ROOT, 'supabase/functions/analyze-hand/index.ts'), 'utf8');
  ok(edge.indexOf("'villain_action'") >= 0 || edge.indexOf('"villain_action"') >= 0, 'edge mode');
  ok(edge.indexOf('VILLAIN_ACTION_PROMPT') >= 0, 'edge prompt');
  ok(/mode === 'villain_action'/.test(edge), 'edge handler');

  /* Migración presente */
  const mig = fs.readFileSync(path.join(ROOT, 'supabase/migrations/058_villain_assist.sql'), 'utf8');
  ok(mig.indexOf('pt_villain_assist_cache') >= 0, 'mig cache');
  ok(mig.indexOf('pt_villain_assist_audit') >= 0, 'mig audit');
  ok(mig.indexOf('pt_admin_villain_assist_stats') >= 0, 'mig admin stats');
  ok(mig.indexOf('villain_assist_enabled') >= 0, 'mig flag');

  /* Admin UI wiring — fuente + dist desplegado (regresión: botón sin handler) */
  const adminJs = fs.readFileSync(path.join(ROOT, 'js/admin-panel.js'), 'utf8');
  ok(adminJs.indexOf('showAdminVillainAssist') >= 0, 'admin panel fn');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(indexHtml.indexOf('admin-villain-assist-panel') >= 0, 'admin panel html');
  ok(indexHtml.indexOf('admin-villain-assist-btn') >= 0, 'admin panel btn');
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  ok(uiSrc.indexOf('Análisis profundo de rivales') >= 0, 'ui copy title');
  ok(uiSrc.indexOf('consume más consultas') >= 0, 'ui alta quota hint');
  ok(uiSrc.indexOf('Asistente IA de villanos') < 0, 'ui no longer says asistente IA');
  const adminChunkSrc = fs.readFileSync(path.join(ROOT, 'js/bundle-chunks.js'), 'utf8');
  ok(/admin:\s*\[[^\]]*villain-assist-flags\.js/s.test(adminChunkSrc), 'flags in admin chunk');
  const adminDist = fs.readFileSync(path.join(ROOT, 'dist/pt-admin.js'), 'utf8');
  ok(adminDist.indexOf('showAdminVillainAssist') >= 0, 'dist admin has showAdminVillainAssist');
  ok(adminDist.indexOf('PTVillainAssistFlags') >= 0, 'dist admin has PTVillainAssistFlags');

  /* State default assist off */
  const gState = loadFiles(['js/tournament/config.js', 'js/tournament/names.js', 'js/tournament/seating.js', 'js/tournament/state.js'], {
    PTTournamentConfig: null
  });
  /* seating/config may need more deps — soft check via source */
  const stateSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/state.js'), 'utf8');
  ok(stateSrc.indexOf('villainAssist') >= 0, 'state has villainAssist');
  ok(stateSrc.indexOf('enabled: false') >= 0, 'state default off');

  console.log('*** test-villain-assist OK (' + passed + ' asserts) ***');
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
