/*
 * school-data-m1.js — Cash M1 Preflop core (Study). C-07…C-13.
 * Se registra sobre PTSchoolData tras school-data.js (Fase E).
 *
 * Estilo (C-09+ y futuras): términos de póker sí, pero con ancla en español
 * la 1ª vez en la lección. Frases de profesor, no telegramas de chart.
 * Call = «hacer call». Limp = «limpear». Ver RoadMap §4.5.
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
      concept: 'Desde la ciega grande, frente a un open, eliges fold, hacer call o 3-bet según la posición del agresor y tu mano.',
      theory: [
        'Tras el open del rival, en BB ya tienes 1 bb invertida: eso mejora tus odds para hacer call, pero no justifica defender basura.',
        'Contra opens late (CO/BTN) defiendes más wide (con más manos); contra UTG/HJ eres más tight. A veces haces 3-bet (vuelves a subir): en la siguiente lección verás con qué manos y por qué.',
        'Trampa: overdefend — hacer call de más con manos dominadas — o 3-betear basura vs opens tempranos sin un plan claro.'
      ],
      examples: [{
        title: 'Misma mano, distinto open',
        body: 'Con KJo vs open UTG suele ser fold. La misma KJo vs open BTN entra a menudo en call o 3-bet ligero según el chart. La silla del agresor cambia tu respuesta.'
      }],
      aiQuestions: ['¿Qué cambia al defender BB vs BTN respecto a vs UTG?', '¿Cuándo prefiero 3-betear en vez de hacer call desde BB?'],
      spots: [
        vs('c07-01', 'BB_vs_BTN', ['Qs', 'Qh'], 17001, { teachBack: 'QQ vs BTN: 3-bet de valor claro. Quieres más dinero en el bote.' }),
        vs('c07-02', 'BB_vs_UTG', ['Kh', 'Jd'], 17002, { teachBack: 'KJo vs UTG: call del chart (defensa BB). Dominada a veces, pero solvers la defienden; no la marques fold automático.' }),
        vs('c07-03', 'BB_vs_BTN', ['Kh', 'Jd'], 17003, { teachBack: 'KJo vs BTN: defensa razonable (hacer call o 3-bet ligero según el mix).' }),
        vs('c07-04', 'BB_vs_CO', ['8d', '3c'], 17004, { trapTag: 'dominated', teachBack: '83o vs CO: fold. No hagas call de más solo porque estás en BB.' }),
        vs('c07-05', 'BB_vs_BTN', ['9s', '8s'], 17005, { teachBack: '98s vs BTN: call cómodo, buena jugabilidad si ves flop.' }),
        vs('c07-06', 'BB_vs_HJ', ['Ac', '9c'], 17006, { teachBack: 'A9s vs HJ: 3-bet frecuente en muchos charts. En C-08 verás por qué este tipo de mano encaja como farol.' }),
        vs('c07-07', 'BB_vs_UTG', ['Qh', '9c'], 17007, { trapTag: 'dominated', teachBack: 'Q9o vs UTG: fold. No defiendas basura vs opens tempranos.' }),
        vs('c07-08', 'BB_vs_CO', ['Jc', 'Tc'], 17008, { teachBack: 'JTs vs CO: call o 3-bet sólido; conectores altos suited se defienden bien.' })
      ]
    },
    {
      id: 'C-08',
      title: '3-bet value y polar',
      route: 'cash', module: 'M1', order: 8, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'El 3-bet no es solo con manos bestiales: también puedes farolear con manos elegidas. Ese mix “muy fuerte + faroles” se llama polar.',
      theory: [
        'Un 3-bet es volver a subir después del open del rival. La parte value es la fácil: manos con las que quieres mucho dinero en el bote — típico QQ, KK, AA, AK, y a veces JJ o AQ según posición.',
        'Un bluff (farol) es 3-betear sin tener aún una mano “para value”: ganas sobre todo si el rival se tira. Los faroles buenos suelen llevar blockers: cartas que restan combinaciones fuertes al rival. Ejemplo: con A4s tienes un as; al rival le cuesta tener AA o AK porque tú ya “ocupas” un as.',
        'Polar significa que tu rango de 3-bet se parte en dos polos — manos muy fuertes y faroles elegidos — y casi nada del medio (KTo, Q9o…). Contra open del botón puedes 3-betear más light (más faroles). Contra open UTG vas más a value: el rival abre tight y te paga o te 4-betea con manos mejores.',
        'Spew es tirar fichas sin plan: 3-betear basura offsuit (KJo, QTo) sobre todo vs opens tempranos. La trampa opuesta también existe: nunca farolear cuando el spot (blinds vs BTN) sí lo pide.'
      ],
      examples: [{
        title: 'A4s sí, KTo no',
        body: 'Estás en BB y el botón abre. Con A4s del mismo palo muchos charts 3-betean: es un farol con blockers (quitas AA/AK del rival) y algo de equity si te pagan. Con KTo offsuit, mejor fold o a veces hacer call — 3-betear eso suele ser spew: fichas mal gastadas sin historia clara postflop.'
      }],
      aiQuestions: [
        '¿Qué es un 3-bet polar, en una frase de profesor?',
        '¿Por qué A4s puede ser farol de 3-bet y KTo no?'
      ],
      spots: [
        vs('c08-01', 'BB_vs_BTN', ['As', 'Kd'], 18001, {
          teachBack: 'AKo vs BTN es 3-bet de value: quieres aislar y jugar un bote grande con una mano fuerte.'
        }),
        vs('c08-02', 'BB_vs_BTN', ['Ad', '4d'], 18002, {
          teachBack: 'A4s vs BTN: 3-bet polar habitual. Es un farol con blockers (tienes un as) y algo de equity si hacen call.'
        }),
        vs('c08-03', 'BB_vs_UTG', ['Kh', 'Td'], 18003, {
          trapTag: 'fancy_play',
          teachBack: 'KTo vs UTG: 3-betear aquí suele ser spew (fichas sin plan). Fold típico ante un open temprano.'
        }),
        vs('c08-04', 'SB_vs_BTN', ['Ah', '2h'], 18004, {
          teachBack: 'A2s SB vs BTN: 3-bet polar frecuente — mismo idea que A4s: farol con as como blocker.'
        }),
        vs('c08-05', 'BB_vs_CO', ['Ah', 'Kh'], 18005, {
          teachBack: 'AKs vs CO: 3-bet de value claro. Quieres presión y un bote grande con una mano premium.'
        }),
        vs('c08-06', 'BB_vs_HJ', ['Qc', '9d'], 18006, {
          trapTag: 'fancy_play',
          teachBack: 'Q9o vs HJ no es farol de 3-bet: es mano media/offsuit. Aquí fold (o call muy selectivo); no spew.'
        }),
        vs('c08-07', 'BB_vs_BTN', ['7h', '6h'], 18007, {
          teachBack: '76s vs BTN: muchas líneas lo meten como 3-bet ligero o call. Tiene jugabilidad; no es spew como Q9o.'
        }),
        vs('c08-08', 'BB_vs_UTG', ['Jd', 'Jd'], 18008, {
          teachBack: 'JJ vs UTG: value claro. 3-bet o call mixto según el chart; no la trates como farol.'
        })
      ]
    },
    {
      id: 'C-09',
      title: 'Enfrentar 3-bet',
      route: 'cash', module: 'M1', order: 9, plan: 'study',
      xp: 130, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 8,
      concept: 'Abriste el bote y el rival hace 3-bet (vuelve a subir). Ahora eliges: fold, hacer call o 4-bet (subir otra vez).',
      theory: [
        'Si abriste fuera de posición — UTG o HJ — continúas más tight (con menos manos): el bote crece y tú actuarás primero en el flop. En el botón tienes más libertad para hacer call: juegas en posición.',
        'Un 4-bet es la siguiente subida tras el 3-bet. Lo usas de value con manos premium (QQ+, AK) cuando quieres aún más dinero en el bote. A veces también 4-beteas de farol con un as suited bajo (A5s): usas el as como blocker, la misma idea de C-08.',
        'Trampa clásica: el hero-call — pagar el 3-bet con una mano mediocre o dominada (ATo, KQo) por orgullo, sobre todo OOP. La otra trampa es foldear de más conectores suited en el botón cuando el spot sí admite call.'
      ],
      examples: [{
        title: 'Misma familia de ases, distinta respuesta',
        body: 'Abriste en el botón con ATs y la BB hace 3-bet: muchas veces haces call — la mano juega bien en posición. Con A9o offsuit, frente al mismo 3-bet, suele ser fold: menos jugabilidad y más fácil de dominar.'
      }],
      aiQuestions: [
        '¿Cuándo tiene sentido 4-betear vs un 3-bet?',
        '¿Por qué continúo más tight si abrí fuera de posición?'
      ],
      spots: [
        f3('c09-01', 'BTN_vs_BB', ['As', 'Ad'], 19001, {
          teachBack: 'AA vs 3-bet: 4-bet de value. Quieres un bote grande con la mejor mano.'
        }),
        f3('c09-02', 'BTN_vs_BB', ['Ah', 'Th'], 19002, {
          teachBack: 'ATs en el botón vs 3-bet de BB: call frecuente. Jugabilidad y posición a favor.'
        }),
        f3('c09-03', 'UTG_vs_BB', ['Ah', 'Td'], 19003, {
          trapTag: 'dominated',
          teachBack: 'ATo desde UTG vs 3-bet: fold típico. Estás OOP y la mano suele estar dominada. No hagas hero-call.'
        }),
        f3('c09-04', 'CO_vs_BTN', ['Kh', 'Qs'], 19004, {
          teachBack: 'KQo CO vs 3-bet del botón: call o 4-bet mixto razonable — mano fuerte con jugabilidad.'
        }),
        f3('c09-05', 'BTN_vs_SB', ['Jh', '2d'], 19005, {
          trapTag: 'dominated',
          teachBack: 'J2o vs cualquier 3-bet: fold siempre. No inventes hero-calls con basura.'
        }),
        f3('c09-06', 'HJ_vs_BB', ['Jh', 'Jc'], 19006, {
          teachBack: 'JJ desde HJ vs 3-bet: call frecuente. Pareja media sólida; no hace falta 4-betear siempre.'
        }),
        f3('c09-07', 'BTN_vs_BB', ['Ah', '5h'], 19007, {
          teachBack: 'A5s BTN vs BB: call o 4-bet farol según el mix. El as funciona como blocker, como en C-08.'
        }),
        f3('c09-08', 'CO_vs_BB', ['Qd', 'Jh'], 19008, {
          trapTag: 'dominated',
          teachBack: 'QJo CO vs 3-bet de BB: a menudo fold. Offsuit y sin posición clara de “seguir siempre”.'
        })
      ]
    },
    {
      id: 'C-10',
      title: 'Squeeze tras open+call',
      route: 'cash', module: 'M1', order: 10, plan: 'study',
      xp: 120, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Alguien abre, otro hace cold-call (paga el open sin haber hablado antes) y tú puedes squeeze: un 3-bet que castiga a los dos y pelea un bote ya grande.',
      theory: [
        'Cold-call es pagar el open desde una silla que no es ciega “automática”. Squeeze es volver a subir con open + call delante: hay dead money (fichas ya en el bote) y dos rivales que pueden tirar.',
        'Squeezas con value fuerte (QQ+, AK) y algunos faroles con blockers (ases suited). El que hizo cold-call suele tener un rango capped: pocas manos premium (esas ya habrían 3-beteado), así que tu presión funciona mejor.',
        'Si hacen call a tu squeeze, a menudo juegas un bote enorme multiway (más de dos jugadores) o fuera de posición. Por eso no squeezes basura (J9o, 85o): eso es spew.'
      ],
      examples: [{
        title: 'BB con open + call delante',
        body: 'CO abre, el botón hace call, tú en BB con JJ: squeeze de value — quieres el bote ya gordo o aislar. Con 85o: fold. No “inventes” un squeeze solo porque el bote se ve grande.'
      }],
      aiQuestions: [
        '¿Por qué el squeeze gana fold equity extra?',
        '¿Qué manos uso de farol en squeeze y por qué?'
      ],
      spots: [
        sq('c10-01', 'BB', 'CO', 'BTN', ['Td', 'Th'], 20001, {
          teachBack: 'TT: squeeze de value claro. Castigas open+call y pelear un bote grande con una mano fuerte.'
        }),
        sq('c10-02', 'BB', 'CO', 'BTN', ['8c', '5d'], 20002, {
          trapTag: 'fancy_play',
          teachBack: '85o: no hagas squeeze spew. Fold. Si te pagan, el bote es enorme y tu mano es floja.'
        }),
        sq('c10-03', 'BB', 'HJ', 'CO', ['Jc', 'Js'], 20003, {
          teachBack: 'JJ: squeeze de value. Quieres aislar o meter más fichas con una mano premium.'
        }),
        sq('c10-04', 'SB', 'CO', 'BTN', ['Ah', '5h'], 20004, {
          teachBack: 'A5s: squeeze polar frecuente — farol con as como blocker, misma lógica que el 3-bet polar.'
        }),
        sq('c10-05', 'BB', 'UTG', 'BTN', ['Jh', '9c'], 20005, {
          trapTag: 'fancy_play',
          teachBack: 'J9o vs UTG + call: fold. Vs open temprano el squeeze loco es spew.'
        }),
        sq('c10-06', 'BB', 'CO', 'BTN', ['6s', '6c'], 20006, {
          teachBack: '66: squeeze o call mixto; value razonable. No la trates como basura ni como AA automática.'
        })
      ]
    },
    {
      id: 'C-11',
      title: 'Iso-raise vs limps',
      route: 'cash', module: 'M1', order: 11, plan: 'study',
      xp: 110, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'Si alguien limpea (entra solo igualando la ciega), tú puedes aislar con un iso-raise: subir para jugar heads-up (uno contra uno) con la iniciativa.',
      theory: [
        'El iso-raise castiga el limpeo y te deja de agresor. Tamaño típico: unas 3–4 bb, y suma ~1 bb extra por cada limper. No hace falta un overbet raro.',
        'Aísla con value y manos con buena jugabilidad (suited, broadway, parejas). No aísles cualquier offsuit basura, sobre todo si vas a quedar fuera de posición.',
        'Trampa: overiso (aislar basura) o overlimp (limpear detrás de otro limp en vez de aislar o fold). En cash moderno, limpear detrás suele ser un leak.'
      ],
      examples: [{
        title: 'BTN vs limp UTG',
        body: 'UTG limpea y tú estás en el botón con AJs: iso claro — quieres heads-up con ventaja. Con 83o: fold. No “castigues” el limp con cualquier dos cartas.'
      }],
      aiQuestions: [
        '¿Qué tamaño de iso uso, en palabras simples?',
        '¿Cuándo tiene sentido limpear detrás en vez de aislar?'
      ],
      spots: [
        iso('c11-01', 'BTN', 'UTG', ['Ah', 'Js'], 21001, {
          teachBack: 'AJo en el botón vs limp: iso claro. Quieres aislar y jugar con la iniciativa.'
        }),
        iso('c11-02', 'BTN', 'UTG', ['Td', '3s'], 21002, {
          trapTag: 'dominated',
          teachBack: 'T3o: fold. No hagas overiso con basura solo porque alguien limpeó.'
        }),
        iso('c11-03', 'CO', 'HJ', ['Kd', 'Qs'], 21003, {
          teachBack: 'KQo en cutoff: iso de value. Mano fuerte que quiere heads-up.'
        }),
        iso('c11-04', 'SB', 'CO', ['9h', '8h'], 21004, {
          teachBack: '98s desde SB: iso razonable. Suited y jugable; no es overiso de basura.'
        }),
        iso('c11-05', 'CO', 'UTG', ['Ts', '7c'], 21005, {
          trapTag: 'fancy_play',
          teachBack: 'T7o: fold frecuente. Aislar esto suele ser overiso — spew disfrazado de “castigo”.'
        }),
        iso('c11-06', 'BTN', 'HJ', ['5s', '5c'], 21006, {
          teachBack: '55 en el botón: iso común. Pareja pequeña con posición; quieres heads-up.'
        })
      ]
    },
    {
      id: 'C-12',
      title: 'BB vs SB limp',
      route: 'cash', module: 'M1', order: 12, plan: 'study',
      xp: 100, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 6,
      concept: 'La ciega pequeña limpea: en BB puedes check (opción gratis — no pones más fichas) o iso-raise para castigar el limp.',
      theory: [
        'Check con manos mediocres aprovecha la opción: ya estás en el bote. Iso con value (JJ, TT, AQs…) y algunas manos de presión (ases suited). No tienes que aislar cada mano.',
        'No overfoldees el spot: la BB ya puso su ciega. Tampoco aísles 93o “porque el SB limpeó”: eso es spew.',
        'Trampa doble: check eterno con AA/KK (dejas valor en la mesa) o iso spew con basura. Elige con intención.'
      ],
      examples: [{
        title: 'Opción vs castigo',
        body: 'SB limpea. Tú con 22: check frecuente — barato para buscar trío (set-mine). Con AKo: iso, quieres castigar el limp y jugar un bote más grande con la mejor mano.'
      }],
      aiQuestions: [
        '¿Cuándo checkeo vs SB limp?',
        '¿Qué manos aíslo desde BB y por qué?'
      ],
      spots: [
        bb('c12-01', ['Jh', 'Jd'], 22001, {
          teachBack: 'JJ vs SB limp: iso. Castigas el limp y metes valor con una mano fuerte.'
        }),
        bb('c12-02', ['6h', '2c'], 22002, {
          trapTag: 'fancy_play',
          teachBack: '62o: check (opción gratis). No hagas iso spew con basura.'
        }),
        bb('c12-03', ['Ts', 'Tc'], 22003, {
          teachBack: 'TT: iso de value. No regales un flop barato al SB limpeando.'
        }),
        bb('c12-04', ['9s', '8c'], 22004, {
          teachBack: '98o: check frecuente. Mano especulativa; aprovecha la opción.'
        }),
        bb('c12-05', ['As', '6s'], 22005, {
          teachBack: 'A6s: iso frecuente. Farol/presión con as blocker y algo de equity si pagan.'
        }),
        bb('c12-06', ['2h', '2c'], 22006, {
          teachBack: '22: check típico — set-mine barato (buscar trío en el flop sin meter más fichas ahora).'
        })
      ]
    },
    {
      id: 'C-13',
      title: 'Examen M1 · Preflop',
      route: 'cash', module: 'M1', order: 13, plan: 'study',
      xp: 160, passThreshold: 0.7, goldThreshold: 0.9, decisionEnd: true, hands: 10,
      concept: 'Repaso del módulo: defensa BB, 3-bet, enfrentar 3-bet, squeeze, iso y BB vs SB limp. Sin teoría nueva.',
      theory: [
        'No hay concepto nuevo. Aplica C-07 a C-12: primero identifica el spot (¿open? ¿3-bet? ¿limp? ¿open+call?), luego decide.',
        'Checklist rápido: ¿qué silla soy? → ¿qué hizo el rival? → ¿quiero value, farol/presión, continuar (call) o fold?'
      ],
      examples: [{
        title: 'Antes de pulsar',
        body: 'Nombra el nodo en voz alta: “vs open”, “vs 3-bet”, “squeeze”, “iso” o “BB vs SB limp”. Si no sabes qué spot es, para un segundo. Luego elige con el rango de esa silla.'
      }],
      aiQuestions: [
        '¿Cuál es mi fuga preflop más típica en este módulo?',
        'Resume 3-bet polar en una frase de profesor.'
      ],
      spots: [
        vs('c13-01', 'BB_vs_BTN', ['Ah', 'Jh'], 23001, {
          teachBack: 'AJs vs BTN: 3-bet de value. Mano premium frente a un open late.'
        }),
        vs('c13-02', 'BB_vs_UTG', ['Qh', '9c'], 23002, {
          trapTag: 'dominated',
          teachBack: 'Q9o vs UTG: fold. No overdefiendas basura vs opens tempranos.'
        }),
        f3('c13-03', 'BTN_vs_BB', ['Ah', 'Td'], 23003, {
          teachBack: 'ATo en el botón vs 3-bet: call frecuente. Posición y jugabilidad a favor.'
        }),
        f3('c13-04', 'UTG_vs_BB', ['Kh', 'Td'], 23004, {
          trapTag: 'dominated',
          teachBack: 'KTo UTG vs 3-bet: fold. OOP y mano fácil de dominar — evita el hero-call.'
        }),
        sq('c13-05', 'BB', 'CO', 'BTN', ['Ks', 'Qs'], 23005, {
          teachBack: 'KQs: squeeze de value tras open+call.'
        }),
        iso('c13-06', 'BTN', 'UTG', ['4s', '2d'], 23006, {
          trapTag: 'dominated',
          teachBack: '42o vs limp: fold. No overiso.'
        }),
        bb('c13-07', ['Qs', 'Qh'], 23007, {
          teachBack: 'QQ BB vs SB limp: iso para castigar.'
        }),
        vs('c13-08', 'BB_vs_CO', ['9s', '8s'], 23008, {
          teachBack: '98s vs CO: defensa sólida (call o 3-bet según mix).'
        }),
        iso('c13-09', 'CO', 'HJ', ['Jd', 'Ts'], 23009, {
          teachBack: 'JTo: iso razonable vs limp — jugabilidad e iniciativa.'
        }),
        sq('c13-10', 'BB', 'HJ', 'BTN', ['8c', '5d'], 23010, {
          trapTag: 'fancy_play',
          teachBack: '85o: no squeeze. Fold. Evita spew en botes multiway.'
        })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
