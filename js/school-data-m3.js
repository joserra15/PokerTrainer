/*
 * school-data-m3.js — Cash M3 líneas avanzadas (Study). C-21…C-25.
 * Hueco entre M2 (C-20) y Pro Coach (C-26). Misma fuente evaluateSpot.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  var flop = D.flopSpot;

  D.registerLessons([
    {
      id: 'C-21',
      title: 'Range advantage → c-bet / check-back',
      route: 'cash', module: 'M3', order: 21, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      conceptTags: ['rangeAdv', 'cbet'],
      concept: 'Range advantage: tu rango de agresor encaja mejor que el del BB en ciertos boards. Ahí el c-bet (continuación) frecuente y pequeño es el plan; sin ventaja, checkeas más.',
      theory: [
        'En A-high o K-high secos, el agresor preflop tiene más Ax/Kx/overpairs que el BB. Eso es range advantage: puedes apostar (~33 % pot) con alta frecuencia.',
        'En boards bajos conectados o monótonos, el BB conecta más draws y dos pares: tu ventaja cae. El mix sube el check-back (pasar en posición) o c-bet selectivo.',
        'Trampa: c-bet automático en todo board. El motor mezcla: mira textura + IP + iniciativa, no solo tu mano concreta.'
      ],
      examples: [{
        title: 'Misma mano, dos boards',
        body: 'BTN vs BB con KQo. En A♠8♦3♣ (ventaja): c-bet ~33 % pot muy frecuente. En 8♠7♠6♥ (sin ventaja): más checks — el BB tiene más nuts posibles.'
      }],
      aiQuestions: [
        '¿Qué es range advantage en una frase?',
        '¿En qué textura el agresor checkea más?'
      ],
      spots: [
        flop('c21-01', 'BTN', ['Kh', 'Qd'], ['As', '8d', '3c'], 32101, {
          teachBack: 'A-high seco IP: range advantage → c-bet pequeño frecuente (~bet_33 mix alto).'
        }),
        flop('c21-02', 'BTN', ['Ah', 'Kd'], ['9s', '8s', '7h'], 32102, {
          trapTag: 'fancy_play',
          teachBack: 'Board conectado wet: poca range advantage. No autocbet; check o bet selectivo.'
        }),
        flop('c21-03', 'CO', ['Qd', 'Js'], ['Kc', '7h', '2d'], 32103, {
          teachBack: 'K-high seco: ventaja de rango del agresor → c-bet ligero IP.'
        }),
        flop('c21-04', 'BTN', ['Td', '9d'], ['Ah', '7h', '2h'], 32104, {
          trapTag: 'fancy_play',
          teachBack: 'Monotone: nut advantage a menudo del BB. Reduce c-bet spew sin color/draw.'
        }),
        flop('c21-05', 'BTN', ['Jc', 'Tc'], ['Qs', '4h', '4c'], 32105, {
          teachBack: 'Paired seco: agresor suele tener range advantage → c-bet frecuente mixto.'
        }),
        flop('c21-06', 'HJ', ['9s', '8s'], ['6h', '5d', '2c'], 32106, {
          teachBack: 'Low board: BB conecta más. Mix con más check; no fuerces c-bet grande.'
        })
      ]
    },
    {
      id: 'C-22',
      title: 'Check-raise value vs semi-bluff',
      route: 'cash', module: 'M3', order: 22, plan: 'study',
      xp: 140, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      conceptTags: ['xr', 'mdf', 'line'],
      concept: 'Check-raise (pasar y subir) OOP combina value (manos fuertes) y semi-bluff (draws). El motor prepara XR en flop mid/wet y exige follow-through.',
      theory: [
        'Value XR: sets, dos pares, top pair fuerte en texturas mid/wet donde el agresor c-betea alto.',
        'Semi-bluff XR: OESD (escalera abierta), flush draw con equity. Sin equity ni blockers, el XR de aire es spew.',
        'Tras check-raise setup, si te apuestan debes raisear con frecuencia (line intent). Fold tras setup rompe la línea.',
        'Trampa: XR en boards secos A-high donde el agresor tiene range advantage y foldea poco.'
      ],
      examples: [{
        title: 'XR value en mid',
        body: 'BB con 99 en 9♠8♦5♣ vs c-bet BTN: check-raise value claro. Con 76s (OESD) es semi-bluff mixto; con K2o es fold/call, no XR.'
      }],
      aiQuestions: [
        '¿Cuándo es XR value y cuándo semi-bluff?',
        '¿Qué pasa si checkeas con intent XR y luego fold?'
      ],
      spots: [
        flop('c22-01', 'BB', ['9h', '9d'], ['9s', '8d', '5c'], 32201, {
          facingBet: true,
          teachBack: 'Set en mid: raise/XR value vs c-bet. No flat pasivo eterno.'
        }),
        flop('c22-02', 'BB', ['7h', '6h'], ['9s', '8d', '2c'], 32202, {
          facingBet: true,
          teachBack: 'OESD vs c-bet: continue (call/raise mix). Semi-bluff con equity.'
        }),
        flop('c22-03', 'BB', ['Kh', '2d'], ['As', '7c', '3d'], 32203, {
          facingBet: true,
          trapTag: 'fancy_play',
          teachBack: 'Aire en A-high seco: fold vs c-bet. No inventes XR sin equity.'
        }),
        flop('c22-04', 'BB', ['Jh', 'Th'], ['Jc', '9s', '4d'], 32204, {
          facingBet: true,
          teachBack: 'Top pair + gutshot: raise/call mix vs c-bet — fuerte defensa.'
        }),
        flop('c22-05', 'BB', ['Ad', '5d'], ['Kh', '7d', '2d'], 32205, {
          facingBet: true,
          teachBack: 'Nut FD: raise semi-bluff frecuente vs c-bet en two-tone.'
        }),
        flop('c22-06', 'BB', ['Qc', '3h'], ['Qs', 'Jd', 'Ts'], 32206, {
          facingBet: true,
          trapTag: 'dominated',
          teachBack: 'Top pair débil en broadway wet: call/fold mix; XR spew es leak.'
        })
      ]
    },
    {
      id: 'C-23',
      title: 'Polar vs merge + sizing',
      route: 'cash', module: 'M3', order: 23, plan: 'study',
      xp: 140, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      conceptTags: ['polar', 'spr', 'overbet'],
      concept: 'Polar: apuestas nueces o aire (sizings grandes / overbet). Merge: apuestas value medio con sizing medio. El SPR (stack-to-pot) decide cuánto polarizas.',
      theory: [
        'SPR bajo (≤3–4): más jam y líneas polares. SPR alto: más bets pequeños merge y pot control.',
        'River overbet (~125 % pot) pide polarización: nuts o farol con blockers — no value medio.',
        'En 3-bet pots el mix ya nace más polar: menos bet_33 merge, más bet_66/100.',
        'Trampa: overbet con top pair medio «porque queda cool». El motor castiga value no polar.'
      ],
      examples: [{
        title: 'River polar',
        body: 'River seco, tú con nuez: overbet o bet grande. Con segunda pareja: sizing medio o check. Misma textura, planes distintos.'
      }],
      aiQuestions: [
        '¿Qué es una línea polar?',
        '¿Cuándo el overbet de river tiene sentido?'
      ],
      spots: [
        flop('c23-01', 'BTN', ['Ah', 'Ad'], ['As', '7c', '2d', '3h', '5s'], 32301, {
          street: 'river',
          teachBack: 'Nuez/top set river: value polar — sizing grande u overbet mix.'
        }),
        flop('c23-02', 'BTN', ['Kh', 'Kd'], ['As', '7c', '2d', '3h', '5s'], 32302, {
          street: 'river',
          teachBack: 'KK en A-high: pot control / merge. No overbetees como nuez.'
        }),
        flop('c23-03', 'CO', ['Qh', 'Qd'], ['Qc', '8s', '3h', '2d', '5c'], 32303, {
          street: 'river',
          teachBack: 'Set en river: value fat polar. Sizing mayor.'
        }),
        flop('c23-04', 'BTN', ['Jh', '9c'], ['As', 'Kd', 'Qc', '2h', '5s'], 32304, {
          street: 'river',
          trapTag: 'fancy_play',
          teachBack: 'Aire sin blockers: give up. Overbet bluff sin historia es spew.'
        }),
        flop('c23-05', 'BTN', ['8s', '7s'], ['9h', '6d', '2c', '5s', '3d'], 32305, {
          street: 'river',
          teachBack: 'Escalera: value polar fuerte. Cobra máximo.'
        }),
        flop('c23-06', 'BTN', ['Ad', '5d'], ['Ah', '9c', '4s', '2d', '7h'], 32306, {
          street: 'river',
          teachBack: 'Top pair débil: thin value merge (~33–66 %), no overbet polar.'
        })
      ]
    },
    {
      id: 'C-24',
      title: 'MDF y defensa vs c-bet / barrel',
      route: 'cash', module: 'M3', order: 24, plan: 'study',
      xp: 140, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      conceptTags: ['mdf', 'blockers', 'potOdds'],
      concept: 'MDF (minimum defense frequency) es la frecuencia mínima de defensa para que el farol rival no imprima. Combínala con pot odds, equity y blockers.',
      theory: [
        'Vs c-bet ~33 % pot, MDF es alta: defiendes muchas manos con equity (pares, draws, backdoors).',
        'Vs barrel grande o overbet, MDF baja: foldeas más bluffcatchers; raises son polares (nuez o aire con blockers).',
        'Blockers (cartas que bloquean la nuez rival) suben call/bluff freqs en el motor.',
        'Trampa: overfold vs c-bet pequeño («espero el nuts») o overcall vs overbet sin equity.'
      ],
      examples: [{
        title: 'Defensa vs 33 %',
        body: 'BB con JTs en 9♠8♦2♣ vs c-bet 33 %: call claro (equity + MDF). Misma mano vs shove river: fold frecuente.'
      }],
      aiQuestions: [
        '¿Qué es MDF?',
        '¿Por qué defiendo más vs bet pequeño?'
      ],
      spots: [
        flop('c24-01', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 32401, {
          facingBet: true,
          teachBack: 'Draw vs c-bet pequeño: continue. Equity + MDF altos.'
        }),
        flop('c24-02', 'BB', ['Ah', '5d'], ['As', '7c', '3d'], 32402, {
          facingBet: true,
          teachBack: 'Top pair vs c-bet: call/raise defensa. No overfold.'
        }),
        flop('c24-03', 'BB', ['Kd', '2c'], ['Ah', '9s', '4d'], 32403, {
          facingBet: true,
          trapTag: 'dominated',
          teachBack: 'Aire seco vs c-bet: fold. MDF no obliga a defender basura total.'
        }),
        flop('c24-04', 'BB', ['Qh', 'Js'], ['Qc', 'Td', '3h'], 32404, {
          facingBet: true,
          teachBack: 'Top pair: defensa fuerte vs c-bet. Call frecuente.'
        }),
        flop('c24-05', 'BB', ['8h', '7h'], ['As', 'Kd', '2c'], 32405, {
          facingBet: true,
          trapTag: 'fancy_play',
          teachBack: 'Backdoors flojos en AK seco: a menudo fold vs c-bet. No hero-call.'
        }),
        flop('c24-06', 'BB', ['9s', '9c'], ['Ah', 'Td', '3c'], 32406, {
          facingBet: true,
          teachBack: 'Pareja media: call mix vs c-bet pequeño; defensa MDF con showdown.'
        })
      ]
    },
    {
      id: 'C-25',
      title: 'Línea multi-calle: barrel / give-up / delayed',
      route: 'cash', module: 'M3', order: 25, plan: 'study',
      xp: 150, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      conceptTags: ['line', 'rangeAdv', 'polar'],
      concept: 'Una línea es un plan en varias calles: c-bet → barrel (segunda bala) / give-up / delayed c-bet tras check-check. La polarización y el range advantage guían el plan.',
      theory: [
        'Tras c-bet flop con ventaja, en turn barrela value y algunos faroles; sin equity ni historia, give-up (cedes).',
        'Delayed c-bet: check-check flop y apuestas turn — común cuando el flop era incómodo y el turn mejora tu plan.',
        'El motor guarda LinePlan (polar/merge, intents). No reinventes cada calle desde cero.',
        'Trampa: triple barrel automático con aire o check-back eterno con value en turn seguro.'
      ],
      examples: [{
        title: 'Barrel vs give-up',
        body: 'Flop A♠8♦3♣ c-bet con KQo. Turn 2♣ (blank): barrel value/farol mixto. Turn 9♠8♠ (muy wet): más give-up con aire.'
      }],
      aiQuestions: [
        '¿Qué es un delayed c-bet?',
        '¿Cuándo hago give-up tras c-bet?'
      ],
      spots: [
        flop('c25-01', 'BTN', ['Kh', 'Qd'], ['As', '8c', '3d', '2h'], 32501, {
          street: 'turn',
          teachBack: 'Turn blank tras c-bet A-high: barrel frecuente (value/farol mix).'
        }),
        flop('c25-02', 'BTN', ['Ah', '5d'], ['Kc', '7s', '2d', '9h'], 32502, {
          street: 'turn',
          teachBack: 'Ax en K-high: second barrel de value habitual en turn seco.'
        }),
        flop('c25-03', 'BTN', ['Jd', 'Td'], ['As', '4h', '2c', '9s'], 32503, {
          street: 'turn',
          trapTag: 'fancy_play',
          teachBack: 'Aire sin mejora en turn feo: give-up frecuente. No fuerces barrel.'
        }),
        flop('c25-04', 'CO', ['Qc', 'Qd'], ['Jh', '9s', '4c', '2d'], 32504, {
          street: 'turn',
          teachBack: 'Overpair: barrel de value en turn seguro.'
        }),
        flop('c25-05', 'BTN', ['9s', '8s'], ['Ah', 'Kd', '2c', '7h'], 32505, {
          street: 'turn',
          teachBack: 'Backdoor turn: delayed/barrel selectivo; no spew sin equity clara.'
        }),
        flop('c25-06', 'BTN', ['Ad', 'Kd'], ['9c', '8h', '7s', '2d'], 32506, {
          street: 'turn',
          trapTag: 'fancy_play',
          teachBack: 'Board muy conectado: menos barrel automático. Plan selectivo / pot control.'
        })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
