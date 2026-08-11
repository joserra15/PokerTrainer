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
 * - Acción call: siempre «hacer call» (haces/hacen call); nunca «llamar/llaman».
 * - C-09+: término de póker + ancla en español la 1ª vez en la lección.
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
          teachBack: 'T9s en el botón: open para robar y, si hacen call, buena jugabilidad.'
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
