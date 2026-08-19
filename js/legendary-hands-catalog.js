/*
 * legendary-hands-catalog.js — Definiciones jugables de manos legendarias (Fase 1–2).
 */
(function (global) {
  'use strict';

  var POS_ORDER_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var POS_ORDER_HU = ['BTN', 'BB'];

  function foldPos(pos) {
    return { pos: pos, street: 'preflop', action: 'fold' };
  }

  function posOrder(hu) {
    return hu ? POS_ORDER_HU.slice() : POS_ORDER_6.slice();
  }

  /** Inserta folds implícitos desde UTG/BTN según orden de mesa. */
  function expandPreflop(heroPos, villainPos, actions, hu) {
    var order = posOrder(hu);
    var result = [];
    var lastIdx = -1;
    (actions || []).forEach(function (a) {
      if (a.street !== 'preflop') {
        result.push(a);
        return;
      }
      var idx = order.indexOf(a.pos);
      if (idx >= 0) {
        for (var i = lastIdx + 1; i < idx; i++) {
          result.push(foldPos(order[i]));
        }
        lastIdx = Math.max(lastIdx, idx);
      }
      result.push(a);
    });
    return { heroPos: heroPos, villainPos: villainPos, actions: result };
  }

  function scriptHU(heroPos, villainPos, heroPreflop, villainBarrels, hu) {
    hu = hu != null ? hu : false;
    var actions = [];
    if (heroPreflop === 'raise') {
      actions.push({ pos: heroPos, street: 'preflop', action: 'raise' });
      posOrder(hu).forEach(function (pos) {
        if (pos === heroPos) return;
        if (pos === villainPos) actions.push({ pos: pos, street: 'preflop', action: 'call' });
        else actions.push(foldPos(pos));
      });
    } else if (heroPreflop === 'call') {
      actions.push({ pos: villainPos, street: 'preflop', action: 'raise' });
      posOrder(hu).forEach(function (pos) {
        if (pos === heroPos || pos === villainPos) return;
        actions.push(foldPos(pos));
      });
      actions.push({ pos: heroPos, street: 'preflop', action: 'call' });
    }
    (villainBarrels || []).forEach(function (row) {
      actions.push({
        pos: villainPos,
        street: row.street,
        action: row.action,
        amountBB: row.amountBB != null ? row.amountBB : null
      });
    });
    return expandPreflop(heroPos, villainPos, actions, hu);
  }

  function fourBetScript(heroPos, villainPos, heroRole, hu) {
    var h = heroPos;
    var v = villainPos;
    var actions = [
      { pos: h, street: 'preflop', action: 'raise' },
      { pos: v, street: 'preflop', action: 'raise' },
      { pos: h, street: 'preflop', action: 'raise' },
      { pos: v, street: 'preflop', action: 'raise' },
      { pos: h, street: 'preflop', action: heroRole === 'folder' ? 'call' : 'call' },
      { pos: v, street: 'flop', action: 'bet', amountBB: 2.5 },
      { pos: h, street: 'flop', action: 'call' },
      { pos: v, street: 'turn', action: 'bet', amountBB: 6 }
    ];
    if (heroRole === 'folder') {
      actions.push({ pos: h, street: 'turn', action: 'fold' });
    } else {
      actions.push({ pos: h, street: 'turn', action: 'fold' });
    }
    return expandPreflop(h, v, actions, hu);
  }

  function fourBetScriptAggressor(heroPos, villainPos, hu) {
    var h = heroPos;
    var v = villainPos;
    return expandPreflop(h, v, [
      { pos: v, street: 'preflop', action: 'raise' },
      { pos: h, street: 'preflop', action: 'raise' },
      { pos: v, street: 'preflop', action: 'raise' },
      { pos: h, street: 'preflop', action: 'raise' },
      { pos: v, street: 'preflop', action: 'call' },
      { pos: h, street: 'flop', action: 'bet', amountBB: 2.5 },
      { pos: v, street: 'flop', action: 'call' },
      { pos: h, street: 'turn', action: 'bet', amountBB: 6 },
      { pos: v, street: 'turn', action: 'fold' }
    ], hu);
  }

  var STACKS_ME_DAY5 = { UTG: 44, HJ: 54, CO: 61, BTN: 52, SB: 43, BB: 48 };

  var HANDS = [
    {
      id: 'LH-2024-WSOP-ME-MATEOS-FOLD-KK',
      titleBlind: 'WSOP Main Event · Día 5',
      title: 'Mateos foldea KK vs AA en 4-bet pot',
      year: 2024,
      date: '2024-07-14',
      event: { name: 'WSOP Main Event', series: 'WSOP', stage: 'Day 5', buyInUSD: 10000, venue: 'Las Vegas' },
      regionPrimary: 'ES',
      featured: true,
      planGate: 'free',
      viralScore: 5,
      tags: ['fold-heroico', '4bet-pot', 'wsop-me'],
      visual: { theme: 'wsop', tableVariant: 'feature', spotlight: true },
      media: {
        videoUrl: 'https://www.pokernews.com/news/2024/07/mateos-kings-fold-wsop-main-event-46510.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Adrián Mateos paga un bote 4-bet con KK contra Will Berry (AA). Berry apuesta flop y turn; en el T, Mateos foldea en menos de 90 segundos. Joey Ingram lo llamó «en modo dios».',
        highlights: ['4-bet pot en mesa final del ME', 'Fold de KK en turn con un T', 'Reacción viral instantánea']
      },
      cast: [
        { playerId: 'adrian-mateos', displayName: 'Adrián Mateos', country: 'ES', countryLabel: 'España', pos: 'HJ', cards: ['Ks', 'Kh'], role: 'hero' },
        { playerId: 'will-berry', displayName: 'Will Berry', country: 'US', countryLabel: 'Estados Unidos', pos: 'CO', cards: ['As', 'Ac'], role: 'villain' }
      ],
      heroCandidates: ['adrian-mateos', 'will-berry'],
      play: {
        type: 'RFI',
        seed: 88001,
        blindsLabel: '100.000/200.000',
        stacks: STACKS_ME_DAY5,
        board: ['Qd', '4d', '2c', 'Ts'],
        roles: {
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'CO', stackBB: 54,
            heroCards: ['Ks', 'Kh'], villainCards: ['As', 'Ac'],
            forceScript: fourBetScript('HJ', 'CO', 'folder')
          },
          'will-berry': {
            heroPos: 'CO', villainPos: 'HJ', stackBB: 61,
            heroCards: ['As', 'Ac'], villainCards: ['Ks', 'Kh'],
            forceScript: fourBetScriptAggressor('CO', 'HJ')
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Will Berry', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Will Berry', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Qd', '4d', '2c'] },
        { kind: 'action', street: 'flop', player: 'Will Berry', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Adrián Mateos', pos: 'HJ', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Qd', '4d', '2c', 'Ts'] },
        { kind: 'action', street: 'turn', player: 'Will Berry', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'turn', player: 'Adrián Mateos', pos: 'HJ', type: 'fold' }
      ]
    },
    {
      id: 'LH-2024-WSOP-ME-MATEOS-AA-CRACKED',
      titleBlind: 'WSOP Main Event · Día 5 · Mano 2',
      title: 'Mateos pierde con AA vs AK de García',
      year: 2024,
      date: '2024-07-14',
      event: { name: 'WSOP Main Event', series: 'WSOP', stage: 'Day 5', buyInUSD: 10000 },
      regionPrimary: 'ES',
      featured: true,
      tags: ['bad-beat', '5bet-shove', 'wsop-me'],
      visual: { theme: 'wsop', tableVariant: 'feature' },
      media: {
        videoUrl: 'https://codigopoker.com/wsop/video-adrian-mateos-lectura-perfecta-y-bad-beat-devastador-en-el-main-event',
        videoLabel: 'Ver vídeo (CodigoPoker)'
      },
      story: {
        es: 'Mateos va all-in con AA contra el 5-bet de Adrián García (AK). El board 10-9-8 trae turn y river de picas: García completa color milagroso y elimina a Mateos.',
        highlights: ['5-bet shove preflop', 'Runner-runner flush', 'Eliminación del ME']
      },
      cast: [
        { playerId: 'adrian-mateos', displayName: 'Adrián Mateos', country: 'ES', countryLabel: 'España', pos: 'HJ', cards: ['Ah', 'Ac'], role: 'hero' },
        { playerId: 'adrian-garcia', displayName: 'Adrián García', country: 'ES', countryLabel: 'España', pos: 'BB', cards: ['As', 'Ks'], role: 'villain' }
      ],
      heroCandidates: ['adrian-mateos', 'adrian-garcia'],
      play: {
        type: 'RFI',
        seed: 88002,
        blindsLabel: '100.000/200.000',
        stacks: { UTG: 40, HJ: 42, CO: 55, BTN: 50, SB: 38, BB: 38 },
        board: ['Ts', '9h', '8d', '9s', '3s'],
        roles: {
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'BB', stackBB: 42,
            heroCards: ['Ah', 'Ac'], villainCards: ['As', 'Ks'],
            forceScript: expandPreflop('HJ', 'BB', [
              { pos: 'HJ', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'HJ', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'HJ', street: 'preflop', action: 'call' }
            ])
          },
          'adrian-garcia': {
            heroPos: 'BB', villainPos: 'HJ', stackBB: 38,
            heroCards: ['As', 'Ks'], villainCards: ['Ah', 'Ac'],
            forceScript: expandPreflop('BB', 'HJ', [
              { pos: 'HJ', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'HJ', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'HJ', street: 'preflop', action: 'call' }
            ])
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián García', pos: 'BB', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián García', pos: 'BB', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Ts', '9h', '8d'] },
        { kind: 'street', street: 'turn', board: ['Ts', '9h', '8d', '9s'] },
        { kind: 'street', street: 'river', board: ['Ts', '9h', '8d', '9s', '3s'] },
        { kind: 'show', street: 'river', player: 'Adrián García', pos: 'BB', cards: ['As', 'Ks'] },
        { kind: 'show', street: 'river', player: 'Adrián Mateos', pos: 'HJ', cards: ['Ah', 'Ac'] }
      ]
    },
    {
      id: 'LH-2024-WSOP-GALIANA-7HIGH-BLUFF',
      titleBlind: 'WSOP Event #34 · Mesa final',
      title: 'Galiana gana el brazalete con bluff épico',
      year: 2024,
      date: '2024-06-15',
      event: { name: 'WSOP Event #34 $2,500 Freezeout', series: 'WSOP', stage: 'Heads-up' },
      regionPrimary: 'ES',
      featured: true,
      tags: ['bluff', '5bet', 'wsop-bracelet'],
      visual: { theme: 'wsop', tableVariant: 'heads-up' },
      media: {
        videoUrl: 'https://www.pokernews.com/news/2024/06/antonio-galiana-big-bluff-propels-him-to-first-bracelet-46284.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Antonio Galiana gana su primer brazalete en heads-up contra Johan Guilbert. En un board monotone de tréboles, sube y resube en river con solo 7-high; Guilbert foldea.',
        highlights: ['Board monotone de tréboles', '5-bet bluff en river', 'Primer brazalete WSOP']
      },
      cast: [
        { playerId: 'antonio-galiana', displayName: 'Antonio Galiana', country: 'ES', countryLabel: 'España', pos: 'BTN', cards: ['7h', '2d'], role: 'hero' },
        { playerId: 'johan-guilbert', displayName: 'Johan Guilbert', country: 'FR', countryLabel: 'Francia', pos: 'BB', cards: ['Qc', '4s'], role: 'villain' }
      ],
      heroCandidates: ['antonio-galiana', 'johan-guilbert'],
      play: {
        type: 'RFI',
        seed: 88003,
        blindsLabel: '25.000/50.000',
        stacks: { BTN: 28, BB: 32 },
        board: ['Ac', 'Kc', '5c', 'Jc', '2c'],
        roles: {
          'antonio-galiana': {
            heroPos: 'BTN', villainPos: 'BB', stackBB: 28,
            heroCards: ['7h', '2d'], villainCards: ['Qc', '4s'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'check' },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'bet', amountBB: 8 }
            ], true)
          },
          'johan-guilbert': {
            heroPos: 'BB', villainPos: 'BTN', stackBB: 32,
            heroCards: ['Qc', '4s'], villainCards: ['7h', '2d'],
            forceScript: expandPreflop('BB', 'BTN', [
              { pos: 'BTN', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'call' },
              { pos: 'BB', street: 'flop', action: 'check' },
              { pos: 'BTN', street: 'flop', action: 'check' },
              { pos: 'BB', street: 'turn', action: 'check' },
              { pos: 'BTN', street: 'turn', action: 'check' },
              { pos: 'BB', street: 'river', action: 'check' },
              { pos: 'BTN', street: 'river', action: 'bet', amountBB: 8 }
            ], true)
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Antonio Galiana', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Johan Guilbert', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Ac', 'Kc', '5c'] },
        { kind: 'action', street: 'flop', player: 'Johan Guilbert', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'flop', player: 'Antonio Galiana', pos: 'BTN', type: 'check' },
        { kind: 'street', street: 'turn', board: ['Ac', 'Kc', '5c', 'Jc'] },
        { kind: 'action', street: 'turn', player: 'Johan Guilbert', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'turn', player: 'Antonio Galiana', pos: 'BTN', type: 'check' },
        { kind: 'street', street: 'river', board: ['Ac', 'Kc', '5c', 'Jc', '2c'] },
        { kind: 'action', street: 'river', player: 'Johan Guilbert', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'river', player: 'Antonio Galiana', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'river', player: 'Johan Guilbert', pos: 'BB', type: 'fold' }
      ]
    },
    {
      id: 'LH-2021-WSOP-CLOSER-HU-COMEBACK',
      titleBlind: 'WSOP The Closer · Heads-up',
      title: 'Leo Margets remonta contra Alex Kulev',
      year: 2021,
      date: '2021-11-21',
      event: { name: 'WSOP Event #83 $1,500 The Closer', series: 'WSOP', stage: 'Heads-up' },
      regionPrimary: 'ES',
      tags: ['heads-up', 'comeback', 'wsop-bracelet'],
      visual: { theme: 'wsop', tableVariant: 'heads-up' },
      media: {
        videoUrl: 'https://www.pokernews.com/news/2021/11/leo-margets-wsop-bracelet-win-40313.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Leo Margets remonta desde menos de 10 big blinds en heads-up. Con middle pair y flush draw mejora a trips en turn contra top pair de Kulev y se lleva su primer brazalete.',
        highlights: ['Comeback desde <10bb', 'Trips en turn', 'Primer brazalete en evento abierto']
      },
      cast: [
        { playerId: 'leo-margets', displayName: 'Leo Margets', country: 'ES', countryLabel: 'España', pos: 'BTN', cards: ['Qh', 'Jd'], role: 'hero' },
        { playerId: 'alex-kulev', displayName: 'Alex Kulev', country: 'BA', countryLabel: 'Bosnia', pos: 'BB', cards: ['Ah', 'Qd'], role: 'villain' }
      ],
      heroCandidates: ['leo-margets', 'alex-kulev'],
      play: {
        type: 'RFI',
        seed: 88004,
        blindsLabel: '15.000/30.000',
        stacks: { BTN: 8, BB: 52 },
        board: ['Qs', '8h', '4h', 'Qc', '2d'],
        roles: {
          'leo-margets': {
            heroPos: 'BTN', villainPos: 'BB', stackBB: 8,
            heroCards: ['Qh', 'Jd'], villainCards: ['Ah', 'Qd'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'check' }
            ], true)
          },
          'alex-kulev': {
            heroPos: 'BB', villainPos: 'BTN', stackBB: 52,
            heroCards: ['Ah', 'Qd'], villainCards: ['Qh', 'Jd'],
            forceScript: expandPreflop('BB', 'BTN', [
              { pos: 'BTN', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'call' },
              { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
              { pos: 'BB', street: 'flop', action: 'call' },
              { pos: 'BB', street: 'turn', action: 'check' },
              { pos: 'BTN', street: 'turn', action: 'check' },
              { pos: 'BB', street: 'river', action: 'check' },
              { pos: 'BTN', street: 'river', action: 'check' }
            ], true)
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Leo Margets', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Alex Kulev', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Qs', '8h', '4h'] },
        { kind: 'action', street: 'flop', player: 'Leo Margets', pos: 'BTN', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Alex Kulev', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Qs', '8h', '4h', 'Qc'] },
        { kind: 'action', street: 'turn', player: 'Alex Kulev', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'turn', player: 'Leo Margets', pos: 'BTN', type: 'check' },
        { kind: 'show', street: 'river', player: 'Leo Margets', pos: 'BTN', cards: ['Qh', 'Jd'] },
        { kind: 'show', street: 'river', player: 'Alex Kulev', pos: 'BB', cards: ['Ah', 'Qd'] }
      ]
    },
    {
      id: 'LH-2024-EPT-BCN-NADAL-FH',
      titleBlind: 'EPT Barcelona Estrellas · Día 3',
      title: 'Nadal elimina con full house',
      year: 2024,
      date: '2024-09-01',
      event: { name: 'EPT Barcelona Estrellas ME', series: 'EPT', stage: 'Day 3' },
      regionPrimary: 'MX',
      tags: ['full-house', 'bluff-catch', 'ept'],
      visual: { theme: 'ept', tableVariant: 'feature' },
      media: {
        videoUrl: 'https://www.pokernews.com/tours/ept/2024-pokerstars-ept-barcelona/1-100-estrellas-poker-tour-main-event/chips.683751.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Santiago Nadal acumula fichas cuando Luis Rayón Pérez bluffea con solo king-high y Nadal tiene full house.',
        highlights: ['Chip lead del Estrellas ME', 'Bluff catch con full house', 'México en EPT Barcelona']
      },
      cast: [
        { playerId: 'santiago-nadal', displayName: 'Santiago Nadal', country: 'MX', countryLabel: 'México', pos: 'CO', cards: ['Kh', 'Kd'], role: 'hero' },
        { playerId: 'luis-rayon', displayName: 'Luis Rayón Pérez', country: 'MX', countryLabel: 'México', pos: 'BTN', cards: ['Kc', '5s'], role: 'villain' }
      ],
      heroCandidates: ['santiago-nadal', 'luis-rayon'],
      play: {
        type: 'RFI',
        seed: 88005,
        blindsLabel: '50.000/100.000',
        stacks: { UTG: 72, HJ: 80, CO: 88, BTN: 76, SB: 65, BB: 70 },
        board: ['Ks', 'Kc', '5h', '5d', '2s'],
        roles: {
          'santiago-nadal': {
            heroPos: 'CO', villainPos: 'BTN', stackBB: 88,
            heroCards: ['Kh', 'Kd'], villainCards: ['Kc', '5s'],
            forceScript: scriptHU('CO', 'BTN', 'raise', [
              { street: 'flop', action: 'check' },
              { street: 'turn', action: 'bet', amountBB: 4 },
              { street: 'river', action: 'bet', amountBB: 10 }
            ])
          },
          'luis-rayon': {
            heroPos: 'BTN', villainPos: 'CO', stackBB: 76,
            heroCards: ['Kc', '5s'], villainCards: ['Kh', 'Kd'],
            forceScript: expandPreflop('BTN', 'CO', [
              { pos: 'CO', street: 'preflop', action: 'raise' },
              { pos: 'BTN', street: 'preflop', action: 'call' },
              { pos: 'CO', street: 'flop', action: 'check' },
              { pos: 'BTN', street: 'flop', action: 'check' },
              { pos: 'CO', street: 'turn', action: 'bet', amountBB: 4 },
              { pos: 'BTN', street: 'turn', action: 'call' },
              { pos: 'CO', street: 'river', action: 'bet', amountBB: 10 },
              { pos: 'BTN', street: 'river', action: 'raise' }
            ])
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Santiago Nadal', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Luis Rayón Pérez', pos: 'BTN', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Ks', 'Kc', '5h'] },
        { kind: 'action', street: 'flop', player: 'Santiago Nadal', pos: 'CO', type: 'check' },
        { kind: 'action', street: 'flop', player: 'Luis Rayón Pérez', pos: 'BTN', type: 'check' },
        { kind: 'street', street: 'turn', board: ['Ks', 'Kc', '5h', '5d'] },
        { kind: 'action', street: 'turn', player: 'Santiago Nadal', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'turn', player: 'Luis Rayón Pérez', pos: 'BTN', type: 'call' },
        { kind: 'street', street: 'river', board: ['Ks', 'Kc', '5h', '5d', '2s'] },
        { kind: 'action', street: 'river', player: 'Santiago Nadal', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'river', player: 'Luis Rayón Pérez', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'river', player: 'Santiago Nadal', pos: 'CO', type: 'call' }
      ]
    },
    {
      id: 'LH-2022-WSOP-ME-SALAS-A8',
      titleBlind: 'WSOP Main Event · Día 6',
      title: 'Salas cae con A8 vs AK',
      year: 2022,
      date: '2022-07-13',
      event: { name: 'WSOP Main Event', series: 'WSOP', stage: 'Day 6' },
      regionPrimary: 'AR',
      tags: ['wsop-me', 'all-in'],
      visual: { theme: 'wsop', tableVariant: 'feature' },
      media: {
        videoUrl: 'https://www.pokernews.com/tours/wsop/2022-wsop/main-event/chips.515962.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Damian Salas, campeón del ME 2020, cae en 27º lugar cuando A8 no mejora contra AK de Aaron Mermelstein.',
        highlights: ['Deep run ME 2022', 'All-in preflop', 'Campeón anterior eliminado']
      },
      cast: [
        { playerId: 'damian-salas', displayName: 'Damian Salas', country: 'AR', countryLabel: 'Argentina', pos: 'CO', cards: ['Ad', '8d'], role: 'hero' },
        { playerId: 'aaron-mermelstein', displayName: 'Aaron Mermelstein', country: 'US', countryLabel: 'Estados Unidos', pos: 'BB', cards: ['Ah', 'Kd'], role: 'villain' }
      ],
      heroCandidates: ['damian-salas', 'aaron-mermelstein'],
      play: {
        type: 'RFI',
        seed: 88006,
        blindsLabel: '125.000/250.000',
        stacks: { UTG: 32, HJ: 38, CO: 35, BTN: 42, SB: 30, BB: 41 },
        board: ['2c', '7h', 'Qs', '4d', '9s'],
        roles: {
          'damian-salas': {
            heroPos: 'CO', villainPos: 'BB', stackBB: 35,
            heroCards: ['Ad', '8d'], villainCards: ['Ah', 'Kd'],
            forceScript: expandPreflop('CO', 'BB', [
              { pos: 'CO', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'CO', street: 'preflop', action: 'call' }
            ])
          },
          'aaron-mermelstein': {
            heroPos: 'BB', villainPos: 'CO', stackBB: 41,
            heroCards: ['Ah', 'Kd'], villainCards: ['Ad', '8d'],
            forceScript: expandPreflop('BB', 'CO', [
              { pos: 'CO', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'raise' },
              { pos: 'CO', street: 'preflop', action: 'call' }
            ])
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Damian Salas', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Aaron Mermelstein', pos: 'BB', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Damian Salas', pos: 'CO', type: 'call' },
        { kind: 'street', street: 'flop', board: ['2c', '7h', 'Qs'] },
        { kind: 'street', street: 'turn', board: ['2c', '7h', 'Qs', '4d'] },
        { kind: 'street', street: 'river', board: ['2c', '7h', 'Qs', '4d', '9s'] },
        { kind: 'show', street: 'river', player: 'Aaron Mermelstein', pos: 'BB', cards: ['Ah', 'Kd'] },
        { kind: 'show', street: 'river', player: 'Damian Salas', pos: 'CO', cards: ['Ad', '8d'] }
      ]
    },
    {
      id: 'LH-2020-WSOP-ME-SALAS-HU-BOTTEON',
      titleBlind: 'WSOP ME Internacional · Heads-up',
      title: 'Salas gana la mesa final internacional',
      year: 2020,
      date: '2020-12-30',
      event: { name: 'WSOP Main Event (International)', series: 'WSOP', stage: 'Heads-up' },
      regionPrimary: 'AR',
      featured: true,
      tags: ['wsop-me', 'heads-up', 'championship'],
      visual: { theme: 'wsop', tableVariant: 'heads-up' },
      media: {
        videoUrl: 'https://en.wikipedia.org/wiki/Damian_Salas',
        videoLabel: 'Ver contexto (Wikipedia)'
      },
      story: {
        es: 'Damian Salas gana la mesa final internacional del ME 2020 con K8 haciendo two pair en river contra Brunno Botteon.',
        highlights: ['Título internacional ME', 'Two pair en river', 'Primer argentino campeón']
      },
      cast: [
        { playerId: 'damian-salas', displayName: 'Damian Salas', country: 'AR', countryLabel: 'Argentina', pos: 'BTN', cards: ['Kd', '8h'], role: 'hero' },
        { playerId: 'brunno-botteon', displayName: 'Brunno Botteon', country: 'BR', countryLabel: 'Brasil', pos: 'BB', cards: ['Ah', 'Jc'], role: 'villain' }
      ],
      heroCandidates: ['damian-salas', 'brunno-botteon'],
      play: {
        type: 'RFI',
        seed: 88007,
        blindsLabel: '200.000/400.000',
        stacks: { BTN: 45, BB: 38 },
        board: ['Kh', '3s', '8c', '2d', 'Jh'],
        roles: {
          'damian-salas': {
            heroPos: 'BTN', villainPos: 'BB', stackBB: 45,
            heroCards: ['Kd', '8h'], villainCards: ['Ah', 'Jc'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'check' }
            ], true)
          },
          'brunno-botteon': {
            heroPos: 'BB', villainPos: 'BTN', stackBB: 38,
            heroCards: ['Ah', 'Jc'], villainCards: ['Kd', '8h'],
            forceScript: expandPreflop('BB', 'BTN', [
              { pos: 'BTN', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'call' },
              { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
              { pos: 'BB', street: 'flop', action: 'call' },
              { pos: 'BB', street: 'turn', action: 'check' },
              { pos: 'BTN', street: 'turn', action: 'check' },
              { pos: 'BB', street: 'river', action: 'check' },
              { pos: 'BTN', street: 'river', action: 'check' }
            ], true)
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Damian Salas', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Brunno Botteon', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Kh', '3s', '8c'] },
        { kind: 'action', street: 'flop', player: 'Damian Salas', pos: 'BTN', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Brunno Botteon', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Kh', '3s', '8c', '2d'] },
        { kind: 'action', street: 'turn', player: 'Brunno Botteon', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'turn', player: 'Damian Salas', pos: 'BTN', type: 'check' },
        { kind: 'show', street: 'river', player: 'Damian Salas', pos: 'BTN', cards: ['Kd', '8h'] },
        { kind: 'show', street: 'river', player: 'Brunno Botteon', pos: 'BB', cards: ['Ah', 'Jc'] }
      ]
    },
    {
      id: 'LH-2024-SCOOP-TITANS-BLUFF-River',
      titleBlind: 'SCOOP Titans PKO · Heads-up',
      title: 'Mateos bluffea en SCOOP Titans PKO',
      year: 2024,
      date: '2024-04-22',
      event: { name: 'SCOOP $5,200 Titans PKO', series: 'SCOOP', stage: 'Heads-up' },
      regionPrimary: 'ES',
      tags: ['bluff', 'river-shove', 'scoopp'],
      visual: { theme: 'scoopp', tableVariant: 'heads-up' },
      media: {
        videoUrl: 'https://www.poker.org/latest-news/adrian-mateos-wins-5200-scoop-titans-pko-after-huge-bluff-heads-up-aILYM7u7r97C/',
        videoLabel: 'Ver recap (Poker.org)'
      },
      story: {
        es: 'En heads-up del SCOOP Titans PKO, Mateos shovea el river en un board que completa flush draws; heyalisson foldea.',
        highlights: ['Overbet shove river', 'SCOOP Titans PKO', 'Remontada en HU']
      },
      cast: [
        { playerId: 'adrian-mateos', displayName: 'Adrián Mateos', country: 'ES', countryLabel: 'España', pos: 'BTN', cards: ['Td', '9d'], role: 'hero' },
        { playerId: 'heyalisson', displayName: 'Alisson Piekazewic', country: 'BR', countryLabel: 'Brasil', pos: 'BB', cards: ['Ah', '7h'], role: 'villain' }
      ],
      heroCandidates: ['adrian-mateos', 'heyalisson'],
      play: {
        type: 'RFI',
        seed: 88008,
        blindsLabel: '12.500/25.000',
        stacks: { BTN: 22, BB: 31 },
        board: ['Jc', '6c', '2c', '4d', '8c'],
        roles: {
          'adrian-mateos': {
            heroPos: 'BTN', villainPos: 'BB', stackBB: 22,
            heroCards: ['Td', '9d'], villainCards: ['Ah', '7h'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'check' },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'bet', amountBB: 15 }
            ], true)
          },
          'heyalisson': {
            heroPos: 'BB', villainPos: 'BTN', stackBB: 31,
            heroCards: ['Ah', '7h'], villainCards: ['Td', '9d'],
            forceScript: expandPreflop('BB', 'BTN', [
              { pos: 'BTN', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'call' },
              { pos: 'BB', street: 'flop', action: 'bet', amountBB: 2 },
              { pos: 'BTN', street: 'flop', action: 'call' },
              { pos: 'BB', street: 'turn', action: 'check' },
              { pos: 'BTN', street: 'turn', action: 'check' },
              { pos: 'BB', street: 'river', action: 'check' },
              { pos: 'BTN', street: 'river', action: 'bet', amountBB: 15 }
            ], true)
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Alisson Piekazewic', pos: 'BB', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'BTN', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Jc', '6c', '2c'] },
        { kind: 'action', street: 'flop', player: 'Alisson Piekazewic', pos: 'BB', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Adrián Mateos', pos: 'BTN', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Jc', '6c', '2c', '4d'] },
        { kind: 'action', street: 'turn', player: 'Alisson Piekazewic', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'turn', player: 'Adrián Mateos', pos: 'BTN', type: 'check' },
        { kind: 'street', street: 'river', board: ['Jc', '6c', '2c', '4d', '8c'] },
        { kind: 'action', street: 'river', player: 'Alisson Piekazewic', pos: 'BB', type: 'check' },
        { kind: 'action', street: 'river', player: 'Adrián Mateos', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'river', player: 'Alisson Piekazewic', pos: 'BB', type: 'fold' }
      ]
    },
    {
      id: 'LH-2022-EPT-MC-100K-CALL-J8',
      titleBlind: 'EPT Monte Carlo · €100K HR',
      title: 'Mateos paga tres barrels con J8',
      year: 2022,
      date: '2022-03-27',
      event: { name: 'EPT Monte Carlo €100,000 HR', series: 'EPT', stage: 'Final table' },
      regionPrimary: 'ES',
      tags: ['call-down', 'bluff-catch', 'ept'],
      visual: { theme: 'ept', tableVariant: 'final-table' },
      media: {
        videoUrl: 'https://www.pokerlistings.com/news/adrian-mateos-catches-bluffs-wins-ept-monte-carlo-100k',
        videoLabel: 'Ver recap (PokerListings)'
      },
      story: {
        es: 'Mateos paga tres barrels con J8 en board J-T-7-Q-4 contra Mikita Badziakouski y gana un bote enorme camino al título.',
        highlights: ['Triple call-down', 'Bluff catch J-high', 'EPT Monte Carlo €100k']
      },
      cast: [
        { playerId: 'adrian-mateos', displayName: 'Adrián Mateos', country: 'ES', countryLabel: 'España', pos: 'BB', cards: ['Jd', '8h'], role: 'hero' },
        { playerId: 'mikita-badziakouski', displayName: 'Mikita Badziakouski', country: 'BY', countryLabel: 'Bielorrusia', pos: 'BTN', cards: ['Ad', '6s'], role: 'villain' }
      ],
      heroCandidates: ['adrian-mateos', 'mikita-badziakouski'],
      play: {
        type: 'vsRFI',
        seed: 88009,
        key: 'BB_vs_BTN',
        blindsLabel: '50.000/100.000',
        stacks: { UTG: 58, HJ: 62, CO: 70, BTN: 58, SB: 52, BB: 64 },
        board: ['Jh', 'Ts', '7d', 'Qc', '4h'],
        roles: {
          'adrian-mateos': {
            heroPos: 'BB', villainPos: 'BTN', stackBB: 64,
            heroCards: ['Jd', '8h'], villainCards: ['Ad', '6s'],
            forceScript: scriptHU('BB', 'BTN', 'call', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'bet', amountBB: 6 },
              { street: 'river', action: 'bet', amountBB: 12 }
            ])
          },
          'mikita-badziakouski': {
            heroPos: 'BTN', villainPos: 'BB', stackBB: 58,
            heroCards: ['Ad', '6s'], villainCards: ['Jd', '8h'],
            forceScript: expandPreflop('BTN', 'BB', [
              { pos: 'BTN', street: 'preflop', action: 'raise' },
              { pos: 'BB', street: 'preflop', action: 'call' },
              { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
              { pos: 'BB', street: 'flop', action: 'call' },
              { pos: 'BTN', street: 'turn', action: 'bet', amountBB: 6 },
              { pos: 'BB', street: 'turn', action: 'call' },
              { pos: 'BTN', street: 'river', action: 'bet', amountBB: 12 },
              { pos: 'BB', street: 'river', action: 'call' }
            ])
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Mikita Badziakouski', pos: 'BTN', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Jh', 'Ts', '7d'] },
        { kind: 'action', street: 'flop', player: 'Mikita Badziakouski', pos: 'BTN', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Adrián Mateos', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Jh', 'Ts', '7d', 'Qc'] },
        { kind: 'action', street: 'turn', player: 'Mikita Badziakouski', pos: 'BTN', type: 'bet' },
        { kind: 'action', street: 'turn', player: 'Adrián Mateos', pos: 'BB', type: 'call' },
        { kind: 'street', street: 'river', board: ['Jh', 'Ts', '7d', 'Qc', '4h'] },
        { kind: 'action', street: 'river', player: 'Mikita Badziakouski', pos: 'BTN', type: 'bet' },
        { kind: 'action', street: 'river', player: 'Adrián Mateos', pos: 'BB', type: 'call' },
        { kind: 'show', street: 'river', player: 'Adrián Mateos', pos: 'BB', cards: ['Jd', '8h'] },
        { kind: 'show', street: 'river', player: 'Mikita Badziakouski', pos: 'BTN', cards: ['Ad', '6s'] }
      ]
    },
    {
      id: 'LH-2024-WSOP-BERRY-AA',
      titleBlind: 'WSOP Main Event · Día 5 · Otro asiento',
      title: 'Will Berry value-betea contra KK',
      year: 2024,
      date: '2024-07-14',
      event: { name: 'WSOP Main Event', series: 'WSOP', stage: 'Day 5' },
      regionPrimary: 'US',
      tags: ['4bet-pot', 'value-bet', 'wsop-me'],
      visual: { theme: 'wsop', tableVariant: 'feature' },
      media: {
        videoUrl: 'https://www.pokernews.com/news/2024/07/mateos-kings-fold-wsop-main-event-46510.htm',
        videoLabel: 'Ver recap (PokerNews)'
      },
      story: {
        es: 'Misma mano que el fold legendario de Mateos, pero jugando como Will Berry (AA): value en flop y turn hasta que el rival foldea KK en el T.',
        highlights: ['Perspectiva del agresor', 'Value betting con AA', 'Fold heroico del rival']
      },
      cast: [
        { playerId: 'will-berry', displayName: 'Will Berry', country: 'US', countryLabel: 'Estados Unidos', pos: 'CO', cards: ['As', 'Ac'], role: 'hero' },
        { playerId: 'adrian-mateos', displayName: 'Adrián Mateos', country: 'ES', countryLabel: 'España', pos: 'HJ', cards: ['Ks', 'Kh'], role: 'villain' }
      ],
      heroCandidates: ['will-berry', 'adrian-mateos'],
      play: {
        type: 'vsRFI',
        seed: 88010,
        blindsLabel: '100.000/200.000',
        stacks: STACKS_ME_DAY5,
        board: ['Qd', '4d', '2c', 'Ts'],
        roles: {
          'will-berry': {
            heroPos: 'CO', villainPos: 'HJ', stackBB: 61,
            heroCards: ['As', 'Ac'], villainCards: ['Ks', 'Kh'],
            forceScript: fourBetScriptAggressor('CO', 'HJ')
          },
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'CO', stackBB: 54,
            heroCards: ['Ks', 'Kh'], villainCards: ['As', 'Ac'],
            forceScript: fourBetScript('HJ', 'CO', 'folder')
          }
        }
      },
      timeline: [
        { kind: 'street', street: 'preflop', board: [] },
        { kind: 'action', street: 'preflop', player: 'Will Berry', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Will Berry', pos: 'CO', type: 'raise' },
        { kind: 'action', street: 'preflop', player: 'Adrián Mateos', pos: 'HJ', type: 'call' },
        { kind: 'street', street: 'flop', board: ['Qd', '4d', '2c'] },
        { kind: 'action', street: 'flop', player: 'Will Berry', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'flop', player: 'Adrián Mateos', pos: 'HJ', type: 'call' },
        { kind: 'street', street: 'turn', board: ['Qd', '4d', '2c', 'Ts'] },
        { kind: 'action', street: 'turn', player: 'Will Berry', pos: 'CO', type: 'bet' },
        { kind: 'action', street: 'turn', player: 'Adrián Mateos', pos: 'HJ', type: 'fold' }
      ]
    }
  ];

  global.PTLegendaryCatalog = {
    list: function () { return HANDS.slice(); },
    get: function (id) {
      for (var i = 0; i < HANDS.length; i++) {
        if (HANDS[i].id === id) return HANDS[i];
      }
      return null;
    },
    random: function () {
      return HANDS[Math.floor(Math.random() * HANDS.length)];
    }
  };
})(typeof window !== 'undefined' ? window : global);
