/*
 * school-data-bluffs.js — Pack Faroles: sí/no/por qué (BL-01…BL-04).
 * F-01 ya es RFI; IDs BL-* evitan colisión.
 * Cargar tras school-data-viral-quizzes.js (reutiliza factories si existen).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  var V = global.PTSchoolViralQuizzes || {};
  var flop = D.flopSpot;

  function handOpt(id, label, cards, why) {
    return { id: id, label: label, cards: cards, why: why || '' };
  }

  function bluffDecideSpot(id, seed, heroPos, heroCards, board, line, lineStory, correctId, teach, extra) {
    extra = extra || {};
    return {
      id: id,
      kind: 'decisionQuiz',
      seed: seed,
      heroPos: heroPos,
      teachBack: teach,
      trapTag: extra.trap || undefined,
      quiz: {
        prompt: extra.prompt || '¿Farolearías aquí?',
        line: line,
        lineStory: lineStory || [],
        board: board,
        heroCards: heroCards,
        villainPos: extra.villainPos || 'BB',
        facingBet: false,
        options: [
          {
            id: 'bet',
            label: 'Sí · farolear (bet)',
            why: extra.whyYes || ''
          },
          {
            id: 'check',
            label: 'No · check / give up',
            why: extra.whyNo || ''
          }
        ],
        correctId: correctId === 'yes' ? 'bet' : (correctId === 'no' ? 'check' : correctId),
        teachBack: teach
      }
    };
  }

  function blockerSpot(id, seed, board, villainAction, options, correctId, teach) {
    if (V.blockerSpot) return V.blockerSpot(id, seed, board, villainAction, options, correctId, teach);
    return {
      id: id,
      kind: 'blockerQuiz',
      seed: seed,
      teachBack: teach,
      quiz: {
        prompt: 'River: las tres manos son aire. ¿Con cuál faroleas mejor?',
        board: board,
        villainAction: villainAction,
        options: options,
        correctId: correctId,
        teachBack: teach
      }
    };
  }

  function catchDecideSpot(id, seed, heroPos, heroCards, board, line, lineStory, correctId, teach, extra) {
    extra = extra || {};
    return {
      id: id,
      kind: 'decisionQuiz',
      seed: seed,
      heroPos: heroPos,
      teachBack: teach,
      trapTag: extra.trap || undefined,
      quiz: {
        prompt: extra.prompt || 'Facing bet: ¿cazar farol o fold?',
        line: line,
        lineStory: lineStory || [],
        board: board,
        heroCards: heroCards,
        villainPos: extra.villainPos || 'BTN',
        facingBet: true,
        options: [
          { id: 'fold', label: 'Fold', why: extra.whyFold || '' },
          { id: 'call', label: 'Call · bluff-catch', why: extra.whyCall || '' },
          { id: 'raise', label: 'Raise', why: extra.whyRaise || '' }
        ],
        correctId: correctId,
        teachBack: teach
      }
    };
  }

  var PACKS = {};

  /* —— BL-01: ¿Farolearías? sí/no + por qué —— */
  PACKS['BL-01'] = [
    bluffDecideSpot('bl01-01', 96001, 'BTN', ['7h', '6h'], ['As', 'Kd', '2c', '9d', '3h'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn bet 66% → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'BB check · BTN c-bet 33% · BB call' },
        { street: 'Turn', text: 'BB check · BTN bet 66% · BB call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'no',
      '76s en A-high tras doble barrel fallido: sin blockers de Ax/Kx ni historia polar. Give up.',
      {
        prompt: 'River brick: ¿faroleas con 76s?',
        whyYes: 'Sin FE clara ni blockers: el BB llegó a river con Ax/Kx/pares. Bet es spew.',
        whyNo: 'Correcto: aire sin blockers ni scare card → check/give up.',
        trap: 'fancy_play'
      }),
    bluffDecideSpot('bl01-02', 96002, 'BTN', ['Ah', '5d'], ['Kh', '8h', '3h', 'Jd', '2c'],
      'BTN open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'A♥ bloquea el color nuts en board monotone hearts. Historia de barrels + blocker = farol fuerte.',
      {
        prompt: 'River monotone hearts: ¿faroleas con A♥5♦?',
        whyYes: 'Blocker de nuts + línea agresiva coherente. Sí faroleas.',
        whyNo: 'Aquí sí hay FE: A♥ quita flushes fuertes que pagan. No give-up automático.'
      }),
    bluffDecideSpot('bl01-03', 96003, 'CO', ['Qh', 'Jh'], ['As', '7d', '2c', 'Kd', '9h'],
      'CO open → BB call · Flop checks · Turn bet 50% → call · River',
      [
        { street: 'Preflop', text: 'CO open → BB call' },
        { street: 'Flop', text: 'Checks' },
        { street: 'Turn', text: 'CO bet 50% · BB call' },
        { street: 'River', text: 'BB check · CO ?' }
      ],
      'no',
      'QJ en A-high: bloqueas basura que foldea (QJ mismo) y dejas Ax vivo. Mal blocker.',
      {
        prompt: '¿Faroleas river con QJ en A-high?',
        whyYes: 'QJ bloquea folds, no value. Farol malo.',
        whyNo: 'Correcto: peor blocker — densificas el calling range del BB.',
        trap: 'fancy_play'
      }),
    bluffDecideSpot('bl01-04', 96004, 'BTN', ['Td', '9d'], ['Kc', '7s', '2h', '3d', 'As'],
      'BTN open → BB call · Flop c-bet → call · Turn checks · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Checks' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'Delayed river: turn check → river bet con aire + As en board. Historia polar razonable; T9 no bloquea Ax fuerte.',
      {
        prompt: 'Delayed lead river en A-high: ¿faroleas con T9s?',
        whyYes: 'Delayed farol con FE: el BB checkeó turn; muchos Ax flojos / pares medios foldean.',
        whyNo: 'Aquí hay FE real tras checks turn; no es spew automático.'
      }),
    bluffDecideSpot('bl01-05', 96005, 'BB', ['8c', '7c'], ['Qh', 'Jd', '2s', '9c', '3d'],
      'BTN open → BB call · Flop check → c-bet → call · Turn check → bet → call · River check → bet 75%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'Check · c-bet · call' },
        { street: 'Turn', text: 'Check · bet · call' },
        { street: 'River', text: 'Check · BTN bet 75% · BB ?' }
      ],
      'no',
      'Esto es bluff-catch, no farol: enfrentas bet. Con 87 air → fold, no raise de farol.',
      {
        prompt: 'Facing river bet con aire: ¿«faroleas» raise?',
        whyYes: 'Raise-bluff sin equity ni blockers vs línea fuerte = spew.',
        whyNo: 'Correcto: no inventes raise-bluff; fold.',
        trap: 'fancy_play',
        villainPos: 'BTN'
      }),
    bluffDecideSpot('bl01-06', 96006, 'BTN', ['As', '4s'], ['Kh', '9d', '3c', '2h', '7d'],
      'BTN open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'A-high bloquea AA/AK/AQ en K-high. Triple barrel con blocker de value es farol clásico.',
      {
        prompt: 'K-high seco: ¿faroleas river con A4s?',
        whyYes: 'Buen blocker de value (Ax) + historia de presión.',
        whyNo: 'Sí hay razón para farolear: blockers + FE.'
      }),
    bluffDecideSpot('bl01-07', 96007, 'CO', ['5h', '4h'], ['Qs', 'Qd', '8c', '2h', 'Jc'],
      'CO open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'CO open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · CO ?' }
      ],
      'no',
      'En QQ paired el BB que llegó suele tener Qx/Jx/overs. 54s no bloquea value; poca FE.',
      {
        prompt: 'Board paired QQ: ¿faroleas con 54s?',
        whyYes: 'Poca FE: calling range denso. Spew.',
        whyNo: 'Correcto: give up sin blockers útiles.',
        trap: 'fancy_play'
      }),
    bluffDecideSpot('bl01-08', 96008, 'BTN', ['Qc', 'Jd'], ['Ts', '9c', '8d', '2h', '3c'],
      'BTN open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'QJ bloquea la escalera nuts en T98. Farol con blocker de nuts sin hacerla tú.',
      {
        prompt: 'T98: ¿faroleas con QJ?',
        whyYes: 'Blockeas QJ nuts del rival; historia de barrels encaja.',
        whyNo: 'Aquí el blocker de nuts justifica el farol.'
      }),
    bluffDecideSpot('bl01-09', 96009, 'BTN', ['2h', '2d'], ['As', 'Kd', '7c', 'Jh', '9s'],
      'BTN open → BB call · Flop checks · Turn checks · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'Checks' },
        { street: 'Turn', text: 'Checks' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'no',
      '22 tiene showdown value débil pero no es farol: sin historia agresiva, bet river es thin/spew.',
      {
        prompt: 'Línea pasiva + underpair: ¿faroleas?',
        whyYes: 'Sin historia de valor, el bet no representa nada creíble.',
        whyNo: 'Correcto: check atrás; no inventes farol sin story.',
        trap: 'fancy_play'
      }),
    bluffDecideSpot('bl01-10', 96010, 'BTN', ['Kh', '5h'], ['Ah', '9h', '4c', '2d', '7s'],
      'BTN open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'Missed flush draw con K♥: blocker de nuts de color + línea de semi-bluff fallido → farol river estándar.',
      {
        prompt: 'Missed FD con K♥: ¿faroleas river?',
        whyYes: 'Semi→farol con blocker de nuts; FE real.',
        whyNo: 'Este es el caso de libro para convertir el draw fallido en farol.'
      }),
    bluffDecideSpot('bl01-11', 96011, 'CO', ['Jh', 'Th'], ['9s', '8s', '2d', 'Kd', '3c'],
      'CO open → BB call · Flop c-bet → call · Turn bet → call · River multiway 3 jugadores',
      [
        { street: 'Preflop', text: 'CO open → BB+BTN call' },
        { street: 'Flop', text: 'C-bet · 2 calls' },
        { street: 'Turn', text: 'Barrel · 2 calls' },
        { street: 'River', text: 'Checks · CO ?' }
      ],
      'no',
      'Multiway: FE se desploma. No farolees river vs dos rivales sin equity.',
      {
        prompt: 'River multiway: ¿faroleas con JT?',
        whyYes: 'Multiway mata FE: alguien casi siempre llega.',
        whyNo: 'Correcto: give up multiway.',
        trap: 'fancy_play'
      }),
    bluffDecideSpot('bl01-12', 96012, 'BTN', ['Ad', '3c'], ['Qc', 'Jd', 'Ts', '4h', '2s'],
      'BTN open → BB call · Flop c-bet → call · Turn bet → call · River',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'C-bet · call' },
        { street: 'Turn', text: 'Barrel · call' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'yes',
      'A-high en QJT: bloqueas AQ/AJ y representas escalera/overbet polar. Buen farol.',
      {
        prompt: 'QJT: ¿faroleas con A3o?',
        whyYes: 'Blocker de value broadway + board scary.',
        whyNo: 'Hay FE y blockers; el farol entra.'
      })
  ];

  /* —— BL-02: ¿Con cuál faroleas? (blockers) —— */
  PACKS['BL-02'] = [
    blockerSpot('bl02-01', 96101, ['Kh', '8h', '3h', 'Jd', '2c'], 'Check · ¿quién farolea?', [
      handOpt('a', 'Ah5d', ['Ah', '5d'], 'Bloquea color nuts.'),
      handOpt('b', '5h4d', ['5h', '4d'], 'Corazón bajo: quita folds, deja nuts.'),
      handOpt('c', '9d7d', ['9d', '7d'], 'Sin corazón: no bloqueas color.')
    ], 'a', 'Farolea con A♥ (blocker de nuts), no con corazón bajo.'),
    blockerSpot('bl02-02', 96102, ['Kd', '7c', '2s', '9h', '3c'], 'Bet 66% pot', [
      handOpt('a', 'Ah5h', ['Ah', '5h'], 'Bloquea Ax value que paga.'),
      handOpt('b', 'QhJh', ['Qh', 'Jh'], 'Bloquea folds (QJ).'),
      handOpt('c', '8h6h', ['8h', '6h'], 'Sin blocker de value.')
    ], 'a', 'K-high seco: A-high > QJ para farolear.'),
    blockerSpot('bl02-03', 96103, ['Ts', '9c', '8d', '3h', '2c'], 'Bet 75% pot', [
      handOpt('a', 'Qd5h', ['Qd', '5h'], 'Bloquea QJ nuts sin hacerla.'),
      handOpt('b', 'Ah5d', ['Ah', '5d'], 'No toca la escalera.'),
      handOpt('c', '7d6d', ['7d', '6d'], 'Aire sin blocker de nuts.')
    ], 'a', 'En T98 farolea con Qx (blocker de nuts).'),
    blockerSpot('bl02-04', 96104, ['Ac', 'Ad', '9h', '6c', '2s'], 'Bet 50% pot', [
      handOpt('a', '5h4h', ['5h', '4h'], 'No bloqueas broadway que tiraba.'),
      handOpt('b', 'KhQh', ['Kh', 'Qh'], 'KQ foldea a menudo: quitas folds.'),
      handOpt('c', 'JhTh', ['Jh', 'Th'], 'Igual: bloqueas folds.')
    ], 'a', 'En AA paired, aire bajo > broadway que tiraba.'),
    blockerSpot('bl02-05', 96105, ['Qs', 'Jd', '4c', '4h', '2d'], 'Bet 75% pot', [
      handOpt('a', 'AhKh', ['Ah', 'Kh'], 'Bloquea AQ/AJ/KQ/KJ.'),
      handOpt('b', 'Ts9s', ['Ts', '9s'], 'Sin blocker de Qx/Jx.'),
      handOpt('c', '8h7h', ['8h', '7h'], 'Tampoco reduce pares de Q/J.')
    ], 'a', 'QJ paired: AK bloquea las parejas que pagan.'),
    blockerSpot('bl02-06', 96106, ['9h', '8h', '2c', 'Kd', '3s'], 'Overbet', [
      handOpt('a', 'Ah7d', ['Ah', '7d'], 'Bloquea flush nuts + Ax.'),
      handOpt('b', '5h4d', ['5h', '4d'], 'Corazón bajo: peor.'),
      handOpt('c', 'QcJc', ['Qc', 'Jc'], 'Sin corazón.')
    ], 'a', 'Two-tone + overbet: A♥ es el farol.'),
    blockerSpot('bl02-07', 96107, ['Jc', 'Td', '7s', '2h', '3d'], 'Bet 66% pot', [
      handOpt('a', 'As9s', ['As', '9s'], 'A-high + blocker de 98 straight-ish.'),
      handOpt('b', 'KhQh', ['Kh', 'Qh'], 'KQ no interactúa con JT.'),
      handOpt('c', '6h5h', ['6h', '5h'], 'Aire sin A/K blockers útiles.')
    ], 'a', 'En JTx, A9s suele ser mejor farol que KQ.'),
    blockerSpot('bl02-08', 96108, ['Kh', 'Kh', '8c', '4d', '2s'], 'Bet 50% pot', [
      handOpt('a', 'Ah5d', ['Ah', '5d'], 'Bloquea AA/AK.'),
      handOpt('b', 'QdJd', ['Qd', 'Jd'], 'Bloquea folds.'),
      handOpt('c', '9h7h', ['9h', '7h'], 'Sin blocker de Ax.')
    ], 'a', 'KK paired: A-high brilla.'),
    blockerSpot('bl02-09', 96109, ['Ah', '7d', '2c', '9s', '4h'], 'Bet 75% pot', [
      handOpt('a', 'Kd5d', ['Kd', '5d'], 'K-high bloquea Kx value flojo.'),
      handOpt('b', 'QhJh', ['Qh', 'Jh'], 'Más folds que value.'),
      handOpt('c', '6c5c', ['6c', '5c'], 'Aire puro sin blocker.')
    ], 'a', 'A-high board: Kx puede ser mejor farol que QJ.'),
    blockerSpot('bl02-10', 96110, ['6s', '5s', '4d', 'Kh', '2c'], 'Bet 75% pot', [
      handOpt('a', 'As7d', ['As', '7d'], 'Bloquea 78/A7 straights y Ax.'),
      handOpt('b', 'QdJd', ['Qd', 'Jd'], 'No toca la escalera baja.'),
      handOpt('c', '9h8h', ['9h', '8h'], 'Bloquea poco del nuts en 654.')
    ], 'a', 'En 654, A7 bloquea mejor las nuts de escalera.'),
    blockerSpot('bl02-11', 96111, ['Qc', '9d', '3h', '3s', '8c'], 'Bet 66% pot', [
      handOpt('a', 'AhKd', ['Ah', 'Kd'], 'Bloquea AQ/KQ/AK.'),
      handOpt('b', 'JdTd', ['Jd', 'Td'], 'JT suele tirar: quitas folds.'),
      handOpt('c', '7h6h', ['7h', '6h'], 'Sin blocker de Qx.')
    ], 'a', 'Q-high paired: AK > JT para farolear.'),
    blockerSpot('bl02-12', 96112, ['Jh', 'Th', '2d', '5c', '9s'], 'Bet overbet', [
      handOpt('a', 'Ah8d', ['Ah', '8d'], 'Bloquea flush nuts + Ax.'),
      handOpt('b', '4h3d', ['4h', '3d'], 'Corazón bajo: quita folds.'),
      handOpt('c', 'KdQd', ['Kd', 'Qd'], 'Sin corazón: no representa flush.')
    ], 'a', 'Overbet flush story: A♥ es el farol.')
  ];

  /* —— BL-03: Semi-bluff → river (spots jugados) —— */
  PACKS['BL-03'] = [
    flop('bl03-01', 'BTN', ['9h', '8h'], ['Kh', '7h', '2c'], 96201, {
      teachBack: 'OESD + FD: semi-bluff c-bet/raise frecuente. Tienes plan de equity.',
      street: 'flop'
    }),
    flop('bl03-02', 'BTN', ['7d', '6d'], ['As', 'Kd', '2c'], 96202, {
      trapTag: 'fancy_play',
      teachBack: 'Gutshot flojo en A-high seco: no inventes semi-bluff spew. Check o c-bet pequeño mixto.',
      street: 'flop'
    }),
    flop('bl03-03', 'BB', ['Th', '9h'], ['Qh', '8c', '2d'], 96203, {
      facingBet: true,
      teachBack: 'OESD + backdoor: check-raise semi-bluff o call. Equity justifica presión selectiva.',
      street: 'flop'
    }),
    flop('bl03-04', 'BTN', ['Ah', '5h'], ['Kh', '9d', '3c', '2h'], 96204, {
      teachBack: 'Flush draw turn tras c-bet: barrel semi-bluff estándar. Plan: river farol si fallas.',
      street: 'turn'
    }),
    flop('bl03-05', 'BTN', ['Qc', 'Jc'], ['As', '8d', '3c', '2h'], 96205, {
      trapTag: 'fancy_play',
      teachBack: 'Sin draw real en turn brick A-high: no second barrel automático de aire. Give up o delayed selectivo.',
      street: 'turn'
    }),
    flop('bl03-06', 'CO', ['Js', 'Ts'], ['9h', '8d', '2c', 'Kd', '3h'], 96206, {
      teachBack: 'Missed OESD river: farol con blockers (JT) o give up. Evalúa FE y blockers.',
      street: 'river'
    }),
    flop('bl03-07', 'BTN', ['Kh', '4h'], ['Ah', '9h', '2c', '7d', '3s'], 96207, {
      teachBack: 'Missed FD con K♥: bet river (farol) con blocker de nuts — conversión semi→farol.',
      street: 'river'
    }),
    flop('bl03-08', 'BTN', ['5c', '4c'], ['Qs', 'Jd', '2h', '8d', '7s'], 96208, {
      trapTag: 'fancy_play',
      teachBack: 'Missed draw sin blockers útiles: better give up. No spew river.',
      street: 'river'
    }),
    flop('bl03-09', 'BB', ['8h', '7h'], ['Kh', '6d', '2c'], 96209, {
      facingBet: true,
      teachBack: 'OESD OOP vs c-bet: call o raise semi. No fold equity gratuita.',
      street: 'flop'
    }),
    flop('bl03-10', 'BTN', ['Ad', 'Td'], ['Kd', '7d', '3c', '9h'], 96210, {
      teachBack: 'Nut FD turn: barrel casi siempre. Máxima presión con equity + blockers.',
      street: 'turn'
    }),
    flop('bl03-11', 'CO', ['Qh', 'Jh'], ['Th', '9c', '2d', '5h', '3c'], 96211, {
      teachBack: 'Missed FD + gutshot: bet river con QJ (bloquea nuts en T9x) — farol plausible.',
      street: 'river'
    }),
    flop('bl03-12', 'BTN', ['9s', '8s'], ['As', 'Kd', '4c', '2h', '7d'], 96212, {
      trapTag: 'fancy_play',
      teachBack: 'Triple barrel air sin blockers en A-high: spew. El plan semi falló → give up.',
      street: 'river'
    })
  ];

  /* —— BL-04: Bluff-catch —— */
  PACKS['BL-04'] = [
    catchDecideSpot('bl04-01', 96301, 'BB', ['Ah', '9d'], ['Kc', '7s', '2h', '3d', '9c'],
      'BTN open → BB call · check-call flop/turn · River BTN bet 66%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'Check-call' },
        { street: 'Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 66%' }
      ],
      'call',
      'A9 second pair: bluff-catch vs sizing medio. Bloqueas Ax value y capturas faroles.',
      {
        whyFold: 'Overfold: tienes showdown + blockers.',
        whyCall: 'Correcto: medium showdown vs bet no polar extremo.',
        whyRaise: 'Raise convierte catcher en bluff; no.'
      }),
    catchDecideSpot('bl04-02', 96302, 'BB', ['Qh', 'Td'], ['As', 'Kd', '7c', '2h', '5s'],
      'BTN open → BB call · check-call · check-call · River overbet',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call ×2' },
        { street: 'River', text: 'BTN overbet 125%' }
      ],
      'fold',
      'QT air en A-high vs overbet polar: fold. No hero-call sin blockers de nuts.',
      {
        trap: 'fancy_play',
        whyFold: 'Correcto: overbet = nuts o farol; QT no catcha bien.',
        whyCall: 'Poca equity vs polar; overcall.',
        whyRaise: 'Peor: spew.'
      }),
    catchDecideSpot('bl04-03', 96303, 'BB', ['Jh', 'Js'], ['Ts', '8d', '2c', '4h', '9s'],
      'BTN open → BB call · check-call · check-call · River bet 75%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 75%' }
      ],
      'call',
      'JJ overpair en T82-4-9: call vs river. Demasiado fuerte para fold; raise solo vs air-heavy.',
      {
        whyFold: 'Overfold con overpair.',
        whyCall: 'Correcto: bluff-catch / thin value call.',
        whyRaise: 'Raise es value fino; call es la línea base.'
      }),
    catchDecideSpot('bl04-04', 96304, 'BB', ['8h', '7h'], ['As', 'Kd', 'Qc', '2h', '3d'],
      'BTN open → BB call · check-call flop · check-fold turn? · River bet',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'Check-call' },
        { street: 'Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 75%' }
      ],
      'fold',
      '87 air en AKQ: fold. Sin showdown value ni blockers útiles.',
      {
        trap: 'fancy_play',
        whyFold: 'Correcto.',
        whyCall: 'Hero-call sin equity.',
        whyRaise: 'Spew.'
      }),
    catchDecideSpot('bl04-05', 96305, 'BB', ['Kh', '9c'], ['Kd', '7s', '2h', '3c', '8d'],
      'BTN open → BB call · check-call · check-call · River bet 50%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 50%' }
      ],
      'call',
      'Top pair weak kicker vs bet pequeño: call. Sizing merge → más bluffs + thin value.',
      {
        whyFold: 'Overfold vs small bet.',
        whyCall: 'Correcto: TPTK no, pero TPWK catcha.',
        whyRaise: 'Raise thin; call realiza.'
      }),
    catchDecideSpot('bl04-06', 96306, 'BB', ['Ac', '5d'], ['Kh', '9s', '4c', '2d', '7h'],
      'BTN open → BB call · check-call · check-call · River shove',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN shove' }
      ],
      'fold',
      'A-high vs shove: fold. Necesitas mejor bluff-catcher (Tx+/Ax fuerte).',
      {
        whyFold: 'Correcto.',
        whyCall: 'A-high no basta vs shove polar.',
        whyRaise: 'Imposible sin nuts.'
      }),
    catchDecideSpot('bl04-07', 96307, 'BB', ['Td', '9d'], ['Ts', '8c', '2h', 'Kd', '3s'],
      'BTN open → BB call · check-call · check-call · River bet 66%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 66%' }
      ],
      'call',
      'Middle pair + blockers: call vs sizing medio. Clásico bluff-catch.',
      {
        whyFold: 'Ligeramente tight.',
        whyCall: 'Correcto.',
        whyRaise: 'No turnes catcher en bluff.'
      }),
    catchDecideSpot('bl04-08', 96308, 'BB', ['Qd', 'Jd'], ['Ah', '7c', '3s', '2d', '9h'],
      'BTN open → BB call · check-call · check-call · River overbet',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN overbet' }
      ],
      'fold',
      'QJ air vs overbet A-high: fold. Sin blocker de nuts relevante.',
      {
        trap: 'fancy_play',
        whyFold: 'Correcto.',
        whyCall: 'Mal catcher.',
        whyRaise: 'Spew.'
      }),
    flop('bl04-09', 'BB', ['Ah', '8d'], ['As', 'Kd', '7c', '2h', '9s'], 96309, {
      facingBet: true,
      street: 'river',
      teachBack: 'Top pair vs river bet: call frecuente. Bluff-catch / thin value según sizing.'
    }),
    flop('bl04-10', 'BB', ['6h', '5h'], ['Kc', '9d', '2s', 'Jh', '3c'], 96310, {
      facingBet: true,
      street: 'river',
      trapTag: 'fancy_play',
      teachBack: 'Air vs river bet en K-high: fold. No hero-call por «pot odds» sin blockers.'
    }),
    catchDecideSpot('bl04-11', 96311, 'BB', ['Jh', 'Tc'], ['Js', '8d', '3c', '2h', '7s'],
      'BTN open → BB call · check-call · check-call · River bet 75%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 75%' }
      ],
      'call',
      'Top pair vs 75%: call. Estás en la zona de bluff-catch + value thin.',
      {
        whyFold: 'Overfold.',
        whyCall: 'Correcto.',
        whyRaise: 'Raise solo vs rango muy bluff-heavy.'
      }),
    catchDecideSpot('bl04-12', 96312, 'BB', ['9c', '8c'], ['Ah', 'Ad', '6s', '2h', 'Kd'],
      'BTN open → BB call · check-call · check-call · River bet 75%',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop/Turn', text: 'Check-call' },
        { street: 'River', text: 'BTN bet 75%' }
      ],
      'fold',
      '98 air en AA paired: fold. El rango de value del BTN es denso.',
      {
        whyFold: 'Correcto.',
        whyCall: 'Sin showdown real.',
        whyRaise: 'Spew.'
      })
  ];

  var TRAIN_MAKE = {
    formatHub: 'cash',
    gameType: 'cash6',
    scenario: 'random',
    practiceStreet: 'river',
    practiceIntent: 'bluff_make',
    handsTarget: 25,
    villainLevel: 'pro',
    stackDepth: 'bb100'
  };
  var TRAIN_CATCH = {
    formatHub: 'cash',
    gameType: 'cash6',
    scenario: 'random',
    practiceStreet: 'river',
    practiceIntent: 'bluff_catch',
    handsTarget: 25,
    villainLevel: 'pro',
    stackDepth: 'bb100'
  };

  var LESSONS = [
    {
      id: 'BL-01',
      title: 'Faroles · ¿Sí o no?',
      route: 'cash',
      module: 'M3',
      order: 22.5,
      plan: 'study',
      xp: 110,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'Antes de farolear responde cuatro preguntas: ¿hay fold equity? ¿blockers útiles? ¿historia coherente? ¿calle/SPR permiten polarizar?',
      theory: [
        'Checklist antes de farolear: (1) fold equity — el rival puede foldear; (2) blockers — quitas value/nuts que pagan, no basura que tira; (3) historia — tu línea representa valor; (4) calle — river polar o semi con plan; evita multiway o ICM alto sin premio.',
        'Sí farol cuando tienes blocker de nuts, línea agresiva coherente y fold equity real. No farol con aire sin blockers, en multiway, o cuando la mezcla GTO casi nunca apuesta (~0 %).',
        'Trampa clásica: farolear porque «hay que farolear frecuencias» sin FE ni blockers. En esos spots, better give up y guarda el stack para value.'
      ],
      examples: [{
        title: 'Monotone vs seco',
        body: 'A♥ en hearts = sí. 76s en A-high tras barrels fallidos = no.'
      }],
      aiQuestions: [
        '¿Cuáles son las 4 preguntas antes de farolear?',
        '¿Por qué multiway mata faroles?',
        '¿Qué es un mal blocker?'
      ],
      relatedLessons: [
        { id: 'B-01', label: 'B-01 · Blockers' },
        { id: 'BL-02', label: 'BL-02 · ¿Con cuál?' },
        { id: 'C-22', label: 'C-22 · Semi-bluff' }
      ],
      trainDrill: TRAIN_MAKE,
      spots: []
    },
    {
      id: 'BL-02',
      title: 'Faroles · ¿Con cuál?',
      route: 'cash',
      module: 'M3',
      order: 22.6,
      plan: 'study',
      xp: 110,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'Mismo aire, distinto EV: eliges la mano que bloquea value/nuts y no bloquea folds. Extiende B-01.',
      theory: [
        'Regla de oro: al farolear quieres menos calls y más folds. Elige cartas que eliminan nuts/value del rival y evita cartas que eliminan basura que ya iba a tirar.',
        'En boards de color, el as del palo (A♥) es mejor farol que un corazón bajo. En K-high seco, A-high supera a QJ. En escaleras, blocker de nuts sin completar la mano.',
        'Conecta con BL-01: primero decides si el spot merece farol (sí/no); después eliges con qué combo de aire faroleas mejor.'
      ],
      examples: [{
        title: 'Hearts monotone',
        body: 'A♥5♦ > 5♥4♦ > 97 offsuit.'
      }],
      aiQuestions: [
        '¿Por qué A♥ > 5♥ para farolear?',
        '¿Qué bloquea QJ en K-high?',
        '¿Cómo conecta con B-01?'
      ],
      relatedLessons: [
        { id: 'B-01', label: 'B-01 · Blockers' },
        { id: 'BL-01', label: 'BL-01 · ¿Sí o no?' },
        { id: 'R-04', label: 'R-04 · Blockers teoría' }
      ],
      trainDrill: TRAIN_MAKE,
      spots: []
    },
    {
      id: 'BL-03',
      title: 'Semi-bluff → farol river',
      route: 'cash',
      module: 'M3',
      order: 22.7,
      plan: 'study',
      xp: 120,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'El semi-bluff tiene plan: equity ahora + farol si fallas. Sin equity ni blockers en river → give up.',
      theory: [
        'Semi-bluff (farol con equity) = bet o raise con draw (flush draw, OESD) que gana si foldean ahora o si mejoras en turn/river. Todavía no es farol puro.',
        'Si el draw falla en river, conviertes a farol solo cuando tienes blockers útiles, fold equity e historia coherente. Si no, check y cedes el bote.',
        'Trampa: barrel eterno de aire sin plan. El second barrel (segunda barrilada) pide equity real, scare card o blockers claros; si no, better give up.'
      ],
      examples: [{
        title: 'FD turn → miss river',
        body: 'K♥ en hearts: farol. 54o sin blocker: give up.'
      }],
      aiQuestions: [
        '¿Qué es un semi-bluff?',
        '¿Cuándo conviertes a farol river?',
        '¿Cuándo give up tras miss?'
      ],
      relatedLessons: [
        { id: 'C-22', label: 'C-22 · Check-raise semi' },
        { id: 'C-18', label: 'C-18 · Second barrel' },
        { id: 'BL-01', label: 'BL-01 · ¿Sí o no?' }
      ],
      trainDrill: Object.assign({}, TRAIN_MAKE, { practiceStreet: 'turn' }),
      spots: []
    },
    {
      id: 'BL-04',
      title: 'Bluff-catch · call o fold',
      route: 'cash',
      module: 'M3',
      order: 22.8,
      plan: 'coach',
      xp: 120,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'Cazar faroles: call con medium showdown vs sizing que incluye bluffs; fold vs polar extremo sin blockers.',
      theory: [
        'Un buen bluff-catcher tiene showdown value medio (top pair weak, middle pair, A-high fuerte) más blockers que reducen las manos de value del rival.',
        'El sizing importa: bet medio suele mezclar value y faroles (más calls). Overbet o shove es polar — más folds si no tienes un catcher de nuts.',
        'No conviertas un bluff-catcher en raise-bluff sin equity ni blockers. La decisión correcta casi siempre es call o fold, no raise inventado.'
      ],
      examples: [{
        title: '66% vs overbet',
        body: 'A9 second pair vs 66%: call. QT air vs overbet: fold.'
      }],
      aiQuestions: [
        '¿Qué hace buen bluff-catcher?',
        '¿Cómo cambia el sizing la decisión?',
        '¿Por qué no raise con catcher?'
      ],
      relatedLessons: [
        { id: 'C-24', label: 'C-24 · MDF' },
        { id: 'BL-01', label: 'BL-01 · ¿Sí o no?' },
        { id: 'D-02', label: 'D-02 · F/C/R' }
      ],
      trainDrill: TRAIN_CATCH,
      spots: []
    }
  ];

  D.registerLessons(LESSONS);
  D.LESSONS.forEach(function (lesson) {
    var spots = PACKS[lesson.id];
    if (!spots || !spots.length) return;
    if (Array.isArray(lesson.spots) && lesson.spots.length) return;
    lesson.spots = spots;
    lesson.hands = spots.length;
  });

  if (global.PTSchoolViralQuizzes) {
    global.PTSchoolViralQuizzes.BLUFF_PACKS = PACKS;
    var dailyExtra = []
      .concat(PACKS['BL-01'].slice(0, 2))
      .concat(PACKS['BL-02'].slice(0, 2));
    global.PTSchoolViralQuizzes.DAILY_POOL =
      (global.PTSchoolViralQuizzes.DAILY_POOL || []).concat(dailyExtra);
  }

  global.PTSchoolBluffLessons = {
    PACKS: PACKS,
    LESSON_IDS: ['BL-01', 'BL-02', 'BL-03', 'BL-04']
  };
})(typeof window !== 'undefined' ? window : globalThis);
