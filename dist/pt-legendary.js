/* PokerForgeAI bundle: pt-legendary.js — do not edit */
/*
 * legendary-hands-catalog.js — Definiciones jugables de manos legendarias (Fase 1–2).
 */
(function (global) {
  'use strict';

  function scriptHU(heroPos, villainPos, heroPreflop, villainBarrels) {
    var actions = [{ pos: heroPos, street: 'preflop', action: heroPreflop }];
    if (heroPreflop === 'raise') {
      ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].forEach(function (pos) {
        if (pos === heroPos) return;
        if (pos === villainPos) actions.push({ pos: pos, street: 'preflop', action: 'call' });
        else actions.push({ pos: pos, street: 'preflop', action: 'fold' });
      });
    } else if (heroPreflop === 'call') {
      actions.unshift({ pos: villainPos, street: 'preflop', action: 'raise' });
      ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].forEach(function (pos) {
        if (pos === heroPos || pos === villainPos) return;
        actions.push({ pos: pos, street: 'preflop', action: 'fold' });
      });
    }
    (villainBarrels || []).forEach(function (row) {
      actions.push({
        pos: villainPos,
        street: row.street,
        action: row.action,
        amountBB: row.amountBB != null ? row.amountBB : null
      });
    });
    return { heroPos: heroPos, villainPos: villainPos, actions: actions };
  }

  function fourBetScript(heroPos, villainPos, heroRole) {
    var v = villainPos;
    var h = heroPos;
    var actions = [
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
    return { heroPos: h, villainPos: v, actions: actions };
  }

  function fourBetScriptAggressor(heroPos, villainPos) {
    var h = heroPos;
    var v = villainPos;
    return {
      heroPos: h,
      villainPos: v,
      actions: [
        { pos: h, street: 'preflop', action: 'raise' },
        { pos: v, street: 'preflop', action: 'raise' },
        { pos: h, street: 'preflop', action: 'raise' },
        { pos: v, street: 'preflop', action: 'call' },
        { pos: h, street: 'flop', action: 'bet', amountBB: 2.5 },
        { pos: v, street: 'flop', action: 'call' },
        { pos: h, street: 'turn', action: 'bet', amountBB: 6 },
        { pos: v, street: 'turn', action: 'fold' }
      ]
    };
  }

  var HANDS = [
    {
      id: 'LH-2024-WSOP-ME-MATEOS-FOLD-KK',
      titleBlind: 'Fold imposible en bote 4-bet',
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
        type: 'face3bet',
        seed: 88001,
        board: ['Qd', '4d', '2c', 'Ts'],
        roles: {
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'CO',
            heroCards: ['Ks', 'Kh'], villainCards: ['As', 'Ac'],
            forceScript: fourBetScript('HJ', 'CO', 'folder')
          },
          'will-berry': {
            heroPos: 'CO', villainPos: 'HJ',
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
      titleBlind: 'Aces cracked con runner-runner',
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
        type: 'face3bet',
        seed: 88002,
        board: ['Ts', '9h', '8d', '9s', '3s'],
        roles: {
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'BB',
            heroCards: ['Ah', 'Ac'], villainCards: ['As', 'Ks'],
            forceScript: {
              heroPos: 'HJ', villainPos: 'BB',
              actions: [
                { pos: 'HJ', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'HJ', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'HJ', street: 'preflop', action: 'call' }
              ]
            }
          },
          'adrian-garcia': {
            heroPos: 'BB', villainPos: 'HJ',
            heroCards: ['As', 'Ks'], villainCards: ['Ah', 'Ac'],
            forceScript: {
              heroPos: 'BB', villainPos: 'HJ',
              actions: [
                { pos: 'HJ', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'HJ', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'HJ', street: 'preflop', action: 'call' }
              ]
            }
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
      titleBlind: '5-bet bluff con 7-high en river',
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
        board: ['Ac', 'Kc', '5c', 'Jc', '2c'],
        roles: {
          'antonio-galiana': {
            heroPos: 'BTN', villainPos: 'BB',
            heroCards: ['7h', '2d'], villainCards: ['Qc', '4s'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'check' },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'bet', amountBB: 8 }
            ])
          },
          'johan-guilbert': {
            heroPos: 'BB', villainPos: 'BTN',
            heroCards: ['Qc', '4s'], villainCards: ['7h', '2d'],
            forceScript: {
              heroPos: 'BB', villainPos: 'BTN',
              actions: [
                { pos: 'BTN', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'call' },
                { pos: 'BB', street: 'flop', action: 'check' },
                { pos: 'BTN', street: 'flop', action: 'check' },
                { pos: 'BB', street: 'turn', action: 'check' },
                { pos: 'BTN', street: 'turn', action: 'check' },
                { pos: 'BB', street: 'river', action: 'check' },
                { pos: 'BTN', street: 'river', action: 'bet', amountBB: 8 }
              ]
            }
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
      titleBlind: 'Remontada heads-up para el brazalete',
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
        board: ['Qs', '8h', '4h', 'Qc', '2d'],
        roles: {
          'leo-margets': {
            heroPos: 'BTN', villainPos: 'BB',
            heroCards: ['Qh', 'Jd'], villainCards: ['Ah', 'Qd'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'check' }
            ])
          },
          'alex-kulev': {
            heroPos: 'BB', villainPos: 'BTN',
            heroCards: ['Ah', 'Qd'], villainCards: ['Qh', 'Jd'],
            forceScript: {
              heroPos: 'BB', villainPos: 'BTN',
              actions: [
                { pos: 'BTN', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'call' },
                { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
                { pos: 'BB', street: 'flop', action: 'call' },
                { pos: 'BB', street: 'turn', action: 'check' },
                { pos: 'BTN', street: 'turn', action: 'check' },
                { pos: 'BB', street: 'river', action: 'check' },
                { pos: 'BTN', street: 'river', action: 'check' }
              ]
            }
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
      titleBlind: 'Full house vs bluff con K-high',
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
        board: ['Ks', 'Kc', '5h', '5d', '2s'],
        roles: {
          'santiago-nadal': {
            heroPos: 'CO', villainPos: 'BTN',
            heroCards: ['Kh', 'Kd'], villainCards: ['Kc', '5s'],
            forceScript: scriptHU('CO', 'BTN', 'raise', [
              { street: 'flop', action: 'check' },
              { street: 'turn', action: 'bet', amountBB: 4 },
              { street: 'river', action: 'bet', amountBB: 10 }
            ])
          },
          'luis-rayon': {
            heroPos: 'BTN', villainPos: 'CO',
            heroCards: ['Kc', '5s'], villainCards: ['Kh', 'Kd'],
            forceScript: {
              heroPos: 'BTN', villainPos: 'CO',
              actions: [
                { pos: 'CO', street: 'preflop', action: 'raise' },
                { pos: 'BTN', street: 'preflop', action: 'call' },
                { pos: 'CO', street: 'flop', action: 'check' },
                { pos: 'BTN', street: 'flop', action: 'check' },
                { pos: 'CO', street: 'turn', action: 'bet', amountBB: 4 },
                { pos: 'BTN', street: 'turn', action: 'call' },
                { pos: 'CO', street: 'river', action: 'bet', amountBB: 10 },
                { pos: 'BTN', street: 'river', action: 'raise' }
              ]
            }
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
      titleBlind: 'Eliminación del campeón 2020',
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
        board: ['2c', '7h', 'Qs', '4d', '9s'],
        roles: {
          'damian-salas': {
            heroPos: 'CO', villainPos: 'BB',
            heroCards: ['Ad', '8d'], villainCards: ['Ah', 'Kd'],
            forceScript: {
              heroPos: 'CO', villainPos: 'BB',
              actions: [
                { pos: 'CO', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'CO', street: 'preflop', action: 'call' }
              ]
            }
          },
          'aaron-mermelstein': {
            heroPos: 'BB', villainPos: 'CO',
            heroCards: ['Ah', 'Kd'], villainCards: ['Ad', '8d'],
            forceScript: {
              heroPos: 'BB', villainPos: 'CO',
              actions: [
                { pos: 'CO', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'raise' },
                { pos: 'CO', street: 'preflop', action: 'call' }
              ]
            }
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
      titleBlind: 'Two pair en river para el título',
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
        board: ['Kh', '3s', '8c', '2d', 'Jh'],
        roles: {
          'damian-salas': {
            heroPos: 'BTN', villainPos: 'BB',
            heroCards: ['Kd', '8h'], villainCards: ['Ah', 'Jc'],
            forceScript: scriptHU('BTN', 'BB', 'raise', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'check' }
            ])
          },
          'brunno-botteon': {
            heroPos: 'BB', villainPos: 'BTN',
            heroCards: ['Ah', 'Jc'], villainCards: ['Kd', '8h'],
            forceScript: {
              heroPos: 'BB', villainPos: 'BTN',
              actions: [
                { pos: 'BTN', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'call' },
                { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
                { pos: 'BB', street: 'flop', action: 'call' },
                { pos: 'BB', street: 'turn', action: 'check' },
                { pos: 'BTN', street: 'turn', action: 'check' },
                { pos: 'BB', street: 'river', action: 'check' },
                { pos: 'BTN', street: 'river', action: 'check' }
              ]
            }
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
      titleBlind: 'Shove river en board de tréboles',
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
        board: ['Jc', '6c', '2c', '4d', '8c'],
        roles: {
          'adrian-mateos': {
            heroPos: 'BTN', villainPos: 'BB',
            heroCards: ['Td', '9d'], villainCards: ['Ah', '7h'],
            forceScript: scriptHU('BTN', 'BB', 'call', [
              { street: 'flop', action: 'bet', amountBB: 2 },
              { street: 'turn', action: 'check' },
              { street: 'river', action: 'bet', amountBB: 15 }
            ])
          },
          'heyalisson': {
            heroPos: 'BB', villainPos: 'BTN',
            heroCards: ['Ah', '7h'], villainCards: ['Td', '9d'],
            forceScript: {
              heroPos: 'BB', villainPos: 'BTN',
              actions: [
                { pos: 'BTN', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'call' },
                { pos: 'BB', street: 'flop', action: 'bet', amountBB: 2 },
                { pos: 'BTN', street: 'flop', action: 'call' },
                { pos: 'BB', street: 'turn', action: 'check' },
                { pos: 'BTN', street: 'turn', action: 'check' },
                { pos: 'BB', street: 'river', action: 'check' },
                { pos: 'BTN', street: 'river', action: 'bet', amountBB: 15 }
              ]
            }
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
      titleBlind: 'Call-down triple barrel con J-high',
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
        board: ['Jh', 'Ts', '7d', 'Qc', '4h'],
        roles: {
          'adrian-mateos': {
            heroPos: 'BB', villainPos: 'BTN',
            heroCards: ['Jd', '8h'], villainCards: ['Ad', '6s'],
            forceScript: scriptHU('BB', 'BTN', 'call', [
              { street: 'flop', action: 'bet', amountBB: 2.5 },
              { street: 'turn', action: 'bet', amountBB: 6 },
              { street: 'river', action: 'bet', amountBB: 12 }
            ])
          },
          'mikita-badziakouski': {
            heroPos: 'BTN', villainPos: 'BB',
            heroCards: ['Ad', '6s'], villainCards: ['Jd', '8h'],
            forceScript: {
              heroPos: 'BTN', villainPos: 'BB',
              actions: [
                { pos: 'BTN', street: 'preflop', action: 'raise' },
                { pos: 'BB', street: 'preflop', action: 'call' },
                { pos: 'BTN', street: 'flop', action: 'bet', amountBB: 2.5 },
                { pos: 'BB', street: 'flop', action: 'call' },
                { pos: 'BTN', street: 'turn', action: 'bet', amountBB: 6 },
                { pos: 'BB', street: 'turn', action: 'call' },
                { pos: 'BTN', street: 'river', action: 'bet', amountBB: 12 },
                { pos: 'BB', street: 'river', action: 'call' }
              ]
            }
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
      titleBlind: 'Perspectiva del villano con AA',
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
        type: 'face3bet',
        seed: 88010,
        board: ['Qd', '4d', '2c', 'Ts'],
        roles: {
          'will-berry': {
            heroPos: 'CO', villainPos: 'HJ',
            heroCards: ['As', 'Ac'], villainCards: ['Ks', 'Kh'],
            forceScript: fourBetScriptAggressor('CO', 'HJ')
          },
          'adrian-mateos': {
            heroPos: 'HJ', villainPos: 'CO',
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

/*
 * legendary-force.js — Convierte manos legendarias a force/playConfig del entrenador.
 */
(function (global) {
  'use strict';

  var LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function cloneScript(script) {
    if (!script) return null;
    return {
      heroPos: script.heroPos,
      villainPos: script.villainPos,
      actions: (script.actions || []).map(function (a) {
        return {
          street: a.street,
          pos: a.pos,
          action: a.action,
          amountBB: a.amountBB != null ? a.amountBB : null
        };
      })
    };
  }

  /** Mapa posición → Jugador A/B/C según cast (estable por handId+heroId). */
  function buildAnonymizeMap(handDef, heroId) {
    var cast = handDef.cast || [];
    var map = { byPos: {}, byPlayerId: {} };
    var idx = 0;
    cast.forEach(function (m) {
      if (!m.pos) return;
      var label = 'Jugador ' + LABELS[idx];
      idx++;
      map.byPos[m.pos] = label;
      map.byPlayerId[m.playerId] = label;
    });
    map.heroId = heroId;
    map.heroLabel = map.byPlayerId[heroId] || 'Tú';
    return map;
  }

  function castMember(handDef, playerId) {
    var cast = handDef.cast || [];
    for (var i = 0; i < cast.length; i++) {
      if (cast[i].playerId === playerId) return cast[i];
    }
    return null;
  }

  function preflopActions(script) {
    return (script && script.actions || []).filter(function (a) { return a.street === 'preflop'; });
  }

  function countPreflopRaises(actions, pos) {
    return actions.filter(function (a) {
      return a.pos === pos && a.action === 'raise';
    }).length;
  }

  /** Infiere type/key del motor a partir del guion preflop (face3bet/face4bet/vsRFI/RFI). */
  function inferLegendaryScenario(role, playType) {
    var heroPos = role.heroPos;
    var villainPos = role.villainPos;
    var pre = preflopActions(role.forceScript);

    if (!pre.length) {
      return { type: playType || 'RFI', heroPos: heroPos };
    }

    var first = pre[0];
    var heroRaises = countPreflopRaises(pre, heroPos);
    var villainRaises = countPreflopRaises(pre, villainPos);

    if (first.pos === heroPos && first.action === 'raise') {
      if (villainRaises === 0) {
        return { type: 'RFI', heroPos: heroPos };
      }
      if (heroRaises >= 2 && villainRaises >= 2) {
        return { type: 'face4bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (villainRaises >= 1) {
        return { type: 'face3bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
    }

    if (first.pos === villainPos && first.action === 'raise') {
      if (heroRaises >= 2 && villainRaises >= 1) {
        return { type: 'face4bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (heroRaises >= 1 && villainRaises === 1) {
        return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (heroRaises === 0 && pre.some(function (a) {
        return a.pos === heroPos && a.action === 'call';
      })) {
        return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
    }

    if ((playType === 'face3bet' || playType === 'face4bet') && heroPos && villainPos) {
      return {
        type: playType,
        heroPos: heroPos,
        key: heroPos + '_vs_' + villainPos
      };
    }
    return { type: playType || 'RFI', heroPos: heroPos };
  }

  function toForce(handDef, heroId) {
    if (!handDef || !handDef.play || !handDef.play.roles) return null;
    var role = handDef.play.roles[heroId];
    if (!role) return null;
    var play = handDef.play;
    var scenario = inferLegendaryScenario(role, play.type);
    var force = {
      type: scenario.type,
      heroPos: scenario.heroPos || role.heroPos,
      seed: play.seed || 88000,
      forceDeal: {
        heroCards: (role.heroCards || []).slice(),
        villainCards: (role.villainCards || []).slice(),
        board: (play.board || []).slice(),
        villainPos: role.villainPos
      },
      forceScript: cloneScript(role.forceScript)
    };
    if (scenario.key) force.key = scenario.key;
    else if (play.key) force.key = play.key;
    return force;
  }

  function playConfig(handDef, heroId, opts) {
    opts = opts || {};
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    var pc = {
      formatHub: 'mtt',
      gameType: 'mtt',
      stackDepth: 'bb100',
      villainLevel: 'pro',
      handRange: 'all',
      liveAdvisor: false,
      actionMode: 'quick',
      schoolMode: false,
      handsTarget: 0,
      allowMultiway: false,
      legendaryMode: true,
      legendaryHandId: handDef.id,
      legendaryHeroId: heroId,
      legendaryBlind: opts.blind !== false,
      legendaryTheme: theme,
      legendaryEventLabel: (handDef.event && handDef.event.name) || '',
      legendaryAnonymize: buildAnonymizeMap(handDef, heroId)
    };
    if (global.PTPlayConfig && global.PTPlayConfig.normalize) {
      pc = global.PTPlayConfig.normalize(pc);
      pc.legendaryMode = true;
      pc.legendaryHandId = handDef.id;
      pc.legendaryHeroId = heroId;
      pc.legendaryBlind = opts.blind !== false;
      pc.legendaryTheme = theme;
      pc.legendaryEventLabel = (handDef.event && handDef.event.name) || '';
      pc.legendaryAnonymize = buildAnonymizeMap(handDef, heroId);
      pc.liveAdvisor = false;
      pc.handsTarget = 0;
      pc.schoolMode = false;
    }
    return pc;
  }

  function actionWord(item) {
    if (!item) return '';
    var t = item.type;
    if (t === 'check') return 'check';
    if (t === 'fold') return 'fold';
    if (t === 'call') return 'call' + (item.amount != null ? ' ' + item.amount : '');
    if (t === 'raise' || t === 'bet') return (t === 'bet' ? 'bet' : 'raise') + (item.to != null ? ' to ' + item.to : '');
    return t;
  }

  global.PTLegendaryForce = {
    toForce: toForce,
    playConfig: playConfig,
    inferLegendaryScenario: inferLegendaryScenario,
    buildAnonymizeMap: buildAnonymizeMap,
    castMember: castMember,
    actionWord: actionWord
  };
})(typeof window !== 'undefined' ? window : global);

/*
 * legendary-hands.js — Manos legendarias: hub, juego ciego, historia, timeline, otro rol.
 * Pestaña propia en el menú principal (solo administradores, no demo).
 */
(function (global) {
  'use strict';

  var VIEW = { hub: 'hub', story: 'story', after: 'after', timeline: 'timeline', roles: 'roles' };

  var state = {
    view: VIEW.hub,
    handId: null,
    heroId: null,
    lastResult: null
  };

  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function Cards() { return global.Cards; }

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function hasAdminAccess() {
    if (isDemoActive()) return false;
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function legendaryMenuVisible() {
    return hasAdminAccess();
  }

  function refreshTabVisibility() {
    var tab = document.querySelector('.tab[data-tab="legendary"]');
    if (tab) tab.classList.toggle('hidden', !legendaryMenuVisible());
  }

  function Catalog() { return global.PTLegendaryCatalog; }
  function Force() { return global.PTLegendaryForce; }
  function Store() { return global.Store; }

  function defaultLegendaryStats() {
    return { played: {}, revealed: [], favorites: [], updatedAt: 0 };
  }

  function readLegendaryStats() {
    var st = Store && Store.getStats ? Store.getStats() : null;
    if (!st) return defaultLegendaryStats();
    if (!st.legendaryHands || typeof st.legendaryHands !== 'object') {
      st.legendaryHands = defaultLegendaryStats();
    }
    return st.legendaryHands;
  }

  function saveLegendaryProgress(handId, heroId) {
    if (!Store || !Store.getStats || !Store.saveStats) return;
    var st = Store.getStats();
    if (!st.legendaryHands) st.legendaryHands = defaultLegendaryStats();
    var lh = st.legendaryHands;
    var rec = lh.played[handId] || { count: 0, roles: [], lastAt: 0 };
    rec.count += 1;
    rec.lastAt = Date.now();
    if (rec.roles.indexOf(heroId) < 0) rec.roles.push(heroId);
    lh.played[handId] = rec;
    if (lh.revealed.indexOf(handId) < 0) lh.revealed.push(handId);
    lh.updatedAt = Date.now();
    Store.saveStats(st);
  }

  function playedCount() {
    var lh = readLegendaryStats();
    return Object.keys(lh.played || {}).length;
  }

  function rolePlayed(handId, heroId) {
    var rec = readLegendaryStats().played[handId];
    return rec && rec.roles && rec.roles.indexOf(heroId) >= 0;
  }

  function formatEvent(h) {
    var ev = h.event || {};
    var parts = [ev.name || ''];
    if (ev.stage) parts.push(ev.stage);
    if (h.year) parts.push(String(h.year));
    return parts.filter(Boolean).join(' · ');
  }

  function formatDate(h) {
    if (h.date) {
      try {
        return new Date(h.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) { return h.date; }
    }
    return h.year ? String(h.year) : '';
  }

  function castFlags(h) {
    var seen = {};
    var out = [];
    (h.cast || []).forEach(function (m) {
      if (seen[m.countryLabel]) return;
      seen[m.countryLabel] = true;
      out.push(m.countryLabel);
    });
    return out.join(' · ');
  }

  function cardHtml(cards) {
    if (!cards || !cards.length || !Cards()) return '';
    return cards.map(function (c) { return Cards().cardToHTML(c); }).join('');
  }

  function openVideo(handDef) {
    var url = handDef.media && handDef.media.videoUrl;
    if (!url) return;
    global.open(url, '_blank', 'noopener,noreferrer');
  }

  function ensureLegendaryScene() {
    var playActive = $('#play-active');
    if (!playActive) return null;
    var stage = playActive.querySelector('.play-stage');
    if (!stage) return null;
    var wrap = stage.querySelector('.legendary-scene-wrap');
    if (!wrap) {
      var tableWrap = stage.querySelector('.table-wrap');
      if (!tableWrap) return null;
      wrap = document.createElement('div');
      wrap.className = 'legendary-scene-wrap';
      tableWrap.parentNode.insertBefore(wrap, tableWrap);
      wrap.appendChild(tableWrap);
    }
    return wrap;
  }

  function applyLegendaryChrome(handDef) {
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    document.body.classList.add('legendary-play-active');
    var wrap = ensureLegendaryScene();
    if (wrap) {
      wrap.setAttribute('data-legendary-theme', theme);
      var badge = wrap.querySelector('.legendary-event-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'legendary-event-badge';
        wrap.appendChild(badge);
      }
      badge.textContent = (handDef.event && handDef.event.series) || 'Legendary';
    }
  }

  function clearLegendaryChrome() {
    document.body.classList.remove('legendary-play-active');
    var badge = document.querySelector('.legendary-event-badge');
    if (badge) badge.remove();
    var playActive = $('#play-active');
    if (playActive) playActive.classList.remove('is-legendary-session');
  }

  function pickRandomHero(handDef) {
    var cands = handDef.heroCandidates || [];
    if (!cands.length) return (handDef.cast[0] && handDef.cast[0].playerId) || null;
    return cands[Math.floor(Math.random() * cands.length)];
  }

  function playHand(handId, opts) {
    opts = opts || {};
    var handDef = Catalog() && Catalog().get(handId);
    var ForceMod = Force();
    if (!handDef || !ForceMod) return false;
    var heroId = opts.heroId || pickRandomHero(handDef);
    if (!heroId || !handDef.play.roles[heroId]) return false;

    state.handId = handId;
    state.heroId = heroId;
    state.lastResult = null;

    var force = ForceMod.toForce(handDef, heroId);
    var pc = ForceMod.playConfig(handDef, heroId, { blind: opts.blind !== false });
    if (!force || !global.playAnalysisHand) return false;

    applyLegendaryChrome(handDef);
    global.playAnalysisHand(force, pc);
    return true;
  }

  function afterHandFinished(engineHand) {
    var pc = (engineHand && engineHand.playConfig) || {};
    if (!pc.legendaryMode || !pc.legendaryHandId) return false;

    var handDef = Catalog() && Catalog().get(pc.legendaryHandId);
    if (!handDef) return false;

    state.handId = pc.legendaryHandId;
    state.heroId = pc.legendaryHeroId;
    state.lastResult = engineHand && engineHand.result ? engineHand.result : null;
    state.view = VIEW.story;

    clearLegendaryChrome();
    saveLegendaryProgress(pc.legendaryHandId, pc.legendaryHeroId);

    if (global.goToTab) global.goToTab('legendary');
    render($('#legendary-content'));
    return true;
  }

  function renderHub(root) {
    var cat = Catalog();
    if (!cat) {
      root.innerHTML = '<p class="muted-text">Cargando catálogo…</p>';
      return;
    }
    var hands = cat.list();
    var nPlayed = playedCount();
    var html = '<div class="legendary-panel legendary-hub">';
    html += '<div class="legendary-hub-head">';
    html += '<h2>Manos legendarias</h2>';
    html += '<p class="muted-text">Juega manos reales de pros en mesa broadcast. No sabrás quién eres hasta el final.</p>';
    html += '<p class="legendary-progress">' + nPlayed + ' / ' + hands.length + ' manos jugadas</p>';
    html += '<div class="legendary-hub-actions">';
    html += '<button type="button" class="btn btn-primary" id="legendary-random">Jugar al azar</button>';
    html += '</div></div>';
    html += '<div class="legendary-grid">';
    hands.forEach(function (h) {
      var feat = h.featured ? ' legendary-card-featured' : '';
      html += '<button type="button" class="legendary-card' + feat + '" data-hand-id="' + esc(h.id) + '">';
      html += '<div class="legendary-card-year">' + esc(String(h.year)) + ' · ' + esc((h.event && h.event.series) || '') + '</div>';
      html += '<div class="legendary-card-title">' + esc(h.titleBlind) + '</div>';
      html += '<div class="legendary-card-meta">' + esc(formatEvent(h)) + '</div>';
      html += '<div class="legendary-card-flags">' + esc(castFlags(h)) + '</div>';
      if (h.tags && h.tags.length) {
        html += '<div class="legendary-card-tags">';
        h.tags.slice(0, 3).forEach(function (t) {
          html += '<span class="legendary-tag">' + esc(t) + '</span>';
        });
        html += '</div>';
      }
      html += '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;

    var randomBtn = $('#legendary-random');
    if (randomBtn) {
      randomBtn.addEventListener('click', function () {
        var h = cat.random();
        if (h) playHand(h.id, { blind: true });
      });
    }
    root.querySelectorAll('[data-hand-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        playHand(btn.getAttribute('data-hand-id'), { blind: true });
      });
    });
  }

  function renderStory(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var heroMember = Force() && Force().castMember(handDef, state.heroId);
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    var story = handDef.story || {};

    var html = '<div class="legendary-panel legendary-story">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-hub">&laquo; Biblioteca</button>';
    html += '<div class="legendary-story-head" data-theme="' + esc(theme) + '">';
    html += '<p class="legendary-story-kicker">La mano revelada</p>';
    html += '<h2 class="legendary-story-title">' + esc(handDef.title) + '</h2>';
    html += '<p class="legendary-story-event">' + esc(formatEvent(handDef)) + ' · ' + esc(formatDate(handDef)) + '</p>';
    html += '</div>';
    html += '<p class="legendary-story-body">' + esc(story.es || '') + '</p>';
    if (story.highlights && story.highlights.length) {
      html += '<ul class="legendary-story-highlights">';
      story.highlights.forEach(function (b) { html += '<li>' + esc(b) + '</li>'; });
      html += '</ul>';
    }
    if (heroMember) {
      html += '<p class="muted-text"><strong>Jugaste como:</strong> ' + esc(heroMember.displayName) +
        ' (' + esc(heroMember.countryLabel) + ' · ' + esc(heroMember.pos) + ')</p>';
    }
    html += '<div class="legendary-cast-grid">';
    (handDef.cast || []).forEach(function (m) {
      var you = m.playerId === state.heroId ? ' is-you' : '';
      html += '<div class="legendary-cast-card' + you + '">';
      html += '<div class="legendary-cast-name">' + esc(m.displayName) + '</div>';
      html += '<div class="legendary-cast-country">' + esc(m.countryLabel) + '</div>';
      html += '<div class="legendary-cast-pos">' + esc(m.pos) + '</div>';
      if (m.cards) html += '<div class="legendary-cast-cards">' + cardHtml(m.cards) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    if (handDef.media && handDef.media.videoUrl) {
      html += '<button type="button" class="legendary-video-btn" id="legendary-open-video">&#9654; ' +
        esc(handDef.media.videoLabel || 'Ver la mano original') + '</button>';
    }
    html += '<button type="button" class="btn btn-primary" id="legendary-continue">Continuar &raquo;</button>';
    html += '</div>';
    root.innerHTML = html;

    $('#legendary-back-hub').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
    $('#legendary-continue').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    var vid = $('#legendary-open-video');
    if (vid) vid.addEventListener('click', function () { openVideo(handDef); });
  }

  function renderAfter(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var html = '<div class="legendary-panel legendary-story">';
    html += '<h2>¿Qué quieres hacer ahora?</h2>';
    html += '<p class="muted-text">' + esc(handDef.titleBlind) + '</p>';
    html += '<div class="legendary-after-actions">';
    html += '<button type="button" class="btn btn-primary" id="legendary-show-timeline">Ver qué pasó en realidad</button>';
    html += '<button type="button" class="btn btn-ghost" id="legendary-other-role">Jugar con otro rol</button>';
    html += '<button type="button" class="btn btn-ghost" id="legendary-back-hub2">Volver al hub</button>';
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-show-timeline').addEventListener('click', function () {
      state.view = VIEW.timeline;
      render(root);
    });
    $('#legendary-other-role').addEventListener('click', function () {
      state.view = VIEW.roles;
      render(root);
    });
    $('#legendary-back-hub2').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
  }

  function renderTimeline(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef || !handDef.timeline) {
      state.view = VIEW.after;
      renderAfter(root);
      return;
    }
    var heroMember = Force() && Force().castMember(handDef, state.heroId);
    var heroName = heroMember ? heroMember.displayName : '';
    var html = '<div class="legendary-panel legendary-timeline">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-after">&laquo; Volver</button>';
    html += '<h2>Línea original</h2>';
    html += '<p class="muted-text">Nombres reales · ' + esc(handDef.title) + '</p>';
    handDef.timeline.forEach(function (item) {
      if (item.kind === 'street') {
        html += '<div class="legendary-tl-street">' + esc(item.street);
        if (item.board && item.board.length) {
          html += '<span class="legendary-tl-board">' + cardHtml(item.board) + '</span>';
        }
        html += '</div>';
      } else if (item.kind === 'show') {
        html += '<div class="legendary-tl-action">';
        html += '<span class="legendary-tl-player">' + esc(item.player) + '</span>';
        html += ' muestra <span class="legendary-tl-show">' + cardHtml(item.cards) + '</span>';
        html += '</div>';
      } else {
        var isHero = item.player === heroName;
        html += '<div class="legendary-tl-action' + (isHero ? ' is-hero' : '') + '">';
        html += '<span class="legendary-tl-player">' + esc(item.player) +
          (item.pos ? ' (' + esc(item.pos) + ')' : '') + '</span>';
        html += '<span class="legendary-tl-move">' + esc(item.type) + '</span>';
        html += '</div>';
      }
    });
    html += '<div class="legendary-after-actions" style="margin-top:20px">';
    html += '<button type="button" class="btn btn-primary" id="legendary-other-role2">Jugar con otro rol</button>';
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-back-after').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    $('#legendary-other-role2').addEventListener('click', function () {
      state.view = VIEW.roles;
      render(root);
    });
  }

  function renderRolePicker(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var html = '<div class="legendary-panel legendary-story">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-after2">&laquo; Volver</button>';
    html += '<h2>Elige tu rol</h2>';
    html += '<p class="muted-text">Misma mano, otra perspectiva · modo ciego</p>';
    html += '<div class="legendary-role-list">';
    (handDef.heroCandidates || []).forEach(function (pid) {
      var m = Force() && Force().castMember(handDef, pid);
      if (!m) return;
      var played = rolePlayed(handDef.id, pid) ? ' played' : '';
      html += '<button type="button" class="legendary-role-btn' + played + '" data-hero-id="' + esc(pid) + '">';
      html += '<span>' + esc(m.displayName) + ' · ' + esc(m.countryLabel) + ' · ' + esc(m.pos) + '</span>';
      html += '<span class="muted-text">' + (played ? '✓' : '') + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-back-after2').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    root.querySelectorAll('[data-hero-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        playHand(state.handId, { heroId: btn.getAttribute('data-hero-id'), blind: true });
      });
    });
  }

  function render(container) {
    var root = container || document.getElementById('legendary-content');
    if (!root) return;
    if (!legendaryMenuVisible()) {
      root.innerHTML = '<div class="legendary-panel"><p class="muted-text">Manos legendarias — solo administración.</p></div>';
      return;
    }
    if (state.view === VIEW.story) renderStory(root);
    else if (state.view === VIEW.after) renderAfter(root);
    else if (state.view === VIEW.timeline) renderTimeline(root);
    else if (state.view === VIEW.roles) renderRolePicker(root);
    else renderHub(root);
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pt-auth-ready', refreshTabVisibility);
    global.addEventListener('pt-guest-ready', refreshTabVisibility);
    global.addEventListener('DOMContentLoaded', refreshTabVisibility);
  }

  global.PTLegendary = {
    render: render,
    playHand: playHand,
    afterHandFinished: afterHandFinished,
    legendaryMenuVisible: legendaryMenuVisible,
    refreshTabVisibility: refreshTabVisibility,
    applyLegendaryChrome: applyLegendaryChrome,
    clearLegendaryChrome: clearLegendaryChrome,
    getAnonymizeLabel: function (playConfig, pos) {
      var map = playConfig && playConfig.legendaryAnonymize;
      if (!map || !map.byPos || !pos) return null;
      return map.byPos[pos] || null;
    }
  };
})(typeof window !== 'undefined' ? window : global);
