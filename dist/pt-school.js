/* PokerForgeAI bundle: pt-school.js — do not edit */
/*
 * school-data.js — Currículum M0 Escuela de Póker (Cash fundamentos, Gratis completo).
 * RoadMap v2: C-00…C-06. Spots RFI fijos; grading del motor GTO.
 */
(function (global) {
  'use strict';

  var XP_PER_LEVEL = 200;
  var SCHOOL_DATA_VERSION = 2;

  var ROUTES = [
    { id: 'cash', label: 'Cash', status: 'active' },
    { id: 'spin', label: 'Spins', status: 'soon', teaser: 'Intro gratis próximamente (S-00–S-02)' },
    { id: 'mtt', label: 'Torneos', status: 'soon', teaser: 'Intro gratis próximamente (T-00–T-02)' }
  ];

  /** Spots RFI: hero actúa open/fold; decisionEnd corta tras la 1ª decisión. */
  function rfiSpot(id, heroPos, heroCards, seed, meta) {
    meta = meta || {};
    return {
      id: id,
      type: 'RFI',
      heroPos: heroPos,
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: [],
        villainPos: 'BB'
      },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || (heroPos + ' · ' + heroCards.join(''))
    };
  }

  var LESSONS = [
    {
      id: 'C-00',
      title: 'Cómo funciona la Escuela',
      route: 'cash',
      module: 'M0',
      order: 0,
      plan: 'free',
      xp: 40,
      passThreshold: 1,
      goldThreshold: 1,
      decisionEnd: true,
      hands: 0,
      concept: 'La Escuela de Póker enseña un concepto por lección y lo examina con spots fijos, no aleatorios.',
      theory: [
        'El módulo M0 (Fundamentos Cash) es completo en plan Gratis: 7 lecciones de posición, RFI, fold equity, sizing y SB.',
        'Cada lección tiene teoría breve, un ejemplo y (si aplica) una sesión de manos preparadas.',
        'La mano se evalúa en el punto de decisión del concepto: open o fold — sin obligarte a jugar el resto si no aporta.',
        'Si apruebas el umbral, desbloqueas la siguiente. Puedes repetir para subir tu mejor porcentaje hacia el 100 %.',
        'En plan Gratis, cada mano de lección consume el mismo cupo diario del entrenador (15/día). Study y Coach desbloquean el resto del árbol.'
      ],
      examples: [
        {
          title: 'Flujo de una lección',
          body: 'Lees el concepto → ves un ejemplo comentado → juegas N spots fijos → ves tu % → si apruebas, se abre la siguiente lección.'
        }
      ],
      aiQuestions: [
        '¿En qué se diferencia la Escuela del entrenador libre?',
        '¿Qué incluye el módulo M0 gratis?'
      ],
      spots: []
    },
    {
      id: 'C-01',
      title: 'Posición y por qué manda',
      route: 'cash',
      module: 'M0',
      order: 1,
      plan: 'free',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 12,
      concept: 'La misma mano no se juega igual desde UTG que desde BTN: la posición cambia el open-raise y el fold equity.',
      theory: [
        'Cuanto más temprana la posición, más jugadores quedan por actuar detrás: tu rango de open debe ser más tight.',
        'En late (CO/BTN) puedes abrir más ancho porque robas ciegas con más frecuencia y juegas más manos en posición postflop.',
        'Trampa clásica: abrir basura UTG “porque es premium-looking” (KTo, A9o) o foldear opens claros en BTN por miedo.'
      ],
      examples: [
        {
          title: 'Misma mano, distinta posición',
          body: 'ATo es un fold frecuente UTG a 100 bb, pero un open estándar en BTN. El combo no cambió: cambió quién actúa detrás.'
        }
      ],
      aiQuestions: [
        '¿Por qué UTG abre más tight que BTN?',
        '¿Qué ventaja da jugar en posición postflop?'
      ],
      spots: [
        rfiSpot('c01-01', 'UTG', ['Ah', 'Td'], 11001, {
          trapTag: 'position_blind',
          teachBack: 'ATo UTG enfrenta demasiado frío detrás. Mejor fold; en BTN sería open.'
        }),
        rfiSpot('c01-02', 'BTN', ['Ah', 'Td'], 11002, {
          teachBack: 'En BTN ATo es un open claro: pocas manos detrás y buen playability.'
        }),
        rfiSpot('c01-03', 'UTG', ['Kc', 'Td'], 11003, {
          trapTag: 'dominated',
          teachBack: 'KTo UTG está dominado por AK/KQ/KJ. Fold estándar a 100 bb.'
        }),
        rfiSpot('c01-04', 'CO', ['Kc', 'Ts'], 11004, {
          teachBack: 'KTs en CO entra en muchos rangos de open: buena jugabilidad y fold equity.'
        }),
        rfiSpot('c01-05', 'HJ', ['Qs', 'Js'], 11005, {
          teachBack: 'QJs es open cómodo desde HJ: suited connector high con buen plan postflop.'
        }),
        rfiSpot('c01-06', 'UTG', ['Qd', 'Jd'], 11006, {
          teachBack: 'QJs también se abre UTG en muchos charts modernos; no la trates como basura early.'
        }),
        rfiSpot('c01-07', 'BTN', ['8h', '7h'], 11007, {
          teachBack: 'Suited connectors en BTN son opens de posición y steal.'
        }),
        rfiSpot('c01-08', 'UTG', ['8c', '7c'], 11008, {
          trapTag: 'position_blind',
          teachBack: '87s UTG suele ser fold: poco fold equity y malas spots OOP multiway.'
        }),
        rfiSpot('c01-09', 'CO', ['Ad', '5d'], 11009, {
          teachBack: 'A5s CO se abre: blockers + jugabilidad. (El SB lo trabajamos en C-05.)'
        }),
        rfiSpot('c01-10', 'HJ', ['9s', '9c'], 11010, {
          teachBack: 'Parejas medias se abren casi desde cualquier posición. Open.'
        }),
        rfiSpot('c01-11', 'CO', ['Ah', '2c'], 11011, {
          trapTag: 'dominated',
          teachBack: 'A2o en CO es marginal/basura offsuit: muchas veces fold vs open wide no justificado.'
        }),
        rfiSpot('c01-12', 'BTN', ['Kh', '9d'], 11012, {
          teachBack: 'K9o BTN es un steal frecuente. La posición justifica el open.'
        })
      ]
    },
    {
      id: 'C-02',
      title: 'Open-raise (RFI) básico',
      route: 'cash',
      module: 'M0',
      order: 2,
      plan: 'free',
      xp: 120,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 14,
      concept: 'Raise First In: si nadie ha entrado, decides open-raise o fold según tu rango de posición.',
      theory: [
        'RFI es la base del preflop cash: memoriza rangos por posición (UTG más tight → BTN más wide).',
        'Sizing típico ~2–2,5 bb (lo profundizamos en C-04); aquí lo importante es la decisión open vs fold.',
        'Trampas: opens dominados early, foldear manos claras de late, y “inventar” limps (aquí solo open o fold).'
      ],
      examples: [
        {
          title: 'Open desde CO',
          body: 'Pliega UTG y HJ. En CO con AJs subes a ~2,2–2,5 bb. No limpes: open o fold.'
        }
      ],
      aiQuestions: [
        '¿Qué manos debo abrir desde UTG a 100 bb?',
        '¿Por qué no se limpia en vez de open-raise en cash 6-max?'
      ],
      spots: [
        rfiSpot('c02-01', 'UTG', ['As', 'Ad'], 12001, { teachBack: 'AA siempre open. Sin drama.' }),
        rfiSpot('c02-02', 'UTG', ['7h', '2d'], 12002, {
          trapTag: 'dominated',
          teachBack: '72o es la mano más débil. Fold desde cualquier posición en RFI.'
        }),
        rfiSpot('c02-03', 'HJ', ['Ah', 'Ks'], 12003, { teachBack: 'AKo es open universal.' }),
        rfiSpot('c02-04', 'CO', ['Qs', 'Ts'], 12004, { teachBack: 'QTs CO: open estándar en charts 6-max.' }),
        rfiSpot('c02-05', 'BTN', ['Td', '9d'], 12005, { teachBack: 'T9s BTN: open de steal + jugabilidad.' }),
        rfiSpot('c02-06', 'UTG', ['Ah', '9c'], 12006, {
          trapTag: 'dominated',
          teachBack: 'A9o UTG se domina por AJ+/AQ/AK. Fold típico.'
        }),
        rfiSpot('c02-07', 'BTN', ['Ac', '9h'], 12007, { teachBack: 'A9o BTN suele ser open; late position cambia la respuesta.' }),
        rfiSpot('c02-08', 'HJ', ['Kh', 'Qd'], 12008, { teachBack: 'KQo HJ es open frecuente.' }),
        rfiSpot('c02-09', 'HJ', ['6s', '6c'], 12009, { teachBack: '66 se abre desde HJ sin dudar.' }),
        rfiSpot('c02-10', 'CO', ['Jd', '8d'], 12010, { teachBack: 'J8s CO entra en muchos rangos de open wide.' }),
        rfiSpot('c02-11', 'UTG', ['Kd', 'Js'], 12011, {
          trapTag: 'dominated',
          teachBack: 'KJo UTG es spot fronterizo/fold en muchos charts; no es un open automático.'
        }),
        rfiSpot('c02-12', 'BTN', ['5h', '4h'], 12012, { teachBack: '54s BTN: open especulativo de posición.' }),
        rfiSpot('c02-13', 'CO', ['Ah', 'Qc'], 12013, { teachBack: 'AQo CO: value open claro.' }),
        rfiSpot('c02-14', 'UTG', ['2h', '2c'], 12014, {
          teachBack: 'Parejas bajas a veces se abren UTG (set-mining / defensa de rango); sigue la referencia del motor.'
        })
      ]
    },
    {
      id: 'C-03',
      title: 'Fold equity: open o fold',
      route: 'cash',
      module: 'M0',
      order: 3,
      plan: 'free',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 10,
      concept: 'El open-raise compra fold equity; limpear (o “esperar”) regala la iniciativa. En RFI la decisión es binaria: open o fold.',
      theory: [
        'Fold equity = probabilidad de que los rivales tiren la mano ante tu subida. Por eso open > limp en cash moderno.',
        'Si tu mano no es lo bastante fuerte para open en esa posición, la respuesta correcta es fold — no “ver flop barato”.',
        'Trampa fancy-play: pasar manos openables o forzar opens sin FE ni equity.'
      ],
      examples: [
        {
          title: 'Sin limps mentales',
          body: 'En BTN con KTo quieres robar. Open. Si estuvieras UTG con la misma mano y no entra en rango, fold — no limpees.'
        }
      ],
      aiQuestions: [
        '¿Qué es el fold equity en un open-raise?',
        '¿Por qué el limp es peor que open o fold en cash 6-max?'
      ],
      spots: [
        rfiSpot('c03-01', 'BTN', ['Kc', 'Td'], 13001, {
          teachBack: 'KTo BTN tiene FE real: open para robar ciegas.'
        }),
        rfiSpot('c03-02', 'UTG', ['Kc', 'Td'], 13002, {
          trapTag: 'fancy_play',
          teachBack: 'Misma mano UTG: sin FE suficiente ni equity. Fold, no “ver flop”.'
        }),
        rfiSpot('c03-03', 'CO', ['As', '5s'], 13003, {
          teachBack: 'A5s CO se abre: blockers + FE + jugabilidad.'
        }),
        rfiSpot('c03-04', 'HJ', ['Qh', '9c'], 13004, {
          trapTag: 'fancy_play',
          teachBack: 'Q9o HJ no es un open cómodo; fold es la línea disciplinada.'
        }),
        rfiSpot('c03-05', 'BTN', ['Qh', '9c'], 13005, {
          teachBack: 'Q9o gana FE en BTN. Open de steal.'
        }),
        rfiSpot('c03-06', 'CO', ['9d', '8d'], 13006, {
          teachBack: '98s CO: open con FE y playability. (SB lo vemos en C-05.)'
        }),
        rfiSpot('c03-07', 'UTG', ['Th', '7h'], 13007, {
          trapTag: 'dominated',
          teachBack: 'T7s UTG: poco FE, mala realización. Fold.'
        }),
        rfiSpot('c03-08', 'CO', ['Jh', 'Tc'], 13008, {
          teachBack: 'JTo CO es open común: suficiente FE y boards que puedes continuar.'
        }),
        rfiSpot('c03-09', 'BTN', ['7c', '6d'], 13009, {
          teachBack: '76o BTN es frontera; muchas estrategias lo abren por FE puro. Evalúa con el motor.'
        }),
        rfiSpot('c03-10', 'HJ', ['Ad', 'Kd'], 13010, {
          teachBack: 'AKs: open por value y FE. Nunca limp.'
        })
      ]
    },
    {
      id: 'C-04',
      title: 'Sizing del open',
      route: 'cash',
      module: 'M0',
      order: 4,
      plan: 'free',
      xp: 100,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 12,
      concept: 'En cash 6-max a 100 bb el open estándar es ~2–2,5 bb. La decisión clave sigue siendo open o fold; el sizing no sustituye un rango malo.',
      theory: [
        'Sizing estándar (~2–2,5 bb) mantiene el bote jugable y te da FE suficiente sin inflar el pot con manos mediocres.',
        'No “arreglas” un open malo abriendo más grande: si la mano no entra en rango, fold.',
        'Más adelante (Study) verás ajustes por sala, vs fish o stacks cortos; en M0 interioriza el estándar y la disciplina open/fold.'
      ],
      examples: [
        {
          title: 'Open estándar, no hero size',
          body: 'En CO con AJs abres ~2,2–2,5 bb. No subas a 5 bb “para proteger” ni limpees: open estándar o fold.'
        }
      ],
      aiQuestions: [
        '¿Por qué open a 2–2,5 bb y no a 4 bb en cash 100 bb?',
        '¿El sizing grande justifica abrir manos peores?'
      ],
      spots: [
        rfiSpot('c04-01', 'CO', ['Ah', 'Js'], 14001, {
          teachBack: 'AJs CO: open claro con sizing estándar. No limpees ni inventes oversize.'
        }),
        rfiSpot('c04-02', 'UTG', ['7h', '2d'], 14002, {
          trapTag: 'dominated',
          teachBack: '72o no se “arregla” abriendo grande. Fold.'
        }),
        rfiSpot('c04-03', 'BTN', ['Td', '9d'], 14003, {
          teachBack: 'T9s BTN: open steal con sizing normal. La FE viene de la posición, no del oversize.'
        }),
        rfiSpot('c04-04', 'HJ', ['Qs', '9c'], 14004, {
          trapTag: 'fancy_play',
          teachBack: 'Q9o HJ no entra cómodo: fold. Un open grande no lo convierte en bueno.'
        }),
        rfiSpot('c04-05', 'CO', ['Kh', 'Qs'], 14005, {
          teachBack: 'KQo CO: value open. Sizing estándar.'
        }),
        rfiSpot('c04-06', 'UTG', ['Ah', '9d'], 14006, {
          trapTag: 'dominated',
          teachBack: 'A9o UTG: fold. No compensas con sizing.'
        }),
        rfiSpot('c04-07', 'BTN', ['8c', '7c'], 14007, {
          teachBack: '87s BTN: open steal estándar.'
        }),
        rfiSpot('c04-08', 'HJ', ['5s', '5c'], 14008, {
          teachBack: '55 HJ: open. El tamaño típico basta; no necesitas iso enorme sin limps.'
        }),
        rfiSpot('c04-09', 'UTG', ['Jd', 'Td'], 14009, {
          teachBack: 'JTs UTG suele ser open en charts modernos con sizing estándar.'
        }),
        rfiSpot('c04-10', 'CO', ['6h', '5d'], 14010, {
          trapTag: 'fancy_play',
          teachBack: '65o CO: fold frecuente. No lo forces con un open “para ver flop”.'
        }),
        rfiSpot('c04-11', 'BTN', ['Ac', '4c'], 14011, {
          teachBack: 'A4s BTN: open wide / blockers con sizing normal.'
        }),
        rfiSpot('c04-12', 'HJ', ['Kd', 'Jc'], 14012, {
          teachBack: 'KJo HJ: open habitual. Disciplina: open estándar o fold, no limp.'
        })
      ]
    },
    {
      id: 'C-05',
      title: 'RFI desde SB',
      route: 'cash',
      module: 'M0',
      order: 5,
      plan: 'free',
      xp: 110,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 12,
      concept: 'El SB es early OOP frente al BB: abres más tight que en BTN. Over-open desde SB es una trampa clásica.',
      theory: [
        'Tras el SB queda el BB: juegas casi siempre fuera de posición postflop si te llaman.',
        'Por eso el rango RFI SB es más tight que BTN: menos basura offsuit, más manos con playability o blockers.',
        'Trampa: abrir K9o/Q8o/JTo “porque es late” — en SB no eres BTN.'
      ],
      examples: [
        {
          title: 'BTN ≠ SB',
          body: 'K9o en BTN suele ser steal. La misma mano en SB vs BB es mucho más marginal: muchas veces fold o 3-bet polar, no open automático wide.'
        }
      ],
      aiQuestions: [
        '¿Por qué el SB abre más tight que el BTN?',
        '¿Qué manos priorizo al abrir desde SB?'
      ],
      spots: [
        rfiSpot('c05-01', 'SB', ['As', 'Kd'], 15001, {
          teachBack: 'AKo SB: open/3-bet fuerte. Clear open vs BB.'
        }),
        rfiSpot('c05-02', 'SB', ['Kh', '9c'], 15002, {
          trapTag: 'over_open_sb',
          teachBack: 'K9o SB: trampa over-open. OOP vs BB; muchas estrategias fold o 3-bet polar, no open wide automático.'
        }),
        rfiSpot('c05-03', 'SB', ['Qs', 'Js'], 15003, {
          teachBack: 'QJs SB: open sólido (suited, playability).'
        }),
        rfiSpot('c05-04', 'SB', ['7d', '2c'], 15004, {
          trapTag: 'dominated',
          teachBack: '72o SB: fold. Nunca.'
        }),
        rfiSpot('c05-05', 'SB', ['Ad', '5d'], 15005, {
          teachBack: 'A5s SB: open frecuente (blockers + equity).'
        }),
        rfiSpot('c05-06', 'SB', ['Jh', 'Tc'], 15006, {
          trapTag: 'over_open_sb',
          teachBack: 'JTo SB es frontera/fold en muchos charts: OOP duele. No lo trates como BTN.'
        }),
        rfiSpot('c05-07', 'SB', ['9s', '9c'], 15007, {
          teachBack: '99 SB: open claro.'
        }),
        rfiSpot('c05-08', 'SB', ['Qc', '8d'], 15008, {
          trapTag: 'over_open_sb',
          teachBack: 'Q8o SB: basura offsuit OOP. Fold.'
        }),
        rfiSpot('c05-09', 'SB', ['Kh', 'Qs'], 15009, {
          teachBack: 'KQo SB: open habitual vs BB.'
        }),
        rfiSpot('c05-10', 'SB', ['8h', '7h'], 15010, {
          teachBack: '87s SB: open especulativo pero razonable (suited).'
        }),
        rfiSpot('c05-11', 'SB', ['Ah', '2c'], 15011, {
          trapTag: 'over_open_sb',
          teachBack: 'A2o SB: débil offsuit OOP. Suele ser fold o 3-bet polar muy selectivo — no open automático.'
        }),
        rfiSpot('c05-12', 'SB', ['Jc', 'Tc'], 15012, {
          teachBack: 'JTs SB: open fuerte (suited connector high).'
        })
      ]
    },
    {
      id: 'C-06',
      title: 'Examen M0 · Fundamentos',
      route: 'cash',
      module: 'M0',
      order: 6,
      plan: 'free',
      xp: 150,
      passThreshold: 0.7,
      goldThreshold: 0.9,
      decisionEnd: true,
      hands: 16,
      concept: 'Examen del módulo: posición, RFI, fold equity, sizing mental y SB mezclados con trampas.',
      theory: [
        'No hay teoría nueva: aplica C-01 a C-05.',
        'Checklist: posición → ¿entra en rango? → open estándar o fold. En SB, más tight que BTN.'
      ],
      examples: [
        {
          title: 'Checklist rápido',
          body: '1) ¿Qué posición? 2) ¿El combo está en el rango de open? 3) Si no, fold. Si sí, open (sizing estándar).'
        }
      ],
      aiQuestions: [
        '¿Cuáles son mis fugas más típicas al abrir el bote?',
        'Resume en una frase RFI UTG vs BTN vs SB.'
      ],
      spots: [
        rfiSpot('c06-01', 'UTG', ['As', 'Ks'], 16001, { teachBack: 'AKs UTG: open.' }),
        rfiSpot('c06-02', 'UTG', ['Kd', '9c'], 16002, {
          trapTag: 'dominated',
          teachBack: 'K9o UTG: fold.'
        }),
        rfiSpot('c06-03', 'BTN', ['Kd', '9c'], 16003, { teachBack: 'K9o BTN: open.' }),
        rfiSpot('c06-04', 'SB', ['Kd', '9c'], 16004, {
          trapTag: 'over_open_sb',
          teachBack: 'K9o SB: no es BTN. Fold / no over-open.'
        }),
        rfiSpot('c06-05', 'CO', ['Qh', 'Qd'], 16005, { teachBack: 'QQ: open siempre (sizing estándar).' }),
        rfiSpot('c06-06', 'HJ', ['Ah', 'Td'], 16006, { teachBack: 'ATo HJ suele ser open.' }),
        rfiSpot('c06-07', 'UTG', ['Ah', 'Td'], 16007, {
          trapTag: 'position_blind',
          teachBack: 'ATo UTG: fold frecuente.'
        }),
        rfiSpot('c06-08', 'SB', ['Js', 'Ts'], 16008, { teachBack: 'JTs SB: open.' }),
        rfiSpot('c06-09', 'BTN', ['4h', '4c'], 16009, { teachBack: '44 BTN: open.' }),
        rfiSpot('c06-10', 'CO', ['9c', '8h'], 16010, {
          trapTag: 'fancy_play',
          teachBack: '98o CO no es automático; muchas veces fold. No inventes el limp ni el oversize.'
        }),
        rfiSpot('c06-11', 'BTN', ['9c', '8h'], 16011, { teachBack: '98o BTN: steal razonable.' }),
        rfiSpot('c06-12', 'UTG', ['Qc', 'Jc'], 16012, { teachBack: 'QJs UTG: open en charts modernos.' }),
        rfiSpot('c06-13', 'SB', ['Qc', '8d'], 16013, {
          trapTag: 'over_open_sb',
          teachBack: 'Q8o SB: fold. Over-open típico.'
        }),
        rfiSpot('c06-14', 'CO', ['Ad', 'Jc'], 16014, { teachBack: 'AJo CO: open.' }),
        rfiSpot('c06-15', 'BTN', ['Kh', '5h'], 16015, { teachBack: 'K5s BTN: open wide / blockers.' }),
        rfiSpot('c06-16', 'UTG', ['Td', '8d'], 16016, {
          trapTag: 'position_blind',
          teachBack: 'T8s UTG: fold típico; guárdalo para late.'
        })
      ]
    }
  ];

  function getLessons() {
    return LESSONS.slice();
  }

  function getLesson(id) {
    for (var i = 0; i < LESSONS.length; i++) {
      if (LESSONS[i].id === id) return LESSONS[i];
    }
    return null;
  }

  function lessonsForRoute(routeId) {
    return LESSONS.filter(function (l) { return l.route === (routeId || 'cash'); })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function nextLessonId(lessonId) {
    var lesson = getLesson(lessonId);
    if (!lesson) return null;
    var list = lessonsForRoute(lesson.route);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === lessonId) return list[i + 1] ? list[i + 1].id : null;
    }
    return null;
  }

  function m0Lessons() {
    return lessonsForRoute('cash').filter(function (l) { return l.module === 'M0'; });
  }

  global.PTSchoolData = {
    XP_PER_LEVEL: XP_PER_LEVEL,
    SCHOOL_DATA_VERSION: SCHOOL_DATA_VERSION,
    ROUTES: ROUTES,
    LESSONS: LESSONS,
    getLessons: getLessons,
    getLesson: getLesson,
    lessonsForRoute: lessonsForRoute,
    nextLessonId: nextLessonId,
    m0Lessons: m0Lessons,
    rfiSpot: rfiSpot
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school.js — Escuela de Póker: hub, lecciones M0, runner de spots fijos.
 * Visible solo para admin (Fases A–C). Las manos consumen cupo Free del trainer.
 */
(function (global) {
  'use strict';

  var VIEW = { hub: 'hub', lesson: 'lesson', result: 'result' };
  var state = {
    view: VIEW.hub,
    route: 'cash',
    lessonId: null,
    session: null
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function Data() {
    return global.PTSchoolData || null;
  }

  function Store() {
    return global.Store || null;
  }

  function hasAdminAccess() {
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    if (demoOn) return false;
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  /* ---------- Progreso (stats.school → cloud via stats) ---------- */

  function defaultSchool() {
    return { xp: 0, lessons: {}, updatedAt: 0, version: 2 };
  }

  /**
   * v1→v2: el examen M0 pasó de C-04 a C-06; C-04 es ahora "Sizing del open".
   * Migra progreso del examen antiguo a C-06 y deja C-04 limpio.
   */
  function migrateSchoolProgress(school) {
    var out = school && typeof school === 'object' ? school : defaultSchool();
    var ver = Number(out.version) || 1;
    if (ver >= 2) return out;
    var lessons = out.lessons && typeof out.lessons === 'object' ? Object.assign({}, out.lessons) : {};
    if (lessons['C-04'] && !lessons['C-06']) {
      lessons['C-06'] = lessons['C-04'];
      delete lessons['C-04'];
    }
    out.lessons = lessons;
    out.version = 2;
    out._migrated = true;
    return out;
  }

  function readSchool() {
    var st = Store() && Store().getStats ? Store().getStats() : null;
    var school = (st && st.school) ? st.school : null;
    if (!school || typeof school !== 'object') return defaultSchool();
    var migrated = migrateSchoolProgress({
      xp: Number(school.xp) || 0,
      lessons: school.lessons && typeof school.lessons === 'object' ? school.lessons : {},
      updatedAt: Number(school.updatedAt) || 0,
      version: Number(school.version) || 1
    });
    if (migrated._migrated) {
      delete migrated._migrated;
      writeSchool(migrated);
    }
    return {
      xp: Number(migrated.xp) || 0,
      lessons: migrated.lessons || {},
      updatedAt: Number(migrated.updatedAt) || 0,
      version: Number(migrated.version) || 2
    };
  }

  function writeSchool(school) {
    var S = Store();
    if (!S || !S.getStats || !S.persistStats) return;
    var st = S.getStats();
    st.school = {
      xp: Number(school.xp) || 0,
      lessons: school.lessons || {},
      updatedAt: Date.now(),
      version: Number(school.version) || 2
    };
    S.persistStats(st);
    if (global.PTCloud) {
      if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(['stats']);
      if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(['stats']);
    }
  }

  function lessonProgress(lessonId) {
    var school = readSchool();
    return school.lessons[lessonId] || null;
  }

  function levelFromXp(xp) {
    var per = (Data() && Data().XP_PER_LEVEL) || 200;
    var level = Math.floor((Number(xp) || 0) / per) + 1;
    if (level < 1) level = 1;
    if (level > 30) level = 30;
    var into = (Number(xp) || 0) % per;
    return { level: level, into: into, per: per, xp: Number(xp) || 0 };
  }

  function isLessonPassed(lessonId) {
    var p = lessonProgress(lessonId);
    return !!(p && p.passed);
  }

  function isLessonUnlocked(lessonId) {
    var data = Data();
    if (!data) return false;
    var lesson = data.getLesson(lessonId);
    if (!lesson) return false;
    var list = data.lessonsForRoute(lesson.route);
    if (!list.length) return false;
    if (list[0].id === lessonId) return true;
    for (var i = 1; i < list.length; i++) {
      if (list[i].id === lessonId) return isLessonPassed(list[i - 1].id);
    }
    return false;
  }

  /**
   * Gate de contenido (preparado para Fase D).
   * Hoy: admin-only UI + desbloqueo lineal. En D se añadirá Study/Coach.
   */
  function canPlayLesson(lessonId) {
    if (!hasAdminAccess()) {
      return { ok: false, reason: 'admin_only', message: 'Escuela en pruebas (solo administración).' };
    }
    var lesson = Data() && Data().getLesson(lessonId);
    if (!lesson) return { ok: false, reason: 'missing', message: 'Lección no encontrada.' };
    if (!isLessonUnlocked(lessonId)) {
      return { ok: false, reason: 'locked', message: 'Completa la lección anterior.' };
    }
    // Fase D: comprobar lesson.plan vs entitlements (free/study/coach).
    return { ok: true, lesson: lesson };
  }

  function scorePoints(cls, pro) {
    if (cls === 'optima') return 1;
    if (cls === 'aceptable') return pro ? 0.5 : 0.6;
    if (cls === 'imprecisa') return 0.2;
    return 0;
  }

  function recordLessonAttempt(lesson, spotResults) {
    var threshold = lesson.passThreshold != null ? lesson.passThreshold : 0.7;
    var goldTh = lesson.goldThreshold != null ? lesson.goldThreshold : 0.9;
    var total = 0;
    var weight = 0;
    (spotResults || []).forEach(function (r) {
      weight += 1;
      total += scorePoints(r.class, false);
    });
    var score = weight ? total / weight : 1;
    var pct = Math.round(score * 1000) / 10;
    var passed = score + 1e-9 >= threshold;
    var gold = score + 1e-9 >= goldTh;
    var perfect = score + 1e-9 >= 0.999;

    var school = readSchool();
    var prev = school.lessons[lesson.id] || {};
    var attempts = (Number(prev.attempts) || 0) + 1;
    var bestScore = prev.bestScore != null ? Math.max(prev.bestScore, score) : score;
    var firstPass = passed && !prev.passed;
    var firstGold = gold && !prev.gold;
    var xpGain = 0;
    if (firstPass) xpGain += Number(lesson.xp) || 0;
    else if (passed && score > (prev.bestScore || 0)) xpGain += Math.round((Number(lesson.xp) || 0) * 0.15);
    if (firstGold) xpGain += Math.round((Number(lesson.xp) || 0) * 0.25);
    if (perfect && !prev.perfect) xpGain += 20;

    school.xp = (Number(school.xp) || 0) + xpGain;
    school.lessons[lesson.id] = {
      bestScore: bestScore,
      bestPct: Math.round(bestScore * 1000) / 10,
      attempts: attempts,
      passed: !!(prev.passed || passed),
      gold: !!(prev.gold || gold),
      perfect: !!(prev.perfect || perfect),
      lastScore: score,
      lastPct: pct,
      updatedAt: new Date().toISOString()
    };
    writeSchool(school);

    return {
      score: score,
      pct: pct,
      passed: passed,
      gold: gold,
      perfect: perfect,
      xpGain: xpGain,
      bestPct: school.lessons[lesson.id].bestPct,
      threshold: threshold,
      goldThreshold: goldTh
    };
  }

  function completeTheoryLesson(lesson) {
    return recordLessonAttempt(lesson, []);
  }

  /* ---------- Sesión de spots ---------- */

  function schoolPlayConfig() {
    return {
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'all',
      villainLevel: 'fish',
      formatHub: 'cash',
      gameType: 'cash6',
      liveAdvisor: false,
      handsTarget: 0,
      schoolMode: true,
      schoolDecisionEnd: true
    };
  }

  function spotToForce(spot) {
    return {
      type: spot.type || 'RFI',
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: {
        heroCards: (spot.forceDeal && spot.forceDeal.heroCards) || spot.heroCards,
        villainCards: (spot.forceDeal && spot.forceDeal.villainCards) || null,
        board: (spot.forceDeal && spot.forceDeal.board) || [],
        villainPos: (spot.forceDeal && spot.forceDeal.villainPos) || 'BB'
      }
    };
  }

  function activeSession() {
    return state.session;
  }

  function isSessionActive() {
    return !!(state.session && state.session.active);
  }

  function updateSchoolBanner() {
    var el = document.getElementById('school-play-banner');
    if (!el) return;
    if (!isSessionActive()) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    var s = state.session;
    var n = s.spots.length;
    var i = Math.min(s.index + 1, n);
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="school-play-banner-inner">' +
      '<span class="school-play-banner-label">Escuela · ' + esc(s.lessonTitle) + '</span>' +
      '<span class="school-play-banner-progress">Spot ' + i + ' / ' + n + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="school-exit-session">Salir</button>' +
      '</div>';
    var btn = document.getElementById('school-exit-session');
    if (btn) {
      btn.addEventListener('click', function () {
        abandonSession(true);
      });
    }
  }

  function abandonSession(goHub) {
    if (state.session) state.session.active = false;
    state.session = null;
    updateSchoolBanner();
    var fb = document.getElementById('feedback');
    if (fb) {
      fb.classList.add('hidden');
      fb.innerHTML = '';
    }
    if (goHub && typeof global.goToTab === 'function') {
      state.view = VIEW.hub;
      global.goToTab('school');
    }
  }

  function startSpotAt(index) {
    var s = state.session;
    if (!s || !s.active) return;
    if (index >= s.spots.length) {
      finishSession();
      return;
    }
    s.index = index;
    s.spotDecided = false;
    updateSchoolBanner();
    var force = spotToForce(s.spots[index]);
    if (typeof global.playAnalysisHand === 'function') {
      global.playAnalysisHand(force, schoolPlayConfig());
    }
  }

  function classLabel(cls) {
    if (cls === 'optima') return 'Óptima';
    if (cls === 'aceptable') return 'Aceptable';
    if (cls === 'imprecisa') return 'Imprecisa';
    if (cls === 'error') return 'Error';
    return cls || '—';
  }

  function showSpotFeedback(decision, spot) {
    var s = state.session;
    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    if (!fb || !s) return;
    var good = decision.class === 'optima' || decision.class === 'aceptable';
    var teach = (spot && spot.teachBack) || decision.reason || '';
    var remaining = s.spots.length - s.index - 1;
    fb.classList.remove('hidden');
    fb.innerHTML =
      '<div class="school-spot-feedback ' + (good ? 'is-good' : 'is-bad') + '">' +
      '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ' + esc(classLabel(decision.class)) + '</h3>' +
      '<p class="school-spot-action">Tu acción: <strong>' + esc(decision.label || decision.action || decision.id || '—') + '</strong></p>' +
      (teach ? '<p class="school-spot-teach">' + esc(teach) + '</p>' : '') +
      (spot && spot.trapTag && spot.trapTag !== 'none'
        ? '<p class="muted-text">Trampa: ' + esc(spot.trapTag) + '</p>'
        : '') +
      '</div>';
    if (actions) {
      var nextLabel = remaining > 0 ? 'Siguiente spot »' : 'Ver resultado »';
      actions.className = 'actions';
      actions.innerHTML =
        '<button type="button" class="btn btn-primary" id="school-next-spot">' + nextLabel + '</button>' +
        '<button type="button" class="btn btn-ghost" id="school-abort-spot">Salir de la lección</button>';
      var next = document.getElementById('school-next-spot');
      var abort = document.getElementById('school-abort-spot');
      if (next) {
        next.addEventListener('click', function () {
          startSpotAt(s.index + 1);
        });
      }
      if (abort) {
        abort.addEventListener('click', function () {
          abandonSession(true);
        });
      }
    }
  }

  function finishSession() {
    var s = state.session;
    if (!s) return;
    var lesson = Data().getLesson(s.lessonId);
    var summary = recordLessonAttempt(lesson, s.results);
    s.active = false;
    state.session = null;
    updateSchoolBanner();
    state.view = VIEW.result;
    state.lessonId = lesson.id;
    state.lastResult = { lesson: lesson, summary: summary, results: s.results.slice() };
    if (typeof global.goToTab === 'function') global.goToTab('school');
  }

  function startLessonSession(lessonId) {
    var data = Data();
    var lesson = data && data.getLesson(lessonId);
    if (!lesson) return;
    var gate = canPlayLesson(lessonId);
    if (!gate.ok) return;
    if (!lesson.spots || !lesson.spots.length) {
      var summary = completeTheoryLesson(lesson);
      state.view = VIEW.result;
      state.lessonId = lesson.id;
      state.lastResult = { lesson: lesson, summary: summary, results: [] };
      var host = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (host) render(host);
      return;
    }
    state.session = {
      active: true,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      decisionEnd: lesson.decisionEnd !== false,
      spots: lesson.spots.slice(),
      index: 0,
      spotDecided: false,
      results: []
    };
    startSpotAt(0);
  }

  /**
   * Hook desde app.onAction: corta la mano tras la 1ª decisión evaluada.
   * @returns {boolean} true si la Escuela maneja el resto del flujo
   */
  function afterTrainerAction(hand, decision) {
    var s = state.session;
    if (!s || !s.active || !s.decisionEnd) return false;
    if (s.spotDecided) return false;
    if (!decision) return false;
    s.spotDecided = true;
    var spot = s.spots[s.index];
    s.results.push({
      spotId: spot && spot.id,
      class: decision.class,
      action: decision.action || decision.id,
      actionLabel: decision.label || decision.action || decision.id,
      trapTag: spot && spot.trapTag
    });

    hand.stage = 'complete';
    hand._finishHandled = true;
    hand.result = {
      reason: 'Escuela de Póker · spot evaluado',
      heroNet: 0,
      totalEvLoss: decision.evLoss || 0,
      school: true,
      handScore: decision.class === 'optima' ? 10 : (decision.class === 'aceptable' ? 7 : 3)
    };
    try {
      if (Store() && Store().saveHand) Store().saveHand(hand);
    } catch (e) { /* ignore */ }

    showSpotFeedback(decision, spot);
    return true;
  }

  /* ---------- UI ---------- */

  function routeProgress(routeId) {
    var list = Data().lessonsForRoute(routeId);
    var passed = 0;
    var gold = 0;
    list.forEach(function (l) {
      var p = lessonProgress(l.id);
      if (p && p.passed) passed += 1;
      if (p && p.gold) gold += 1;
    });
    return { total: list.length, passed: passed, gold: gold };
  }

  function nodeState(lesson) {
    var p = lessonProgress(lesson.id);
    if (p && p.passed) return 'done';
    if (isLessonUnlocked(lesson.id)) return 'open';
    return 'locked';
  }

  function planBadge(plan) {
    if (plan === 'coach') return '<span class="school-plan-badge school-plan-coach">Coach</span>';
    if (plan === 'study') return '<span class="school-plan-badge school-plan-study">Study</span>';
    return '<span class="school-plan-badge school-plan-free">Gratis</span>';
  }

  function renderHub(root) {
    var data = Data();
    var school = readSchool();
    var lv = levelFromXp(school.xp);
    var routes = (data && data.ROUTES) || [];
    var lessons = data.lessonsForRoute(state.route);
    var rp = routeProgress(state.route);
    var m0 = data.m0Lessons ? data.m0Lessons() : lessons.filter(function (l) { return l.module === 'M0'; });
    var m0Passed = 0;
    m0.forEach(function (l) { if (isLessonPassed(l.id)) m0Passed += 1; });
    var m0Pct = m0.length ? Math.round((m0Passed / m0.length) * 100) : 0;

    var routeTabs = routes.map(function (r) {
      var active = r.id === state.route ? ' is-active' : '';
      var soon = r.status === 'soon' ? ' is-soon' : '';
      var title = r.status === 'soon' ? (r.teaser || 'Próximamente') : '';
      return '<button type="button" class="school-route-tab' + active + soon + '" data-school-route="' + esc(r.id) + '"' +
        (r.status === 'soon' ? ' disabled title="' + esc(title) + '"' : '') + '>' +
        esc(r.label) + (r.status === 'soon' ? ' <span class="school-soon">Pronto</span>' : '') +
        '</button>';
    }).join('');

    var soonTeasers = routes.filter(function (r) { return r.status === 'soon' && r.teaser; }).map(function (r) {
      return '<li><strong>' + esc(r.label) + ':</strong> ' + esc(r.teaser) + '</li>';
    }).join('');

    var nodes = lessons.map(function (l, idx) {
      var st = nodeState(l);
      var p = lessonProgress(l.id);
      var pctHtml = p && p.passed
        ? '<span class="school-node-pct">' + esc(String(p.bestPct)) + '%</span>'
        : '';
      var stars = '';
      if (p && p.passed) {
        stars = '<span class="school-stars" aria-label="maestría">' +
          (p.perfect ? '★★★' : (p.gold ? '★★☆' : '★☆☆')) + '</span>';
      }
      var lock = st === 'locked' ? '<span class="school-node-lock" aria-hidden="true">Bloqueada</span>' : '';
      return '<button type="button" class="school-node is-' + st + '" data-school-lesson="' + esc(l.id) + '"' +
        (st === 'locked' ? ' disabled' : '') + '>' +
        '<span class="school-node-idx">' + (idx + 1) + '</span>' +
        '<span class="school-node-body">' +
        '<span class="school-node-title">' + esc(l.title) + '</span>' +
        '<span class="school-node-meta">' + planBadge(l.plan) + ' · ' + (l.hands || 0) + ' manos · +' + (l.xp || 0) + ' XP</span>' +
        '</span>' +
        pctHtml + stars + lock +
        '</button>';
    }).join('');

    root.innerHTML =
      '<div class="school-page">' +
      '<header class="school-hero">' +
      '<p class="school-eyebrow">Admin · M0 v2 · Preparado para Fase D</p>' +
      '<h2 class="school-title">Escuela de Póker</h2>' +
      '<p class="school-lead">Módulo M0 Cash completo en Gratis (7 lecciones). Spots fijos, desbloqueo lineal. Las manos consumen el cupo Free del entrenador.</p>' +
      '<div class="school-hero-stats">' +
      '<div class="school-stat"><span class="school-stat-val">Nv. ' + lv.level + '</span><span class="school-stat-lbl">Nivel Escuela</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + lv.xp + '</span><span class="school-stat-lbl">XP</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + m0Passed + '/' + m0.length + '</span><span class="school-stat-lbl">M0 Cash</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.gold + '</span><span class="school-stat-lbl">Oro</span></div>' +
      '</div>' +
      '<div class="school-xp-bar" aria-hidden="true"><div class="school-xp-fill" style="width:' +
      Math.min(100, Math.round((lv.into / lv.per) * 100)) + '%"></div></div>' +
      '<p class="muted-text school-m0-progress">Progreso M0: ' + m0Passed + ' de ' + m0.length +
      ' lecciones (' + m0Pct + '%)</p>' +
      '</header>' +
      '<div class="school-routes" role="tablist">' + routeTabs + '</div>' +
      (soonTeasers
        ? '<div class="muted-text school-route-teasers">Próximas rutas:<ul class="school-teaser-list">' + soonTeasers + '</ul></div>'
        : '') +
      '<section class="school-map card-box">' +
      '<h3 class="school-map-title">Módulo M0 · Fundamentos Cash (Gratis)</h3>' +
      '<p class="muted-text school-map-lead">7 lecciones de simple a examen. Completa en orden. Tras M0, Study abre el preflop completo (Fase E).</p>' +
      '<div class="school-nodes">' + nodes + '</div>' +
      '</section>' +
      '</div>';

    root.querySelectorAll('[data-school-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-route');
        if (!id || id === 'spin' || id === 'mtt') return;
        state.route = id;
        render(root);
      });
    });
    root.querySelectorAll('[data-school-lesson]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-lesson');
        var gate = canPlayLesson(id);
        if (!gate.ok) return;
        state.view = VIEW.lesson;
        state.lessonId = id;
        render(root);
      });
    });
  }

  function renderLesson(root) {
    var lesson = Data().getLesson(state.lessonId);
    if (!lesson) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var p = lessonProgress(lesson.id);
    var theory = (lesson.theory || []).map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('');
    var examples = (lesson.examples || []).map(function (ex) {
      return '<div class="school-example"><div class="school-example-label">' + esc(ex.title) + '</div>' +
        '<p>' + esc(ex.body) + '</p></div>';
    }).join('');
    var asks = (lesson.aiQuestions || []).map(function (q) {
      return '<button type="button" class="school-ask-chip" data-school-ask="' + esc(q) + '">' + esc(q) + '</button>';
    }).join('');
    var cta = !lesson.spots || !lesson.spots.length
      ? 'Completar lección'
      : (p && p.passed ? 'Repetir sesión (' + lesson.hands + ' manos)' : 'Empezar sesión (' + lesson.hands + ' manos)');

    root.innerHTML =
      '<div class="school-page school-lesson-page">' +
      '<button type="button" class="btn btn-ghost school-back" id="school-back-hub">« Volver al mapa</button>' +
      '<header class="school-lesson-header">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · M0 Cash ' + planBadge(lesson.plan) + '</p>' +
      '<h2 class="school-title">' + esc(lesson.title) + '</h2>' +
      '<p class="school-lead">' + esc(lesson.concept) + '</p>' +
      (p && p.passed
        ? '<p class="school-best">Mejor marca: <strong>' + esc(String(p.bestPct)) + '%</strong> · ' +
          (p.perfect ? '100 %' : (p.gold ? 'Oro' : 'Aprobada')) +
          ' · ' + (p.attempts || 1) + ' intento(s)</p>'
        : '<p class="muted-text">Umbral aprobar: ' + Math.round((lesson.passThreshold || 0.7) * 100) +
          '% · Oro: ' + Math.round((lesson.goldThreshold || 0.9) * 100) + '%</p>') +
      '</header>' +
      '<section class="card-box school-section">' +
      '<h3>Concepto</h3><ul class="school-theory">' + theory + '</ul></section>' +
      '<section class="card-box school-section"><h3>Ejemplos</h3>' + examples + '</section>' +
      '<section class="card-box school-section">' +
      '<h3>IA Coach</h3>' +
      '<p class="muted-text">Preguntas sugeridas (consumen cuota de IA del plan).</p>' +
      '<div class="school-ask-chips">' + asks + '</div>' +
      '<div id="school-coach-mount" class="school-coach-mount"></div>' +
      '</section>' +
      '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-primary" id="school-start-lesson">' + esc(cta) + '</button>' +
      '</div></div>';

    var back = document.getElementById('school-back-hub');
    if (back) {
      back.addEventListener('click', function () {
        state.view = VIEW.hub;
        render(root);
      });
    }
    var start = document.getElementById('school-start-lesson');
    if (start) {
      start.addEventListener('click', function () {
        startLessonSession(lesson.id);
      });
    }
    mountCoach(root, lesson);
    bindAskChips(root);
  }

  function bindAskChips(root) {
    root.querySelectorAll('[data-school-ask]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-school-ask') || '';
        var mount = root.querySelector('#school-coach-mount');
        if (!mount) return;
        var input = mount.querySelector('[data-ai-question-input]');
        var form = mount.querySelector('[data-ai-question-form]');
        var toggle = mount.querySelector('[data-ai-question-toggle]');
        if (form && form.hidden && toggle) toggle.click();
        if (input) {
          input.value = q;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });
  }

  function mountCoach(root, lesson) {
    var host = root.querySelector('#school-coach-mount');
    if (!host || !global.PTAIReport || !global.PTAIReport.mount) return;
    host.innerHTML = '';
    global.PTAIReport.mount(host, {
      scope: 'learn',
      hideReport: true,
      openQuestionForm: true,
      questionToggleLabel: 'Preguntar al IA Coach',
      getData: function () {
        return {
          school: true,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          concept: lesson.concept,
          beginner: true
        };
      },
      persist: { kind: 'learn' }
    });
  }

  function renderResult(root) {
    var pack = state.lastResult;
    if (!pack || !pack.lesson) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var lesson = pack.lesson;
    var sum = pack.summary;
    var nextId = Data().nextLessonId(lesson.id);
    var next = nextId ? Data().getLesson(nextId) : null;
    var ringCls = sum.passed ? 'is-pass' : 'is-fail';
    var fails = (pack.results || []).filter(function (r) {
      return r.class === 'error' || r.class === 'imprecisa';
    });

    root.innerHTML =
      '<div class="school-page school-result-page">' +
      '<header class="school-result-hero ' + ringCls + '">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + '</p>' +
      '<h2 class="school-title">' + (sum.passed ? 'Lección superada' : 'Casi — sigue practicando') + '</h2>' +
      '<div class="school-ring" aria-label="porcentaje">' +
      '<span class="school-ring-pct">' + esc(String(sum.pct)) + '%</span>' +
      '<span class="school-ring-lbl">acierto</span></div>' +
      '<p class="school-result-meta">Umbral ' + Math.round(sum.threshold * 100) +
      '% · Mejor histórica ' + esc(String(sum.bestPct)) + '%' +
      (sum.xpGain ? ' · <strong>+' + sum.xpGain + ' XP</strong>' : '') + '</p>' +
      (sum.gold ? '<p class="school-gold-tag">Marca oro</p>' : '') +
      (sum.perfect ? '<p class="school-gold-tag">¡100 %!</p>' : '') +
      '</header>' +
      (fails.length
        ? '<section class="card-box"><h3>Spots a repasar</h3><ul class="school-fail-list">' +
          fails.map(function (f) {
            return '<li>' + esc(f.spotId || 'spot') + ' · ' + esc(classLabel(f.class)) +
              (f.trapTag && f.trapTag !== 'none' ? ' · trampa ' + esc(f.trapTag) : '') + '</li>';
          }).join('') + '</ul></section>'
        : '') +
      '<div class="school-result-actions">' +
      '<button type="button" class="btn btn-primary" id="school-retry">Repetir lección</button>' +
      (sum.passed && next
        ? '<button type="button" class="btn btn-primary" id="school-next-lesson">Siguiente: ' + esc(next.title) + '</button>'
        : '') +
      '<button type="button" class="btn btn-ghost" id="school-to-map">Volver al mapa</button>' +
      '</div></div>';

    document.getElementById('school-retry').addEventListener('click', function () {
      startLessonSession(lesson.id);
    });
    var nextBtn = document.getElementById('school-next-lesson');
    if (nextBtn && next) {
      nextBtn.addEventListener('click', function () {
        state.view = VIEW.lesson;
        state.lessonId = next.id;
        render(root);
      });
    }
    document.getElementById('school-to-map').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
  }

  function render(container) {
    var root = container || document.getElementById('school-content');
    if (!root) return;
    if (!hasAdminAccess()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Escuela de Póker está en pruebas (solo administración).</p></div>';
      return;
    }
    if (!Data()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Cargando currículum…</p></div>';
      return;
    }
    if (state.view === VIEW.lesson) renderLesson(root);
    else if (state.view === VIEW.result) renderResult(root);
    else renderHub(root);
  }

  function ensureBannerEl() {
    var play = document.getElementById('tab-play');
    if (!play || document.getElementById('school-play-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'school-play-banner';
    banner.className = 'school-play-banner hidden';
    var active = document.getElementById('play-active');
    if (active && active.parentNode) active.parentNode.insertBefore(banner, active);
    else play.insertBefore(banner, play.firstChild);
  }

  global.PTSchool = {
    render: render,
    afterTrainerAction: afterTrainerAction,
    isSessionActive: isSessionActive,
    activeSession: activeSession,
    hasAdminAccess: hasAdminAccess,
    readSchool: readSchool,
    isLessonUnlocked: isLessonUnlocked,
    isLessonPassed: isLessonPassed,
    canPlayLesson: canPlayLesson,
    migrateSchoolProgress: migrateSchoolProgress,
    startLessonSession: startLessonSession,
    abandonSession: abandonSession,
    ensureBannerEl: ensureBannerEl,
    _state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
