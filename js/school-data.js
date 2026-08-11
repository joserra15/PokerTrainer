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
