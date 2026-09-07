/* Test: PTTournamentContext + bridge Torneos IA metadata. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

[
  'engine/format/taxonomy.js',
  'engine/format/tournament-context.js',
  'play-config.js',
  'tournament/config.js',
  'tournament/session-bridge.js'
].forEach((f) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

let failed = false;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

const TC = sandbox.window.PTTournamentContext;
const Tax = sandbox.window.PTFormatTaxonomy;
const Cfg = sandbox.window.PTTournamentConfig;
const Bridge = sandbox.window.PTTournamentSessionBridge;

assert(!!TC && !!Tax && !!Cfg && !!Bridge, 'módulos cargados');
assert(Tax.normalizeTournamentType('PKO') === 'pko', 'taxonomy normalize PKO');
assert(TC.formatKeyFromContext({ formatHub: 'mtt', tableMax: 6, playersSeated: 6 }) === 'mtt6', 'formatKey mtt6');
assert(TC.formatKeyFromContext({ formatHub: 'spin', playersSeated: 3 }) === 'spin3', 'formatKey spin3');

const cfg = Cfg.normalize({ kind: 'mtt', seatsPerTable: 6, tournamentType: 'mystery', entries: 18, placesPaid: 3 });
assert(cfg.tournamentType === 'mystery', 'tournament config mystery');

const fakeHand = {
  seats: [
    { id: 'h1', name: 'Hero', isHero: true, pos: 'BTN', startStack: 1800, stack: 1800 },
    { id: 'v1', name: 'Villain', isHero: false, pos: 'BB', startStack: 2200, stack: 2200 }
  ],
  bb: 100,
  sb: 50,
  ante: 10,
  board: [],
  actionLog: [],
  result: { holeCards: { h1: ['As', 'Kd'], v1: ['Qs', 'Qd'] }, deltas: { h1: -50, v1: 50 }, showdown: false },
  handIndex: 3
};
const analyzed = Bridge.handFromTournament(fakeHand, Bridge.metaFromState({
  id: 't1',
  config: cfg,
  playersLeft: 12,
  aliveCount: 12
}, { handIndex: 3, heroName: 'Hero' }));

assert(!!analyzed, 'bridge produce mano');
assert(analyzed.playersSeated === 2, 'bridge playersSeated=2');
assert(analyzed.tournamentType === 'mystery', 'bridge tournamentType');
assert(analyzed.formatKey === 'mtt6' || analyzed.formatKey === 'mtt3' || analyzed.formatKey.indexOf('mtt') === 0,
  'bridge formatKey mtt*: ' + analyzed.formatKey);
assert(analyzed.stackDepthBB != null && analyzed.stackDepthBB > 0, 'bridge stackDepthBB');
assert(analyzed.mttPhase, 'bridge mttPhase: ' + analyzed.mttPhase);
assert(analyzed.playersLeft === 12, 'bridge playersLeft field');

if (failed) { console.error('\n*** TEST FALLÓ ***'); process.exit(1); }
console.log('\nOK tournament-context bridge');
