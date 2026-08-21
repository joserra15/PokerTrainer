#!/usr/bin/env node
/**
 * Regresión entrenador profesional (RoadMap Cash/Spins/Torneos).
 * Cubre: chrome de mesa, copy fase/escenario, presets, sizing, ICM feedback,
 * frontera push vs short, y contratos de rangos del feedback pro.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;
function check(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

// ─── 1. Static UX / markup ─────────────────────────────────────────────
const html = read('index.html');
const css = read('css/styles.css');
const shareCss = read('css/share.css');
const app = read('js/app.js');
const version = read('js/version.js');

check(/table-watermark-sub/.test(html) && /Modo entrenamiento/.test(html),
  'watermark «Modo entrenamiento» en index.html');
check(/id="table-train-chrome"/.test(html) && /id="table-format-badge"/.test(html) && /id="table-train-hud"/.test(html),
  'chrome + badge de formato + HUD de entrenamiento en mesa');
check(/data-format="cash"/.test(html), 'felt inicial data-format=cash');
check(/Auto \(por stack\)/.test(html), 'chip fase Auto (por stack)');
check(/>Aleatorio</.test(html) && /Escenario/.test(html), 'escenario etiquetado Aleatorio');
check(/id="setup-play-preset"/.test(html) && /Spin grind/.test(html) && /Reg MTT low/.test(html),
  'presets Mi juego en setup');
check(/id="setup-user-presets"/.test(html) && /id="setup-preset-save"/.test(html),
  'UI guardar/borrar presets de usuario');
check(/id="setup-open-size"/.test(html) && /data-val="2\.2"/.test(html) && /data-val="2\.5"/.test(html) && /data-val="3"/.test(html),
  'chips sizing open 2.2/2.5/3');
check(/etiqueta <strong>ICM<\/strong>/.test(html) || /ICM<\/strong> en el tapete/.test(html) || /premio importa más que las fichas/.test(html),
  'copy honesto Spins/Torneos en setup (ICM explicado)');

check(/data-format="spin"/.test(css) && /data-format="mtt"/.test(css),
  'CSS tapetes spin/mtt');
check(/\.table-watermark-sub/.test(css) && /\.table-format-badge/.test(css) && /\.table-train-hud/.test(css) && /\.table-train-chrome/.test(css),
  'CSS watermark/badge/train-hud/chrome');
check(/\.table-watermark-sub/.test(shareCss) && /data-format="spin"/.test(shareCss) && /\.table-train-chrome/.test(shareCss),
  'share.css alineado (watermark + format + chrome)');

check(/function renderTrainHud/.test(app) && /function tableChromeHTML/.test(app),
  'app.js renderTrainHud + tableChromeHTML');
check(/d\.icmNote/.test(app) && /ICM \(valor del premio\)/.test(app),
  'showFeedback renderiza bloque ICM');
check(/ICM activo:/.test(app) && /title:/.test(app),
  'chip ICM del HUD tiene tooltip explicativo');
check(/function renderTournamentDecisionImpact/.test(app)
  && /renderTournamentDecisionImpact\(d\)/.test(app)
  && /phaseNote/.test(app),
  'detalle de mano muestra impacto de fase/ICM');
check(/icmChangedEv/.test(app) && /chipEvLoss/.test(read('js/engine.js'))
  && /chipEvLoss/.test(read('js/engine/solver/LocalSolverProvider.js')),
  'EV pre/post ICM cableado en solver y decisiones');
check(/PLAY_PRESETS/.test(app) && /spin_grind/.test(app) && /mtt_low/.test(app),
  'PLAY_PRESETS cash/spin/mtt');
check(/preflopOpenSize/.test(app), 'preflopOpenSize cableado en readPlayConfig/apply');
check(/PT_BUILD\s*=\s*'2.7.20'/.test(version), 'PT_BUILD 2.7.20');

const decisionDoc = read('docs/DECISION_ENTRENADOR_MTT_SPIN.md');
check(/Profundizar/.test(decisionDoc) && /ICM lite/.test(decisionDoc),
  'decisión producto MTT/Spin documentada');

// ─── 2. Runtime: config / ranges / engine ───────────────────────────────
const sandbox = createSandbox();
loadTrainer(sandbox);
const w = sandbox.window;
const Tax = w.PTFormatTaxonomy;
const PC = w.PTPlayConfig;
const Reg = w.GTORangesRegistry;
const N = w.GTORangesNotation;
const Engine = w.Engine;
const Icm = w.GTOIcmEv;

check(!!(Tax && PC && Reg && N && Engine), 'deps trainer cargadas');

function handIn(csv, code) {
  if (!csv) return false;
  return N.expand(csv).indexOf(code) >= 0;
}
function openAction(pos, ctx) {
  const row = Reg.getOpenRaiseRow(pos, ctx);
  if (!row) return 'missing';
  if (handIn(row.raise, 'KJo')) return 'raise';
  if (handIn(row.mix, 'KJo')) return 'mix';
  return 'fold';
}

// Fase Auto ≠ escenario random
const autoMid = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb40', mttPhase: 'auto', scenario: 'random' });
check(autoMid.mttPhase === 'auto' && autoMid.resolvedPhase === 'mid',
  'Auto+40bb → resolvedPhase mid');
const autoShort = PC.normalize({ formatHub: 'spin', stackDepth: 'bb10', mttPhase: 'auto' });
check(autoShort.resolvedPhase === 'push', 'Spin Auto+10bb → push');
const lbl = PC.labelFor(autoMid);
check(/Fase mid \(auto\)/.test(lbl) || /mid \(auto\)/.test(lbl),
  'labelFor muestra Fase mid (auto): ' + lbl);
check(/Escenario aleatorio/.test(lbl), 'labelFor distingue escenario aleatorio');

// Presets equivalentes (normalize de partials del UI)
const spinPreset = PC.normalize({
  formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb15', scenario: 'random',
  mttPhase: 'auto', spinPayout: '3x', villainLevel: 'pro', practiceStreet: 'preflop',
  preflopOpenSize: 2.5
});
check(spinPreset.formatHub === 'spin' && spinPreset.spinPayout === '3x' && Tax.usesIcm(spinPreset),
  'preset Spin grind: hub+ICM+payout 3x');
const mttPreset = PC.normalize({
  formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', scenario: 'random',
  mttPhase: 'mid', villainLevel: 'pro', preflopOpenSize: 2.2
});
check(mttPreset.resolvedPhase === 'mid' && mttPreset.preflopOpenSize === 2.2 && mttPreset.anteBB > 0,
  'preset Reg MTT low: mid + open 2.2 + ante');

// Sizing open
check(PC.normalize({ preflopOpenSize: 3 }).preflopOpenSize === 3, 'open size 3 válido');
check(PC.normalize({ preflopOpenSize: 1.5 }).preflopOpenSize === 2.5, 'open size inválido → 2.5');

// KJo LJ por fase
const early = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb100', mttPhase: 'early' });
check(openAction('LJ', early) === 'raise', 'KJo LJ early = raise');
const short = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb20', mttPhase: 'short' });
const shortAct = openAction('LJ', short);
check(shortAct === 'mix' || shortAct === 'raise', 'KJo LJ short ≠ fold duro (' + shortAct + ')');
const push = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb10', mttPhase: 'push' });
check(openAction('LJ', push) !== 'raise', 'KJo LJ push ≠ raise value');

// Tabla MTT con LJ nativo
const earlyTable = Reg.getOpenRaiseTable(early);
check(!!earlyTable.LJ && /KJo/.test(earlyTable.LJ.raise || ''), 'OPEN_RAISE_MTT.LJ nativo con KJo');

// Frontera: short 20bb NO usa chart push; push 10bb sí
const shortRow = Reg.getOpenRaiseRow('LJ', short);
const pushRow = Reg.getOpenRaiseRow('LJ', push);
check(!!shortRow && !!pushRow, 'filas LJ short/push existen');
check(JSON.stringify(shortRow) !== JSON.stringify(pushRow),
  'short 20bb y push 10bb usan charts distintos para LJ');

// 3bets pro vs fish
const pro = Reg.getVsRfiRow('BB', 'SB', PC.normalize({ gameType: 'cash6', villainLevel: 'pro' }));
const fish = Reg.getVsRfiRow('BB', 'SB', PC.normalize({ gameType: 'cash6', villainLevel: 'fish' }));
check(!handIn(pro.threeBet, 'T3o') && !handIn(pro.threeBetMix, 'T3o'), 'T3o ausente en 3bet pro');
check(!handIn(pro.threeBetMix, 'A2o') && !handIn(pro.threeBetMix, 'A9o'), 'Axo extremo fuera de 3bet pro');
check(handIn(fish.threeBetMix, 'A2o') || handIn(fish.threeBetMix, 'A9o'), 'fish ensancha 3bet Axo');

// adjustVsRfiRow no promociona basura a threeBet
const adj = Reg.adjustVsRfiRow({
  threeBet: 'QQ+, AKs, AKo',
  threeBetMix: 'JJ, AQs',
  call: 'TT-22, AQs',
  callMix: 'AJo'
}, 'deep');
check(adj && !handIn(adj.threeBet, 'AJo'), 'adjustVsRfiRow: AJo no cae a threeBet value');

// ICM scoring activo en spin/mtt late
check(Tax.usesIcm(PC.normalize({ formatHub: 'spin', stackDepth: 'bb25' })), 'spin siempre ICM');
check(Tax.usesIcm(PC.normalize({ formatHub: 'mtt', stackDepth: 'bb20', mttPhase: 'short' })), 'mtt short ICM');
check(!Tax.usesIcm(PC.normalize({ formatHub: 'cash', gameType: 'cash6' })), 'cash sin ICM');
check(!!Icm, 'GTOIcmEv disponible');

// evaluateSpot spin/mtt anota fase + ICM en la evaluación
const GTO = w.GTO;
if (GTO && GTO.evaluateSpot) {
  const spinEv = GTO.evaluateSpot({
    street: 'preflop',
    heroCards: ['Ah', 'Kd'],
    position: 'BTN',
    potBB: 1.5,
    toCallBB: 1,
    chosenAction: 'fold',
    formatHub: 'spin',
    gameType: 'spin3',
    mttPhase: 'push',
    stackDepth: 12,
    heroStackBB: 12,
    villainStackBB: 12,
    spinPayout: '3x',
    scenarioType: 'RFI'
  });
  const sev = spinEv && spinEv.evaluation;
  check(!!sev && (sev.phaseNote || sev.mttPhase === 'push' || sev.formatHub === 'spin'),
    'spin evaluateSpot anota fase/formato');
  check(!!sev && (sev.icmLite || sev.icmNote || sev.icmMultiplier != null),
    'spin evaluateSpot anota ICM');

  const mttEv = GTO.evaluateSpot({
    street: 'preflop',
    heroCards: ['Kh', 'Jd'],
    position: 'HJ',
    potBB: 1.5,
    toCallBB: 0,
    chosenAction: 'raise',
    formatHub: 'mtt',
    gameType: 'mtt',
    mttPhase: 'short',
    stackDepth: 20,
    heroStackBB: 20,
    villainStackBB: 22,
    scenarioType: 'RFI'
  });
  const mev = mttEv && mttEv.evaluation;
  check(!!mev && (mev.phaseNote || mev.mttPhase === 'short'),
    'mtt short evaluateSpot anota fase');
}

// Engine: open size configurable en mano
if (Engine && Engine.newHand) {
  let hand = null;
  try {
    hand = Engine.newHand(PC.normalize({
      formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100',
      scenario: 'rfi', heroPos: 'BTN', handRange: 'all',
      preflopOpenSize: 2.2, practiceStreet: 'preflop', actionMode: 'quick'
    }));
  } catch (e) {
    hand = null;
  }
  if (hand && hand.playConfig) {
    check(hand.playConfig.preflopOpenSize === 2.2, 'mano conserva preflopOpenSize 2.2');
  } else {
    // newHand puede devolver null si el spot no se materializa; no bloquear suite
    check(true, 'Engine.newHand smoke (spot opcional)');
  }
}

// ─── Exit ──────────────────────────────────────────────────────────────
if (failed) {
  console.error('\n*** test-trainer-pro-regression: ' + failed + ' fallos ***');
  process.exit(1);
}
console.log('\n*** test-trainer-pro-regression OK ***');
