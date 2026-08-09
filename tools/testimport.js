/* Prueba del importador con ficheros ES y EN de PokerStars + Winamax + GG + spins/9max. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const importChain = [
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/icmLite.js',
  'import/populationCompare.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js',
  'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js',
  'import.js'
];

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/ranges/registry.js',
  'ranges.js', 'engine.js'
].concat(importChain);

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer } = sandbox.window;
const U = sandbox.window.PTHHUtils;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
}

function runFile(relPath, label) {
  const txt = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const meta = Importer.detectSessionFormat(txt);
  const parsed = Importer.parseSession(txt, path.basename(relPath));
  const session = Importer.buildSession(parsed, path.basename(relPath));
  console.log(label + ':', session.hands.length, 'manos | acierto:', session.stats.accuracy + '%',
    '| formato:', meta ? meta.platformLabel + ' ' + meta.localeLabel : '?',
    '| héroe:', session.hero,
    '| kind:', session.context && session.context.gameKind,
    '| key:', session.stats.formatKey);
  assert(session.hero && session.hands.length, label + ' sin manos/héroe');
  if (meta && meta.platform === 'winamax') {
    const withDec = session.hands.filter((h) => h.nDecisions > 0).length;
    assert(withDec >= Math.min(3, session.hands.length), 'Winamax: pocas manos con decisiones');
  }
  return session;
}

runFile('tools/fixtures/Poker56.txt', 'ES Poker56');
const inCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const enPath = !inCi && fs.existsSync(path.join(__dirname, '..', 'sesiones', 'PokerEN1.txt'))
  ? 'sesiones/PokerEN1.txt'
  : 'tools/fixtures/PokerEN-sample.txt';
runFile(enPath, 'EN PokerStars');
runFile('tools/fixtures/PokerStars-EUR-stakes.txt', 'EN PokerStars EUR stakes');
const wmPath = !inCi && fs.existsSync(path.join(__dirname, '..', 'sesiones', '20260703_Paris 06_real_holdem_no-limit.txt'))
  ? 'sesiones/20260703_Paris 06_real_holdem_no-limit.txt'
  : 'tools/fixtures/Winamax-sample.txt';
runFile(wmPath, 'Winamax');
runFile('tools/fixtures/GGPoker-sample.txt', 'GGPoker');

// Detección plataforma
(function () {
  const ps = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8');
  const meta = Importer.detectSessionFormat(ps);
  assert(meta && meta.platform === 'pokerstars', 'PokerStars EN detectado como ' + (meta && meta.platform));
  const gg = fs.readFileSync(path.join(__dirname, 'fixtures', 'GGPoker-sample.txt'), 'utf8');
  const ggMeta = Importer.detectSessionFormat(gg);
  assert(ggMeta && ggMeta.platform === 'ggpoker', 'GGPoker no detectado');
  const parsed = Importer.parseSession(gg, 'GGPoker-sample.txt');
  // 3 cash + 1 MTT → ahora se conservan las 4
  assert(parsed.hands.length === 4, 'GGPoker: esperaba 4 manos (3 cash + 1 MTT), got ' + parsed.hands.length);
  assert(parsed.hero === 'Hero', 'GGPoker héroe');
  const kinds = parsed.hands.map((h) => h.gameKind);
  assert(kinds.filter((k) => k === 'cash').length === 3, 'GGPoker cash count');
  assert(kinds.filter((k) => k === 'mtt').length === 1, 'GGPoker mtt count');
  assert(parsed.hands.every((h) => h.tableMax), 'GGPoker tableMax');
  const session = Importer.buildSession(parsed, 'GGPoker-sample.txt');
  assert(session.hands.some((h) => h.gameKind === 'mtt'), 'GGPoker sesión conserva MTT');
  assert(session.hands.every((h) => h.formatKey), 'manos con formatKey');
  console.log('GGPoker detect/keep OK (3 cash + 1 MTT)');
})();

// Spin & Go
(function () {
  const session = runFile('tools/fixtures/PokerStars-spin-sample.txt', 'Spin & Go');
  assert(session.context.gameKind === 'spin', 'spin gameKind');
  assert(session.context.tableMax === 3, 'spin tableMax 3');
  assert(session.stats.formatKey === 'spin3', 'spin formatKey');
  assert(session.stats.format === 'spin', 'spin legacy format');
  assert(session.hands.every((h) => h.gameKind === 'spin'), 'todas spin');
  assert(session.hands[0].buyIn === 5, 'spin buyIn 5 got ' + session.hands[0].buyIn);
  const ideal = Importer.styleIdealForFormat('spin3');
  assert(ideal.vpipMin >= 30, 'ideales spin más loose');
  console.log('Spin & Go OK');
})();

// 9-max positions + format
(function () {
  const session = runFile('tools/fixtures/PokerStars-9max-sample.txt', '9-max');
  assert(session.context.tableMax === 9, '9max tableMax');
  assert(session.stats.formatKey === 'cash9' || session.stats.format === '9max', '9max formatKey got ' + session.stats.formatKey);
  const h = session.hands[0];
  const posVals = Object.keys(h.positions || {}).map((k) => h.positions[k]);
  assert(posVals.indexOf('LJ') >= 0 || posVals.indexOf('UTG1') >= 0 || posVals.indexOf('UTG2') >= 0,
    '9max debe etiquetar LJ/UTG1/UTG2, got ' + posVals.join(','));
  console.log('9-max OK positions:', posVals.join(', '));
})();

// EN sample tableMax from 6-max line
(function () {
  const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8');
  const parsed = Importer.parseSession(txt, 'en');
  assert(parsed.hands.length > 0, 'EN hands');
  assert(parsed.hands[0].tableMax === 6, 'EN tableMax 6 got ' + parsed.hands[0].tableMax);
  assert(parsed.hands[0].gameKind === 'cash', 'EN cash');
  assert(parsed.hands[0].isZoom === true, 'EN Zoom flag');
  console.log('EN metadata OK (6-max Zoom)');
})();

// Helpers unit
(function () {
  assert(U.legacyFormatFromKey('cash9') === '9max', 'legacy cash9');
  assert(U.legacyFormatFromKey('spin3') === 'spin', 'legacy spin');
  assert(U.formatKeyFromMeta({ gameKind: 'cash', tableMax: 6 }) === 'cash6', 'formatKey cash6');
  assert(U.detectTableMaxFromText("Table 'X' 9-max Seat #1 is the button") === 9, 'detect 9-max');
  assert(U.isSpinSignal('Spin & Go Hold\'em'), 'spin signal');
  console.log('hhUtils helpers OK');
})();

// P2: limp / delayed / tags / CI / heroCandidates / ante
(function () {
  const session = runFile('tools/fixtures/PokerEN-sample.txt', 'P2 EN');
  assert(session.stats.limpOpps != null, 'limpOpps expuesto');
  assert(session.stats.delayedCbetOpps != null, 'delayedCbetOpps expuesto');
  assert(session.hands.some((h) => Array.isArray(h.tags) && h.tags.length), 'tags en manos');
  const ci = Importer.computeBbPer100CI([-1, 2, -0.5, 1, 0, 3, -2, 0.5, 1.2, -0.8].concat(Array(25).fill(0.1)));
  assert(ci && ci.low != null && ci.high != null && ci.n >= 30, 'bb/100 CI');
  const parsed = Importer.parseSession(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8'),
    'en'
  );
  assert(Array.isArray(parsed.heroCandidates) && parsed.heroCandidates.length >= 1, 'heroCandidates');
  assert(Importer.handDedupeKey({ platform: 'pokerstars', id: '1' }) === 'pokerstars|1', 'dedupe key');
  assert(Importer.formatKeyToRangeGameType('cash9') === 'cash9', 'gameType cash9');
  assert(Importer.formatKeyToRangeGameType('spin3') === 'mtt', 'gameType spin→mtt');
  // Ante seeding: posts deben sumar al pot preflop
  const anteHand = {
    bb: 0.10, sb: 0.05, ante: 0.01, hero: 'Hero', heroCards: ['As', 'Kd'],
    blinds: { sb: 'A', bb: 'B' },
    posts: { A: 0.06, B: 0.11, Hero: 0.01, C: 0.01 },
    seats: [{ name: 'A' }, { name: 'B' }, { name: 'Hero' }, { name: 'C' }],
    streets: { preflop: [], flop: [], turn: [], river: [] },
    positions: { Hero: 'BTN', A: 'SB', B: 'BB', C: 'CO' },
    board: { flop: [], turn: [], river: [] },
    gameKind: 'cash', tableMax: 6, platform: 'pokerstars', id: 'ante1'
  };
  const potFromPosts = Object.values(anteHand.posts).reduce((s, v) => s + v, 0);
  assert(Math.abs(potFromPosts - 0.19) < 1e-9, 'ante posts sum');
  console.log('P2 limp/tags/CI/heroCandidates OK');
})();

// P3: 888poker + PLO/Short Deck parse-only + ICM lite
(function () {
  const s888 = runFile('tools/fixtures/888poker-sample.txt', '888poker');
  assert(s888.format && s888.format.platform === '888poker', '888 platform');
  assert(s888.hands.length >= 2, '888 hands');
  assert(s888.context.gameKind === 'cash', '888 cash');

  const ploTxt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerStars-plo-sample.txt'), 'utf8');
  const ploParsed = Importer.parseSession(ploTxt, 'plo');
  assert(ploParsed.hands.length >= 1, 'PLO parse keep');
  assert(ploParsed.hands[0].variant === 'plo', 'PLO variant');
  const ploSes = Importer.buildSession(ploParsed, 'plo');
  assert(ploSes.hands[0].analysisUnsupported === true, 'PLO sin GTO');
  assert((ploSes.hands[0].decisions || []).length === 0, 'PLO sin decisions GTO');

  const sdTxt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerStars-shortdeck-sample.txt'), 'utf8');
  const sdParsed = Importer.parseSession(sdTxt, 'sd');
  assert(sdParsed.hands.length >= 1, 'Short Deck parse keep');
  assert(sdParsed.hands[0].variant === 'shortdeck', 'SD variant got ' + (sdParsed.hands[0] && sdParsed.hands[0].variant));
  const sdSes = Importer.buildSession(sdParsed, 'sd');
  assert(sdSes.hands[0].analysisUnsupported === true, 'SD sin GTO');

  if (sandbox.window.PTIcmLite) {
    const eq = sandbox.window.PTIcmLite.icmEquities([10, 10, 10], [0.65, 0.35, 0]);
    assert(eq && eq.length === 3, 'ICM equities');
    assert(Math.abs(eq[0] - eq[1]) < 0.05, 'ICM simétrico 3-way');
  }
  console.log('P3 888/PLO/SD/ICM OK');
})();

// Resúmenes Tournament History (sin manos) → mensaje claro
(function () {
  const spinSum = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerStars-tournament-summary-spin.txt'), 'utf8');
  const mttSum = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerStars-tournament-summary-mtt.txt'), 'utf8');
  assert(U.looksLikeHandHistory(spinSum) === false, 'spin summary no es HH');
  assert(U.looksLikeHandHistory(mttSum) === false, 'mtt summary no es HH');
  const dSpin = U.detectNonHandHistory(spinSum);
  const dMtt = U.detectNonHandHistory(mttSum);
  assert(dSpin && dSpin.kind === 'psTournamentSummary', 'detect spin summary');
  assert(dMtt && dMtt.kind === 'psTournamentSummary', 'detect mtt summary');
  const msg = Importer.importFailureMessage('Spin1.txt', spinSum, { hands: [], hero: null });
  assert(/Tournament History|historial de manos|Hand History/i.test(msg), 'mensaje útil got: ' + msg);
  const cash = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8');
  assert(U.detectNonHandHistory(cash) == null, 'HH real no marcado como summary');
  const parsedEmpty = Importer.parseSession(spinSum, 'Spin1.txt');
  assert(!parsedEmpty.hands.length, 'summary no parsea manos');
  console.log('Tournament History summary detect OK');
})();

console.log('*** IMPORTADOR OK (cash/spins/MTT + P2 + P3) ***');
