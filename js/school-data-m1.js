/*
 * school-data-m1.js — Cash M1 Preflop core (Study). C-07…C-13.
 * Se registra sobre PTSchoolData tras school-data.js (Fase E).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  var vs = D.vsRfiSpot;
  var f3 = D.face3betSpot;
  var iso = D.isoSpot;
  var sq = D.squeezeSpot;
  var bb = D.bbVsSbLimpSpot;

  D.registerLessons([
    {
      id: 'C-07',
      title: 'Defender BB vs open',
      route: 'cash', module: 'M1', order: 7, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'Desde la ciega grande, frente a un open, eliges fold, call o 3-bet según la posición del agresor y tu mano.',
      theory: [
        'Tras el open del rival, en BB ya tienes 1 bb invertida: eso mejora tus odds para call, pero no justifica defender basura.',
        'Contra opens late (CO/BTN) defiendes más wide; contra UTG/HJ eres más tight. El 3-bet mezcla valor y bluffs (polar).',
        'Trampa: overdefend (llamar de más con manos dominadas) o 3-bet spew vs opens tempranos.'
      ],
      examples: [{
        title: 'Misma mano, distinto open',
        body: 'Con KJo vs open UTG suele ser fold. La misma KJo vs open BTN entra a menudo en call o 3-bet light según chart.'
      }],
      aiQuestions: ['¿Qué cambia al defender BB vs BTN respecto a vs UTG?', '¿Cuándo 3-beteo polar desde BB?'],
      spots: [
        vs('c07-01', 'BB_vs_BTN', ['Ah', 'Kd'], 17001, { teachBack: 'AKo vs BTN: 3-bet de valor claro.' }),
        vs('c07-02', 'BB_vs_UTG', ['Kh', 'Jd'], 17002, { trapTag: 'dominated', teachBack: 'KJo vs UTG está dominada. Fold típico.' }),
        vs('c07-03', 'BB_vs_BTN', ['Kh', 'Jd'], 17003, { teachBack: 'KJo vs BTN: defensa razonable (call/3-bet según mix).' }),
        vs('c07-04', 'BB_vs_CO', ['7c', '2d'], 17004, { trapTag: 'dominated', teachBack: '72o vs CO: fold. No overdefend.' }),
        vs('c07-05', 'BB_vs_BTN', ['9s', '8s'], 17005, { teachBack: '98s vs BTN: call cómodo, buena jugabilidad.' }),
        vs('c07-06', 'BB_vs_HJ', ['Ad', '5d'], 17006, { teachBack: 'A5s vs HJ: 3-bet polar frecuente (blockers + equity).' }),
        vs('c07-07', 'BB_vs_UTG', ['Qh', '9c'], 17007, { trapTag: 'dominated', teachBack: 'Q9o vs UTG: fold. No overdefend trash.' }),
        vs('c07-08', 'BB_vs_CO', ['Jc', 'Tc'], 17008, { teachBack: 'JTs vs CO: call/3-bet sólido.' })
      ]
    },
    {
      id: 'C-08',
      title: '3-bet value y polar',
      route: 'cash', module: 'M1', order: 8, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'El 3-bet no es solo “manos premium”: construyes valor y, en late, una capa polar de bluffs con blockers.',
      theory: [
        'Value: QQ+, AK y a menudo JJ/AQ según posición. Polar light: ases suited bajos, conectores suited, desde blinds vs late.',
        'Vs open UTG tu 3-bet es más linear/value; vs BTN puedes 3-betear más light.',
        'Trampa: 3-bet spew (KJo/QTo offsuit vs early) o nunca 3-betear light cuando el spot lo pide.'
      ],
      examples: [{
        title: 'Polar vs BTN',
        body: 'BB vs open BTN con A4s: muchos charts 3-betean (bloqueas AK/AQ y tienes equity). Con KTo offsuit, mejor fold o call selectivo — no spew.'
      }],
      aiQuestions: ['¿Qué es un 3-bet polar?', '¿Por qué 3-beteo menos light vs UTG?'],
      spots: [
        vs('c08-01', 'BB_vs_BTN', ['Qs', 'Qd'], 18001, { teachBack: 'QQ vs BTN: 3-bet value.' }),
        vs('c08-02', 'BB_vs_BTN', ['Ad', '4d'], 18002, { teachBack: 'A4s vs BTN: 3-bet polar habitual.' }),
        vs('c08-03', 'BB_vs_UTG', ['Kh', 'Td'], 18003, { trapTag: 'fancy_play', teachBack: 'KTo vs UTG: no spew. Fold.' }),
        vs('c08-04', 'SB_vs_BTN', ['As', '5s'], 18004, { teachBack: 'A5s SB vs BTN: 3-bet polar frecuente.' }),
        vs('c08-05', 'BB_vs_CO', ['Ah', 'Kh'], 18005, { teachBack: 'AKs vs CO: 3-bet value.' }),
        vs('c08-06', 'BB_vs_HJ', ['Qc', '9d'], 18006, { trapTag: 'fancy_play', teachBack: 'Q9o vs HJ: no es 3-bet light. Fold/call selectivo — aquí fold.' }),
        vs('c08-07', 'BB_vs_BTN', ['7h', '6h'], 18007, { teachBack: '76s vs BTN: 3-bet light/call según mix; muchas líneas lo incluyen.' }),
        vs('c08-08', 'BB_vs_UTG', ['Jd', 'Jd'], 18008, { teachBack: 'JJ vs UTG: 3-bet o call mixto; value claro frente a open early.' })
      ]
    },
    {
      id: 'C-09',
      title: 'Enfrentar 3-bet',
      route: 'cash', module: 'M1', order: 9, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'Tras tu open, el rival 3-betea: decides fold, call o 4-bet según posición y mano.',
      theory: [
        'Fuera de posición (abriste UTG/HJ) continúas más tight. En el botón tienes más call.',
        '4-bet value: QQ+/AK. 4-bet bluff: ases suited con blockers, selectivo.',
        'Trampa: hero-call dominado (ATo/KQo flat OOP vs 3-bet) o foldear de más con suited connectors IP.'
      ],
      examples: [{
        title: 'BTN vs BB 3-bet',
        body: 'Abriste BTN con ATs y BB 3-betea: call frecuente. Con A9o offsuit, muchas veces fold.'
      }],
      aiQuestions: ['¿Cuándo 4-beteo vs 3-bet?', '¿Por qué continúo más tight OOP?'],
      spots: [
        f3('c09-01', 'BTN_vs_BB', ['As', 'Ad'], 19001, { teachBack: 'AA vs 3-bet: 4-bet value.' }),
        f3('c09-02', 'BTN_vs_BB', ['Ah', 'Ts'], 19002, { teachBack: 'ATs BTN vs BB: call frecuente.' }),
        f3('c09-03', 'UTG_vs_BB', ['Ah', 'Td'], 19003, { trapTag: 'dominated', teachBack: 'ATo UTG vs 3-bet: fold típico OOP.' }),
        f3('c09-04', 'CO_vs_BTN', ['Kh', 'Qs'], 19004, { teachBack: 'KQs CO vs BTN: call/4-bet mixto razonable.' }),
        f3('c09-05', 'BTN_vs_SB', ['7c', '2d'], 19005, { trapTag: 'dominated', teachBack: '72o vs 3-bet: fold siempre.' }),
        f3('c09-06', 'HJ_vs_BB', ['9s', '9c'], 19006, { teachBack: '99 HJ vs 3-bet: call frecuente.' }),
        f3('c09-07', 'BTN_vs_BB', ['Ad', '5d'], 19007, { teachBack: 'A5s BTN vs BB: call o 4-bet bluff según mix.' }),
        f3('c09-08', 'CO_vs_BB', ['Qd', 'Jh'], 19008, { trapTag: 'dominated', teachBack: 'QJo CO vs 3-bet BB: a menudo fold OOP.' })
      ]
    },
    {
      id: 'C-10',
      title: 'Squeeze tras open+call',
      route: 'cash', module: 'M1', order: 10, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Hay open y cold-call: el squeeze (re-raise) castiga rangos anchos y gana un bote muerto grande.',
      theory: [
        'Squeezeas con value fuerte y algunos bluffs con blockers. Multiway, el cold-caller suele tener capped range.',
        'No squeezes loco con basura: si te llaman, juegas un bote enorme OOP o multiway.',
        'Trampa: squeeze spew (J9o) o pasar spots claros de value (QQ+/AK).'
      ],
      examples: [{
        title: 'BB squeeze',
        body: 'CO open, BTN call, tú en BB con AKo: squeeze value. Con 85o: fold.'
      }],
      aiQuestions: ['¿Por qué el squeeze gana fold equity extra?', '¿Qué manos uso de bluff en squeeze?'],
      spots: [
        sq('c10-01', 'BB', 'CO', 'BTN', ['As', 'Kd'], 20001, { teachBack: 'AKo: squeeze value claro.' }),
        sq('c10-02', 'BB', 'CO', 'BTN', ['8c', '5d'], 20002, { trapTag: 'fancy_play', teachBack: '85o: no squeeze spew. Fold.' }),
        sq('c10-03', 'BB', 'HJ', 'CO', ['Qh', 'Qd'], 20003, { teachBack: 'QQ: squeeze value.' }),
        sq('c10-04', 'SB', 'CO', 'BTN', ['Ad', '5d'], 20004, { teachBack: 'A5s: squeeze polar frecuente.' }),
        sq('c10-05', 'BB', 'UTG', 'BTN', ['Jh', '9c'], 20005, { trapTag: 'fancy_play', teachBack: 'J9o vs UTG+call: fold. No squeeze loco.' }),
        sq('c10-06', 'BB', 'CO', 'BTN', ['9s', '9c'], 20006, { teachBack: '99: squeeze/call mixto; value razonable.' })
      ]
    },
    {
      id: 'C-11',
      title: 'Iso-raise vs limps',
      route: 'cash', module: 'M1', order: 11, plan: 'study',
      xp: 110, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Si alguien limpea, aísla (iso-raise) con manos que juegan bien heads-up; no overlimpees basura.',
      theory: [
        'El iso castiga el limpeo y te deja la iniciativa. Tamaño típico ~3–4 bb +1 por limper.',
        'Aísla value y manos con playability. No aísles cualquier offsuit basura OOP.',
        'Trampa: overiso trash o overlimp detrás.'
      ],
      examples: [{
        title: 'BTN vs limp UTG',
        body: 'UTG limpea, tú en BTN con AJs: iso. Con 72o: fold.'
      }],
      aiQuestions: ['¿Qué tamaño de iso uso?', '¿Cuándo overlimpeo en vez de aislar?'],
      spots: [
        iso('c11-01', 'BTN', 'UTG', ['Ah', 'Js'], 21001, { teachBack: 'AJs BTN vs limp: iso claro.' }),
        iso('c11-02', 'BTN', 'UTG', ['7c', '2d'], 21002, { trapTag: 'dominated', teachBack: '72o: fold. No overiso.' }),
        iso('c11-03', 'CO', 'HJ', ['Kd', 'Qs'], 21003, { teachBack: 'KQs CO: iso value.' }),
        iso('c11-04', 'SB', 'CO', ['9h', '8h'], 21004, { teachBack: '98s SB: iso razonable (suited).' }),
        iso('c11-05', 'CO', 'UTG', ['Qd', '8c'], 21005, { trapTag: 'fancy_play', teachBack: 'Q8o: fold frecuente. No overiso trash.' }),
        iso('c11-06', 'BTN', 'HJ', ['5s', '5c'], 21006, { teachBack: '55 BTN: iso común.' })
      ]
    },
    {
      id: 'C-12',
      title: 'BB vs SB limp',
      route: 'cash', module: 'M1', order: 12, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'El SB limpea: en BB puedes check (opción gratis) o iso-raise para castigar.',
      theory: [
        'Check con manos mediocres aprovecha la opción. Iso con value y algunas hands de steal.',
        'No overfold: ya estás en BB. Tampoco aísles cada mano.',
        'Trampa: check eterno con AA/KK o iso spew con basura.'
      ],
      examples: [{
        title: 'Opción vs castigo',
        body: 'SB limpea, tú con 22: check frecuente. Con AKo: iso.'
      }],
      aiQuestions: ['¿Cuándo checkeo vs SB limp?', '¿Qué manos aíslo desde BB?'],
      spots: [
        bb('c12-01', ['As', 'Kd'], 22001, { teachBack: 'AKo: iso vs SB limp.' }),
        bb('c12-02', ['7c', '2d'], 22002, { trapTag: 'fancy_play', teachBack: '72o: check (opción). No iso spew.' }),
        bb('c12-03', ['Qh', 'Qd'], 22003, { teachBack: 'QQ: iso value.' }),
        bb('c12-04', ['9s', '8c'], 22004, { teachBack: '98o: check frecuente.' }),
        bb('c12-05', ['Ad', '5d'], 22005, { teachBack: 'A5s: iso frecuente (blockers + equity).' }),
        bb('c12-06', ['2h', '2c'], 22006, { teachBack: '22: check típico (set-mine barato).' })
      ]
    },
    {
      id: 'C-13',
      title: 'Examen M1 · Preflop',
      route: 'cash', module: 'M1', order: 13, plan: 'study',
      xp: 160, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 10,
      concept: 'Repaso M1: defensa BB, 3-bet, vs 3-bet, squeeze, iso y BB vs SB limp. Sin teoría nueva.',
      theory: [
        'Aplica C-07 a C-12. Mira el spot: ¿quién abrió? ¿hay limp o 3-bet?',
        'Checklist: posición → tipo de spot → ¿value, continue o fold?'
      ],
      examples: [{
        title: 'Antes de pulsar',
        body: 'Identifica el nodo (vs open / vs 3-bet / squeeze / iso). Luego decide con el rango de esa silla.'
      }],
      aiQuestions: ['¿Cuál es mi fuga preflop más típica?', 'Resume 3-bet polar en una frase.'],
      spots: [
        vs('c13-01', 'BB_vs_BTN', ['As', 'Ks'], 23001, { teachBack: 'AKs vs BTN: 3-bet value.' }),
        vs('c13-02', 'BB_vs_UTG', ['Qh', '9c'], 23002, { trapTag: 'dominated', teachBack: 'Q9o vs UTG: fold.' }),
        f3('c13-03', 'BTN_vs_BB', ['Ah', 'Td'], 23003, { teachBack: 'ATo BTN vs 3-bet: call frecuente.' }),
        f3('c13-04', 'UTG_vs_BB', ['Kh', 'Td'], 23004, { trapTag: 'dominated', teachBack: 'KTo UTG vs 3-bet: fold.' }),
        sq('c13-05', 'BB', 'CO', 'BTN', ['Qc', 'Qd'], 23005, { teachBack: 'QQ: squeeze.' }),
        iso('c13-06', 'BTN', 'UTG', ['7d', '2c'], 23006, { trapTag: 'dominated', teachBack: '72o: fold vs limp.' }),
        bb('c13-07', ['Ah', 'Kd'], 23007, { teachBack: 'AKo BB vs SB limp: iso.' }),
        vs('c13-08', 'BB_vs_CO', ['9s', '8s'], 23008, { teachBack: '98s vs CO: defensa sólida.' }),
        iso('c13-09', 'CO', 'HJ', ['Jd', 'Ts'], 23009, { teachBack: 'JTs: iso razonable.' }),
        sq('c13-10', 'BB', 'HJ', 'BTN', ['8c', '5d'], 23010, { trapTag: 'fancy_play', teachBack: '85o: no squeeze. Fold.' })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
