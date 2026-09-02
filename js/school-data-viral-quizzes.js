/*
 * school-data-viral-quizzes.js — Quizzes virales: decisionQuiz, oddsQuiz, blockerQuiz.
 * Lecciones D-01, D-02, O-01, B-01 + pool Daily Spot.
 * Cargar tras school-data-practice.js.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;

  function decisionSpot(id, seed, heroPos, heroCards, board, line, lineStory, correctId, teach, extra) {
    extra = extra || {};
    return {
      id: id,
      kind: 'decisionQuiz',
      seed: seed,
      heroPos: heroPos,
      teachBack: teach,
      trapTag: extra.trap || undefined,
      quiz: {
        prompt: extra.prompt || '¿Qué haces?',
        line: line,
        lineStory: lineStory || [],
        board: board,
        heroCards: heroCards,
        villainPos: extra.villainPos || 'BB',
        options: [
          { id: 'fold', label: 'Fold' },
          { id: 'call', label: 'Call' },
          { id: 'raise', label: 'Raise' }
        ],
        correctId: correctId,
        teachBack: teach
      }
    };
  }

  function oddsSpot(id, seed, potBB, betBB, draw, heroCards, board, correctId, teach, extra) {
    extra = extra || {};
    return {
      id: id,
      kind: 'oddsQuiz',
      seed: seed,
      teachBack: teach,
      quiz: {
        prompt: extra.prompt || '¿Tienes pot odds para call?',
        potBB: potBB,
        betBB: betBB,
        draw: draw,
        heroCards: heroCards,
        board: board,
        options: [
          { id: 'yes', label: 'Sí · call correcto' },
          { id: 'no', label: 'No · fold' },
          { id: 'depends', label: 'Depende · implied odds' }
        ],
        correctId: correctId,
        requiredPct: extra.requiredPct,
        equityPct: extra.equityPct
      }
    };
  }

  function blockerSpot(id, seed, board, villainAction, options, correctId, teach) {
    return {
      id: id,
      kind: 'blockerQuiz',
      seed: seed,
      teachBack: teach,
      quiz: {
        prompt: 'River: las tres manos son aire (sin pareja hecha). ¿Con cuál faroleas mejor?',
        board: board,
        villainAction: villainAction,
        options: options,
        correctId: correctId,
        teachBack: teach
      }
    };
  }

  function handOpt(id, label, cards, why) {
    return { id: id, label: label, cards: cards, why: why || '' };
  }

  var PACKS = {};

  PACKS['D-01'] = [
    decisionSpot('d01-01', 84001, 'BB', ['Ah', 'Qd'], ['As', 'Kd', '7c', '2h', '5d'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn bet 75% pot → call · River bet 75% pot',
      [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'BTN c-bet 33% pot · BB call' },
        { street: 'Turn', text: 'BTN bet 75% pot · BB call' },
        { street: 'River', text: 'BB check · BTN bet 75% pot' }
      ],
      'fold',
      'AQ en river tras triple barrel en AK7-2-5: estás detrás de mucho Ax/Kx y value. Fold es la línea GTO típica.',
      { prompt: 'River: villano apuesta tras check. ¿Qué haces con AQ?', villainPos: 'BTN' }),
    decisionSpot('d01-02', 84002, 'BTN', ['Ts', 'Tc'], ['9d', '7h', '2c'],
      'BTN open → BB call · Flop check-check',
      [
        { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
        { street: 'Flop', text: 'BB check · BTN ?' }
      ],
      'raise',
      'TT en 972 rainbow IP tras check del BB: c-bet (raise el bote) es estándar. El BB falla mucho; tu overpair necesita protección.',
      { prompt: 'Flop: BB check. ¿Qué haces con TT?' }),
    decisionSpot('d01-03', 84003, 'BB', ['9h', '8h'], ['Ts', '9d', '2c', 'Jc', '3h'],
      'BTN open → BB call · Flop check · BTN bet 50% → call · Turn check-check · River BTN bet 66% pot',
      [
        { street: 'Turn', text: 'BB check · BTN check' },
        { street: 'River', text: 'BB check · BTN bet 66% pot' }
      ],
      'call',
      '98s hace middle pair en T92-J-3. Vs sizing medio en river delay, call es defendible: bloqueas muchos bluffs y tienes showdown value.',
      { prompt: 'River: facing bet. ¿Call con 98s?', villainPos: 'BTN' }),
    decisionSpot('d01-04', 84004, 'BTN', ['Kh', 'Qh'], ['9s', '8s', '7h'],
      'BTN open → BB call · Flop check-check',
      [
        { street: 'Preflop', text: 'BTN open → BB call' },
        { street: 'Flop', text: 'BB check · BTN ?' }
      ],
      'fold',
      '987 two-tone: el BB conecta fuerte. KQs sin draw claro → check behind (no bet). Apostar aquí es spew.',
      { prompt: 'Flop wet: BB check. ¿Qué haces con KQs?' }),
    decisionSpot('d01-05', 84005, 'CO', ['Ad', 'Jc'], ['As', '4d', '2c', '9h'],
      'CO open → BB call · Flop c-bet 33% → call · Turn check · BB bet 75% pot',
      [
        { street: 'Turn', text: 'CO check · BB bet 75% pot' }
      ],
      'call',
      'AJ top pair en A-high seco: vs turn probe del BB, call. Estás ahead de muchos floats y draws que no llegaron.',
      { prompt: 'Turn: facing donk. ¿Qué haces con AJ?', villainPos: 'BB' }),
    decisionSpot('d01-06', 84006, 'BTN', ['7s', '6s'], ['Kh', '9d', '2c', '5h'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn check · BB bet 75% pot',
      [
        { street: 'Turn', text: 'BTN check · BB bet 75% pot' }
      ],
      'fold',
      '76s sin par ni draw claro en K92-5: fold vs turn barrel. No tienes equity ni showdown value suficiente.',
      { prompt: 'Turn: facing bet. ¿Qué haces con 76s?', villainPos: 'BB' }),
    decisionSpot('d01-07', 84007, 'BB', ['Ah', '5h'], ['Qs', '8d', '3c', '2h', 'Jd'],
      'BTN open → BB call · Flop check · BTN bet 50% → call · Turn check · BTN bet 75% → call · River BTN bet overbet',
      [
        { street: 'River', text: 'BB check · BTN overbet 125% pot' }
      ],
      'fold',
      'A5s solo tiene A-high en river tras línea agresiva. Fold vs overbet: estás casi siempre behind.',
      { prompt: 'River: facing overbet. ¿Qué haces?', villainPos: 'BTN' }),
    decisionSpot('d01-08', 84008, 'BTN', ['Jd', 'Jc'], ['Ts', '9c', '2d', '4h', '8s'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn bet 75% → call · River check · BB bet 75% pot',
      [
        { street: 'River', text: 'BTN check · BB bet 75% pot' }
      ],
      'call',
      'JJ sigue siendo overpair en T92-4-8. Vs river bet del BB (bluff-heavy), call captura value y bluffs.',
      { prompt: 'River: facing bet. ¿Qué haces con JJ?', villainPos: 'BB' }),
    decisionSpot('d01-09', 84009, 'BTN', ['As', 'Kd'], ['Ac', '7h', '3d', 'Kd', '2s'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn bet 75% → call · River check · BB bet 50% pot',
      [
        { street: 'River', text: 'BTN check · BB bet 50% pot' }
      ],
      'raise',
      'AK two pair en A73-K-2: raise river vs bet es value. Estás muy por delante del rango de bluff-catch del BB.',
      { prompt: 'River: tienes two pair. ¿Qué haces?', villainPos: 'BB' }),
    decisionSpot('d01-10', 84010, 'CO', ['Qc', 'Qd'], ['Ah', '8d', '3c'],
      'CO open → BB call · Flop check-check',
      [
        { street: 'Flop', text: 'BB check · CO ?' }
      ],
      'raise',
      'QQ en A83 rainbow IP: bet (raise pot) por valor/protección. El BB tiene mucho air; tu underpair a A sigue queriendo bote vs floats.',
      { prompt: 'Flop: BB check. ¿Qué haces con QQ?' }),
    decisionSpot('d01-11', 84011, 'BB', ['Kh', 'Td'], ['Ks', '7d', '2c', '9h', '4s'],
      'BTN open → BB call · Flop check · BTN bet 33% → call · Turn check · BTN bet 66% → call · River BTN bet 75% pot',
      [
        { street: 'River', text: 'BB check · BTN bet 75% pot' }
      ],
      'fold',
      'KT top pair weak kicker en K72-9-4: vs triple barrel IP, fold. Estás dominated por KQ/KJ/77/99 y value.',
      { prompt: 'River: facing bet. ¿Qué haces con KT?', villainPos: 'BTN' }),
    decisionSpot('d01-12', 84012, 'BTN', ['5s', '4s'], ['As', 'Kd', 'Qc', 'Jh', '3d'],
      'BTN open → BB call · Flop c-bet 33% → call · Turn check-check · River BB check',
      [
        { street: 'Turn', text: 'BTN check · BB check' },
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'fold',
      '54s sin par ni draw en AKQ-J-3: check back (no bet). No hay bluff creíble ni value — fold si te resuben.',
      { prompt: 'River: BB check. ¿Qué haces con 54s?' })
  ];

  PACKS['D-02'] = [
    decisionSpot('d02-01', 84101, 'BTN', ['Ah', 'Kd'], ['As', '7d', '2c'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% pot',
      [
        { street: 'Preflop', text: 'BTN open → BB 3-bet → BTN call' },
        { street: 'Flop', text: 'BB bet 33% pot · BTN ?' }
      ],
      'call',
      'AK en A72 en 3-bet pot: call flop c-bet. Tienes top pair top kicker vs rango polar del 3-bettor.',
      { prompt: '3-bet pot · Flop: facing c-bet. ¿Qué haces con AK?', villainPos: 'BB' }),
    decisionSpot('d02-02', 84102, 'BB', ['Jh', 'Th'], ['Qc', '9d', '4s', '2h'],
      'BTN open → BB 3-bet → BTN call · Flop check · BTN bet 50% → call · Turn check · BTN bet 75% pot',
      [
        { street: 'Turn', text: 'BB check · BTN bet 75% pot' }
      ],
      'fold',
      'JTs sin par en Q94-2 en 3-bet pot OOP: fold vs turn barrel. El BTN tiene mucho overpair/broadway.',
      { prompt: '3-bet pot · Turn: facing bet. ¿Qué haces?', villainPos: 'BTN' }),
    decisionSpot('d02-03', 84103, 'BTN', ['Qs', 'Qh'], ['Kh', '9c', '3d'],
      'BTN open → BB 3-bet → BTN call · Flop BB check',
      [
        { street: 'Flop', text: 'BB check · BTN ?' }
      ],
      'raise',
      'QQ en K93 en 3-bet pot IP: bet flop tras check. Underpair a K con plan claro; el BB check indica rango capped.',
      { prompt: '3-bet pot · Flop: BB check. ¿Qué haces con QQ?', villainPos: 'BB' }),
    decisionSpot('d02-04', 84104, 'BB', ['Ac', '5c'], ['Ad', '8h', '3c', 'Kd', '2s'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% → call · Turn check · BTN bet 66% → call · River BTN bet 75% pot',
      [
        { street: 'River', text: 'BB check · BTN bet 75% pot' }
      ],
      'fold',
      'A5s solo top pair weak en A83-K-2 vs river bet en 3-bet pot: fold. Estás behind en value y bluff-catch.',
      { prompt: '3-bet pot · River: facing bet. ¿Qué haces?', villainPos: 'BTN' }),
    decisionSpot('d02-05', 84105, 'BTN', ['Ts', 'Tc'], ['9s', '8s', '7h'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 50% pot',
      [
        { street: 'Flop', text: 'BB bet 50% pot · BTN ?' }
      ],
      'fold',
      'TT en 987 two-tone en 3-bet pot: fold vs flop bet. El board favorece al 3-bettor OOP; tu overpair está en mal sitio.',
      { prompt: '3-bet pot · Flop wet: facing bet. ¿Qué haces con TT?', villainPos: 'BB' }),
    decisionSpot('d02-06', 84106, 'BTN', ['Kh', 'Qh'], ['Ah', '7h', '2c', '5d'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% → call · Turn BB bet 75% pot',
      [
        { street: 'Turn', text: 'BB bet 75% pot · BTN ?' }
      ],
      'call',
      'KQhh nut flush draw + overs en A72-5: call turn barrel. Tienes ~9 outs al nut flush + 6 outs al par.',
      { prompt: '3-bet pot · Turn: facing bet. ¿Qué haces con KQs?', villainPos: 'BB' }),
    decisionSpot('d02-07', 84107, 'BTN', ['Ad', 'Jc'], ['Js', '8d', '3c', '2h', 'Kh'],
      'BTN open → BB 3-bet → BTN call · Flop check · BB bet 33% → call · Turn check · BB bet 75% → call · River BB check',
      [
        { street: 'River', text: 'BB check · BTN ?' }
      ],
      'raise',
      'AJ second pair (Jacks) en J83-2-K en 3-bet pot: bet river tras check. Value vs bluff-catchers del BB.',
      { prompt: '3-bet pot · River: BB check. ¿Qué haces con AJ?', villainPos: 'BB' }),
    decisionSpot('d02-08', 84108, 'BTN', ['9d', '9c'], ['Ks', '7h', '2d'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% pot',
      [
        { street: 'Flop', text: 'BB bet 33% pot · BTN ?' }
      ],
      'call',
      '99 underpair a K en K72 en 3-bet pot IP: call flop vs c-bet. Necesitas ver turn; raise es demasiado polarizado.',
      { prompt: '3-bet pot · Flop: facing c-bet. ¿Qué haces con 99?', villainPos: 'BB' }),
    decisionSpot('d02-09', 84109, 'BTN', ['7s', '6s'], ['As', 'Kd', 'Qc'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% pot',
      [
        { street: 'Flop', text: 'BB bet 33% pot · BTN ?' }
      ],
      'fold',
      '76s en AKQ en 3-bet pot: fold flop. Cero equity; el 3-bettor tiene ventaja enorme en este board.',
      { prompt: '3-bet pot · Flop: facing c-bet. ¿Qué haces con 76s?', villainPos: 'BB' }),
    decisionSpot('d02-10', 84110, 'BB', ['Ah', 'Qh'], ['Qd', '9c', '4h', '2s', '7d'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% → call · Turn check · BTN bet 50% → call · River BTN bet 75% pot',
      [
        { street: 'River', text: 'BB check · BTN bet 75% pot' }
      ],
      'call',
      'AQ top pair en Q94-2-7 en 3-bet pot: call river. Estás ahead de bluffs y muchos Qx peores.',
      { prompt: '3-bet pot · River: facing bet. ¿Qué haces con AQ?', villainPos: 'BTN' }),
    decisionSpot('d02-11', 84111, 'BTN', ['Kd', 'Kh'], ['Ts', '9c', '8d', '3h'],
      'BTN open → BB 3-bet → BTN call · Flop BB check · BTN bet 50% → call · Turn BB check',
      [
        { street: 'Turn', text: 'BB check · BTN ?' }
      ],
      'raise',
      'KK overpair en T98-3 en 3-bet pot IP: bet turn. Proteges vs draws y extraes value de Tx/99.',
      { prompt: '3-bet pot · Turn: BB check. ¿Qué haces con KK?', villainPos: 'BB' }),
    decisionSpot('d02-12', 84112, 'BB', ['5h', '5c'], ['Ac', 'Kd', '7c', '2h', '9s'],
      'BTN open → BB 3-bet → BTN call · Flop BB bet 33% → call · Turn check · BTN bet 66% → call · River BTN bet overbet',
      [
        { street: 'River', text: 'BB check · BTN overbet 125% pot' }
      ],
      'fold',
      '55 en AK7-2-9 en 3-bet pot: fold vs overbet river. No tienes showdown value vs línea polarizada.',
      { prompt: '3-bet pot · River: facing overbet. ¿Qué haces con 55?', villainPos: 'BTN' })
  ];

  PACKS['O-01'] = [
    oddsSpot('o01-01', 85001, 100, 50, 'Flush draw · 9 outs', ['Ah', 'Kh'], ['Qh', '7h', '2c', 'Jd'], 'yes',
      'Pot 100 + bet 50 → call 50 para ganar 150. Necesitas 25 %; 9 outs ≈ 35 % en turn. Call correcto.',
      { requiredPct: 25, equityPct: 35 }),
    oddsSpot('o01-02', 85002, 80, 80, 'OESD · 8 outs', ['9h', '8d'], ['Ts', '7c', '2h', '3d'], 'yes',
      'Pot 80 + bet 80 → call 80 para ganar 160. Necesitas 33 %; 8 outs ≈ 31–32 % + implied. Call marginal/sí.',
      { requiredPct: 33, equityPct: 32 }),
    oddsSpot('o01-03', 85003, 100, 100, 'Gutshot · 4 outs', ['Jh', 'Td'], ['Qs', '8c', '2h', '3d'], 'no',
      'Pot 100 + bet 100 → necesitas 33 %. 4 outs ≈ 17 %. Fold claro sin implied odds.',
      { requiredPct: 33, equityPct: 17 }),
    oddsSpot('o01-04', 85004, 120, 40, 'Flush draw · 9 outs', ['Kh', 'Qh'], ['Ah', '9h', '3c', '5d'], 'yes',
      'Pot 120 + bet 40 → call 40 para ganar 160. Necesitas 20 %; flush draw supera. Call fácil.',
      { requiredPct: 20, equityPct: 35 }),
    oddsSpot('o01-05', 85005, 60, 90, 'Par + flush draw · 12 outs', ['Ah', '5h'], ['Kh', '7h', '2c', '9d'], 'depends',
      'Pot 60 + bet 90 → necesitas 37,5 %. Combo draw puede acercarse, pero bet grande pide implied odds reales.',
      { requiredPct: 38, equityPct: 40 }),
    oddsSpot('o01-06', 85006, 200, 50, 'Two overcards · 6 outs', ['Ah', 'Kd'], ['Qs', '8c', '3h', '2d'], 'no',
      'Pot 200 + bet 50 → necesitas 20 %. 6 outs ≈ 24 % pero sin par hecho. Fold vs bet grande en turn.',
      { requiredPct: 20, equityPct: 24 }),
    oddsSpot('o01-07', 85007, 90, 30, 'Flush draw · 9 outs', ['Th', '9h'], ['Kh', 'Qh', '2c', '4d'], 'yes',
      'Pot 90 + bet 30 → call 30 para ganar 120. Necesitas 20 %. Flush draw claro → call.',
      { requiredPct: 20, equityPct: 35 }),
    oddsSpot('o01-08', 85008, 100, 150, 'Par medio · 5 outs', ['8h', '7d'], ['Ks', 'Qc', '8s', '2h', 'Jd'], 'no',
      'Pot 100 + bet 150 → necesitas 37,5 %. Par medio de 8 en KQ8-2-J vs overbet river: fold — no tienes precio ni outs reales.',
      { requiredPct: 38, equityPct: 20 }),
    oddsSpot('o01-09', 85009, 70, 35, 'OESD · 8 outs', ['Jc', 'Tc'], ['9s', '8d', '2h', 'Ah'], 'yes',
      'Pot 70 + bet 35 → call 35 para ganar 105. Necesitas 25 %. OESD encaja → call.',
      { requiredPct: 25, equityPct: 32 }),
    oddsSpot('o01-10', 85010, 50, 100, 'Flush draw · 9 outs', ['7h', '6h'], ['Kh', '9h', '2c', '3d'], 'no',
      'Pot 50 + bet 100 → necesitas 40 %. 9 outs ≈ 35 % sin contar reverse. Fold vs overbet.',
      { requiredPct: 40, equityPct: 35 }),
    oddsSpot('o01-11', 85011, 110, 55, 'Combo draw · 15 outs', ['Ah', '5h'], ['Kh', 'Qh', 'Jc', '2d'], 'yes',
      'Pot 110 + bet 55 → necesitas 25 %. Nut flush draw + gutshot/overs supera el precio → call.',
      { requiredPct: 25, equityPct: 45 }),
    oddsSpot('o01-12', 85012, 100, 25, 'Gutshot + overcard · 7 outs', ['Ah', 'Td'], ['Ks', 'Qc', 'Jh', '2d'], 'depends',
      'Pot 100 + bet 25 → necesitas 20 %. 7 outs ≈ 28 % pero river-only. Depende de implied; aquí call ligero.',
      { requiredPct: 20, equityPct: 28 })
  ];

  /*
   * B-01 blockers: las 3 opciones deben ser aire puro (sin pareja/escalera/color hecho).
   * Regla: buen farol bloquea value/nuts que pagan y no bloquea basura que tira.
   */
  PACKS['B-01'] = [
    blockerSpot('b01-01', 86001, ['Kh', '8h', '3h', 'Jd', '2c'], 'Bet 75% pot', [
      handOpt('a', 'Ah5d', ['Ah', '5d'],
        'Bloquea el color nuts (A♥). El rival tiene menos flushes fuertes para pagarte.'),
      handOpt('b', 'As5s', ['As', '5s'],
        'Tienes as, pero no el corazón: no bloqueas color. Peor que A♥.'),
      handOpt('c', '6d5d', ['6d', '5d'],
        'Aire total sin blocker de color: dejas intactos todos los flushes que pagan.')
    ], 'a',
      'Regla en boards con color posible: farolea con el as del palo (blocker de nuts). A♥5♦ > A♠5♠ > 65.'),

    blockerSpot('b01-02', 86002, ['Kd', '7c', '2s', '9h', '3c'], 'Bet 66% pot', [
      handOpt('a', 'Ah5h', ['Ah', '5h'],
        'Bloquea AA/AK/AQ — value que suele pagar en K-high. Mejor farol.'),
      handOpt('b', 'QhJh', ['Qh', 'Jh'],
        'QJ suele tirar aquí: al tenerlo tú, quitas folds del rival y dejas su rango más fuerte.'),
      handOpt('c', '8h6h', ['8h', '6h'],
        'Aire sin blocker de value fuerte (Ax). Peor que A-high.')
    ], 'a',
      'En K-high seco, A-high es el farol estrella: bloquea value (Ax) y no bloquea basura que foldea (QJ).'),

    blockerSpot('b01-03', 86003, ['Kh', '9h', '4h', '2c', '7d'], 'Bet overbet', [
      handOpt('a', 'Ah3d', ['Ah', '3d'],
        'Overbet representa color nuts: A♥ bloquea exactamente esa mano. Mejor farol.'),
      handOpt('b', '5h3d', ['5h', '3d'],
        'Corazón bajo: bloqueas flushes débiles (que tiraban) y dejas vivos los nuts. Farol malo.'),
      handOpt('c', 'QdJd', ['Qd', 'Jd'],
        'Sin corazón: no bloqueas color. No encaja con la historia de overbet polar.')
    ], 'a',
      'Overbet en monotone: farolea con blocker de nuts (A♥), no con corazón bajo (quita folds, deja nuts).'),

    blockerSpot('b01-04', 86004, ['Ts', '9c', '8d', '3h', '2c'], 'Bet 75% pot', [
      handOpt('a', 'Qd5h', ['Qd', '5h'],
        'Bloquea QJ (escalera nuts) sin hacerla tú. Mejor farol.'),
      handOpt('b', 'Ah5d', ['Ah', '5d'],
        'A-high sin interacción con la escalera: no reduce QJ/J7/76 que pagan.'),
      handOpt('c', 'Kd7d', ['Kd', '7d'],
        'K-high tampoco bloquea la escalera nuts. Peor que Qx.')
    ], 'a',
      'En T98, la nuts es QJ. Farolea con Qx/Jx (bloqueas nuts) sin completar escalera.'),

    blockerSpot('b01-05', 86005, ['Ac', 'Ad', '9h', '6c', '2s'], 'Bet 50% pot', [
      handOpt('a', '5h4h', ['5h', '4h'],
        'No bloqueas broadway que tiraba (KQ/JT): más folds vivos. Mejor farol en AA pareado.'),
      handOpt('b', 'KhQh', ['Kh', 'Qh'],
        'KQ suele tirar vs bet en AA: al tenerlo tú, quitas folds y densificas el calling range.'),
      handOpt('c', 'JhTh', ['Jh', 'Th'],
        'Igual que KQ: bloqueas basura que foldea. Farol peor que 54.')
    ], 'a',
      'En board pareado AA, evita faroles con broadway (bloquean folds). Prefiere aire bajo tipo 54.'),

    blockerSpot('b01-06', 86006, ['Qs', 'Jd', 'Tc', '4h', '2d'], 'Bet 75% pot', [
      handOpt('a', 'Ah5h', ['Ah', '5h'],
        'Bloquea AK (escalera nuts) sin hacerla. Mejor farol.'),
      handOpt('b', 'Kh5d', ['Kh', '5d'],
        'También bloquea AK, pero el as es blocker más fuerte (también AA/AQ en otras líneas).'),
      handOpt('c', '6h3h', ['6h', '3h'],
        'Aire sin blocker de escalera: dejas todos los AK vivos para pagarte.')
    ], 'a',
      'En QJT, AK es la nuts. Farolea con A-high (sin K) para bloquear esa escalera.'),

    blockerSpot('b01-07', 86007, ['Ks', '7d', '2c', '2h', '9s'], 'Bet 66% pot', [
      handOpt('a', 'Ah5h', ['Ah', '5h'],
        'Bloquea AK/AQ/A9 — mucho value y bluff-catchers fuertes. Mejor farol.'),
      handOpt('b', 'QhJh', ['Qh', 'Jh'],
        'QJ foldea mucho aquí: lo quitas del rango rival → menos folds. Peor.'),
      handOpt('c', '8h6h', ['8h', '6h'],
        'Sin blocker de Ax: no reduces las manos que más te pagan.')
    ], 'a',
      'K72 pareado: otra vez A-high gana. Bloquea value; QJ solo bloquea folds.'),

    blockerSpot('b01-08', 86008, ['9s', '8s', '7h', '3c', '2d'], 'Bet 75% pot', [
      handOpt('a', 'Th5c', ['Th', '5c'],
        'Bloquea JT (escalera nuts) y T6 sin hacer escalera. Mejor farol.'),
      handOpt('b', 'AhKh', ['Ah', 'Kh'],
        'AK no interactúa con 987: no bloqueas JT/65. Farol flojo aquí.'),
      handOpt('c', '6c4h', ['6c', '4h'],
        'Bloquea la escalera baja (65), útil pero peor que bloquear la nuts (JT).')
    ], 'a',
      'En 987, JT es nuts. Farolea con Tx/Jx (blocker de nuts), no con AK “bonito”.'),

    blockerSpot('b01-09', 86009, ['Ah', '9d', '6c', 'Kd', '2h'], 'Bet 75% pot', [
      handOpt('a', '5h4h', ['5h', '4h'],
        'No bloqueas basura que tiraba (QJ/JT): dejas más folds en el rival. Mejor farol.'),
      handOpt('b', 'QhJh', ['Qh', 'Jh'],
        'QJ/AJ suelen tirar vs bet en A-high: al tenerlos, el rango rival se vuelve más Ax/Kx.'),
      handOpt('c', 'Jh7h', ['Jh', '7h'],
        'Mismo problema: bloqueas floats/basura que foldeaba.')
    ], 'a',
      'Con as en board, no puedes farolear con el otro as (harías pareja). Elige aire bajo que no quite folds.'),

    blockerSpot('b01-10', 86010, ['Js', 'Ts', '9d', '4c', '2h'], 'Bet overbet', [
      handOpt('a', 'Qh5d', ['Qh', '5d'],
        'Bloquea AQ (nuts) y Q8 sin completar escalera. Mejor farol.'),
      handOpt('b', '8h5d', ['8h', '5d'],
        'Bloquea la escalera baja (87): útil, pero peor que bloquear la nuts.'),
      handOpt('c', 'Kh6h', ['Kh', '6h'],
        'K-high apenas toca las escaleras de este board. Peor blocker.')
    ], 'a',
      'En JT9, AQ es nuts. Farolea con Qx (sin A) para bloquearla; no con K-high.'),

    blockerSpot('b01-11', 86011, ['Ks', 'Kh', '4d', '7c', '2s'], 'Bet 50% pot', [
      handOpt('a', 'AhQh', ['Ah', 'Qh'],
        'Bloquea AA y AK (fulles/dos pares fuertes que pagan). Mejor farol.'),
      handOpt('b', '9h8h', ['9h', '8h'],
        'No bloqueas AA/AK: dejas intacto el value más caro.'),
      handOpt('c', '5h3h', ['5h', '3h'],
        'Igual: aire sin blocker de value premium en KK pareado.')
    ], 'a',
      'En KK pareado, A-high brilla otra vez: bloquea AA/AK. 98/53 no tocan ese value.'),

    blockerSpot('b01-12', 86012, ['Qs', 'Jd', '4c', '4h', '2d'], 'Bet 75% pot', [
      handOpt('a', 'AhKh', ['Ah', 'Kh'],
        'Bloquea AQ/AJ/KQ/KJ — muchas manos con pareja de Q/J que pagan. Mejor farol.'),
      handOpt('b', 'Ts9s', ['Ts', '9s'],
        'Aire sin blocker de Qx/Jx value. Peor.'),
      handOpt('c', '8h7h', ['8h', '7h'],
        'Tampoco reduce pares de dama/jota. Peor que AK.')
    ], 'a',
      'En QJ pareado, AK es farol fuerte: bloquea las parejas (AQ/AJ/KQ/KJ) que más pagan.')
  ];

  var LESSONS = [
    {
      id: 'D-01',
      title: '¿Fold, call o raise? I · Spots clave',
      route: 'cash',
      module: 'M2',
      order: 20.5,
      plan: 'study',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'La decisión nodal (fold, call o raise) es la que más EV mueve postflop. Entrena leer línea + board + tu mano antes de actuar.',
      theory: [
        'En cada calle te enfrentas a una decisión binaria o ternaria: fold (tirar), call (igualar) o raise (subir). No existe «probar suerte»: cada opción tiene un motivo GTO o explotable.',
        'Antes de pulsar: (1) ¿qué representa la línea del rival? (2) ¿tu mano gana showdown o necesita mejorar? (3) ¿el sizing te da pot odds?',
        'Trampa: call automático con top pair weak kicker vs triple barrel. La calle importa tanto como las cartas.'
      ],
      examples: [{
        title: 'River vs triple barrel',
        body: 'BB vs BTN con AQ en AK7-2-5 y triple barrel: fold. Estás behind de mucho Ax/Kx; call es bleed.'
      }],
      aiQuestions: [
        '¿Cuándo fold con top pair en river?',
        '¿Qué preguntas hacerte antes de call?',
        '¿Por qué check IP no es lo mismo que fold?'
      ],
      spots: []
    },
    {
      id: 'D-02',
      title: '¿Fold, call o raise? II · 3-bet pots',
      route: 'cash',
      module: 'M2',
      order: 20.6,
      plan: 'study',
      xp: 110,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'En potes de 3-bet los rangos son más polarizados y los SPR más bajos. La misma mano puede ser call en SRP y fold en 3BP.',
      theory: [
        'El 3-bettor llega con menos combos pero más concentrados en premiums y bluffs polarizados. El caller tiene manos más fuertes que en open/call normal.',
        'SPR bajo (stack-to-pot ratio): menos calles posibles → más all-in o fold en turn/river.',
        'Trampa: autocall con overpair en board que favorece al 3-bettor OOP (987, monotone).'
      ],
      examples: [{
        title: 'TT en 987 en 3-bet pot',
        body: 'Fold vs flop bet. El board conecta con el rango del 3-bettor; tu overpair pierde mucha equity.'
      }],
      aiQuestions: [
        '¿Qué cambia en 3-bet pot vs single raised pot?',
        '¿Cuándo fold overpair en flop?',
        '¿Cómo afecta el SPR a tu decisión?'
      ],
      spots: []
    },
    {
      id: 'O-01',
      title: 'Pot odds · ¿Tienes precio para call?',
      route: 'cash',
      module: 'M2',
      order: 20.7,
      plan: 'study',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'Pot odds (precio del bote) te dicen qué % de equity necesitas para call rentable. Compara ese % con tus outs antes de igualar.',
      theory: [
        'Fórmula: % necesario = call / (pot + bet + call). Ejemplo: pot 100, bet 50 → call 50 para ganar 200 → necesitas 25 %.',
        'Outs (cartas que mejoran tu mano): flush draw ≈ 9, OESD ≈ 8, gutshot ≈ 4. Regla rápida turn: outs × 2 ≈ % equity.',
        'Implied odds: si esperas ganar más cuando conectes, puedes call con menos equity directa. «Depende» = implied reales.'
      ],
      examples: [{
        title: 'Flush draw vs bet pequeño',
        body: 'Pot 100, bet 40 → necesitas 20 %. Flush draw (~35 %) → call claro.'
      }],
      aiQuestions: [
        '¿Cómo calculas pot odds en una frase?',
        '¿Cuántos outs tiene un flush draw?',
        '¿Cuándo «depende» es la respuesta correcta?'
      ],
      spots: []
    },
    {
      id: 'B-01',
      title: 'Blockers · ¿Con cuál faroleas?',
      route: 'ranges',
      module: 'M1',
      order: 4.5,
      plan: 'study',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 0,
      exam: false,
      concept: 'Un blocker es una carta tuya que quita combinaciones del rival. El buen farol bloquea manos que pagan (nuts/value) y no bloquea manos que tiran (basura).',
      theory: [
        'Regla de oro (memoriza esto): al farolear quieres (1) menos calls y (2) más folds. Por eso eliges cartas que eliminan value/nuts del rival, y evitas cartas que eliminan la basura que ya iba a tirar.',
        'Ejemplo color: board con tres corazones. A♥ es el mejor farol porque bloquea el color nuts. Un corazón bajo (5♥) es peor: quita flushes débiles que tiraban y deja vivos los nuts que te pagan.',
        'Ejemplo seco K-high: A-high bloquea AA/AK/AQ (pagan). QJ bloquea sobre todo basura que foldea → el rango rival se vuelve más fuerte. Mismo aire, peor blocker.',
        'Trampa de esta lección (antes): a veces las «opciones de farol» eran manos hechas (pareja, escalera, color). Aquí las tres opciones son siempre aire. Si una mano hace pareja o nuts, no es candidata a farol.',
        'Conecta con R-04: antes de meter fichas di en voz alta «quito X (value), no quito Y (folds)».'
      ],
      examples: [{
        title: 'Color en river',
        body: 'Board K♥8♥3♥Jd2c. Farolea con A♥5♦ (bloqueas color nuts). No con 5♥3♦ (bloqueas flushes flojos que tiraban).'
      }, {
        title: 'Escalera en T98',
        body: 'La nuts es QJ. Farolea con Qx (bloqueas nuts) sin completar escalera. No elijas JQ ni 76: esas manos YA son escalera, no faroles.'
      }],
      aiQuestions: [
        '¿Qué dos cosas quieres al elegir un farol (calls y folds)?',
        '¿Por qué A♥ es mejor que 5♥ para farolear en un board de corazones?',
        '¿Por qué QJ suele ser peor farol que A-high en un K-high seco?'
      ],
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

  var DAILY_POOL = []
    .concat(PACKS['D-01'].slice(0, 4))
    .concat(PACKS['D-02'].slice(0, 2))
    .concat(PACKS['O-01'].slice(0, 3))
    .concat(PACKS['B-01'].slice(0, 3));

  global.PTSchoolViralQuizzes = {
    PACKS: PACKS,
    DAILY_POOL: DAILY_POOL,
    decisionSpot: decisionSpot,
    oddsSpot: oddsSpot,
    blockerSpot: blockerSpot
  };
})(typeof window !== 'undefined' ? window : globalThis);
