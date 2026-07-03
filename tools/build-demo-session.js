/* Genera data/demo-session.json — sesión anonimizada para G-05. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MAX_HANDS = 12;
const OUT = path.join(__dirname, '..', 'data', 'demo-session.json');
const FIXTURE = path.join(__dirname, 'fixtures', 'Poker56.txt');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, setTimeout, clearTimeout };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/variants.js', 'engine/ranges/registry.js', 'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js', 'engine/handStrength.js', 'engine/equity/madeHand.js',
  'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js', 'engine/equity/blockers.js', 'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js', 'engine/validation/villainCallAudit.js',
  'engine/validation/streetStrategy.js', 'engine/solver/rangeAdvantage.js',
  'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js', 'engine/solver/villainStrategyAdjust.js',
  'engine/solver/preflopSolver.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js', 'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js', 'engine/villainProfiles.js', 'engine/villainPreflop.js',
  'ranges.js', 'range-matrix.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/parsers/pokerstars.js', 'import.js'
];

const root = path.join(__dirname, '..', 'js');
scripts.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
});

sandbox.window.PT_BUILD = '1.30.0';
const Importer = sandbox.window.Importer;
const raw = fs.readFileSync(FIXTURE, 'utf8');
const parsed = Importer.parseSession(raw, 'Sesion-ejemplo-demo.txt');
parsed.hands = (parsed.hands || []).slice(0, MAX_HANDS);
const session = Importer.buildSession(parsed, 'Sesion-ejemplo-demo.txt');

session.id = 'pt_sample_session_v1';
session.fileName = 'Sesión de ejemplo (demo).txt';
session.hero = 'HeroDemo';
session.isSample = true;
session.createdAt = '2026-01-15T12:00:00.000Z';
session.analysisVersion = sandbox.window.PT_BUILD;
delete session.rawText;

(session.hands || []).forEach(function (h) {
  h.hero = 'HeroDemo';
  if (h.timeline) {
    h.timeline.forEach(function (line) {
      if (line && line.text) line.text = line.text.replace(parsed.hero || '', 'HeroDemo');
    });
  }
  (h.decisions || []).forEach(function (d) {
    delete d.optionBreakdown;
    delete d.explanation;
    delete d.context;
    delete d.mathParams;
  });
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(session));
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log('OK demo-session:', session.hands.length, 'manos,', kb, 'KB ->', OUT);
