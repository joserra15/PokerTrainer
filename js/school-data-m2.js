/*
 * school-data-m2.js — Cash M2 Postflop core (Study). C-14…C-20.
 * Se registra sobre PTSchoolData (Fase F). Menú sigue admin-only.
 *
 * Estilo (C-09+ / M2 y futuras): términos de póker con ancla en español
 * la 1ª vez en la lección. Voz de profesor, no telegrama. Call = «hacer call».
 * Ver docs/ROADMAP_LECCIONES_DIRIGIDAS.md §4.5.
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
      concept: 'Antes de apostar, mira la textura del flop: ¿seco, semi o wet? Eso decide si haces c-bet (continuación) pequeño, check o controlas el bote.',
      theory: [
        'Un flop seco tiene pocas draws (pocas formas de mejorar fuerte): ejemplo K♠7♦2♣ rainbow (tres palos distintos). El agresor en posición (IP) suele hacer c-bet — apostar de continuación tras haber subido preflop — con sizing pequeño.',
        'Un flop wet está conectado o con muchos draws (9♠8♠7♥). Monotone es cuando las tres cartas son del mismo palo. Ahí el rival conecta más: reduces el c-bet automático y checkeas más.',
        'Trampa: usar siempre el mismo tamaño (por ejemplo 75 % del bote) en todos los boards. El plan cambia con la textura.'
      ],
      examples: [{
        title: 'Seco vs wet con la misma mano',
        body: 'BTN vs BB con AQo. En K♠7♦2♣ (seco): c-bet pequeño (~1/3 del bote) es habitual. En 9♠8♠7♥ (wet): muchas veces check o bet más selectivo — el board ayuda más al rival.'
      }],
      aiQuestions: [
        '¿Qué es un flop seco, en una frase?',
        '¿Por qué en seco el sizing pequeño suele bastar?'
      ],
      spots: [
        flop('c14-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 24001, {
          teachBack: 'Flop seco K72: c-bet pequeño en posición con AQo es el plan habitual.'
        }),
        flop('c14-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 24002, {
          trapTag: 'fancy_play',
          teachBack: 'Board wet conectado: no hagas c-bet grande automático. Check o bet selectivo.'
        }),
        flop('c14-03', 'CO', ['Kd', 'Kh'], ['Qc', 'Jd', 'Ts'], 24003, {
          teachBack: 'Overpair (pareja por encima del board) en board muy wet: a menudo pot control — no hinches el bote sin necesidad.'
        }),
        flop('c14-04', 'BTN', ['8h', '7h'], ['As', '4d', '2c'], 24004, {
          teachBack: 'Seco A-high: c-bet ligero IP razonable; tienes backdoors (mejoras en dos calles) con el suited.'
        }),
        flop('c14-05', 'BTN', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 24005, {
          trapTag: 'fancy_play',
          teachBack: 'Monotone (tres del mismo palo): reduce el c-bet spew si no tienes color ni draw fuerte.'
        }),
        flop('c14-06', 'HJ', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 24006, {
          teachBack: 'QQ en K-high seco: c-bet de value frecuente — niegas cartas y cobras a peores manos.'
        })
      ]
    },
    {
      id: 'C-15',
      title: 'C-bet IP en flop seco',
      route: 'cash', module: 'M2', order: 15, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'En posición, en flops secos, haces c-bet muy a menudo a tamaño pequeño: niegas equity (cartas que mejorarían al rival) sin meter un bote gigante.',
      theory: [
        'Range advantage significa que tu rango de agresor “encaja” mejor que el del BB en boards A-high o K-high secos: muchas manos del BB no conectaron. Por eso el c-bet frecuente tiene sentido.',
        'Sizing típico: ~25–33 % del bote. No necesitas 75 % para que muchas manos flojas se tiren. Pequeño y a menudo gana más que grande y raro.',
        'Trampa: check-back (pasar en posición) demasiado con manos que deberían negar equity, o overbet en seco sin razón.'
      ],
      examples: [{
        title: 'BTN vs BB en seco',
        body: 'Flop A♠8♦3♣, tú con KQo: c-bet pequeño. El patrón importa más que memorizar una sola mano: en seco IP, piensa primero en apostar pequeño.'
      }],
      aiQuestions: [
        '¿Por qué ~33 % y no 75 % en un flop seco?',
        '¿Qué manos tiene sentido check-back IP?'
      ],
      spots: [
        flop('c15-01', 'BTN', ['Kh', 'Qd'], ['As', '8d', '3c'], 25001, {
          teachBack: 'A-high seco: c-bet pequeño con KQo. Niega outs y cobra a peores manos.'
        }),
        flop('c15-02', 'BTN', ['Ah', '5d'], ['Kc', '7s', '2d'], 25002, {
          teachBack: 'K-high seco: c-bet frecuente en posición — muchas manos del BB fallaron.'
        }),
        flop('c15-03', 'CO', ['Jd', 'Td'], ['Qs', '4h', '4c'], 25003, {
          teachBack: 'Board paired seco (pareja en mesa): c-bet pequeño habitual.'
        }),
        flop('c15-04', 'BTN', ['9s', '8s'], ['Ah', 'Kd', '2c'], 25004, {
          teachBack: 'AK seco: c-bet ligero con backdoors (posibles mejoras en turn/river).'
        }),
        flop('c15-05', 'BTN', ['Qc', 'Jc'], ['Th', '7d', '2s'], 25005, {
          teachBack: 'T-high seco: c-bet IP estándar. Plan simple: negar equity barato.'
        }),
        flop('c15-06', 'BTN', ['Ad', 'Kd'], ['9c', '8h', '7s'], 25006, {
          trapTag: 'fancy_play',
          teachBack: 'Board muy conectado: no lo trates como seco. Sé selectivo; no autocbet.'
        }),
        flop('c15-07', 'CO', ['5h', '5c'], ['As', 'Td', '3c'], 25007, {
          teachBack: 'Pareja baja en A-high seco: c-bet o check mixto; un bet pequeño de value/control está bien.'
        }),
        flop('c15-08', 'BTN', ['Kh', '9s'], ['Kd', '7c', '2h'], 25008, {
          teachBack: 'Top pair (pareja alta) en seco: c-bet de value — cobra a peores manos y draws flojos.'
        })
      ]
    },
    {
      id: 'C-16',
      title: 'C-bet OOP y cuándo ceder',
      route: 'cash', module: 'M2', order: 16, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Fuera de posición (OOP) reduces los c-bets automáticos: construyes un rango de check y cedes en boards malos para ti.',
      theory: [
        'OOP no ves la reacción del rival antes de actuar: c-betear boards wet te mete en botes difíciles. Por eso checkeas más que en posición.',
        'Cede (checkea) más en boards que favorecen al que solo hizo call preflop: bajos conectados, monotone. En A-high paired puedes c-betear más a menudo.',
        'Trampa: autocbet OOP en wet — apostar siempre “porque fui el agresor”. A veces el plan correcto es ceder la calle.'
      ],
      examples: [{
        title: 'Agresor OOP: dos flops distintos',
        body: '3-beteaste desde BB vs BTN. Flop 8♠7♠6♥: muchas manos checkean. Flop A♠2♦2♣: puedes c-betear más — el board favorece tu rango de 3-bet.'
      }],
      aiQuestions: [
        '¿Por qué c-beteo menos fuera de posición?',
        '¿En qué boards tiene sentido ceder?'
      ],
      spots: [
        flop('c16-01', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 26001, {
          teachBack: 'A-high paired: c-bet OOP razonable — el board te favorece más que al caller.'
        }),
        flop('c16-02', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 26002, {
          trapTag: 'fancy_play',
          teachBack: 'Wet conectado OOP: cede/check más. No hagas autocbet solo por ser agresor.'
        }),
        flop('c16-03', 'BB', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 26003, {
          teachBack: 'QQ en K-high: mix — a menudo bet pequeño o check. No hinches sin plan.'
        }),
        flop('c16-04', 'SB', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 26004, {
          trapTag: 'fancy_play',
          teachBack: 'Monotone OOP: no autocbet spew sin color ni draw fuerte.'
        }),
        flop('c16-05', 'BB', ['Ad', '5d'], ['Kc', '4s', '4d'], 26005, {
          teachBack: 'A-high paired: c-bet frecuente posible. Board relativamente amable para tu rango.'
        }),
        flop('c16-06', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 26006, {
          teachBack: 'Fallaste el flop OOP en QJ: check frecuente. No inventes c-bets con aire puro.'
        })
      ]
    },
    {
      id: 'C-17',
      title: 'Defensa vs c-bet',
      route: 'cash', module: 'M2', order: 17, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Contra un c-bet pequeño continúas con equity y backdoors; no overfoldeas solo porque “no pegaste top pair”.',
      theory: [
        'Si te apuestan ~33 % del bote, las pot odds (precio que te dan) son buenas: puedes continuar con gutshot (proyecto de escalera a una carta), backdoors (mejoras en dos calles) y pair+draw.',
        'Contra overbet (apuesta enorme) o boards que te destrozan (AKQ con 83o), foldear es correcto. No “defendemos todo”.',
        'Trampa: overfold vs 33 % — tirar demasiadas manos con outs reales solo porque no tienes pareja alta.'
      ],
      examples: [{
        title: 'Odds vs sizing',
        body: 'BB vs c-bet a 1/3 en A72 rainbow con 54s (gutshot a 3 + backdoor de color): hacer call. Con 93o sin outs reales: fold. El sizing pequeño te invita a continuar cuando tienes camino.'
      }],
      aiQuestions: [
        '¿Por qué defiendo más vs un c-bet pequeño?',
        '¿Qué es un backdoor, con un ejemplo?'
      ],
      spots: [
        flop('c17-01', 'BB', ['5h', '4h'], ['As', '7d', '2c'], 27001, {
          facingBet: true,
          teachBack: 'Vs sizing pequeño, 54s con gutshot (3) y backdoor de color: continúa (call). No overfoldees.'
        }),
        flop('c17-02', 'BB', ['8h', '3d'], ['As', 'Kd', 'Qc'], 27002, {
          facingBet: true,
          trapTag: 'dominated',
          teachBack: '83o en AKQ: fold. Sin equity real — aquí sí te tiras.'
        }),
        flop('c17-03', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 27003, {
          facingBet: true,
          teachBack: 'JT con straight draw (proyecto de escalera): continue claro vs c-bet pequeño.'
        }),
        flop('c17-04', 'BB', ['Ah', '8h'], ['Kd', '7c', '2s'], 27004, {
          facingBet: true,
          teachBack: 'A-high + backdoor de color: call vs bet pequeño frecuente. Tienes outs y precio.'
        }),
        flop('c17-05', 'BB', ['Qc', '5d'], ['As', 'Ah', 'Kd'], 27005, {
          facingBet: true,
          trapTag: 'dominated',
          teachBack: 'Q5o en AA-K: fold típico. El board te aplasta; no hero-call.'
        }),
        flop('c17-06', 'BB', ['9s', '8s'], ['7h', '6d', '2c'], 27006, {
          facingBet: true,
          teachBack: '98s con straight draw: continue. Buena equity vs c-bet pequeño.'
        })
      ]
    },
    {
      id: 'C-18',
      title: 'Second barrel (turn)',
      route: 'cash', module: 'M2', order: 18, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'En el turn decides si das second barrel (segunda bala: apostar de nuevo tras el c-bet) de value/farol, o controlas el bote.',
      theory: [
        'Barrel de value cuando mejoras o sigues delante (top pair bueno, overpair). Barrel de farol cuando el turn asusta al rango rival — overcard o carta de color que completa draws posibles.',
        'Sticky second pair es pegarte a una segunda pareja mediocre en todas las calles sin plan. A veces hay que checkear o tirar ante presión.',
        'Trampa: barrel eterno “porque ya aposté flop”. Cada calle necesita una razón.'
      ],
      examples: [{
        title: 'Turn que ayuda vs turn que asusta',
        body: 'C-beteaste A72 rainbow con KQ. Turn K: value barrel — mejoraste. Turn 8 que completa draws rivales: a menudo check; el board se volvió más peligroso.'
      }],
      aiQuestions: [
        '¿Cuándo doy second barrel?',
        '¿Qué es sticky second pair, en lenguaje simple?'
      ],
      spots: [
        flop('c18-01', 'BTN', ['Kh', 'Qd'], ['As', '7d', '2c', '5s'], 28001, {
          street: 'turn',
          teachBack: 'Con KQ en A-high seco: en turn brick, barrel selectivo o check. No barrels eternos sin mejora.'
        }),
        flop('c18-02', 'BTN', ['Jh', '9c'], ['As', '9d', '2c', '5s'], 28002, {
          street: 'turn',
          trapTag: 'fancy_play',
          teachBack: 'Segunda pareja floja (9x) sin mejora en turn brick: no hagas sticky barrel eterno. Controla o cede.'
        }),
        flop('c18-03', 'CO', ['Ad', 'Kd'], ['Ah', '8c', '3s', '2d'], 28003, {
          street: 'turn',
          teachBack: 'Top pair top kicker en turn brick: barrel de value frecuente.'
        }),
        flop('c18-04', 'BTN', ['8s', '7s'], ['As', 'Kd', '2h', '3c'], 28004, {
          street: 'turn',
          teachBack: 'Fallaste: en turn brick, a menudo give up (cedes) si no hay scare card que justifique farol.'
        }),
        flop('c18-05', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c', '2d'], 28005, {
          street: 'turn',
          teachBack: 'Overpair en turn seguro: barrel de value. Cobras a peores pares y draws.'
        }),
        flop('c18-06', 'BTN', ['5h', '5c'], ['As', 'Kd', 'Qc', '2h'], 28006, {
          street: 'turn',
          trapTag: 'fancy_play',
          teachBack: 'Underpair en broadway: pot control o fold a presión. No te pegues a la pareja baja.'
        })
      ]
    },
    {
      id: 'C-19',
      title: 'River value',
      route: 'cash', module: 'M2', order: 19, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'En river buscas value thin (cobrar a peores manos que aún pagan) y value fat con la nuez; no dejes de apostar manos fuertes por miedo.',
      theory: [
        'Value thin: apuestas manos que ganan a peores calls — por ejemplo top pair decente vs un rival que paga de más. Value fat: con nuts (la mejor mano posible) o casi nuez, sizing más grande.',
        'Undervalue es el leak contrario: checkear top pair fuerte vs rangos que sí pagan. Si peores manos hacen call, debes apostar.',
        'Trampa: check-back con manos fuertes por miedo, o farolear river sin blockers ni historia creíble.'
      ],
      examples: [{
        title: 'Thin vs fat',
        body: 'River seco, top pair top kicker vs BB que solo hizo call: value bet (thin/estándar). Con la nuez: sizing más grande (fat). No trates ambas manos igual.'
      }],
      aiQuestions: [
        '¿Qué es value thin?',
        '¿Cuándo uso sizing grande en river?'
      ],
      spots: [
        flop('c19-01', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d', '3h', '5s'], 29001, {
          street: 'river',
          teachBack: 'TPTK en river seco: value bet frecuente. Peores manos (Ax peor, Kx, pares bajos) aún pagan.'
        }),
        flop('c19-02', 'BTN', ['Kh', 'Kd'], ['As', '7c', '2d', '3h', '5s'], 29002, {
          street: 'river',
          teachBack: 'KK en A-high river: pot control — no hinches como si tuvieras la nuez.'
        }),
        flop('c19-03', 'CO', ['Qh', 'Qd'], ['Qc', '8s', '3h', '2d', '5c'], 29003, {
          street: 'river',
          teachBack: 'Set (trío) en river: value fat. Sizing mayor — quieres valor máximo.'
        }),
        flop('c19-04', 'BTN', ['Jh', '9c'], ['As', 'Kd', 'Qc', '2h', '5s'], 29004, {
          street: 'river',
          trapTag: 'fancy_play',
          teachBack: 'Aire en broadway: no hagas bluff spew sin blockers ni historia. Better give up.'
        }),
        flop('c19-05', 'BTN', ['Ad', '5d'], ['Ah', '9c', '4s', '2d', '7h'], 29005, {
          street: 'river',
          teachBack: 'Top pair débil (A5) en river: thin value frecuente. No es nuts; tampoco es aire — cobra a peores que pagan.'
        }),
        flop('c19-06', 'BTN', ['8s', '7s'], ['9h', '6d', '2c', '5s', '3d'], 29006, {
          street: 'river',
          teachBack: 'Escalera (5-9) en river: value fat. Cobras fuerte; pocas manos te ganan.'
        })
      ]
    },
    {
      id: 'C-20',
      title: 'Examen M2 · Postflop',
      route: 'cash', module: 'M2', order: 20, plan: 'study',
      xp: 170, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'Repaso M2: textura, c-bet IP/OOP, defensa vs c-bet, barrels y river. Sin teoría nueva.',
      theory: [
        'Clasifica el board, tu posición y tu plan. Seco + IP → c-bet pequeño frecuente. Wet + OOP → más checks.',
        'Si tu fuga venía del preflop, repasa también el menú Rangos y tus fallos de M1. El flop no arregla un open malo.'
      ],
      examples: [{
        title: 'Checklist de tres preguntas',
        body: '1) ¿Board seco o wet? 2) ¿Estoy IP u OOP? 3) ¿Mi plan es value, farol o ceder? Si respondes las tres, la acción suele aparecer sola.'
      }],
      aiQuestions: [
        '¿Cuál es mi fuga postflop principal?',
        'Resume c-bet IP en seco en una frase de profesor.'
      ],
      spots: [
        flop('c20-01', 'BTN', ['Kh', 'Qd'], ['As', '8c', '3d'], 30001, {
          teachBack: 'Seco IP: c-bet pequeño. Niega equity barato.'
        }),
        flop('c20-02', 'SB', ['Ah', 'Kd'], ['9s', '8s', '7h'], 30002, {
          trapTag: 'fancy_play',
          teachBack: 'Wet OOP: no autocbet. Cede más en boards peligrosos.'
        }),
        flop('c20-03', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 30003, {
          facingBet: true,
          teachBack: 'Draw vs c-bet pequeño: continue. Tienes equity y precio.'
        }),
        flop('c20-04', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c', '2d'], 30004, {
          street: 'turn',
          teachBack: 'Overpair: barrel de value en turn seguro.'
        }),
        flop('c20-05', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d', '3h', '5s'], 30005, {
          street: 'river',
          teachBack: 'TPTK: value bet de river. No undervaluees.'
        }),
        flop('c20-06', 'BTN', ['Jd', '3h'], ['As', 'Kd', 'Qc'], 30006, {
          trapTag: 'dominated',
          teachBack: 'Aire en board fuerte: fold / give up. No spew.'
        }),
        flop('c20-07', 'CO', ['9s', '9c'], ['Ah', 'Td', '3c'], 30007, {
          teachBack: 'Pareja media en A-high: mix; a menudo pot control.'
        }),
        flop('c20-08', 'BTN', ['8h', '7h'], ['As', '4d', '2c'], 30008, {
          teachBack: 'Seco con backdoors: c-bet ligero OK en posición.'
        })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
