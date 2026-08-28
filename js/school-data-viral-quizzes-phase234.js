/*
 * school-data-viral-quizzes-phase234.js — Fases 2–4: sizing, RFI, equity,
 * texture, combos, examen cronometrado, Nash, ICM, nut adv, SPR.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  var V = global.PTSchoolViralQuizzes || {};

  function mcqSpot(id, kind, seed, quiz, teach, extra) {
    extra = extra || {};
    return {
      id: id,
      kind: kind,
      seed: seed,
      heroPos: extra.heroPos,
      teachBack: teach,
      trapTag: extra.trap,
      timedSeconds: extra.timedSeconds,
      quiz: quiz
    };
  }

  function sizingSpot(id, seed, heroPos, heroCards, board, line, sizes, correctId, teach, prompt) {
    return mcqSpot(id, 'sizingQuiz', seed, {
      prompt: prompt || '¿Qué sizing elige el solver?',
      line: line,
      board: board,
      heroCards: heroCards,
      heroPos: heroPos,
      options: sizes,
      correctId: correctId,
      teachBack: teach
    }, teach, { heroPos: heroPos });
  }

  function rfiSpot(id, seed, pos, hand, correctId, teach, prompt) {
    return mcqSpot(id, 'rfiQuiz', seed, {
      prompt: prompt || ('¿Abres ' + hand.join('') + ' desde ' + pos + '?'),
      position: pos,
      heroCards: hand,
      options: [
        { id: 'open', label: 'Open' },
        { id: 'fold', label: 'Fold' },
        { id: 'mix', label: 'Mix / marginal' }
      ],
      correctId: correctId,
      teachBack: teach
    }, teach, { heroPos: pos });
  }

  function equitySpot(id, seed, heroCards, board, villainRange, buckets, correctId, teach) {
    return mcqSpot(id, 'equityQuiz', seed, {
      prompt: '¿Cuál es tu equity aproximada?',
      heroCards: heroCards,
      board: board,
      villainRange: villainRange || 'Rango del villano',
      options: buckets,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  function textureSpot(id, seed, board, line, options, correctId, teach) {
    return mcqSpot(id, 'textureQuiz', seed, {
      prompt: '¿Cómo clasificas este flop?',
      board: board,
      line: line || '',
      options: options,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  function comboSpot(id, seed, board, line, handType, options, correctId, teach) {
    return mcqSpot(id, 'comboQuiz', seed, {
      prompt: '¿Cuántos combos de ' + handType + ' quedan?',
      board: board,
      line: line || '',
      handType: handType,
      options: options,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  function nashSpot(id, seed, pos, hand, stackBB, correctId, teach) {
    return mcqSpot(id, 'nashQuiz', seed, {
      prompt: 'Push o fold con ' + stackBB + ' bb efectivos',
      position: pos,
      heroCards: hand,
      stackBB: stackBB,
      options: [
        { id: 'shove', label: 'Shove' },
        { id: 'fold', label: 'Fold' }
      ],
      correctId: correctId,
      teachBack: teach
    }, teach, { heroPos: pos });
  }

  function icmSpot(id, seed, heroCards, stackBB, payout, options, correctId, teach, prompt) {
    return mcqSpot(id, 'icmQuiz', seed, {
      prompt: prompt || '¿Call o fold en burbuja?',
      heroCards: heroCards,
      stackBB: stackBB,
      payout: payout,
      options: options,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  function nutAdvSpot(id, seed, line, board, options, correctId, teach) {
    return mcqSpot(id, 'nutAdvQuiz', seed, {
      prompt: '¿Quién tiene nut advantage?',
      line: line,
      board: board,
      options: options,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  function sprSpot(id, seed, heroCards, board, potBB, stackBB, options, correctId, teach) {
    return mcqSpot(id, 'sprQuiz', seed, {
      prompt: 'SPR ' + Math.round(stackBB / potBB * 10) / 10 + ' · ¿Cuál es tu plan?',
      heroCards: heroCards,
      board: board,
      potBB: potBB,
      stackBB: stackBB,
      options: options,
      correctId: correctId,
      teachBack: teach
    }, teach);
  }

  var comboOpts = function (vals) {
    return vals.map(function (v) { return { id: String(v), label: String(v) + ' combos' }; });
  };
  var eqOpts = function () {
    return [
      { id: '25', label: '~25 %' },
      { id: '40', label: '~40 %' },
      { id: '55', label: '~55 %' },
      { id: '70', label: '~70 %' }
    ];
  };
  var sizeOpts = function () {
    return [
      { id: '33', label: '33 % pot' },
      { id: '50', label: '50 % pot' },
      { id: '75', label: '75 % pot' },
      { id: '125', label: 'Overbet 125 %' }
    ];
  };

  var PACKS = {};

  PACKS['D-03'] = [
    sizingSpot('d03-01', 87001, 'BTN', ['Ah', 'Kd'], ['As', '7d', '2c'], 'BTN open → BB call · Flop',
      sizeOpts(), '33', 'A-high seco IP: c-bet pequeño (~33 %) es estándar. El BB falla mucho; no hace falta overbet.'),
    sizingSpot('d03-02', 87002, 'BTN', ['Ts', 'Tc'], ['9s', '8s', '7h'], 'BTN open → BB call · Flop',
      sizeOpts(), '50', 'Board wet conectado: sizing medio o check. Si apuestas, 50 % o más polar — no 33 % automático.'),
    sizingSpot('d03-03', 87003, 'CO', ['Ad', 'Ac'], ['Kh', 'Qd', 'Jc'], 'CO open → BB call · Flop',
      sizeOpts(), '33', 'Overpair en board broadway conectado: protege con 33–50 %, no overbet sin nuts.'),
    sizingSpot('d03-04', 87004, 'BTN', ['7h', '6h'], ['As', '4d', '2c'], 'BTN open → BB call · Flop',
      sizeOpts(), '33', 'A-high seco con backdoors: 33 % frecuente. Overbet no tiene sentido con air.'),
    sizingSpot('d03-05', 87005, 'BB', ['Kh', 'Qh'], ['Ks', '9d', '4c', '2h'], 'BTN open → BB call · Turn barrel',
      sizeOpts(), '75', 'Turn value con top pair fuerte: 66–75 % extrae de peores Kx y draws.'),
    sizingSpot('d03-06', 87006, 'BTN', ['Jd', 'Jc'], ['Ts', '9c', '8d'], 'BTN open → BB call · Flop',
      sizeOpts(), '125', 'Overpair en board muy wet: overbet polariza — value de overpairs y bluffs con blockers.'),
    sizingSpot('d03-07', 87007, 'CO', ['Ah', '5h'], ['Qh', '8h', '3c', '2h', 'Kd'], 'River value thin',
      sizeOpts(), '50', 'River thin value: 50 % captura bluff-catchers sin espantar todo el rango.'),
    sizingSpot('d03-08', 87008, 'BTN', ['9s', '8s'], ['Kd', '7h', '2c'], 'Flop c-bet spot',
      sizeOpts(), '33', 'K72 rainbow IP: el clásico 33 %. No compliques en boards secos.'),
    sizingSpot('d03-09', 87009, 'HJ', ['Qs', 'Qd'], ['Ah', '8d', '3c'], 'Flop OOP',
      sizeOpts(), '50', 'Overpair OOP en A-high: 50 % protege vs Ax y draws mejor que 33 % pasivo.'),
    sizingSpot('d03-10', 87010, 'BTN', ['5h', '4h'], ['Js', 'Ts', '9d', '4c', '2h'], 'River bluff',
      sizeOpts(), '125', 'River bluff polarizado: overbet presiona el rango capped del caller.')
  ];

  PACKS['F-01'] = [
    rfiSpot('f01-01', 88001, 'UTG', ['Ah', 'Kd'], 'open', 'AKo UTG: open claro en 6-max 100 bb. Premium offsuit desde early.'),
    rfiSpot('f01-02', 88002, 'UTG', ['9h', '8h'], 'fold', '98s UTG: fold. Demasiado early para suited connectors medios.'),
    rfiSpot('f01-03', 88003, 'CO', ['Jh', 'Ts'], 'open', 'JTs CO: open. Broadway suited conectado en late-middle es estándar.'),
    rfiSpot('f01-04', 88004, 'BTN', ['7c', '2d'], 'fold', '72o BTN: fold. El botón abre wide, no cualquier basura offsuit.'),
    rfiSpot('f01-05', 88005, 'BTN', ['6s', '5s'], 'open', '65s BTN: open. Suited connector bajo en late es parte del rango wide.'),
    rfiSpot('f01-06', 88006, 'HJ', ['Kh', 'Jo'], 'mix', 'KJo HJ: mix/marginal. Muchos charts mezclan open/fold; no es slam dunk.'),
    rfiSpot('f01-07', 88007, 'CO', ['Td', '9d'], 'open', 'T9s CO: open. SC (suited connector) clásico desde cutoff.'),
    rfiSpot('f01-08', 88008, 'UTG', ['Qc', 'Qd'], 'open', 'QQ UTG: open por valor. Par premium siempre sube first in.'),
    rfiSpot('f01-09', 88009, 'SB', ['Kh', '8d'], 'fold', 'K8o SB: fold vs BB detrás. SB no es BTN: OOP si te pagan.'),
    rfiSpot('f01-10', 88010, 'BTN', ['As', '4s'], 'open', 'A4s BTN: open. Ax suited con wheel potential en late.')
  ];

  PACKS['E-01'] = [
    equitySpot('e01-01', 89001, ['Ah', 'Kh'], ['Qh', '7h', '2c'], 'Rango amplio BB', eqOpts(), '40',
      'Flush draw + overs ≈ 40–45 % vs rango wide. No es 70 % ni 25 %.'),
    equitySpot('e01-02', 89002, ['Ts', 'Tc'], ['Kd', '7h', '2c'], 'Rango BB defiende', eqOpts(), '70',
      'TT en K72: overpair ≈ 70 %+ vs rango de defensa que no conectó fuerte.'),
    equitySpot('e01-03', 89003, ['Jh', 'Td'], ['Qs', '8c', '2h', '3d'], 'Rango agresor', eqOpts(), '25',
      'Gutshot + overcards en turn: ~25 % — no alcanza para call grande sin implied.'),
    equitySpot('e01-04', 89004, ['9h', '8h'], ['Ts', '7c', '2d'], 'Rango BB', eqOpts(), '55',
      'OESD (8 outs) ≈ 32–35 % turn + overcards → bucket ~40 %, aquí 55 % con pair outs incluidos en spot.'),
    equitySpot('e01-05', 89005, ['As', 'Kd'], ['Ac', '7h', '3d', 'Kd', '2s'], 'Rango BB', eqOpts(), '70',
      'Two pair AK en A73-K-2: muy por delante del rango — ~70 %+.'),
    equitySpot('e01-06', 89006, ['7s', '6s'], ['As', 'Kd', 'Qc'], 'Rango 3-bettor', eqOpts(), '25',
      '76s en AKQ: casi 0 % real — bucket 25 % es la respuesta más baja razonable.'),
    equitySpot('e01-07', 89007, ['Kh', 'Qh'], ['Qd', '9c', '4h'], 'Rango caller', eqOpts(), '55',
      'Top pair KQ en Q94: ~55 % vs rango de call — ahead de mucho air y peores Qx.'),
    equitySpot('e01-08', 89008, ['5h', '4h'], ['Kh', '9d', '2c', '5s'], 'Rango agresor', eqOpts(), '40',
      'Middle pair + backdoor en turn: ~35–45 % — bucket 40 %.'),
    equitySpot('e01-09', 89009, ['Ah', '5h'], ['Kh', 'Qh', 'Jc', '2d'], 'Rango caller', eqOpts(), '40',
      'Nut flush draw + overs: combo draw ~40–45 % en turn.'),
    equitySpot('e01-10', 89010, ['Jd', 'Jc'], ['Ts', '9c', '8d', '3h'], 'Rango BB', eqOpts(), '55',
      'Overpair JJ en T98-3: ~55 % — board conectado reduce equity vs draws.')
  ];

  PACKS['Q-01'] = [
    textureSpot('q01-01', 90001, ['As', 'Kd', '7c'], 'UTG open → BB call', [
      { id: 'dry', label: 'Seco · RA opener' },
      { id: 'wet', label: 'Wet · RA caller' },
      { id: 'paired', label: 'Paired' }
    ], 'dry', 'AK7 rainbow: seco, favorece al opener early. C-bet pequeño frecuente.'),
    textureSpot('q01-02', 90002, ['9s', '8s', '7h'], 'BTN open → BB call', [
      { id: 'dry', label: 'Seco' },
      { id: 'wet', label: 'Wet · RA caller' },
      { id: 'paired', label: 'Paired' }
    ], 'wet', '987 two-tone: wet, el caller conecta SC y pares. Reduce c-bet automático.'),
    textureSpot('q01-03', 90003, ['Kh', 'Kc', '4d'], 'CO open → BB call', [
      { id: 'dry', label: 'Seco · paired' },
      { id: 'wet', label: 'Wet' },
      { id: 'monotone', label: 'Monotone' }
    ], 'dry', 'K44: paired seco. Opener mantiene ventaja con Kx/overpairs.'),
    textureSpot('q01-04', 90004, ['Qh', 'Jh', 'Th'], 'BTN open → BB call', [
      { id: 'dry', label: 'Seco' },
      { id: 'wet', label: 'Wet · connected' },
      { id: 'monotone', label: 'Monotone' }
    ], 'wet', 'QJT two-tone: muy conectado. Ambos conectan; ventaja poco clara.'),
    textureSpot('q01-05', 90005, ['Ah', '8d', '3c'], 'UTG open → BB call', [
      { id: 'dry', label: 'Seco · RA opener' },
      { id: 'wet', label: 'Wet' },
      { id: 'paired', label: 'Paired' }
    ], 'dry', 'A83 rainbow: clásico seco A-high. Ventaja enorme del agresor.'),
    textureSpot('q01-06', 90006, ['5s', '4s', '3h'], 'BTN open → BB call', [
      { id: 'dry', label: 'Seco' },
      { id: 'wet', label: 'Wet · low connected' },
      { id: 'paired', label: 'Paired' }
    ], 'wet', '543 two-tone bajo: caller favorecido. Board de defensa BB.'),
    textureSpot('q01-07', 90007, ['Js', 'Ts', '9s'], 'HJ open → BB call', [
      { id: 'dry', label: 'Seco' },
      { id: 'wet', label: 'Wet' },
      { id: 'monotone', label: 'Monotone · flush draws' }
    ], 'monotone', 'JT9 monotone: nut advantage al rango con más Ax suited del palo.'),
    textureSpot('q01-08', 90008, ['Kd', '7c', '2s'], 'BTN open → BB call', [
      { id: 'dry', label: 'Seco · RA opener' },
      { id: 'wet', label: 'Wet' },
      { id: 'paired', label: 'Paired' }
    ], 'dry', 'K72 rainbow: seco. Patrón de c-bet ligero IP.'),
    textureSpot('q01-09', 90009, ['6h', '6d', '5s'], 'CO open → BB call', [
      { id: 'dry', label: 'Seco · paired' },
      { id: 'wet', label: 'Wet · connected' },
      { id: 'paired', label: 'Paired medio' }
    ], 'paired', '665: paired + connected. Ambiguo — no es seco puro ni wet extremo.'),
    textureSpot('q01-10', 90010, ['Ac', 'Qd', '4h'], 'UTG open → BB call', [
      { id: 'dry', label: 'Seco · RA opener' },
      { id: 'wet', label: 'Wet' },
      { id: 'paired', label: 'Paired' }
    ], 'dry', 'AQ4 rainbow: seco A-high. Opener domina distribución Ax.')
  ];

  PACKS['Q-02'] = [
    comboSpot('q02-01', 91001, ['As', 'Kd', '7c'], 'Preflop UTG open', 'AK', comboOpts([4, 6, 9, 12]), '6',
      'Sin blockers visibles: AK offsuit = 12 combos, pero si hay As/Kd en board quedan ~6 combos de Ax/Kx relevantes.'),
    comboSpot('q02-02', 91002, ['Ah', 'Kh', 'Qh'], 'Monotone flop', 'nut flush', comboOpts([2, 4, 6, 9]), '4',
      'Monotone A-high: nut flush combos reducidos por blockers — ~4–6 según palo.'),
    comboSpot('q02-03', 91003, ['Ts', 'Tc', '4d'], 'Paired flop', 'TT', comboOpts([1, 3, 6, 9]), '3',
      'Board TT4: set de T queda 1 combo si tienes Tx; TT preflop quedan 3 combos (una T en board).'),
    comboSpot('q02-04', 91004, ['9s', '8s', '7h'], 'Wet flop', '98s', comboOpts([2, 4, 8, 12]), '4',
      '987: 98s conecta — quedan ~4 combos de 98 suited sin blockers en board.'),
    comboSpot('q02-05', 91005, ['Ks', '7d', '2c'], 'Dry flop', '77', comboOpts([3, 6, 9, 12]), '6',
      'K72 seco: 77 preflop = 6 combos (ningún 7 en board).'),
    comboSpot('q02-06', 91006, ['Ac', 'Ad', '7h'], 'Paired A', 'AA', comboOpts([1, 3, 6, 9]), '1',
      'Board AA7: solo queda 1 combo de AA (dos ases en board).'),
    comboSpot('q02-07', 91007, ['Qh', 'Jh', '4c', '2d', 'Ks'], 'River', 'KQ', comboOpts([4, 8, 12, 16]), '8',
      'River K en QJ42: KQ offsuit pierde combos por blockers — ~8–9 restantes.'),
    comboSpot('q02-08', 91008, ['5h', '4h', '3d'], 'Low connected', '54s', comboOpts([2, 4, 6, 8]), '4',
      '543: 54s conecta — 4 combos base sin blockers.'),
    comboSpot('q02-09', 91009, ['Js', 'Ts', '9d', '4c', '2h'], 'Turn raise line', 'JT', comboOpts([6, 9, 12, 16]), '9',
      'JT9 board: JT suited ~9 combos sin blockers fuertes en línea agresiva.'),
    comboSpot('q02-10', 91010, ['Ah', '8d', '3c', 'Kd', '2s'], 'River', 'A8', comboOpts([8, 12, 16, 20]), '12',
      'A83-K-2: A8 offsuit ~12 combos preflop; blockers en board reducen sets/two pair.')
  ];

  PACKS['N-01'] = [
    nashSpot('n01-01', 92001, 'BTN', ['Ah', 'Kd'], 10, 'shove', 'AKo 10 bb BTN: shove claro Nash. Premium + fold equity.'),
    nashSpot('n01-02', 92002, 'BTN', ['7h', '2d'], 10, 'fold', '72o 10 bb BTN: fold. Fuera del rango push incluso en late.'),
    nashSpot('n01-03', 92003, 'SB', ['Kh', 'Qs'], 12, 'shove', 'KQs 12 bb SB: shove por fold equity vs BB. Mano fuerte short.'),
    nashSpot('n01-04', 92004, 'BTN', ['Ts', 'Tc'], 8, 'shove', 'TT 8 bb: shove. Par medio+ es push en 8–10 bb desde BTN.'),
    nashSpot('n01-05', 92005, 'SB', ['9c', '4h'], 10, 'fold', '94o SB 10 bb: fold. Basura OOP short — no spew.'),
    nashSpot('n01-06', 92006, 'BTN', ['7s', '6s'], 10, 'shove', '76s 10 bb BTN: shove. SC suited entra en rango push late short.'),
    nashSpot('n01-07', 92007, 'BB', ['Ah', '5h'], 8, 'shove', 'A5s 8 bb BB vs open: reshove/fold spot — shove por blockers + equity.'),
    nashSpot('n01-08', 92008, 'BTN', ['Jh', '9h'], 12, 'shove', 'J9s 12 bb: shove marginal pero dentro del rango wide BTN short.'),
    nashSpot('n01-09', 92009, 'SB', ['Qd', 'Jo'], 10, 'fold', 'QJo SB 10 bb: fold vs BB. Dominado por AQ/KQ y mejor shove con manos más puras.'),
    nashSpot('n01-10', 92010, 'BTN', ['5h', '5c'], 8, 'shove', '55 8 bb BTN: shove. Par bajo pero suficiente equity + FE short.')
  ];

  PACKS['I-01'] = [
    icmSpot('i01-01', 93001, ['Ah', 'Kd'], 12, 'Burbuja · 4 pagados / 5 left', [
      { id: 'call', label: 'Call · ICM ok' },
      { id: 'fold', label: 'Fold · ICM fold' },
      { id: 'depends', label: 'Depende del payout' }
    ], 'fold', 'AKo 12 bb burbuja vs shove de stack similar: fold ICM frecuente — survival > chip EV.'),
    icmSpot('i01-02', 93002, ['Qs', 'Qh'], 15, 'Burbuja · chip leader presiona', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'shove', label: 'Reshove' }
    ], 'call', 'QQ 15 bb vs open burbuja: call/reshove. Demasiado fuerte para fold ICM.'),
    icmSpot('i01-03', 93003, ['Jh', 'Th'], 10, 'Burbuja · medium stack', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'depends', label: 'Depende' }
    ], 'fold', 'JTs 10 bb burbuja vs 3-bet shove: fold. Dominated y ICM penaliza riesgo.'),
    icmSpot('i01-04', 93004, ['Ac', '5c'], 8, 'Burbuja · short stack', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'shove', label: 'Shove' }
    ], 'shove', 'A5s 8 bb short burbuja: shove/fold — no hay call. Maximiza fold equity.'),
    icmSpot('i01-05', 93005, ['Kh', 'Qd'], 20, 'Pre-burbuja · 8 pagados', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'depends', label: 'Depende' }
    ], 'call', 'Pre-burbuja: chip EV pesa más. KQo vs open → call defendible 20 bb.'),
    icmSpot('i01-06', 93006, ['9d', '9c'], 14, 'Burbuja · vs shove', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'depends', label: 'Depende' }
    ], 'depends', '99 burbuja vs shove: depende de pagos y stack del shover — marginal ICM.'),
    icmSpot('i01-07', 93007, ['7s', '6s'], 11, 'Burbuja · CO open', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'shove', label: 'Shove' }
    ], 'fold', '76s burbuja: fold vs open+pressure. SC no compensa ICM risk.'),
    icmSpot('i01-08', 93008, ['Ad', 'Jc'], 18, 'FT · 3-handed', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'depends', label: 'Depende' }
    ], 'call', 'AJ 18 bb mesa final 3-max: call vs shove — demasiado equity para fold.'),
    icmSpot('i01-09', 93009, ['Td', '8d'], 9, 'Burbuja · BB defend', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'depends', label: 'Depende' }
    ], 'fold', 'T8o 9 bb burbuja vs open: fold. ICM + domination → tirar.'),
    icmSpot('i01-10', 93010, ['Kh', 'Kh'], 25, 'Burbuja · chip leader', [
      { id: 'call', label: 'Call' },
      { id: 'fold', label: 'Fold' },
      { id: 'shove', label: 'Reshove' }
    ], 'shove', 'KK chip leader burbuja vs 4-bet shove: reshove. Nunca fold.')
  ];

  PACKS['R-34'] = [
    nutAdvSpot('r34-01', 94001, 'BTN open → BB call', ['As', '7h', '2c'], [
      { id: 'a', label: 'Opener (nut adv)' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'A72 rainbow: opener tiene más nutted Ax/sets. Nut adv + range adv al agresor.'),
    nutAdvSpot('r34-02', 94002, 'BTN open → BB 3-bet → BTN call', ['Qh', 'Jh', 'Th'], [
      { id: 'a', label: '3-bettor (BB)' },
      { id: 'b', label: 'Caller (BTN)' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'QJT monotone: 3-bettor tiene más Ax suited del palo → nut flush advantage.'),
    nutAdvSpot('r34-03', 94003, 'UTG open → BB call', ['Ks', 'Qs', 'Js'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'c', 'KQJ rainbow: ambos tienen nut straight combos — nut adv repartida.'),
    nutAdvSpot('r34-04', 94004, 'BTN open → BB call', ['9s', '8s', '7h'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller (nut adv draws)' },
      { id: 'c', label: 'Empate' }
    ], 'b', '987: caller tiene más combos que hacen straight/flush fuerte — nut adv al BB.'),
    nutAdvSpot('r34-05', 94005, 'CO open → BB call', ['Ah', 'Kh', 'Qh'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'AKQ monotone: opener/early tiene más nut flushes y broadway nutted.'),
    nutAdvSpot('r34-06', 94006, 'BTN open → BB call', ['Kd', '7c', '2s'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'K72 seco: nut adv leve al opener (sets/KK) — no es board de nuts múltiples.'),
    nutAdvSpot('r34-07', 94007, 'BB 3-bet vs BTN', ['5h', '4h', '3d'], [
      { id: 'a', label: '3-bettor (BB)' },
      { id: 'b', label: 'Caller (BTN)' },
      { id: 'c', label: 'Empate' }
    ], 'b', '543: caller wide conecta 54/65 — nut straight adv al caller relativo.'),
    nutAdvSpot('r34-08', 94008, 'UTG open → BB call', ['Ac', 'Ad', '7h'], [
      { id: 'a', label: 'Opener (AA combos)' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'AA7 paired: opener tiene más full houses/trips fuertes — nut adv claro.'),
    nutAdvSpot('r34-09', 94009, 'BTN open → BB call', ['Ts', '9c', '8d'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'c', 'T98 rainbow: nut adv repartida — ambos tienen Jx/QJ para nuts.'),
    nutAdvSpot('r34-10', 94010, 'HJ open → BB call', ['Js', 'Ts', '9s'], [
      { id: 'a', label: 'Opener' },
      { id: 'b', label: 'Caller' },
      { id: 'c', label: 'Empate' }
    ], 'a', 'JT9 monotone: opener tight tiene más Ax del palo → nut flush adv.')
  ];

  PACKS['D-04'] = [
    sprSpot('d04-01', 95001, ['Ah', 'Kd'], ['As', '7d', '2c'], 6, 100, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'stackoff', 'SPR ~16 con TPTK en seco: puedes stack-off vs agresión — demasiado fuerte para pot control.'),
    sprSpot('d04-02', 95002, ['Ts', 'Tc'], ['9s', '8s', '7h'], 12, 80, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'pot', 'SPR ~6.7 overpair en wet board: pot control — no stack-off sin read fuerte.'),
    sprSpot('d04-03', 95003, ['7h', '6h'], ['Kh', '9d', '2c', '5s'], 20, 40, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'fold', 'SPR ~2 con middle pair weak: fold vs presión — committed solo con nuts/draws fuertes.'),
    sprSpot('d04-04', 95004, ['Ah', 'Qh'], ['Qd', '9c', '4h', '2s', 'Kh'], 30, 45, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'pot', 'SPR ~1.5 top pair: pot control/call down — no raise river sin nuts.'),
    sprSpot('d04-05', 95005, ['Jd', 'Jc'], ['Ts', '9c', '8d', '3h'], 18, 90, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'pot', 'SPR ~5 overpair en wet: pot control turn — evalúa river.'),
    sprSpot('d04-06', 95006, ['Kh', 'Kh'], ['As', 'Kd', '7c'], 8, 120, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'stackoff', 'SPR ~15 con KK en AK7: stack-off vs Ax — demasiado fuerte para fold.'),
    sprSpot('d04-07', 95007, ['9h', '8h'], ['Ts', '7d', '2c', 'Jc'], 14, 28, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'fold', 'SPR ~2 con pair medio: fold vs bet grande — no estás committed.'),
    sprSpot('d04-08', 95008, ['As', '5s'], ['Ac', '8d', '3c', 'Kd', '2h'], 25, 50, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'pot', 'SPR ~2 top pair weak: pot control — bluff-catch, no stack-off.'),
    sprSpot('d04-09', 95009, ['Qh', 'Qd'], ['Qc', 'Jd', 'Ts'], 10, 100, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'stackoff', 'SPR ~10 set en QJT: stack-off — nuts o casi nuts.'),
    sprSpot('d04-10', 95010, ['5s', '4s'], ['As', 'Kd', 'Qc', 'Jh'], 22, 30, [
      { id: 'stackoff', label: 'Stack-off' },
      { id: 'pot', label: 'Pot control' },
      { id: 'fold', label: 'Fold' }
    ], 'fold', 'SPR ~1.4 con air: fold — no estás committed con nada.')
  ];

  /* Examen cronometrado: mezcla decisionQuiz con 75 s/spot */
  var timedBase = (V.PACKS && V.PACKS['D-01']) ? V.PACKS['D-01'].slice(0, 10) : [];
  PACKS['X-01'] = timedBase.map(function (s, i) {
    var copy = JSON.parse(JSON.stringify(s));
    copy.id = 'x01-' + String(i + 1).padStart(2, '0');
    copy.timedSeconds = 75;
    return copy;
  });

  var LESSONS = [
    { id: 'D-03', title: '¿Qué sizing? · C-bet y barrels', route: 'cash', module: 'M2', order: 20.8, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'El sizing comunica polaridad y fuerza. Seco → pequeño; wet → medio/check; value river → tamaño que extrae calls.',
      theory: [
        'En flops secos y con ventaja de rango IP, el c-bet pequeño (~33 % del bote) es el default GTO: el villano falla mucho y no necesitas hinchar el bote.',
        'En boards wet o cuando tu rango está capped, sube el sizing o check: un tamaño único en todos los flops es leak clásico de reglas mal aprendidas.',
        'En river polarizado, overbet comunica nuts o bluff con blockers; el tamaño debe extraer calls de manos medias, no solo hacer foldear air.'
      ],
      examples: [{ title: 'K72 IP', body: 'C-bet 33 %. El BB falla; no necesitas hinchar el bote.' }],
      aiQuestions: ['¿Cuándo 33 % vs 75 %?', '¿Qué sizing en river bluff?', '¿Overbet sin nuts?'], spots: [] },
    { id: 'F-01', title: '¿Open o fold? · RFI rápido', route: 'cash', module: 'M0', order: 6.5, plan: 'free',
      xp: 80, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'RFI (raise first in) depende de posición y mano. UTG tight, BTN wide. Entrena el umbral sin abrir basura.',
      theory: [
        'RFI (raise first in) depende de cuántos jugadores actúan detrás: UTG abre tight, BTN wide, y SB no es BTN porque juegas OOP si te pagan.',
        'A igual rango nominal, las suited suelen open antes que offsuit: más equity de flush y mejor playabilidad postflop en spots marginales.',
        'El botón «Mix / marginal» marca manos de frecuencia mixta en solver: no son auto-open ni auto-fold; repasa el umbral antes de automatizar.'
      ],
      examples: [{ title: '76s BTN', body: 'Open. 72o BTN: fold.' }],
      aiQuestions: ['¿Abres KJo UTG?', '¿Qué cambia en SB?', '¿Qué es mix?'], spots: [] },
    { id: 'E-01', title: 'Estima tu equity', route: 'cash', module: 'M2', order: 20.9, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'Antes del solver, entrena buckets de equity (~25/40/55/70 %). Conecta con pot odds y decisiones.',
      theory: [
        'Antes de mirar pot odds finos, entrena buckets de equity (~25 / 40 / 55 / 70 %): acelera decisiones en mesa sin abrir la calculadora.',
        'Un flush draw en turn suele rondar ~35 % de equity vs un rango amplio; un overpair en flop seco puede estar en 65–75 % contra defensas wide.',
        'Un gutshot (~4 outs) cae en el bucket ~25 %: conecta con pot odds y te evita pagar draws débiles por «sensación» de equity.'
      ],
      examples: [{ title: 'FD turn', body: '~40 % bucket vs rango amplio.' }],
      aiQuestions: ['¿Equity de FD?', '¿Overpair en K72?', '¿Gutshot bucket?'], spots: [] },
    { id: 'Q-01', title: 'Clasifica el board', route: 'cash', module: 'M0', order: 6.6, plan: 'free',
      xp: 80, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'Seco, wet, paired, monotone — la textura dicta plan antes de mirar tu mano.',
      theory: [
        'Board seco (p. ej. K72 rainbow): pocos draws, el agresor IP puede c-bet frecuente con tamaño pequeño; clasifica antes de mirar tu mano.',
        'Board wet (conectado o two-tone): muchos straights y flushes posibles; check y tamaños medios dominan frente a rangos que conectan.',
        'Board monotone o paired cambia quién tiene nut advantage: el palo del flop o el par en mesa dictan faroles, calls y sizings distintos.'
      ],
      examples: [{ title: 'AK7 vs 987', body: 'Seco vs wet — respuesta distinta.' }],
      aiQuestions: ['¿Qué es wet?', '¿Monotone?', '¿Paired?'], spots: [] },
    { id: 'Q-02', title: '¿Cuántos combos quedan?', route: 'ranges', module: 'M1', order: 4.8, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'Contar combos tras blockers en board y línea. Puente entre R-04 y lectura de villano.',
      theory: [
        'Preflop: 6 combos por pareja, 4 suited y 12 offsuit por mano no pareja; esa aritmética base alimenta todos los conteos postflop.',
        'Cada carta en board o en tu mano bloquea combos rivales: un As en tu mano quita AA y muchos Ax del rango que enfrentas.',
        'Una línea agresiva (open + c-bet + barrel) elimina basura del rango rival: al contar combos, recorta lo que ya habría foldado.'
      ],
      examples: [{ title: 'AA en board Axx', body: 'Queda 1 combo de AA.' }],
      aiQuestions: ['¿Combos de AK?', '¿Blockers en monotone?', '¿Paired board?'], spots: [] },
    { id: 'X-01', title: 'Examen · F/C/R bajo presión', route: 'cash', module: 'M2', order: 21, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0, exam: true, timedSeconds: 75,
      concept: 'Examen cronometrado: 75 s por spot. Entrena decisión rápida como en mesa real.',
      theory: [
        'En examen cronometrado lee línea + board en los primeros 10 s: identifica quién es el agresor, el tamaño del bote y si estás IP u OOP.',
        'Elimina opciones imposibles antes de debatir entre dos líneas plausibles: muchos errores vienen de considerar raise donde solo existe fold.',
        '75 s por spot simula presión de mesa online: confía en patrones entrenados (textura, sizing, SPR) en lugar de overthink infinito.'
      ],
      examples: [{ title: 'Presión temporal', body: '75 s/spot simula reloj del operador.' }],
      aiQuestions: ['¿Cómo priorizar?', '¿Cuándo fold rápido?', '¿Presión en examen?'], spots: [] },
    { id: 'N-01', title: 'Push / fold · Nash Spin', route: 'spin', module: 'M1', order: 6.5, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'Short stack Spin: shove o fold según Nash. 8–12 bb cambia todo vs cash 100 bb.',
      theory: [
        'En Spin short (8–12 bb efectivos), Nash push/fold reemplaza opens tradicionales: BTN abre wide en shove, SB no es BTN porque el BB sigue vivo.',
        'Manos premium y pares medios-altos suelen ser shove automático short; basura offsuit fold aunque «tenga blockers» sin fold equity real.',
        'La profundidad en bb cambia todo vs cash 100 bb: entrena el umbral por posición antes de importar rangos deep sin ajustar.'
      ],
      examples: [{ title: 'TT 8 bb BTN', body: 'Shove.' }],
      aiQuestions: ['¿72o 10 bb?', '¿KQs SB?', '¿ICM en Spin?'], spots: [] },
    { id: 'I-01', title: 'ICM · Burbuja y FT', route: 'mtt', module: 'M4', order: 20.5, plan: 'coach',
      xp: 110, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'ICM (Independent Chip Model): en burbuja, survival puede pesar más que chip EV. Fold manos que callearías en cash.',
      theory: [
        'ICM (Independent Chip Model) traduce fichas a € en torneo: en burbuja, saltar gente paga más que ganar un flip marginal en fichas.',
        'Short stack en burbuja: shove/fold claro; medium stack sufre vs chip leader; no callees light solo porque «tienes odds en fichas».',
        'Pre-burbuja puedes jugar más chip EV; cerca de jumps y FT, survival y presión sobre rivales medianos pesan más que maximizar bote.'
      ],
      examples: [{ title: 'AKo burbuja', body: 'Fold vs shove similar stack — ICM.' }],
      aiQuestions: ['¿Qué es ICM?', '¿QQ burbuja?', '¿Pre-burbuja?'], spots: [] },
    { id: 'R-34', title: 'Nut Advantage · Nuts vs rango', route: 'ranges', module: 'M3', order: 12.8, plan: 'coach',
      xp: 110, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'Nut advantage ≠ range advantage: quién tiene más combos nutted (flush/straight/set top).',
      theory: [
        'Nut advantage mide quién tiene más combos nutted (flush, straight top, full house) — no confundir con range advantage genérico en el flop.',
        'En flop monotone, el Ax suited del palo del board suele dar nut flush advantage al rango que lo incluye con más frecuencia (típicamente opener).',
        'En boards conectados el caller puede tener más straights two-pair; en paired boards los full houses se concentran en rangos tight.'
      ],
      examples: [{ title: 'AKQ monotone', body: 'Opener nut flush adv.' }],
      aiQuestions: ['Nut vs range adv?', '987 nut adv?', 'AA7 paired?'], spots: [] },
    { id: 'D-04', title: 'SPR · ¿Estás committed?', route: 'cash', module: 'M2', order: 21.1, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 0,
      concept: 'SPR (stack-to-pot ratio) = stack efectivo / bote. Bajo SPR → committed con top pair+; alto → pot control.',
      theory: [
        'SPR (stack-to-pot ratio) = stack efectivo ÷ bote; con SPR bajo (<4) top pair fuerte suele estar committed, con SPR alto pot control domina.',
        'Middle pair o draw débil con SPR ~2 no está committed: fold vs presión grande aunque «tengas odds» si no puedes realizar equity.',
        'No stack-off light solo porque el bote ya es grande: pregunta qué manos peores te pagan y cuáles te tienen dominado antes de ir all-in.'
      ],
      examples: [{ title: 'SPR ~2 middle pair', body: 'Fold vs presión.' }],
      aiQuestions: ['¿Qué es SPR?', '¿Stack-off cuándo?', '¿Pot control?'], spots: [] }
  ];

  D.registerLessons(LESSONS);
  D.LESSONS.forEach(function (lesson) {
    var spots = PACKS[lesson.id];
    if (!spots || !spots.length) return;
    if (Array.isArray(lesson.spots) && lesson.spots.length) return;
    lesson.spots = spots;
    lesson.hands = spots.length;
  });

  var extraDaily = []
    .concat(PACKS['D-03'].slice(0, 2))
    .concat(PACKS['F-01'].slice(0, 2))
    .concat(PACKS['E-01'].slice(0, 1))
    .concat(PACKS['Q-01'].slice(0, 1));

  if (global.PTSchoolViralQuizzes) {
    global.PTSchoolViralQuizzes.PHASE234_PACKS = PACKS;
    global.PTSchoolViralQuizzes.DAILY_POOL = (global.PTSchoolViralQuizzes.DAILY_POOL || []).concat(extraDaily);
  }
})(typeof window !== 'undefined' ? window : globalThis);
