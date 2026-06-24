/* Test payload IA sin red. Uso: node tools/test-ai-payload.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: { PT_BUILD: '1.16.4' }, console };
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'ai-hand-payload.js'), 'utf8'), sandbox, { filename: 'ai-hand-payload.js' });

const P = sandbox.window.PTAIHandPayload;
const trainer = P.build('trainer', {
  id: 'h1',
  scenario: { type: 'RFI', heroPos: 'CO' },
  hero: { pos: 'CO', code: 'AKo', cards: ['Kh', 'Ac'] },
  villain: { pos: 'UTG' },
  effStack: 100,
  board: ['4h', 'Ks', '6c', '4c', '8c'],
  decisions: [{
    street: 'river', action: 'fold', label: 'Fold', class: 'optima', best: 'fold',
    evLoss: 0, heroEquity: 79, toCallBB: 48.6, potBB: 99.74,
    board: ['4h', 'Ks', '6c', '4c', '8c'],
    context: 'River facing shove', gto: { fold: 0.8, call: 0.2 }
  }],
  result: {
    heroNet: -25.32, totalEvLoss: 0, reason: 'Fold river',
    board: ['4h', 'Ks', '6c', '4c', '8c'],
    villainCards: ['Qd', 'Qc'], heroHandName: 'Doble pareja',
    villainRangeLog: [{ street: 'river', label: 'shove', amountBB: 48.6, summary: 'polarizado' }]
  }
});

const session = P.build('session', {
  id: '12345',
  heroPos: 'CO',
  heroCode: 'AKo',
  heroCards: ['Kh', 'Ac'],
  sb: 0.02,
  bb: 0.05,
  board: ['4h', 'Ks', '6c', '4c', '8c'],
  heroNetBB: -25.32,
  totalEvLoss: 0,
  accuracy: 100,
  worstClass: 'optima',
  decisions: trainer.dec,
  summary: [
    { kind: 'street', street: 'flop', board: ['4h', 'Ks', '6c'] },
    { kind: 'action', street: 'flop', player: 'Joserra15', pos: 'UTG', type: 'bet', amount: 0.12 },
    { kind: 'action', street: 'flop', player: 'HeroNick', pos: 'CO', type: 'call', amount: 0.12 }
  ],
  villainShows: { Villain1: ['Qd', 'Qc'] }
});

const json = JSON.stringify(trainer);
if (json.includes('Joserra15') || json.includes('HeroNick') || json.includes('email')) {
  console.error('FAIL: payload contiene datos personales');
  process.exit(1);
}
if (!trainer || trainer.src !== 'trainer' || trainer.hero.cards.join('') !== 'KhAc') {
  console.error('FAIL trainer payload');
  process.exit(1);
}
if (!session || session.src !== 'session' || !session.vil.line) {
  console.error('FAIL session payload');
  process.exit(1);
}
if (!trainer.solverNote) {
  console.error('FAIL: payload debe incluir solverNote');
  process.exit(1);
}
if (!trainer.hero.code || trainer.hero.pos !== 'CO') {
  console.error('FAIL: payload debe incluir hero.code y pos');
  process.exit(1);
}
if (trainer.dec[0].context || trainer.dec[0].explanation) {
  console.error('FAIL: decisiones no deben incluir narrativa');
  process.exit(1);
}

const sessGlobal = P.build('sessionGlobal', {
  id: 'ses1',
  fileName: 'Poker56.txt',
  stats: {
    nHands: 3, accuracy: 72, netBB: -5.2, evLossBB: 8.1, expectedNet: 2.9,
    varianceAdj: -8.1, pctDecision: 60, pctVariance: 40,
    grade: { letter: 'C', score: 6.2 },
    accByStreet: { preflop: 80, flop: 65, turn: 70, river: 60 },
    dist: { optima: 40, aceptable: 30, imprecisa: 20, error: 10 }
  },
  hands: [
    {
      id: '1', heroCode: 'AKo', heroPos: 'CO', heroNetBB: 12, totalEvLoss: 0,
      accuracy: 100, worstClass: 'optima', board: ['4h', 'Ks', '6c'], decisions: []
    },
    {
      id: '2', heroCode: 'QJs', heroPos: 'BTN', heroNetBB: -8, totalEvLoss: 3.5,
      accuracy: 50, worstClass: 'error', board: ['Qh', '7s', 'Qc'],
      decisions: [{ street: 'flop', chosen: 'fold', best: 'call', class: 'error', evLossBB: 3.5 }],
      summary: [{ kind: 'action', street: 'flop', pos: 'HJ', type: 'bet', amount: 0.12 }]
    },
    {
      id: '3', heroCode: '77', heroPos: 'BB', heroNetBB: -9, totalEvLoss: 0,
      accuracy: 100, worstClass: 'optima', board: [], decisions: []
    }
  ]
});

const sgJson = JSON.stringify(sessGlobal);
if (!sessGlobal || sessGlobal.src !== 'sessionGlobal' || !sessGlobal.st || !sessGlobal.leaks) {
  console.error('FAIL sessionGlobal payload');
  process.exit(1);
}
if (sgJson.includes('Joserra15') || sgJson.length > 120000) {
  console.error('FAIL sessionGlobal tamaño o datos personales');
  process.exit(1);
}
if (!sessGlobal.clean || sessGlobal.clean.length !== 2) {
  console.error('FAIL sessionGlobal clean hands');
  process.exit(1);
}

console.log('OK test-ai-payload: trainer', trainer.dec.length, 'dec, vil line', session.vil.line,
  'sessionGlobal leaks', sessGlobal.leaks.length, 'bytes', sgJson.length);
