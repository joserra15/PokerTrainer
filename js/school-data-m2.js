/*
 * school-data-m2.js — Cash M2 Postflop core (Study). C-14…C-20.
 * Se registra sobre PTSchoolData (Fase F). Menú sigue admin-only.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  var flop = D.flopSpot;

  D.registerLessons([
    {
      id: 'C-14',
      title: 'Textura de flop y plan',
      route: 'cash', module: 'M2', order: 14, plan: 'study',
      xp: 110, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Clasifica el flop (seco / semi / wet) y elige un plan: c-bet pequeño, check o pot control.',
      theory: [
        'Flop seco (p. ej. K72 rainbow): pocas draws; el agresor IP c-betea alto con sizing pequeño.',
        'Flop wet/monotone: más equity rival; reduce c-bet automático y checkea más.',
        'Trampa: mismo sizing 75 % en todos los boards.'
      ],
      examples: [{
        title: 'Seco vs wet',
        body: 'BTN vs BB, flop K♠7♦2♣ con AQo: c-bet ~1/3. En 9♠8♠7♥ con AQo: muchas veces check o c-bet más selectivo.'
      }],
      aiQuestions: ['¿Qué es un flop seco?', '¿Por qué sizing pequeño en seco?'],
      spots: [
        flop('c14-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 24001, { teachBack: 'Seco K72: c-bet pequeño IP habitual con AQo.' }),
        flop('c14-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 24002, { trapTag: 'fancy_play', teachBack: 'Wet conectado: no c-bet automático grande. Check o bet selectivo.' }),
        flop('c14-03', 'CO', ['Kd', 'Kh'], ['Qc', 'Jd', 'Ts'], 24003, { teachBack: 'Overpair en board muy wet: pot control frecuente.' }),
        flop('c14-04', 'BTN', ['8h', '7h'], ['As', '4d', '2c'], 24004, { teachBack: 'Seco A-high: c-bet light IP razonable con backdoors.' }),
        flop('c14-05', 'BTN', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 24005, { trapTag: 'fancy_play', teachBack: 'Monotone: reduce c-bet spew sin flush/draw fuerte.' }),
        flop('c14-06', 'HJ', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 24006, { teachBack: 'QQ en K-high seco: c-bet value frecuente.' })
      ]
    },
    {
      id: 'C-15',
      title: 'C-bet IP en flop seco',
      route: 'cash', module: 'M2', order: 15, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'En posición, en flops secos, c-beteas muy a menudo a sizing pequeño para negar equity.',
      theory: [
        'Range advantage en A-high/K-high secos: muchas manos del BB no conectan.',
        'Sizing ~25–33 % del bote. No necesitas 75 % para ganar la mayoría de folds.',
        'Trampa: check-back demasiado o overbet seco sin razón.'
      ],
      examples: [{
        title: 'BTN vs BB seco',
        body: 'Flop A♠8♦3♣, tú con KQo: c-bet pequeño. Con 72o que llegó milagroso: también puedes bet o check según mix — prioriza el patrón c-bet.'
      }],
      aiQuestions: ['¿Por qué 33 % y no 75 % en seco?', '¿Qué manos check-back IP?'],
      spots: [
        flop('c15-01', 'BTN', ['Kh', 'Qd'], ['As', '8d', '3c'], 25001, { teachBack: 'A-high seco: c-bet pequeño con KQo.' }),
        flop('c15-02', 'BTN', ['Ah', '5d'], ['Kc', '7s', '2d'], 25002, { teachBack: 'K-high seco: c-bet frecuente IP.' }),
        flop('c15-03', 'CO', ['Jd', 'Td'], ['Qs', '4h', '4c'], 25003, { teachBack: 'Paired seco: c-bet pequeño habitual.' }),
        flop('c15-04', 'BTN', ['9s', '8s'], ['Ah', 'Kd', '2c'], 25004, { teachBack: 'AK seco: c-bet light con backdoors.' }),
        flop('c15-05', 'BTN', ['Qc', 'Jc'], ['Th', '7d', '2s'], 25005, { teachBack: 'T-high seco: c-bet IP estándar.' }),
        flop('c15-06', 'BTN', ['Ad', 'Kd'], ['9c', '8h', '7s'], 25006, { trapTag: 'fancy_play', teachBack: 'Board muy conectado: no trates como seco. Selectivo.' }),
        flop('c15-07', 'CO', ['5h', '5c'], ['As', 'Td', '3c'], 25007, { teachBack: 'Pocket pair en A-high seco: c-bet/check mixto; value pequeño OK.' }),
        flop('c15-08', 'BTN', ['Kh', '9s'], ['Kd', '7c', '2h'], 25008, { teachBack: 'Top pair seco: c-bet value.' })
      ]
    },
    {
      id: 'C-16',
      title: 'C-bet OOP y cuándo ceder',
      route: 'cash', module: 'M2', order: 16, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Fuera de posición reduces c-bets automáticos: construyes un rango de check y cedes en boards malos.',
      theory: [
        'OOP no ves la reacción del rival: c-betear wet boards te mete en botes difíciles.',
        'Checkea más en boards que favorecen al caller (bajos conectados, monotone).',
        'Trampa: autocbet OOP en wet.'
      ],
      examples: [{
        title: 'BB agresor vs BTN',
        body: '3-beteaste BB vs BTN, flop 8♠7♠6♥: muchas manos checkean. En A♠2♦2♣ puedes c-bet más.'
      }],
      aiQuestions: ['¿Por qué c-beteo menos OOP?', '¿En qué boards cedo?'],
      spots: [
        flop('c16-01', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 26001, { teachBack: 'A-high paired: c-bet OOP razonable.' }),
        flop('c16-02', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 26002, { trapTag: 'fancy_play', teachBack: 'Wet conectado OOP: cede/check más. No autocbet.' }),
        flop('c16-03', 'BB', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 26003, { teachBack: 'QQ en K-high: mix; a menudo bet pequeño o check.' }),
        flop('c16-04', 'SB', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 26004, { trapTag: 'fancy_play', teachBack: 'Monotone OOP: no autocbet spew.' }),
        flop('c16-05', 'BB', ['Ad', '5d'], ['Kc', '4s', '4d'], 26005, { teachBack: 'A high paired: c-bet frecuente posible.' }),
        flop('c16-06', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 26006, { teachBack: 'Missed OOP en QJ: check frecuente.' })
      ]
    },
    {
      id: 'C-17',
      title: 'Defensa vs c-bet',
      route: 'cash', module: 'M2', order: 17, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Vs c-bet pequeño continúas con equity y backdoors; no overfoldeas solo porque “no pegaste top pair”.',
      theory: [
        'C-bet a 33 % ofrece odds: gutshots, backdoors y pair+draw continúan.',
        'Vs overbet o boards que te destrozan, foldear es correcto.',
        'Trampa: overfold vs 33 %.'
      ],
      examples: [{
        title: 'Odds vs sizing',
        body: 'BB vs c-bet 1/3 en A72r con 86s (gutshot+backs): call. Con 72o sin backdoors: fold.'
      }],
      aiQuestions: ['¿Por qué defiendo más vs c-bet pequeño?', '¿Qué es un backdoor?'],
      spots: [
        flop('c17-01', 'BB', ['8h', '6h'], ['As', '7d', '2c'], 27001, { facingBet: true, teachBack: 'Vs sizing pequeño, 86s con equity/backdoors: continue.' }),
        flop('c17-02', 'BB', ['7c', '2d'], ['As', 'Kd', 'Qc'], 27002, { facingBet: true, trapTag: 'dominated', teachBack: '72o en AKQ: fold. Sin equity.' }),
        flop('c17-03', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 27003, { facingBet: true, teachBack: 'JT con straight draw: continue claro.' }),
        flop('c17-04', 'BB', ['Ad', '4c'], ['Kh', '7s', '2d'], 27004, { facingBet: true, teachBack: 'A-high + backdoor: call vs bet pequeño frecuente.' }),
        flop('c17-05', 'BB', ['Qc', '5d'], ['As', 'Ah', 'Kd'], 27005, { facingBet: true, trapTag: 'dominated', teachBack: 'Q5o en AA K: fold típico.' }),
        flop('c17-06', 'BB', ['9s', '8s'], ['7h', '6d', '2c'], 27006, { facingBet: true, teachBack: '98s con straight draw: continue.' })
      ]
    },
    {
      id: 'C-18',
      title: 'Second barrel (turn)',
      route: 'cash', module: 'M2', order: 18, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'En el turn decides si disparas segunda bala (value/bluff) o controlas el bote.',
      theory: [
        'Barrel value cuando mejoras o sigues adelante. Bluff cuando el turn asusta al rango rival (overcards, flush cards).',
        'Sticky second pair: no barrels eternos sin plan.',
        'Trampa: pegarte a segunda pareja en todas las calles.'
      ],
      examples: [{
        title: 'Turn scare',
        body: 'C-beteaste A72r con KQ, turn K: value barrel. Turn 8 que completa draws rivales: a menudo check.'
      }],
      aiQuestions: ['¿Cuándo doy second barrel?', '¿Qué es sticky second pair?'],
      spots: [
        flop('c18-01', 'BTN', ['Kh', 'Qd'], ['As', '7d', '2c'], 28001, { street: 'turn', teachBack: 'Con KQ en A-high: plan de barrel/value en turns buenos.' }),
        flop('c18-02', 'BTN', ['Jh', '9c'], ['As', '7d', '2c'], 28002, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Segunda/weak sin mejora: no sticky barrel eterno.' }),
        flop('c18-03', 'CO', ['Ad', 'Kd'], ['Ah', '8c', '3s'], 28003, { street: 'turn', teachBack: 'Top pair top kicker: barrel value frecuente.' }),
        flop('c18-04', 'BTN', ['8s', '7s'], ['As', 'Kd', '2h'], 28004, { street: 'turn', teachBack: 'Missed: give up turn a menudo si no hay scare card.' }),
        flop('c18-05', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c'], 28005, { street: 'turn', teachBack: 'Overpair: barrel value en turns seguros.' }),
        flop('c18-06', 'BTN', ['5h', '5c'], ['As', 'Kd', 'Qc'], 28006, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Underpair en broadway: pot control / fold a presión.' })
      ]
    },
    {
      id: 'C-19',
      title: 'River value',
      route: 'cash', module: 'M2', order: 19, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'En river buscas value thin cuando manos peores pagan, y value fat con nuts; no undervalueas fuertes.',
      theory: [
        'Value thin: apuestas manos que ganan a peores calls. Value fat: sizing mayor con la nuez.',
        'Undervalue: checkear top pair strong vs rangos que pagan es un leak común.',
        'Trampa: check-back strong o bluff sin blockers.'
      ],
      examples: [{
        title: 'Thin vs fat',
        body: 'River seco, top pair top kicker vs BB caller: value bet. Con nuts: sizing más grande.'
      }],
      aiQuestions: ['¿Qué es value thin?', '¿Cuándo sizing grande en river?'],
      spots: [
        flop('c19-01', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d'], 29001, { street: 'river', teachBack: 'TPTK: value bet river frecuente.' }),
        flop('c19-02', 'BTN', ['Kh', 'Kd'], ['As', '7c', '2d'], 29002, { street: 'river', teachBack: 'KK en A-high: pot control; no overvalue.' }),
        flop('c19-03', 'CO', ['Qh', 'Qd'], ['Qc', '8s', '3h'], 29003, { street: 'river', teachBack: 'Set: value fat.' }),
        flop('c19-04', 'BTN', ['Jh', '9c'], ['As', 'Kd', 'Qc'], 29004, { street: 'river', trapTag: 'fancy_play', teachBack: 'Air en broadway: no bluff spew sin blockers.' }),
        flop('c19-05', 'BTN', ['Ad', '5d'], ['Ah', '9c', '4s'], 29005, { street: 'river', teachBack: 'Top pair weak: thin value o check según rivales.' }),
        flop('c19-06', 'BTN', ['8s', '7s'], ['9h', '6d', '2c'], 29006, { street: 'river', teachBack: 'Straight: value fat.' })
      ]
    },
    {
      id: 'C-20',
      title: 'Examen M2 · Postflop',
      route: 'cash', module: 'M2', order: 20, plan: 'study',
      xp: 170, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'Repaso M2: textura, c-bet IP/OOP, defensa, barrels y river. Sin teoría nueva.',
      theory: [
        'Clasifica el board, tu posición y tu plan. Seco IP → c-bet pequeño. Wet OOP → más checks.',
        'Repasa el menú Rangos y tus fallos de M1 si el leak venía del preflop.'
      ],
      examples: [{
        title: 'Checklist',
        body: '¿Board seco o wet? ¿IP u OOP? ¿Value, bluff o surrender?'
      }],
      aiQuestions: ['¿Cuál es mi fuga postflop principal?', 'Resume c-bet IP en seco.'],
      spots: [
        flop('c20-01', 'BTN', ['Kh', 'Qd'], ['As', '8c', '3d'], 30001, { teachBack: 'Seco IP: c-bet.' }),
        flop('c20-02', 'SB', ['Ah', 'Kd'], ['9s', '8s', '7h'], 30002, { trapTag: 'fancy_play', teachBack: 'Wet OOP: no autocbet.' }),
        flop('c20-03', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 30003, { facingBet: true, teachBack: 'Draw: continue vs c-bet.' }),
        flop('c20-04', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c'], 30004, { street: 'turn', teachBack: 'Overpair: barrel value.' }),
        flop('c20-05', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d'], 30005, { street: 'river', teachBack: 'TPTK: value river.' }),
        flop('c20-06', 'BTN', ['7c', '2d'], ['As', 'Kd', 'Qc'], 30006, { trapTag: 'dominated', teachBack: 'Air: fold/give up.' }),
        flop('c20-07', 'CO', ['9s', '9c'], ['Ah', 'Td', '3c'], 30007, { teachBack: 'Mid pair A-high: mix; a menudo pot control.' }),
        flop('c20-08', 'BTN', ['8h', '7h'], ['As', '4d', '2c'], 30008, { teachBack: 'Seco con backs: c-bet light OK.' })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
