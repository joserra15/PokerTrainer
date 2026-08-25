/*
 * Spots extra M2–M4 donde el sizing es la clave del quiz (mezclados en cada lección).
 * Cargar tras school-data-ranges-line.js.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var flop = D.flopSpot;
  function cash(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100' }, extra || {});
  }
  function lineCfg() {
    return cash({ scenario: 'rfi', practiceStreet: 'river', schoolDecisionEnd: true, schoolLineQuiz: true });
  }
  function LQ(id, heroPos, heroCards, board, seed, meta) {
    meta = meta || {};
    var spot = flop(id, heroPos, heroCards, board, seed, {
      street: 'river',
      villainPos: meta.villainPos || (meta.facingBet === false ? 'BB' : 'BTN'),
      facingBet: meta.facingBet !== false,
      teachBack: meta.teachBack || '',
      trapTag: meta.trapTag || 'none',
      playConfig: lineCfg()
    });
    spot.lineStory = meta.lineStory || [];
    spot.villainQuiz = meta.quiz;
    return spot;
  }

  /** id lección → spot sizing-key (se inserta en posición 6) */
  var SIZING_BY_LESSON = {
    'R-07': LQ('r07-sz01', 'BB', ['Tc', '8d'], ['Ah', '7c', '3d', '2s', 'Kd'], 88007, {
      villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Ah 7c 3d — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '2s — check-check' },
        { street: 'River', text: 'Kd — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Check turn + overbet scare card: polar Ax o farol. El sizing river elimina value medio.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Ad', 'Jc'],
        teachBack: 'AJo: c-bet pequeño, pot-control turn, overbet polar al K. 99 y KQo no usan esta escalera de sizings.',
        options: [
          { id: 'a', cards: ['9h', '9c'], label: '99', correct: false,
            eliminated: 'Set medio: tras c-bet 33% suele seguir en turn 66% — el check turn + overbet 125% al K no es su línea de value.' },
          { id: 'b', cards: ['Kh', 'Qd'], label: 'KQo', correct: false,
            eliminated: 'Top pair al K: cobraría con bet 66% turn o river 66% — no deja pasar turn y salta a overbet polar.' },
          { id: 'c', cards: ['Ad', 'Jc'], label: 'AJo', correct: true }
        ]
      }
    }),
    'R-08': LQ('r08-sz01', 'BB', ['Jh', '9d'], ['Kd', 'Tc', '4h', '7s', '2c'], 88008, {
      villainPos: 'CO', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kd Tc 4h — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '7s — BB check → CO bet 66% pot → BB call' },
        { street: 'River', text: '2c — BB check → CO bet 33% pot' }
      ],
      teachBack: 'River 33% tras turn grande: thin value Kx. Overbet/overpair no baja tanto al final.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Kh', 'Qs'],
        teachBack: 'KQo: turn 66% por value, river 33% thin. QQ betea turn más grande; A5s no triple-barrela K-high.',
        options: [
          { id: 'a', cards: ['Qc', 'Qd'], label: 'QQ', correct: false,
            eliminated: 'Overpair: en turn apuesta 75% pot o check — no encadenar 66% turn y luego block 33% river como value principal.' },
          { id: 'b', cards: ['As', '5s'], label: 'A5s', correct: false,
            eliminated: 'Puede c-bet 33%, pero sin K: no mete turn 66% + river 33% de cobro en K-high.' },
          { id: 'c', cards: ['Kh', 'Qs'], label: 'KQo', correct: true }
        ]
      }
    }),
    'R-09': LQ('r09-sz01', 'BB', ['5h','4h'], ['Kd','Ts','8c','3d','8h'], 88009, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kd Ts 8c — check-check' },
        { street: 'Turn', text: '3d — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '8h — BB check → BTN bet 33% pot' }
      ],
      teachBack: 'Check flop + turn value + block river en board emparejado: Kx/trips. QQ betea flop; A5s no block-betea.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Kh', 'Qd'],
        teachBack: 'KQo: delayed turn 66%, block 33% river al 8. QQ y A5s no.',
        options: [
          { id: 'a', cards: ['Qs', 'Qh'], label: 'QQ', correct: false,
            eliminated: 'Overpair al T: casi siempre c-betea flop K-high — check-check elimina QQ de esa línea de block river.' },
          { id: 'b', cards: ['As', '5s'], label: 'A5s', correct: false,
            eliminated: 'Puede float turn, pero sin K: no baja a block 33% river tras bet 66% turn en KT8.' },
          { id: 'c', cards: ['Kh', 'Qd'], label: 'KQo', correct: true }
        ]
      }
    }),
    'R-10': LQ('r10-sz01', 'BB', ['Qc', '7h'], ['Js', 'Jc', '5d', '9h', '3c'], 88010, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Js Jc 5d — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '9h — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '3c — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Overbet river en board paired: boat/polar. Trips y overpairs no suelen escalar a 125%.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Jh', 'Jd'],
        teachBack: 'JJ boat: c-bet pequeño, turn value, overbet river. A9o y TT no overbetean paired board.',
        options: [
          { id: 'a', cards: ['As', '9d'], label: 'A9o', correct: false,
            eliminated: 'Puede c-bet 33%, pero sin J: turn 66% ya es techo — el overbet 125% river pide boat o farol polar, no A9.' },
          { id: 'b', cards: ['Ts', 'Th'], label: 'TT', correct: false,
            eliminated: 'Underpair al J: pot-control turn — no triple barrel hasta overbet 125% en paired.' },
          { id: 'c', cards: ['Jh', 'Jd'], label: 'JJ', correct: true }
        ]
      }
    }),
    'R-11': LQ('r11-sz01', 'BB', ['Ad', '6c'], ['8h', '7d', '2s', '5c', 'Kh'], 88011, {
      villainPos: 'CO', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: '8h 7d 2s — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '5c — BB check → CO bet 66% pot → BB call' },
        { street: 'River', text: 'Kh — BB check → CO bet 33% pot' }
      ],
      teachBack: 'Straight en 8765K: turn grande, river 33% block. Sets/overpairs no blockan así tras turn 66%.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['9s', 'Ts'],
        teachBack: 'T9s straight: turn 66% value/protección, river block 33%. 88 y AQo no encajan con ambos sizings.',
        options: [
          { id: 'a', cards: ['8c', '8h'], label: '88', correct: false,
            eliminated: 'Set de ochos: turn puede ser 66%, pero river sería 66–75% por value — no block 33% tras turn grande.' },
          { id: 'b', cards: ['Ah', 'Qd'], label: 'AQo', correct: false,
            eliminated: 'Sin straight: c-bet 33% posible, pero turn 66% + river 33% block es línea de escalera, no A-high.' },
          { id: 'c', cards: ['9s', 'Ts'], label: 'T9s', correct: true }
        ]
      }
    }),
    'R-12': LQ('r12-sz01', 'BB', ['Kh', 'Td'], ['Ah', 'Qh', '3c', '7d', '2s'], 88012, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Ah Qh 3c — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '7d — check-check' },
        { street: 'River', text: '2s — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'FD hearts que falla: check turn + overbet brick. Value Ax apuesta turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Jh', 'Th'],
        teachBack: 'JTs FD fallido → overbet polar. AJo betea turn; QQ no checka turn con overpair.',
        options: [
          { id: 'a', cards: ['Ad', 'Jc'], label: 'AJo', correct: false,
            eliminated: 'Top pair A: tras c-bet 33% suele betear turn 55–66% — el check turn + overbet 125% brick apunta a farol polar.' },
          { id: 'b', cards: ['Qc', 'Qd'], label: 'QQ', correct: false,
            eliminated: 'Overpair: no pot-controla turn en AQ3 two-tone para luego overbetear river blank — sizing incoherente.' },
          { id: 'c', cards: ['Jh', 'Th'], label: 'JTs', correct: true }
        ]
      }
    }),
    'R-13': LQ('r13-sz01', 'BB', ['8d', '7c'], ['9c', '8c', '2d', '4h', '9h'], 88013, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: '9c 8c 2d — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '4h — BB check → BTN bet 75% pot → BB call' },
        { street: 'River', text: '9h — BB check → BTN bet 33% pot' }
      ],
      teachBack: 'Boat 99: turn grande, river block en paired. TPTK no baja a 33% tras 75% turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['9s', '9d'],
        teachBack: '99 boat: turn 75%, river block 33%. A9s y JJ no usan block river tras turn pot.',
        options: [
          { id: 'a', cards: ['As', '9c'], label: 'A9s', correct: false,
            eliminated: 'Trips nueve: turn 66% value, river 66%+ — no block 33% tras haber apostado 75% turn.' },
          { id: 'b', cards: ['Jh', 'Jd'], label: 'JJ', correct: false,
            eliminated: 'Overpair: turn 66% o check — no encadena 75% turn + block 33% en board emparejado.' },
          { id: 'c', cards: ['9s', '9d'], label: '99', correct: true }
        ]
      }
    }),
    'R-14': LQ('r14-sz01', 'BB', ['Tc', '6d'], ['Kd', 'Jd', '4d', '2s', '8h'], 88014, {
      villainPos: 'CO', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kd Jd 4d — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '2s — check-check' },
        { street: 'River', text: '8h — BB check → CO bet 33% pot' }
      ],
      teachBack: 'Flush AdXd: check turn + river 33% thin. Overpairs sin diamond apuestan turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Ad', 'Qd'],
        teachBack: 'AQo FD: c-bet range, slow turn, thin 33% river. QQ sin diamond betea turn; KQo no tiene flush.',
        options: [
          { id: 'a', cards: ['Qs', 'Qh'], label: 'QQ', correct: false,
            eliminated: 'Overpair sin diamond: tras c-bet 33% casi siempre betea turn 55–66% — el check turn + 33% river es flush thin.' },
          { id: 'b', cards: ['Kc', 'Qh'], label: 'KQo', correct: false,
            eliminated: 'Sin diamante: river 33% es value de flush/middle pair mejorado — no KQ offsuit.' },
          { id: 'c', cards: ['Ad', 'Qd'], label: 'AQo', correct: true }
        ]
      }
    }),
    'R-15': LQ('r15-sz01', 'BB', ['Ac', '5d'], ['Th', '9c', '2d', '3s', 'Jd'], 88015, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Th 9c 2d — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '3s — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: 'Jd — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Escalera QJ: turn 66%, overbet river al J. Sets no overbetean así.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Qh', 'Js'],
        teachBack: 'QJo straight: overbet polar value en scare card. TT pot-controla; AJo no tiene straight.',
        options: [
          { id: 'a', cards: ['Td', 'Tc'], label: 'TT', correct: false,
            eliminated: 'Set de diez: turn 66% OK, pero river cobra 66–75% — no overbet 125% salvo boat/farol polar.' },
          { id: 'b', cards: ['Ah', 'Jc'], label: 'AJo', correct: false,
            eliminated: 'Top pair J sin straight: no apuesta 66% turn conectado y luego overbet 125% como value de escalera.' },
          { id: 'c', cards: ['Qh', 'Js'], label: 'QJo', correct: true }
        ]
      }
    }),
    'R-16': LQ('r16-sz01', 'BB', ['Qh', 'Jd'], ['Kd', 'Kc', '7h', '2d', '4c'], 88016, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kd Kc 7h — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '2d — BB check → BTN bet 33% pot → BB call' },
        { street: 'River', text: '4c — BB check → BTN bet 33% pot' }
      ],
      teachBack: 'Triple block 33% en paired: full KK7. Overpairs apuestan más grande al menos una calle.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Kh', 'Ks'],
        teachBack: 'KK full: tres calles 33% block. QQ y A7s no triple-block paired.',
        options: [
          { id: 'a', cards: ['Qc', 'Qd'], label: 'QQ', correct: false,
            eliminated: 'Overpair al 7: al menos turn o river va a 66% pot — triple 33% es bloqueo de full en paired.' },
          { id: 'b', cards: ['Ah', '7s'], label: 'A7s', correct: false,
            eliminated: 'Dos pares A7: cobraría turn 66%+ — no tres blocks 33% consecutivos.' },
          { id: 'c', cards: ['Kh', 'Ks'], label: 'KK', correct: true }
        ]
      }
    }),
    'R-17': LQ('r17-sz01', 'BB', ['Jc', '4c'], ['Ac', 'Tc', '6d', '2h', '8s'], 88017, {
      villainPos: 'CO', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Ac Tc 6d — BB check → CO c-bet 55% pot → BB call' },
        { street: 'Turn', text: '2h — BB check → CO bet 75% pot → BB call' },
        { street: 'River', text: '8s — BB check → CO overbet 125% pot' }
      ],
      teachBack: 'Merge polar M4: turn pot, overbet river. Ax medio no escala a 125%.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Ad', 'Td'],
        teachBack: 'ATo two-tone: turn 75%, overbet merge/value. KQo no apuesta 75% turn; 66 no overbetea.',
        options: [
          { id: 'a', cards: ['Kh', 'Qd'], label: 'KQo', correct: false,
            eliminated: 'Sin A fuerte: flop 55% posible, pero turn 75% + overbet 125% pide top pair+ o farol — no KQ.' },
          { id: 'b', cards: ['6h', '6s'], label: '66', correct: false,
            eliminated: 'Underpair: no apuesta 75% turn two-tone ni overbet 125% river como value.' },
          { id: 'c', cards: ['Ad', 'Td'], label: 'ATo', correct: true }
        ]
      }
    }),
    'R-18': LQ('r18-sz01', 'BB', ['Tc', '9d'], ['Qd', 'Jh', '3c', '7c', '2d'], 88018, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Qd Jh 3c — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '7c — check-check' },
        { street: 'River', text: '2d — BB check → BTN bet 75% pot' }
      ],
      teachBack: 'Delayed 75% river: polar Qx/set tras pot-control turn. Ax apuesta turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Qc', 'Ts'],
        teachBack: 'QTo: check turn pot-control, river 75% value. AJo betea turn; 88 no delayed grande.',
        options: [
          { id: 'a', cards: ['Ah', 'Jd'], label: 'AJo', correct: false,
            eliminated: 'Top pair J: tras c-bet 33% suele betear turn 55–66% — no deja check turn y luego 75% river.' },
          { id: 'b', cards: ['8h', '8c'], label: '88', correct: false,
            eliminated: 'Underpair: no delayed 75% river por value — sizing turn check lo elimina.' },
          { id: 'c', cards: ['Qc', 'Ts'], label: 'QTo', correct: true }
        ]
      }
    }),
    'R-19': LQ('r19-sz01', 'BB', ['Jc', 'Td'], ['7s', '7c', '4h', 'As', '2c'], 88019, {
      villainPos: 'BTN', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: '7s 7c 4h — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: 'As — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '2c — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Boat 77A: turn 66%, overbet river. Trips/overpairs no overbetean paired así.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['7h', '7d'],
        teachBack: '77 boat: escalera sizing hasta overbet. A7o y QQ no overbetean paired.',
        options: [
          { id: 'a', cards: ['Ah', '7c'], label: 'A7o', correct: false,
            eliminated: 'Trips siete: turn 66% value, river 66–75% — el overbet 125% pide boat o polar air, no A7.' },
          { id: 'b', cards: ['Qs', 'Qh'], label: 'QQ', correct: false,
            eliminated: 'Overpair al 4: no triple barrel hasta overbet 125% en board paired.' },
          { id: 'c', cards: ['7h', '7d'], label: '77', correct: true }
        ]
      }
    }),
    'R-20': LQ('r20-sz01', 'BB', ['Td', '9d'], ['8d', '6c', '2h', '5s', '3c'], 88020, {
      villainPos: 'CO', facingBet: true,
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: '8d 6c 2h — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '5s — BB check → CO bet 66% pot → BB call' },
        { street: 'River', text: '3c — BB check → CO bet 33% pot' }
      ],
      teachBack: 'Straight 97: turn 66%, river 33% block en 4-straight. Sets cobran más en river.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['9h', '7h'],
        teachBack: '97o straight: block river 33%. 88 y A6s no blockan tras turn 66%.',
        options: [
          { id: 'a', cards: ['8s', '8h'], label: '88', correct: false,
            eliminated: 'Set de ochos: river value 66%+ en 4-straight — no block 33% tras turn 66%.' },
          { id: 'b', cards: ['Ah', '6s'], label: 'A6s', correct: false,
            eliminated: 'Dos pares A6: turn 66% posible, pero river sería 66% por value — no block 33% de escalera.' },
          { id: 'c', cards: ['9h', '7h'], label: '97o', correct: true }
        ]
      }
    }),
    'R-21': LQ('r21-sz01', 'BB', ['Ac', '2c'], ['Kh', 'Qd', 'Js', '4c', '9h'], 88021, {
      villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kh Qd Js — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '4c — BB check → BTN bet 75% pot → BB call' },
        { street: 'River', text: '9h — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Broadway straight: turn pot, overbet river. One-pair hands no overbetean KQJ9x.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Tc', '9c'],
        teachBack: 'T9s straight: overbet value polar. AKo y TT no tienen straight nut.',
        options: [
          { id: 'a', cards: ['As', 'Kc'], label: 'AKo', correct: false,
            eliminated: 'Top pair K sin straight: turn 66% max — no overbet 125% river en board tan conectado.' },
          { id: 'b', cards: ['Ts', 'Th'], label: 'TT', correct: false,
            eliminated: 'Underpair Broadway: no apuesta 75% turn conectado ni overbet river como nuts.' },
          { id: 'c', cards: ['Tc', '9c'], label: 'T9s', correct: true }
        ]
      }
    }),
    'R-22': LQ('r22-sz01', 'BB', ['Qh', '5d'], ['As', '8d', '3c', '2h', '7s'], 88022, {
      villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'As 8d 3c — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '2h — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '7s — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Farol: FD diamante muerto + overbet brick. Ax value no salta a 125%.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Kd', '4d'],
        teachBack: 'K4s FD fallido → overbet polar. AJo y 88 no overbetean brick.',
        options: [
          { id: 'a', cards: ['Ah', 'Jc'], label: 'AJo', correct: false,
            eliminated: 'Top pair A: turn 66% value, river 66% — el salto a overbet 125% en brick es polar air, no AJo.' },
          { id: 'b', cards: ['8h', '8s'], label: '88', correct: false,
            eliminated: 'Middle pair: pot-control turn o river mediano — no overbet 125% como value/farol creíble.' },
          { id: 'c', cards: ['Kd', '4d'], label: 'K4s', correct: true }
        ]
      }
    }),
    'R-23': LQ('r23-sz01', 'BB', ['Ah', '5c'], ['9c', '7d', '2h', '4s', '3c'], 88023, {
      villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: '9c 7d 2h — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '4s — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '3c — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'OESD 86 fallido: overbet river brick. JTs value no overbetea 43.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['8d', '6d'],
        teachBack: '86s OESD fallido → overbet. K9o y TT no overbetean blank.',
        options: [
          { id: 'a', cards: ['Kh', '9d'], label: 'K9o', correct: false,
            eliminated: 'Top pair 9: river 66% value — overbet 125% en 43 brick es equity muerta, no K9.' },
          { id: 'b', cards: ['Tc', 'Td'], label: 'TT', correct: false,
            eliminated: 'Overpair: turn 66% OK, pero overbet river pide polarización — TT cobra 66–75%, no 125%.' },
          { id: 'c', cards: ['8d', '6d'], label: '86s', correct: true }
        ]
      }
    }),
    'R-24': LQ('r24-sz01', 'BB', ['Kc', '3c'], ['Qh', 'Td', '5d', '8c', '2s'], 88024, {
      villainPos: 'CO', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Qh Td 5d — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '8c — check-check' },
        { street: 'River', text: '2s — BB check → CO overbet 125% pot' }
      ],
      teachBack: 'FD diamantes fallido: check turn + overbet brick. QJo betea turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Ad', '6d'],
        teachBack: 'A6s FD fallido → overbet delayed. QJo y 99 no checkan turn para overbetear.',
        options: [
          { id: 'a', cards: ['Qc', 'Jd'], label: 'QJo', correct: false,
            eliminated: 'Top pair Q: tras c-bet 33% suele betear turn 55–66% — check turn + overbet 125% brick = farol polar.' },
          { id: 'b', cards: ['9h', '9c'], label: '99', correct: false,
            eliminated: 'Underpair: no checka turn en QT5 two-tone para luego overbetear river blank.' },
          { id: 'c', cards: ['Ad', '6d'], label: 'A6s', correct: true }
        ]
      }
    }),
    'R-25': LQ('r25-sz01', 'BB', ['Ah', '8h'], ['Kd', '7c', '2d', '9s', '4h'], 88025, {
      villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Kd 7c 2d — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: '9s — BB check → BTN bet 75% pot → BB call' },
        { street: 'River', text: '4h — BB check → BTN overbet 125% pot' }
      ],
      teachBack: 'Float farol: turn grande scare + overbet brick. Kx value no overbetea 4.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Qd', 'Jd'],
        teachBack: 'QJs float air → overbet. KQo y 77 no overbetean brick K-high.',
        options: [
          { id: 'a', cards: ['Kh', 'Qc'], label: 'KQo', correct: false,
            eliminated: 'Top pair K: turn 66% value, river 66% — no escala a overbet 125% en brick seco.' },
          { id: 'b', cards: ['7h', '7s'], label: '77', correct: false,
            eliminated: 'Set de sietes: turn 66–75% value, river 66%+ — overbet 125% no encaja con set en K72.' },
          { id: 'c', cards: ['Qd', 'Jd'], label: 'QJs', correct: true }
        ]
      }
    }),
    'R-26': LQ('r26-sz01', 'BTN', ['9c', '8c'], ['Jh', '4d', '2c', 'Ts', '3h'], 88026, {
      villainPos: 'BB', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Jh 4d 2c — BB check → BTN c-bet 33% pot → BB call' },
        { street: 'Turn', text: 'Ts — BB check → BTN bet 66% pot → BB call' },
        { street: 'River', text: '3h — BB bet 75% pot' }
      ],
      teachBack: 'Donk overcard: float turn + donk 75% river polar/farol. Ax no donkea 3.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Qh', '9h'],
        teachBack: 'Q9s float → donk 75% polar/farol. AJo call down; 55 no float+dunk.',
        options: [
          { id: 'a', cards: ['Ah', 'Jd'], label: 'AJo', correct: false,
            eliminated: 'Top pair J: defiende float, pero no donkea 75% river en J42T3 — sizing donk polar pide farol/escalera.' },
          { id: 'b', cards: ['5h', '5d'], label: '55', correct: false,
            eliminated: 'Underpair: no flota turn 66% call para donkear 75% river — sin equity donk grande.' },
          { id: 'c', cards: ['Qh', '9h'], label: 'Q9s', correct: true }
        ]
      }
    }),
    'R-27': LQ('r27-sz01', 'BB', ['Td', '6d'], ['Ac', '9c', '4h', '2s', '8d'], 88027, {
      villainPos: 'CO', facingBet: true, trapTag: 'fancy_play',
      lineStory: [
        { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
        { street: 'Flop', text: 'Ac 9c 4h — BB check → CO c-bet 33% pot → BB call' },
        { street: 'Turn', text: '2s — check-check' },
        { street: 'River', text: '8d — BB check → CO overbet 125% pot' }
      ],
      teachBack: 'Missed FD clubs: check turn + overbet brick two-tone. Ax betea turn.',
      quiz: {
        prompt: '¿Qué crees que tiene el villano?',
        answerCards: ['Kc', '5c'],
        teachBack: 'K5s FD fallido → overbet. ATo y 99 no checkan turn para overbetear 8.',
        options: [
          { id: 'a', cards: ['Ah', 'Tc'], label: 'ATo', correct: false,
            eliminated: 'Top pair A: tras c-bet 33% betea turn 55% — check turn + overbet 125% al 8 es farol polar, no ATo.' },
          { id: 'b', cards: ['9s', '9h'], label: '99', correct: false,
            eliminated: 'Middle pair: no pot-controla turn para overbet 125% river — sizing incoherente con 99.' },
          { id: 'c', cards: ['Kc', '5c'], label: 'K5s', correct: true }
        ]
      }
    })
  };

  var INSERT_AT = 6;
  Object.keys(SIZING_BY_LESSON).forEach(function (lessonId) {
    var spot = SIZING_BY_LESSON[lessonId];
    var lesson = D.LESSONS.filter(function (l) { return l.id === lessonId; })[0];
    if (!lesson || !Array.isArray(lesson.spots)) return;
    var idx = Math.min(INSERT_AT, lesson.spots.length);
    lesson.spots.splice(idx, 0, spot);
    lesson.hands = lesson.spots.length;
  });
})(typeof window !== 'undefined' ? window : globalThis);
