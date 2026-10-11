#!/usr/bin/env node
/**
 * Auditoría de coherencia de fase MTT: entrenador / torneos / escuela.
 *
 * Uso:
 *   node tools/audit-mtt-phase-coherence.js
 *   node tools/audit-mtt-phase-coherence.js --assert-hard
 *   node tools/audit-mtt-phase-coherence.js --full --out tools/audit-out/mtt-phase-coherence.json
 *
 * Hard fails → exit 1 (CI). Soft → warnings en informe.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createSandbox, loadEngine, runFiles, ROOT } = require('./load-engine-vm');

const CONSENSUS_PATH = path.join(ROOT, 'data/ranges/mtt-phase-consensus.json');
const DEFAULT_OUT = path.join(ROOT, 'tools/audit-out/mtt-phase-coherence.json');
const DEFAULT_MD = path.join(ROOT, 'tools/audit-out/mtt-phase-coherence.md');

function parseArgs(argv) {
  const args = { assertHard: false, full: false, quiet: false, out: DEFAULT_OUT, md: DEFAULT_MD };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--assert-hard') args.assertHard = true;
    else if (a === '--full') args.full = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (a === '--md' && argv[i + 1]) args.md = argv[++i];
  }
  return args;
}

function loadSandbox() {
  const sandbox = createSandbox();
  loadEngine(sandbox);
  runFiles(sandbox, [
    'js/play-config.js',
    'js/ranges.js',
    'js/engine.js',
    'js/tournament/gto-eval.js',
    'js/tournament/live-hand.js',
    'js/school-data-mtt.js'
  ]);
  return sandbox;
}

function dominantAction(strat) {
  if (!strat || typeof strat !== 'object') return { action: 'fold', freq: 0 };
  let best = 'fold';
  let max = -1;
  Object.keys(strat).forEach(function (k) {
    const v = Number(strat[k]) || 0;
    if (v > max) { max = v; best = k; }
  });
  return { action: best, freq: max };
}

function aggroFreq(strat) {
  if (!strat) return 0;
  return (Number(strat.raise) || 0) + (Number(strat.allin) || 0)
    + (Number(strat.bet) || 0) + (Number(strat.overbet) || 0);
}

function depthKey(stackBB) {
  const bb = Number(stackBB) || 100;
  if (bb <= 12) return 'bb10';
  if (bb <= 17) return 'bb15';
  if (bb <= 22) return 'bb20';
  if (bb <= 30) return 'bb25';
  if (bb <= 45) return 'bb40';
  if (bb <= 70) return 'bb50';
  return 'bb100';
}

function cardPair(code) {
  const N = globalThis.__N;
  // Simple: AA → As Ad; AKs → As Ks; AKo → As Kd
  if (!code || code.length < 2) return ['As', 'Kh'];
  const r1 = code[0];
  const r2 = code[1];
  if (r1 === r2) return [r1 + 's', r2 + 'h'];
  if (code[2] === 's') return [r1 + 's', r2 + 's'];
  return [r1 + 's', r2 + 'd'];
}

function evalTrainer(w, opts) {
  const Tax = w.PTFormatTaxonomy;
  const PC = w.PTPlayConfig;
  const GTO = w.GTO;
  const PF = w.GTOPushFold;
  const hub = opts.hub || 'mtt';
  const stackBB = opts.stackBB;
  const cfg = PC.normalize({
    formatHub: hub,
    gameType: hub === 'spin' ? 'spin3' : 'mtt',
    mttPhase: 'auto',
    stackDepth: depthKey(stackBB),
    scenario: opts.spot === 'vsRFI' ? '3bet' : (opts.spot === 'RFI' && stackBB <= 25 ? 'steal' : 'rfi'),
    anteBB: Tax && Tax.defaultAnteBB
      ? Tax.defaultAnteBB({ formatHub: hub, mttPhase: 'auto', stackBB: stackBB })
      : 0.1
  });
  const phase = cfg.resolvedPhase;
  const pushCharts = !!(PF && PF.isPushPhase({
    formatHub: hub, stackBB: stackBB, mttPhase: phase, resolvedPhase: phase
  }));

  let preflopMode = 'standard';
  if (pushCharts || phase === 'push' || stackBB <= 14) preflopMode = 'push';
  else if (opts.spot === 'RFI' && stackBB >= 14 && stackBB <= 25
    && (opts.position === 'BTN' || opts.position === 'CO' || opts.position === 'SB')) {
    preflopMode = 'steal';
  } else if (opts.spot === 'vsRFI' && stackBB >= 14 && stackBB <= 20) {
    preflopMode = 'stealDefense';
  }

  const cards = cardPair(opts.hand);
  const input = {
    spotKind: opts.spot,
    street: 'preflop',
    position: opts.position,
    vsPosition: opts.vsPosition || null,
    handCode: opts.hand,
    heroCards: cards,
    board: [],
    potBB: opts.spot === 'vsRFI' ? 5 : 1.5,
    toCallBB: opts.spot === 'vsRFI' ? 0.5 : 0,
    potBeforeBB: opts.spot === 'vsRFI' ? 3.5 : 1.5,
    stackBB: stackBB,
    stackDepth: stackBB,
    effStack: stackBB,
    heroRemainingBB: stackBB,
    availableActions: opts.spot === 'vsRFI'
      ? ['fold', 'call', 'raise', 'allin']
      : ['fold', 'raise', 'allin'],
    chosenAction: opts.chosenAction || (opts.spot === 'vsRFI' ? 'call' : 'raise'),
    formatHub: hub,
    gameType: hub === 'spin' ? 'spin3' : 'mtt',
    mttPhase: phase,
    resolvedPhase: phase,
    effectivePhase: phase,
    preflopMode: preflopMode,
    pushFold: preflopMode === 'push',
    scenario: preflopMode === 'stealDefense' ? '3bet' : (preflopMode === 'steal' ? 'steal' : undefined),
    anteBB: cfg.anteBB || 0,
    scoreMode: 'gto'
  };
  if (opts.spot === 'vsRFI') {
    input.vsRfiKey = opts.position + '_vs_' + (opts.vsPosition || 'BTN');
  }
  if (w.GTORangesRegistry) w.GTORangesRegistry.attachToInput(input, input);
  const ev = GTO.evaluateSpot(input);
  const strat = (ev && (ev.strategy || ev.gto)) || {};
  const evaluation = (ev && (ev.evaluation || ev)) || {};
  return {
    surface: 'trainer',
    phase: input.resolvedPhase || input.mttPhase,
    preflopMode: input.preflopMode,
    pushCharts: pushCharts,
    strategy: strat,
    class: evaluation.class,
    dominant: dominantAction(strat),
    aggro: aggroFreq(strat)
  };
}

function evalTournament(w, opts) {
  const GtoEval = w.PTTournamentGtoEval;
  const GTO = w.GTO;
  const PF = w.GTOPushFold;
  const bb = 200;
  const stackBB = opts.stackBB;
  const hub = opts.hub || 'mtt';
  const heroChips = stackBB * bb;
  const isVs = opts.spot === 'vsRFI';
  const openBB = 1.5;
  const heroInv = isVs ? bb : 0;
  const hand = {
    street: 'preflop',
    stage: 'playing',
    bb: bb,
    sb: bb / 2,
    ante: 0.1 * bb,
    pot: isVs ? 5 * bb : 1.5 * bb,
    currentBet: isVs ? openBB * bb : bb,
    minRaise: bb,
    kind: opts.kind || 'mtt',
    formatHub: hub,
    mttPhase: opts.handMttPhase != null ? opts.handMttPhase : 'early',
    avgStackBB: opts.avgStackBB != null ? opts.avgStackBB : 55,
    playersLeft: opts.playersLeft != null ? opts.playersLeft : 90,
    placesPaid: opts.placesPaid != null ? opts.placesPaid : 16,
    playersSeated: 6,
    tableMax: 6,
    mttStructureSituation: opts.mttStructureSituation || null,
    openerId: isVs ? 'v1' : null,
    openerPos: isVs ? (opts.vsPosition || 'BTN') : null,
    board: [],
    seats: [],
    heroOptions: isVs
      ? [{ id: 'fold' }, { id: 'call', amount: 0.5 * bb }, { id: 'raise', amount: 4 * bb }, { id: 'allin', amount: heroChips }]
      : [{ id: 'fold' }, { id: 'raise', amount: 2.2 * bb }, { id: 'allin', amount: heroChips }]
  };
  const cards = cardPair(opts.hand);
  hand.seats.push({
    id: 'hero',
    isHero: true,
    pos: opts.position,
    stack: heroChips - heroInv,
    streetInvested: heroInv,
    cards: [{ code: cards[0] }, { code: cards[1] }],
    folded: false
  });
  if (isVs) {
    hand.seats.push({
      id: 'v1',
      isHero: false,
      pos: opts.vsPosition || 'BTN',
      stack: 40 * bb - openBB * bb,
      streetInvested: openBB * bb,
      folded: false,
      roleId: 'tag'
    });
  } else {
    hand.seats.push({
      id: 'bb',
      isHero: false,
      pos: 'BB',
      stack: 40 * bb,
      streetInvested: bb,
      folded: false,
      roleId: 'tag'
    });
  }
  const hero = hand.seats[0];
  const chosen = opts.chosenAction || (isVs ? 'allin' : 'raise');
  const amount = chosen === 'allin' ? heroChips
    : (chosen === 'call' ? 0.5 * bb : 2.2 * bb);
  const input = GtoEval.buildInput(hand, hero, { id: chosen, amount: amount });
  const pushCharts = !!(PF && PF.isPushPhase({
    formatHub: hub,
    stackBB: stackBB,
    mttPhase: input.mttPhase,
    resolvedPhase: input.resolvedPhase
  }));
  const ev = GTO.evaluateSpot(input);
  const strat = (ev && (ev.strategy || ev.gto)) || {};
  const evaluation = (ev && (ev.evaluation || ev)) || {};
  return {
    surface: 'tournament',
    phase: input.resolvedPhase || input.mttPhase,
    preflopMode: input.preflopMode,
    pushCharts: pushCharts,
    strategy: strat,
    class: evaluation.class,
    dominant: dominantAction(strat),
    aggro: aggroFreq(strat),
    inputPhase: input.mttPhase
  };
}

function checkRule(result, rule) {
  const hard = [];
  const soft = [];
  const sev = rule.severity || 'hard';
  const bucket = sev === 'hard' ? hard : soft;
  const dom = result.dominant.action;
  const aggro = result.aggro;

  if (rule.mustDominant && rule.mustDominant.length) {
    if (rule.mustDominant.indexOf(dom) < 0) {
      bucket.push({
        id: rule.id,
        msg: 'dominant ' + dom + ' not in ' + JSON.stringify(rule.mustDominant),
        result: result
      });
    }
  }
  if (rule.mustNotDominant && rule.mustNotDominant.indexOf(dom) >= 0) {
    bucket.push({
      id: rule.id,
      msg: 'dominant must not be ' + dom,
      result: result
    });
  }
  if (rule.preferDominant && rule.preferDominant.length && rule.preferDominant.indexOf(dom) < 0) {
    soft.push({
      id: rule.id,
      msg: 'prefer dominant ' + JSON.stringify(rule.preferDominant) + ' got ' + dom,
      result: result
    });
  }
  if (rule.mustAggroMaterial != null && aggro < rule.mustAggroMaterial) {
    bucket.push({
      id: rule.id,
      msg: 'aggro ' + Math.round(aggro * 100) + '% < ' + Math.round(rule.mustAggroMaterial * 100) + '%',
      result: result
    });
  }
  if (rule.preferAggro && aggro < 0.35 && dom === 'fold') {
    soft.push({
      id: rule.id,
      msg: 'prefer aggro (web shove-first); got fold / aggro=' + Math.round(aggro * 100) + '%',
      result: result
    });
  }
  if (rule.mustNotClass && rule.mustNotClass.indexOf(result.class) >= 0) {
    // Re-eval with chosenAction if provided
    bucket.push({
      id: rule.id,
      msg: 'class ' + result.class + ' forbidden',
      result: result
    });
  }
  return { hard: hard, soft: soft };
}

function auditSchoolPins(w, findings) {
  const files = ['js/school-data-mtt.js', 'js/school-data-ranges.js', 'js/school-data-spin.js'];
  let checked = 0;
  let hardPins = 0;
  let softBoundary = 0;
  files.forEach(function (rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    const src = fs.readFileSync(abs, 'utf8');
    const re = /mttCfg\(\{([^}]*)\}\)/g;
    let m;
    while ((m = re.exec(src))) {
      const body = m[1];
      const phaseM = /mttPhase:\s*'([^']+)'/.exec(body);
      const depthM = /stackDepth:\s*'([^']+)'/.exec(body);
      if (!phaseM || !depthM) continue;
      const phase = phaseM[1];
      const depth = depthM[1];
      const bb = parseInt(String(depth).replace('bb', ''), 10);
      if (!isFinite(bb)) continue;
      checked++;
      /* P0: stacks claramente short (<25bb) no deben pinnear mid (auto→short).
         bb25 + mid se permite como pin pedagógico de frontera (taxonomy mid incluye bb25). */
      if (phase === 'mid' && bb < 25 && bb > 12) {
        hardPins++;
        findings.hard.push({
          id: 'school_mid_pin_short_stack',
          msg: rel + ': mttPhase=mid con stackDepth=' + depth + ' (auto→short)',
          snippet: body.trim().slice(0, 80)
        });
      } else if (phase === 'mid' && bb === 25) {
        softBoundary++;
      }
    }
  });
  if (softBoundary > 0) {
    findings.soft.push({
      id: 'school_mid_pin_bb25_boundary',
      msg: softBoundary + ' pins pedagógicos mid@bb25 (auto→short); frontera documentada'
    });
  }
  findings.meta.schoolPinsChecked = checked;
  findings.meta.schoolMidBb25Soft = softBoundary;
  findings.meta.schoolMidShortHard = hardPins;
}

function main() {
  const args = parseArgs(process.argv);
  const consensus = JSON.parse(fs.readFileSync(CONSENSUS_PATH, 'utf8'));
  const sandbox = loadSandbox();
  const w = sandbox.window || sandbox;
  globalThis.__N = w.GTORangesNotation;

  const findings = { hard: [], soft: [], meta: { cells: 0, crossOk: 0, crossFail: 0 } };
  const reportRows = [];

  // --- Phase expectations ---
  (consensus.phaseExpectations || []).forEach(function (exp) {
    const Tax = w.PTFormatTaxonomy;
    const got = Tax.phaseFromStackBB(exp.stackBB, exp.hub);
    const PF = w.GTOPushFold;
    const pushCharts = !!(PF && PF.isPushPhase({
      formatHub: exp.hub, stackBB: exp.stackBB, mttPhase: got, resolvedPhase: got
    }));
    findings.meta.cells++;
    if (got !== exp.phase) {
      const row = {
        id: 'phase_' + exp.hub + '_' + exp.stackBB,
        msg: 'phaseFromStackBB=' + got + ' expect ' + exp.phase,
        severity: exp.severity
      };
      (exp.severity === 'hard' ? findings.hard : findings.soft).push(row);
    }
    if (exp.pushCharts != null && !!exp.pushCharts !== pushCharts) {
      findings.hard.push({
        id: 'pushCharts_' + exp.hub + '_' + exp.stackBB,
        msg: 'pushCharts=' + pushCharts + ' expect ' + exp.pushCharts
      });
    }
    reportRows.push({
      kind: 'phase', hub: exp.hub, stackBB: exp.stackBB, expect: exp.phase, got: got, pushCharts: pushCharts
    });
  });

  // --- Structural overrides (tournament resolve) ---
  (consensus.structuralOverrides || []).forEach(function (ov) {
    const phase = w.PTTournamentGtoEval.resolveTournamentPhase(ov.stackBB, {
      formatHub: 'mtt',
      kind: ov.kind || 'mtt',
      mttPhase: ov.handMttPhase,
      avgStackBB: ov.avgStackBB,
      mttStructureSituation: ov.handMttPhase === 'bubble' ? 'bubble' : null,
      playersLeft: ov.handMttPhase === 'hu' ? 2 : 90,
      placesPaid: ov.handMttPhase === 'hu' ? 1 : 16,
      playersSeated: ov.handMttPhase === 'hu' ? 2 : 6
    });
    findings.meta.cells++;
    if (phase !== ov.expectPhase) {
      findings.hard.push({
        id: ov.id,
        msg: 'resolveTournamentPhase=' + phase + ' expect ' + ov.expectPhase
      });
    }
    reportRows.push({ kind: 'structural', id: ov.id, expect: ov.expectPhase, got: phase });
  });

  // --- Hard / soft decision rules ---
  const rules = [].concat(consensus.hardRules || [], consensus.softRules || []);
  rules.forEach(function (rule) {
    const opts = {
      hub: 'mtt',
      stackBB: rule.stackBB,
      spot: rule.spot,
      position: rule.position,
      vsPosition: rule.vsPosition,
      hand: rule.hand,
      chosenAction: rule.chosenAction
    };
    // Evaluate on tournament (primary) and trainer
    const tRes = evalTournament(w, opts);
    const trRes = evalTrainer(w, opts);
    findings.meta.cells += 2;

    // For mustNotClass, re-run tournament with chosenAction
    let classRes = tRes;
    if (rule.chosenAction && rule.mustNotClass) {
      classRes = evalTournament(w, opts);
    }
    const c1 = checkRule(classRes, rule);
    const c2 = checkRule(trRes, Object.assign({}, rule, {
      // Trainer may use raise vs allin fungible — soften mustDominant for jam
      mustDominant: rule.mustDominant
    }));
    findings.hard = findings.hard.concat(c1.hard).concat(c2.hard);
    findings.soft = findings.soft.concat(c1.soft).concat(c2.soft);
    reportRows.push({
      kind: 'rule',
      id: rule.id,
      severity: rule.severity,
      tournament: { phase: tRes.phase, mode: tRes.preflopMode, dom: tRes.dominant, aggro: tRes.aggro, class: tRes.class },
      trainer: { phase: trRes.phase, mode: trRes.preflopMode, dom: trRes.dominant, aggro: trRes.aggro, class: trRes.class }
    });
  });

  // --- Cross-surface anchors ---
  (consensus.crossSurfaceAnchors || []).forEach(function (anchor) {
    const opts = {
      hub: 'mtt',
      stackBB: anchor.stackBB,
      spot: anchor.spot,
      position: anchor.position,
      vsPosition: anchor.vsPosition,
      hand: anchor.hand,
      chosenAction: anchor.chosenAction
    };
    const a = evalTrainer(w, opts);
    const b = evalTournament(w, opts);
    findings.meta.cells++;
    const da = a.dominant.freq;
    const db = b.dominant.freq;
    const sameFamily = function (x, y) {
      if (x === y) return true;
      const ag = { raise: 1, allin: 1, bet: 1, overbet: 1 };
      return !!(ag[x] && ag[y]);
    };
    const okDom = sameFamily(a.dominant.action, b.dominant.action);
    const delta = Math.abs(da - db);
    if (!okDom || delta > (anchor.maxDominantDelta || 0.15)) {
      findings.hard.push({
        id: anchor.id,
        msg: 'cross-surface mismatch trainer=' + a.dominant.action + '@'
          + Math.round(da * 100) + '% tourney=' + b.dominant.action + '@'
          + Math.round(db * 100) + '% (Δ=' + Math.round(delta * 100) + 'pp)',
        trainer: a,
        tournament: b
      });
      findings.meta.crossFail++;
    } else {
      findings.meta.crossOk++;
    }
    reportRows.push({
      kind: 'cross',
      id: anchor.id,
      trainer: a.dominant,
      tournament: b.dominant,
      trainerMode: a.preflopMode,
      tourneyMode: b.preflopMode
    });
  });

  // --- School pins ---
  auditSchoolPins(w, findings);

  // --- Cover widen sanity (chip lead open) ---
  {
    const cover = evalTournament(w, {
      hub: 'mtt', stackBB: 55, spot: 'RFI', position: 'CO', hand: 'A8s',
      handMttPhase: 'mid', avgStackBB: 30, chosenAction: 'raise'
    });
    // Phase should be early from hero stack
    if (cover.phase !== 'early') {
      findings.hard.push({
        id: 'cover_phase_hero_stack',
        msg: 'cover 55bb expect phase early got ' + cover.phase
      });
    }
  }

  const summary = {
    hard: findings.hard.length,
    soft: findings.soft.length,
    cells: findings.meta.cells,
    crossOk: findings.meta.crossOk,
    crossFail: findings.meta.crossFail,
    schoolPinsChecked: findings.meta.schoolPinsChecked
  };

  const out = {
    generatedAt: new Date().toISOString(),
    summary: summary,
    hard: findings.hard,
    soft: findings.soft,
    rows: args.full ? reportRows : reportRows.filter(function (r) {
      return r.kind === 'structural' || r.kind === 'cross' || r.severity === 'hard'
        || (r.kind === 'rule' && r.severity === 'hard');
    })
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 2));

  const md = [
    '# MTT phase coherence audit',
    '',
    'Generated: ' + out.generatedAt,
    '',
    '## Summary',
    '',
    '- Hard failures: **' + summary.hard + '**',
    '- Soft warnings: **' + summary.soft + '**',
    '- Cells evaluated: ' + summary.cells,
    '- Cross-surface OK/Fail: ' + summary.crossOk + '/' + summary.crossFail,
    '- School pins checked: ' + (summary.schoolPinsChecked || 0),
    '',
    '## Hard failures',
    ''
  ];
  if (!findings.hard.length) md.push('_None._', '');
  else {
    findings.hard.forEach(function (h) {
      md.push('- `' + h.id + '`: ' + h.msg);
    });
    md.push('');
  }
  md.push('## Soft warnings', '');
  if (!findings.soft.length) md.push('_None._', '');
  else {
    findings.soft.slice(0, 40).forEach(function (h) {
      md.push('- `' + h.id + '`: ' + h.msg);
    });
    md.push('');
  }
  md.push('## References', '');
  (consensus.meta.sources || []).forEach(function (s) {
    md.push('- [' + s.name + '](' + s.url + '): ' + s.takeaway);
  });
  md.push('');
  fs.writeFileSync(args.md, md.join('\n'));

  if (!args.quiet) {
    console.log('MTT phase coherence audit');
    console.log('  hard:', summary.hard, 'soft:', summary.soft, 'cells:', summary.cells);
    console.log('  cross OK/Fail:', summary.crossOk + '/' + summary.crossFail);
    console.log('  wrote', args.out);
    console.log('  wrote', args.md);
    findings.hard.slice(0, 20).forEach(function (h) {
      console.error('HARD:', h.id, '—', h.msg);
    });
    findings.soft.slice(0, 10).forEach(function (h) {
      console.warn('SOFT:', h.id, '—', h.msg);
    });
  }

  if (args.assertHard && findings.hard.length) {
    console.error('\n*** ' + findings.hard.length + ' hard failure(s) ***');
    process.exit(1);
  }
  if (!args.quiet) console.log('\nOK audit-mtt-phase-coherence');
}

main();
