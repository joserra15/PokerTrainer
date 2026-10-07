#!/usr/bin/env node
/**
 * Auditoría de villanos de torneo: simulación IA-vs-IA de alto volumen.
 *
 * Uso:
 *   node tools/audit-villain-tournament-sim.js --quick
 *   node tools/audit-villain-tournament-sim.js --full
 *   node tools/audit-villain-tournament-sim.js --hands 2000 --roles pro,nit --phases early,short
 *   node tools/audit-villain-tournament-sim.js --quick --assert-bands
 *   node tools/audit-villain-tournament-sim.js --quick --out tools/audit-out/villain-calib.json
 *
 * JSON = calibración / regresión de población, NO un atajo a solver.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createSandbox, loadEngine, ROOT } = require('./load-engine-vm');
const Bench = require('./audit-villain-tournament-benchmarks');

const TOURNAMENT_FILES = [
  'js/hand-end-view.js',
  'js/tournament/config.js',
  'js/tournament/blinds.js',
  'js/tournament/names.js',
  'js/tournament/seating.js',
  'js/tournament/state.js',
  'js/tournament/gto-eval.js',
  'js/tournament/villain-decide.js',
  'js/tournament/live-hand.js',
  'js/tournament/player-hud.js',
  'js/tournament/stats.js'
];

const STEAL_POS = { BTN: 1, CO: 1, SB: 1 };
const ALL_ROLES = ['nit', 'fish', 'tag', 'lag', 'maniac', 'pro'];
const PHASE_PRESETS = {
  early:  { stackBB: 80, phase: 'early',  bubble: false },
  mid:    { stackBB: 35, phase: 'mid',    bubble: false },
  short:  { stackBB: 20, phase: 'short',  bubble: false },
  push:   { stackBB: 12, phase: 'push',   bubble: false },
  bubble: { stackBB: 22, phase: 'short',  bubble: true },
  hu:     { stackBB: 25, phase: 'hu',     bubble: false, seats: 2, kind: 'hu' }
};

function parseArgs(argv) {
  const args = {
    hands: 800,
    roles: ALL_ROLES.slice(),
    phases: ['early', 'short'],
    seats: 6,
    assertBands: false,
    out: null,
    quiet: false,
    seed: 42
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick') { args.hands = 400; args.phases = ['early', 'short']; }
    else if (a === '--full') { args.hands = 5000; args.phases = ['early', 'mid', 'short', 'push', 'bubble']; }
    else if (a === '--assert-bands') args.assertBands = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--hands' && argv[i + 1]) { args.hands = Math.max(50, parseInt(argv[++i], 10) || 800); }
    else if (a === '--roles' && argv[i + 1]) {
      args.roles = String(argv[++i]).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    }
    else if (a === '--phases' && argv[i + 1]) {
      args.phases = String(argv[++i]).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    }
    else if (a === '--seats' && argv[i + 1]) { args.seats = Math.max(2, parseInt(argv[++i], 10) || 6); }
    else if (a === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (a === '--seed' && argv[i + 1]) args.seed = parseInt(argv[++i], 10) || 42;
  }
  return args;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  const code = fs.readFileSync(abs, 'utf8');
  vm.runInContext(code, sandbox, { filename: path.basename(rel) });
}

function boot() {
  const sandbox = createSandbox({
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    isFinite: isFinite,
    Promise: Promise
  });
  /* Tournament IIFEs attach to `window`; unify with the vm global. */
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  loadEngine(sandbox);
  TOURNAMENT_FILES.forEach(function (f) { load(sandbox, f); });
  if (!sandbox.PTTournamentLiveHand || !sandbox.PTTournamentLiveHand.simulateTable) {
    throw new Error('PTTournamentLiveHand.simulateTable missing');
  }
  if (!sandbox.GTOVillainProfiles) {
    throw new Error('GTOVillainProfiles missing — engine incomplete');
  }
  return sandbox;
}

function emptyExt() {
  return {
    hands: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    threeBetOpp: 0,
    foldTo3Bet: 0,
    foldTo3BetOpp: 0,
    stealOpp: 0,
    steal: 0,
    bbDefendOpp: 0,
    bbDefend: 0,
    cbetOpp: 0,
    cbet: 0,
    jamHands: 0,
    xrHands: 0,
    aggressionBetRaise: 0,
    aggressionCall: 0
  };
}

function isRaise(a) { return a === 'raise' || a === 'bet' || a === 'allin'; }

function analyzeExtended(hand) {
  const byId = {};
  const seats = (hand && hand.seats) || [];
  seats.forEach(function (s) {
    if (!s || !s.id) return;
    byId[s.id] = {
      pos: s.pos,
      vpip: false,
      pfr: false,
      threeBet: false,
      threeBetOpp: false,
      foldTo3Bet: false,
      foldTo3BetOpp: false,
      stealOpp: false,
      steal: false,
      bbDefendOpp: false,
      bbDefend: false,
      cbetOpp: false,
      cbet: false,
      jam: false,
      xr: false,
      betRaise: 0,
      call: 0
    };
  });

  const Hud = global.PTTournamentPlayerHud || (hand && hand.window && hand.window.PTTournamentPlayerHud);
  /* Prefer sandbox HUD via closure — caller passes analyzePreflop. */
  return byId;
}

function putChipsBeyondBlinds(hand, seat) {
  if (!seat || !hand) return false;
  let blindShare = 0;
  if (seat.pos === 'SB' || (hand.seats && hand.seats.length === 2 && seat.pos === 'BTN')) {
    blindShare = Number(hand.sb) || 0;
  } else if (seat.pos === 'BB') {
    blindShare = Number(hand.bb) || 0;
  }
  if (hand.ante > 0) blindShare += Number(hand.ante) || 0;
  return (Number(seat.invested) || 0) > blindShare + 0.001;
}

function collectHandStats(hand, Hud) {
  const pf = Hud.analyzePreflop(hand);
  const log = hand.log || [];
  const seatsById = {};
  (hand.seats || []).forEach(function (s) { if (s && s.id) seatsById[s.id] = s; });

  /* Steal: first open from BTN/CO/SB when folded to them (no prior voluntary). */
  let foldedToLate = true;
  let openerId = null;
  let openerPos = null;
  let raiseCount = 0;
  let lastRaiserId = null;
  const actedPre = {};

  for (let i = 0; i < log.length; i++) {
    const a = log[i];
    if (!a || a.street !== 'preflop') continue;
    const seat = seatsById[a.id];
    const pos = seat && seat.pos;
    if (raiseCount === 0 && foldedToLate && STEAL_POS[pos] && !actedPre[a.id]) {
      /* Opportunity to steal if everyone before folded (we approximate: no raises yet). */
      if (a.action === 'fold' || a.action === 'call' || isRaise(a.action)) {
        pf[a.id] = pf[a.id] || {};
        pf[a.id].stealOpp = true;
        if (isRaise(a.action)) pf[a.id].steal = true;
      }
    }
    if (isRaise(a.action)) {
      foldedToLate = false;
      if (raiseCount === 0) {
        openerId = a.id;
        openerPos = pos;
        raiseCount = 1;
        lastRaiserId = a.id;
      } else {
        raiseCount += 1;
        lastRaiserId = a.id;
      }
    } else if (a.action === 'call' && raiseCount === 0) {
      foldedToLate = false;
    }
    actedPre[a.id] = true;
  }

  /* BB defend vs single open */
  if (openerId && raiseCount >= 1) {
    for (let i = 0; i < log.length; i++) {
      const a = log[i];
      if (!a || a.street !== 'preflop') continue;
      const seat = seatsById[a.id];
      if (!seat || seat.pos !== 'BB') continue;
      if (a.id === openerId) continue;
      /* First BB action facing exactly one raise */
      let raisesBefore = 0;
      for (let j = 0; j < i; j++) {
        const b = log[j];
        if (b && b.street === 'preflop' && isRaise(b.action)) raisesBefore++;
      }
      if (raisesBefore === 1) {
        pf[a.id] = pf[a.id] || {};
        pf[a.id].bbDefendOpp = true;
        if (a.action === 'call' || isRaise(a.action)) pf[a.id].bbDefend = true;
      }
      break;
    }
  }

  /* Cbet flop: PFR bets flop when checked to / leads */
  let flopBetSeen = {};
  let aggressorPre = openerId;
  for (let i = 0; i < log.length; i++) {
    const a = log[i];
    if (!a) continue;
    if (a.street === 'preflop' && isRaise(a.action)) aggressorPre = a.id;
  }
  if (aggressorPre) {
    let sawFlopAction = false;
    for (let i = 0; i < log.length; i++) {
      const a = log[i];
      if (!a || a.street !== 'flop') continue;
      if (a.id === aggressorPre && !sawFlopAction) {
        pf[a.id] = pf[a.id] || {};
        pf[a.id].cbetOpp = true;
        if (a.action === 'bet' || a.action === 'raise' || a.action === 'allin') {
          pf[a.id].cbet = true;
        }
        sawFlopAction = true;
      }
      if (a.id !== aggressorPre) sawFlopAction = true;
    }
  }

  /* Aggression + jam + xr */
  let prevStreetBet = false;
  let street = null;
  for (let i = 0; i < log.length; i++) {
    const a = log[i];
    if (!a) continue;
    if (a.street !== street) {
      street = a.street;
      prevStreetBet = false;
    }
    pf[a.id] = pf[a.id] || {};
    if (isRaise(a.action)) {
      pf[a.id].betRaise = (pf[a.id].betRaise || 0) + 1;
      if (a.action === 'allin' || (a.to != null && a.allIn)) pf[a.id].jam = true;
      if (prevStreetBet && (a.action === 'raise' || a.action === 'allin')) pf[a.id].xr = true;
      prevStreetBet = true;
    } else if (a.action === 'call') {
      pf[a.id].call = (pf[a.id].call || 0) + 1;
    } else if (a.action === 'bet') {
      pf[a.id].betRaise = (pf[a.id].betRaise || 0) + 1;
      prevStreetBet = true;
    }
  }

  (hand.seats || []).forEach(function (seat) {
    if (!seat || !seat.id) return;
    pf[seat.id] = pf[seat.id] || {};
    pf[seat.id].vpip = putChipsBeyondBlinds(hand, seat);
  });

  return pf;
}

function accumulate(ext, row) {
  ext.hands += 1;
  if (row.vpip) ext.vpip += 1;
  if (row.pfr) ext.pfr += 1;
  if (row.threeBetOpp) ext.threeBetOpp += 1;
  if (row.threeBet) ext.threeBet += 1;
  if (row.foldTo3BetOpp) ext.foldTo3BetOpp += 1;
  if (row.foldTo3Bet) ext.foldTo3Bet += 1;
  if (row.stealOpp) ext.stealOpp += 1;
  if (row.steal) ext.steal += 1;
  if (row.bbDefendOpp) ext.bbDefendOpp += 1;
  if (row.bbDefend) ext.bbDefend += 1;
  if (row.cbetOpp) ext.cbetOpp += 1;
  if (row.cbet) ext.cbet += 1;
  if (row.jam) ext.jamHands += 1;
  if (row.xr) ext.xrHands += 1;
  ext.aggressionBetRaise += Number(row.betRaise) || 0;
  ext.aggressionCall += Number(row.call) || 0;
}

function pct(n, d) {
  if (!d) return null;
  return Math.round((n / d) * 1000) / 10;
}

function summarize(ext) {
  const afDen = ext.aggressionCall;
  return {
    hands: ext.hands,
    vpip: pct(ext.vpip, ext.hands),
    pfr: pct(ext.pfr, ext.hands),
    threeBet: pct(ext.threeBet, ext.threeBetOpp),
    foldTo3Bet: pct(ext.foldTo3Bet, ext.foldTo3BetOpp),
    steal: pct(ext.steal, ext.stealOpp),
    bbDefend: pct(ext.bbDefend, ext.bbDefendOpp),
    cbet: pct(ext.cbet, ext.cbetOpp),
    jamRate: pct(ext.jamHands, ext.hands),
    xrRate: pct(ext.xrHands, ext.hands),
    af: afDen > 0 ? Math.round((ext.aggressionBetRaise / afDen) * 100) / 100 : null,
    samples: {
      threeBetOpp: ext.threeBetOpp,
      foldTo3BetOpp: ext.foldTo3BetOpp,
      stealOpp: ext.stealOpp,
      bbDefendOpp: ext.bbDefendOpp,
      cbetOpp: ext.cbetOpp
    }
  };
}

function makeMonoRoleState(g, role, opts) {
  const seatsN = opts.seats || 6;
  const kind = opts.kind || 'mtt';
  const stackBB = opts.stackBB || 80;
  const bb = 100;
  const stack = Math.round(stackBB * bb);
  const entries = opts.bubble ? Math.max(seatsN + 2, 18) : seatsN;
  const placesPaid = opts.bubble ? (entries - seatsN) : Math.max(1, Math.floor(entries / 3));
  /* Bubble: left = paid+1. With one table of seatsN alive, set paid = seatsN-1 and
     fabricate extra busted players so playersLeft === seatsN === paid+1. */
  let paid = placesPaid;
  let leftTarget = entries;
  if (opts.bubble) {
    paid = seatsN - 1;
    leftTarget = paid + 1; /* = seatsN */
  }
  if (kind === 'hu' || seatsN === 2) {
    paid = 1;
  }

  const weights = { fish: 0, nit: 0, tag: 0, lag: 0, maniac: 0, pro: 0 };
  weights[role] = 100;

  const cfg = g.PTTournamentConfig.normalize({
    kind: kind === 'hu' ? 'hu' : 'mtt',
    entries: Math.max(entries, seatsN),
    seatsPerTable: seatsN <= 2 ? 2 : seatsN,
    startingStack: stack,
    placesPaid: paid,
    buyInEur: 11,
    roleWeights: weights,
    exploitProPct: role === 'pro' ? 0.65 : 0,
    aiLevel: 'elite',
    blindStructure: 'normal'
  });

  const state = g.PTTournamentState.create(cfg, { seed: opts.seed || 42 });
  /* Force all villains + hero replacement: make every seat the role (no hero). */
  state.players.forEach(function (p, idx) {
    p.roleId = role;
    p.proStyle = role === 'pro' ? 'exploit_pool' : null;
    p.stack = stack;
    p.alive = true;
    p.isHero = false;
  });
  /* Keep only seatsN alive on one table for mono-rol control. */
  const keep = state.players.slice(0, seatsN);
  state.players.forEach(function (p) {
    if (keep.indexOf(p) < 0) {
      p.alive = false;
      p.stack = 0;
      p.tableId = null;
    }
  });
  if (opts.bubble) {
    /* Ensure playersLeft == paid+1 == seatsN */
    state.players.filter(function (p) { return p.alive; }).forEach(function (p) {
      p.stack = stack;
    });
  }
  state.tables = [{
    id: 'T1',
    seatIds: keep.map(function (p) { return p.id; }),
    isHeroTable: true
  }];
  keep.forEach(function (p, i) {
    p.tableId = 'T1';
    p.seat = i;
    p.alive = true;
    p.stack = stack;
  });
  state.config.placesPaid = paid;
  state.handIndex = 0;
  return state;
}

function blindsForStack(stackBB) {
  /* Fix BB=100; stack chips = stackBB * 100. Ante scales mildly deep. */
  const bb = 100;
  const sb = 50;
  let ante = 0;
  if (stackBB <= 25) ante = 10;
  if (stackBB <= 15) ante = 15;
  return { sb: sb, bb: bb, ante: ante, level: 1, hands: 30 };
}

function runCell(g, role, phaseKey, hands, baseSeed) {
  const preset = PHASE_PRESETS[phaseKey] || PHASE_PRESETS.early;
  const seatsN = preset.seats || 6;
  const state = makeMonoRoleState(g, role, {
    seats: seatsN,
    stackBB: preset.stackBB,
    bubble: !!preset.bubble,
    kind: preset.kind || 'mtt',
    seed: baseSeed
  });
  const Hud = g.PTTournamentPlayerHud;
  const Live = g.PTTournamentLiveHand;
  const Seat = g.PTTournamentSeating;
  const blinds = blindsForStack(preset.stackBB);
  const pool = emptyExt();
  let completed = 0;
  let errors = 0;

  for (let h = 0; h < hands; h++) {
    try {
      /* Restore stacks each hand so depth stays fixed (calibration, not tourney life). */
      state.players.forEach(function (p) {
        if (p.tableId === 'T1') {
          p.alive = true;
          p.stack = Math.round(preset.stackBB * blinds.bb);
        }
      });
      const on = Seat.playersOnTable(state, 'T1');
      if (on.length < 2) break;
      const btn = Seat.assignButton(state, 'T1');
      const ordered = Seat.seatOrderWithButton(on, btn);
      const hand = Live.simulateTable(ordered, blinds, state);
      if (!hand || hand.stage !== 'complete') {
        errors += 1;
        continue;
      }
      const rows = collectHandStats(hand, Hud);
      (hand.seats || []).forEach(function (seat) {
        if (!seat || !seat.id) return;
        const row = rows[seat.id] || {};
        /* Merge analyzePreflop fields */
        const pf = Hud.analyzePreflop(hand)[seat.id] || {};
        accumulate(pool, {
          vpip: row.vpip,
          pfr: pf.pfr,
          threeBet: pf.threeBet,
          threeBetOpp: pf.threeBetOpp,
          foldTo3Bet: pf.foldTo3Bet,
          foldTo3BetOpp: pf.foldTo3BetOpp,
          stealOpp: row.stealOpp,
          steal: row.steal,
          bbDefendOpp: row.bbDefendOpp,
          bbDefend: row.bbDefend,
          cbetOpp: row.cbetOpp,
          cbet: row.cbet,
          jam: row.jam,
          xr: row.xr,
          betRaise: row.betRaise,
          call: row.call
        });
      });
      completed += 1;
    } catch (e) {
      errors += 1;
      if (errors <= 3) {
        console.error('sim error', role, phaseKey, e.message || e);
      }
    }
  }

  const stats = summarize(pool);
  const gaps = Bench.gapReport(stats, role, phaseKey === 'bubble' ? 'short' : phaseKey);
  return {
    role: role,
    phase: phaseKey,
    stackBB: preset.stackBB,
    handsRequested: hands,
    handsCompleted: completed,
    errors: errors,
    stats: stats,
    gaps: gaps
  };
}

function markdownReport(results) {
  const lines = [];
  lines.push('# Villain tournament sim');
  lines.push('');
  lines.push('| Role | Phase | Hands | VPIP | PFR | 3bet | F3b | Steal | BB def | Cbet | Gaps |');
  lines.push('|------|-------|------:|-----:|----:|-----:|----:|------:|-------:|-----:|------|');
  results.forEach(function (r) {
    const g = r.gaps || {};
    const bad = Object.keys(g).filter(function (k) {
      return g[k].status === 'low' || g[k].status === 'high';
    }).map(function (k) {
      return k + ':' + g[k].status + '(' + g[k].value + ')';
    }).join(', ') || 'ok';
    const s = r.stats;
    lines.push([
      r.role,
      r.phase,
      r.handsCompleted,
      s.vpip,
      s.pfr,
      s.threeBet,
      s.foldTo3Bet,
      s.steal,
      s.bbDefend,
      s.cbet,
      bad
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  });
  lines.push('');
  return lines.join('\n');
}

/**
 * Slack por métrica (ruido muestral en --quick / CI).
 * Frecs de apuesta (cbet/af/xr) tienen slack propio: muestras postflop menores.
 */
function slackFor(key) {
  if (key === 'threeBet') return 5;
  /* cbet en CI con ~600 manos aún oscila; 12pp evita falsos positivos. */
  if (key === 'cbet') return 12;
  if (key === 'af') return 0.45;
  if (key === 'xrRate') return 3;
  return 6;
}

/**
 * Comprueba bandas HUD + frecuencias de apuesta por tipo (arquetipo).
 * Incluye identidad relativa VPIP / cbet / AF / XR entre roles.
 */
function assertBands(results) {
  const failures = [];
  results.forEach(function (r) {
    const must = [];
    if (r.role === 'pro' && (r.phase === 'early' || r.phase === 'short')) {
      must.push('vpip', 'pfr', 'threeBet', 'cbet', 'af', 'xrRate');
    }
    if (r.role === 'nit' && r.phase === 'early') {
      must.push('vpip', 'pfr', 'cbet', 'af', 'xrRate');
    }
    if (r.role === 'fish' && r.phase === 'early') {
      must.push('vpip', 'cbet', 'af');
    }
    if (r.role === 'tag' && r.phase === 'early') {
      must.push('vpip', 'cbet', 'af', 'xrRate');
    }
    if (r.role === 'lag' && r.phase === 'early') {
      must.push('vpip', 'threeBet', 'cbet', 'xrRate');
    }
    if (r.role === 'maniac' && r.phase === 'early') {
      must.push('vpip', 'threeBet', 'cbet', 'xrRate');
    }
    must.forEach(function (k) {
      const g = r.gaps[k];
      if (!g || g.status === 'skip') return;
      const slack = slackFor(k);
      const b = g.band;
      const v = g.value;
      if (v == null || !b) return;
      if (v < b[0] - slack || v > b[1] + slack) {
        failures.push(r.role + '/' + r.phase + ' ' + k + '=' + v + ' band=' + b.join('-')
          + ' slack=' + slack);
      }
    });
  });

  const early = {};
  const earlyBet = {};
  results.forEach(function (r) {
    if (r.phase !== 'early') return;
    early[r.role] = r.stats.vpip;
    earlyBet[r.role] = {
      cbet: r.stats.cbet,
      af: r.stats.af,
      xrRate: r.stats.xrRate,
      threeBet: r.stats.threeBet
    };
  });

  if (early.fish != null && early.nit != null && early.fish < early.nit + 8) {
    failures.push('identity: fish VPIP (' + early.fish + ') debe superar nit (' + early.nit + ') en ≥8pp');
  }
  if (early.maniac != null && early.pro != null && early.maniac < early.pro) {
    failures.push('identity: maniac VPIP (' + early.maniac + ') debe ≥ pro (' + early.pro + ')');
  }

  /* Frecuencias de apuesta por tipo: separación de identidad postflop. */
  const nitB = earlyBet.nit;
  const fishB = earlyBet.fish;
  const proB = earlyBet.pro;
  const lagB = earlyBet.lag;
  const maniacB = earlyBet.maniac;
  const tagB = earlyBet.tag;

  if (proB && nitB && proB.cbet != null && nitB.cbet != null && proB.cbet + 2 < nitB.cbet) {
    failures.push('identity-bet: pro cbet (' + proB.cbet + ') debe ≥ nit (' + nitB.cbet + ')');
  }
  if (proB && fishB && proB.af != null && fishB.af != null && fishB.af > proB.af) {
    failures.push('identity-bet: fish AF (' + fishB.af + ') debe ≤ pro AF (' + proB.af + ')');
  }
  if (maniacB && proB && maniacB.xrRate != null && proB.xrRate != null
    && maniacB.xrRate < proB.xrRate + 2) {
    failures.push('identity-bet: maniac XR (' + maniacB.xrRate + ') debe superar pro ('
      + proB.xrRate + ') en ≥2pp');
  }
  if (lagB && nitB && lagB.xrRate != null && nitB.xrRate != null
    && lagB.xrRate < nitB.xrRate + 3) {
    failures.push('identity-bet: lag XR (' + lagB.xrRate + ') debe superar nit ('
      + nitB.xrRate + ') en ≥3pp');
  }
  if (proB && tagB && proB.threeBet != null && tagB.threeBet != null
    && proB.threeBet + 1 < tagB.threeBet) {
    failures.push('identity-bet: pro 3bet (' + proB.threeBet + ') no debe quedar claramente bajo tag ('
      + tagB.threeBet + ')');
  }
  if (maniacB && lagB && maniacB.threeBet != null && lagB.threeBet != null
    && maniacB.threeBet + 1 < lagB.threeBet) {
    failures.push('identity-bet: maniac 3bet (' + maniacB.threeBet + ') debe ≥ lag≈ ('
      + lagB.threeBet + ')');
  }

  return failures;
}

function main(argv) {
  const args = parseArgs(argv || process.argv);
  if (!args.quiet) {
    console.log('Booting engine + tournament…');
  }
  const g = boot();
  /* Expose Hud on collect via global for analyzePreflop — already on sandbox */
  global.PTTournamentPlayerHud = g.PTTournamentPlayerHud;

  const results = [];
  args.roles.forEach(function (role) {
    if (ALL_ROLES.indexOf(role) < 0) {
      console.warn('skip unknown role', role);
      return;
    }
    args.phases.forEach(function (phase) {
      if (!args.quiet) {
        console.log('Sim', role, phase, '×', args.hands, '…');
      }
      const cell = runCell(g, role, phase, args.hands, args.seed);
      results.push(cell);
      if (!args.quiet) {
        const s = cell.stats;
        console.log('  VPIP', s.vpip, 'PFR', s.pfr, '3b', s.threeBet,
          'steal', s.steal, 'BBdef', s.bbDefend, 'cbet', s.cbet,
          'err', cell.errors);
      }
    });
  });

  const report = {
    generatedAt: new Date().toISOString(),
    purpose: 'calibration-regression-not-solver',
    args: {
      hands: args.hands,
      roles: args.roles,
      phases: args.phases,
      seed: args.seed
    },
    benchmarks: { early: Bench.EARLY, short: Bench.SHORT, push: Bench.PUSH },
    results: results,
    markdown: markdownReport(results)
  };

  if (!args.quiet) {
    console.log('\n' + report.markdown);
  }

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    if (!args.quiet) console.log('Wrote', outPath);
  }

  if (args.assertBands) {
    const fails = assertBands(results);
    if (fails.length) {
      console.error('ASSERT BANDS FAILED:\n' + fails.join('\n'));
      process.exitCode = 1;
    } else if (!args.quiet) {
      console.log('ASSERT BANDS OK');
    }
  }

  return report;
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  main,
  boot,
  runCell,
  parseArgs,
  summarize,
  emptyExt,
  assertBands,
  slackFor,
  PHASE_PRESETS,
  ALL_ROLES
};
