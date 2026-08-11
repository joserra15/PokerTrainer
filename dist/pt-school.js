/* PokerForgeAI bundle: pt-school.js — do not edit */
/*
 * school-data.js — Currículum M0 Escuela de Póker (Cash fundamentos, Gratis completo).
 * RoadMap v2: C-00…C-06. Spots RFI fijos; grading del motor GTO.
 *
 * Estilo de texto (obligatorio en M0 y lecciones siguientes):
 * - Voz de profesor a alumno: natural, clara, sin telegramas ni jerga suelta.
 * - Breve pero completo: 2–4 frases por bullet de teoría; teachBack 1–3 frases.
 * - Primera aparición de un concepto: nómbralo y explícalo entre paréntesis o
 *   en la frase siguiente. Ej.: «limpear (igualar la ciega grande para entrar)».
 * - Si el concepto ya se explicó en una lección anterior del mismo módulo,
 *   úsalo sin redefinir (el alumno ya lo vio).
 * - Verbo del limp: siempre «limpear» (nunca «limpiar»).
 * - Orden de introducción en M0: posiciones → open/fold → RFI → limp →
 *   fold equity → sizing (bb) → SB/OOP. El examen no introduce vocabulario nuevo.
 * Ver también docs/ROADMAP_LECCIONES_DIRIGIDAS.md §4.5.
 */
(function (global) {
  'use strict';

  var XP_PER_LEVEL = 200;
  var SCHOOL_DATA_VERSION = 3;

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
        board: (meta.board || []).slice(),
        villainPos: meta.villainPos || 'BB'
      },
      playConfig: meta.playConfig || { scenario: 'rfi', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || (heroPos + ' · ' + heroCards.join(''))
    };
  }

  /** vs open: hero en blinds/cold decide fold/call/3-bet. key = 'BB_vs_BTN'. */
  function vsRfiSpot(id, key, heroCards, seed, meta) {
    meta = meta || {};
    var parts = String(key || '').split('_vs_');
    return {
      id: id,
      type: 'vsRFI',
      key: key,
      heroPos: parts[0] || 'BB',
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: (meta.board || []).slice(),
        villainPos: parts[1] || 'BTN'
      },
      playConfig: meta.playConfig || { scenario: '3bet', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || key
    };
  }

  /** Tras open, enfrentas 3-bet. key = 'BTN_vs_BB'. */
  function face3betSpot(id, key, heroCards, seed, meta) {
    meta = meta || {};
    var parts = String(key || '').split('_vs_');
    return {
      id: id,
      type: 'face3bet',
      key: key,
      heroPos: parts[0] || 'BTN',
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: [],
        villainPos: parts[1] || 'BB'
      },
      playConfig: meta.playConfig || { scenario: 'face3bet', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || key
    };
  }

  function isoSpot(id, heroPos, limperPos, heroCards, seed, meta) {
    meta = meta || {};
    return {
      id: id,
      type: 'isoLimp',
      heroPos: heroPos,
      limperPos: limperPos,
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: [],
        villainPos: limperPos
      },
      playConfig: meta.playConfig || { scenario: 'iso', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || (heroPos + ' iso vs ' + limperPos)
    };
  }

  function squeezeSpot(id, heroPos, openerPos, callerPos, heroCards, seed, meta) {
    meta = meta || {};
    return {
      id: id,
      type: 'squeeze',
      heroPos: heroPos,
      openerPos: openerPos,
      callerPos: callerPos,
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: [],
        villainPos: openerPos
      },
      playConfig: meta.playConfig || { scenario: 'squeeze', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || ('Squeeze ' + heroPos)
    };
  }

  function bbVsSbLimpSpot(id, heroCards, seed, meta) {
    meta = meta || {};
    return {
      id: id,
      type: 'bbVsSbLimp',
      heroPos: 'BB',
      seed: seed,
      forceDeal: {
        heroCards: heroCards.slice(),
        villainCards: meta.villainCards || null,
        board: [],
        villainPos: 'SB'
      },
      playConfig: meta.playConfig || { scenario: 'bbvsb', practiceStreet: 'preflop' },
      trapTag: meta.trapTag || 'none',
      teachBack: meta.teachBack || '',
      label: meta.label || 'BB vs SB limp'
    };
  }

  /** Postflop: open RFI + board forzado; practiceStreet flop/turn/river.
   *  facingBet: héroe defiende vs c-bet (villano apuesta ~33 %). */
  function flopSpot(id, heroPos, heroCards, board, seed, meta) {
    meta = meta || {};
    var street = meta.street || 'flop';
    var spot = rfiSpot(id, heroPos, heroCards, seed, {
      board: board,
      villainPos: meta.villainPos || (meta.facingBet ? 'BTN' : 'BB'),
      villainCards: meta.villainCards || null,
      trapTag: meta.trapTag,
      teachBack: meta.teachBack,
      label: meta.label,
      playConfig: { scenario: 'rfi', practiceStreet: street }
    });
    if (meta.facingBet) {
      spot.facingBet = true;
      spot.forceDeal.facingBet = true;
    }
    return spot;
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
      concept: 'Aquí no entrenas a ciegas: cada lección enseña una idea y la comprueba con manos preparadas, no aleatorias.',
      theory: [
        'Bienvenido. La Escuela funciona como una clase: primero te explico el concepto, luego lo practicas en spots fijos (manos diseñadas a propósito, no al azar del entrenador libre).',
        'El módulo M0 —Fundamentos de cash— está completo en plan Gratis: siete lecciones que van de la posición a cómo abrir el bote, cuánto subir y el caso especial de la ciega pequeña.',
        'En cada mano solo te evalúo en el momento que importa para esa lección (por ejemplo, subir o tirar). Si el resto de la mano no aporta al concepto, no te obligo a jugarlo entero.',
        'Apruebas al llegar al umbral de aciertos y se abre la siguiente. Puedes repetir para subir tu mejor marca hacia el 100 %.',
        'En Gratis, cada mano de lección gasta el mismo cupo diario del entrenador (15 al día). Study y Coach abren el resto del árbol más adelante.'
      ],
      examples: [
        {
          title: 'Cómo se vive una lección',
          body: 'Lees la explicación → miras un ejemplo comentado → juegas las manos preparadas → ves tu porcentaje. Si apruebas, desbloqueas la siguiente. Simple, pero con método.'
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
      concept: 'La misma mano no vale lo mismo en todas las sillas: quién actúa detrás de ti cambia si debes abrir el bote o tirar.',
      theory: [
        'En una mesa de cash 6-max las posiciones, de más temprana a más tardía, son: UTG (under the gun, el primero en hablar), HJ (hijack), CO (cutoff), BTN (el botón, la mejor silla), y luego SB y BB (ciegas pequeña y grande).',
        'Cuanto más temprana tu posición, más jugadores quedan por hablar detrás. Por eso desde UTG abrimos un rango más tight (más selectivo): si alguien tiene una mano fuerte, todavía puede castigarte.',
        'En late —sobre todo CO y BTN— puedes abrir más wide (más manos). Robas las ciegas con más frecuencia y, si hacen call (si te igualan la apuesta), sueles jugar el flop en posición (actúas después del rival), que es una ventaja enorme.',
        'La decisión de esta lección es simple: open (subir primero el bote cuando nadie ha entrado) o fold (tirar la mano). La trampa clásica es abrir basura desde UTG “porque se ve bonita” (KTo, A9o) o, al revés, foldear opens claros en BTN por miedo.'
      ],
      examples: [
        {
          title: 'Misma mano, distinta silla',
          body: 'Tienes ATo. Desde UTG, con stacks de 100 bb, suele ser fold: hay demasiada gente detrás y muchas manos mejores te dominan. La misma ATo en BTN es un open habitual. Las cartas no cambiaron; cambió quién habla después de ti.'
        }
      ],
      aiQuestions: [
        '¿Por qué UTG abre más tight que BTN?',
        '¿Qué ventaja da jugar en posición postflop?'
      ],
      spots: [
        rfiSpot('c01-01', 'UTG', ['Ah', 'Td'], 11001, {
          trapTag: 'position_blind',
          teachBack: 'ATo desde UTG es incómoda: demasiada gente detrás y muchas manos mejores te dominan. Aquí fold; en el botón sería open.'
        }),
        rfiSpot('c01-02', 'BTN', ['Ah', 'Td'], 11002, {
          teachBack: 'En el botón ATo es un open claro: casi nadie detrás y la mano se juega bien postflop.'
        }),
        rfiSpot('c01-03', 'UTG', ['Kc', 'Td'], 11003, {
          trapTag: 'dominated',
          teachBack: 'KTo desde UTG suele estar dominada por AK, KQ o KJ. Fold estándar a 100 bb.'
        }),
        rfiSpot('c01-04', 'CO', ['Kc', 'Ts'], 11004, {
          teachBack: 'KTs en cutoff entra en muchos rangos de open: mismo color (suited) y buena jugabilidad.'
        }),
        rfiSpot('c01-05', 'HJ', ['Qs', 'Js'], 11005, {
          teachBack: 'QJs desde hijack es un open cómodo: conectores altos del mismo palo, con plan claro si ves flop.'
        }),
        rfiSpot('c01-06', 'UTG', ['Qd', 'Jd'], 11006, {
          teachBack: 'QJs también se abre desde UTG en charts modernos. No la trates como basura solo por ser early.'
        }),
        rfiSpot('c01-07', 'BTN', ['8h', '7h'], 11007, {
          teachBack: 'Conectores suited en el botón son opens de posición: robas ciegas y, si hacen call (si te igualan la apuesta), tienes equity especulativa.'
        }),
        rfiSpot('c01-08', 'UTG', ['8c', '7c'], 11008, {
          trapTag: 'position_blind',
          teachBack: '87s desde UTG suele ser fold: poco margen para que todos plieguen y peores spots si hay multiway fuera de posición.'
        }),
        rfiSpot('c01-09', 'CO', ['Ad', '5d'], 11009, {
          teachBack: 'A5s en cutoff se abre: bloqueas ases y se juega bien. El caso de la ciega pequeña lo vemos en C-05.'
        }),
        rfiSpot('c01-10', 'HJ', ['9s', '9c'], 11010, {
          teachBack: 'Las parejas medias se abren casi desde cualquier sitio. Aquí open sin drama.'
        }),
        rfiSpot('c01-11', 'CO', ['Ah', '2c'], 11011, {
          trapTag: 'dominated',
          teachBack: 'A2o en cutoff es débil (offsuit, as bajo). Abrirla wide no está justificado; muchas veces fold.'
        }),
        rfiSpot('c01-12', 'BTN', ['Kh', '9d'], 11012, {
          teachBack: 'K9o en el botón es un robo frecuente. La posición justifica el open.'
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
      concept: 'Si nadie ha entrado todavía, o subes tú primero (RFI) o tiras: esa es la base del preflop en cash.',
      theory: [
        'RFI significa Raise First In: eres el primero en meter dinero voluntario en el bote. Nadie ha limpeado ni subido; tú eliges open o fold según tu posición y tu mano.',
        'Limpear (o limp) es igualar la ciega grande para ver el flop barato, sin subir. En cash 6-max moderno casi no lo usamos para abrir: regalas la iniciativa y dejas que cualquiera te aísle por detrás. Aquí la disciplina es binaria — open o fold.',
        'El tamaño típico del open ronda 2–2,5 bb (lo trabajamos con calma en C-04). Hoy lo importante no es el tamaño exacto, sino si esa mano entra en el rango de tu silla: UTG más tight, botón más wide. Puedes estudiar los rangos RFI de cada posición en el menú Rangos.',
        'Trampas habituales: abrir manos dominadas en early, foldear manos claras en late, o “inventar” un limpeo mental cuando deberías tirar o subir.'
      ],
      examples: [
        {
          title: 'Open desde cutoff',
          body: 'Pliegan UTG y HJ. Estás en CO con AJs: subes a unas 2,2–2,5 bb. No limpees “para ver flop”. O la mano merece open, o fold.'
        }
      ],
      aiQuestions: [
        '¿Qué manos debo abrir desde UTG a 100 bb?',
        '¿Por qué no se limpea en vez de open-raise en cash 6-max?'
      ],
      spots: [
        rfiSpot('c02-01', 'UTG', ['As', 'Ad'], 12001, {
          teachBack: 'Con AA siempre abres. No hay debate: es la mejor mano de partida.'
        }),
        rfiSpot('c02-02', 'UTG', ['7h', '2d'], 12002, {
          trapTag: 'dominated',
          teachBack: '72o es la mano más débil del mazo. Fold desde cualquier silla cuando nadie ha entrado.'
        }),
        rfiSpot('c02-03', 'HJ', ['Ah', 'Ks'], 12003, {
          teachBack: 'AKo se abre desde casi todas partes. Open.'
        }),
        rfiSpot('c02-04', 'CO', ['Qs', 'Ts'], 12004, {
          teachBack: 'QTs en cutoff es open estándar en charts de 6-max.'
        }),
        rfiSpot('c02-05', 'BTN', ['Td', '9d'], 12005, {
          teachBack: 'T9s en el botón: open para robar y, si te llaman, buena jugabilidad.'
        }),
        rfiSpot('c02-06', 'UTG', ['Ah', '9c'], 12006, {
          trapTag: 'dominated',
          teachBack: 'A9o desde UTG se queda corta frente a AJ+, AQ o AK. Fold típico.'
        }),
        rfiSpot('c02-07', 'BTN', ['Ac', '9h'], 12007, {
          teachBack: 'La misma A9o en el botón suele ser open: la posición cambia la respuesta.'
        }),
        rfiSpot('c02-08', 'HJ', ['Kh', 'Qd'], 12008, {
          teachBack: 'KQo desde hijack es un open frecuente.'
        }),
        rfiSpot('c02-09', 'HJ', ['6s', '6c'], 12009, {
          teachBack: '66 se abre desde HJ sin dudar: pareja media con valor claro.'
        }),
        rfiSpot('c02-10', 'CO', ['Jd', '8d'], 12010, {
          teachBack: 'J8s en cutoff entra en muchos rangos de open wide.'
        }),
        rfiSpot('c02-11', 'UTG', ['Kd', 'Js'], 12011, {
          trapTag: 'dominated',
          teachBack: 'KJo desde UTG es frontera o fold en muchos charts. No la trates como open automático.'
        }),
        rfiSpot('c02-12', 'BTN', ['5h', '4h'], 12012, {
          teachBack: '54s en el botón es un open especulativo de posición: poca gente detrás.'
        }),
        rfiSpot('c02-13', 'CO', ['Ah', 'Qc'], 12013, {
          teachBack: 'AQo en cutoff es value claro. Open.'
        }),
        rfiSpot('c02-14', 'UTG', ['2h', '2c'], 12014, {
          teachBack: 'Las parejas bajas a veces se abren desde UTG (buscas set y mantienes el rango vivo). Sigue la referencia del motor en este spot.'
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
      concept: 'Al hacer open-raise no solo juegas tu equity, también compras la posibilidad de que todos folden (tiren su mano). Por eso en RFI es open o fold, no limpear para “ver barato”.',
      theory: [
        'Fold equity es la probabilidad de que los rivales tiren ante tu subida. Esa parte del valor no existe si limpeas: el bote queda multiway o te aíslan, y tú ya regalaste la iniciativa.',
        'Si la mano no es lo bastante fuerte para open en esa posición, la respuesta correcta es fold — no “pasar el flop barato”. Ver cartas sin fold equity suele ser peor a largo plazo en cash.',
        'La trampa de turno (fancy play) es doble: pasar manos que sí merecen open, o forzar opens sin fold equity ni equity real. Disciplina: o subes con intención, o te tiras.'
      ],
      examples: [
        {
          title: 'Sin limpeos mentales',
          body: 'En el botón con KTo quieres robar: open. La misma mano desde UTG, si no entra en rango, es fold. En ninguno de los dos casos limpees “por si conecta”.'
        }
      ],
      aiQuestions: [
        '¿Qué es el fold equity en un open-raise?',
        '¿Por qué el limp es peor que open o fold en cash 6-max?'
      ],
      spots: [
        rfiSpot('c03-01', 'BTN', ['Kc', 'Td'], 13001, {
          teachBack: 'KTo en el botón tiene fold equity real: open para robar las ciegas.'
        }),
        rfiSpot('c03-02', 'UTG', ['Kc', 'Td'], 13002, {
          trapTag: 'fancy_play',
          teachBack: 'Misma mano desde UTG: poca gente pliega detrás y la equity no compensa. Fold; no “veas flop”.'
        }),
        rfiSpot('c03-03', 'CO', ['As', '5s'], 13003, {
          teachBack: 'A5s en cutoff se abre: bloqueas ases, tienes fold equity y se juega bien.'
        }),
        rfiSpot('c03-04', 'HJ', ['Qh', '9c'], 13004, {
          trapTag: 'fancy_play',
          teachBack: 'Q9o desde hijack no es un open cómodo. Fold es la línea disciplinada.'
        }),
        rfiSpot('c03-05', 'BTN', ['Qh', '9c'], 13005, {
          teachBack: 'Q9o gana fold equity en el botón. Open de robo.'
        }),
        rfiSpot('c03-06', 'CO', ['9d', '8d'], 13006, {
          teachBack: '98s en cutoff: open con fold equity y jugabilidad. El SB lo vemos en C-05.'
        }),
        rfiSpot('c03-07', 'UTG', ['Th', '7h'], 13007, {
          trapTag: 'dominated',
          teachBack: 'T7s desde UTG: poco fold equity y mala realización. Fold.'
        }),
        rfiSpot('c03-08', 'CO', ['Jh', 'Tc'], 13008, {
          teachBack: 'JTo en cutoff es open común: suficiente fold equity y boards que puedes continuar.'
        }),
        rfiSpot('c03-09', 'BTN', ['7c', '6d'], 13009, {
          teachBack: '76o en el botón es frontera; muchas estrategias lo abren casi solo por fold equity. Mira qué dice el motor aquí.'
        }),
        rfiSpot('c03-10', 'HJ', ['Ad', 'Kd'], 13010, {
          teachBack: 'AKs se abre por valor y por fold equity. Nunca limpees con esto.'
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
      concept: 'En cash 6-max a 100 bb el open estándar ronda 2–2,5 bb. El tamaño no salva una mano que no debería abrirse.',
      theory: [
        'Sizing es el tamaño de tu subida. Lo medimos en bb (ciegas grandes): si la ciega grande es 1 bb, un open a 2,5 bb es dos veces y media esa ciega. El estándar en cash profundo (~100 bb) suele ser 2–2,5 bb.',
        'Ese tamaño te da fold equity suficiente y deja el bote manejable. Abrir a 4–5 bb “para proteger” infla el pot con manos mediocres y no convierte una basura en una buena open.',
        'Si la mano no entra en el rango de tu silla, fold. Más adelante, en Study, verás ajustes por sala, vs jugadores muy pasivos o stacks cortos. En M0 interioriza el estándar y la disciplina: open normal o fold.'
      ],
      examples: [
        {
          title: 'Open estándar, no hero size',
          body: 'En cutoff con AJs abres unas 2,2–2,5 bb. No subas a 5 bb “por si acaso” ni limpees. O la mano merece open con tamaño normal, o tiras.'
        }
      ],
      aiQuestions: [
        '¿Por qué open a 2–2,5 bb y no a 4 bb en cash 100 bb?',
        '¿El sizing grande justifica abrir manos peores?'
      ],
      spots: [
        rfiSpot('c04-01', 'CO', ['Ah', 'Js'], 14001, {
          teachBack: 'AJs en cutoff: open claro con sizing estándar. Ni limpees ni abras oversized.'
        }),
        rfiSpot('c04-02', 'UTG', ['7h', '2d'], 14002, {
          trapTag: 'dominated',
          teachBack: '72o no se arregla abriendo más grande. Fold.'
        }),
        rfiSpot('c04-03', 'BTN', ['Td', '9d'], 14003, {
          teachBack: 'T9s en el botón: open de robo con tamaño normal. El fold equity viene de la posición, no de inflar el open.'
        }),
        rfiSpot('c04-04', 'HJ', ['Qs', '9c'], 14004, {
          trapTag: 'fancy_play',
          teachBack: 'Q9o desde hijack no entra cómodo: fold. Un open grande no la convierte en buena.'
        }),
        rfiSpot('c04-05', 'CO', ['Kh', 'Qs'], 14005, {
          teachBack: 'KQo en cutoff: open de valor. Sizing estándar.'
        }),
        rfiSpot('c04-06', 'UTG', ['Ah', '9d'], 14006, {
          trapTag: 'dominated',
          teachBack: 'A9o desde UTG: fold. El tamaño no compensa una mano fuera de rango.'
        }),
        rfiSpot('c04-07', 'BTN', ['8c', '7c'], 14007, {
          teachBack: '87s en el botón: open de robo con sizing normal.'
        }),
        rfiSpot('c04-08', 'HJ', ['5s', '5c'], 14008, {
          teachBack: '55 desde hijack: open. El tamaño típico basta; no hace falta aislar enorme si nadie ha limpeado.'
        }),
        rfiSpot('c04-09', 'UTG', ['Jd', 'Td'], 14009, {
          teachBack: 'JTs desde UTG suele ser open en charts modernos, con sizing estándar.'
        }),
        rfiSpot('c04-10', 'CO', ['6h', '5d'], 14010, {
          trapTag: 'fancy_play',
          teachBack: '65o en cutoff: fold frecuente. No lo forces “para ver flop” ni con un open raro.'
        }),
        rfiSpot('c04-11', 'BTN', ['Ac', '4c'], 14011, {
          teachBack: 'A4s en el botón: open wide con blockers y tamaño normal.'
        }),
        rfiSpot('c04-12', 'HJ', ['Kd', 'Jc'], 14012, {
          teachBack: 'KJo desde hijack: open habitual. Disciplina: sizing estándar o fold — no limpees.'
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
      concept: 'La ciega pequeña no es el botón: si hacen call, siempre juegas fuera de posición. Por eso abres más tight.',
      theory: [
        'Desde la SB solo queda la ciega grande detrás. Si el BB te paga, vas a jugar el flop fuera de posición — OOP (out of position): actúas primero en cada calle, sin ver qué hace el rival.',
        'Por eso el rango de open desde SB es más tight que desde el botón: menos basura offsuit, más manos con jugabilidad o blockers. Abrir K9o o Q8o “porque es late” es la trampa clásica: en SB no eres BTN.',
        'Prioriza manos suited, broadway decentes y parejas. Las offsuit mediocres que en el botón eran steals aquí suelen ser fold (o, más adelante, 3-bet muy selectivo — eso lo dejamos para otro módulo).'
      ],
      examples: [
        {
          title: 'El botón no es la SB',
          body: 'K9o en el botón suele ser robo. La misma mano en SB contra el BB es mucho más marginal: muchas estrategias foldean o solo 3-betean de forma polar (un 3-bet polar mezcla manos muy fuertes con algunos bluffs, sin el “medio” del rango). No la abras wide (con un rango muy amplio, como si fueras el botón) por inercia.'
        }
      ],
      aiQuestions: [
        '¿Por qué el SB abre más tight que el BTN?',
        '¿Qué manos priorizo al abrir desde SB?'
      ],
      spots: [
        rfiSpot('c05-01', 'SB', ['As', 'Kd'], 15001, {
          teachBack: 'AKo desde SB es fuerte frente al BB. Open claro.'
        }),
        rfiSpot('c05-02', 'SB', ['Kh', '9c'], 15002, {
          trapTag: 'over_open_sb',
          teachBack: 'K9o desde SB es la trampa del over-open: fuera de posición vs BB. Aquí no la trates como un steal de botón.'
        }),
        rfiSpot('c05-03', 'SB', ['Qs', 'Js'], 15003, {
          teachBack: 'QJs desde SB es open sólido: suited y con buena jugabilidad.'
        }),
        rfiSpot('c05-04', 'SB', ['7d', '2c'], 15004, {
          trapTag: 'dominated',
          teachBack: '72o desde SB: fold. Siempre.'
        }),
        rfiSpot('c05-05', 'SB', ['Ad', '5d'], 15005, {
          teachBack: 'A5s desde SB se abre a menudo: blockers y equity decente.'
        }),
        rfiSpot('c05-06', 'SB', ['Jh', 'Tc'], 15006, {
          trapTag: 'over_open_sb',
          teachBack: 'JTo desde SB es frontera o fold en muchos charts: fuera de posición duele. No es un open de botón.'
        }),
        rfiSpot('c05-07', 'SB', ['9s', '9c'], 15007, {
          teachBack: '99 desde SB: open claro. Pareja media, sin discusión.'
        }),
        rfiSpot('c05-08', 'SB', ['Qc', '8d'], 15008, {
          trapTag: 'over_open_sb',
          teachBack: 'Q8o desde SB es basura offsuit fuera de posición. Fold.'
        }),
        rfiSpot('c05-09', 'SB', ['Kh', 'Qs'], 15009, {
          teachBack: 'KQo desde SB es open habitual contra el BB.'
        }),
        rfiSpot('c05-10', 'SB', ['8h', '7h'], 15010, {
          teachBack: '87s desde SB es especulativa pero razonable: el mismo palo ayuda.'
        }),
        rfiSpot('c05-11', 'SB', ['Ah', '2c'], 15011, {
          trapTag: 'over_open_sb',
          teachBack: 'A2o desde SB es débil offsuit fuera de posición. Suele ser fold — no open automático.'
        }),
        rfiSpot('c05-12', 'SB', ['Jc', 'Tc'], 15012, {
          teachBack: 'JTs desde SB: open fuerte, conectores altos suited.'
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
      concept: 'Repaso del módulo: posición, RFI, fold equity, sizing mental y la SB, con trampas mezcladas. Sin teoría nueva.',
      theory: [
        'No hay concepto nuevo. Solo aplica lo de C-01 a C-05: mira la silla, pregunta si la mano entra en el rango de open, y decide.',
        'Checklist rápido: ¿qué posición? → ¿merece open? → si sí, sizing estándar; si no, fold. En SB, más tight que en el botón.',
        'Si dudas de un combo, repasa los rangos RFI de cada posición en el menú Rangos antes o después del examen.'
      ],
      examples: [
        {
          title: 'Antes de pulsar',
          body: '1) Identifica la posición. 2) Pregúntate si ese combo se abre ahí. 3) Si no, fold. Si sí, open con tamaño normal. En SB, recuerda que no eres el botón.'
        }
      ],
      aiQuestions: [
        '¿Cuáles son mis fugas más típicas al abrir el bote?',
        'Resume en una frase RFI UTG vs BTN vs SB.'
      ],
      spots: [
        rfiSpot('c06-01', 'UTG', ['As', 'Ks'], 16001, {
          teachBack: 'AKs desde UTG: open. Mano premium en early.'
        }),
        rfiSpot('c06-02', 'UTG', ['Kd', '9c'], 16002, {
          trapTag: 'dominated',
          teachBack: 'K9o desde UTG: fold. Demasiado frágil con gente detrás.'
        }),
        rfiSpot('c06-03', 'BTN', ['Kd', '9c'], 16003, {
          teachBack: 'K9o en el botón: open. Misma mano, otra silla.'
        }),
        rfiSpot('c06-04', 'SB', ['Kd', '9c'], 16004, {
          trapTag: 'over_open_sb',
          teachBack: 'K9o desde SB: no es el botón. Evita el over-open; aquí fold.'
        }),
        rfiSpot('c06-05', 'CO', ['Qh', 'Qd'], 16005, {
          teachBack: 'QQ: open siempre, con sizing estándar.'
        }),
        rfiSpot('c06-06', 'HJ', ['Ah', 'Td'], 16006, {
          teachBack: 'ATo desde hijack suele ser open.'
        }),
        rfiSpot('c06-07', 'UTG', ['Ah', 'Td'], 16007, {
          trapTag: 'position_blind',
          teachBack: 'ATo desde UTG: fold frecuente. La posición manda.'
        }),
        rfiSpot('c06-08', 'SB', ['Js', 'Ts'], 16008, {
          teachBack: 'JTs desde SB: open. Buena jugabilidad suited.'
        }),
        rfiSpot('c06-09', 'BTN', ['4h', '4c'], 16009, {
          teachBack: '44 en el botón: open. Pareja baja con posición a favor.'
        }),
        rfiSpot('c06-10', 'CO', ['9c', '8h'], 16010, {
          trapTag: 'fancy_play',
          teachBack: '98o en cutoff no es automático; muchas veces fold. Ni limpees ni abras oversized.'
        }),
        rfiSpot('c06-11', 'BTN', ['9c', '8h'], 16011, {
          teachBack: '98o en el botón: robo razonable.'
        }),
        rfiSpot('c06-12', 'UTG', ['Qc', 'Jc'], 16012, {
          teachBack: 'QJs desde UTG: open en charts modernos.'
        }),
        rfiSpot('c06-13', 'SB', ['Qc', '8d'], 16013, {
          trapTag: 'over_open_sb',
          teachBack: 'Q8o desde SB: fold. Over-open típico fuera de posición.'
        }),
        rfiSpot('c06-14', 'CO', ['Ad', 'Jc'], 16014, {
          teachBack: 'AJo en cutoff: open de valor habitual en 6-max.'
        }),
        rfiSpot('c06-15', 'BTN', ['Kh', '5h'], 16015, {
          teachBack: 'K5s en el botón: open wide con blockers.'
        }),
        rfiSpot('c06-16', 'UTG', ['Td', '8d'], 16016, {
          trapTag: 'position_blind',
          teachBack: 'T8s desde UTG: fold típico. Guárdala para late.'
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

  function m1Lessons() {
    return lessonsForRoute('cash').filter(function (l) { return l.module === 'M1'; });
  }

  function m2Lessons() {
    return lessonsForRoute('cash').filter(function (l) { return l.module === 'M2'; });
  }

  function registerLessons(extra) {
    if (!extra || !extra.length) return;
    for (var i = 0; i < extra.length; i++) LESSONS.push(extra[i]);
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
    m1Lessons: m1Lessons,
    m2Lessons: m2Lessons,
    registerLessons: registerLessons,
    rfiSpot: rfiSpot,
    vsRfiSpot: vsRfiSpot,
    face3betSpot: face3betSpot,
    isoSpot: isoSpot,
    squeezeSpot: squeezeSpot,
    bbVsSbLimpSpot: bbVsSbLimpSpot,
    flopSpot: flopSpot
  };
})(typeof window !== 'undefined' ? window : globalThis);

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
        vs('c07-01', 'BB_vs_BTN', ['Ah', 'Kd'], 17001, { teachBack: 'AKo vs BTN: 3-bet de valor claro. Quieres más dinero en el bote.' }),
        vs('c07-02', 'BB_vs_UTG', ['Kh', 'Jd'], 17002, { trapTag: 'dominated', teachBack: 'KJo vs UTG está dominada por AK, KQ, KJ. Fold típico.' }),
        vs('c07-03', 'BB_vs_BTN', ['Kh', 'Jd'], 17003, { teachBack: 'KJo vs BTN: defensa razonable (hacer call o 3-bet ligero según el mix).' }),
        vs('c07-04', 'BB_vs_CO', ['7c', '2d'], 17004, { trapTag: 'dominated', teachBack: '72o vs CO: fold. No hagas call de más solo porque estás en BB.' }),
        vs('c07-05', 'BB_vs_BTN', ['9s', '8s'], 17005, { teachBack: '98s vs BTN: call cómodo, buena jugabilidad si ves flop.' }),
        vs('c07-06', 'BB_vs_HJ', ['Ad', '5d'], 17006, { teachBack: 'A5s vs HJ: 3-bet frecuente en muchos charts. En C-08 verás por qué este tipo de mano encaja como farol.' }),
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
        vs('c08-01', 'BB_vs_BTN', ['Qs', 'Qd'], 18001, {
          teachBack: 'QQ vs BTN es 3-bet de value: quieres aislar y jugar un bote grande con una mano fuerte.'
        }),
        vs('c08-02', 'BB_vs_BTN', ['Ad', '4d'], 18002, {
          teachBack: 'A4s vs BTN: 3-bet polar habitual. Es un farol con blockers (tienes un as) y algo de equity si hacen call.'
        }),
        vs('c08-03', 'BB_vs_UTG', ['Kh', 'Td'], 18003, {
          trapTag: 'fancy_play',
          teachBack: 'KTo vs UTG: 3-betear aquí suele ser spew (fichas sin plan). Fold típico ante un open temprano.'
        }),
        vs('c08-04', 'SB_vs_BTN', ['As', '5s'], 18004, {
          teachBack: 'A5s SB vs BTN: 3-bet polar frecuente — mismo idea que A4s: farol con as como blocker.'
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
        f3('c09-02', 'BTN_vs_BB', ['Ah', 'Ts'], 19002, {
          teachBack: 'ATs en el botón vs 3-bet de BB: call frecuente. Jugabilidad y posición a favor.'
        }),
        f3('c09-03', 'UTG_vs_BB', ['Ah', 'Td'], 19003, {
          trapTag: 'dominated',
          teachBack: 'ATo desde UTG vs 3-bet: fold típico. Estás OOP y la mano suele estar dominada. No hagas hero-call.'
        }),
        f3('c09-04', 'CO_vs_BTN', ['Kh', 'Qs'], 19004, {
          teachBack: 'KQs CO vs 3-bet del botón: call o 4-bet mixto razonable — mano fuerte con jugabilidad.'
        }),
        f3('c09-05', 'BTN_vs_SB', ['7c', '2d'], 19005, {
          trapTag: 'dominated',
          teachBack: '72o vs cualquier 3-bet: fold siempre. No inventes hero-calls con basura.'
        }),
        f3('c09-06', 'HJ_vs_BB', ['9s', '9c'], 19006, {
          teachBack: '99 desde HJ vs 3-bet: call frecuente. Pareja media sólida; no hace falta 4-betear siempre.'
        }),
        f3('c09-07', 'BTN_vs_BB', ['Ad', '5d'], 19007, {
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
        body: 'CO abre, el botón hace call, tú en BB con AKo: squeeze de value — quieres el bote ya gordo o aislar. Con 85o: fold. No “inventes” un squeeze solo porque el bote se ve grande.'
      }],
      aiQuestions: [
        '¿Por qué el squeeze gana fold equity extra?',
        '¿Qué manos uso de farol en squeeze y por qué?'
      ],
      spots: [
        sq('c10-01', 'BB', 'CO', 'BTN', ['As', 'Kd'], 20001, {
          teachBack: 'AKo: squeeze de value claro. Castigas open+call y pelear un bote grande con una mano fuerte.'
        }),
        sq('c10-02', 'BB', 'CO', 'BTN', ['8c', '5d'], 20002, {
          trapTag: 'fancy_play',
          teachBack: '85o: no hagas squeeze spew. Fold. Si te pagan, el bote es enorme y tu mano es floja.'
        }),
        sq('c10-03', 'BB', 'HJ', 'CO', ['Qh', 'Qd'], 20003, {
          teachBack: 'QQ: squeeze de value. Quieres aislar o meter más fichas con una mano premium.'
        }),
        sq('c10-04', 'SB', 'CO', 'BTN', ['Ad', '5d'], 20004, {
          teachBack: 'A5s: squeeze polar frecuente — farol con as como blocker, misma lógica que el 3-bet polar.'
        }),
        sq('c10-05', 'BB', 'UTG', 'BTN', ['Jh', '9c'], 20005, {
          trapTag: 'fancy_play',
          teachBack: 'J9o vs UTG + call: fold. Vs open temprano el squeeze loco es spew.'
        }),
        sq('c10-06', 'BB', 'CO', 'BTN', ['9s', '9c'], 20006, {
          teachBack: '99: squeeze o call mixto; value razonable. No la trates como basura ni como AA automática.'
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
        body: 'UTG limpea y tú estás en el botón con AJs: iso claro — quieres heads-up con ventaja. Con 72o: fold. No “castigues” el limp con cualquier dos cartas.'
      }],
      aiQuestions: [
        '¿Qué tamaño de iso uso, en palabras simples?',
        '¿Cuándo tiene sentido limpear detrás en vez de aislar?'
      ],
      spots: [
        iso('c11-01', 'BTN', 'UTG', ['Ah', 'Js'], 21001, {
          teachBack: 'AJs en el botón vs limp: iso claro. Quieres aislar y jugar con la iniciativa.'
        }),
        iso('c11-02', 'BTN', 'UTG', ['7c', '2d'], 21002, {
          trapTag: 'dominated',
          teachBack: '72o: fold. No hagas overiso con basura solo porque alguien limpeó.'
        }),
        iso('c11-03', 'CO', 'HJ', ['Kd', 'Qs'], 21003, {
          teachBack: 'KQs en cutoff: iso de value. Mano fuerte que quiere heads-up.'
        }),
        iso('c11-04', 'SB', 'CO', ['9h', '8h'], 21004, {
          teachBack: '98s desde SB: iso razonable. Suited y jugable; no es overiso de basura.'
        }),
        iso('c11-05', 'CO', 'UTG', ['Qd', '8c'], 21005, {
          trapTag: 'fancy_play',
          teachBack: 'Q8o: fold frecuente. Aislar esto suele ser overiso — spew disfrazado de “castigo”.'
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
        'Check con manos mediocres aprovecha la opción: ya estás en el bote. Iso con value (AK, QQ…) y algunas manos de presión (ases suited). No tienes que aislar cada mano.',
        'No overfoldees el spot: la BB ya puso su ciega. Tampoco aísles 72o “porque el SB limpeó”: eso es spew.',
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
        bb('c12-01', ['As', 'Kd'], 22001, {
          teachBack: 'AKo vs SB limp: iso. Castigas el limp y metes valor con una mano fuerte.'
        }),
        bb('c12-02', ['7c', '2d'], 22002, {
          trapTag: 'fancy_play',
          teachBack: '72o: check (opción gratis). No hagas iso spew con basura.'
        }),
        bb('c12-03', ['Qh', 'Qd'], 22003, {
          teachBack: 'QQ: iso de value. No regales un flop barato al SB limpeando.'
        }),
        bb('c12-04', ['9s', '8c'], 22004, {
          teachBack: '98o: check frecuente. Mano especulativa; aprovecha la opción.'
        }),
        bb('c12-05', ['Ad', '5d'], 22005, {
          teachBack: 'A5s: iso frecuente. Farol/presión con as blocker y algo de equity si pagan.'
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
        vs('c13-01', 'BB_vs_BTN', ['As', 'Ks'], 23001, {
          teachBack: 'AKs vs BTN: 3-bet de value. Mano premium frente a un open late.'
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
        sq('c13-05', 'BB', 'CO', 'BTN', ['Qc', 'Qd'], 23005, {
          teachBack: 'QQ: squeeze de value tras open+call.'
        }),
        iso('c13-06', 'BTN', 'UTG', ['7d', '2c'], 23006, {
          trapTag: 'dominated',
          teachBack: '72o vs limp: fold. No overiso.'
        }),
        bb('c13-07', ['Ah', 'Kd'], 23007, {
          teachBack: 'AKo BB vs SB limp: iso para castigar.'
        }),
        vs('c13-08', 'BB_vs_CO', ['9s', '8s'], 23008, {
          teachBack: '98s vs CO: defensa sólida (call o 3-bet según mix).'
        }),
        iso('c13-09', 'CO', 'HJ', ['Jd', 'Ts'], 23009, {
          teachBack: 'JTs: iso razonable vs limp — jugabilidad e iniciativa.'
        }),
        sq('c13-10', 'BB', 'HJ', 'BTN', ['8c', '5d'], 23010, {
          trapTag: 'fancy_play',
          teachBack: '85o: no squeeze. Fold. Evita spew en botes multiway.'
        })
      ]
    }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);

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
        'Contra overbet (apuesta enorme) o boards que te destrozan (AKQ con 72o), foldear es correcto. No “defendemos todo”.',
        'Trampa: overfold vs 33 % — tirar demasiadas manos con outs reales solo porque no tienes pareja alta.'
      ],
      examples: [{
        title: 'Odds vs sizing',
        body: 'BB vs c-bet a 1/3 en A72 rainbow con 86s (gutshot + backdoors): hacer call. Con 72o sin backdoors: fold. El sizing pequeño te invita a continuar cuando tienes camino.'
      }],
      aiQuestions: [
        '¿Por qué defiendo más vs un c-bet pequeño?',
        '¿Qué es un backdoor, con un ejemplo?'
      ],
      spots: [
        flop('c17-01', 'BB', ['8h', '6h'], ['As', '7d', '2c'], 27001, {
          facingBet: true,
          teachBack: 'Vs sizing pequeño, 86s con equity y backdoors: continúa (call). No overfoldees.'
        }),
        flop('c17-02', 'BB', ['7c', '2d'], ['As', 'Kd', 'Qc'], 27002, {
          facingBet: true,
          trapTag: 'dominated',
          teachBack: '72o en AKQ: fold. Sin equity real — aquí sí te tiras.'
        }),
        flop('c17-03', 'BB', ['Jh', 'Th'], ['9s', '8d', '2c'], 27003, {
          facingBet: true,
          teachBack: 'JT con straight draw (proyecto de escalera): continue claro vs c-bet pequeño.'
        }),
        flop('c17-04', 'BB', ['Ad', '4c'], ['Kh', '7s', '2d'], 27004, {
          facingBet: true,
          teachBack: 'A-high + backdoor: call vs bet pequeño frecuente. Tienes outs y precio.'
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
        flop('c18-01', 'BTN', ['Kh', 'Qd'], ['As', '7d', '2c'], 28001, {
          street: 'turn',
          teachBack: 'Con KQ en A-high: plan de barrel/value en turns buenos (cuando mejoras o el board sigue amable).'
        }),
        flop('c18-02', 'BTN', ['Jh', '9c'], ['As', '7d', '2c'], 28002, {
          street: 'turn',
          trapTag: 'fancy_play',
          teachBack: 'Segunda pareja floja sin mejora: no hagas sticky barrel eterno. Controla o cede.'
        }),
        flop('c18-03', 'CO', ['Ad', 'Kd'], ['Ah', '8c', '3s'], 28003, {
          street: 'turn',
          teachBack: 'Top pair top kicker (pareja alta con el mejor kicker): barrel de value frecuente.'
        }),
        flop('c18-04', 'BTN', ['8s', '7s'], ['As', 'Kd', '2h'], 28004, {
          street: 'turn',
          teachBack: 'Fallaste: en turn, a menudo give up (cedes) si no hay scare card que justifique farol.'
        }),
        flop('c18-05', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c'], 28005, {
          street: 'turn',
          teachBack: 'Overpair: barrel de value en turns seguros. Cobras a peores pares y draws.'
        }),
        flop('c18-06', 'BTN', ['5h', '5c'], ['As', 'Kd', 'Qc'], 28006, {
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
        flop('c19-01', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d'], 29001, {
          street: 'river',
          teachBack: 'TPTK (top pair top kicker): value bet de river frecuente. Peores manos aún pagan.'
        }),
        flop('c19-02', 'BTN', ['Kh', 'Kd'], ['As', '7c', '2d'], 29002, {
          street: 'river',
          teachBack: 'KK en A-high: pot control — no overvalues (no hinches como si tuvieras la nuez).'
        }),
        flop('c19-03', 'CO', ['Qh', 'Qd'], ['Qc', '8s', '3h'], 29003, {
          street: 'river',
          teachBack: 'Set (trío): value fat. Sizing mayor — quieres valor máximo.'
        }),
        flop('c19-04', 'BTN', ['Jh', '9c'], ['As', 'Kd', 'Qc'], 29004, {
          street: 'river',
          trapTag: 'fancy_play',
          teachBack: 'Aire en broadway: no hagas bluff spew sin blockers ni historia. Better give up.'
        }),
        flop('c19-05', 'BTN', ['Ad', '5d'], ['Ah', '9c', '4s'], 29005, {
          street: 'river',
          teachBack: 'Top pair débil: thin value o check según el rival. No es nuts; tampoco es aire.'
        }),
        flop('c19-06', 'BTN', ['8s', '7s'], ['9h', '6d', '2c'], 29006, {
          street: 'river',
          teachBack: 'Escalera: value fat. Cobras fuerte; pocas manos te ganan.'
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
        flop('c20-04', 'BTN', ['Qc', 'Qd'], ['Jh', '9s', '4c'], 30004, {
          street: 'turn',
          teachBack: 'Overpair: barrel de value en turn seguro.'
        }),
        flop('c20-05', 'BTN', ['Ah', 'Kd'], ['As', '7c', '2d'], 30005, {
          street: 'river',
          teachBack: 'TPTK: value bet de river. No undervaluees.'
        }),
        flop('c20-06', 'BTN', ['7c', '2d'], ['As', 'Kd', 'Qc'], 30006, {
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

/*
 * school.js — Escuela de Póker: hub, lecciones M0–M2, runner de spots fijos.
 * Menú visible solo para admin (Fases D–F implementadas; apertura pública = Fase E diferida).
 * Las manos consumen cupo Free del trainer.
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
   * Visibilidad del menú Escuela.
   * Fase D/E/F: sigue admin-only (pedido explícito). La allowlist beta queda lista
   * para cuando se quite este candado sin reabrir a 100 %.
   */
  var SCHOOL_BETA_EMAILS = [
    /* añadir emails beta aquí cuando se abra sin menú global */
  ];
  var SCHOOL_PUBLIC = false; // true = GA (Fase E completa)

  function userEmail() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return (u && u.email) ? String(u.email).toLowerCase() : '';
  }

  function isSchoolBetaUser() {
    var email = userEmail();
    if (!email) return false;
    for (var i = 0; i < SCHOOL_BETA_EMAILS.length; i++) {
      if (String(SCHOOL_BETA_EMAILS[i]).toLowerCase() === email) return true;
    }
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('pt_school_beta') === '1') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  /** ¿Puede ver el tab Escuela? Hoy: solo admin. */
  function schoolMenuVisible() {
    if (SCHOOL_PUBLIC) return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
    return hasAdminAccess();
  }

  function trackSchool(eventName, props) {
    try {
      if (global.PTLog && typeof global.PTLog.event === 'function') {
        global.PTLog.event(eventName, props || {});
        return;
      }
      if (global.PTAnalytics && typeof global.PTAnalytics.track === 'function') {
        global.PTAnalytics.track(eventName, props || {});
      }
    } catch (e) { /* ignore */ }
  }

  function entitlementsPlan() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    if (ent && ent.plan) return String(ent.plan);
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return (u && u.plan) || 'free';
  }

  /** free=0, study/pro=1, coach/premium=2 */
  function planRank(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 2;
    if (p === 'pro' || p === 'study') return 1;
    return 0;
  }

  function lessonPlanRank(lesson) {
    if (!lesson) return 0;
    return planRank(lesson.plan || 'free');
  }

  function planLabelFor(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function openUpgrade(reason) {
    trackSchool('lesson_blocked_plan', { reason: reason || 'plan' });
    if (global.PTBilling && typeof global.PTBilling.showPaywall === 'function') {
      global.PTBilling.showPaywall(reason || 'school_plan');
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('pricing');
  }

  /**
   * Gate de contenido (Fase D): plan Free/Study/Coach + desbloqueo lineal.
   * Menú sigue admin-only; dentro, el plan se respeta (admin free ve muros Study).
   */
  function canPlayLesson(lessonId) {
    if (!schoolMenuVisible()) {
      return { ok: false, reason: 'admin_only', message: 'Escuela en pruebas (solo administración).' };
    }
    var lesson = Data() && Data().getLesson(lessonId);
    if (!lesson) return { ok: false, reason: 'missing', message: 'Lección no encontrada.' };
    if (!isLessonUnlocked(lessonId)) {
      return { ok: false, reason: 'locked', message: 'Completa la lección anterior.' };
    }
    var need = lessonPlanRank(lesson);
    var have = planRank(entitlementsPlan());
    if (have < need) {
      return {
        ok: false,
        reason: 'plan',
        message: 'Esta lección requiere plan ' + planLabelFor(lesson.plan) + '.',
        requiredPlan: lesson.plan,
        upgrade: true
      };
    }
    return { ok: true, lesson: lesson };
  }

  function schoolPlayConfig(spot) {
    var base = {
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
    var extra = (spot && spot.playConfig) || {};
    var out = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    return out;
  }

  function spotToForce(spot) {
    var fd = spot.forceDeal || {};
    var force = {
      type: spot.type || 'RFI',
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: {
        heroCards: fd.heroCards || spot.heroCards,
        villainCards: fd.villainCards || null,
        board: (fd.board || []).slice(),
        villainPos: fd.villainPos || 'BB'
      }
    };
    if (spot.key) force.key = spot.key;
    if (spot.limperPos) force.limperPos = spot.limperPos;
    if (spot.openerPos) force.openerPos = spot.openerPos;
    if (spot.callerPos) force.callerPos = spot.callerPos;
    if (spot.limperPositions) force.limperPositions = spot.limperPositions;
    if (spot.facingBet || (spot.forceDeal && spot.forceDeal.facingBet)) {
      force.facingBet = true;
      force.forceDeal.facingBet = true;
    }
    return force;
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
      global.playAnalysisHand(force, schoolPlayConfig(s.spots[index]));
    }
  }

  function classLabel(cls) {
    if (cls === 'optima') return 'Óptima';
    if (cls === 'aceptable') return 'Aceptable';
    if (cls === 'imprecisa') return 'Imprecisa';
    if (cls === 'error') return 'Error';
    return cls || '—';
  }

  /** Cartas legibles en resumen (códigos del motor: Ah Td). */
  function formatCards(cards) {
    if (!cards || !cards.length) return '';
    return cards.map(function (c) { return String(c); }).join(' ');
  }

  function formatBoard(board) {
    if (!board || !board.length) return '';
    return formatCards(board);
  }

  /**
   * Resumen de spot fallido: posición · cartas · board (si hay) · clase + teachBack.
   * trapTag es interno (autoría/analytics): no se muestra al alumno.
   */
  function formatFailSpotHtml(f) {
    var parts = [];
    if (f.heroPos) parts.push(f.heroPos);
    var cards = formatCards(f.heroCards);
    if (cards) parts.push(cards);
    var board = formatBoard(f.board);
    if (board) parts.push('board ' + board);
    parts.push(classLabel(f.class));
    var explain = f.teachBack || f.reason || '';
    return '<li class="school-fail-item">' +
      '<div class="school-fail-head">' + esc(parts.join(' · ')) + '</div>' +
      (explain ? '<p class="school-fail-teach">' + esc(explain) + '</p>' : '') +
      '</li>';
  }

  function showSpotFeedback(decision, spot) {
    var s = state.session;
    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    if (!fb || !s) return;
    var good = decision.class === 'optima' || decision.class === 'aceptable';
    var teach = (spot && spot.teachBack) || decision.reason || '';
    var remaining = s.spots.length - s.index - 1;
    var cards = spot && spot.forceDeal ? formatCards(spot.forceDeal.heroCards) : '';
    var board = spot && spot.forceDeal ? formatBoard(spot.forceDeal.board) : '';
    var meta = [];
    if (spot && spot.heroPos) meta.push(spot.heroPos);
    if (cards) meta.push(cards);
    if (board) meta.push('board ' + board);
    fb.classList.remove('hidden');
    fb.innerHTML =
      '<div class="school-spot-feedback ' + (good ? 'is-good' : 'is-bad') + '">' +
      '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ' + esc(classLabel(decision.class)) + '</h3>' +
      (meta.length ? '<p class="school-spot-meta">' + esc(meta.join(' · ')) + '</p>' : '') +
      '<p class="school-spot-action">Tu acción: <strong>' + esc(decision.label || decision.action || decision.id || '—') + '</strong></p>' +
      (teach ? '<p class="school-spot-teach">' + esc(teach) + '</p>' : '') +
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
    trackSchool(summary.passed ? 'lesson_complete' : 'lesson_fail', {
      lessonId: lesson.id,
      pct: summary.pct,
      passed: summary.passed,
      gold: summary.gold
    });
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
    if (!gate.ok) {
      trackSchool('lesson_blocked_plan', { lessonId: lessonId, reason: gate.reason });
      if (gate.upgrade) openUpgrade(gate.reason);
      return;
    }
    trackSchool('lesson_start', { lessonId: lesson.id, module: lesson.module, plan: lesson.plan });
    if (!lesson.spots || !lesson.spots.length) {
      var summary = completeTheoryLesson(lesson);
      trackSchool('lesson_complete', { lessonId: lesson.id, pct: summary.pct, passed: summary.passed });
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
      heroPos: spot && spot.heroPos,
      heroCards: spot && spot.forceDeal && spot.forceDeal.heroCards
        ? spot.forceDeal.heroCards.slice()
        : null,
      board: spot && spot.forceDeal && spot.forceDeal.board
        ? spot.forceDeal.board.slice()
        : null,
      teachBack: (spot && spot.teachBack) || decision.reason || '',
      reason: decision.reason || '',
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
    if (!isLessonUnlocked(lesson.id)) return 'locked';
    var need = lessonPlanRank(lesson);
    var have = planRank(entitlementsPlan());
    if (have < need) return 'plan';
    return 'open';
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

    function renderModuleNodes(modLessons, startIdx) {
      return modLessons.map(function (l, i) {
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
        var lock = '';
        if (st === 'locked') lock = '<span class="school-node-lock" aria-hidden="true">Bloqueada</span>';
        if (st === 'plan') lock = '<span class="school-node-lock school-node-plan" aria-hidden="true">' +
          planLabelFor(l.plan) + '</span>';
        return '<button type="button" class="school-node is-' + st + '" data-school-lesson="' + esc(l.id) + '"' +
          (st === 'locked' ? ' disabled' : '') + '>' +
          '<span class="school-node-idx">' + (startIdx + i + 1) + '</span>' +
          '<span class="school-node-body">' +
          '<span class="school-node-title">' + esc(l.title) + '</span>' +
          '<span class="school-node-meta">' + planBadge(l.plan) + ' · ' + (l.hands || 0) + ' manos · +' + (l.xp || 0) + ' XP</span>' +
          '</span>' +
          pctHtml + stars + lock +
          '</button>';
      }).join('');
    }
    var m0 = data.m0Lessons ? data.m0Lessons() : lessons.filter(function (l) { return l.module === 'M0'; });
    var m1 = data.m1Lessons ? data.m1Lessons() : lessons.filter(function (l) { return l.module === 'M1'; });
    var m2 = data.m2Lessons ? data.m2Lessons() : lessons.filter(function (l) { return l.module === 'M2'; });
    var m0Passed = 0; m0.forEach(function (l) { if (isLessonPassed(l.id)) m0Passed += 1; });
    var m1Passed = 0; m1.forEach(function (l) { if (isLessonPassed(l.id)) m1Passed += 1; });
    var m2Passed = 0; m2.forEach(function (l) { if (isLessonPassed(l.id)) m2Passed += 1; });
    var nodesM0 = renderModuleNodes(m0, 0);
    var nodesM1 = renderModuleNodes(m1, m0.length);
    var nodesM2 = renderModuleNodes(m2, m0.length + m1.length);

    root.innerHTML =
      '<div class="school-page">' +
      '<header class="school-hero">' +
      '<p class="school-eyebrow">Admin · Fases D–F · Menú solo administración</p>' +
      '<h2 class="school-title">Escuela de Póker</h2>' +
      '<p class="school-lead">M0 Gratis + M1/M2 Study (preflop y postflop). Gates de plan activos. Las manos consumen el cupo Free del entrenador.</p>' +
      '<div class="school-hero-stats">' +
      '<div class="school-stat"><span class="school-stat-val">Nv. ' + lv.level + '</span><span class="school-stat-lbl">Nivel Escuela</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + lv.xp + '</span><span class="school-stat-lbl">XP</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + m0Passed + '/' + m0.length + '</span><span class="school-stat-lbl">M0</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + (m1Passed + m2Passed) + '/' + (m1.length + m2.length) + '</span><span class="school-stat-lbl">M1–M2</span></div>' +
      '</div>' +
      '<div class="school-xp-bar" aria-hidden="true"><div class="school-xp-fill school-xp-fill-anim" style="width:' +
      Math.min(100, Math.round((lv.into / lv.per) * 100)) + '%"></div></div>' +
      '</header>' +
      '<div class="school-routes" role="tablist">' + routeTabs + '</div>' +
      (soonTeasers
        ? '<div class="muted-text school-route-teasers">Próximas rutas:<ul class="school-teaser-list">' + soonTeasers + '</ul></div>'
        : '') +
      '<section class="school-map card-box">' +
      '<h3 class="school-map-title">M0 · Fundamentos Cash (Gratis)</h3>' +
      '<p class="muted-text school-map-lead">' + m0Passed + '/' + m0.length + ' completadas. Desbloqueo lineal.</p>' +
      '<div class="school-nodes">' + nodesM0 + '</div></section>' +
      '<section class="school-map card-box">' +
      '<h3 class="school-map-title">M1 · Preflop core (Study)</h3>' +
      '<p class="muted-text school-map-lead">' + m1Passed + '/' + m1.length + ' · Defensa BB, 3-bet, squeeze, iso.</p>' +
      '<div class="school-nodes">' + nodesM1 + '</div></section>' +
      '<section class="school-map card-box">' +
      '<h3 class="school-map-title">M2 · Postflop core (Study)</h3>' +
      '<p class="muted-text school-map-lead">' + m2Passed + '/' + m2.length + ' · Textura, c-bet, defensa, barrels.</p>' +
      '<div class="school-nodes">' + nodesM2 + '</div></section>' +
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
        if (!gate.ok) {
          if (gate.upgrade) openUpgrade(gate.reason);
          return;
        }
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
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · ' + esc(lesson.module || 'M0') + ' Cash ' + planBadge(lesson.plan) + '</p>' +
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

  /** Tip breve tipo coach al cerrar la sesión (Fase F). */
  function schoolCoachTip(lesson, passed, fails) {
    if (!lesson) return '';
    if (passed && lesson.exam) return 'Examen superado. El módulo queda marcado y puedes seguir al siguiente.';
    if (passed) {
      if (lesson.module === 'M2') return 'Buen trabajo postflop. En mesa real, nombra la textura antes del sizing.';
      if (lesson.module === 'M1') return 'Preflop sólido. Posición y stack definen el tamaño; no copies ciegas de torneo.';
      return 'Lección superada. Siguiente nodo del mapa cuando quieras.';
    }
    var blob = (fails || []).map(function (f) {
      return String(f.reason || '') + ' ' + String(f.teachBack || '') + ' ' + String(f.spotId || '');
    }).join(' ').toLowerCase();
    if (/fold|pasaste|pasas/.test(blob) && /call|defend|defender|overfold/.test(blob + ' ' + (lesson.id || '') + ' ' + (lesson.title || '').toLowerCase())) {
      return 'Estás foldando de más en spots de defensa. Revisa pot odds y si tienes equity realization.';
    }
    if (/3-?bet|squeeze|raise/.test(blob) && /spew|fancy|value|bluff|polar/.test(blob)) {
      return 'Revisa tu mix value/bluff: el sizing debe corresponder al plan (negar equity vs value-heavy).';
    }
    if (/c-?bet|barrel|flop|textura|wet|seco/.test(blob) || lesson.module === 'M2') {
      return 'En postflop, nombra la textura antes de actuar: ¿quién tiene más nut advantage? Luego bet o check.';
    }
    if (lesson.exam) return 'Repasa las lecciones del módulo y vuelve al examen con calma.';
    return 'Revisa los fallos abajo, lee otra vez el teach-back y reintenta la lección.';
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
    var tip = schoolCoachTip(lesson, sum.passed, fails);

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
      (tip
        ? '<div class="school-coach-note card-box"><span class="school-coach-label">Coach</span><p>' + esc(tip) + '</p></div>'
        : '') +
      (fails.length
        ? '<section class="card-box"><h3>Spots a repasar</h3><ul class="school-fail-list">' +
          fails.map(formatFailSpotHtml).join('') + '</ul></section>'
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
    if (!schoolMenuVisible()) {
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
    formatFailSpotHtml: formatFailSpotHtml,
    formatCards: formatCards,
    schoolCoachTip: schoolCoachTip,
    schoolMenuVisible: schoolMenuVisible,
    isSchoolBetaUser: isSchoolBetaUser,
    planRank: planRank,
    entitlementsPlan: entitlementsPlan,
    trackSchool: trackSchool,
    _state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
