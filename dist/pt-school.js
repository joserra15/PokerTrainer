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
 * - Acción call: siempre «hacer call» (haces/hacen call); nunca «llamar/llaman».
 * - C-09+: término de póker + ancla en español la 1ª vez en la lección.
 * - Orden de introducción en M0: posiciones → open/fold → RFI → limp →
 *   fold equity → sizing (bb) → SB/OOP. El examen no introduce vocabulario nuevo.
 * Ver también docs/ROADMAP_LECCIONES_DIRIGIDAS.md §4.5.
 */
(function (global) {
  'use strict';

  var XP_PER_LEVEL = 200;
  var SCHOOL_DATA_VERSION = 4;

  var ROUTES = [
    { id: 'cash', label: 'Cash', status: 'active' },
    { id: 'spin', label: 'Spins', status: 'soon', teaser: 'Cargando Spins…' },
    { id: 'mtt', label: 'Torneos', status: 'soon', teaser: 'Cargando MTT…' },
    { id: 'ranges', label: 'Rangos', status: 'soon', teaser: 'Cargando laboratorio…' }
  ];

  function setRouteStatus(id, status, teaser) {
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].id === id) {
        ROUTES[i].status = status || 'active';
        if (teaser != null) ROUTES[i].teaser = teaser;
        if (status === 'active') delete ROUTES[i].teaser;
        return;
      }
    }
    ROUTES.push({ id: id, label: id, status: status || 'active', teaser: teaser });
  }

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
      playConfig: Object.assign({ scenario: 'rfi' }, meta.playConfig || {}, { practiceStreet: street })
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
          teachBack: 'KTo en cutoff entra en muchos rangos de open: broadway offsuit y buena jugabilidad.'
        }),
        rfiSpot('c01-05', 'HJ', ['Qs', 'Js'], 11005, {
          teachBack: 'QJs desde hijack es un open cómodo: conectores altos del mismo palo, con plan claro si ves flop.'
        }),
        rfiSpot('c01-06', 'UTG', ['Qd', 'Jd'], 11006, {
          teachBack: 'QJs también se abre desde UTG en charts modernos. No la trates como basura solo por ser early.'
        }),
        rfiSpot('c01-07', 'BTN', ['7h', '6h'], 11007, {
          teachBack: 'Conectores suited en el botón son opens de posición: robas ciegas y, si hacen call (si te igualan la apuesta), tienes equity especulativa.'
        }),
        rfiSpot('c01-08', 'UTG', ['6d', '5d'], 11008, {
          trapTag: 'position_blind',
          teachBack: '65s desde UTG suele ser fold: poco margen para que todos plieguen y peores spots si hay multiway fuera de posición.'
        }),
        rfiSpot('c01-09', 'CO', ['Ah', '4h'], 11009, {
          teachBack: 'A4s en cutoff se abre: bloqueas ases y se juega bien. El caso de la ciega pequeña lo vemos en C-05.'
        }),
        rfiSpot('c01-10', 'HJ', ['7h', '7d'], 11010, {
          teachBack: 'Las parejas medias se abren casi desde cualquier sitio. Aquí open sin drama.'
        }),
        rfiSpot('c01-11', 'CO', ['Ah', '2c'], 11011, {
          trapTag: 'dominated',
          teachBack: 'A2o en cutoff es débil (offsuit, as bajo). Abrirla wide no está justificado; muchas veces fold.'
        }),
        rfiSpot('c01-12', 'BTN', ['Kh', 'Jd'], 11012, {
          teachBack: 'KJo en el botón es un robo frecuente. La posición justifica el open.'
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
        rfiSpot('c02-01', 'UTG', ['Ad', 'Kd'], 12001, {
          teachBack: 'Con AKs siempre abres. No hay debate: es la mejor mano de partida.'
        }),
        rfiSpot('c02-02', 'UTG', ['Qd', 'Tc'], 12002, {
          trapTag: 'dominated',
          teachBack: 'QTo es la mano más débil del mazo. Fold desde cualquier silla cuando nadie ha entrado.'
        }),
        rfiSpot('c02-03', 'HJ', ['Ts', 'Tc'], 12003, {
          teachBack: 'TT se abre desde casi todas partes. Open.'
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
        rfiSpot('c03-03', 'CO', ['As', '3s'], 13003, {
          teachBack: 'A3s en cutoff se abre: bloqueas ases, tienes fold equity y se juega bien.'
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
        rfiSpot('c03-10', 'HJ', ['Kd', 'Kh'], 13010, {
          teachBack: 'KK se abre por valor y por fold equity. Nunca limpees con esto.'
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
          teachBack: 'AJo en cutoff: open claro con sizing estándar. Ni limpees ni abras oversized.'
        }),
        rfiSpot('c04-02', 'UTG', ['As', '9d'], 14002, {
          trapTag: 'dominated',
          teachBack: 'A9o no se arregla abriendo más grande. Fold.'
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
        rfiSpot('c04-07', 'BTN', ['9s', '8s'], 14007, {
          teachBack: '98s en el botón: open de robo con sizing normal.'
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
        rfiSpot('c05-01', 'SB', ['Ac', 'Qc'], 15001, {
          teachBack: 'AQs desde SB es fuerte frente al BB. Open claro.'
        }),
        rfiSpot('c05-02', 'SB', ['Qd', 'Tc'], 15002, {
          trapTag: 'over_open_sb',
          teachBack: 'QTo desde SB es la trampa del over-open: fuera de posición vs BB. Aquí no la trates como un steal de botón.'
        }),
        rfiSpot('c05-03', 'SB', ['Qs', 'Js'], 15003, {
          teachBack: 'QJs desde SB es open sólido: suited y con buena jugabilidad.'
        }),
        rfiSpot('c05-04', 'SB', ['9d', '3c'], 15004, {
          trapTag: 'dominated',
          teachBack: '93o desde SB: fold. Siempre.'
        }),
        rfiSpot('c05-05', 'SB', ['Ad', '8d'], 15005, {
          teachBack: 'A8s desde SB se abre a menudo: blockers y equity decente.'
        }),
        rfiSpot('c05-06', 'SB', ['Jh', 'Tc'], 15006, {
          trapTag: 'over_open_sb',
          teachBack: 'JTo desde SB es frontera o fold en muchos charts: fuera de posición duele. No es un open de botón.'
        }),
        rfiSpot('c05-07', 'SB', ['Ts', 'Th'], 15007, {
          teachBack: 'TT desde SB: open claro. Pareja media, sin discusión.'
        }),
        rfiSpot('c05-08', 'SB', ['Qd', '7c'], 15008, {
          trapTag: 'over_open_sb',
          teachBack: 'Q7o desde SB es basura offsuit fuera de posición. Fold.'
        }),
        rfiSpot('c05-09', 'SB', ['Kh', 'Qs'], 15009, {
          teachBack: 'KQo desde SB es open habitual contra el BB.'
        }),
        rfiSpot('c05-10', 'SB', ['Th', '9h'], 15010, {
          teachBack: 'T9s desde SB es especulativa pero razonable: el mismo palo ayuda.'
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
        rfiSpot('c06-01', 'UTG', ['Ah', 'Jh'], 16001, {
          teachBack: 'AJs desde UTG: open. Mano premium en early.'
        }),
        rfiSpot('c06-02', 'UTG', ['Qd', '9c'], 16002, {
          trapTag: 'dominated',
          teachBack: 'Q9o desde UTG: fold. Demasiado frágil con gente detrás.'
        }),
        rfiSpot('c06-03', 'BTN', ['As', '9h'], 16003, {
          teachBack: 'A9o en el botón: open. Misma mano, otra silla.'
        }),
        rfiSpot('c06-04', 'SB', ['Js', '9h'], 16004, {
          trapTag: 'over_open_sb',
          teachBack: 'J9o desde SB: no es el botón. Evita el over-open; aquí fold.'
        }),
        rfiSpot('c06-05', 'CO', ['Ks', 'Qs'], 16005, {
          teachBack: 'KQs: open siempre, con sizing estándar.'
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
        rfiSpot('c06-13', 'SB', ['Jh', '8d'], 16013, {
          trapTag: 'over_open_sb',
          teachBack: 'J8o desde SB: fold. Over-open típico fuera de posición.'
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

  function lessonsForModule(routeId, moduleId) {
    return lessonsForRoute(routeId).filter(function (l) { return l.module === moduleId; });
  }

  function modulesInRoute(routeId) {
    var seen = {};
    var out = [];
    lessonsForRoute(routeId).forEach(function (l) {
      var m = l.module || 'M0';
      if (!seen[m]) { seen[m] = true; out.push(m); }
    });
    out.sort();
    return out;
  }

  function registerLessons(extra) {
    if (!extra || !extra.length) return;
    for (var i = 0; i < extra.length; i++) {
      var lesson = extra[i];
      if (Array.isArray(lesson.spots) && lesson.spots.length) {
        lesson.hands = lesson.spots.length;
      }
      LESSONS.push(lesson);
    }
  }

  /** Toda lección con spots de práctica: hands = nº de spots (≥10 en currículum). */
  LESSONS.forEach(function (lesson) {
    if (Array.isArray(lesson.spots) && lesson.spots.length) {
      lesson.hands = lesson.spots.length;
    }
  });

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
    lessonsForModule: lessonsForModule,
    modulesInRoute: modulesInRoute,
    setRouteStatus: setRouteStatus,
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
        vs('c07-01', 'BB_vs_BTN', ['Qs', 'Qh'], 17001, { teachBack: 'QQ vs BTN: 3-bet de valor claro. Quieres más dinero en el bote.' }),
        vs('c07-02', 'BB_vs_UTG', ['Kh', 'Jd'], 17002, { trapTag: 'dominated', teachBack: 'KJo vs UTG está dominada por AK, KQ, KJ. Fold típico.' }),
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

/*
 * school-data-spin.js — Fase G: Spins S-00…S-17
 * Menú Escuela: admin-only (SCHOOL_PUBLIC=false).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  
  function spinCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mttCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }
  function packSpots(kind, D) {
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN ~20 bb: shove (all-in) por valor. A esta profundidad no min-raisees premium offsuit — shove o fold.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['5h', '2s'], 40102, { trapTag: 'dominated', teachBack: '52o: fold. No stealees basura total: si te pagan o te re-suben, la mano casi nunca aguanta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB ~20 bb: open steal a ~2,5–3 bb (no shove). Mano media del rango — roba ciegas con sizing normal; shove reservado a premiums.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['9s', '6c'], 40104, { trapTag: 'fancy_play', teachBack: '96o SB: fold. No estás en BTN: aquí el steal es más arriesgado porque quedarás OOP si te igualan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['Ts', 'Tc'], 40105, { teachBack: 'TT BTN ~20 bb: shove claro. Par medio fuerte en zona steal — quieres fold equity o ir all-in, no open min.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['9c', '7c'], 40106, { teachBack: '97s BTN ~20 bb: open steal a ~2,5 bb. Mano media con jugabilidad — roba ciegas sin commitear todo el stack.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-07', 'BTN', ['Qs', 'Qh'], 40107, { teachBack: 'QQ BTN ~20 bb: shove por valor. Premium claro — maximizas fold equity o vas all-in con equity alta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-08', 'SB', ['6d', '4c'], 40108, { trapTag: 'dominated', teachBack: '64o SB: fold. Desde SB no stealees basura: quedarás OOP si te pagan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-09', 'BTN', ['Kh', 'Qs'], 40109, { teachBack: 'KQo BTN ~20 bb: open min o shove mixto; aquí open steal ~2,5 bb es sólido con broadway suited.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-10', 'SB', ['Ah', '4h'], 40110, { teachBack: 'A4s SB ~20 bb: open steal razonable. As suited con jugabilidad; no es auto-shove como AA.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-11', 'BTN', ['Jc', 'Td'], 40111, { teachBack: 'JTo BTN: open steal frecuente a 20 bb. Broadway offsuit en botón — roba ciegas sin shove.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-12', 'BTN', ['2c', '2d'], 40112, { trapTag: 'fancy_play', teachBack: '22 BTN ~20 bb: open min preferible a shove panic. Pareja baja quiere flop barato o robo; no commitees todo sin necesidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['Ah', 'Jh'], 40201, { teachBack: 'AJs vs steal BTN ~20 bb: 3-bet shove (all-in). Mano premium — no 3-bet pequeño que te deja en calle sin salida.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['Ts', '6c'], 40202, { trapTag: 'dominated', teachBack: 'T6o BB: fold. No overdefiendas las ciegas con basura — en torneo corto un error elimina.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJo vs steal SB ~20 bb: call o 3-bet shove según mezcla; no es auto-shove pero sí defiende. Fold sería demasiado tight.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '8d'], 40204, { teachBack: 'A8s vs steal BTN: 3-bet shove de presión/farol frecuente. Blocker de as — castiga opens wide sin min-3bet.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['9d', '7h'], 40205, { trapTag: 'fancy_play', teachBack: '97o: fold típico vs steal. Dominada, OOP y stack corto — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['Jh', 'Jc'], 40206, { teachBack: 'JJ vs steal SB ~20 bb: 3-bet shove por valor. Par medio fuerte — shove, no 3-bet pequeño.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-07', 'BB_vs_BTN', ['Ad', 'Kd'], 40207, { teachBack: 'AKs vs steal BTN: 3-bet shove value claro. Par fuerte a 20 bb — quieres all-in o fold equity.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-08', 'BB_vs_BTN', ['Js', '9h'], 40208, { trapTag: 'dominated', teachBack: 'J9o vs steal BTN: fold frecuente. Dominada y OOP — no overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-09', 'BB_vs_SB', ['Ah', 'Js'], 40209, { teachBack: 'AJo vs steal SB: 3-bet shove o continue sólido. Ax fuerte en spot corto.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-10', 'BB_vs_BTN', ['8d', '6d'], 40210, { teachBack: '86s vs steal BTN: call selectivo posible; no es auto-shove. Jugabilidad si el precio es bueno.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-11', 'BB_vs_BTN', ['Kd', 'Kh'], 40211, { teachBack: 'KK vs steal: 3-bet shove value. Quieres máximo valor o stack-off favorable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-12', 'BB_vs_SB', ['Jd', '8c'], 40212, { trapTag: 'fancy_play', teachBack: 'J8o vs steal SB: fold. No hero-defiendas basura en Spin.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 7).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 7));
    /* Spins 3-max: BTN actúa primero. No existe «SB limpea, hero BTN».
     * Iso válido: BB vs limp SB (BTN fold), o SB vs limp BTN. */
    if (kind === 'SPIN_ISO') return [
      bb('s04-01', ['Ah', 'Js'], 40401, { teachBack: 'AJo en BB vs limp de SB: iso (aislar). En Spin 3-max el BTN actúa primero; si ya foldó y el SB limpea, tú en BB aíslas con manos fuertes. Quieres heads-up con iniciativa, no check eterno con value.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-02', ['Jd', '3h'], 40402, { trapTag: 'dominated', teachBack: 'J3o vs limp SB: check (opción gratis). No overiso con basura: ya estás en el bote. A stack corto aislar trash duele entero el torneo.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQo en SB vs limp de BTN: iso por valor. En 3-max el BTN puede limpear primero; desde SB castigas el limp con manos fuertes — heads-up con iniciativa, no limpear detrás.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-04', ['Jh', '8d'], 40404, { trapTag: 'fancy_play', teachBack: 'J8o vs limp SB: check frecuente. No aísles manos frágiles que no mejoran bien postflop. Si no merecería open sin limp, tampoco merece iso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-05', ['7h', '7d'], 40405, { teachBack: '77 BB vs limp SB: iso claro. Par medio fuerte — aísla y cobra a limps wide.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-06', ['Jh', 'Td'], 40406, { teachBack: 'JTo vs limp SB: a menudo check. Offsuit marginal — no overiso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-07', 'SB', 'BTN', ['Td', 'Th'], 40407, { teachBack: 'TT en SB vs limp BTN: iso value. Premium — quieres heads-up con iniciativa.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-08', ['5c', '4d'], 40408, { trapTag: 'dominated', teachBack: '54o vs limp SB: check. No aísles conectores offsuit basura a stack corto.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-09', ['Ac', '9c'], 40409, { teachBack: 'A9s BB vs limp SB: iso razonable. Ax suited castiga limps y juega bien postflop.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-10', ['Td', '9c'], 40410, { trapTag: 'fancy_play', teachBack: 'T9o vs limp SB: check frecuente. Frágil offsuit — no mereces iso automático.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-11', 'SB', 'BTN', ['Ts', 'Ts'], 40411, { teachBack: 'TT en SB vs limp BTN: iso value. Par fuerte — aísla y construye bote.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-12', ['Td', '8d'], 40412, { teachBack: 'T8s BB vs limp SB: iso selectivo OK. Conectores suited con plan; sizing ~3–4 bb, no shove.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs con ~12 bb en BTN: shove (all-in) candidato. A esta profundidad un open pequeño suele ser peor que ir all-in o fold: ganas fold equity o vas a doblar con equity decente si te pagan.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['Kd', '6s'], 40502, { trapTag: 'dominated', teachBack: 'K6o a ~12 bb: fold. No hagas panic shove (all-in por desesperación): no tienes fold equity real ni equity cuando te pagan. Espera un spot con historia.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJo SB ~10 bb: shove frecuente. Stack corto + ciegas ya en juego = zona push/fold. No abras min «como cash»; o all-in o fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['Jh', 'Jc'], 40504, { teachBack: 'JJ a 10–12 bb: shove por valor claro. Par medio fuerte en push/fold — quieres doblar o robar ciegas, no open min que te deja mal stacked ante un 3-bet.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-05', 'BTN', ['Ks', 'Qs'], 40505, { teachBack: 'KQs ~12 bb: shove value. Premium — no min-raise en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-06', 'SB', ['9h', '7d'], 40506, { trapTag: 'fancy_play', teachBack: '97o SB ~10 bb: fold. No panic shove con basura OOP.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-07', 'BTN', ['Ad', '7d'], 40507, { teachBack: 'A7s BTN ~10–12 bb: shove frecuente. Ax suited con fold equity en push/fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-08', 'BTN', ['Jh', 'Td'], 40508, { teachBack: 'JTo BTN ~12 bb: shove o fold según chart; a menudo shove desde botón corto.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-09', 'SB', ['Qs', '7h'], 40509, { trapTag: 'dominated', teachBack: 'Q7o SB corto: fold. Sin equity ni fold equity real.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-10', 'BTN', ['Ah', 'Qd'], 40510, { teachBack: 'AQo ~10 bb: shove value claro. Par fuerte — all-in, no open min.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-11', 'SB', ['Kh', 'Th'], 40511, { teachBack: 'KTs SB ~10 bb: shove frecuente. Broadway suited en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-12', 'BTN', ['9s', '8s'], 40512, { teachBack: '98s BTN ~12 bb: shove candidato wide desde botón. Conector suited con fold equity.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-13', 'BTN', ['2h', '2d'], 40513, { teachBack: '22 BTN ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas desde botón.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-14', 'SB', ['Ad', '9c'], 40514, { teachBack: 'A9o SB ~10 bb: shove frecuente. Ax offsuit entra en muchos charts SB cortos.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'SPIN_EXAM_M1') return packSpots('SPIN_ISO', D).slice(0, 6).concat(packSpots('SPIN_SHOVE', D).slice(0, 8));
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo en BTN early (~40 bb): open cash-like claro. Estás en late con una broadway fuerte; quieres robar o jugar un pot manejable, no limpear ni ir all-in sin necesidad.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['9s', '6c'], 50102, { trapTag: 'dominated', teachBack: '96o UTG early: fold. Hay mucha gente detrás y la mano se domina fácil; early pide paciencia, no forzar basura desde early position.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO early: open estándar. Buena broadway suited en late-ish; construyes stack con iniciativa sin spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['Qs', 'Jh'], 50104, { trapTag: 'dominated', teachBack: 'QJo: fold siempre aquí. Sin equity real ni jugabilidad; abrirlo early es spew puro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['7s', '7c'], 50105, { teachBack: '77 BTN early: open claro. Par medio fuerte en posición — quieres robar ciegas o ver flop barato con iniciativa, no limpear.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['7s', '6s'], 50106, { trapTag: 'fancy_play', teachBack: '76s HJ early: a menudo fold — no spew. Ax offsuit bajo en middle early no merece open automático.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-07', 'CO', ['Qs', 'Qh'], 50107, { teachBack: 'QQ CO early: open claro. Premium — construyes stack con valor e iniciativa.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-08', 'UTG', ['Jh', 'Td'], 50108, { trapTag: 'dominated', teachBack: 'JTo UTG early: fold típico. Demasiada gente detrás para esta broadway offsuit.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-09', 'BTN', ['9c', '7c'], 50109, { teachBack: '97s BTN early: open razonable. Conectores suited en posición — cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-10', 'HJ', ['As', 'Kd'], 50110, { teachBack: 'AKo HJ early: open value. Par fuerte — no limpees ni juegues raro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-11', 'CO', ['Td', '9c'], 50111, { trapTag: 'fancy_play', teachBack: 'T9o CO early: a menudo fold. Offsuit frágil mid-late early — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-12', 'BTN', ['Ts', '9s'], 50112, { teachBack: 'T9s BTN early: open claro. Conectores suited en botón — open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 12);
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Qd', 'Tc'], 50401, { teachBack: 'QTo BTN mid (~25 bb): steal razonable. Late position + ante: open para robar ciegas sin shove aún.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['Qc', '2h'], 50402, { trapTag: 'dominated', teachBack: 'Q2o: fold. Ni en mid stealees basura total — si te 3-betean estás perdido.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '3s'], 50403, { teachBack: 'A3s CO mid: steal/open OK. Ax suited con plan si te 3-betean.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB mid: open/steal frecuente. Tight-er que BTN pero esta mano entra.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico. No stealees basura mid desde CO.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['7h', '6h'], 50406, { teachBack: '76s BTN mid: steal con jugabilidad. Conectores suited — open, no shove aún a 25 bb.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-07', 'BTN', ['As', 'Jd'], 50407, { teachBack: 'AJo BTN mid: steal claro. Broadway en botón con ante — open estándar.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-08', 'SB', ['Td', '3s'], 50408, { trapTag: 'dominated', teachBack: 'T3o SB mid: fold. OOP y basura — no robés.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-09', 'CO', ['Td', 'Tc'], 50409, { teachBack: 'TT CO mid: open/steal value. Par medio — quieres iniciativa.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-10', 'BTN', ['Qd', '9c'], 50410, { teachBack: 'Q9o BTN mid: steal frecuente. En botón mid se abre más wide.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-11', 'SB', ['Kh', 'Js'], 50411, { teachBack: 'KJo SB mid: open steal razonable. Broadway offsuit; plan si BB 3-betea.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-12', 'CO', ['5h', '4d'], 50412, { trapTag: 'fancy_play', teachBack: '54o CO: fold. No stealees conectores offsuit basura mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['Jh', 'Jd'], 50501, { teachBack: 'JJ: 3-bet value vs steal mid. Premium — presión o valor claro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente vs steal BTN. Blocker de as.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['Th', '7c'], 50503, { trapTag: 'dominated', teachBack: 'T7o: fold. No overdefend ni 3-bet spew.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold vs steal a menos que el chart diga call mixto raro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-05', 'BB_vs_BTN', ['Ts', 'Tc'], 50505, { teachBack: 'TT vs steal: 3-bet value. Par fuerte mid — construye bote o aísla.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-06', 'BB_vs_SB', ['Kh', 'Js'], 50506, { teachBack: 'KJo vs SB steal: defensa/3-bet razonable. Broadway offsuit.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-07', 'BB_vs_BTN', ['9c', '5h'], 50507, { trapTag: 'dominated', teachBack: '95o vs steal: fold. Dominada y OOP.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-08', 'BB_vs_CO', ['Ah', '4h'], 50508, { teachBack: 'A4s vs CO: 3-bet polar frecuente. Castiga opens mid con blockers.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-09', 'BB_vs_BTN', ['7h', '7d'], 50509, { teachBack: '77 vs steal BTN: 3-bet o call sólido. Par medio — no fold automático.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-10', 'BB_vs_BTN', ['Jc', 'Tc'], 50510, { teachBack: 'JTs vs steal: call o 3-bet ligero. Conectores altos suited se defienden bien.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-11', 'BB_vs_SB', ['Ad', 'Kd'], 50511, { teachBack: 'AKs vs steal SB: 3-bet value. Quieres máximo valor.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-12', 'BB_vs_CO', ['Ks', '7d'], 50512, { trapTag: 'fancy_play', teachBack: 'K7o vs CO: fold típico. No 3-bet spew mid con offsuit frágil.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 7).concat(packSpots('MTT_3BET', D).slice(0, 7));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '2h'], 50901, { teachBack: 'A2s BTN a ~10–12 bb: shove candidato. Zona push/fold — no open min.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['Jc', '8d'], 50902, { trapTag: 'dominated', teachBack: 'J8o: fold. No panic shove sin equity ni fold equity.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente. Push/fold limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['Jh', 'Jc'], 50904, { teachBack: 'JJ: shove value. Par medio fuerte en short/push.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-05', 'BTN', ['Ah', 'Jh'], 50905, { teachBack: 'AJs ~12 bb: shove value. Premium — all-in, no min-raise.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-06', 'SB', ['Qh', '6s'], 50906, { trapTag: 'fancy_play', teachBack: 'Q6o SB corto: fold. No shove basura OOP.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-07', 'BTN', ['Jh', 'Td'], 50907, { teachBack: 'JTo BTN ~10–12 bb: shove frecuente desde botón.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-08', 'CO', ['Th', '5c'], 50908, { trapTag: 'dominated', teachBack: 'T5o CO: fold. Early-ish short tampoco justifica basura.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-09', 'SB', ['7s', '6s'], 50909, { teachBack: '76s SB ~10 bb: shove frecuente. Conectores suited en push/fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-10', 'BTN', ['Ks', 'Qs'], 50910, { teachBack: 'KQs ~10 bb: shove value. Par fuerte — stack-off limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-11', 'CO', ['Kh', 'Js'], 50911, { teachBack: 'KJo CO ~12 bb: shove candidato. Broadway offsuit short.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-12', 'BTN', ['9s', '8s'], 50912, { teachBack: '98s BTN ~10 bb: shove wide desde botón. Fold equity + jugabilidad.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-13', 'SB', ['2c', '2d'], 50913, { teachBack: '22 SB ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas SB.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-14', 'BTN', ['Ad', '9c'], 50914, { teachBack: 'A9o BTN ~12 bb: shove frecuente. Ax offsuit en botón corto entra en charts.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) })
    ];
    return [];
  }
  function resolveSpots(lesson, D) {
    if (typeof lesson.spots === 'string') lesson.spots = packSpots(lesson.spots, D);
    if (Array.isArray(lesson.spots) && lesson.spots.length) lesson.hands = lesson.spots.length;
    return lesson;
  }

  if (D.setRouteStatus) {
    D.setRouteStatus('spin', 'active');
  }
  var RAW = [
    {
      "route": "spin",
      "module": "M0",
      "order": 0,
      "plan": "free",
      "xp": 40,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Pagas una entrada (buy-in) en dinero real y la sala te reparte fichas de torneo: en mesa nunca juegas «euros», solo fichas. Un Spin & Go es un torneo de tres jugadores (3-max); el premio total se sortea al inicio (2×, 3× o 5× las entradas). Por eso no es cash: sobrevivir y quedar bien posicionado vale más que acumular fichas sin plan.",
      "theory": [
        "Spin & Go (o «Spin»): torneo muy corto de 3 jugadores. Pagas una entrada fija (por ejemplo 10 €) y recibes un stack de fichas con ciegas (apuestas obligatorias cada mano). Igual que en un MTT normal: las fichas son moneda del torneo, no se cambian 1 a 1 por dinero en la mesa.",
        "Buy-in (entrada): lo que pagas para registrarte. Las tres entradas forman un prize pool (bote de premios). Antes de repartir cartas, una ruleta decide el multiplicador: 2×, 3× o 5×. Con entradas de 10 € y 3× hay 30 € en juego para repartir según 1.º, 2.º y 3.º — no según «cuántas fichas te quedan» convertidas a euros.",
        "Fichas y ciegas: la ciega pequeña (SB) y la ciega grande (BB) suben cada cierto tiempo (levels). Medir tu stack en bb (ciegas grandes) ayuda: «tengo 20 bb» = tu stack ÷ BB. En spins empiezas corto (a menudo 15–25 bb), así que cada mano pesa más que en cash a 100 bb.",
        "ICM (modelo de fichas vs dinero): en torneo, doblar fichas no siempre duplica tu premio esperado en €. Cuanto más cerca estás de cobrar (top 2 o ganar), más caro es arriesgar todo en un flip (cara a cara). A veces fold es correcto aunque «en fichas» el call parezca rentable — lo profundizamos en S-02 y M2.",
        "Mapa mental antes de practicar (S-01 en adelante): ¿estoy robando ciegas (steal = abrir para que todos tiren)? ¿Defendiendo BB o SB? ¿En zona push/fold (solo shove o fold)? Si vienes del cash, olvida «cada ficha vale X céntimos»: piensa supervivencia + payout, no pot de cash."
      ],
      "examples": [
        {
          "title": "Entrada ≠ fichas en mesa",
          "body": "Entras por 5 € y te dan 500 fichas con ciegas 10/20. Tienes 25 bb (500 ÷ 20). Nadie te paga 5 € por tus 500 fichas: solo sirven para ganar posición y llevarte el premio del torneo."
        },
        {
          "title": "Payout 3× en números",
          "body": "Tres jugadores entran a 10 €. Sale 3× → 30 € en premios. El 1.º se lleva la mayor parte; el 2.º una fracción; el 3.º no cobra. Eliminar a un rival te acerca a dinero real, no solo a tener más fichas sin eliminar a nadie."
        },
        {
          "title": "Por qué no es cash",
          "body": "En cash 6-max puedes levantarte y cambiar fichas por dinero. En un Spin no: o ganas el torneo (o quedas 2.º) o pierdes la entrada. Las decisiones miden riesgo de eliminación, no solo EV (valor esperado) de fichas aisladas."
        }
      ],
      "aiQuestions": [
        "¿Por qué mis fichas no valen lo mismo que euros en un Spin?",
        "¿Qué significa payout 2×, 3× o 5× con un ejemplo?",
        "¿En qué se diferencia jugar un Spin del cash 6-max?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-00",
      "title": "Anatomía de un Spin"
    },
    {
      "route": "spin",
      "module": "M0",
      "order": 1,
      "plan": "free",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Con 20–25 bb (ciegas grandes), desde BTN o SB robas ciegas (steal) con dos tamaños: shove (all-in) con manos fuertes y open ~2,5 bb con manos medias del rango GTO — no todo es min-raise.",
      "theory": [
        "Steal (robo de ciegas): open-raise esperando que todos folden. A 20–25 bb las ciegas son un % grande del stack; fold equity vale mucho.",
        "Dos tamaños a ~20 bb: premium y pares medios fuertes (99+, ATo+, KQs) suelen ir shove; suited connectors y broadways medias van open ~2,5 bb (3 bb desde SB).",
        "BTN vs SB: desde BTN robas más wide porque solo quedan SB y BB detrás. Desde SB abres más tight y con menos shoves marginales — si te pagan, juegas OOP.",
        "Trampa clásica: min-open con JJ/TT a 20 bb o pagar un 3-bet shove con basura — en Spin perder el stack suele ser perder el torneo."
      ],
      "examples": [
        {
          "title": "Steal desde BTN",
          "body": "BTN con 22 bb y 99: shove all-in (fold equity + valor). Con 87s: open a ~2,5 bb — roba ciegas sin commitear todo el stack."
        },
        {
          "title": "SB más tight que BTN",
          "body": "Misma mano Q8o: open desde BTN a veces OK; desde SB a menudo fold porque el BB aún actúa y tú quedarás OOP si te pagan."
        }
      ],
      "aiQuestions": [
        "¿Por qué robo más ciegas a 20 bb que a 100 bb en cash?",
        "¿Qué hago si me 3-betean shove tras mi steal?"
      ],
      "spots": "SPIN_RFI_STEAL",
      "exam": false,
      "id": "S-01",
      "title": "Open steal BTN/SB 20–25 bb"
    },
    {
      "route": "spin",
      "module": "M0",
      "order": 2,
      "plan": "free",
      "xp": 110,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Cuando BTN o SB abren corto (steal), desde la ciega grande (BB) eliges fold, hacer call o 3-bet — a veces shove (all-in). En torneo corto un error cuesta la entrada entera, no solo un pot.",
      "theory": [
        "Defensa de ciegas: el rival intenta robarte SB+BB. Tú puedes fold (tirar), call (igualar para ver flop) o 3-bet (resubir). A 20–25 bb el 3-bet shove es frecuente: o vas all-in o fold — pocos flats.",
        "Vs steal wide del BTN defiendes más selectivo que en cash 100 bb: manos dominadas (K9o vs range fuerte) y basura foldean. Value (TT+, AQo+) y algunos 3-bet de presión (A5s) entran en el plan.",
        "ICM reminder (S-00): pagar light «porque tengo outs» puede ser +EV en fichas pero −EV en € si quedas fuera. En M0 prioriza no overdefender; en M2 afinamos calls vs shove.",
        "Trampa: overdefend (pagar demasiadas manos) o nunca 3-betear cuando el spot pide presión — regalas ciegas gratis al steal."
      ],
      "examples": [
        {
          "title": "3-bet shove vs steal",
          "body": "BTN abre steal a 20 bb, tú BB con JJ: 3-bet shove suele ser mejor que call — maximizas fold equity o vas all-in con mano premium."
        },
        {
          "title": "Fold correcto",
          "body": "BTN steal, tú BB con T8o: fold típico. Dominada, OOP y stack corto — no es spot para hero-call."
        }
      ],
      "aiQuestions": [
        "¿Cuándo defiendo BB con call vs 3-bet shove en un Spin?",
        "¿Qué es overdefender en ciegas?"
      ],
      "spots": "SPIN_VS_STEAL",
      "exam": false,
      "id": "S-02",
      "title": "Defensa ciega vs steal"
    },
    {
      "route": "spin",
      "module": "M0",
      "order": 3,
      "plan": "free",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Repaso M0 sin vocabulario nuevo: anatomía del Spin (fichas ≠ euros), steal desde BTN/SB a ~20 bb y defensa desde BB. Aplica el checklist con calma antes de cada clic.",
      "theory": [
        {
          "title": "Identifica el spot",
          "body": "El examen mezcla dos trabajos mentales que ya viste. O estás robando ciegas (steal: abres tú para que SB y BB se tiren) o estás defendiendo la ciega grande cuando te abren. Antes de actuar, nombra en voz baja qué spot es: no uses el mismo rango mental para ambos."
        },
        {
          "title": "Stack en bb, no en cash",
          "body": "Mide el stack en ciegas grandes (bb). A ~20 bb los opens y los 3-bets son más agresivos que en cash a 100 bb: hay más fold equity (probabilidad de que el rival se tire) y menos margen para jugar postflop cómodo. Si piensas «como en cash», te vas a quedar corto de plan."
        },
        {
          "title": "Acción limpia",
          "body": "Las respuestas típicas son fold, open (subir primero) o 3-bet — a menudo shove (all-in). Recuerda: en un Spin perder el stack suele ser perder el torneo. No inventes min-raises raros ni hero-calls «porque puedo ganar»."
        },
        {
          "title": "Checklist rápido",
          "body": "Orden mental: posición → stack en bb → ¿busco fold equity o valor? → ejecuta sin spew (tirar fichas sin plan). Si dudas entre una jugada fancy y la jugada simple del chart, elige la simple."
        }
      ],
      "examples": [
        {
          "title": "Antes de clicar",
          "body": "Lee posición y stack antes de la mano. «BTN 22 bb, folds a ti» pide un rango de steal; «BB 20 bb vs steal BTN» pide defensa selectiva. Misma profundidad, distinto trabajo."
        },
        {
          "title": "Error típico del examen",
          "body": "Min-open con TT o JJ a 20 bb «como en cash», o hacer call light desde BB con basura dominada. En M0 Spins, premium corto suele ir shove; basura se tira."
        },
        {
          "title": "Una frase para aprobar",
          "body": "Si eres el primero en entrar a ~20 bb, piensa steal (shove o open ~2,5 bb). Si te abren en BB, piensa fold / hacer call / 3-bet shove — no overdefiendas."
        }
      ],
      "aiQuestions": [
        "Repásame steal vs defensa BB en 20 bb",
        "¿Qué errores evitar en el examen M0 Spins?"
      ],
      "spots": "SPIN_EXAM_M0",
      "exam": true,
      "id": "S-03",
      "title": "Examen M0 · Spins"
    },
    {
      "route": "spin",
      "module": "M1",
      "order": 4,
      "plan": "study",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "En Spin 3-max el BTN actúa primero: el limp llega desde BTN (y a veces SB detrás) o desde SB si el BTN ya foldó. Aíslas desde SB o BB con un iso-raise: heads-up con manos fuertes. A stack corto no overiso con basura ni limpeas tú sin plan.",
      "theory": [
        {
          "title": "Qué es limpear e iso",
          "body": "Limpear es igualar la BB para ver flop barato, sin iniciativa. Iso (aislar) es subir por encima del limp para que, idealmente, solo el limper pague y tú lleves la iniciativa heads-up. Castigas el limp recreativo y evitas el pot multiway (varios jugadores) fuera de posición."
        },
        {
          "title": "Orden en Spin 3-max",
          "body": "BTN → SB → BB. El SB no puede limpear «antes» del BTN. Spots reales: BTN limpea y tú iso desde SB; o BTN folda, SB limpea y tú en BB eliges check o iso. No inventes un limp del SB con héroe en BTN: ese spot no existe."
        },
        {
          "title": "Sizing y profundidad",
          "body": "El iso debe ser lo bastante grande para aislar, pero a 15–20 bb no metas el stack entero «sin querer». Buscas un pot manejable con una mano que domina rangos de limp wide (Ax suited, broadways, pares medios+). Si el sizing te deja committed con basura, el plan ya falló preflop."
        },
        {
          "title": "Qué manos iso (y cuáles no)",
          "body": "Iso con manos que quieres heads-up con ventaja: AJs, KQs, 99+, broadways fuertes. Desde BB con basura (93o, J7o): check, no aísles «porque limpearon». Overiso trash te deja multiway dominado o pagando un shove sin equity real."
        },
        {
          "title": "Trampa: limpear tú detrás",
          "body": "Limpear detrás de un limp a stack corto suele regalar ciegas o meterte multiway OOP (fuera de posición). Si la mano no merece iso, fold (desde SB) o check (desde BB). Open/iso o tirar — no «ver barato» sin plan en un Spin."
        }
      ],
      "examples": [
        {
          "title": "Iso clásico desde BB",
          "body": "BTN folda, SB limpea, tú BB con AJs a ~20 bb: iso a ~3–4 bb. Quieres heads-up contra un rango de limp débil, con iniciativa y una mano que domina muchas de sus combinaciones."
        },
        {
          "title": "Check correcto vs limp",
          "body": "BB con 83o vs limp SB: check. No hay valor en aislar: no dominas nada y ya estás en el bote con opción gratis."
        },
        {
          "title": "KQs desde SB vs limp BTN",
          "body": "BTN limpea corto y tú SB con KQs: iso por valor. Mano fuerte, quieres bote heads-up con iniciativa — no hacer call flat detrás del limp."
        }
      ],
      "aiQuestions": [
        "¿Qué manos iso desde BB vs limp de SB en Spin?",
        "¿Por qué no limpear yo en stacks cortos?"
      ],
      "spots": "SPIN_ISO",
      "exam": false,
      "id": "S-04",
      "title": "Iso y open vs limps cortos"
    },
    {
      "route": "spin",
      "module": "M1",
      "order": 5,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Con stacks cortos (~10–15 bb), el 3-bet correcto suele ser shove (all-in), no una resubida pequeña que te deja en calle sin stack útil. Flat (hacer call al open) casi no existe aquí.",
      "theory": [
        {
          "title": "Umbral de stack-off",
          "body": "Por debajo de ~15–20 bb (según el spot), un 3-bet pequeño te deja con poquísimas bb detrás y decisiones imposibles en turn/river. El 3-bet shove es más limpio: o doblas, o el rival se tira, o vas all-in con un plan cerrado preflop."
        },
        {
          "title": "Shove value y farol",
          "body": "Shove por valor con Ax fuerte, pares medios+ y premiums. Algunos Ax suited (con blockers: cartas que restan combinaciones fuertes al rival) entran como shove de presión. Flat — hacer call al open para ver flop barato — solo tiene sentido con manos que realmente quieren flop barato; a esta profundidad casi no las hay."
        },
        {
          "title": "Open shove y push/fold",
          "body": "Desde BTN/SB a ~10 bb entras en zona push/fold (lo profundizamos en S-09): no min-raisees «como en cash». Un open min a 10 bb suele ser leak: poco fold equity y mal committed si te 3-betean."
        },
        {
          "title": "Trampas a evitar",
          "body": "3-bet pequeño spew (fichas sin plan) o flat dominado vs open short: te quedas con 5 bb OOP y sin fold equity. Si no es shove claro ni fold claro, no inventes el medio."
        }
      ],
      "examples": [
        {
          "title": "3-bet shove vs open",
          "body": "Alguien abre a 12 bb y tú BTN con 99: shove suele ser mejor que 3-bet a 3 bb. Quieres doblar limpio o que folden; no quieres un pot extraño con stack residual inútil."
        },
        {
          "title": "No flat dominado",
          "body": "Steal a 14 bb, tú BB con K9o: fold o, como mucho, shove muy selectivo según el rival. Hacer call OOP con mano dominada rara vez es correcto a esta profundidad."
        },
        {
          "title": "Premium = all-in",
          "body": "BB vs steal SB con TT a 15 bb: 3-bet shove. Un 3-bet pequeño deja al rival hacer call wide y a ti jugando un stack corto sin salida clara."
        }
      ],
      "aiQuestions": [
        "¿Cuándo 3-bet shove en lugar de 3-bet pequeño?",
        "¿Qué es flat en preflop?"
      ],
      "spots": "SPIN_SHOVE",
      "exam": false,
      "id": "S-05",
      "title": "3-bet shove vs flat"
    },
    {
      "route": "spin",
      "module": "M1",
      "order": 6,
      "plan": "study",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Chip lead (más fichas que los rivales): puedes presionar ciegas y opens flojos, pero no pagues shoves light solo porque «tengo más fichas». Recuerda fichas ≠ euros (ICM).",
      "theory": [
        {
          "title": "Cover vs short",
          "body": "Si eres el stack más grande (cover), aplicas presión: steals, iso, 3-bets. Quieres robar ciegas o poner al short en decisiones difíciles. El lead te da fold equity extra porque el rival arriesga su torneo al pegarte."
        },
        {
          "title": "No suicides el lead",
          "body": "Hacer call shove light vs short «porque soy favorito en equity» puede ser ICM suicide: pierdes el torneo y el 2.º puesto no paga igual que el 1.º. Chip EV (valor solo en fichas) no es lo mismo que € esperados según el payout."
        },
        {
          "title": "Objetivo con cover",
          "body": "Acumula fichas sin regalar dobles fáciles. Presiona spots donde el short folda mucho; foldea cuando su shove representa value claro. El lead se usa para robar, no para hero-call por orgullo."
        },
        {
          "title": "Trampa mental",
          "body": "Confundir «tengo más fichas» con «debo pagar todo» es el leak clásico del chip leader en Spins. El payout manda: a veces fold con cover es la jugada profesional."
        }
      ],
      "examples": [
        {
          "title": "Presión con cover",
          "body": "Short tiene 8 bb, tú 25 bb en BTN: steal wide. El short no puede defenderte todas las manos; muchas veces te regala las ciegas sin showdown."
        },
        {
          "title": "Fold con cover",
          "body": "Short shove 10 bb desde SB, tú BB cover con A9o cerca del dinero: a menudo fold es correcto. Eliminarlo es bonito en fichas, pero bustarte a ti mismo cuesta el premio."
        },
        {
          "title": "Cuándo sí pagas",
          "body": "Short shove 7 bb y tú BB con JJ o TT: ahí sí haces call — equity alta y eliminar rival acerca al 1.º. No es light; es value claro."
        }
      ],
      "aiQuestions": [
        "¿Cómo uso el chip lead sin spew?",
        "¿Qué es ICM suicide?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-06",
      "title": "Chip lead vs short"
    },
    {
      "route": "spin",
      "module": "M1",
      "order": 7,
      "plan": "study",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Short stack (pocas bb): necesitas fichas para llegar al payout, pero no cualquier all-in. Elige double-up (doblar) claros con fold equity o equity decente; evita panic shove.",
      "theory": [
        {
          "title": "Short vs cover",
          "body": "El rival tiene más fichas y puede eliminarte. Tu shove debe ser selectivo: manos que foldan a menudo (fold equity) o que van razonablemente bien cuando te pagan. No eres un cash game a 100 bb — cada all-in decide el torneo."
        },
        {
          "title": "Sobrevive y elige spots",
          "body": "A veces fold es correcto aunque «necesites fichas». Perder todo en un flip malo = 0 €. Survive + pick spots: esperas un shove con historia (posición, fold equity, mano decent) en lugar de tirarte con basura por ansiedad."
        },
        {
          "title": "Fold equity del short",
          "body": "Si shoveas y todos folden, ganas el bote sin showdown — vital cuando eres short. Por eso BTN/SB a 8–12 bb shovean más wide que en early: las ciegas ya están en juego y el fold equity paga."
        },
        {
          "title": "Trampa: panic shove",
          "body": "Panic shove con basura vs un cover que paga wide te elimina sin EV real. Si la mano no tiene fold equity ni equity, fold y espera el siguiente spot — aunque duela el reloj de ciegas."
        }
      ],
      "examples": [
        {
          "title": "Shove con fold equity",
          "body": "10 bb en BTN, folds hasta ti: shove A5s. Si folden, ganas ciegas; si te pagan, aún tienes equity y blockers. Es un double-up candidato, no desesperación."
        },
        {
          "title": "Fold para sobrevivir",
          "body": "8 bb en BB, cover shove desde SB: fold 65o aunque «necesites fichas». Estás dominado, sin fold equity (él ya está all-in) y el call es solo orgullo."
        },
        {
          "title": "No min-raise short",
          "body": "Con 9 bb en SB no abras a 2 bb «por ver». Push/fold: shove manos del chart o fold. El open min te deja sin plan si hacen call o te resuben."
        }
      ],
      "aiQuestions": [
        "¿Cuándo shovea el short stack?",
        "¿Qué es double-up en un Spin?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-07",
      "title": "Short vs cover"
    },
    {
      "route": "spin",
      "module": "M1",
      "order": 8,
      "plan": "study",
      "xp": 130,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Repaso M1: iso vs limp, 3-bet shove, chip lead y short vs cover. Examen = mezcla de esos spots sin teoría nueva. Más decisiones binarias (shove/fold) que en M0.",
      "theory": [
        {
          "title": "¿Hay limp en mesa?",
          "body": "Si alguien limpea, iso con manos fuertes y fold basura. No regales pot multiway ni overiso trash. La pregunta útil es si quieres heads-up con esa mano, no si «puedes ver flop» barato."
        },
        {
          "title": "¿Te abren en zona corta?",
          "body": "A ~10–15 bb responde con 3-bet shove o fold. Evita el 3-bet pequeño que te deja sin stack útil. Flat (hacer call) dominado OOP es trampa de examen."
        },
        {
          "title": "¿Eres cover o short?",
          "body": "Cover: presiona steals e iso; no hero-call shoves light. Short: elige shoves con fold equity o equity, no panic. El rol (quién tiene más fichas) cambia el plan aunque la mano sea la misma."
        },
        {
          "title": "Antes de actuar",
          "body": "Anota mentalmente: stack en bb + posición + rol (steal / defensa / iso / push) + ¿cover o short? Luego ejecuta. Si no puedes nombrar el rol en una frase, párate un segundo."
        }
      ],
      "examples": [
        {
          "title": "Checklist del examen",
          "body": "Lee stack y si hay limp u open antes de clicar. M1 Spins premia acciones binarias claras: iso o fold, shove o fold — menos «inventar» que en cash profundo."
        },
        {
          "title": "Misma mano, distinto rol",
          "body": "A9o: como cover vs short shove cerca del dinero a menudo fold; como short en BTN a 10 bb a menudo shove. El examen mira si leíste el contexto, no solo las cartas."
        },
        {
          "title": "Error M1 típico",
          "body": "Iso con Q8o «porque limp», o 3-bet a 2,5× con 99 a 12 bb. Ambos son leaks que M1 castiga: basura no se aísla; corto se shovea o se tira."
        }
      ],
      "aiQuestions": [
        "Repásame iso y 3-bet shove en Spins",
        "¿Cover o short — cómo cambia mi plan?"
      ],
      "spots": "SPIN_EXAM_M1",
      "exam": true,
      "id": "S-08",
      "title": "Examen M1 · Spins"
    },
    {
      "route": "spin",
      "module": "M2",
      "order": 9,
      "plan": "study",
      "xp": 140,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Entre 12 y 8 bb entras en push/fold: casi no hay open pequeño. Decides shove (all-in) o fold según charts de stack corto — el min-raise estilo cash es leak.",
      "theory": [
        {
          "title": "Qué es push/fold",
          "body": "Con stack muy corto, un min-raise deja poco fold equity y te commitea mal si te resuben. La regla práctica es binaria: all-in o fold. Shove = poner todas las fichas de una vez; no confundas con open a 2 bb."
        },
        {
          "title": "Posición en 3-max",
          "body": "BTN shovea más wide que las posiciones «tempranas» del Spin (quien habla primero). Desde BTN vs blinds el steal es el más loose; desde SB aún shoveas wide pero el BB defiende mejor. Usa el menú Rangos / charts push-fold como referencia."
        },
        {
          "title": "Por qué no min-raise a 10 bb",
          "body": "Open min a 10 bb «como cash» y fold al 3-bet: pierdes ciegas e iniciativa. Si la mano merece entrar, suele merecer shove; si no, fold. El medio te deja con 7–8 bb y sin plan."
        },
        {
          "title": "Trampa de zona gris",
          "body": "Manos medias offsuit en primera voz (equivalente UTG/HJ en 3-max) a menudo son fold aunque en BTN serían shove. Peor fold equity y peor precio cuando te pagan. No copies el chart de BTN a todas las sillas."
        }
      ],
      "examples": [
        {
          "title": "Push desde BTN",
          "body": "10 bb BTN, folds a ti: shove KTs. O robas las ciegas, o vas all-in con equity decente si hacen call. Open a 2 bb aquí suele ser peor."
        },
        {
          "title": "Fold en zona gris",
          "body": "9 bb first-in (no BTN): Q9o often fold. Tienes peor fold equity que en botón y muchas manos te dominan cuando te pagan."
        },
        {
          "title": "Par medio = shove value",
          "body": "99 a 10–12 bb en BTN: shove por valor claro. Quieres doblar o robar; no «ver flop barato» con un open min que te deja mal stacked."
        }
      ],
      "aiQuestions": [
        "¿Por qué no min-raise a 10 bb?",
        "¿Dónde veo charts push/fold en la app?"
      ],
      "spots": "SPIN_PUSH",
      "exam": false,
      "id": "S-09",
      "title": "Push/fold 12–8 bb"
    },
    {
      "route": "spin",
      "module": "M2",
      "order": 10,
      "plan": "study",
      "xp": 130,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cuando te shovean, el call correcto suele ser más tight que el «chip EV» (valor solo en fichas): el ICM castiga arriesgar tu torneo por un flip. Overfold vs shove suele ser correcto en Spins.",
      "theory": [
        {
          "title": "Chip EV vs ICM",
          "body": "Chip EV mira solo fichas ganadas o perdidas a largo plazo. ICM (Independent Chip Model) traduce stacks y payout (primero, segundo, tercero) a euros esperados. En Spins, un call que gana fichas en promedio puede perder € porque el bust te deja a cero."
        },
        {
          "title": "Qué manos hacen call",
          "body": "Haces call shove con manos fuertes: pares altos, Ax fuerte. Fold muchas manos medias que en cash a 100 bb pagarías (A9o, KQo marginal). Hero-call — pagar «porque puedo ganar» sin mirar el payout — es la trampa ICM."
        },
        {
          "title": "Short vs cover al shove",
          "body": "Vs shove del short a veces pagas un poco más wide: eliminarlo te da € y arriesgas menos de tu stack relativo. Vs shove del cover, más tight: te juegas el torneo entero contra un stack que te elimina."
        },
        {
          "title": "Regla práctica",
          "body": "Si dudas entre hacer call y fold cerca del dinero, inclínate a fold salvo que la mano sea claramente fuerte. En Spins el overfold vs shove no es «debilidad»: es disciplina de payout."
        }
      ],
      "examples": [
        {
          "title": "Fold ICM correcto",
          "body": "Cover te shovea, tú con 22 bb y AJo: a veces fold es mejor que flip. Quedarte vivo hacia el 2.º paga algo; bust = 0 € aunque fueras favorito en fichas."
        },
        {
          "title": "Call vs short",
          "body": "Short shove 7 bb, tú BB con 99: hacer call claro. Equity alta y eliminar rival acerca al 1.º — aquí chip EV e ICM apuntan al mismo lado."
        },
        {
          "title": "No hero-call",
          "body": "Shove desde BTN a 12 bb, tú BB con KTo: fold típico. Dominada, sin odds de payout claras — «puedo ganar» no es argumento ICM."
        }
      ],
      "aiQuestions": [
        "¿Chip EV vs ICM en un call shove?",
        "¿Qué es hero-call en torneo?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-10",
      "title": "Call shove ICM"
    },
    {
      "route": "spin",
      "module": "M2",
      "order": 11,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "A veces un call gana fichas en promedio (+EV chips) pero pierde dinero de torneo (−EV $). Aprende a oler esos spots antes de pagar: el pay jump decide.",
      "theory": [
        {
          "title": "+EV chips / −EV $",
          "body": "Ganas fichas a largo plazo pero reduces tu premio esperado en euros porque arriesgas eliminación cerca del dinero. El spot se ve «correcto» en equity de cartas y es incorrecto en payout. Spins viven de detectar esa trampa."
        },
        {
          "title": "Pay jump",
          "body": "Pay jump es el salto de premio entre puestos (segundo vs primero, o cobrar vs bust). Cuanto mayor el salto, más caro es flippear. En 3-max cada eliminación mueve € de verdad, no solo fichas de vanity."
        },
        {
          "title": "Prioriza supervivencia cuando pesa",
          "body": "Cuando el payout aprieta, fold manos que «van bien en fichas» pero no justifican el bust. No necesitas ser el favorito al 55 % si perder te saca del dinero grande."
        },
        {
          "title": "ICM suicide",
          "body": "ICM suicide: hacer call shove light porque «soy 55 % favorito» ignorando que bust = perder la entrada entera. No preguntes solo si ganas el flip; pregunta cuánto € arriesgas frente a cuánto ganas."
        }
      ],
      "examples": [
        {
          "title": "Spot +EV chips / −EV $",
          "body": "3-max, el 2.º ya tiene sentido de premio, tú mid-stack con 18 bb haces call al shove de cover con A8s: puede ser +chips y −€ si el bust te cuesta el segundo premio grande."
        },
        {
          "title": "Oler el mal spot",
          "body": "Si tu argumento para pagar es solo «tengo outs / soy ligero favorito» y no has mirado stacks ni multiplicador, párate. Ese olor suele ser −EV $ disfrazado de valentía."
        },
        {
          "title": "Cuándo sí está alineado",
          "body": "Short shove tiny, tú con TT+ o AK: chip EV e ICM suelen coincidir. El problema son los calls marginales (A9o, KQo, pares bajos) cerca del pay jump."
        }
      ],
      "aiQuestions": [
        "¿Cómo detecto un spot −EV en dinero?",
        "¿Qué es pay jump en un Spin 3-max?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-11",
      "title": "Malos spots +EV chips / −EV $"
    },
    {
      "route": "spin",
      "module": "M2",
      "order": 12,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Payout 5× (premio total cinco veces las entradas) aprieta más que 2×/3×: juegas más tight — el 1.º pesa mucho y perder el 2.º duele más. Misma mano, distinto multiplicador.",
      "theory": [
        {
          "title": "Multiplicador y € en juego",
          "body": "La ruleta del Spin (2× / 3× / 5×) cambia cuánto dinero hay en el prize pool. En 5× el 1.º se lleva una parte mayor: el ICM es más fuerte. Guarda ese dato mental desde la mano 1; no es decoración de lobby."
        },
        {
          "title": "Cómo ajustar",
          "body": "En 5×: menos steals locos, más tight vs shove, menos flips marginales. En 2×: algo más de chip EV permitido — aún no es cash, pero el castigo ICM es menor. El error caro es jugar igual el spin de 2× que el de 5×."
        },
        {
          "title": "Misma mano, distinto payout",
          "body": "AJo haciendo call a un shove puede ser razonable en 2× y fold en 5×. No cambian tus cartas: cambia el precio en euros de equivocarte. Entrena esa pregunta: «¿qué multiplicador salió?»."
        },
        {
          "title": "Trampa de lobby",
          "body": "Ignorar el multiplicador y repetir el mismo chart mental en todos los Spins es leak muy caro en lobbies reales. Mira la ruleta; luego elige tightness."
        }
      ],
      "examples": [
        {
          "title": "5× más tight",
          "body": "La ruleta mostró 5× antes de empezar: si dudas entre shove marginal y fold, inclínate a fold. Si dudas entre hacer call marginal y fold vs shove, fold otra vez."
        },
        {
          "title": "2× un poco más flexible",
          "body": "En 2× puedes robar y pagar un poco más wide que en 5×, pero sigue sin ser cash: bust = 0 €. Flexibilidad no es spew."
        },
        {
          "title": "Checklist pre-mano",
          "body": "Antes del primer steal del torneo: ¿2×, 3× o 5×? Ese número fija cuánto aprietas calls y shoves grises el resto de la mesa."
        }
      ],
      "aiQuestions": [
        "¿Cómo cambia mi juego en payout 5×?",
        "¿Dónde veo el multiplicador en la mesa?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-12",
      "title": "Ajuste 3× vs 5× payout"
    },
    {
      "route": "spin",
      "module": "M2",
      "order": 13,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen ICM Spins: push/fold, call shove, spots +EV chips vs −EV $ y ajuste por payout 2×/3×/5×. Sin teoría nueva — solo aplicar el checklist de M2.",
      "theory": [
        {
          "title": "Fichas o euros",
          "body": "Pregunta clave en cada spot: ¿decido mirando solo fichas (chip EV) o el premio en euros (ICM)? Si no puedes responder en una frase, no hagas call todavía."
        },
        {
          "title": "¿Stack ≤12 bb?",
          "body": "Entra push/fold: shove (all-in) o fold. No min-raise estilo cash. El examen castiga el open pequeño que te deja sin plan ante un 3-bet."
        },
        {
          "title": "¿Multiplicador?",
          "body": "2×/3× vs 5× cambia tightness en calls y steals marginales. En 5×, ante la duda, fold. El multiplicador no es opcional: es parte del spot."
        },
        {
          "title": "Checklist del examen",
          "body": "Stack en bb → rol cover/short → payout → fold / shove / hacer call. Nombra el rango rival en una frase antes de pagar un shove. Cero vocabulario nuevo: solo disciplina."
        }
      ],
      "examples": [
        {
          "title": "Antes del examen",
          "body": "Repasa S-09…S-12: push/fold limpio, overfold vs shove, oler −EV $, 5× más tight. Si esos cuatro bloques están claros, el examen es aplicación."
        },
        {
          "title": "Spot trampa del examen",
          "body": "Te shovean, tienes A9o, eres mid-stack, payout 5×: muchas veces fold aunque «en fichas» el call se vea decente. El examen mira si leíste ICM, no solo equity."
        },
        {
          "title": "Spot limpio",
          "body": "10 bb BTN first-in con ATs o 99: shove. No hay drama ICM que justifique min-raise. Binario y limpio."
        }
      ],
      "aiQuestions": [
        "Repásame ICM en Spins en 3 frases",
        "¿Cuándo fold aunque sea +EV en fichas?"
      ],
      "spots": [],
      "exam": true,
      "id": "S-13",
      "title": "Examen ICM · Spins"
    },
    {
      "route": "spin",
      "module": "M3",
      "order": 14,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Bubble factor (presión de «burbuja»): mide cuánto duele arriesgar fichas cerca de un salto de pago. En Spin 3-max el heads-up (HU) ya es un pay jump decisivo — no flippees barato el 2.º.",
      "theory": [
        {
          "title": "Qué es bubble en 3-max",
          "body": "Bubble es la zona donde un bust te deja sin € (o te baja de premio) mientras otro jugador cobra. En Spin 3-max, pasar de tercero a segundo o de segundo a primero ya es bubble mental: no hace falta mesa de 100 runners para sentir la presión."
        },
        {
          "title": "Pay jump heads-up",
          "body": "En heads-up (dos jugadores) el premio del primero frente al segundo puede repartir cerca de 70/30 según multiplicador. No es indiferente flippear: un 50/50 en fichas puede ser un mal negocio en euros si el salto de premio es grande."
        },
        {
          "title": "Bubble factor alto",
          "body": "Cuando el bubble factor es alto → fold más, shove más selectivo. No regales el second place barato por «ganar el flip». Presiona spots baratos; evita all-ins que deciden el torneo sin edge claro."
        },
        {
          "title": "Trampa final",
          "body": "Ignorar el payout en el all-in que decide el torneo. Un flip puede costarte € aunque sea 50/50 en fichas. Antes de shove o hacer call HU, nombra el pay jump en voz baja."
        }
      ],
      "examples": [
        {
          "title": "HU pay jump",
          "body": "Heads-up: el 1.º gana mucho más que el 2.º. Un flip innecesario con A9o vs shove wide puede costarte la diferencia en € aunque ganes fichas a coin-flip."
        },
        {
          "title": "Presión correcta en bubble",
          "body": "Eres cover en 3-max cerca de eliminar al short: roba ciegas y fuerza decisiones. No hace falta hero-call su shove con manos medias — la presión ya trabaja por ti."
        },
        {
          "title": "Fold que duele y paga",
          "body": "HU, rival shove, tú con KJo en payout alto: a menudo fold. Duele, pero preservar el 2.º (o forzar mejor spot) vale más que el ego del call."
        }
      ],
      "aiQuestions": [
        "¿Qué es bubble factor en un Spin?",
        "¿Por qué importa el pay jump heads-up?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-14",
      "title": "Bubble factor mental HU pay jump"
    },
    {
      "route": "spin",
      "module": "M3",
      "order": 15,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Range vs range: antes de shove o hacer call, piensa en bandas de manos (rangos), no solo «mi carta es bonita». Tu AK se mide contra el rango de shove rival, no contra «creo que tiene QQ».",
      "theory": [
        {
          "title": "Qué es un rango",
          "body": "Rango es el conjunto de manos que el rival puede tener en ese spot. Ejemplo: «BTN shove 10 bb» suele ser más wide (más manos) que «BB hace call vs ese shove». Nombrar el rango evita pelear contra una mano concreta imaginaria."
        },
        {
          "title": "Tu shove vs su call",
          "body": "Antes de shovear pregunta: ¿qué manos peores me pagan? ¿qué manos mejores me tienen? Si estás dominado a menudo cuando te hacen call, el shove era vanity. Fold equity + equity vs rango de call = la cuenta real."
        },
        {
          "title": "Call vs rango de shove",
          "body": "Range vs range en call shove: tu A5o desde BB no se mide vs «tal vez tenga 72o»; se mide vs el rango real de shove BTN (muchas Ax, pares, conectadas). A5o often fold — dominada por Ax mejores y por pares."
        },
        {
          "title": "Trampa de sensación",
          "body": "Decidir solo por «me gusta mi mano» sin nombrar el rango rival. En Spins cortos esa sensación te hace hero-call y panic shove. Oblígate a una frase: «él shovea X; yo contra X hago Y»."
        }
      ],
      "examples": [
        {
          "title": "Nombrar rangos",
          "body": "BTN shove 10 bb: muchas Ax, pares, suited connectors. BB call: más tight — pares medios+, Ax fuerte. Por eso A5o BB vs shove BTN often fold, y 99 hace call."
        },
        {
          "title": "AK vs rango, no vs QQ",
          "body": "Rival shove desde SB a 12 bb. Tu AKo no pregunta «¿y si tiene QQ?»; pregunta equity vs su rango de shove SB (que incluye muchas peores Ax y Kx). Suele ser call/shove value, no terror a una mano concreta."
        },
        {
          "title": "Shove con blockers",
          "body": "A5s shove desde BTN bloquea AA/AK del rival: ganas fold equity y algo de equity cuando te pagan. Ese razonamiento es range-based, no «me gusta el as»."
        }
      ],
      "aiQuestions": [
        "¿Cómo estimo el rango de shove del BTN?",
        "¿Range vs range en call shove?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-15",
      "title": "Range vs range shove/call"
    },
    {
      "route": "spin",
      "module": "M3",
      "order": 16,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Explotación: vs nit (folda mucho) stealeas más; vs maniac (juega muchas manos agresivo) defiendes tighter y value-shoveas más limpio. Ajusta al rival real, no solo al chart ciego.",
      "theory": [
        {
          "title": "Vs nit",
          "body": "Nit: se tira demasiado vs steals y abre tight. Puedes abrir/steal más wide — cada fold suyo es fichas gratis hacia el payout. No necesitas GTO perfecto si el rival tira el 80 % de las ciegas."
        },
        {
          "title": "Vs maniac",
          "body": "Maniac: paga y shovea wide. Reduce faroles, value-shove más grueso (TT+, Ax fuerte) y no hagas bluffcatch light (pagar faroles con manos medias). Contra alguien que nunca folda, el bluff pierde sentido."
        },
        {
          "title": "Ajuste > chart ciego",
          "body": "Observa 10–20 manos del rival en lobby si puedes: ¿folda BTN steal? ¿paga light? ¿shovea cualquier Ax? El chart GTO es base; la explotación es el € extra cuando el leak es obvio."
        },
        {
          "title": "Trampa de libro",
          "body": "Jugar GTO de manual vs nit o maniac obvios deja dinero en la mesa. Si ves el leak y no ajustas, estás regalando EV por «parecer equilibrado» en un Spin de tres manos decisivas."
        }
      ],
      "examples": [
        {
          "title": "Vs nit",
          "body": "SB folda ~80 % vs steal BTN: abre wider. Cualquier fold es fichas hacia el payout sin showdown — castiga la pasividad."
        },
        {
          "title": "Vs maniac",
          "body": "BB paga y 3-betea light: aprieta opens marginales, shove value (TT+, AQo+) más often y deja de farolear thin. Que él spewee; tú cobra value."
        },
        {
          "title": "Lectura rápida",
          "body": "Tras dos steals: si ambos foldan, marca nit-leaning. Si te pagan o te shovean light, marca maniac-leaning. Ajusta la tercera mano — en Spins no hay 200 manos para confirmar."
        }
      ],
      "aiQuestions": [
        "¿Cómo exploto a un nit en Spins?",
        "¿Qué cambio vs un maniac?"
      ],
      "spots": [],
      "exam": false,
      "id": "S-16",
      "title": "Explotación nit vs maniac"
    },
    {
      "route": "spin",
      "module": "M3",
      "order": 17,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Certificación Spin Pro: integra anatomía (fichas ≠ €), steal/defensa, iso, push/fold, ICM, payout y explotación. Sin vocabulario nuevo — plan completo en una mesa corta.",
      "theory": [
        {
          "title": "Mapa del spot",
          "body": "Repaso mental: ¿cuántas bb tengo? ¿Es steal, defensa BB, iso vs limp o push/fold? Si no puedes etiquetar el spot, no actúes todavía. El Pro nombra el trabajo antes de clicar."
        },
        {
          "title": "Cover, short y multiplicador",
          "body": "¿Soy cover (más fichas) o short? ¿El multiplicador fue 2×/3× o 5×? Eso cambia tightness de steals, shoves y calls. El mismo A9o no se juega igual en todos esos mundos."
        },
        {
          "title": "Fichas vs euros + rangos",
          "body": "¿Decido en fichas (chip EV) o en euros (ICM)? ¿Nombré el rango rival antes de hacer call o shove? Range vs range + payout > sensación de «carta bonita»."
        },
        {
          "title": "Checklist final",
          "body": "Posición → stack bb → payout → cover/short → acción sin spew ni hero-call. Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele."
        }
      ],
      "examples": [
        {
          "title": "Plan Pro en una frase",
          "body": "Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele, y explota nit/maniac cuando el leak es obvio."
        },
        {
          "title": "Pregunta de certificación",
          "body": "Te shovean en 5× con KQo mid-stack: ¿chip EV o ICM? Si respondes ICM y fold (salvo reads maniac extremos), estás pensando Pro. Si solo dices «puedo ganar», aún no."
        },
        {
          "title": "Spot de cierre",
          "body": "10 bb BTN, payout 3×, ATs: shove. No es examen de filosofía — es push/fold limpio. El Pro también sabe cuándo el spot es simple."
        }
      ],
      "aiQuestions": [
        "Repásame plan Spin Pro completo",
        "¿Cuándo overfoldeo vs shove en 5×?"
      ],
      "spots": [],
      "exam": true,
      "id": "S-17",
      "title": "Examen Pro · Spins"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-data-mtt.js — Fase H: MTT T-00…T-22
 * Menú Escuela: admin-only (SCHOOL_PUBLIC=false).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  
  function spinCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mttCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }
  function packSpots(kind, D) {
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot, f3 = D.face3betSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN ~20 bb: shove (all-in) por valor. A esta profundidad no min-raisees premium offsuit — shove o fold.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['5h', '2s'], 40102, { trapTag: 'dominated', teachBack: '52o: fold. No stealees basura total: si te pagan o te re-suben, la mano casi nunca aguanta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB ~20 bb: open steal a ~2,5–3 bb (no shove). Mano media del rango — roba ciegas con sizing normal; shove reservado a premiums.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['9s', '6c'], 40104, { trapTag: 'fancy_play', teachBack: '96o SB: fold. No estás en BTN: aquí el steal es más arriesgado porque quedarás OOP si te igualan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['Ts', 'Tc'], 40105, { teachBack: 'TT BTN ~20 bb: shove claro. Par medio fuerte en zona steal — quieres fold equity o ir all-in, no open min.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['9c', '7c'], 40106, { teachBack: '97s BTN ~20 bb: open steal a ~2,5 bb. Mano media con jugabilidad — roba ciegas sin commitear todo el stack.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-07', 'BTN', ['Qs', 'Qh'], 40107, { teachBack: 'QQ BTN ~20 bb: shove por valor. Premium claro — maximizas fold equity o vas all-in con equity alta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-08', 'SB', ['6d', '4c'], 40108, { trapTag: 'dominated', teachBack: '64o SB: fold. Desde SB no stealees basura: quedarás OOP si te pagan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-09', 'BTN', ['Kh', 'Qs'], 40109, { teachBack: 'KQo BTN ~20 bb: open min o shove mixto; aquí open steal ~2,5 bb es sólido con broadway suited.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-10', 'SB', ['Ah', '4h'], 40110, { teachBack: 'A4s SB ~20 bb: open steal razonable. As suited con jugabilidad; no es auto-shove como AA.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-11', 'BTN', ['Jc', 'Td'], 40111, { teachBack: 'JTo BTN: open steal frecuente a 20 bb. Broadway offsuit en botón — roba ciegas sin shove.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-12', 'BTN', ['2c', '2d'], 40112, { trapTag: 'fancy_play', teachBack: '22 BTN ~20 bb: open min preferible a shove panic. Pareja baja quiere flop barato o robo; no commitees todo sin necesidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['Ah', 'Jh'], 40201, { teachBack: 'AJs vs steal BTN ~20 bb: 3-bet shove (all-in). Mano premium — no 3-bet pequeño que te deja en calle sin salida.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['Ts', '6c'], 40202, { trapTag: 'dominated', teachBack: 'T6o BB: fold. No overdefiendas las ciegas con basura — en torneo corto un error elimina.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJo vs steal SB ~20 bb: call o 3-bet shove según mezcla; no es auto-shove pero sí defiende. Fold sería demasiado tight.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '8d'], 40204, { teachBack: 'A8s vs steal BTN: 3-bet shove de presión/farol frecuente. Blocker de as — castiga opens wide sin min-3bet.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['9d', '7h'], 40205, { trapTag: 'fancy_play', teachBack: '97o: fold típico vs steal. Dominada, OOP y stack corto — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['Jh', 'Jc'], 40206, { teachBack: 'JJ vs steal SB ~20 bb: 3-bet shove por valor. Par medio fuerte — shove, no 3-bet pequeño.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-07', 'BB_vs_BTN', ['Ad', 'Kd'], 40207, { teachBack: 'AKs vs steal BTN: 3-bet shove value claro. Par fuerte a 20 bb — quieres all-in o fold equity.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-08', 'BB_vs_BTN', ['Js', '9h'], 40208, { trapTag: 'dominated', teachBack: 'J9o vs steal BTN: fold frecuente. Dominada y OOP — no overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-09', 'BB_vs_SB', ['Ah', 'Js'], 40209, { teachBack: 'AJo vs steal SB: 3-bet shove o continue sólido. Ax fuerte en spot corto.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-10', 'BB_vs_BTN', ['8d', '6d'], 40210, { teachBack: '86s vs steal BTN: call selectivo posible; no es auto-shove. Jugabilidad si el precio es bueno.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-11', 'BB_vs_BTN', ['Kd', 'Kh'], 40211, { teachBack: 'KK vs steal: 3-bet shove value. Quieres máximo valor o stack-off favorable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-12', 'BB_vs_SB', ['Jd', '8c'], 40212, { trapTag: 'fancy_play', teachBack: 'J8o vs steal SB: fold. No hero-defiendas basura en Spin.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 7).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 7));
    /* Spins 3-max: BTN actúa primero. No existe «SB limpea, hero BTN». */
    if (kind === 'SPIN_ISO') return [
      bb('s04-01', ['Ah', 'Js'], 40401, { teachBack: 'AJo en BB vs limp de SB: iso (aislar). En Spin 3-max el BTN actúa primero; si ya foldó y el SB limpea, tú en BB aíslas con manos fuertes. Quieres heads-up con iniciativa, no check eterno con value.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-02', ['Jd', '3h'], 40402, { trapTag: 'dominated', teachBack: 'J3o vs limp SB: check (opción gratis). No overiso con basura: ya estás en el bote. A stack corto aislar trash duele entero el torneo.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQo en SB vs limp de BTN: iso por valor. En 3-max el BTN puede limpear primero; desde SB castigas el limp con manos fuertes — heads-up con iniciativa, no limpear detrás.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-04', ['Jh', '8d'], 40404, { trapTag: 'fancy_play', teachBack: 'J8o vs limp SB: check frecuente. No aísles manos frágiles que no mejoran bien postflop. Si no merecería open sin limp, tampoco merece iso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-05', ['7h', '7d'], 40405, { teachBack: '77 BB vs limp SB: iso claro. Par medio fuerte — aísla y cobra a limps wide.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-06', ['Jh', 'Td'], 40406, { teachBack: 'JTo vs limp SB: a menudo check. Offsuit marginal — no overiso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-07', 'SB', 'BTN', ['Td', 'Th'], 40407, { teachBack: 'TT en SB vs limp BTN: iso value. Premium — quieres heads-up con iniciativa.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-08', ['5c', '4d'], 40408, { trapTag: 'dominated', teachBack: '54o vs limp SB: check. No aísles conectores offsuit basura a stack corto.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-09', ['Ac', '9c'], 40409, { teachBack: 'A9s BB vs limp SB: iso razonable. Ax suited castiga limps y juega bien postflop.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-10', ['Td', '9c'], 40410, { trapTag: 'fancy_play', teachBack: 'T9o vs limp SB: check frecuente. Frágil offsuit — no mereces iso automático.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-11', 'SB', 'BTN', ['Ts', 'Ts'], 40411, { teachBack: 'TT en SB vs limp BTN: iso value. Par fuerte — aísla y construye bote.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-12', ['Td', '8d'], 40412, { teachBack: 'T8s BB vs limp SB: iso selectivo OK. Conectores suited con plan; sizing ~3–4 bb, no shove.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs con ~12 bb en BTN: shove (all-in) candidato. A esta profundidad un open pequeño suele ser peor que ir all-in o fold: ganas fold equity o vas a doblar con equity decente si te pagan.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['Kd', '6s'], 40502, { trapTag: 'dominated', teachBack: 'K6o a ~12 bb: fold. No hagas panic shove (all-in por desesperación): no tienes fold equity real ni equity cuando te pagan. Espera un spot con historia.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJo SB ~10 bb: shove frecuente. Stack corto + ciegas ya en juego = zona push/fold. No abras min «como cash»; o all-in o fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['Jh', 'Jc'], 40504, { teachBack: 'JJ a 10–12 bb: shove por valor claro. Par medio fuerte en push/fold — quieres doblar o robar ciegas, no open min que te deja mal stacked ante un 3-bet.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-05', 'BTN', ['Ks', 'Qs'], 40505, { teachBack: 'KQs ~12 bb: shove value. Premium — no min-raise en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-06', 'SB', ['9h', '7d'], 40506, { trapTag: 'fancy_play', teachBack: '97o SB ~10 bb: fold. No panic shove con basura OOP.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-07', 'BTN', ['Ad', '7d'], 40507, { teachBack: 'A7s BTN ~10–12 bb: shove frecuente. Ax suited con fold equity en push/fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-08', 'BTN', ['Jh', 'Td'], 40508, { teachBack: 'JTo BTN ~12 bb: shove o fold según chart; a menudo shove desde botón corto.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-09', 'SB', ['Qs', '7h'], 40509, { trapTag: 'dominated', teachBack: 'Q7o SB corto: fold. Sin equity ni fold equity real.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-10', 'BTN', ['Ah', 'Qd'], 40510, { teachBack: 'AQo ~10 bb: shove value claro. Par fuerte — all-in, no open min.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-11', 'SB', ['Kh', 'Th'], 40511, { teachBack: 'KTs SB ~10 bb: shove frecuente. Broadway suited en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-12', 'BTN', ['9s', '8s'], 40512, { teachBack: '98s BTN ~12 bb: shove candidato wide desde botón. Conector suited con fold equity.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-13', 'BTN', ['2h', '2d'], 40513, { teachBack: '22 BTN ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas desde botón.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-14', 'SB', ['Ad', '9c'], 40514, { teachBack: 'A9o SB ~10 bb: shove frecuente. Ax offsuit entra en muchos charts SB cortos.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'SPIN_EXAM_M1') return packSpots('SPIN_ISO', D).slice(0, 6).concat(packSpots('SPIN_SHOVE', D).slice(0, 8));
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo en BTN early (~40 bb): open cash-like claro. Estás en late con una broadway fuerte; quieres robar o jugar un pot manejable, no limpear ni ir all-in sin necesidad.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['9s', '6c'], 50102, { trapTag: 'dominated', teachBack: '96o UTG early: fold. Hay mucha gente detrás y la mano se domina fácil; early pide paciencia, no forzar basura desde early position.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO early: open estándar. Buena broadway suited en late-ish; construyes stack con iniciativa sin spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['Qs', 'Jh'], 50104, { trapTag: 'dominated', teachBack: 'QJo: fold siempre aquí. Sin equity real ni jugabilidad; abrirlo early es spew puro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['7s', '7c'], 50105, { teachBack: '77 BTN early: open claro. Par medio fuerte en posición — quieres robar ciegas o ver flop barato con iniciativa, no limpear.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['7s', '6s'], 50106, { trapTag: 'fancy_play', teachBack: '76s HJ early: a menudo fold — no spew. Ax offsuit bajo en middle early no merece open automático.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-07', 'CO', ['Qs', 'Qh'], 50107, { teachBack: 'QQ CO early: open claro. Premium — construyes stack con valor e iniciativa.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-08', 'UTG', ['Jh', 'Td'], 50108, { trapTag: 'dominated', teachBack: 'JTo UTG early: fold típico. Demasiada gente detrás para esta broadway offsuit.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-09', 'BTN', ['9c', '7c'], 50109, { teachBack: '97s BTN early: open razonable. Conectores suited en posición — cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-10', 'HJ', ['As', 'Kd'], 50110, { teachBack: 'AKo HJ early: open value. Par fuerte — no limpees ni juegues raro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-11', 'CO', ['Td', '9c'], 50111, { trapTag: 'fancy_play', teachBack: 'T9o CO early: a menudo fold. Offsuit frágil mid-late early — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-12', 'BTN', ['Ts', '9s'], 50112, { teachBack: 'T9s BTN early: open claro. Conectores suited en botón — open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 12);
    /* Antenas de stack (T-02): short busca doblarse; mid evita chocar; big/cover no spew ni call light. */
    if (kind === 'MTT_STACK') return [
      rfi('t02-01', 'BTN', ['As', 'Ts'], 50201, { teachBack: 'Vas short (~11 bb) en BTN con ATs: shove para doblarte. A esta profundidad no abras min «como cash»: o all-in o fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb11' }) }),
      rfi('t02-02', 'BTN', ['8h', '5c'], 50202, { trapTag: 'dominated', teachBack: 'Short con 85o: fold. Necesitas doblarte, sí, pero no con basura: sin equity ni fold equity real es panic shove.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb11' }) }),
      rfi('t02-03', 'SB', ['Kh', 'Jh'], 50203, { teachBack: 'Short en SB con KJs (~10 bb): shove frecuente. Spot para doblarte con broadway usable en push/fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t02-04', 'CO', ['Kc', '8h'], 50204, { trapTag: 'fancy_play', teachBack: 'Eres mid (~22 bb) en CO con K8o y hay covers detrás: fold. No abras flojo: un 3-bet del big te mete en un spot feo o te elimina.', playConfig: mttCfg({ mttPhase: 'mid', stackDepth: 'bb22' }) }),
      rfi('t02-05', 'UTG', ['Ah', '2h'], 50205, { trapTag: 'dominated', teachBack: 'Mid en UTG con A2s: fold. Desde early, con stack medio, no forces Ax flojo: hay demasiada gente (y covers) detrás.', playConfig: mttCfg({ mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t02-06', 'BTN', ['9s', '9c'], 50206, { teachBack: 'Mid en BTN con 99 (~25 bb): open claro. Spot limpio con stack jugable — no hace falta esperar a ser short para jugar manos fuertes.', playConfig: mttCfg({ mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t02-07', 'BTN', ['Kd', 'Jd'], 50207, { teachBack: 'Eres big stack (~45 bb) en BTN con KJs: open/steal razonable. El big puede aplicar presión en late; no eres un mid sobreviviendo.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb45' }) }),
      rfi('t02-08', 'BTN', ['9d', '3c'], 50208, { trapTag: 'dominated', teachBack: 'Aunque seas big, 93o es fold. Presión de stack no es spew con basura: si te pagan o te 3-betean, la mano no aguanta.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb45' }) }),
      vs('t02-09', 'BB_vs_BTN', ['Js', '9h'], 50209, { trapTag: 'fancy_play', teachBack: 'Eres cover (~45 bb) y el BTN abre wide: con J9o fold. No pagues light «porque soy cover»; primero pregunta si el call mejora tu premio o solo tus fichas.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb45' }) }),
      vs('t02-10', 'BB_vs_BTN', ['Ah', 'Jh'], 50210, { teachBack: 'Cover con AJs frente al open del BTN: 3-bet por valor. Aquí sí quieres un bote grande: tienes una mano que domina muchos opens late.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb45' }) }),
      vs('t02-11', 'BB_vs_BTN', ['Ks', 'Qs'], 50211, { teachBack: 'Cover con KQs vs open BTN: 3-bet value. Misma lógica que QQ: no eres short buscando desesperación; cobras con premium.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb40' }) }),
      f3('t02-12', 'BTN_vs_BB', ['8h', '8d'], 50212, { trapTag: 'fancy_play', teachBack: 'Eres mid (~22 bb) y el BB (cover) te 3-betea: con 88 fold frecuente. Evitas un coin flip (~50/50) contra alguien que te puede eliminar del torneo.', playConfig: mttCfg({ scenario: 'face3bet', mttPhase: 'mid', stackDepth: 'bb22' }) })
    ];
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Qd', 'Tc'], 50401, { teachBack: 'QTo BTN mid (~25 bb): steal razonable. Late position + ante: open para robar ciegas sin shove aún.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['Qc', '2h'], 50402, { trapTag: 'dominated', teachBack: 'Q2o: fold. Ni en mid stealees basura total — si te 3-betean estás perdido.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '3s'], 50403, { teachBack: 'A3s CO mid: steal/open OK. Ax suited con plan si te 3-betean.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB mid: open/steal frecuente. Tight-er que BTN pero esta mano entra.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico. No stealees basura mid desde CO.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['7h', '6h'], 50406, { teachBack: '76s BTN mid: steal con jugabilidad. Conectores suited — open, no shove aún a 25 bb.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-07', 'BTN', ['As', 'Jd'], 50407, { teachBack: 'AJo BTN mid: steal claro. Broadway en botón con ante — open estándar.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-08', 'SB', ['Td', '3s'], 50408, { trapTag: 'dominated', teachBack: 'T3o SB mid: fold. OOP y basura — no robés.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-09', 'CO', ['Td', 'Tc'], 50409, { teachBack: 'TT CO mid: open/steal value. Par medio — quieres iniciativa.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-10', 'BTN', ['Qd', '9c'], 50410, { teachBack: 'Q9o BTN mid: steal frecuente. En botón mid se abre más wide.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-11', 'SB', ['Kh', 'Js'], 50411, { teachBack: 'KJo SB mid: open steal razonable. Broadway offsuit; plan si BB 3-betea.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-12', 'CO', ['5h', '4d'], 50412, { trapTag: 'fancy_play', teachBack: '54o CO: fold. No stealees conectores offsuit basura mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['Jh', 'Jd'], 50501, { teachBack: 'JJ: 3-bet value vs steal mid. Premium — presión o valor claro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente vs steal BTN. Blocker de as.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['Th', '7c'], 50503, { trapTag: 'dominated', teachBack: 'T7o: fold. No overdefend ni 3-bet spew.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold vs steal a menos que el chart diga call mixto raro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-05', 'BB_vs_BTN', ['Ts', 'Tc'], 50505, { teachBack: 'TT vs steal: 3-bet value. Par fuerte mid — construye bote o aísla.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-06', 'BB_vs_SB', ['Kh', 'Js'], 50506, { teachBack: 'KJo vs SB steal: defensa/3-bet razonable. Broadway offsuit.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-07', 'BB_vs_BTN', ['9c', '5h'], 50507, { trapTag: 'dominated', teachBack: '95o vs steal: fold. Dominada y OOP.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-08', 'BB_vs_CO', ['Ah', '4h'], 50508, { teachBack: 'A4s vs CO: 3-bet polar frecuente. Castiga opens mid con blockers.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-09', 'BB_vs_BTN', ['7h', '7d'], 50509, { teachBack: '77 vs steal BTN: 3-bet o call sólido. Par medio — no fold automático.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-10', 'BB_vs_BTN', ['Jc', 'Tc'], 50510, { teachBack: 'JTs vs steal: call o 3-bet ligero. Conectores altos suited se defienden bien.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-11', 'BB_vs_SB', ['Ad', 'Kd'], 50511, { teachBack: 'AKs vs steal SB: 3-bet value. Quieres máximo valor.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-12', 'BB_vs_CO', ['Ks', '7d'], 50512, { trapTag: 'fancy_play', teachBack: 'K7o vs CO: fold típico. No 3-bet spew mid con offsuit frágil.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 7).concat(packSpots('MTT_3BET', D).slice(0, 7));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '2h'], 50901, { teachBack: 'A2s BTN a ~10–12 bb: shove candidato. Zona push/fold — no open min.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['Jc', '8d'], 50902, { trapTag: 'dominated', teachBack: 'J8o: fold. No panic shove sin equity ni fold equity.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente. Push/fold limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['Jh', 'Jc'], 50904, { teachBack: 'JJ: shove value. Par medio fuerte en short/push.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-05', 'BTN', ['Ah', 'Jh'], 50905, { teachBack: 'AJs ~12 bb: shove value. Premium — all-in, no min-raise.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-06', 'SB', ['Qh', '6s'], 50906, { trapTag: 'fancy_play', teachBack: 'Q6o SB corto: fold. No shove basura OOP.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-07', 'BTN', ['Jh', 'Td'], 50907, { teachBack: 'JTo BTN ~10–12 bb: shove frecuente desde botón.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-08', 'CO', ['Th', '5c'], 50908, { trapTag: 'dominated', teachBack: 'T5o CO: fold. Early-ish short tampoco justifica basura.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-09', 'SB', ['7s', '6s'], 50909, { teachBack: '76s SB ~10 bb: shove frecuente. Conectores suited en push/fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-10', 'BTN', ['Ks', 'Qs'], 50910, { teachBack: 'KQs ~10 bb: shove value. Par fuerte — stack-off limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-11', 'CO', ['Kh', 'Js'], 50911, { teachBack: 'KJo CO ~12 bb: shove candidato. Broadway offsuit short.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-12', 'BTN', ['9s', '8s'], 50912, { teachBack: '98s BTN ~10 bb: shove wide desde botón. Fold equity + jugabilidad.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-13', 'SB', ['2c', '2d'], 50913, { teachBack: '22 SB ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas SB.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-14', 'BTN', ['Ad', '9c'], 50914, { teachBack: 'A9o BTN ~12 bb: shove frecuente. Ax offsuit en botón corto entra en charts.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) })
    ];
    return [];
  }
  function resolveSpots(lesson, D) {
    if (typeof lesson.spots === 'string') lesson.spots = packSpots(lesson.spots, D);
    if (Array.isArray(lesson.spots) && lesson.spots.length) lesson.hands = lesson.spots.length;
    return lesson;
  }

  if (D.setRouteStatus) {
    D.setRouteStatus('mtt', 'active');
  }
  var RAW = [
    {
      "route": "mtt",
      "module": "M0",
      "order": 0,
      "plan": "free",
      "xp": 40,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Un MTT (torneo multi-mesa) se juega por fases: early, mid, short, push y burbuja. El ante (pago extra obligatorio cada mano) y tu stack en bb (ciegas grandes) cambian el plan mucho antes de mirar las cartas.",
      "theory": [
        {
          "title": "Mapa de fases",
          "body": "Early suele ser 40–60+ bb: juego parecido al cash, con paciencia. Mid baja hacia 25–35 bb y empiezas a robar más. Short (aprox. 20–12 bb) fuerza opens o shoves; push (aprox. 12–8 bb) es casi solo shove o fold. Bubble (burbuja) es cuando faltan pocos para cobrar: el ICM (valor en dinero real de tus fichas según el payout) manda."
        },
        {
          "title": "Ante y bote muerto",
          "body": "El ante engorda el bote sin que nadie haya abierto. Eso sube la recompensa de un steal (robar ciegas) exitoso y hace que pasar de largo cueste más a largo plazo. No juegues \"sin ante\" cuando la mesa ya paga ante cada mano."
        },
        {
          "title": "Cuenta en bb, no en fichas absolutas",
          "body": "\"Tengo 12.000 fichas\" no decide nada hasta que divides por la ciega grande. Diez bb a ciegas altas es un short stack; cuarenta bb es early profundo. Antes de cada nivel, ancla: fase + stack en bb + quién es big/mid/short en tu mesa."
        },
        {
          "title": "Honestidad del curso",
          "body": "Aquí entrenamos principios de fases e ICM, no un solver de field de cientos de jugadores. Si entiendes el mapa mental, luego afinamos números; si no, las charts no te salvan."
        }
      ],
      "examples": [
        {
          "title": "Misma mano, distinta fase",
          "body": "K9o en BTN a 50 bb early: open estándar cash-like. La misma K9o a 11 bb en push: a menudo shove (ir all-in) o fold según chart — ya no es un open de 2,5 bb \"para ver flop\"."
        },
        {
          "title": "Ante que empuja el robo",
          "body": "Sin ante, robar SB+BB vale poco relativo a tu stack profundo. Con ante, el dead money (fichas ya en el bote) justifica steals más wide desde CO/BTN antes de entrar en zona corta."
        },
        {
          "title": "Lectura rápida de mesa",
          "body": "Antes de la mano: \"Estoy mid a 22 bb, hay un short a 9 bb y un cover a 55 bb\". Ese mapa decide si presionas, sobrevives o buscas doble — no solo si \"te gusta\" la mano."
        }
      ],
      "aiQuestions": [
        "¿Cómo sé si estoy en early, mid, short o push solo mirando bb?",
        "¿Por qué el ante cambia mi plan de robos?",
        "¿Qué es ICM en una frase y cuándo empieza a importar?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-00",
      "title": "Stages del torneo y ante"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 1,
      "plan": "free",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "En early (stacks profundos, a menudo 40–60+ bb) juegas spots claros y con paciencia: construyes stack sin coin flips inútiles ni spew (regalar fichas en spots −EV). El objetivo es llegar a mid con un stack jugable, no \"hacer acción\" en la primera ciega.",
      "theory": [
        {
          "title": "Cash-like, no cash idéntico",
          "body": "Con muchas bb el preflop se parece al cash: open o fold desde early, rangos más wide en late, sin limpear (igualar la ciega grande para entrar sin subir) en mesas modernas. Aun así el objetivo es supervivencia y stack usable más adelante, no maximizar cada pot como si pudieras cash-out."
        },
        {
          "title": "Evita spew early",
          "body": "Spew típico: 3-bet wars sin necesidad, faroles sin plan postflop, hero-calls \"porque estoy deep\". Las fichas early se defienden mejor: un error grande aquí te deja short mucho antes de la burbuja."
        },
        {
          "title": "Trampa de mentalidad",
          "body": "Jugar \"como final table\" en la primera órbita es un leak: no hay ICM de FT ni presión de burbuja. Sé selectivo, acumula sin drama y guarda energía mental para mid y short."
        }
      ],
      "examples": [
        {
          "title": "Open claro BTN",
          "body": "ATo o 99 en BTN a ~40 bb: open estándar. Quieres pot manejable o robar ciegas; no necesitas all-in ni inventar líneas raras."
        },
        {
          "title": "Fold UTG con paciencia",
          "body": "Q8o UTG early: fold. Hay mucha gente detrás y la mano no juega bien multiway. Early no se \"fuerza\" basura solo porque te aburres."
        },
        {
          "title": "HJ marginal",
          "body": "A5o HJ early: a menudo fold. El as offsuit bajo se domina mucho y no tiene la jugabilidad de A5s; no es spot para spew buscando acción."
        }
      ],
      "aiQuestions": [
        "¿Qué cambia en early respecto al cash 100 bb?",
        "¿Por qué no debo forzar manos mediocres UTG early?",
        "Dame un ejemplo de spew típico en early MTT"
      ],
      "spots": "MTT_EARLY",
      "exam": false,
      "id": "T-01",
      "title": "Early: cash-like con paciencia"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 2,
      "plan": "free",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 12,
      "concept": "Antes de mirar solo tu mano, lee las antenas de stack: quién es big stack, mid o short. Eso decide quién puede aplicar presión, quién necesita doblarse porque va muy corto, y a quién no le conviene chocar (por ejemplo, un mid contra un cover que lo puede eliminar). Piensa en bb efectivas (y en M si te ayuda), no en fichas absolutas.",
      "theory": [
        {
          "title": "M y bb efectivas",
          "body": "M (o M-ratio) resume cuántas vueltas de mesa te quedan pagando ciegas y antes. En la práctica del día a día, contar bb efectivas suele bastar: stack ÷ ciega grande (ajustando si el rival tiene menos). Lo importante es clasificar roles, no memorizar fórmulas."
        },
        {
          "title": "Roles en la mesa",
          "body": "Los big stacks pueden abrir más y forzar folds. Los short stacks buscan spots para doblarse o shovear. Los mid stacks a menudo priorizan sobrevivir: no quieren meterse en coin flips grandes contra covers — un coin flip es un all-in casi 50/50 (por ejemplo pareja media contra AK) donde te la juegas a cara o cruz. No trates a todos igual solo porque «tienes la misma mano»."
        },
        {
          "title": "Trampa: ceguera de stack",
          "body": "Jugar solo tu combo e ignorar covers y shorts es un leak clásico. Un open wide contra un short desesperado, o un call light contra un big que te puede eliminar, cambian el EV aunque la equity de la mano sea similar."
        }
      ],
      "examples": [
        {
          "title": "Cover vs short",
          "body": "Tú tienes 45 bb y hay un short con 11 bb en BTN que hace un shove por desesperación. Aunque seas cover, no pagues light «porque soy cover»: primero pregunta si ese call mejora tu premio o solo tus fichas."
        },
        {
          "title": "Mid entre dos fuegos",
          "body": "Tú tienes 22 bb, con un big de 60 bb a tu izquierda y un short de 8 bb en mesa. Opens flojos contra el big te meten en spots feos. Mejor eliges spots claros o dejas que el short se juegue la vida."
        },
        {
          "title": "Misma mano, distinto rival",
          "body": "Jugar 99 contra el open de un mid a 28 bb no es lo mismo que pagar el shove de un short a 9 bb. El stack relativo cambia la fold equity, los rangos y el riesgo de eliminación."
        }
      ],
      "aiQuestions": [
        "¿Cómo clasifico big, mid y short en mi mesa?",
        "¿Para qué sirve pensar en M o en bb efectivas?",
        "¿Por qué no juego igual vs un cover que vs un short?"
      ],
      "spots": "MTT_STACK",
      "exam": false,
      "id": "T-02",
      "title": "Antenas de stack (M / big stacks)"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 3,
      "plan": "free",
      "xp": 110,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Examen M0: repasas fases del torneo y early con paciencia. Sin teoría nueva — solo checklist de cómo revisar cada decisión antes de clicar.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Identifica la fase: ¿early profundo, mid, o ya cerca de short? Mira tu stack en bb y el de los rivales relevantes. Si estás early, prioriza spots claros y evita spew."
        },
        {
          "title": "Paso 2",
          "body": "Lee posición y antenas: UTG no es BTN. Pregunta quién puede castigarte detrás y si tu mano tiene plan si te 3-betean. Early: open o fold; no limpees ni forces basura."
        },
        {
          "title": "Paso 3",
          "body": "Ejecuta sin inventar drama de final table. Si la mano es clara (88 BTN open, 83o fold), hazlo. Si es marginal early desde early position, fold suele ser disciplina, no cobardía."
        }
      ],
      "examples": [
        {
          "title": "Antes de la sesión",
          "body": "Repasa en voz alta: fase → stack bb → posición → ¿open claro o fold? El examen mezcla spots early; no busques \"jugadas de burbuja\" aquí."
        },
        {
          "title": "Señal de alarma",
          "body": "Si te pillas pensando \"voy all-in porque me aburro\" a 45 bb, párate. Eso es spew early, no estrategia de torneo."
        },
        {
          "title": "Checklist de 5 segundos",
          "body": "¿Estoy early? ¿Hay mucha gente detrás? ¿La mano juega bien si me pagan? Si dos respuestas son no, fold y siguiente mano."
        }
      ],
      "aiQuestions": [
        "Repásame el checklist de early antes del examen",
        "¿Qué errores típicos de M0 debo evitar?"
      ],
      "spots": "MTT_EXAM_M0",
      "exam": true,
      "id": "T-03",
      "title": "Examen M0 · MTT"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 4,
      "plan": "study",
      "xp": 110,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Antes de entrar en zona corta, en mid (a menudo ~25–35 bb) robás ciegas con steals (opens desde late) desde CO, BTN y SB. El ante engorda el premio del robo; no llegues a 12 bb sin haber intentado acumular fichas baratas.",
      "theory": [
        {
          "title": "Steal mid-late",
          "body": "Steal: open-raise esperando que folden ciegas y antes. Aún no estás obligado a shove: abres a sizing estándar y eliges manos con plan si te 3-betean (fold, call o 4-bet según stack y rival)."
        },
        {
          "title": "Manos con plan",
          "body": "Buenas candidatas: broadways, Ax suited, suited connectors y pares. Basura total (J3o) no se convierte en steal solo por estar en BTN. Si te 3-betean, sabes si te tiras o continúas — no abras \"y ya veremos\"."
        },
        {
          "title": "Trampa de pasividad",
          "body": "Pasar de largo todas las órbitas hasta 12 bb te deja short sin fichas robadas. Mid es la ventana para engordar el stack con fold equity antes del push/fold."
        }
      ],
      "examples": [
        {
          "title": "K9o BTN mid",
          "body": "BTN ~25 bb, K9o: steal razonable. Si las ciegas foldean mucho, ganas dead money; si te 3-betean fuerte, foldas sin drama."
        },
        {
          "title": "A5s CO",
          "body": "A5s CO mid: open/steal OK. Tiene blockers de as y jugabilidad; no es basura, pero tampoco es shove obligatorio a estas bb."
        },
        {
          "title": "J8o CO fold",
          "body": "J8o CO: fold típico. Domina poco, te castigan detrás y postflop duele. Steal no significa \"cualquier dos cartas en late\"."
        }
      ],
      "aiQuestions": [
        "¿Desde qué posiciones stealeo en mid y con qué manos?",
        "¿Qué hago si me 3-betean tras un steal a 25 bb?",
        "¿Por qué no debo esperar pasivo hasta 12 bb?"
      ],
      "spots": "MTT_STEAL",
      "exam": false,
      "id": "T-04",
      "title": "Steal antes de zona corta"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 5,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "A mid stacks, el 3-bet polar (mezcla de manos fuertes por valor y faroles elegidos) aplica presión frente a opens late. No es solo QQ+: también usas blockers y fold equity, sin spew (3-betear basura sin plan).",
      "theory": [
        {
          "title": "Qué significa polar",
          "body": "Polar: tu rango de 3-bet se concentra en value (manos que quieren acción o stack-off) y en faroles con blockers (cartas que quitan al rival combinaciones fuertes), no en manos medias \"ni fu ni fa\". El stack decide si cabe un 3-bet non-all-in o si el spot pide shove."
        },
        {
          "title": "Vs late vs early",
          "body": "Vs open late (CO/BTN) puedes 3-betear más light: su rango es wide y fold equity sube. Vs open early (UTG/HJ) priorizas value: ellos abren tight y pagan o 4-betean más a menudo."
        },
        {
          "title": "Trampa spew",
          "body": "3-betear Q9o \"porque sí\" mid sin fold equity ni blockers útiles es spew. Si no tienes historia clara postflop o plan vs 4-bet, fold o hacer call selectivo — no inventes polaridad falsa."
        }
      ],
      "examples": [
        {
          "title": "JJ value",
          "body": "BTN stealea, tú BB con JJ: 3-bet por valor. Quieres aislar o ir hacia stack-off favorable; no es un farol."
        },
        {
          "title": "A4s polar/farol",
          "body": "Misma situación con A4s: 3-bet polar frecuente. Blocker de as + equity si te pagan; si te 4-betean, a menudo te tiras según stack y rival."
        },
        {
          "title": "Q9o no spew",
          "body": "Q9o vs steal: fold o a veces defensa pasiva — no 3-bet spew. Es mano media, dominada, sin blockers limpios de premium."
        }
      ],
      "aiQuestions": [
        "¿Qué es un 3-bet polar en mid stacks?",
        "¿Cuándo 3-beteo light vs open late?",
        "Dame un ejemplo de 3-bet spew que debo evitar"
      ],
      "spots": "MTT_3BET",
      "exam": false,
      "id": "T-05",
      "title": "3-bet polar mid stacks"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 6,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Resteal: 3-betear (a veces shove) al steal del late para ganar el bote muerto o aislar. Defense: desde ciegas no overfoldeas todo vs robos, pero tampoco overdefiendes basura — eliges fold, hacer call o 3-bet según stack y rival.",
      "theory": [
        {
          "title": "Resteal con intención",
          "body": "Cuando BTN o CO stealea wide, SB/BB pueden restealear: value claro (AK, pares fuertes) y faroles elegidos con blockers. A mid stacks aún cabe 3-bet non-all-in; si el stack se acorta, el resteal se acerca a shove."
        },
        {
          "title": "Defense equilibrada",
          "body": "Defense no es \"pagar todo\". Haces call con manos que juegan bien postflop o tienen odds; 3-beteas polar; foldeas dominadas. Vs UTG open tight, resteal loco es leak — no es un steal wide."
        },
        {
          "title": "Trampas de extremos",
          "body": "Never-defend (tirar casi todo) regala ciegas+ante gratis. Resteal maníaco vs opens early te elimina mid sin necesidad. Busca el medio: castiga steals, respeta ranges tight."
        }
      ],
      "examples": [
        {
          "title": "Resteal vs BTN",
          "body": "BTN open steal a 25 bb, tú BB con A4s o TT: 3-bet (resteal) tiene sentido. Castigas el rango wide y tomas la iniciativa."
        },
        {
          "title": "Fold correcto",
          "body": "CO open, tú BB con 83o: fold. No hay defense heroica con basura; overdefend mid también es spew."
        },
        {
          "title": "No resteal vs UTG",
          "body": "UTG open tight, tú SB con K9o: fold frecuente. Aquí no hay el mismo fold equity que vs un steal de BTN."
        }
      ],
      "aiQuestions": [
        "¿Qué es un resteal y cuándo lo uso?",
        "¿Cómo defiendo ciegas sin overdefender?",
        "¿Por qué no restealeo igual vs UTG que vs BTN?"
      ],
      "spots": "MTT_RESTEAL",
      "exam": false,
      "id": "T-06",
      "title": "Resteal y defense"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 7,
      "plan": "study",
      "xp": 130,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Examen Mid: repasas steal, 3-bet polar y resteal/defense. Sin vocabulario nuevo — checklist de cómo leer el spot mid antes de actuar.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "¿Eres el que abre (steal) o el que responde (defense/resteal)? Mira posición: CO/BTN/SB no son lo mismo, y BB vs steal no es BB vs UTG."
        },
        {
          "title": "Paso 2",
          "body": "Stack en bb mid: ¿cabe open estándar o el spot pide 3-bet/shove? Elige manos con plan si te resuben. Basura: fold. Value y polar limpio: presión."
        },
        {
          "title": "Paso 3",
          "body": "Evita los extremos del examen: passivity total (nunca robar) y spew (3-betear medias sin blockers). Roba late, castiga steals, foldea lo dominado."
        }
      ],
      "examples": [
        {
          "title": "Antes de clicar",
          "body": "Di en una frase el job: \"Steal BTN\", \"3-bet polar BB vs BTN\" o \"fold basura\". Si no puedes nombrarlo, no inventes acción."
        },
        {
          "title": "Señal polar vs spew",
          "body": "A4s vs steal puede ser 3-bet polar. Q9o vs steal casi nunca. El examen premia esa distinción, no la agresión ciega."
        },
        {
          "title": "Checklist rápido",
          "body": "Posición → stack bb → ¿steal o defense? → ¿value, farol limpio o fold? Ejecuta y pasa a la siguiente."
        }
      ],
      "aiQuestions": [
        "Repásame steal vs resteal en mid",
        "¿Qué errores de mid debo vigilar en el examen?"
      ],
      "spots": "MTT_EXAM_M1",
      "exam": true,
      "id": "T-07",
      "title": "Examen Mid · MTT"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 8,
      "plan": "study",
      "xp": 130,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Entre ~20 y 12 bb ya no eres deep: eliges open-raise o shove (ir all-in) según mano, posición y quién queda detrás. Min-raisear manos que deberían ir shove te mete en spots peores.",
      "theory": [
        {
          "title": "Zona de umbrales",
          "body": "En short (aprox. 20–12 bb) aparecen thresholds: algunas manos open a sizing reducido, otras shove directo, el resto fold. Depende de bb exactas, posición y stacks detrás — no de \"me gusta el flop imaginario\"."
        },
        {
          "title": "Por qué no open/fold roto",
          "body": "Abrir flojo y foldear siempre al shove rival es un leak: regalas fold equity y te dejan sin stack. Si la mano no aguanta presión, a menudo era fold pre; si es fuerte, considera shove limpio."
        },
        {
          "title": "Trampa del miedo",
          "body": "Min-raisear AK/99 \"por miedo a ir all-in\" a 14 bb suele ser peor: te comprometes sin maximizar fold equity. En esta zona, commit consciente > open tímido."
        }
      ],
      "examples": [
        {
          "title": "Shove candidato",
          "body": "A5o BTN a ~12 bb: shove candidato frecuente. Open pequeño te deja mal vs 3-bet; shove toma el dead money o vas a equity."
        },
        {
          "title": "Open aún viable",
          "body": "Algunas manos medias a ~18–20 bb desde BTN aún abren sin shove. La clave es saber qué harás si te resuben — no open automático sin plan."
        },
        {
          "title": "Fold basura",
          "body": "83o a 15 bb: fold. Zona corta no justifica panic open; sin equity ni fold equity real, solo spew."
        }
      ],
      "aiQuestions": [
        "¿Cuándo open y cuándo shove entre 20 y 12 bb?",
        "¿Por qué es malo open flojo y fold al shove?",
        "¿Qué miró además de mi mano en esta zona?"
      ],
      "spots": "MTT_SHORT",
      "exam": false,
      "id": "T-08",
      "title": "Zona 20–12 bb: open/shove"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 9,
      "plan": "study",
      "xp": 140,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "A ~12–8 bb el plan base es push/fold: shove (all-in) o fold según chart y posición. Como en Spins cortos, el open min suele ser un error; quieres fold equity inmediata o ir a equity vs call.",
      "theory": [
        {
          "title": "Push/fold simplifica",
          "body": "Push/fold: o vas all-in o te tiras. Usa charts (menú Rangos / push-fold) como referencia, no como religión ciega: ajusta a rivals que overfolden o overcallen, pero no reinventes opens de cash a 10 bb."
        },
        {
          "title": "Posición ensancha el rango",
          "body": "BTN shoves más wide que CO; SB vs BB tiene dinámica propia. Early positions quedan más tight: hay más gente detrás que puede despertar con value."
        },
        {
          "title": "Trampa open small",
          "body": "Open a 2 bb con 10 bb de stack te deja en tierra de nadie: poco fold equity y commitment accidental. Si el chart dice shove, shove; si dice fold, fold."
        }
      ],
      "examples": [
        {
          "title": "A5o BTN shove",
          "body": "A5o BTN ~10–12 bb: shove candidato. As + fold equity; open min aquí suele ser peor que push/fold limpio."
        },
        {
          "title": "KTs SB",
          "body": "KTs SB corto: shove frecuente. Estás obligado a actuar; el dead money de ciegas/antes justifica presión."
        },
        {
          "title": "99 value shove",
          "body": "99 a 10–12 bb: shove por valor claro. Quieres que paguen peor o que folden; no min-raise \"para ver flop barato\"."
        }
      ],
      "aiQuestions": [
        "¿Cómo uso un chart de push/fold sin robotizarme?",
        "¿Por qué BTN shoves más wide que UTG a 10 bb?",
        "¿Qué error es abrir pequeño a 10 bb?"
      ],
      "spots": "MTT_PUSH",
      "exam": false,
      "id": "T-09",
      "title": "Push/fold 12–8 bb"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 10,
      "plan": "study",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Antes del ICM fino, aprendes a hacer call vs shove mirando chip EV: ¿tienes equity suficiente contra el rango de all-in para que el call gane fichas a largo plazo? Es la base; luego apretamos con dinero real.",
      "theory": [
        {
          "title": "Chip EV primero",
          "body": "Chip EV (valor esperado en fichas): comparas la equity de tu mano vs el rango de shove con el precio que pagas. Si el call es +EV en fichas, en un mundo sin premios sería automático; en MTT es el suelo sobre el que luego aplicas ICM."
        },
        {
          "title": "Manos y precios",
          "body": "Manos fuertes (TT+, AQ+) suelen pagar shoves cortos. Manos medias dependen de posición, sizing (aquí all-in) y de lo wide que sea el shove. No \"ves flop\": vs shove ya estás en showdown equity."
        },
        {
          "title": "Trampas de extremos",
          "body": "Call light \"para ver\" con basura es spew. Fold panic con AQ vs shove corto también: a veces el chip EV es claramente positivo y el miedo te roba fichas."
        }
      ],
      "examples": [
        {
          "title": "Call claro chip EV",
          "body": "Short shove 10 bb desde BTN, tú BB con AQo: hacer call suele ser +chip EV vs un rango wide. No necesitas ICM aún para ver que es fuerte."
        },
        {
          "title": "Fold chip EV",
          "body": "Mismo shove, tú con J9o: fold. Equity insuficiente vs el rango; \"quiero ver\" no es argumento."
        },
        {
          "title": "Zona gris",
          "body": "AJo vs shove CO a 12 bb puede ser call o fold según lo wide del rival. Entrena el hábito: estima rango → equity → precio, antes de inventar narrativa."
        }
      ],
      "aiQuestions": [
        "¿Qué es chip EV al hacer call vs un shove?",
        "¿Por qué no debo hacer call light \"para ver\"?",
        "¿Cuándo AQ es call claro vs shove corto?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-10",
      "title": "Calling ranges vs shove (chip EV)"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 11,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Con ICM (el valor en dinero real de tus fichas según el payout), hacer call vs shove es más tight que en chip EV puro: el $EV castiga arriesgar tu stack cerca de premios. Overfold (foldear de más vs chip EV) es a menudo correcto.",
      "theory": [
        {
          "title": "De fichas a dinero",
          "body": "$EV (valor esperado en dinero de torneo) no es lo mismo que chip EV. Doblar fichas no duplica tu prize esperado; quedarte fuera cerca de la burbuja o de un pay jump duele más que \"perder un pot\" en cash."
        },
        {
          "title": "Calls más tight",
          "body": "Manos que eran call claros en fichas pueden ser fold en $EV si hay muchos shorts que pueden eliminarse o si tú eres mid vs cover. Pregunta: ¿este call mejora mi dinero esperado o solo mi ego de equity?"
        },
        {
          "title": "Honestidad",
          "body": "Usamos principios ICM, no un cálculo exacto de field completo. Si internalizas \"cerca de premios, paga menos light\", ya evitas el leak más caro del módulo."
        }
      ],
      "examples": [
        {
          "title": "Overfold correcto",
          "body": "Burbuja, tú mid 18 bb, big shove 22 bb con cobertura: AJo que era call chip EV puede ser fold $EV. Dejas que otros se eliminen."
        },
        {
          "title": "Aún pagas value",
          "body": "ICM no significa fold forever. JJ vs shove corto sigue siendo call en casi todos los spots razonables: el value es demasiado fuerte."
        },
        {
          "title": "Contraste mental",
          "body": "Entrena la frase: \"+EV chips, −EV dinero → fold\". Si no puedes decir por qué el ICM aprieta, no uses ICM como excusa para foldear premiums."
        }
      ],
      "aiQuestions": [
        "¿Por qué el ICM hace los calls más tight?",
        "¿Cuándo overfoldear vs shove es correcto?",
        "¿Chip EV y $EV pueden discrepar en el mismo spot?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-11",
      "title": "Calling ranges con ICM"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 12,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Short: repasas zona 20–12, push/fold y calls vs shove (chip EV e ICM básico). Sin teoría nueva — checklist de cómo revisar cada decisión short.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Cuenta bb: ¿20–12 (open/shove thresholds) o 12–8 (push/fold)? La herramienta cambia. No juegues 10 bb como si tuvieras 40."
        },
        {
          "title": "Paso 2",
          "body": "Si abres: ¿open, shove o fold? Si te shovena: ¿call por chip EV o ya aprieta el ICM? Nombra el criterio antes de clicar."
        },
        {
          "title": "Paso 3",
          "body": "Evita open small basura, panic shove 62o y call light \"porque equity\". En short, la disciplina de umbrales vale más que la creatividad."
        }
      ],
      "examples": [
        {
          "title": "Pregunta ancla",
          "body": "Antes de cada mano del examen: \"¿Qué zona de bb estoy?\" Si no lo sabes, no elijas sizing de cash."
        },
        {
          "title": "Vs shove",
          "body": "Primero chip EV mental; luego, si hay olor a burbuja o pay jump, aprieta el call. El examen premia ese orden, no adivinar."
        },
        {
          "title": "Señal de leak",
          "body": "Si min-raiseas a 9 bb \"para ver\", corrige en caliente: push/fold o fold — no tierra de nadie."
        }
      ],
      "aiQuestions": [
        "Repásame open/shove vs push/fold",
        "¿Cómo decido call vs shove en el examen short?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-12",
      "title": "Examen Short · MTT"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 13,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En burbuja (bubble) cada rol tiene un plan distinto: el big stack presiona, el mid sobrevive y el short busca spots de ladder (subir peldaños de payout). Identificar tu rol vale más que enamorar una mano concreta.",
      "theory": [
        {
          "title": "Tres roles, tres jobs",
          "body": "Big: aplica presión y fuerza folds ICM. Mid: evita coin flips grandes vs covers; deja que los shorts se eliminen. Short: necesita doble o robos selectivos, no min-raise suicida."
        },
        {
          "title": "ICM en burbuja",
          "body": "El ICM (valor en dinero real según payout) está en máximo dramático: un call malo te saca sin cobrar mientras otros entran ITM (in the money). Por eso los mids overfoldean vs bigs más que en chip EV."
        },
        {
          "title": "Trampa de rol confuso",
          "body": "Mid que hero-callea al big \"porque tengo equity\" es el leak clásico de burbuja. Juega tu job, no el del short desesperado ni el del cover rico en fichas."
        }
      ],
      "examples": [
        {
          "title": "Big presiona",
          "body": "Cover 50 bb abre wide vs mids a 20 bb: ellos no pueden defender todo. La presión es open/shove selectivo, no call light a shorts."
        },
        {
          "title": "Mid sobrevive",
          "body": "Mid 18 bb foldea A9o vs shove del big en burbuja. Doloroso en fichas, a menudo correcto en $EV."
        },
        {
          "title": "Short pick spot",
          "body": "Short 9 bb espera BTN/SB o un fold equity claro; no shoves UTG basura solo por pánico."
        }
      ],
      "aiQuestions": [
        "¿Cómo sé si soy short, mid o big en burbuja?",
        "¿Qué debe hacer cada rol?",
        "¿Por qué el mid overfoldea vs el big?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-13",
      "title": "Roles en burbuja (short/mid/big)"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 14,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Como big stack en burbuja, abres y shoves más para aplicar presión ICM: haces que los mids se tiren. Presión no significa hacer call light a los shorts — no regalas dobles fáciles sin fold equity.",
      "theory": [
        {
          "title": "Presión ≠ pagar todo",
          "body": "Tu arma es el fold equity: opens wide, 3-bets y shoves que ponen a los mids en dilemas $EV. Si el short ya está all-in, tú decides con rango; \"porque puedo\" no es razón para pagar basura."
        },
        {
          "title": "Aislar y castigar",
          "body": "Busca spots donde el mid no puede defenderse: late position, stacks que temen eliminarse. Castiga overfolds; no te suicides en flips innecesarios vs otro cover."
        },
        {
          "title": "Trampa del cover generoso",
          "body": "Pagar shove light del short \"para eliminarlo\" puede ser −$EV si tu call es flojo: le das vida barata o te expones sin necesidad. Eliminar con buena mano, no con ego."
        }
      ],
      "examples": [
        {
          "title": "Steal de cover",
          "body": "Tú 55 bb BTN, mids 20 bb en ciegas: steal wide. Ellos foldean de más; tú recoges antes y ciegas sin showdown."
        },
        {
          "title": "Fold con cover",
          "body": "Short shove 11 bb, tú BB con KTo: a menudo fold. No necesitas ese flip; tu presión futura vale más."
        },
        {
          "title": "Value cuando toca",
          "body": "Mismo shove, tú con JJ: call/shove claro. Big stack tampoco foldea la joyería — solo deja de spew calls medios."
        }
      ],
      "aiQuestions": [
        "¿Cómo presiono siendo big stack sin spew?",
        "¿Por qué no pago light al short solo por eliminarlo?",
        "¿Qué spots de mid son más explotables?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-14",
      "title": "Big stack pressure"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 15,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Mid stack en burbuja: prioridad no chocarte con el big stack. Sobrevives dejando que los shorts se eliminen; evitas spots −$EV aunque sean +chip EV. Pick spots claros, no open spew vs covers.",
      "theory": [
        {
          "title": "Fold equity baja vs big",
          "body": "Vs un cover, tus robos se respetan menos y tus calls duelen más: él puede eliminarte y tú no le haces el mismo daño ICM. Por eso mid survival = menos guerras vs el chip leader."
        },
        {
          "title": "Deja que el short se juegue",
          "body": "Si hay shorts por debajo, cada órbita que sobreviven sin chocarte mejora tu ladder esperado. No hace falta ser el héroe que elimina a todos a la fuerza."
        },
        {
          "title": "Trampa open spew",
          "body": "Open flojo mid vs big a tu izquierda es invitar al resteal ICM. Preferible folds o manos con plan claro; la paciencia aquí es skill, no pasividad ciega vs todos."
        }
      ],
      "examples": [
        {
          "title": "Fold $EV",
          "body": "Big shove 25 bb, tú mid 20 bb con AJo: fold frecuente en burbuja. Chip EV puede gustar; $EV a menudo no."
        },
        {
          "title": "Spot vs short",
          "body": "Short 8 bb shove a tu BB, tú mid con AQo: más dispuesto a pagar — el ICM vs short duele menos que vs cover."
        },
        {
          "title": "No spew open",
          "body": "CO mid, big en BTN: K9o a menudo fold. Abrir para que el cover te meta presión es regalarte un dilema."
        }
      ],
      "aiQuestions": [
        "¿Por qué el mid sobrevive en burbuja?",
        "¿Cuándo sí hago call siendo mid?",
        "¿Qué opens evito vs el big stack?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-15",
      "title": "Mid stack survival"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 16,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Short stack en burbuja: necesitas ladder (subir un peldaño de payout) con shoves selectivos y timing. No min-raise suicida ni panic shove UTG con basura — elige spots con fold equity o equity decente.",
      "theory": [
        {
          "title": "Doble con criterio",
          "body": "Sí, necesitas fichas; no, no cualquier mano en cualquier asiento. Prioriza late position, folds delante y rivales mid que overfoldean por ICM. UTG basura es el antitexto."
        },
        {
          "title": "Ladder mental",
          "body": "Cada eliminación ajena te acerca a cobrar o a un salto. A veces fold + esperar un mejor spot sube más tu $EV que un flip feo ahora. Equilibra urgencia de ciegas con calidad del spot."
        },
        {
          "title": "Trampa panic",
          "body": "Shove panic porque \"me comen las ciegas\" con 93o UTG suele ser −EV en ambos mundos. Si estás muerto de fichas, al menos elige manos con blockers o equity real."
        }
      ],
      "examples": [
        {
          "title": "Shove late",
          "body": "9 bb BTN, folds delante, A5o: shove selectivo típico. Fold equity vs mids + equity si te pagan."
        },
        {
          "title": "Fold UTG",
          "body": "9 bb UTG, J8o: fold. Aunque estés short, este spot no laddera — solo spew."
        },
        {
          "title": "Timing vs cover",
          "body": "Big en BB que paga light: aprieta tu rango de shove. Mid en BB que overfoldea: puedes ir más wide. Lee el rol, no solo el chart estático."
        }
      ],
      "aiQuestions": [
        "¿Cómo elijo spots de shove siendo short en burbuja?",
        "¿Qué es el ladder en payout?",
        "¿Por qué no panic shove desde UTG?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-16",
      "title": "Short stack ladder"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 17,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Tras el ITM (ya cobras algo), los pay jumps (saltos de premio entre puestos) siguen importando: no \"ya estoy pagado, all-in light\". El ICM continúa; cada eliminación puede subir tu prize.",
      "theory": [
        {
          "title": "ITM no apaga el ICM",
          "body": "Cobrar el mínimo no iguala tu $EV al chip EV. Entre el min-cash y la mesa final hay escalones: arriesgar stack light regala jumps a otros. Sigue pensando roles y covers."
        },
        {
          "title": "Ajusta la agresión",
          "body": "Puedes abrir más que en burbuja extrema, pero no spew post-bubble. Los jumps grandes (cerca de FT o de pagos altos) aprietan otra vez los calls y los flips innecesarios."
        },
        {
          "title": "Trampa \"ya cobré\"",
          "body": "Mentalidad de spew tras el min-cash es leak caro: conviertes un buen resultado en mediocre. Celebra el ITM fuera de la mesa; dentro, sigue el plan de saltos."
        }
      ],
      "examples": [
        {
          "title": "Jump cerca",
          "body": "Quedan 12, pagan fuerte de 9 en adelante: mid vs big shove con AJo puede ser fold otra vez. El jump importa más que el min-cash ya asegurado."
        },
        {
          "title": "Presión razonable",
          "body": "Cover post-ITM puede robar a mids que aún temen saltos. Misma lógica de burbuja, algo menos extrema."
        },
        {
          "title": "No flip gratis",
          "body": "Dos mids con stacks similares cerca de un salto grande: evita coin flip marginal. Espera un mejor edge o un short que se elimine."
        }
      ],
      "aiQuestions": [
        "¿Por qué el ICM sigue tras el ITM?",
        "¿Qué es un pay jump y cómo cambia mis calls?",
        "¿Qué leak evita la mentalidad \"ya estoy pagado\"?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-17",
      "title": "Pay jumps post-ITM"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 18,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Bubble: repasas roles short/mid/big, presión, supervivencia y ladder. Sin teoría nueva — checklist de cómo revisar cada spot de burbuja.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "¿Soy short, mid o big? Clasifica stacks en bb relativos a la mesa. Si no sabes tu rol, no elijas línea: el job cambia la respuesta correcta."
        },
        {
          "title": "Paso 2",
          "body": "¿Presiono o sobrevivo? Big → presión con fold equity. Mid → evita covers, pick spots. Short → shove selectivo, no panic. Nombra el job en una frase."
        },
        {
          "title": "Paso 3",
          "body": "Separar chip EV de $EV: si el spot es +fichas y −dinero, fold suele ganar el examen. No hero-call de mid vs big \"por equity\"."
        }
      ],
      "examples": [
        {
          "title": "Ancla de rol",
          "body": "Antes de cada mano: \"Soy mid, big a la izquierda, short debajo\". Esa frase evita el 50 % de leaks de burbuja."
        },
        {
          "title": "Señal de spew",
          "body": "Si siendo mid pagas shove del cover con mano media, párate. El examen castiga ese heroísmo."
        },
        {
          "title": "Checklist rápido",
          "body": "Rol → presión/supervivencia/ladder → ¿ICM aprieta? → actúa. Sin vocabulario nuevo, solo aplicación."
        }
      ],
      "aiQuestions": [
        "Repásame los tres roles de burbuja",
        "¿Qué errores ICM debo evitar en el examen?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-18",
      "title": "Examen Bubble"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 19,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En final table (FT) el ICM se intensifica: pay jumps grandes, covers que aplastan y shorts extremos. Los principios de burbuja escalan — no prometemos un solver completo de FT, sí un mapa mental usable.",
      "theory": [
        {
          "title": "FT = ICM a máximo volumen",
          "body": "Los saltos entre puestos de FT suelen ser enormes. Covers presionan; mids cuidan stacks; shorts pick spots. Un flip mal elegido destroza horas de torneo en un click."
        },
        {
          "title": "Covers y malas estructuras",
          "body": "Si un chip leader tiene covers sobre varios, puede abrir muy wide. Si tú eres mid con otro mid similar, a menudo preferís que el short se elimine antes de chocaros."
        },
        {
          "title": "Límite honesto",
          "body": "No calculamos ICM de 9-handed exacto en cada mano. Si aplicas roles + jumps + \"no spew vs cover\", ya juegas FT por encima del recreativo medio."
        }
      ],
      "examples": [
        {
          "title": "Cover FT",
          "body": "Chip leader 80 bb vs mesa de 15–25 bb: steal y presión constantes. Los mids no pueden despertar con medias."
        },
        {
          "title": "Dos mids",
          "body": "Dos stacks 22 bb, short 6 bb: ambos evitan all-in mutuo hasta que el short se juegue. Ladder compartido."
        },
        {
          "title": "Short FT",
          "body": "Short 7 bb espera fold equity en late; no open min. Misma lección de ladder, con jumps más caros."
        }
      ],
      "aiQuestions": [
        "¿Qué cambia el ICM en final table vs burbuja?",
        "¿Cómo deben actuar cover, mid y short en FT?",
        "¿Por qué dos mids evitan chocarse con un short vivo?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-19",
      "title": "Final table ICM intro"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 20,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Entrenas a separar \"gano fichas\" (chip EV) de \"gano dinero de torneo\" ($EV). Si el spot es +EV en chips y −EV en dinero — típico en burbuja/FT — fold es a menudo correcto; no idolatres solo la equity.",
      "theory": [
        {
          "title": "Dos respuestas posibles",
          "body": "Ante un shove, puedes tener call chip EV y fold $EV. El drill es verbalizar ambas: \"En fichas pago; en dinero me tiro porque…\" Sin esa frase, confundes valentía con spew."
        },
        {
          "title": "Cuándo coinciden",
          "body": "Premiums fuertes y spots vs shorts desesperados suelen alinear chip EV y $EV: pagas. La discrepancia aparece en medias vs covers cerca de jumps."
        },
        {
          "title": "Trampa equity-only",
          "body": "\"Tengo 35 % y el precio es 30 %\" no cierra el caso en MTT. El prize risk puede hacer que ese 5 % de edge en fichas sea −$EV. Equity es input, no veredicto."
        }
      ],
      "examples": [
        {
          "title": "Discrepancia clásica",
          "body": "Burbuja, mid vs big shove, AJo: call chip EV / fold $EV. El drill correcto nombra las dos lecturas y elige dinero."
        },
        {
          "title": "Alineación",
          "body": "TT vs shove short 10 bb en FT: call en ambos marcos. No uses ICM para foldear la joyería."
        },
        {
          "title": "Frase de entrenamiento",
          "body": "Di en voz alta: \"+chips −$ → fold; +ambos → call; −ambos → fold\". Si no encaja, reestima rango y rol."
        }
      ],
      "aiQuestions": [
        "¿Cómo separo chip EV de $EV en un call vs shove?",
        "¿Cuándo coinciden y cuándo discrepan?",
        "Dame un ejemplo +chip EV y −$EV"
      ],
      "spots": [],
      "exam": false,
      "id": "T-20",
      "title": "Chip EV vs $EV drills"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 21,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En burbuja/FT asignas rangos de shove y de call según rol y stack, no solo según \"tu mano te gusta\". Range reading: qué shoves este short, qué paga este mid, qué foldea este big — luego encajas tu combo.",
      "theory": [
        {
          "title": "Preguntas de rango",
          "body": "Antes de actuar: ¿qué % shoves este short desde BTN? ¿Este mid overfoldea vs cover? ¿El big paga light por ego? Esas respuestas definen si tu mano es value, bluff-catcher malo o fold automático."
        },
        {
          "title": "No leas como cash deep",
          "body": "Hand-reading de cash a 100 bb (líneas multi-street, sizes raros) no es el job aquí. En burbuja priorizas stack, rol e ICM: rangos de push/call polarizados, no pot control fancy."
        },
        {
          "title": "Trampa combo-centrismo",
          "body": "Enamorarte de KJo sin preguntar el rango rival es leak. La misma KJo es call vs short wide y fold vs cover tight en burbuja. El combo es el último paso, no el primero."
        }
      ],
      "examples": [
        {
          "title": "Short wide",
          "body": "Short 8 bb BTN shove: rango amplio (Ax, broadways, suited). Tu A9o en BB mid gana más peso de call que vs un shove UTG desesperado pero más tight."
        },
        {
          "title": "Mid overfold",
          "body": "Estimás que el mid foldea todo menos QQ+ vs tu shove de cover: puedes ir más wide. Si paga ATo+, aprietas value."
        },
        {
          "title": "Big ego-call",
          "body": "Cover que odia foldear: no bluff-shoves light contra él; value más limpio. Lee tendencias de rol + player type."
        }
      ],
      "aiQuestions": [
        "¿Qué preguntas hago para leer rangos en burbuja?",
        "¿Por qué no sirvo el hand-reading de cash deep aquí?",
        "¿Cómo cambia KJo vs short wide o vs cover?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-21",
      "title": "Range reading en burbuja"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 22,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Pro MTT: certificación de fases, short/push, burbuja e ICM de FT. Sin teoría nueva — checklist de cómo revisar spots de torneo de punta a punta.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Fase y bb: early/mid/short/push/bubble/FT. Si fallas la fase, fallas el sizing y el rol. Ancla stack en bb antes de la mano."
        },
        {
          "title": "Paso 2",
          "body": "Rol y job: ¿robo, presión de cover, supervivencia mid, ladder short? Resume bubble roles en una frase y aplícalos también en FT con jumps mayores."
        },
        {
          "title": "Paso 3",
          "body": "Chip EV vs $EV en una frase: si discrepan cerca de premios, prioriza dinero. No spew calls medios vs covers; no foldees premiums claros vs shorts."
        }
      ],
      "examples": [
        {
          "title": "Certificación mental",
          "body": "Antes del pack: \"Fase → rol → ¿chips o dinero?\". Esa tríada es la rúbrica del examen Pro."
        },
        {
          "title": "Resume roles",
          "body": "Big presiona, mid sobrevive, short ladder. Si tu línea contradice el rol sin motivo, corrige."
        },
        {
          "title": "Frase $EV",
          "body": "Practica: \"Call chip EV, fold $EV → me tiro\". Si no puedes decirlo, no uses ICM como muletilla."
        }
      ],
      "aiQuestions": [
        "Repásame el checklist Pro: fase, rol y $EV",
        "¿Cómo resumo bubble roles en una frase?",
        "¿Qué errores matan una certificación MTT?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-22",
      "title": "Examen Pro · MTT"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-data-ranges.js — Fase I: laboratorio R-01…R-06
 * Menú Escuela: admin-only (SCHOOL_PUBLIC=false).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  
  function spinCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mttCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }
  function packSpots(kind, D) {
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN a ~20 bb: steal/open claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['5h', '2s'], 40102, { trapTag: 'dominated', teachBack: '52o: fold. No stealees basura total.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB: open/steal razonable a 20 bb.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['9s', '6c'], 40104, { trapTag: 'fancy_play', teachBack: '96o SB: a menudo fold — no eres BTN.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['Ts', 'Tc'], 40105, { teachBack: 'TT BTN: shove claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['9c', '7c'], 40106, { teachBack: '97s BTN: steal razonable con jugabilidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['Ah', 'Jh'], 40201, { teachBack: 'AJs vs steal BTN: 3-bet/value claro.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['Ts', '6c'], 40202, { trapTag: 'dominated', teachBack: 'T6o: fold. No overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJo vs SB steal: defensa razonable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '8d'], 40204, { teachBack: 'A8s: 3-bet farol/pressure frecuente vs BTN.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['9d', '7h'], 40205, { trapTag: 'fancy_play', teachBack: '97o: fold típico vs steal — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['Jh', 'Jc'], 40206, { teachBack: 'JJ vs SB: 3-bet o continue sólido.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 3).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 3));
    if (kind === 'SPIN_ISO') return [
      bb('s04-01', ['Ah', 'Js'], 40401, { teachBack: 'AJo BB vs limp SB: iso.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-02', ['Jd', '3h'], 40402, { trapTag: 'dominated', teachBack: 'J3o: check. No overiso.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQo SB vs limp BTN: iso value.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-04', ['Jh', '8d'], 40404, { trapTag: 'fancy_play', teachBack: 'J8o: check frecuente.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH' || kind === 'SPIN_EXAM_M1') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs corto: shove/open shove candidato.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['Kd', '6s'], 40502, { trapTag: 'dominated', teachBack: 'K6o: fold. No panic shove.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJo SB corto: shove frecuente.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['Jh', 'Jc'], 40504, { teachBack: 'JJ: shove value claro a 10–12 bb.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo BTN early: open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['9s', '6c'], 50102, { trapTag: 'dominated', teachBack: '96o UTG early: fold. Paciencia.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO: open estándar early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['Qs', 'Jh'], 50104, { trapTag: 'dominated', teachBack: 'QJo: fold. No spew early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['7s', '7c'], 50105, { teachBack: '77 BTN: open claro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['7s', '6s'], 50106, { trapTag: 'fancy_play', teachBack: '76s HJ early: a menudo fold — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 4);
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Qd', 'Tc'], 50401, { teachBack: 'QTo BTN mid: steal razonable.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['Qc', '2h'], 50402, { trapTag: 'dominated', teachBack: 'Q2o: fold.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '3s'], 50403, { teachBack: 'A3s CO: steal/open OK mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB: open/steal frecuente.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['7h', '6h'], 50406, { teachBack: '76s BTN: steal con jugabilidad.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['Jh', 'Jd'], 50501, { teachBack: 'JJ: 3-bet value vs steal.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['Th', '7c'], 50503, { trapTag: 'dominated', teachBack: 'T7o: fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 2).concat(packSpots('MTT_3BET', D).slice(0, 2));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '2h'], 50901, { teachBack: 'A2s BTN a ~10–12 bb: shove candidato.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['Jc', '8d'], 50902, { trapTag: 'dominated', teachBack: 'J8o: fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['Jh', 'Jc'], 50904, { teachBack: 'JJ: shove value.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) })
    ];
    return [];
  }
  function resolveSpots(lesson, D) {
    if (typeof lesson.spots === 'string') lesson.spots = packSpots(lesson.spots, D);
    return lesson;
  }

  if (D.setRouteStatus) {
    D.setRouteStatus('ranges', 'active');
    if (D.ROUTES && !D.ROUTES.some(function (r) { return r.id === 'ranges'; })) {
      D.ROUTES.push({ id: 'ranges', label: 'Rangos', status: 'active' });
    }
  }
  var RAW = [
    {
      "route": "ranges",
      "module": "M0",
      "order": 0,
      "plan": "free",
      "xp": 40,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Antes de memorizar un open, aprende a leer la matriz 13×13 del menú Rangos: cada celda es una mano y el color o el % te dice con qué frecuencia se juega.",
      "theory": [
        {
          "title": "Qué es la matriz",
          "body": "La matriz (o range chart) es una cuadrícula de 13 filas × 13 columnas con los ranks de A a 2. Cada celda representa una combinación de dos cartas. Ábrela en el menú Rangos de la app: ahí verás RFI, defensa y más por posición, no solo un dibujo estático."
        },
        {
          "title": "Suited, offsuit y pares",
          "body": "Los pares (AA, KK… 22) viven en la diagonal. Las manos suited (mismo palo, p. ej. AKs) suelen estar a un lado de la diagonal; las offsuit (palos distintos, AKo) al otro. Localiza primero AA y 72o: si no sabes dónde caen, aún no “lees” el chart."
        },
        {
          "title": "Frecuencias, no solo sí/no",
          "body": "Un color o un porcentaje en la celda indica frecuencia: no todo es “siempre open” o “nunca”. Una mano al 40 % se mezcla (a veces se juega, a veces no). Compara RFI BTN con RFI UTG en el menú Rangos: el botón es mucho más wide (más manos)."
        }
      ],
      "examples": [
        {
          "title": "Localizar tres celdas",
          "body": "En el menú Rangos, RFI BTN: encuentra 99 (diagonal), ATs (suited) y KJo (offsuit). Si las tres te salen a la primera, ya orientas la matriz."
        },
        {
          "title": "BTN vs UTG a simple vista",
          "body": "Mismo chart tipo RFI: UTG tiene pocas celdas “encendidas”; BTN muchas más. El mensaje del profesor: posición late = rango más ancho, no “cualquier dos”."
        },
        {
          "title": "Leer un %",
          "body": "Si K9s aparece al 65 %, no es “siempre open”: en dos de cada tres veces se abre y en una se fold. El chart habla en frecuencias, no en absolutos."
        }
      ],
      "aiQuestions": [
        "¿Dónde están los pares en la matriz 13×13?",
        "¿Qué diferencia visual ves entre RFI BTN y RFI UTG en el menú Rangos?",
        "¿Qué significa un porcentaje en una celda?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-01",
      "title": "Leer un range chart 13×13"
    },
    {
      "route": "ranges",
      "module": "M0",
      "order": 1,
      "plan": "study",
      "xp": 70,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Construir el RFI del botón en sesenta segundos no es memorizar píxeles: es tener bandas mentales (pares, broadway, suited connectors) y luego contrastarlas con el menú Rangos.",
      "theory": [
        {
          "title": "Qué es RFI BTN",
          "body": "RFI (raise first in) es subir primero el bote cuando nadie ha entrado. Desde BTN (botón) tu rango de open es el más wide de las posiciones late: muchas manos tienen fold equity (posibilidad de que todos tiren) y, si hacen call, juegas el flop en posición."
        },
        {
          "title": "Bandas en 60 segundos",
          "body": "Cronómetro: di en voz alta categorías, no celdas sueltas. Ejemplo de mapa: 22+, A2s+, ATo+, K9s+, KTo+, QTs+, J9s+, T8s+, 98s–65s, y algunas suited gapers. Luego abre el menú Rangos y marca qué te faltó o qué sobró."
        },
        {
          "title": "Trampa del “cualquier dos”",
          "body": "Wide no significa limpear (igualar la ciega grande para entrar) ni openear 93o “porque soy botón”. El objetivo es un mapa usable bajo presión, no un permiso para spew. Si no puedes nombrar bandas, no tienes rango: solo intuición."
        }
      ],
      "examples": [
        {
          "title": "Drill de un minuto",
          "body": "Cierra los ojos: “Pares todos; ases suited casi todos; broadway offsuit selectivo; conectores suited medios.” Abre el chart RFI BTN y anota tres manos que olvidaste."
        },
        {
          "title": "Contraste con CO",
          "body": "Repite el drill para CO: verás menos manos (más tight). Si tu mapa mental BTN y CO son idénticos, aún no discriminas por posición."
        },
        {
          "title": "Manos frontera",
          "body": "K9o, Q8s, 54s: ¿dentro o fuera de tu banda BTN? Decide en cinco segundos y comprueba el % en el menú Rangos. Ahí se entrena el borde del rango, no solo el centro."
        }
      ],
      "aiQuestions": [
        "¿Qué bandas nombrarías en 60 s para RFI BTN?",
        "¿Por qué wide en BTN no autoriza openear basura total?",
        "¿Cómo usas el menú Rangos después del drill mental?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-02",
      "title": "Construir RFI BTN en 60 s"
    },
    {
      "route": "ranges",
      "module": "M0",
      "order": 2,
      "plan": "study",
      "xp": 80,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Dado un flop, estima qué porcentaje del rango rival conectó pareja, proyecto o aire: la textura decide la ventaja de rango y, con ella, tu plan de c-bet.",
      "theory": [
        {
          "title": "Conectar un board",
          "body": "“Qué % del rango conecta” pregunta cuántas combinaciones del rango preflop mejoraron a pareja, dos pares, trío, straight/flush draw, etc. No hace falta un solver: piensa en categorías. Un rango BTN wide en K♠7♦2♣ rainbow conecta top pair menos que en J♥T♥9♦."
        },
        {
          "title": "Textura y range advantage",
          "body": "La textura (seco, wet, monotone) cambia quién “encaja” mejor. Range advantage (ventaja de rango) significa que tu distribución de manos fuertes supera a la del rival en ese board. En A-high seco el agresor RFI suele tener ventaja; en bajos conectados el caller recupera mucho."
        },
        {
          "title": "Enlace con el c-bet",
          "body": "Si tu rango conecta más (o el rival falla más), el c-bet (apuesta de continuación tras haber subido preflop) tiene más sentido, a menudo a sizing pequeño. Si el board favorece al que solo hizo call, reduces frecuencia y cedes más. Enlace directo con Cash M2 (C-14…C-16)."
        }
      ],
      "examples": [
        {
          "title": "BTN wide en K72r",
          "body": "Rango de open BTN vs BB. Flop K♠7♦2♣: muchas manos del BB fallan; tú tienes Ax, Kx y overpairs. Estimas: rival conectó poco → c-bet frecuente."
        },
        {
          "title": "Mismo rango en JT9",
          "body": "Flop J♥T♠9♦: el BB con suited connectors y broadway media conecta draws y pares fuertes. Tu ventaja se reduce → menos autocbet, más selectividad."
        },
        {
          "title": "Pregunta de profesor",
          "body": "Antes de pulsar bet: “¿Este board ayuda más a mi rango de agresor o al de defensa?” Si no sabes responder, aún no estimaste el % que conectó."
        }
      ],
      "aiQuestions": [
        "¿Cómo cambia el % que conecta un rango wide entre K72r y JT9?",
        "¿Qué es range advantage en una frase?",
        "¿Cómo enlazas esa estimación con tu frecuencia de c-bet?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-03",
      "title": "Qué % del rango conecta un board"
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 3,
      "plan": "coach",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Tus cartas quitan combinaciones del rango rival: eso son blockers. Contar qué combos eliminas cambia cuándo faroleas y cuándo haces call con bluff-catchers.",
      "theory": [
        {
          "title": "Blockers = eliminación de combos",
          "body": "Un combo es una combinación concreta (p. ej. A♠K♥). Si tú tienes el A♠, el rival ya no puede tener AA con ese as ni AKs del palo de picas. Blockers (bloqueadores) son tus cartas vistas que reducen las manos fuertes o los bluff-catchers del villano."
        },
        {
          "title": "Faroles con buen blocker",
          "body": "Por eso Axs (as suited) aparece mucho como farol de 3-bet o de river: bloqueas AA y AKx del mismo palo y a menudo tienes equity de respaldo. Antes de farolear, pregunta: “¿qué combos de value quito? ¿qué bluff-catchers dejo vivos?”"
        },
        {
          "title": "Trampa sin blockers",
          "body": "Farolear river en boards pesados sin blocker de nuts (la mejor mano posible) es spew frecuente: dejas intactas las manos que te pagan y las que te ganan. Practica en voz alta: “quito X, no quito Y” antes de meter fichas."
        }
      ],
      "examples": [
        {
          "title": "3-bet farol con A5s",
          "body": "Vs open BTN, A♠5♠: bloqueas AA y muchos AKo/AKs de picas. El farol tiene historia; K9o offsuit no bloquea lo mismo y suele ser peor candidato (enlace con C-08)."
        },
        {
          "title": "River: as de picas en board de color",
          "body": "Board con tres picas; tú tienes A♠x sin color. Bloqueas la nuts de color: a veces farol o semi-farol tiene más sentido que con 7♦6♣, que no bloquea nada relevante."
        },
        {
          "title": "Bluff-catcher y blockers",
          "body": "Con Kx en un river donde el rival apuesta polar, tener el as del palo del flush posible puede justificar hacer call: reduces combos de color value y dejas más faroles en su rango."
        }
      ],
      "aiQuestions": [
        "¿Qué combos quita A♠X del rango rival?",
        "¿Por qué Axs es farol frecuente de 3-bet?",
        "¿Qué pregunta te haces antes de farolear un river?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-04",
      "title": "Eliminación de combos (blockers)"
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 4,
      "plan": "coach",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Tras una línea (open, call, check, bet…), no pongas al rival en “una mano”: reduce su rango a una historia creíble de value, medias y aire.",
      "theory": [
        {
          "title": "Cada acción elimina manos",
          "body": "Asignar rango es ir capeando (recortando) combinaciones imposibles. Quien hace open RFI no tiene 72o. Quien hace call a un 3-bet grande rara vez tiene aire puro. Quien check-raisea flop polariza: fuertes y faroles, menos medias sticky."
        },
        {
          "title": "Escribe la historia en bandas",
          "body": "Ejercicio de profesor: en el river, lista 2–3 manos tipo de value, 2–3 medias y 2–3 aires que llegan a esa línea. Si solo puedes imaginar la nuts que te gana, estás sesgado. Contrasta con el menú Rangos cuando exista chart del spot."
        },
        {
          "title": "Trampa del “siempre me tiene”",
          "body": "El error clásico es poner al villano siempre en la mano que te gana tras un bet grande. Oblígate a nombrar también faroles y manos medias. Sin aire en su rango, nunca puedes hacer call; sin value, nunca puedes fold — y ambos extremos son sospechosos."
        }
      ],
      "examples": [
        {
          "title": "Línea simple IP",
          "body": "BTN open, BB call, flop check-check, turn bet BTN, river bet. El rango del BTN en river ya no es el RFI entero: se densificó en value y algunos faroles; muchas basuras checkearon atrás en turn."
        },
        {
          "title": "Check-raise en flop",
          "body": "BB check-raisea un c-bet en board seco. Historia típica: sets, dos pares, a veces faroles con blockers. QJ sin pareja queda fuera del value; no digas “me tiene AK” sin mirar la línea."
        },
        {
          "title": "Drill de tres columnas",
          "body": "Papel: Value | Medias | Aire. Rellena tras narrar la línea en voz alta. Si una columna está vacía, tu asignación es incompleta."
        }
      ],
      "aiQuestions": [
        "¿Qué manos elimina un check-raise de flop del rango “solo call”?",
        "¿Cómo evitas poner al rival siempre en la nuts?",
        "¿Qué tres columnas usas para describir un rango en river?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-05",
      "title": "Asignar rango rival tras una línea"
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 5,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En un nodo GTO las acciones suelen mezclarse: bet 70 / check 30 no es indecisión, es frecuencia. Entender el mix te evita exigir “siempre” o “nunca”.",
      "theory": [
        {
          "title": "Frecuencias de nodo",
          "body": "Un nodo es un punto de decisión (p. ej. c-bet flop IP en A72r). GTO (game theory optimal) asigna frecuencias: la misma mano o el mismo rango puede apostar a veces y checkear otras. El chart del menú Rangos o del solver habla en %; tú en mesa eliges una acción concreta."
        },
        {
          "title": "Node locking mental",
          "body": "Node locking mental es decirte: “aquí el mix sano es ~70 % bet / 30 % check” aunque en esta mano ejecutes solo una línea. Sirve para no tiltar cuando el chart “a veces checkea” con una mano que tú siempre apostarías, y para no rigidizar spots que el solver mezcla."
        },
        {
          "title": "Trampa del 100 % o 0 %",
          "body": "Exigir pure strategies (siempre bet o siempre check) en todos los spots te pelea con el mix. En live/online eliges una acción; en estudio respetas que el equilibrio a menudo es frecuencia. Enlace natural con C-30 en Pro Cash."
        }
      ],
      "examples": [
        {
          "title": "C-bet 70 / check 30",
          "body": "Flop seco IP: el nodo puede mandar c-bet ~70 %. Tú con KQo apuestas esta mano; la próxima vez similar podrías checkear otra combinación. El estudio enseña el mix; la mesa ejecuta una muestra."
        },
        {
          "title": "Misma mano, dos frecuencias",
          "body": "A5s en un 3-bet: a veces value/pressure, a veces fold vs 4-bet. No es contradicción: son nodos distintos con frecuencias distintas según el tamaño y la posición."
        },
        {
          "title": "Frase de mesa",
          "body": "En vez de “siempre c-bet”, di “aquí c-beteo la mayoría”. Ese lenguaje de frecuencias es el puente entre el laboratorio de rangos y el juego real."
        }
      ],
      "aiQuestions": [
        "¿Qué significa bet 70 / check 30 en un nodo?",
        "¿Para qué sirve el node locking mental si en mesa solo eliges una acción?",
        "¿Por qué es un error exigir 100 % o 0 % en todos los spots?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-06",
      "title": "Node frequencies (pro)"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-data-pro.js — Fase I: Pro Cash C-26…C-31 (Coach)
 * Menú Escuela: admin-only (SCHOOL_PUBLIC=false).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.registerLessons) return;
  
  function spinCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mttCfg(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }
  function packSpots(kind, D) {
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN a ~20 bb: steal/open claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['5h', '2s'], 40102, { trapTag: 'dominated', teachBack: '52o: fold. No stealees basura total.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB: open/steal razonable a 20 bb.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['9s', '6c'], 40104, { trapTag: 'fancy_play', teachBack: '96o SB: a menudo fold — no eres BTN.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['Ts', 'Tc'], 40105, { teachBack: 'TT BTN: shove claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['9c', '7c'], 40106, { teachBack: '97s BTN: steal razonable con jugabilidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['Ah', 'Jh'], 40201, { teachBack: 'AJs vs steal BTN: 3-bet/value claro.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['Ts', '6c'], 40202, { trapTag: 'dominated', teachBack: 'T6o: fold. No overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJo vs SB steal: defensa razonable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '8d'], 40204, { teachBack: 'A8s: 3-bet farol/pressure frecuente vs BTN.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['9d', '7h'], 40205, { trapTag: 'fancy_play', teachBack: '97o: fold típico vs steal — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['Jh', 'Jc'], 40206, { teachBack: 'JJ vs SB: 3-bet o continue sólido.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 3).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 3));
    if (kind === 'SPIN_ISO') return [
      bb('s04-01', ['Ah', 'Js'], 40401, { teachBack: 'AJo BB vs limp SB: iso.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-02', ['Jd', '3h'], 40402, { trapTag: 'dominated', teachBack: 'J3o: check. No overiso.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQo SB vs limp BTN: iso value.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-04', ['Jh', '8d'], 40404, { trapTag: 'fancy_play', teachBack: 'J8o: check frecuente.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH' || kind === 'SPIN_EXAM_M1') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs corto: shove/open shove candidato.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['Kd', '6s'], 40502, { trapTag: 'dominated', teachBack: 'K6o: fold. No panic shove.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJo SB corto: shove frecuente.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['Jh', 'Jc'], 40504, { teachBack: 'JJ: shove value claro a 10–12 bb.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo BTN early: open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['9s', '6c'], 50102, { trapTag: 'dominated', teachBack: '96o UTG early: fold. Paciencia.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO: open estándar early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['Qs', 'Jh'], 50104, { trapTag: 'dominated', teachBack: 'QJo: fold. No spew early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['7s', '7c'], 50105, { teachBack: '77 BTN: open claro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['7s', '6s'], 50106, { trapTag: 'fancy_play', teachBack: '76s HJ early: a menudo fold — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 4);
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Qd', 'Tc'], 50401, { teachBack: 'QTo BTN mid: steal razonable.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['Qc', '2h'], 50402, { trapTag: 'dominated', teachBack: 'Q2o: fold.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '3s'], 50403, { teachBack: 'A3s CO: steal/open OK mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB: open/steal frecuente.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['7h', '6h'], 50406, { teachBack: '76s BTN: steal con jugabilidad.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['Jh', 'Jd'], 50501, { teachBack: 'JJ: 3-bet value vs steal.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['Th', '7c'], 50503, { trapTag: 'dominated', teachBack: 'T7o: fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 2).concat(packSpots('MTT_3BET', D).slice(0, 2));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '2h'], 50901, { teachBack: 'A2s BTN a ~10–12 bb: shove candidato.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['Jc', '8d'], 50902, { trapTag: 'dominated', teachBack: 'J8o: fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['Jh', 'Jc'], 50904, { teachBack: 'JJ: shove value.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) })
    ];
    return [];
  }
  function resolveSpots(lesson, D) {
    if (typeof lesson.spots === 'string') lesson.spots = packSpots(lesson.spots, D);
    return lesson;
  }

  if (D.setRouteStatus) {

  }
  var RAW = [
    {
      "route": "cash",
      "module": "M4",
      "order": 26,
      "plan": "coach",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "El 4-bet —y el cold 4-bet cuando aún no has entrado— es la capa después del 3-bet: value premium por un lado y faroles con blockers por el otro, más tight si entras en frío.",
      "theory": [
        {
          "title": "Qué es un 4-bet",
          "body": "Tras un open y un 3-bet (resubida), el 4-bet es la siguiente subida. Separar value (manos fuertes que quieren stack o un bote grande: a menudo KK+, AK) de faroles (manos que bloquean premium y se tiran ante mucha presión: ases suited selectivos). Sin esa separación, el 4-bet se vuelve spew."
        },
        {
          "title": "Cold 4-bet",
          "body": "Cold 4-bet significa subir a 4-bet sin haber entrado antes en la mano (no abriste ni hiciste call al open): llegas “en frío” frente a open + 3-bet. Tu rango debe ser más tight que el del que ya abrió: menos faroles, más claridad de value, porque no tienes fold equity de “continuar tu historia” de open."
        },
        {
          "title": "Posición del 3-bet y trampas",
          "body": "Vs 3-bet desde early (UTG/HJ) 4-beteas menos light que vs 3-bet del botón: el rango de 3-bet temprano es más fuerte. Trampa clásica: 4-bet spew con KQo offsuit o “porque ya metí fichas”. Si no es value claro ni farol con blocker bueno, fold o, a veces, hacer call en posición con manos jugables — no inventes 4-bets de orgullo."
        }
      ],
      "examples": [
        {
          "title": "Value claro",
          "body": "Abres BTN, BB 3-betea. Con KK o AK: 4-bet de value. Quieres que paguen de más o que stackeen peor; no “slow-play” eterno por miedo."
        },
        {
          "title": "Farol con blocker",
          "body": "Misma línea, A5s: candidato a 4-bet farol porque bloqueas AA/AK. K9o no bloquea lo mismo — suele ser fold, no hero 4-bet."
        },
        {
          "title": "Cold 4-bet desde ciegas",
          "body": "UTG open, BTN 3-bet, tú en BB sin haber entrado: cold 4-bet. Aquí QQ+/AK entran; Axs light se reduce mucho respecto a si tú fueras el opener enfrentando el 3-bet."
        }
      ],
      "aiQuestions": [
        "¿Qué diferencia un 4-bet de value de un 4-bet farol?",
        "¿Qué es un cold 4-bet y por qué suele ser más tight?",
        "¿Vs qué 3-bet 4-beteas menos light?"
      ],
      "spots": [],
      "exam": false,
      "id": "C-26",
      "title": "4-bet / cold 4-bet"
    },
    {
      "route": "cash",
      "module": "M4",
      "order": 27,
      "plan": "coach",
      "xp": 110,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En un single-raised pot fuera de posición a stacks deep construyes check-call y check-raise con plan: pot control importa porque quedan muchas calles por delante.",
      "theory": [
        {
          "title": "SRP OOP deep",
          "body": "SRP (single-raised pot) es un bote con una sola subida preflop (open + call, sin 3-bet). OOP (out of position, fuera de posición) significa actuar antes que el rival en las calles postflop. Deep (stacks profundos, p. ej. 100 bb+) multiplica el coste de un error: hay turn y river con mucho dinero detrás."
        },
        {
          "title": "Líneas: check-call y check-raise",
          "body": "Check-call (pasar y luego hacer call) protege medias y algunas fuertes que no quieren bote hinchado aún. Check-raise (pasar y resubir) polariza: value fuerte y faroles elegidos. No autocbetees OOP en boards wet solo por ser el agresor (recuerda C-16): a menudo el plan es ceder la iniciativa y decidir en turn."
        },
        {
          "title": "Pot control y trampa donk",
          "body": "Pot control es mantener el bote manejable cuando tu mano es media o el board es peligroso. Trampa: donk bet (apostar de primero OOP sin plan) o hinchar con segunda pareja sticky. Deep, un donk spew te mete en ríos imposibles; prefiere líneas de check que cuenten una historia."
        }
      ],
      "examples": [
        {
          "title": "Medias en seco",
          "body": "BB vs BTN, flop K72r, tú con 99: check-call frecuente. No check-raiseas “para ver si va”; controlas el bote y reevalúas turn."
        },
        {
          "title": "Check-raise polar",
          "body": "Mismo spot, set de sietes o farol con A♠x en board que bloquea: check-raise tiene historia. QJ sin pareja no es check-raise de value."
        },
        {
          "title": "Wet OOP",
          "body": "Flop 9♠8♠7♥ tras tu open desde SB: muchas manos checkean. Autocbet aquí es la fuga típica; pot control y selectividad ganan más EV a 100 bb."
        }
      ],
      "aiQuestions": [
        "¿Qué es un SRP y por qué duele más OOP deep?",
        "¿Cuándo prefieres check-call frente a check-raise?",
        "¿Por qué el donk bet sin plan es peligroso a 100 bb?"
      ],
      "spots": [],
      "exam": false,
      "id": "C-27",
      "title": "SRP OOP deep"
    },
    {
      "route": "cash",
      "module": "M4",
      "order": 28,
      "plan": "coach",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Mismo spot, dos rivales: contra fish cobras value más fino; contra reg eliges faroles con blockers y sueltas el thin loco. La población manda más que un GTO ciego.",
      "theory": [
        {
          "title": "Fish vs reg",
          "body": "Fish (jugador recreacional, paga de más y foldea mal) y reg (regular, defiende mejor y castiga líneas flojas) piden estrategias distintas. Explotación es desviarte del mix equilibrado para ganar más contra el error típico de esa población — sin inventar jugadas que solo funcionan en el vacío."
        },
        {
          "title": "Value thin y faroles selectivos",
          "body": "Vs fish: value thin (cobrar con manos decentes que un reg no pagaría) y menos faroles en river — te pagan el value y no tirarán lo suficiente al farol. Vs reg: faroles con blockers buenos, menos thin crazy, y respeto a sus raises. No juegues “un solo GTO” ignorando quién tienes enfrente."
        },
        {
          "title": "Trampa vs calling station",
          "body": "Farolear rivers vs calling station (alguien que hace call de más) es regalar fichas. Si te han mostrado que pagan con segunda pareja, deja de farolear y empieza a value-betear manos medias. La explotación correcta a veces es aburrida: cobras, no inventas."
        }
      ],
      "examples": [
        {
          "title": "River value thin vs fish",
          "body": "Tú con top pair kicker medio en un river seco: vs fish, bet de value. Vs reg tight que solo paga fuertes, a veces check-back gana más."
        },
        {
          "title": "Farol vs reg con blocker",
          "body": "Missed draw con as del palo del flush posible vs un reg que overfoldea rivers: candidato a farol. Misma mano vs fish pegajoso: check y rinde."
        },
        {
          "title": "Misma línea, distinto plan",
          "body": "Flop c-bet + turn barrel: vs fish busca value en river con manos medias; vs reg evalúa si tu historia de farol es creíble y si él tiene bluff-catchers que tirará."
        }
      ],
      "aiQuestions": [
        "¿Qué cambia en river value thin entre fish y reg?",
        "¿Cuándo dejo de farolear aunque “GTO diga mix”?",
        "¿Qué error cometo faroleando a una calling station?"
      ],
      "spots": [],
      "exam": false,
      "id": "C-28",
      "title": "Explotación fish vs reg"
    },
    {
      "route": "cash",
      "module": "M4",
      "order": 29,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Ejercicio guiado: dado un board y una línea, describe el rango rival en bandas (value / medias / aire), no como una sola mano — el mismo músculo que R-05, ahora en modo quiz.",
      "theory": [
        {
          "title": "Range vs range",
          "body": "Pensar range vs range es comparar tu distribución de manos con la del villano en ese nodo, no “mi mano contra la suya”. El quiz te obliga a escribir bandas: qué value llega, qué medias sobreviven, qué aire aún farolea. Sin eso, cada decisión se vuelve adivinanza de una carta."
        },
        {
          "title": "Cómo responder el ejercicio",
          "body": "Narrativa corta: posición, acciones preflop y postflop, textura del board. Luego tres columnas. Contrasta con el menú Rangos si hay chart del spot. Si tu columna de aire está vacía ante un bet polar, estás sesgado hacia “siempre value”."
        },
        {
          "title": "Trampa de la nuts fija",
          "body": "Poner al hero o al villano “siempre en la nuts” mata el ejercicio. Oblígate a nombrar al menos un farol creíble y una media. El profesor no busca la mano exacta: busca una historia de rango coherente con la línea."
        }
      ],
      "examples": [
        {
          "title": "Plantilla de respuesta",
          "body": "“BTN open, BB call; flop A72r check-check; turn 2 bet BTN; river 8 bet. Value: Ax fuerte, trips. Medias: Kx, mid pair. Aire: missed broadway con blocker.” Esa forma aprueba el quiz."
        },
        {
          "title": "Quiz express",
          "body": "Te dan: CO open, BTN 3-bet, CO call; flop K93r; CO check, BTN bet, CO raise. Escribe rangos de CO en el raise antes de mirar cualquier chart."
        },
        {
          "title": "Autocorrección",
          "body": "Si tu lista de value del rival no incluye ninguna mano que tú también podrías tener en su silla, revisa: o te falta realismo o estás inventando monstruos."
        }
      ],
      "aiQuestions": [
        "¿Cómo describes un rango rival en tres bandas?",
        "¿Por qué “siempre la nuts” invalida el ejercicio?",
        "¿Qué datos mínimos necesitas antes de asignar el rango (línea + board)?"
      ],
      "spots": [],
      "exam": false,
      "id": "C-29",
      "title": "Range vs range (quiz)"
    },
    {
      "route": "cash",
      "module": "M4",
      "order": 30,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Lleva el node locking mental a la mesa de cash: piensa en frecuencias (“aquí c-beteo ~70 %”) aunque ejecutes una sola acción — así no tiltas cuando el chart a veces checkea.",
      "theory": [
        {
          "title": "Frecuencias en la práctica",
          "body": "En Pro Cash no juegas un solver en vivo, pero sí internalizas nodos: “en este flop seco IP el mix sano es c-bet frecuente”. Elegir bet o check hoy es una muestra de ese mix. Enlace con R-06: el laboratorio enseña el %; esta lección lo convierte en hábito de mesa."
        },
        {
          "title": "Para qué sirve el locking mental",
          "body": "Sirve para no pelearte con la realidad del chart (“¿por qué checkea AQo a veces?”) y para no rigidizar tu juego a pure strategies. También te ayuda a estudiar: cuando revises una mano, pregunta qué frecuencia tenía sentido, no solo si tu acción fue “la única correcta”."
        },
        {
          "title": "Trampa de la pure strategy",
          "body": "Exigir siempre bet o siempre check en todos los spots te hace predecible y te enfada con el material de estudio. Acepta el mix: en nodos mezclados, dos acciones pueden ser razonables; lo que falla es la tercera (sizing loco, donk spew, hero-call sin historia)."
        }
      ],
      "examples": [
        {
          "title": "Frase en mesa",
          "body": "Antes del c-bet: “Aquí apuesto la mayoría, no el 100 %.” Si checkeas una media borderline, no es traición al plan: es una muestra del 30 %."
        },
        {
          "title": "Estudio post-sesión",
          "body": "Marca tres nodos de tu sesión (c-bet flop, face raise, river). Anota qué frecuencia intuías. Compárala con el menú Rangos o con notas de clase — calibración, no castigo."
        },
        {
          "title": "Vs explotación",
          "body": "El mix GTO es el punto de partida; vs fish puedes “lockear” más value bets (C-28). El locking mental no te impide explotar: te impide mentirte sobre qué estás haciendo."
        }
      ],
      "aiQuestions": [
        "¿Qué frase de frecuencias usarías en un c-bet seco IP?",
        "¿Cómo te ayuda el node locking al revisar una mano?",
        "¿Cuándo tiene sentido desviarte del mix hacia explotación?"
      ],
      "spots": [],
      "exam": false,
      "id": "C-30",
      "title": "Node locking mental"
    },
    {
      "route": "cash",
      "module": "M4",
      "order": 31,
      "plan": "coach",
      "xp": 160,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Pro Cash: certifica que aplicas 4-bet, SRP OOP, explotación fish/reg y lectura de rangos con el checklist de esta ruta — sin introducir teoría nueva.",
      "theory": [
        {
          "title": "Qué se evalúa",
          "body": "Repasas lo ya visto en C-26…C-30 y el músculo de rangos (R-05/R-06): value vs farol en 4-bet, pot control OOP deep, fish vs reg en river, bandas de rango y frecuencias mentales. No hay glosario nuevo: solo aplicación."
        },
        {
          "title": "Checklist de profesor",
          "body": "Antes de cada decisión del examen: (1) ¿qué capa preflop es — open, 3-bet, 4-bet o cold? (2) ¿SRP u OOP deep — cuál es mi línea de check? (3) ¿rival fish o reg — value thin o farol selectivo? (4) ¿puedo describir el rango rival en bandas? (5) ¿estoy pensando en frecuencia o en “siempre”?"
        }
      ],
      "examples": [
        {
          "title": "Mini checklist 4-bet",
          "body": "¿Value premium o farol con blocker? ¿Cold o ya abrí? ¿El 3-bet viene de early o de BTN? Si no respondes las tres, no pulses 4-bet."
        },
        {
          "title": "Mini checklist river",
          "body": "¿Me pagan de más (fish) o defienden bien (reg)? ¿Mi mano es value thin, bluff-catcher o aire con blocker? Una pregunta de población evita el spew."
        },
        {
          "title": "Antes de pulsar",
          "body": "Di en voz alta la banda del rival (value / medias / aire) y tu plan en una frase. Si la frase es solo “voy”, aún no estás listo para el examen."
        }
      ],
      "aiQuestions": [
        "Resume 4-bet value vs farol en una frase de profesor.",
        "¿Qué cambia en river value entre fish y reg?",
        "¿Cuáles son las cinco preguntas del checklist Pro Cash?"
      ],
      "spots": [],
      "exam": true,
      "id": "C-31",
      "title": "Examen Pro · Cash"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-extra-spots.js — Amplía spots Cash M1/M2 (≥10–14) y sincroniza hands.
 * Cargar tras M1/M2 (bundle school).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var vs = D.vsRfiSpot;
  var f3 = D.face3betSpot;
  var iso = D.isoSpot;
  var sq = D.squeezeSpot;
  var bb = D.bbVsSbLimpSpot;
  var flop = D.flopSpot;

  var EXTRA = {
    'C-07': [
      vs('c07-09', 'BB_vs_BTN', ['Ts', '9s'], 17009, { teachBack: 'T9s vs BTN: call cómodo. Conectores suited se defienden bien vs opens late.' }),
      vs('c07-10', 'BB_vs_UTG', ['Ah', 'Jd'], 17010, { trapTag: 'dominated', teachBack: 'AJo vs UTG: a menudo fold. Early open tight — no overdefend Ax offsuit.' }),
      vs('c07-11', 'BB_vs_CO', ['Kd', 'Qs'], 17011, { teachBack: 'KQo vs CO: 3-bet o call sólido. Broadway offsuit fuerte vs late.' }),
      vs('c07-12', 'BB_vs_HJ', ['8c', '7d'], 17012, { trapTag: 'fancy_play', teachBack: '87o vs HJ: fold. No defiendas basura offsuit vs middle.' })
    ],
    'C-08': [
      vs('c08-09', 'BB_vs_BTN', ['Jh', 'Jd'], 18009, { teachBack: 'JJ vs BTN: 3-bet value. Quieres máximo dinero con la mejor mano.' }),
      vs('c08-10', 'BB_vs_CO', ['Kd', '2d'], 18010, { teachBack: 'K2s vs CO: a veces 3-bet farol con blocker de K; no es spew como KTo.' }),
      vs('c08-11', 'SB_vs_BTN', ['Qh', 'Td'], 18011, { trapTag: 'fancy_play', teachBack: 'QTo SB vs BTN: no 3-bet spew. Fold o call selectivo — no polar sin blockers claros.' }),
      vs('c08-12', 'BB_vs_BTN', ['Ts', 'Td'], 18012, { teachBack: 'TT vs BTN: 3-bet value. Par medio-fuerte — construye bote; no la trates como farol.' })
    ],
    'C-09': [
      f3('c09-09', 'BTN_vs_BB', ['Qs', 'Qd'], 19009, { teachBack: 'QQ vs 3-bet: 4-bet value. Premium — quieres bote grande.' }),
      f3('c09-10', 'CO_vs_BB', ['Jh', '9h'], 19010, { teachBack: 'J9s CO vs 3-bet: call frecuente en posición. No hero-fold conectores suited.' }),
      f3('c09-11', 'UTG_vs_BB', ['Qd', 'Js'], 19011, { trapTag: 'dominated', teachBack: 'QJo UTG vs 3-bet: a menudo fold OOP. Continúa tight desde early.' }),
      f3('c09-12', 'BTN_vs_SB', ['Jh', 'Jc'], 19012, { teachBack: 'JJ BTN vs 3-bet SB: 4-bet o call value. Premium en posición.' })
    ],
    'C-10': [
      sq('c10-07', 'BB', 'CO', 'BTN', ['Qs', 'Qd'], 20007, { teachBack: 'QQ: squeeze value. Quieres aislar o meter el máximo con nuts.' }),
      sq('c10-08', 'BB', 'HJ', 'BTN', ['Td', '9c'], 20008, { trapTag: 'fancy_play', teachBack: 'T9o: no squeeze spew. Fold — dead money no justifica basura.' }),
      sq('c10-09', 'SB', 'CO', 'BTN', ['Jh', 'Js'], 20009, { teachBack: 'JJ: squeeze value razonable. Par fuerte ante open+call.' }),
      sq('c10-10', 'BB', 'CO', 'BTN', ['Ah', '4h'], 20010, { teachBack: 'A4s: squeeze polar. Farol con as blocker, misma lógica que 3-bet polar.' }),
      sq('c10-11', 'BB', 'UTG', 'CO', ['Ts', '9s'], 20011, { trapTag: 'fancy_play', teachBack: 'T9s vs UTG+call: fold o call muy selectivo — no squeeze loco vs early.' }),
      sq('c10-12', 'BB', 'CO', 'BTN', ['As', 'Ah'], 20012, { teachBack: 'AA: squeeze value. Premium claro ante dead money.' })
    ],
    'C-11': [
      iso('c11-07', 'BTN', 'CO', ['Ah', 'Qd'], 21007, { teachBack: 'AQo vs limp: iso value. Premium — aísla y cobra.' }),
      iso('c11-08', 'CO', 'HJ', ['Qc', '2h'], 21008, { trapTag: 'dominated', teachBack: 'Q2o vs limp: fold. No overiso basura.' }),
      iso('c11-09', 'BTN', 'SB', ['Jh', 'Ts'], 21009, { teachBack: 'JTo vs limp: iso razonable. Conectores altos suited con iniciativa.' }),
      iso('c11-10', 'SB', 'BTN', ['Qd', '9c'], 21010, { trapTag: 'fancy_play', teachBack: 'Q9o vs limp OOP: fold frecuente. No aísles frágiles offsuit.' }),
      iso('c11-11', 'BTN', 'CO', ['9s', '9c'], 21011, { teachBack: '99 vs limp: iso claro. Par medio — heads-up con ventaja.' }),
      iso('c11-12', 'CO', 'UTG', ['Ad', '7d'], 21012, { teachBack: 'A7s vs limp: iso OK. Ax suited castiga limps wide.' })
    ],
    'C-12': [
      bb('c12-07', ['Kd', 'Kh'], 22007, { teachBack: 'KK BB vs SB limp: raise value. Premium — no check raro.' }),
      bb('c12-08', ['5d', '3c'], 22008, { trapTag: 'dominated', teachBack: '53o: check. No raise spew vs limp SB.' }),
      bb('c12-09', ['9s', '8s'], 22009, { teachBack: '98s vs SB limp: raise o check mixto; conectores suited juegan bien.' }),
      bb('c12-10', ['Qc', 'Th'], 22010, { trapTag: 'fancy_play', teachBack: 'QTo: no raise automático. Check frecuente — mano frágil.' }),
      bb('c12-11', ['Ac', 'Qc'], 22011, { teachBack: 'AQs: raise value vs limp SB. Par fuerte — aísla.' }),
      bb('c12-12', ['Ah', '4h'], 22012, { teachBack: 'A4s: raise frecuente. Ax suited castiga limps de SB.' })
    ],
    'C-13': [
      vs('c13-11', 'BB_vs_BTN', ['As', 'Ts'], 23011, { teachBack: 'ATs vs BTN: 3-bet o call. Examen M1 — aplica defensa late.' }),
      vs('c13-12', 'BB_vs_UTG', ['Kd', 'Jd'], 23012, { trapTag: 'dominated', teachBack: 'KJs vs UTG: fold en examen. Early = tight.' }),
      f3('c13-13', 'BTN_vs_BB', ['Ks', '7d'], 23013, { teachBack: 'K7o vs 3-bet: 4-bet o call value. Examen — no hero-fold premium.' }),
      iso('c13-14', 'BTN', 'SB', ['Qs', 'Js'], 23014, { teachBack: 'QJs vs limp: iso. Examen M1 — aísla manos fuertes.' })
    ],
    'C-14': [
      flop('c14-07', 'BTN', ['Ah', 'Kd'], ['Qs', '7c', '2d'], 24007, { teachBack: 'Q-high seco: c-bet pequeño IP con AK. Niega equity barato.' }),
      flop('c14-08', 'CO', ['Jh', 'Td'], ['9s', '8s', '2h'], 24008, { trapTag: 'fancy_play', teachBack: 'Board semi-wet: no autocbet grande. Selectivo.' }),
      flop('c14-09', 'BTN', ['5s', '5c'], ['Kh', '9d', '3c'], 24009, { teachBack: 'Pareja baja en K-high seco: c-bet pequeño o check mixto.' }),
      flop('c14-10', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 24010, { teachBack: 'Top pair A-high seco: c-bet value frecuente.' }),
      flop('c14-11', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 24011, { trapTag: 'fancy_play', teachBack: 'Board muy conectado: pot control. No hinches sin necesidad.' }),
      flop('c14-12', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 24012, { teachBack: 'A-high seco con backdoors: c-bet ligero IP razonable.' }),
      flop('c14-13', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 24013, { teachBack: 'J-high seco IP: c-bet pequeño con KQ suited. Niega equity.' }),
      flop('c14-14', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 24014, { trapTag: 'fancy_play', teachBack: 'Underpair en A-high: check mixto frecuente. No autocbet spew.' })
    ],
    'C-15': [
      flop('c15-09', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 25009, { teachBack: 'K-high seco: c-bet pequeño con AJ. Plan IP estándar.' }),
      flop('c15-10', 'CO', ['Qd', 'Td'], ['As', '5h', '2c'], 25010, { teachBack: 'A-high seco: c-bet frecuente IP. Niega outs barato.' }),
      flop('c15-11', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 25011, { teachBack: 'K-high seco con backdoors: c-bet ligero OK.' }),
      flop('c15-12', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 25012, { trapTag: 'fancy_play', teachBack: 'Conectado: no trates como seco. Selectivo, no autocbet.' }),
      flop('c15-13', 'BTN', ['As', 'Kd'], ['Qh', '8d', '3c'], 25013, { teachBack: 'Q-high seco IP con AK: c-bet pequeño estándar.' }),
      flop('c15-14', 'CO', ['9h', '8h'], ['Ad', '6c', '2s'], 25014, { teachBack: 'A-high seco con backdoors: c-bet ligero IP frecuente.' })
    ],
    'C-16': [
      flop('c16-07', 'SB', ['Ah', 'Kd'], ['Qs', 'Jh', '9c'], 26007, { teachBack: 'Wet OOP: check frecuente con AK air. No autocbet.' }),
      flop('c16-08', 'BB', ['9s', '9c'], ['Ah', '7d', '2c'], 26008, { teachBack: 'Pareja media A-high OOP: bet pequeño o check mixto.' }),
      flop('c16-09', 'SB', ['Kh', 'Td'], ['As', '8c', '3h'], 26009, { trapTag: 'fancy_play', teachBack: 'KTo air OOP en A-high: check/cede. No inventes c-bet.' }),
      flop('c16-10', 'BB', ['8h', '7h'], ['9s', '6d', '2c'], 26010, { teachBack: 'Draw OOP: check o bet selectivo. Ten plan de turn.' }),
      flop('c16-11', 'SB', ['Qs', 'Qd'], ['Jh', 'Tc', '2d'], 26011, { teachBack: 'Overpair OOP: bet pequeño o check. No hinches sin plan.' }),
      flop('c16-12', 'BB', ['Ad', '5c'], ['Kh', '9s', '4d'], 26012, { trapTag: 'fancy_play', teachBack: 'A-high air OOP en K-high: check. Cede la calle.' }),
      flop('c16-13', 'SB', ['Jc', 'Td'], ['9h', '8s', '2c'], 26013, { teachBack: 'Board semi-wet OOP: check frecuente sin made hand fuerte.' }),
      flop('c16-14', 'BB', ['Kh', 'Qs'], ['Ad', '7c', '3h'], 26014, { trapTag: 'fancy_play', teachBack: 'KQ air OOP en A-high: check. No inventes presión.' })
    ],
    'C-17': [
      flop('c17-07', 'BB', ['Ah', 'Kd'], ['Qs', 'Jh', '2c'], 27007, { facingBet: true, teachBack: 'Con odds y overcards: call vs c-bet pequeño. Cuenta outs.' }),
      flop('c17-08', 'BB', ['8h', '7d'], ['As', 'Kd', '2c'], 27008, { facingBet: true, trapTag: 'fancy_play', teachBack: 'Sin odds ni backdoors fuertes: fold. No pagues caro por ilusión.' }),
      flop('c17-09', 'BB', ['9s', '8s'], ['7h', '6d', '2c'], 27009, { facingBet: true, teachBack: 'OESD/gutshot+: call si pot odds alcanzan. Precio del bote manda.' }),
      flop('c17-10', 'BB', ['Kh', 'Qd'], ['As', '8c', '3h'], 27010, { facingBet: true, teachBack: 'Overcards + backdoor: call mixto vs bet pequeño.' }),
      flop('c17-11', 'BB', ['Jd', 'Td'], ['9s', '8h', '2c'], 27011, { facingBet: true, teachBack: 'Straight draw fuerte: call. Tienes equity real.' }),
      flop('c17-12', 'BB', ['Qc', '9c'], ['Ah', 'Kd', '7s'], 27012, { facingBet: true, trapTag: 'dominated', teachBack: 'Sin odds OOP: fold. No hero-call sin precio.' }),
      flop('c17-13', 'BB', ['Ts', '9s'], ['8h', '7d', '2c'], 27013, { facingBet: true, teachBack: 'OESD suited: call vs c-bet si el precio es bueno.' }),
      flop('c17-14', 'BB', ['5h', '4d'], ['As', 'Kd', '9c'], 27014, { facingBet: true, trapTag: 'fancy_play', teachBack: 'Sin equity real OOP: fold. No persigas illusory outs.' })
    ],
    'C-18': [
      flop('c18-07', 'BTN', ['As', 'Ah'], ['Kh', '9d', '2c'], 28007, { street: 'turn', teachBack: 'AA en seco: barrel turn value frecuente tras c-bet flop.' }),
      flop('c18-08', 'BTN', ['8h', '7h'], ['As', 'Kd', '2c'], 28008, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Air sin equity en turn: give up. No second barrel spew.' }),
      flop('c18-09', 'CO', ['Qs', 'Qd'], ['Jh', '8c', '3d'], 28009, { street: 'turn', teachBack: 'Overpair: barrel value. Cobra a peores y niega.' }),
      flop('c18-10', 'BTN', ['Ah', '5h'], ['As', '9d', '4c'], 28010, { street: 'turn', teachBack: 'Top pair: value turn. No check raro siempre.' }),
      flop('c18-11', 'BTN', ['Kd', 'Td'], ['Kh', '7s', '2c'], 28011, { street: 'turn', teachBack: 'Top pair K: barrel frecuente. Value + protección.' }),
      flop('c18-12', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 28012, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Turn en board wet: sé selectivo. No barrel automático.' }),
      flop('c18-13', 'BTN', ['9s', '9c'], ['Ah', '6d', '2c'], 28013, { street: 'turn', teachBack: 'Pareja media en A-high: barrel selectivo o pot control.' }),
      flop('c18-14', 'CO', ['7h', '6h'], ['Kd', '9c', '2s'], 28014, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Air en K-high turn: give up frecuente. No second barrel spew.' })
    ],
    'C-19': [
      flop('c19-07', 'BTN', ['As', 'Kd'], ['Qs', '7h', '2c'], 29007, { street: 'river', teachBack: 'River value: bet si te pagan peores. No check nuts relative siempre.' }),
      flop('c19-08', 'BTN', ['8h', '7h'], ['As', 'Kd', '2c'], 29008, { street: 'river', trapTag: 'fancy_play', teachBack: 'Air river: fold o bluff solo con blockers. No spew.' }),
      flop('c19-09', 'CO', ['Qh', 'Qd'], ['Js', '8c', '3d'], 29009, { street: 'river', teachBack: 'Overpair river: value bet. Cobra a Jx/peores.' }),
      flop('c19-10', 'BTN', ['Ah', '5d'], ['As', '9c', '4h'], 29010, { street: 'river', teachBack: 'Top pair river: value. Thin OK vs calling range.' }),
      flop('c19-11', 'BTN', ['Kh', 'Td'], ['Kd', '7s', '2c'], 29011, { street: 'river', teachBack: 'Top pair K river: value bet frecuente.' }),
      flop('c19-12', 'BB', ['Jc', 'Tc'], ['Ts', '8h', '7d'], 29012, { street: 'river', facingBet: true, trapTag: 'dominated', teachBack: 'Facing river bet con mano media: fold si el precio no justifica call.' }),
      flop('c19-13', 'BTN', ['Jd', 'Js'], ['9h', '6c', '2d'], 29013, { street: 'river', teachBack: 'Overpair river seco: value bet. Cobra a 9x/peores.' }),
      flop('c19-14', 'BTN', ['Qd', '9c'], ['Ah', 'Kh', '3s'], 29014, { street: 'river', trapTag: 'fancy_play', teachBack: 'Air river en A-K: no bluff spew sin blockers fuertes.' })
    ],
    'C-20': [
      flop('c20-09', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 30009, { teachBack: 'Examen: seco IP → c-bet pequeño. Aplica C-14/C-15.' }),
      flop('c20-10', 'BB', ['9s', '9c'], ['Ah', '8d', '3c'], 30010, { facingBet: true, teachBack: 'Examen: OOP vs c-bet → call con pareja media frecuente.' }),
      flop('c20-11', 'BTN', ['8h', '7h'], ['9s', '8s', '7d'], 30011, { trapTag: 'fancy_play', teachBack: 'Examen: wet → no autocbet spew.' }),
      flop('c20-12', 'BTN', ['Kd', 'Kh'], ['Qc', 'Jd', '2s'], 30012, { street: 'turn', teachBack: 'Examen: overpair turn → barrel value.' }),
      flop('c20-13', 'CO', ['As', '5s'], ['Ah', '9c', '4d'], 30013, { street: 'river', teachBack: 'Examen: top pair river → value thin OK.' }),
      flop('c20-14', 'BB', ['Qh', 'Jd'], ['Ts', '8c', '3h'], 30014, { facingBet: true, trapTag: 'dominated', teachBack: 'Examen: sin odds OOP → fold vs c-bet.' }),
      flop('c20-15', 'BTN', ['Ah', 'Kd'], ['Qs', '7h', '2c'], 30015, { teachBack: 'Examen: Q-high seco IP → c-bet pequeño con AK.' }),
      flop('c20-16', 'SB', ['Jh', 'Td'], ['As', '8c', '3d'], 30016, { trapTag: 'fancy_play', teachBack: 'Examen: air OOP A-high → check/cede, no inventes.' })
    ]
  };

  D.LESSONS.forEach(function (lesson) {
    var extra = EXTRA[lesson.id];
    if (extra && extra.length) {
      lesson.spots = (lesson.spots || []).concat(extra);
    }
    if (Array.isArray(lesson.spots) && lesson.spots.length) {
      lesson.hands = lesson.spots.length;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-data-practice.js — Práctica (≥12 spots) para lecciones que eran teoría-only.
 * Cargar tras school-extra-spots.js. No pisa packs que ya tienen manos.
 *
 * Criterio: cada spot tiene una decisión GTO clara (open/fold, shove/fold,
 * call/fold, 3-bet/fold, c-bet/check). El teachBack ancla el concepto de la
 * lección; no pedimos ICM-fold donde el motor puntúa call.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var rfi = D.rfiSpot, vs = D.vsRfiSpot, f3 = D.face3betSpot;
  var flop = D.flopSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;

  function cash(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100' }, extra || {});
  }
  function spin(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mtt(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }

  function R(id, pos, cards, seed, tb, cfg, trap) {
    return rfi(id, pos, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function V(id, key, cards, seed, tb, cfg, trap) {
    return vs(id, key, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function F3(id, key, cards, seed, tb, cfg, trap) {
    return f3(id, key, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function Fl(id, pos, cards, board, seed, tb, extra) {
    extra = extra || {};
    extra.teachBack = tb;
    extra.trapTag = extra.trapTag || 'none';
    return flop(id, pos, cards, board, seed, extra);
  }

  var PACKS = {};

  /* —— C-00: cómo funciona la Escuela (open/fold cristalino) —— */
  PACKS['C-00'] = [
    R('c00-01', 'BTN', ['Ts', 'Tc'], 70001, 'TT en el botón: open claro. En la Escuela cada mano está diseñada: aquí la respuesta es subir, no “probar suerte”.', cash()),
    R('c00-02', 'UTG', ['Kh', 'Jd'], 70002, 'KJo UTG: fold. El spot te pide tirar — no hay truco. Así funciona una lección: decisión preparada, no mano aleatoria.', cash(), 'dominated'),
    R('c00-03', 'CO', ['Kd', 'Kh'], 70003, 'KK cutoff: open. Premium = subes primero el bote. Luego ves si acertaste y pasas al siguiente spot.', cash()),
    R('c00-04', 'BTN', ['9c', '2h'], 70004, '92o incluso en botón: fold. Posición no lava basura. La Escuela te evalúa solo en esta decisión.', cash(), 'dominated'),
    R('c00-05', 'UTG', ['Jh', 'Jd'], 70005, 'JJ UTG: open. Early también abre premiums. Lee la silla, luego las cartas, luego actúa.', cash()),
    R('c00-06', 'HJ', ['8d', '3c'], 70006, '83o hijack: fold. Si dudas, pregunta: ¿esto entra en un open de cash a 100 bb? Casi nunca.', cash(), 'fancy_play'),
    R('c00-07', 'BTN', ['Qs', 'Js'], 70007, 'QJs botón: open. Broadway suited en late es el tipo de spot “sí” que la lección quiere clavar.', cash()),
    R('c00-08', 'CO', ['Td', '4c'], 70008, 'T4o cutoff: fold. No abras “porque queda poca gente” con basura offsuit.', cash(), 'dominated'),
    R('c00-09', 'HJ', ['8s', '8c'], 70009, '88 hijack: open. Par medio fuerte — iniciativa, no limp.', cash()),
    R('c00-10', 'UTG', ['Kh', '8d'], 70010, 'K8o UTG: fold. Demasiada gente detrás. Misma mano en BTN ya sería otro debate (C-01).', cash(), 'fancy_play'),
    R('c00-11', 'CO', ['Ah', 'Qs'], 70011, 'AQo cutoff: open claro. Ax fuerte offsuit — construyes bote con plan.', cash()),
    R('c00-12', 'BTN', ['8c', '2h'], 70012, '82o botón: fold. El botón abre wide, no cualquier dos cartas. Apruebas al acertar el umbral; puedes repetir.', cash(), 'dominated')
  ];

  /* —— Spins —— */
  var st20 = spin({ scenario: 'steal', stackDepth: 'bb20' });
  var st25 = spin({ scenario: 'steal', stackDepth: 'bb25' });
  var pf10 = spin({ scenario: 'push', stackDepth: 'bb10' });
  var pf12 = spin({ scenario: 'push', stackDepth: 'bb12' });
  var vs20 = spin({ scenario: '3bet', stackDepth: 'bb20' });
  var vsPush = spin({ scenario: 'push', stackDepth: 'bb10' });

  PACKS['S-00'] = [
    R('s00-01', 'BTN', ['Ts', 'Tc'], 71001, 'TT BTN ~20 bb: shove por valor. En Spin las fichas no son euros: un stack corto pide fold equity, no open de cash a 100 bb.', st20),
    R('s00-02', 'BTN', ['9c', '2s'], 71002, '92o: fold. Perder el stack suele ser perder la entrada. No spew “porque son solo fichas”.', st20, 'dominated'),
    R('s00-03', 'SB', ['Kh', 'Js'], 71003, 'KJo SB ~20 bb: open steal ~2,5–3 bb (no shove). 3-max: SB aún tiene al BB detrás.', st20),
    R('s00-04', 'SB', ['9h', '7d'], 71004, '97o SB: fold. En Spin 3-max no eres BTN: OOP si te pagan y el payout duele.', st20, 'fancy_play'),
    R('s00-05', 'BTN', ['7h', '7d'], 71005, '77 BTN 20 bb: shove. Par medio fuerte — quieres ciegas o doblar, no min-raise de cash.', st20),
    R('s00-06', 'BTN', ['Jh', '9h'], 71006, 'J9s BTN: open steal ~2,5 bb. Mano media del rango: roba sin commitear todo el torneo.', st20),
    R('s00-07', 'SB', ['Js', '4d'], 71007, 'J4o SB: fold. Anatomía del Spin: cada error puede ser eliminación, no un pot de cash.', st20, 'dominated'),
    R('s00-08', 'BTN', ['Ah', 'Td'], 71008, 'ATo BTN ~20 bb: shove frecuente. Stack corto + fold equity; no lo trates como cash deep.', st20),
    R('s00-09', 'SB', ['As', '6s'], 71009, 'A6s SB: open steal razonable. Ax suited con plan; no es auto-shove como AA.', st20),
    R('s00-10', 'BTN', ['Jc', '3d'], 71010, 'J3o: fold. Wide de botón no es “cualquier Ax/Jx”. Fichas de torneo, no céntimos.', st20, 'fancy_play'),
    R('s00-11', 'BTN', ['Kd', 'Kh'], 71011, 'KK ~20 bb: shove value. Premium — maximizas o fold equity o all-in con equity alta.', st20),
    R('s00-12', 'SB', ['Qd', '9c'], 71012, 'Q9o SB: fold frecuente. Offsuit frágil OOP en 3-max. Recuerda: payout 2×/3×/5×, no chip EV de cash.', st20, 'dominated')
  ];

  PACKS['S-06'] = [
    R('s06-01', 'BTN', ['Qs', 'Jh'], 71601, 'Cover (~25 bb) BTN con QJo: steal razonable. El lead se usa para presionar ciegas, no para hero-call.', st25),
    R('s06-02', 'BTN', ['8d', '4h'], 71602, 'Aunque seas cover, 84o es fold. Presión ≠ spew: si te pagan, la mano no aguanta.', st25, 'dominated'),
    R('s06-03', 'SB', ['As', 'Ts'], 71603, 'Cover SB con ATs: open/steal. Pones al short en un spot feo; no necesitas ir all-in siempre.', st25),
    V('s06-04', 'BB_vs_BTN', ['Qc', 'Th'], 71604, 'Short abre y tú eres cover con QTo: fold. No pagues light “porque tengo más fichas” — ICM suicide.', vs20, 'fancy_play'),
    V('s06-05', 'BB_vs_BTN', ['Jh', 'Jd'], 71605, 'Cover vs steal con JJ: 3-bet shove value. Aquí sí: equity alta y eliminar acerca al 1.º.', vs20),
    V('s06-06', 'BB_vs_SB', ['9h', '6d'], 71606, '96o vs steal: fold siempre. El lead no justifica basura.', vs20, 'dominated'),
    R('s06-07', 'BTN', ['6d', '5d'], 71607, 'Cover BTN 65s: steal con jugabilidad. Robas a shorts que overfoldean.', st25),
    V('s06-08', 'BB_vs_BTN', ['Ts', 'Tc'], 71608, 'TT cover vs steal: 3-bet shove. Value claro — no es call light.', vs20),
    V('s06-09', 'BB_vs_BTN', ['8s', '6c'], 71609, '86o cover vs steal: fold. Chip EV dudoso y $EV peor. El lead se guarda.', vs20, 'fancy_play'),
    R('s06-10', 'SB', ['Qd', 'Td'], 71610, 'Cover SB QTs: open steal frecuente. Presión con manos que foldean mucho.', st25),
    V('s06-11', 'BB_vs_SB', ['Td', 'Tc'], 71611, 'TT cover vs steal SB: 3-bet shove value. Par medio fuerte — no flat eterno.', vs20),
    R('s06-12', 'BTN', ['9h', '4c'], 71612, '94o cover: fold. El chip lead no convierte basura en steal.', st25, 'dominated')
  ];

  PACKS['S-07'] = [
    R('s07-01', 'BTN', ['As', 'Ts'], 71701, 'Short (~10–12 bb) BTN ATs: shove para doblarte. Vs cover elige equity + fold equity, no panic.', pf12),
    R('s07-02', 'BTN', ['Td', '6h'], 71702, 'Short con T6o: fold. Necesitas doblarte, sí; no con basura vs un cover que te elimina.', pf12, 'dominated'),
    R('s07-03', 'SB', ['Kh', 'Jh'], 71703, 'Short SB KJs: shove frecuente. Broadway usable — spot para double-up, no min-raise.', pf10),
    R('s07-04', 'SB', ['Qd', '7c'], 71704, 'Q7o SB corto: fold. Panic shove OOP vs cover es el leak del short desesperado.', pf10, 'fancy_play'),
    R('s07-05', 'BTN', ['8s', '8c'], 71705, '88 short: shove value. Par medio — quieres que el cover foldee o ir a equity decente.', pf10),
    R('s07-06', 'BTN', ['7s', '6s'], 71706, '76s BTN corto: shove frecuente. Conectores suited con fold equity vs cover.', pf10),
    R('s07-07', 'SB', ['9c', '6d'], 71707, '96o SB corto: fold. Sin equity ni fold equity real.', pf10, 'dominated'),
    R('s07-08', 'BTN', ['Kd', 'Kh'], 71708, 'KK ~12 bb: shove value. Premium vs cover — no open min.', pf12),
    R('s07-09', 'SB', ['Kh', 'Th'], 71709, 'KTs SB corto: shove frecuente. Charts SB cortos incluyen esta broadway suited.', pf10),
    R('s07-10', 'BTN', ['Jh', 'Td'], 71710, 'JTo BTN ~12 bb: shove candidato desde botón. Late + short = fold equity.', pf12),
    R('s07-11', 'BTN', ['Ac', 'Qc'], 71711, 'AQs ~10 bb: shove. Ax suited premium — all-in, no “ver flop barato”.', pf10),
    R('s07-12', 'SB', ['8d', '5c'], 71712, '85o SB corto: fold. Elige spots; no todas las manos “necesitan fichas”.', pf10, 'fancy_play')
  ];

  PACKS['S-10'] = [
    V('s10-01', 'BB_vs_BTN', ['As', 'Kd'], 72001, 'AKo vs shove/steal corto: call (o 3-bet shove). Incluso con ICM, premiums claros se pagan.', vsPush),
    V('s10-02', 'BB_vs_BTN', ['Jc', '8d'], 72002, 'J8o vs shove: fold. Chip EV negativo e ICM peor. Overfold vs shove es el default sano en Spins.', vsPush, 'dominated'),
    V('s10-03', 'BB_vs_SB', ['Ad', 'Kd'], 72003, 'AKs vs shove SB: call. Par fuerte — chip EV y $EV suelen coincidir.', vsPush),
    V('s10-04', 'BB_vs_BTN', ['Jh', '7d'], 72004, 'J7o vs shove BTN: fold. Equity insuficiente; el ICM pide aún más tightness.', vsPush, 'fancy_play'),
    V('s10-05', 'BB_vs_BTN', ['Tc', '4d'], 72005, 'T4o vs shove: call. Nuts. ICM no convierte AA en fold.', vsPush),
    V('s10-06', 'BB_vs_SB', ['Jd', '8c'], 72006, 'J8o vs shove: fold. Dominada y OOP. Overfold, no hero-call.', vsPush, 'dominated'),
    V('s10-07', 'BB_vs_BTN', ['Ah', 'Kd'], 72007, 'AKo vs shove: call. Premium — el ICM no te pide tirar reyes.', vsPush),
    V('s10-08', 'BB_vs_BTN', ['Qh', '9c'], 72008, 'Q9o vs shove BTN: fold frecuente. Flip feo + riesgo de bust = −EV $ típico.', vsPush, 'fancy_play'),
    V('s10-09', 'BB_vs_SB', ['As', 'Js'], 72009, 'AJs vs shove SB: call o 3-bet shove sólido. Ax fuerte — no overfold panic.', vsPush),
    V('s10-10', 'BB_vs_BTN', ['8h', '7d'], 72010, '87o vs shove: fold. Conectores offsuit no son precio vs all-in.', vsPush, 'dominated'),
    V('s10-11', 'BB_vs_BTN', ['6s', '6c'], 72011, '66 vs shove BTN: call frecuente. Par medio fuerte vs rango wide de botón corto.', vsPush),
    V('s10-12', 'BB_vs_SB', ['Ks', '7d'], 72012, 'K7o vs shove SB: fold frecuente. Dominada; ICM aprieta más que chip EV.', vsPush, 'fancy_play')
  ];

  PACKS['S-11'] = [
    V('s11-01', 'BB_vs_BTN', ['Td', '9c'], 72101, 'T9o vs shove: fold. Puede “verse” como precio en fichas; en $EV es un mal spot. Olor a +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-02', 'BB_vs_BTN', ['Ad', 'Kd'], 72102, 'AKs: call. Aquí chip EV y $EV coinciden — no todos los spots son trampa.', vsPush),
    V('s11-03', 'BB_vs_SB', ['Jh', '9d'], 72103, 'J9o vs shove: fold. Pay jump: arriesgar el torneo por un flip mediocre pierde euros.', vsPush, 'dominated'),
    V('s11-04', 'BB_vs_BTN', ['Kd', 'Kh'], 72104, 'KK: call. Premium — no inventes fold ICM con reyes.', vsPush),
    V('s11-05', 'BB_vs_BTN', ['Kc', '8h'], 72105, 'K8o vs shove: fold. El call “porque tengo outs” es el leak +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-06', 'BB_vs_SB', ['Td', 'Th'], 72106, 'TT vs shove SB: call. Equity alta; este no es el mal spot.', vsPush),
    V('s11-07', 'BB_vs_BTN', ['8c', '6d'], 72107, '86o: fold. Sin historia vs shove. El pay jump manda.', vsPush, 'dominated'),
    V('s11-08', 'BB_vs_BTN', ['9s', '9c'], 72108, '99 vs shove BTN: call frecuente. Par vs rango wide — $EV suele aguantar.', vsPush),
    V('s11-09', 'BB_vs_SB', ['Kh', '8c'], 72109, 'K8o vs shove: fold. Dominada; oler −EV $ antes de pagar.', vsPush, 'fancy_play'),
    V('s11-10', 'BB_vs_BTN', ['Jc', 'Js'], 72110, 'JJ: call. Cuando coinciden fichas y euros, paga.', vsPush),
    V('s11-11', 'BB_vs_BTN', ['Th', '5c'], 72111, 'T5o: fold. Ni chip EV ni $EV.', vsPush, 'dominated'),
    V('s11-12', 'BB_vs_SB', ['Ah', 'Ts'], 72112, 'ATo vs shove SB: call o continue sólido. Ax fuerte — no es el spot “malo”.', vsPush)
  ];

  var st5x = spin({ scenario: 'steal', stackDepth: 'bb20', spinPayout: '5x' });
  var vs5x = spin({ scenario: 'push', stackDepth: 'bb10', spinPayout: '5x' });
  PACKS['S-12'] = [
    R('s12-01', 'BTN', ['Ah', 'Qd'], 72201, 'AQo BTN 5×: shove. Premium sigue siendo shove; el 5× aprieta las manos medias, no KK/AK.', st5x),
    R('s12-02', 'BTN', ['6s', '3h'], 72202, '63o 5×: fold. Con premio gordo, spew duele más. Tight extra vs 2×/3×.', st5x, 'dominated'),
    R('s12-03', 'SB', ['9s', '6c'], 72203, '96o SB 5×: fold. En 5× el 1.º pesa: menos steals locos OOP.', st5x, 'fancy_play'),
    R('s12-04', 'BTN', ['8h', '8d'], 72204, '88 BTN 5×: shove value. Par medio fuerte sigue siendo plan shove a 20 bb.', st5x),
    V('s12-05', 'BB_vs_BTN', ['9c', '5h'], 72205, '95o vs shove en 5×: fold. Overfold más que en 2× — el bust te saca de un prize pool gordo.', vs5x, 'fancy_play'),
    V('s12-06', 'BB_vs_BTN', ['Jh', 'Jd'], 72206, 'JJ 5×: call. El multiplicador no pide tirar ases.', vs5x),
    R('s12-07', 'SB', ['Kh', 'Js'], 72207, 'KJo SB 5×: open steal razonable (no shove panic). Broadway usable; 5× pide menos locura, no parálisis.', st5x),
    R('s12-08', 'BTN', ['5c', '4d'], 72208, '54o 5×: fold. En 5× el steal basura es aún peor.', st5x, 'dominated'),
    V('s12-09', 'BB_vs_SB', ['Qh', '8c'], 72209, 'Q8o vs shove 5×: fold. Tight extra vs 3×.', vs5x, 'fancy_play'),
    V('s12-10', 'BB_vs_BTN', ['Kd', 'Kh'], 72210, 'KK 5×: call. Premium = paga.', vs5x),
    R('s12-11', 'BTN', ['Th', '9h'], 72211, 'T9s BTN 5×: open steal ~2,5 bb (no shove). Jugabilidad; 5× no elimina el steal con conectores, sí el spew.', st5x),
    R('s12-12', 'SB', ['Jd', '8c'], 72212, 'J8o SB 5×: fold. Misma mano, distinto multiplicador: aquí más tight.', st5x, 'dominated')
  ];

  PACKS['S-13'] = [
    R('s13-01', 'BTN', ['As', 'Ts'], 72301, 'Examen ICM: ATs ~12 bb BTN — shove. Zona push/fold, no min-raise.', pf12),
    R('s13-02', 'BTN', ['9h', '7d'], 72302, '97o corto: fold. Checklist: ¿fichas o euros? Aquí ni siquiera fichas.', pf12, 'dominated'),
    V('s13-03', 'BB_vs_BTN', ['Jh', 'Jd'], 72303, 'JJ vs shove: call. Premium — ICM no lo tira.', vsPush),
    V('s13-04', 'BB_vs_BTN', ['Td', '6s'], 72304, 'T6o vs shove: fold. Olor a −EV $.', vsPush, 'fancy_play'),
    R('s13-05', 'SB', ['Kh', 'Js'], 72305, 'KJo SB corto: shove. Push/fold limpio.', pf10),
    V('s13-06', 'BB_vs_SB', ['Qh', '9c'], 72306, 'Q9o vs shove: fold. Overfold vs shove en examen ICM.', vsPush, 'fancy_play'),
    R('s13-07', 'BTN', ['7s', '7c'], 72307, '77 ~10 bb: shove value.', pf10),
    V('s13-08', 'BB_vs_BTN', ['8d', '6c'], 72308, '86o vs shove: fold.', vsPush, 'dominated'),
    R('s13-09', 'BTN', ['Ts', 'Tc'], 72309, 'TT 12 bb: shove. No open min en examen.', pf12),
    V('s13-10', 'BB_vs_BTN', ['Kd', 'Kh'], 72310, 'KK vs shove: call.', vsPush),
    R('s13-11', 'SB', ['Jd', '7h'], 72311, 'J7o SB corto: fold. No panic shove.', pf10, 'fancy_play'),
    V('s13-12', 'BB_vs_SB', ['As', 'Ah'], 72312, 'AA vs shove: call. Checklist cerrado.', vsPush)
  ];

  PACKS['S-14'] = [
    R('s14-01', 'BTN', ['As', 'Ts'], 72401, 'ATs HU/corto: shove. Bubble factor: el pay jump HU duele — elige spots con fold equity, no flips basura.', pf12),
    R('s14-02', 'BTN', ['Kh', '7c'], 72402, 'K7o: fold. No flippees barato el 2.º por orgullo.', pf12, 'dominated'),
    V('s14-03', 'BB_vs_BTN', ['Jd', '8h'], 72403, 'J8o vs shove cerca de HU: fold. Bubble factor alto — overfold.', vsPush, 'fancy_play'),
    V('s14-04', 'BB_vs_BTN', ['Ac', 'Qc'], 72404, 'AQs vs shove: call. Incluso con bubble factor, premiums se pagan.', vsPush),
    R('s14-05', 'SB', ['Kh', 'Js'], 72405, 'KJo SB corto: shove. Presión de pay jump no paraliza broadway usable.', pf10),
    V('s14-06', 'BB_vs_BTN', ['8h', '5d'], 72406, '85o vs shove: fold. Flip mediocre + jump = mala compra.', vsPush, 'fancy_play'),
    R('s14-07', 'BTN', ['Td', 'Tc'], 72407, 'TT: shove value. Par vs rango — no es flip de basura.', pf10),
    V('s14-08', 'BB_vs_SB', ['Qd', '8c'], 72408, 'Q8o: fold.', vsPush, 'dominated'),
    R('s14-09', 'BTN', ['Ah', 'Jh'], 72409, 'AJs: shove. Bubble mental ≠ never shove premiums.', pf12),
    V('s14-10', 'BB_vs_BTN', ['Ks', 'Qs'], 72410, 'KQs: call vs shove.', vsPush),
    R('s14-11', 'SB', ['Qh', '6s'], 72411, 'Q6o SB: fold. No compres el 2.º con panic shove.', pf10, 'fancy_play'),
    V('s14-12', 'BB_vs_BTN', ['Qs', 'Qd'], 72412, 'QQ: call. El bubble factor no tira ases.', vsPush)
  ];

  PACKS['S-15'] = [
    R('s15-01', 'BTN', ['As', 'Ts'], 72501, 'ATs shove 10–12 bb: mide tu rango (Ax suited, pares, broadway) vs el call del BB, no vs “tiene QQ”.', pf12),
    R('s15-02', 'BTN', ['Jh', '7s'], 72502, 'J7o no está en el rango de shove. Range vs range empieza por no meter basura en tu banda.', pf12, 'dominated'),
    V('s15-03', 'BB_vs_BTN', ['Qs', 'Qh'], 72503, 'QQ vs rango de shove BTN corto: call. AK gana vs un shove wide, no vs una mano concreta.', vsPush),
    V('s15-04', 'BB_vs_BTN', ['Qc', '7h'], 72504, 'Q7o vs ese mismo rango: fold. Contra la banda, no contra “creo que tiene 87s”.', vsPush, 'fancy_play'),
    R('s15-05', 'SB', ['Kh', 'Js'], 72505, 'KJo SB: shove frecuente — entra en la banda SB corta.', pf10),
    V('s15-06', 'BB_vs_SB', ['Qh', '9c'], 72506, 'Q9o vs shove SB: fold. El rango de shove SB es más tight que BTN; Q9o queda fuera.', vsPush, 'fancy_play'),
    R('s15-07', 'BTN', ['8s', '8c'], 72507, '88: shove value. Par medio es banda de valor, no “una mano bonita”.', pf10),
    V('s15-08', 'BB_vs_BTN', ['Td', '6h'], 72508, 'T6o: fold. Fuera de cualquier banda de call.', vsPush, 'dominated'),
    R('s15-09', 'BTN', ['As', '6s'], 72509, 'A6s: shove frecuente. Ax suited = banda de presión + blocker de as.', pf10),
    V('s15-10', 'BB_vs_BTN', ['As', 'Kd'], 72510, 'AKo vs shove BTN: call. Tu par contra un rango, no contra AK imaginario.', vsPush),
    R('s15-11', 'SB', ['Ad', '9c'], 72511, 'A9o SB corto: shove frecuente. Entra en muchos charts SB.', pf10),
    V('s15-12', 'BB_vs_SB', ['Jh', '8d'], 72512, 'J8o vs shove: fold. No asignes “él tiene air” para justificar el call.', vsPush, 'fancy_play')
  ];

  PACKS['S-16'] = [
    R('s16-01', 'BTN', ['Jh', 'Td'], 72601, 'Vs nit (folda mucho): JTo BTN steal OK. Explotas el overfold — más wide que vs GTO ciego.', st20),
    R('s16-02', 'BTN', ['Qh', '3d'], 72602, 'Vs nit tampoco Q3o. Explotación no es spew: el nit paga a veces y entonces estás muerto.', st20, 'dominated'),
    V('s16-03', 'BB_vs_BTN', ['Ad', 'Kd'], 72603, 'Vs maniac que abre/shovea wide: AKs call/3-bet value. Value más limpio, menos farol.', vs20),
    V('s16-04', 'BB_vs_BTN', ['Th', '7c'], 72604, 'Vs maniac con T7o: fold. Él paga y shovea wide — no farolees ni hero-calles basura.', vs20, 'fancy_play'),
    R('s16-05', 'SB', ['Ah', '4h'], 72605, 'Vs nit SB A4s: steal razonable. El nit tira ciegas; Ax suited castiga.', st20),
    V('s16-06', 'BB_vs_BTN', ['Qd', '7c'], 72606, 'Q7o vs cualquier perfil: fold.', vs20, 'dominated'),
    R('s16-07', 'BTN', ['7h', '7d'], 72607, '77 vs nit: shove/open fuerte. Value — el nit foldea de más.', st20),
    V('s16-08', 'BB_vs_BTN', ['Td', 'Th'], 72608, 'TT vs maniac: 3-bet shove value. Cobra al que juega demasiadas manos.', vs20),
    R('s16-09', 'BTN', ['Jh', '9h'], 72609, 'J9s vs nit: steal OK. Vs maniac serías más cauto; aquí el nit tira.', st20),
    V('s16-10', 'BB_vs_BTN', ['Kh', '8d'], 72610, 'K8o vs maniac: fold. Él no tira; tu farol muere. Tight vs agresión loca.', vs20, 'fancy_play'),
    R('s16-11', 'SB', ['Qd', '7c'], 72611, 'Q7o SB vs nit: a menudo fold igual — OOP. Explotar no es abrir basura OOP.', st20, 'fancy_play'),
    V('s16-12', 'BB_vs_SB', ['Ah', 'Js'], 72612, 'AJo vs steal: 3-bet/continue. Vs nit presión; vs maniac value. Ambos perfiles: no fold panic con AJ.', vs20)
  ];

  PACKS['S-17'] = [
    R('s17-01', 'BTN', ['Jc', 'Js'], 72701, 'Pro Spin: JJ ~20 bb shove. Etiqueta el spot (steal corto) antes de clicar.', st20),
    R('s17-02', 'BTN', ['Kh', '2c'], 72702, 'K2o: fold. Mapa: no es iso, no es push premium, es basura.', st20, 'dominated'),
    V('s17-03', 'BB_vs_BTN', ['Ah', 'Qd'], 72703, 'AQo vs steal: 3-bet shove. Defensa BB, no overdefend.', vs20),
    V('s17-04', 'BB_vs_BTN', ['9d', '7h'], 72704, '97o vs steal/shove: fold. ICM + rango.', vs20, 'fancy_play'),
    R('s17-05', 'BTN', ['As', 'Ts'], 72705, 'ATs 12 bb: shove. Push/fold limpio.', pf12),
    bb('s17-06', ['Ah', 'Js'], 72706, { teachBack: 'AJo BB vs limp SB: iso. En 3-max aíslas con fuertes, no check eterno.', playConfig: spin({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
    R('s17-07', 'SB', ['Jh', '8d'], 72707, 'J8o SB corto: fold. No panic.', pf10, 'fancy_play'),
    V('s17-08', 'BB_vs_BTN', ['Jh', 'Jd'], 72708, 'JJ vs steal: 3-bet shove value.', vs20),
    R('s17-09', 'BTN', ['5c', '4c'], 72709, '54s BTN 20 bb: open steal ~2,5 bb. Mano media del rango.', st20),
    V('s17-10', 'BB_vs_BTN', ['Kc', '6h'], 72710, 'K6o vs steal: fold.', vs20, 'dominated'),
    R('s17-11', 'BTN', ['Ts', 'Th'], 72711, 'TT ~10 bb: shove.', pf10),
    V('s17-12', 'BB_vs_BTN', ['Ts', 'Tc'], 72712, 'TT vs shove/steal: call o 3-bet. Certificación: premium se cobra.', vsPush)
  ];

  /* —— MTT —— */
  var early = mtt({ mttPhase: 'early', stackDepth: 'bb40' });
  var midSt = mtt({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' });
  var mid25 = mtt({ mttPhase: 'mid', stackDepth: 'bb25' });
  var big45 = mtt({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb45' });
  var mid22 = mtt({ mttPhase: 'mid', stackDepth: 'bb22' });
  var pushM = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' });
  var push12 = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' });
  var vsMid = mtt({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' });
  var vsPushM = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' });
  var vsBig = mtt({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb45' });
  var f3mid = mtt({ scenario: 'face3bet', mttPhase: 'mid', stackDepth: 'bb22' });

  PACKS['T-00'] = [
    R('t00-01', 'BTN', ['Ah', 'Td'], 73001, 'Early (~40 bb) ATo BTN: open cash-like. Fase early = paciencia y opens claros, no shove.', early),
    R('t00-02', 'UTG', ['Jh', 'Td'], 73002, 'Early UTG JTo: fold. Ante o no, early no spew desde early position.', early, 'dominated'),
    R('t00-03', 'CO', ['Ks', 'Js'], 73003, 'Early KJs CO: open. Construyes stack con iniciativa; el ante aún no te obliga a locura.', early),
    R('t00-04', 'BTN', ['Ah', '8h'], 73004, 'Mid (~25 bb) A8s BTN: steal. Cambió la fase: ahora robas más que en early.', midSt),
    R('t00-05', 'BTN', ['8c', '2h'], 73005, 'Mid 82o: fold. El ante no convierte basura en steal.', midSt, 'dominated'),
    R('t00-06', 'CO', ['As', '3s'], 73006, 'Mid A3s CO: steal/open OK. Stack en bb + fase mid = más fold equity que early.', midSt),
    R('t00-07', 'BTN', ['As', 'Ts'], 73007, 'Push (~10–12 bb) ATs BTN: shove. Fase push: o all-in o fold — el open min es leak.', push12),
    R('t00-08', 'BTN', ['9c', '6d'], 73008, 'Push 96o: fold. Distinta fase, misma basura: no panic shove.', push12, 'dominated'),
    R('t00-09', 'SB', ['Kh', 'Jh'], 73009, 'Push KJs SB: shove. Cuenta bb: ya no estás early.', pushM),
    R('t00-10', 'UTG', ['Ts', '7c'], 73010, 'Early T7o UTG: fold. Identifica fase ANTES de las cartas.', early, 'fancy_play'),
    R('t00-11', 'BTN', ['Jh', 'Jc'], 73011, 'Mid JJ BTN: open. Par medio en mid — iniciativa, no esperar a ser short.', midSt),
    R('t00-12', 'BTN', ['Ts', 'Tc'], 73012, 'Push TT: shove. Par fuerte en zona corta — all-in.', pushM)
  ];

  PACKS['T-10'] = [
    V('t10-01', 'BB_vs_BTN', ['Qs', 'Qh'], 74001, 'QQ/QQ vs shove corto: call chip EV. Equity vs rango wide — base antes del ICM fino.', vsPushM),
    V('t10-02', 'BB_vs_BTN', ['9h', '7d'], 74002, '97o vs shove: fold. Ni chip EV. “Ver” no es argumento.', vsPushM, 'dominated'),
    V('t10-03', 'BB_vs_SB', ['As', 'Kd'], 74003, 'AKo vs shove: call. Par fuerte — chip EV claro.', vsPushM),
    V('t10-04', 'BB_vs_BTN', ['Td', '6s'], 74004, 'T6o vs shove: fold. Equity insuficiente vs el rango.', vsPushM, 'fancy_play'),
    V('t10-05', 'BB_vs_BTN', ['Jh', 'Jd'], 74005, 'JJ: call. Chip EV máximo.', vsPushM),
    V('t10-06', 'BB_vs_SB', ['Jd', '8c'], 74006, 'J8o: fold. Dominada.', vsPushM, 'dominated'),
    V('t10-07', 'BB_vs_BTN', ['Qs', 'Qd'], 74007, 'QQ: call.', vsPushM),
    V('t10-08', 'BB_vs_BTN', ['Qh', '9c'], 74008, 'Q9o vs shove BTN: fold frecuente. Zona gris hacia fold — no “quiero ver”.', vsPushM, 'fancy_play'),
    V('t10-09', 'BB_vs_SB', ['As', 'Js'], 74009, 'AJs vs shove SB: call sólido. Ax fuerte vs rango.', vsPushM),
    V('t10-10', 'BB_vs_BTN', ['8h', '7d'], 74010, '87o: fold. Precio vs all-in no está.', vsPushM, 'dominated'),
    V('t10-11', 'BB_vs_BTN', ['6s', '6c'], 74011, '66 vs shove BTN: call frecuente. Par vs rango wide.', vsPushM),
    V('t10-12', 'BB_vs_CO', ['Qh', '8c'], 74012, 'Q8o vs shove CO: fold frecuente. CO shoves tighter que BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-11'] = [
    V('t11-01', 'BB_vs_BTN', ['Ad', 'Kd'], 74101, 'AKs vs shove: call. ICM aprieta, pero premiums siguen pagándose.', vsPushM),
    V('t11-02', 'BB_vs_BTN', ['8h', '5d'], 74102, '85o: fold. $EV pide más tightness que chip EV — este ya era fold en fichas.', vsPushM, 'fancy_play'),
    V('t11-03', 'BB_vs_SB', ['Td', 'Th'], 74103, 'TT: call. ICM no tira damas.', vsPushM),
    V('t11-04', 'BB_vs_BTN', ['Qh', '9c'], 74104, 'Q9o vs shove: fold. Overfold vs chip EV: correcto cerca de premios.', vsPushM, 'fancy_play'),
    V('t11-05', 'BB_vs_BTN', ['Ah', 'Ah'], 74105, 'AA: call.', vsPushM),
    V('t11-06', 'BB_vs_SB', ['Qh', '9d'], 74106, 'Q9o: fold.', vsPushM, 'dominated'),
    V('t11-07', 'BB_vs_BTN', ['Jh', 'Jc'], 74107, 'JJ: call.', vsPushM),
    V('t11-08', 'BB_vs_BTN', ['Jh', '9d'], 74108, 'J9o: fold. $EV castiga el flip mediocre.', vsPushM, 'fancy_play'),
    V('t11-09', 'BB_vs_SB', ['As', 'Js'], 74109, 'AJs: call/continue. Ax fuerte — no panic fold ICM.', vsPushM),
    V('t11-10', 'BB_vs_BTN', ['8h', '6c'], 74110, '86o: fold.', vsPushM, 'dominated'),
    V('t11-11', 'BB_vs_BTN', ['9s', '9c'], 74111, '99 vs shove BTN: call frecuente. Par vs wide — $EV suele aguantar.', vsPushM),
    V('t11-12', 'BB_vs_CO', ['Kc', 'Td'], 74112, 'KTo vs shove CO: fold frecuente. ICM más tight que vs BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-12'] = [
    R('t12-01', 'BTN', ['Ts', '9s'], 74201, 'Examen short: T9s BTN ~12 bb shove. ¿20–12 o push? Aquí push/fold.', push12),
    R('t12-02', 'BTN', ['8d', '6c'], 74202, '86o: fold. No open min a 9 bb.', push12, 'dominated'),
    V('t12-03', 'BB_vs_BTN', ['Jc', 'Js'], 74203, 'JJ vs shove: call chip EV (y suele $EV).', vsPushM),
    V('t12-04', 'BB_vs_BTN', ['Qc', '7h'], 74204, 'Q7o vs shove: fold. ICM + equity.', vsPushM, 'fancy_play'),
    R('t12-05', 'CO', ['8h', '8d'], 74205, '88 ~12 bb: shove value. Zona 20–12/push: par medio va all-in.', push12),
    R('t12-06', 'SB', ['Qd', '7c'], 74206, 'Q7o SB corto: fold.', pushM, 'fancy_play'),
    V('t12-07', 'BB_vs_BTN', ['Ah', 'Qd'], 74207, 'AQo: call vs shove.', vsPushM),
    R('t12-08', 'BTN', ['As', 'Ts'], 74208, 'ATs corto: shove.', push12),
    V('t12-09', 'BB_vs_BTN', ['Js', '9c'], 74209, 'J9o vs shove: fold.', vsPushM, 'dominated'),
    R('t12-10', 'SB', ['Ks', 'Ts'], 74210, 'KTs SB: shove frecuente.', pushM),
    V('t12-11', 'BB_vs_SB', ['Qs', 'Qd'], 74211, 'QQ: call.', vsPushM),
    R('t12-12', 'BTN', ['Jd', '8h'], 74212, 'J8o 12 bb: shove. Checklist: bb → shove/fold → ejecuta.', push12)
  ];

  PACKS['T-13'] = [
    R('t13-01', 'BTN', ['As', '9h'], 74301, 'Big (~45 bb) BTN A9o: steal. Rol big = presión. Identifica rol antes de la mano.', big45),
    R('t13-02', 'BTN', ['6h', '2c'], 74302, 'Big con 62o: fold. Rol no lava basura.', big45, 'dominated'),
    R('t13-03', 'CO', ['Jh', '8d'], 74303, 'Mid (~22 bb) CO J8o con covers detrás: fold. Rol mid = sobrevivir, no chocar.', mid22, 'fancy_play'),
    R('t13-04', 'BTN', ['As', 'Ts'], 74304, 'Short BTN ATs: shove. Rol short = ladder/doble selectivo.', push12),
    V('t13-05', 'BB_vs_BTN', ['Kh', '8d'], 74305, 'Cover/big vs open wide con K8o: fold. No pagues light “soy cover”.', vsBig, 'fancy_play'),
    V('t13-06', 'BB_vs_BTN', ['Jh', 'Jd'], 74306, 'Cover JJ vs open BTN: 3-bet value. Big también cobra premiums.', vsBig),
    R('t13-07', 'UTG', ['Ad', '7d'], 74307, 'Mid UTG A7s: fold. Early + mid + covers = disciplina.', mid25, 'dominated'),
    R('t13-08', 'BTN', ['7s', '7c'], 74308, 'Mid BTN 77: open. Spot limpio — mid no es “nunca juego”.', mid25),
    R('t13-09', 'BTN', ['Kh', '7c'], 74309, 'Short K7o: fold. Ladder no es panic shove.', push12, 'dominated'),
    F3('t13-10', 'BTN_vs_BB', ['Td', 'Tc'], 74310, 'Mid TT vs 3-bet del cover: fold frecuente. Evita coin flip vs quien te elimina.', f3mid, 'fancy_play'),
    R('t13-11', 'SB', ['Kh', 'Jh'], 74311, 'Short SB KJs: shove. Rol short en late.', pushM),
    R('t13-12', 'BTN', ['Ts', 'Tc'], 74312, 'Big TT BTN: open/presión. El big abre más; no spew, sí iniciativa.', big45)
  ];

  PACKS['T-14'] = [
    R('t14-01', 'BTN', ['Kc', 'Ts'], 74401, 'Big stack BTN KTo: steal. Presión ICM = fold equity, no call light.', big45),
    R('t14-02', 'BTN', ['5d', '3c'], 74402, '53o big: fold. Presión ≠ pagar/abrir basura.', big45, 'dominated'),
    R('t14-03', 'CO', ['As', '6s'], 74403, 'Big CO A6s: open/steal. Castigas mids que overfoldean.', big45),
    V('t14-04', 'BB_vs_BTN', ['Qd', '9c'], 74404, 'Big vs open: Q9o fold. Si el short ya está committed, no regales el doble.', vsBig, 'fancy_play'),
    V('t14-05', 'BB_vs_BTN', ['Kd', 'Kh'], 74405, 'KK big vs open: 3-bet value. Cobra; no flat eterno por “presión”.', vsBig),
    R('t14-06', 'SB', ['Qd', 'Td'], 74406, 'Big SB QTs: open frecuente. Presión desde ciegas con broadway.', big45),
    R('t14-07', 'BTN', ['Th', '9h'], 74407, 'T9s big BTN: steal. Jugabilidad + fold equity vs mids asustados.', big45),
    V('t14-08', 'BB_vs_BTN', ['9c', '5h'], 74408, '95o vs open: fold. El big no hero-calla.', vsBig, 'dominated'),
    R('t14-09', 'CO', ['Jd', '8c'], 74409, 'J8o CO: fold típico. Presión selectiva, no cualquier offsuit.', big45, 'fancy_play'),
    V('t14-10', 'BB_vs_BTN', ['Ac', 'Qc'], 74410, 'AQs big: 3-bet value. Misma lógica que QQ.', vsBig),
    R('t14-11', 'BTN', ['As', 'Jd'], 74411, 'AJo BTN big: steal claro.', big45),
    R('t14-12', 'SB', ['4s', '2d'], 74412, '42o SB: fold. Cover no stealea basura OOP.', big45, 'dominated')
  ];

  PACKS['T-15'] = [
    R('t15-01', 'CO', ['Ts', '7c'], 74501, 'Mid CO T7o con covers: fold. Supervivencia = no opens flojos vs quien te elimina.', mid22, 'fancy_play'),
    R('t15-02', 'UTG', ['Ah', '4h'], 74502, 'Mid UTG A4s: fold. Demasiada gente (y covers) detrás.', mid25, 'dominated'),
    R('t15-03', 'BTN', ['8s', '8c'], 74503, 'Mid BTN 88: open. Supervivir no es foldear premiums/pares claros.', mid25),
    F3('t15-04', 'BTN_vs_BB', ['7h', '7d'], 74504, 'Mid 77 vs 3-bet cover: fold frecuente. Evita el coin flip de eliminación.', f3mid, 'fancy_play'),
    R('t15-05', 'BTN', ['Ah', 'Td'], 74505, 'Mid ATo BTN: open. Late + mano fuerte = spot limpio.', mid25),
    R('t15-06', 'HJ', ['Js', '9h'], 74506, 'Mid J9o HJ: fold frecuente. Mid no spew middle.', mid25, 'fancy_play'),
    F3('t15-07', 'BTN_vs_BB', ['7d', '3c'], 74507, '73o vs 3-bet: fold. Obvio — el mid no hero-calla.', f3mid, 'dominated'),
    R('t15-08', 'CO', ['Ah', 'Jh'], 74508, 'AJs CO mid: open. Value — supervivencia no es parálisis.', mid25),
    F3('t15-09', 'CO_vs_BB', ['Ah', 'Td'], 74509, 'ATo CO vs 3-bet cover: fold frecuente. OOP + eliminación.', f3mid, 'fancy_play'),
    R('t15-10', 'BTN', ['Jh', '9h'], 74510, 'J9s BTN mid: open razonable. Jugabilidad en late.', mid25),
    R('t15-11', 'UTG', ['Ad', '8c'], 74511, 'A8o UTG: fold.', mid25, 'dominated'),
    F3('t15-12', 'BTN_vs_BB', ['Ts', 'Tc'], 74512, 'TT vs 3-bet: 4-bet/call value. Mid también stackea premiums.', f3mid)
  ];

  PACKS['T-16'] = [
    R('t16-01', 'BTN', ['As', 'Ts'], 74601, 'Short BTN ATs: shove. Ladder: late + folds delante. No UTG basura.', push12),
    R('t16-02', 'UTG', ['9h', '7d'], 74602, 'Short UTG 97o: fold. Antitexto del ladder: early + basura = bust.', push12, 'fancy_play'),
    R('t16-03', 'SB', ['Kh', 'Jh'], 74603, 'Short SB KJs: shove. Late-ish + broadway.', pushM),
    R('t16-04', 'BTN', ['Qd', '8c'], 74604, 'Q8o: fold. A veces fold + esperar eliminación ajena es el ladder.', push12, 'dominated'),
    R('t16-05', 'CO', ['Ts', 'Th'], 74605, 'TT short: shove. Par — double-up claro.', push12),
    R('t16-06', 'SB', ['Kc', '8h'], 74606, 'K8o SB: fold. Selectivo, no panic.', pushM, 'fancy_play'),
    R('t16-07', 'BTN', ['As', '3s'], 74607, 'A3s BTN: shove frecuente. Fold equity vs mids ICM-tight.', pushM),
    R('t16-08', 'CO', ['Jh', 'Td'], 74608, 'JTo CO corto: fold frecuente. No tan late como BTN.', push12, 'fancy_play'),
    R('t16-09', 'BTN', ['Ks', 'Qs'], 74609, 'KQs: shove. Ladder también es value shove.', push12),
    R('t16-10', 'SB', ['Jh', '7s'], 74610, 'J7o SB: fold.', pushM, 'dominated'),
    R('t16-11', 'BTN', ['5c', '4c'], 74611, '54s BTN corto: shove candidato. Conector + late.', push12),
    R('t16-12', 'UTG', ['Kd', '9h'], 74612, 'K9o UTG: fold. Espera un asiento mejor.', push12, 'dominated')
  ];

  PACKS['T-17'] = [
    R('t17-01', 'BTN', ['Qs', 'Jh'], 74701, 'Post-ITM QJo BTN mid: steal OK. Ya cobras mínimo, pero el jump sigue: abre, no spew.', midSt),
    R('t17-02', 'BTN', ['8h', '3d'], 74702, '83o post-ITM: fold. “Ya estoy pagado” no es all-in light.', midSt, 'dominated'),
    V('t17-03', 'BB_vs_BTN', ['Th', '7c'], 74703, 'T7o vs shove post-ITM: fold. ICM sigue encendido.', vsPushM, 'fancy_play'),
    V('t17-04', 'BB_vs_BTN', ['Qs', 'Qh'], 74704, 'QQ vs shove: call. Pay jump no tira AK.', vsPushM),
    R('t17-05', 'CO', ['Ad', '8d'], 74705, 'A8s CO: steal. Más agresión que burbuja extrema, no locura.', midSt),
    R('t17-06', 'CO', ['Jd', '8c'], 74706, 'J8o CO: fold. Post-bubble ≠ cualquier offsuit.', midSt, 'fancy_play'),
    V('t17-07', 'BB_vs_BTN', ['As', 'Kd'], 74707, 'AKo: call vs shove.', vsPushM),
    R('t17-08', 'BTN', ['8d', '6d'], 74708, '86s BTN: steal. Jugabilidad post-ITM.', midSt),
    V('t17-09', 'BB_vs_BTN', ['Kc', '8d'], 74709, 'K8o vs shove: fold.', vsPushM, 'dominated'),
    R('t17-10', 'SB', ['Qd', 'Td'], 74710, 'QTs SB: open/steal frecuente.', midSt),
    R('t17-11', 'BTN', ['As', 'Ts'], 74711, 'ATs corto: shove. ITM no apaga push/fold.', push12),
    V('t17-12', 'BB_vs_BTN', ['Kd', 'Kh'], 74712, 'KK: call. El min-cash no cambia nuts.', vsPushM)
  ];

  PACKS['T-18'] = [
    R('t18-01', 'BTN', ['Jh', 'Td'], 74801, 'Examen bubble: ¿rol big? JTo steal. Presión.', big45),
    R('t18-02', 'CO', ['9s', '6c'], 74802, '¿Rol mid? 96o fold vs covers.', mid22, 'fancy_play'),
    R('t18-03', 'BTN', ['As', 'Ts'], 74803, '¿Rol short? ATs shove.', push12),
    V('t18-04', 'BB_vs_BTN', ['Td', '9c'], 74804, 'Cover T9o vs open: fold. No dobles fáciles.', vsBig, 'fancy_play'),
    R('t18-05', 'BTN', ['9c', '2s'], 74805, '92o cualquier rol: fold.', big45, 'dominated'),
    F3('t18-06', 'BTN_vs_BB', ['Jh', 'Jc'], 74806, 'Mid JJ vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t18-07', 'BB_vs_BTN', ['Ad', 'Kd'], 74807, 'AKs cover: 3-bet value.', vsBig),
    R('t18-08', 'UTG', ['Ac', '9c'], 74808, 'Mid UTG A9s: fold.', mid25, 'dominated'),
    R('t18-09', 'SB', ['Kh', 'Jh'], 74809, 'Short SB KJs: shove.', pushM),
    R('t18-10', 'BTN', ['6s', '6c'], 74810, 'Mid 66 BTN: open. Supervivir ≠ parálisis.', mid25),
    V('t18-11', 'BB_vs_BTN', ['Td', 'Th'], 74811, 'TT cover: 3-bet.', vsBig),
    R('t18-12', 'BTN', ['Td', '6h'], 74812, 'Short T6o: fold. Checklist: rol → job → acción.', push12, 'dominated')
  ];

  PACKS['T-19'] = [
    R('t19-01', 'BTN', ['Ah', '8h'], 74901, 'FT big A8s BTN: steal. ICM a máximo volumen — presión de cover.', big45),
    R('t19-02', 'CO', ['Jd', '7h'], 74902, 'FT mid J7o: fold. Jumps enormes; no chocar vs cover.', mid22, 'fancy_play'),
    R('t19-03', 'BTN', ['As', 'Ts'], 74903, 'FT short ATs: shove selectivo. Pick spots, no UTG trash.', push12),
    V('t19-04', 'BB_vs_BTN', ['Qc', 'Th'], 74904, 'FT cover QTo vs open: fold. Un flip malo destroza horas.', vsBig, 'fancy_play'),
    V('t19-05', 'BB_vs_BTN', ['Jc', 'Js'], 74905, 'JJ FT: 3-bet value. Premium sigue siendo bote grande.', vsBig),
    R('t19-06', 'BTN', ['Js', '4d'], 74906, 'J4o FT: fold. Cualquier rol.', big45, 'dominated'),
    F3('t19-07', 'BTN_vs_BB', ['9h', '9c'], 74907, 'Mid 99 vs 3-bet chip leader: fold frecuente. ICM FT.', f3mid, 'fancy_play'),
    R('t19-08', 'BTN', ['8h', '8d'], 74908, 'Mid/FT 88 BTN: open si el spot es limpio.', mid25),
    R('t19-09', 'SB', ['Kh', 'Jh'], 74909, 'Short FT KJs SB: shove.', pushM),
    V('t19-10', 'BB_vs_BTN', ['Ah', 'Qd'], 74910, 'AQo FT: 3-bet value.', vsBig),
    R('t19-11', 'UTG', ['Ah', '2h'], 74911, 'A2s UTG FT: fold. Covers detrás.', mid25, 'dominated'),
    R('t19-12', 'BTN', ['Jh', 'Jd'], 74912, 'JJ BTN FT: open/presión. Mapa usable, no solver de FT.', big45)
  ];

  PACKS['T-20'] = [
    V('t20-01', 'BB_vs_BTN', ['9d', '7h'], 75001, '97o vs shove: fold. Verbaliza: “en fichas dudoso; en dinero me tiro”. Drill chip EV vs $EV.', vsPushM, 'fancy_play'),
    V('t20-02', 'BB_vs_BTN', ['Ts', 'Tc'], 75002, 'TT: call. Aquí coinciden chip EV y $EV — dilo en voz alta.', vsPushM),
    V('t20-03', 'BB_vs_BTN', ['Qh', '9c'], 75003, 'Q9o: fold. +EV chips dudoso / −EV $ típico de burbuja-FT.', vsPushM, 'fancy_play'),
    V('t20-04', 'BB_vs_BTN', ['Ad', 'Kd'], 75004, 'AKs: call. Coinciden.', vsPushM),
    V('t20-05', 'BB_vs_SB', ['Jd', '8c'], 75005, 'J8o: fold. Ni fichas ni dinero.', vsPushM, 'dominated'),
    V('t20-06', 'BB_vs_BTN', ['Kd', 'Kh'], 75006, 'KK: call. Premium alinea ambos EV.', vsPushM),
    V('t20-07', 'BB_vs_BTN', ['Jh', '9d'], 75007, 'J9o: fold. “En fichas a veces pago; en dinero no.”', vsPushM, 'fancy_play'),
    V('t20-08', 'BB_vs_BTN', ['As', 'Ah'], 75008, 'AA: call.', vsPushM),
    V('t20-09', 'BB_vs_SB', ['Td', '8h'], 75009, 'T8o: fold.', vsPushM, 'dominated'),
    V('t20-10', 'BB_vs_BTN', ['7s', '7c'], 75010, '77 vs shove BTN: call frecuente. Par vs wide — suelen coincidir.', vsPushM),
    V('t20-11', 'BB_vs_CO', ['Ks', '7d'], 75011, 'K7o vs shove CO: fold. $EV aprieta vs rangos menos wide.', vsPushM, 'fancy_play'),
    V('t20-12', 'BB_vs_SB', ['As', 'Js'], 75012, 'AJs: call. Ax fuerte — no idolatres solo el miedo ICM.', vsPushM)
  ];

  PACKS['T-21'] = [
    R('t21-01', 'BTN', ['As', 'Ts'], 75101, '¿Qué % shovea este short BTN? ATs entra. Asigna rango de shove, luego encaja tu combo.', push12),
    R('t21-02', 'BTN', ['9c', '6d'], 75102, '96o no está en el rango de shove. Lectura: fuera de banda.', push12, 'dominated'),
    V('t21-03', 'BB_vs_BTN', ['Ac', 'Qc'], 75103, '¿Qué paga este mid vs shove short? AQs sí. Rango de call, no “su mano”.', vsPushM),
    V('t21-04', 'BB_vs_BTN', ['8s', '6c'], 75104, '86o: el mid overfoldea vs cover/shove. Fold — tu combo no entra en su banda de call.', vsPushM, 'fancy_play'),
    R('t21-05', 'SB', ['Kh', 'Jh'], 75105, 'Short SB KJs: entra en shove SB. Pregunta el % del asiento.', pushM),
    V('t21-06', 'BB_vs_BTN', ['Qh', '8c'], 75106, 'Q8o vs open del BTN wide: fold. El big no paga light por ego — tú tampoco.', vsBig, 'fancy_play'),
    R('t21-07', 'BTN', ['Td', 'Tc'], 75107, 'TT short: banda de value shove.', pushM),
    V('t21-08', 'BB_vs_BTN', ['Ah', 'Jh'], 75108, 'AJs: banda de 3-bet/call. Value vs open late.', vsBig),
    R('t21-09', 'CO', ['Qh', '6s'], 75109, 'Q6o mid CO: no entra en open vs cover. Rango recortado por rol.', mid22, 'fancy_play'),
    V('t21-10', 'BB_vs_BTN', ['8s', '7d'], 75110, '87o: fuera de todo rango de call.', vsPushM, 'dominated'),
    R('t21-11', 'BTN', ['7s', '6s'], 75111, '76s short BTN: banda de shove con blocker. Range reading, no “me gusta el as”.', pushM),
    V('t21-12', 'BB_vs_SB', ['Ah', 'Js'], 75112, 'AJo vs shove SB: entra en call. SB shovea más tight — AJ aún gana vs esa banda.', vsPushM)
  ];

  PACKS['T-22'] = [
    R('t22-01', 'BTN', ['Ah', 'Td'], 75201, 'Pro MTT: early ATo BTN open. Paso 1: fase y bb.', early),
    R('t22-02', 'UTG', ['Qh', '9c'], 75202, 'Early Q9o UTG: fold.', early, 'dominated'),
    R('t22-03', 'BTN', ['Kd', 'Jd'], 75203, 'Mid steal KJs. Paso 2: rol y job.', midSt),
    R('t22-04', 'BTN', ['As', 'Ts'], 75204, 'Push ATs shove. Fase push.', push12),
    V('t22-05', 'BB_vs_BTN', ['Jh', '7d'], 75205, 'J7o vs shove: fold $EV.', vsPushM, 'fancy_play'),
    V('t22-06', 'BB_vs_BTN', ['Ks', 'Qs'], 75206, 'KQs vs shove: call.', vsPushM),
    R('t22-07', 'BTN', ['Kh', 'Jd'], 75207, 'Bubble/FT big: KJo steal.', big45),
    R('t22-08', 'CO', ['Qd', '7c'], 75208, 'Mid bubble Q7o: fold.', mid22, 'fancy_play'),
    F3('t22-09', 'BTN_vs_BB', ['8s', '8c'], 75209, 'Mid 88 vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t22-10', 'BB_vs_BTN', ['Qs', 'Qd'], 75210, 'QQ cover: 3-bet.', vsBig),
    R('t22-11', 'BTN', ['8h', '5c'], 75211, '85o cualquier fase: fold.', push12, 'dominated'),
    R('t22-12', 'SB', ['Kh', 'Jh'], 75212, 'Short KJs SB shove. Certificación: fase → rol → acción.', pushM)
  ];

  /* —— Rangos —— */
  PACKS['R-01'] = [
    R('r01-01', 'UTG', ['As', 'Ah'], 76001, 'AA está en la esquina de la matriz 13×13 (par, celda diagonal). Open UTG: el chart lo pinta casi 100 %.', cash()),
    R('r01-02', 'UTG', ['7c', '2d'], 76002, '72o está abajo a la derecha, offsuit. UTG: 0 % — fold. Lee palo (suited arriba) vs offsuit (abajo).', cash(), 'dominated'),
    R('r01-03', 'BTN', ['9c', '7c'], 76003, '97s: conectores suited (encima de la diagonal). BTN RFI suele pintarla. Open.', cash()),
    R('r01-04', 'UTG', ['8h', '7d'], 76004, '87o: misma celda familia, debajo de la diagonal. UTG casi 0 %. Fold. Suited ≠ offsuit.', cash(), 'fancy_play'),
    R('r01-05', 'CO', ['Kd', 'Qd'], 76005, 'KQs: broadway suited. CO/BTN la pintan fuerte. Open.', cash()),
    R('r01-06', 'UTG', ['Qd', '9c'], 76006, 'Q9o UTG: celda offsuit baja frecuencia. Fold. El color de la celda te lo dice.', cash(), 'fancy_play'),
    R('r01-07', 'BTN', ['Ah', '5h'], 76007, 'A5s: Ax suited. BTN RFI típico. Open. Busca la fila A, columna 5, lado suited.', cash()),
    R('r01-08', 'HJ', ['Ah', '5d'], 76008, 'A5o HJ: offsuit, menos % que A5s. A menudo fold desde middle. Lee el % de la celda.', cash(), 'fancy_play'),
    R('r01-09', 'CO', ['Ts', 'Th'], 76009, 'TT: diagonal de pares. Casi siempre pintada en RFI late. Open.', cash()),
    R('r01-10', 'UTG', ['Qd', 'Jd'], 76010, 'QJs UTG: muchas matrices modernas la pintan. Open — no la trates como 72o.', cash()),
    R('r01-11', 'BTN', ['Th', '2c'], 76011, 'T2o BTN: celda casi vacía. Fold. Wide de botón no es 169/169.', cash(), 'dominated'),
    R('r01-12', 'SB', ['Jc', 'Js'], 76012, 'JJ SB: celda premium, alta frecuencia. Open. Practica leer posición + celda.', cash())
  ];

  PACKS['R-02'] = [
    R('r02-01', 'BTN', ['As', 'Ah'], 76101, 'RFI BTN en 60 s: pares altos siempre. AA open. Banda 1: pares.', cash()),
    R('r02-02', 'BTN', ['6d', '4c'], 76102, '64o no entra en la banda BTN. Contrasta con el menú Rangos: 0 %.', cash(), 'dominated'),
    R('r02-03', 'BTN', ['Ah', 'Td'], 76103, 'ATo: broadway offsuit — banda 2. Open desde botón.', cash()),
    R('r02-04', 'BTN', ['Td', '8d'], 76104, 'T8s: suited connectors — banda 3. Open BTN.', cash()),
    R('r02-05', 'BTN', ['Qd', 'Tc'], 76105, 'QTo: late offsuit. BTN a menudo open; no es UTG. Aquí open razonable.', cash()),
    R('r02-06', 'BTN', ['5h', '2d'], 76106, '52o: fuera de bandas. Fold. 60 s: si no es par / broadway / sc / Ax decente → fuera.', cash(), 'dominated'),
    R('r02-07', 'BTN', ['As', '6s'], 76107, 'A6s: Ax suited. Open BTN. Banda Ax.', cash()),
    R('r02-08', 'BTN', ['Jh', '8d'], 76108, 'J8o: borde. Muchas líneas fold o mix bajo. Fold frecuente — no fuerces el borde.', cash(), 'fancy_play'),
    R('r02-09', 'BTN', ['Ts', 'Th'], 76109, 'TT: pares medios. Open claro.', cash()),
    R('r02-10', 'BTN', ['Jc', 'Td'], 76110, 'JTo: broadway offsuit BTN. Open frecuente.', cash()),
    R('r02-11', 'BTN', ['4h', '3h'], 76111, '43s: sc bajos — mix/fold según chart. A menudo fold vs 65s+. Aquí fold frecuente.', cash(), 'fancy_play'),
    R('r02-12', 'BTN', ['Kh', 'Qs'], 76112, 'KQo: broadway offsuit. Open. Tras 60 s contrastas con Rangos, no memorizas píxeles.', cash())
  ];

  PACKS['R-03'] = [
    Fl('r03-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 76201, 'K72 rainbow: rango BTN wide conecta poco (pocos Kx). C-bet pequeño — ventaja de rango en seco.'),
    Fl('r03-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 76202, '987 two-tone: el caller conecta más (pares, draws). Menos c-bet auto. Textura > “tengo AQ”.', { trapTag: 'fancy_play' }),
    Fl('r03-03', 'BTN', ['Kd', 'Qd'], ['As', '8h', '3c'], 76203, 'A-high seco: % de top pair del rango IP es decente. C-bet frecuente.'),
    Fl('r03-04', 'BTN', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 76204, 'Monotone: mucho flush/draw en rangos wide. No trates como seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('r03-05', 'CO', ['Ah', 'Kd'], ['Qs', '7c', '2d'], 76205, 'Q-high seco: c-bet pequeño IP. El rango rival (BB) tiene menos Qx que tú AK backdoors.'),
    Fl('r03-06', 'BTN', ['5s', '5c'], ['Kh', '9d', '3c'], 76206, 'K-high seco con underpair: mix c-bet pequeño. El board no “conectó” tu 55; niegas equity.'),
    Fl('r03-07', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 76207, 'JT9 conectado: alto % de straight/dos pares en el caller. Pot control, no hinchar.', { trapTag: 'fancy_play' }),
    Fl('r03-08', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 76208, 'A-high seco con backdoors: c-bet ligero. Poco conectó el caller; tú tienes draws traseros.'),
    Fl('r03-09', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 76209, 'Top pair A-high seco: c-bet value. Tu rango conectó; el suyo menos two-pair.'),
    Fl('r03-10', 'CO', ['Jh', 'Td'], ['9s', '8s', '2h'], 76210, 'Semi-wet: más % de draws. No autocbet grande.', { trapTag: 'fancy_play' }),
    Fl('r03-11', 'BTN', ['Ah', 'Kd'], ['2c', '2s', '7d'], 76211, 'Paired bajo: menos two-pair en el caller wide. C-bet frecuente IP.'),
    Fl('r03-12', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 76212, 'K-high seco air + backdoors: c-bet ligero OK. Estima % aire vs % par del rival.')
  ];

  PACKS['R-04'] = [
    V('r04-01', 'BB_vs_BTN', ['Ah', '4h'], 76301, 'A4s vs BTN: 3-bet polar. El as bloquea AA/AK del rival — menos combos premium que te pagan mal.', cash({ scenario: '3bet' })),
    V('r04-02', 'BB_vs_BTN', ['Kd', 'Tc'], 76302, 'KTo: mal blocker (no bloquea AA/AK igual) y mano dominada. Fold, no farol.', cash({ scenario: '3bet' }), 'fancy_play'),
    V('r04-03', 'BB_vs_BTN', ['Qs', 'Qd'], 76303, 'QQ: 3-bet value. Tus ases también “bloquean” AA rival — sobra value.', cash({ scenario: '3bet' })),
    V('r04-04', 'BB_vs_CO', ['Qh', '6d'], 76304, 'Q6o: 0 blockers útiles. Fold.', cash({ scenario: '3bet' }), 'dominated'),
    F3('r04-05', 'BTN_vs_BB', ['As', '3s'], 76305, 'A3s vs 3-bet: 4-bet farol mixto. El as quita combos de AA/AK del 3-bettor.', cash({ scenario: 'face3bet' })),
    F3('r04-06', 'BTN_vs_BB', ['Qd', 'Jh'], 76306, 'QJo vs 3-bet: fold. No bloqueas premium; te dominan. Combos de QJ no son farol.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-07', 'BB_vs_BTN', ['Ah', '4h'], 76307, 'A4s: 3-bet polar frecuente. Mismo blocker de as que A5s.', cash({ scenario: '3bet' })),
    V('r04-08', 'BB_vs_BTN', ['Kh', '8d'], 76308, 'K8o: fold. Blocker de K débil vs BTN wide; dominada.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r04-09', 'BTN_vs_BB', ['Ts', 'Tc'], 76309, 'TT vs 3-bet: 4-bet value. Blockers + nuts.', cash({ scenario: 'face3bet' })),
    V('r04-10', 'BB_vs_CO', ['Jc', 'Js'], 76310, 'JJ: 3-bet value. Par fuerte — quieres aislar y construir bote.', cash({ scenario: '3bet' })),
    F3('r04-11', 'CO_vs_BB', ['7s', '4d'], 76311, '74o vs 3-bet: fold. Cero eliminación de combos fuertes.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-12', 'BB_vs_BTN', ['Kd', '2d'], 76312, 'K2s: a veces 3-bet farol con blocker de K. No es KTo. Mix/presión, no spew offsuit.', cash({ scenario: '3bet' }))
  ];

  PACKS['R-05'] = [
    R('r05-01', 'UTG', ['Kd', 'Kh'], 76401, 'Open UTG: el rango NO incluye 72o. KK sí. Tras RFI, asigna “value tight”, no una mano.', cash()),
    R('r05-02', 'UTG', ['Qd', 'Tc'], 76402, 'QTo UTG: fold. Fuera del RFI early; cada acción elimina manos.', cash(), 'dominated'),
    V('r05-03', 'BB_vs_BTN', ['Ah', 'Qd'], 76403, 'Vs open BTN: rango wide. AQo 3-bet value. Historia: value + algún polar, no “tiene 72o”.', cash({ scenario: '3bet' })),
    V('r05-04', 'BB_vs_UTG', ['Kh', 'Jd'], 76404, 'Vs UTG: rango tight. KJo fold. El open early ya eliminó basura; no hero-defiendas.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r05-05', 'BTN_vs_BB', ['Ad', 'Kd'], 76405, 'Tras 3-bet, el rival tiene menos aire. AKs 4-bet. Rango polarizado: fuertes + faroles.', cash({ scenario: 'face3bet' })),
    F3('r05-06', 'BTN_vs_BB', ['8d', '4h'], 76406, '84o vs 3-bet: fold. Esa mano no sobrevive la línea.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r05-07', 'BB_vs_BTN', ['Ad', '8d'], 76407, 'A8s 3-bet polar: banda de farol creíble tras open late.', cash({ scenario: '3bet' })),
    V('r05-08', 'BB_vs_BTN', ['9c', '5h'], 76408, '95o vs BTN: fold. No está en la historia de defensa sólida.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r05-09', 'BTN_vs_BB', ['Ah', 'Th'], 76409, 'ATs BTN vs 3-bet: call frecuente. Medias/jugables sobreviven en posición — no solo nuts.', cash({ scenario: 'face3bet' })),
    R('r05-10', 'BTN', ['7h', '6h'], 76410, 'Open BTN 76s: entra en RFI wide. Tras open, el rival debe ponerte sc + broadway + pares.', cash()),
    F3('r05-11', 'UTG_vs_BB', ['Ah', 'Td'], 76411, 'ATo UTG vs 3-bet: fold. La línea 3-bet elimina que “puedes seguir siempre”.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r05-12', 'BB_vs_BTN', ['Jh', 'Jc'], 76412, 'JJ vs BTN: 3-bet value. Escribe: value (QQ+) / medias (call) / aire (fold o polar).', cash({ scenario: '3bet' }))
  ];

  PACKS['R-06'] = [
    Fl('r06-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 76501, 'Nodo c-bet flop IP seco: mix alto de bet (~70 %). Hoy apuestas — es una muestra del mix, no “siempre”.'),
    Fl('r06-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 76502, 'Nodo wet: más check. Elegir check no es indecisión; es la frecuencia del nodo.', { trapTag: 'fancy_play' }),
    Fl('r06-03', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 76503, 'OOP A-high paired: c-bet frecuente posible. Frecuencia ≠ 100 %.'),
    Fl('r06-04', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 76504, 'OOP wet: más check. El chart a veces checkea — no tiltees.', { trapTag: 'fancy_play' }),
    Fl('r06-05', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 76505, 'Top pair seco IP: bet value frecuente. Nodo “cobrar”.'),
    Fl('r06-06', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 76506, 'Underpair A-high: más check. Mix, no autocbet spew.', { trapTag: 'fancy_play' }),
    Fl('r06-07', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 76507, 'J-high seco IP: c-bet pequeño frecuente. Frecuencia alta ≠ sizing grande.'),
    Fl('r06-08', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 76508, 'Conectado: más check/pot control. Nodo distinto al seco.', { trapTag: 'fancy_play' }),
    Fl('r06-09', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 76509, 'Air + backdoors seco: c-bet ligero mix. A veces check — válido.'),
    Fl('r06-10', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 76510, 'Muy conectado: no lo trates como nodo seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('r06-11', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 76511, 'K-high seco IP: c-bet pequeño frecuente. Ejecuta una acción del mix.'),
    Fl('r06-12', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 76512, 'Fallaste flop OOP: check frecuente. “Siempre c-bet porque abrí” ignora el nodo.')
  ];

  /* —— Pro Cash —— */
  PACKS['C-26'] = [
    F3('c26-01', 'BTN_vs_BB', ['Jh', 'Jd'], 77001, 'JJ vs 3-bet: 4-bet value. Capa siguiente al 3-bet — quieres bote o stack.', cash({ scenario: 'face3bet' })),
    F3('c26-02', 'BTN_vs_BB', ['9h', '4c'], 77002, '94o vs 3-bet: fold. No hay 4-bet farol con basura.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-03', 'BTN_vs_BB', ['Ac', '9c'], 77003, 'A9s vs 3-bet: 4-bet farol mixto. Blocker de as; no es value como AA.', cash({ scenario: 'face3bet' })),
    F3('c26-04', 'UTG_vs_BB', ['Ah', 'Td'], 77004, 'ATo UTG vs 3-bet: fold. Cold/OOP: más tight. No hero-call.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-05', 'BTN_vs_BB', ['Ad', 'Kd'], 77005, 'AKs: 4-bet value. Premium.', cash({ scenario: 'face3bet' })),
    F3('c26-06', 'CO_vs_BB', ['Qd', 'Jh'], 77006, 'QJo vs 3-bet: fold frecuente. Offsuit sin blocker claro ≠ 4-bet.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-07', 'BTN_vs_SB', ['Ts', 'Td'], 77007, 'TT BTN vs 3-bet: 4-bet o call value. Premium en posición.', cash({ scenario: 'face3bet' })),
    F3('c26-08', 'HJ_vs_BB', ['6s', '6c'], 77008, '66 HJ vs 3-bet: call frecuente, no 4-bet auto. Par media ≠ KK.', cash({ scenario: 'face3bet' })),
    F3('c26-09', 'BTN_vs_BB', ['Ah', '4h'], 77009, 'A4s: 4-bet polar/farol mixto. Misma familia que A5s.', cash({ scenario: 'face3bet' })),
    F3('c26-10', 'CO_vs_BB', ['6d', '5d'], 77010, '65s CO vs 3-bet: call frecuente IP. No 4-bet spew ni hero-fold.', cash({ scenario: 'face3bet' })),
    F3('c26-11', 'BTN_vs_BB', ['Js', '9h'], 77011, 'J9o vs 3-bet: fold. Cold 4-bet pide aún más tightness — esto ni entra.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-12', 'BTN_vs_BB', ['Kc', 'Ks'], 77012, 'KK vs 3-bet: 4-bet value frecuente. Par fuerte — bote grande.', cash({ scenario: 'face3bet' }))
  ];

  PACKS['C-27'] = [
    Fl('c27-01', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77101, 'SRP OOP deep A-high paired: c-bet razonable. Board te favorece; aún así sizing pequeño — quedan calles.'),
    Fl('c27-02', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77102, 'Wet OOP deep: check/ceder. Pot control: un error a 100 bb+ cuesta el stack.', { trapTag: 'fancy_play' }),
    Fl('c27-03', 'BB', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 77103, 'QQ OOP en K-high: mix check-call. No hinches deep sin plan.'),
    Fl('c27-04', 'SB', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 77104, 'Monotone OOP: check frecuente sin flush. SRP deep ≠ autocbet.', { trapTag: 'fancy_play' }),
    Fl('c27-05', 'BB', ['Ad', '5d'], ['Kc', '4s', '4d'], 77105, 'A-high paired OOP: c-bet mixto posible. Plan: bet pequeño o check-call.'),
    Fl('c27-06', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 77106, 'Air OOP en QJ: check. Check-call se construye con showdown, no con c-bet air deep.'),
    Fl('c27-07', 'UTG', ['Ah', 'Kd'], ['Ks', '7d', '2c'], 77107, 'Top pair OOP seco: c-bet pequeño o check-call. Deep: no overbet sin necesidad.'),
    Fl('c27-08', 'SB', ['7s', '6s'], ['Kh', '9d', '2c'], 77108, 'Air OOP K-high: check frecuente. Ceder la calle es el plan.', { trapTag: 'fancy_play' }),
    Fl('c27-09', 'BB', ['Ah', 'Qd'], ['As', '8h', '3c'], 77109, 'Top pair A-high OOP: bet pequeño/check-call. Value con pot control.'),
    Fl('c27-10', 'SB', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77110, 'Conectado OOP deep: check. El caller conecta demasiado.', { trapTag: 'fancy_play' }),
    Fl('c27-11', 'BB', ['9s', '9c'], ['Ah', '7d', '2c'], 77111, 'Underpair OOP A-high: check-call/check. No bluff-raise deep.'),
    Fl('c27-12', 'SB', ['As', 'Kd'], ['2c', '2s', '7d'], 77112, 'Paired bajo OOP: c-bet frecuente posible. Rango de agresor > caller; sizing contenido.')
  ];

  PACKS['C-28'] = [
    Fl('c28-01', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77201, 'Vs fish: top pair A-high — c-bet value. Cobra más fino; el fish paga de más.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-02', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 77202, 'Vs reg en K-high air: no farol loco. Check más; el reg defiende. Población > GTO ciego.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    Fl('c28-03', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77203, 'Vs fish K72: c-bet. El recreacional foldea mal y paga peor — value/continuación.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-04', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77204, 'Vs reg en wet: no autocbet grande. El reg castiga líneas flojas.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-05', 'BB_vs_BTN', ['Ks', 'Qs'], 77205, 'Vs fish steal: 3-bet value KQs. Cobra; el fish paga 3-bets de más.', cash({ scenario: '3bet', villainLevel: 'fish' })),
    V('c28-06', 'BB_vs_BTN', ['Td', '6s'], 77206, 'Vs reg T6o: fold. No hero-defend vs quien defiende bien.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    Fl('c28-07', 'BTN', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 77207, 'QQ vs fish en K-high: bet/value. Thin vs recreacional OK; vs reg más check-call.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c28-08', 'BB_vs_BTN', ['7d', '5c'], 77208, '75o vs cualquiera: fold. Explotar no es spew.', cash({ scenario: '3bet', villainLevel: 'fish' }), 'dominated'),
    Fl('c28-09', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77209, 'Vs fish A-high: c-bet ligero. El fish se tira de más a c-bets pequeños.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    F3('c28-10', 'BTN_vs_BB', ['Ah', 'Td'], 77210, 'ATo vs 3-bet de reg: fold OOP/borde. Vs fish a veces call; vs reg suelta el thin.', cash({ scenario: 'face3bet', villainLevel: 'pro' }), 'dominated'),
    Fl('c28-11', 'CO', ['Kd', 'Kh'], ['Qc', 'Jd', 'Ts'], 77211, 'KK vs reg en board wet: pot control. No thin loco vs quien defiende.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-12', 'BB_vs_BTN', ['As', 'Kd'], 77212, 'AKo vs fish steal: 3-bet value. Cobra al que paga de más.', cash({ scenario: '3bet', villainLevel: 'fish' }))
  ];

  PACKS['C-29'] = [
    Fl('c29-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77301, 'Quiz: BB caller en K72r. Bandas: poco Kx, mucho aire, alguna pareja baja. C-bet — ventaja de rango.'),
    Fl('c29-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77302, 'Quiz: 987 two-tone. Bandas: más pares, más draws, menos aire. No autocbet.', { trapTag: 'fancy_play' }),
    V('c29-03', 'BB_vs_BTN', ['Ad', 'Kd'], 77303, 'Quiz: rango BTN open = wide. AKs es value vs esa banda, no vs “tiene 72”. 3-bet.', cash({ scenario: '3bet' })),
    V('c29-04', 'BB_vs_UTG', ['Kh', 'Jd'], 77304, 'Quiz: UTG = tight. KJo no entra vs esa banda. Fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('c29-05', 'BTN_vs_BB', ['As', 'Ad'], 77305, 'Quiz: 3-bet polariza (value + farol). AA 4-bet vs la banda de value.', cash({ scenario: 'face3bet' })),
    F3('c29-06', 'BTN_vs_BB', ['Jd', '3h'], 77306, 'Quiz: J3o no está en ninguna banda post-3-bet. Fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c29-07', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77307, 'Quiz: A-high seco. Tu value (Ax) vs su aire/pares débiles. C-bet value.'),
    Fl('c29-08', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77308, 'Quiz: JT9. Bandas del caller: muchos two-pair/straight. Pot control.', { trapTag: 'fancy_play' }),
    V('c29-09', 'BB_vs_BTN', ['Ad', '5d'], 77309, 'Quiz: polar vs BTN = value (QQ+) + faroles (Axs). A5s es la banda farol.', cash({ scenario: '3bet' })),
    R('c29-10', 'UTG', ['As', '9d'], 77310, 'Quiz: RFI UTG no contiene A9o. Fold — escribe la banda tight.', cash(), 'dominated'),
    Fl('c29-11', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77311, 'Quiz: A-high seco. Caller: Ax limitado, mucho aire. C-bet ligero OK.'),
    V('c29-12', 'BB_vs_BTN', ['Td', 'Th'], 77312, 'Quiz: TT es banda value vs open late. 3-bet. No “una mano contra la suya”.', cash({ scenario: '3bet' }))
  ];

  PACKS['C-30'] = [
    Fl('c30-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77401, 'Node lock mental: flop seco IP → c-bet frecuente (~70 %). Hoy bet. No tiltees si el chart a veces checkea.'),
    Fl('c30-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77402, 'Nodo wet: más check. Ejecutar check es el mix, no cobardía.', { trapTag: 'fancy_play' }),
    Fl('c30-03', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77403, 'OOP A-paired: c-bet mix alto. Una muestra del nodo.'),
    Fl('c30-04', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77404, 'OOP wet: nodo de check. Llévalo a mesa: “aquí cedo más”.', { trapTag: 'fancy_play' }),
    Fl('c30-05', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77405, 'Nodo value c-bet IP. Bet. Frecuencia alta de cobro.'),
    Fl('c30-06', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 77406, 'Nodo underpair A-high: más check. No “siempre c-bet porque abrí”.', { trapTag: 'fancy_play' }),
    Fl('c30-07', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 77407, 'J-high seco: c-bet pequeño frecuente. Lock: sizing pequeño, no 75 % siempre.'),
    Fl('c30-08', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 77408, 'Nodo conectado ≠ nodo seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('c30-09', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 77409, 'K-high seco IP: bet frecuente. Habitúa la frase “~70 % bet”.'),
    Fl('c30-10', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 77410, 'Air OOP: check. Nodo de cesión.'),
    Fl('c30-11', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77411, 'Air + backdoors seco: c-bet ligero mix. A veces check — válido.'),
    Fl('c30-12', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77412, 'Conectado OOP-ish: pot control. Node lock: no copies el mix del seco.', { trapTag: 'fancy_play' })
  ];

  PACKS['C-31'] = [
    F3('c31-01', 'BTN_vs_BB', ['Qs', 'Qd'], 77501, 'Examen Pro: QQ vs 3-bet — 4-bet value.', cash({ scenario: 'face3bet' })),
    F3('c31-02', 'BTN_vs_BB', ['Tc', '4d'], 77502, 'T4o vs 3-bet: fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c31-03', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77503, 'SRP OOP wet: check. Pot control deep.', { trapTag: 'fancy_play' }),
    Fl('c31-04', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77504, 'Vs fish: c-bet value top pair.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c31-05', 'BB_vs_UTG', ['Kh', 'Jd'], 77505, 'Range quiz: KJo vs UTG fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    Fl('c31-06', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77506, 'Node lock: seco IP c-bet frecuente.'),
    F3('c31-07', 'BTN_vs_BB', ['Ad', '5d'], 77507, 'A5s 4-bet polar mixto.', cash({ scenario: 'face3bet' })),
    Fl('c31-08', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77508, 'OOP A-paired: c-bet razonable.'),
    V('c31-09', 'BB_vs_BTN', ['8h', '5d'], 77509, 'Vs reg 85o: fold. Explotación.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    V('c31-10', 'BB_vs_BTN', ['Jh', 'Jd'], 77510, 'JJ vs BTN: 3-bet value. Bandas de rango.', cash({ scenario: '3bet' })),
    Fl('c31-11', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77511, 'Wet: no autocbet. Frecuencias.', { trapTag: 'fancy_play' }),
    F3('c31-12', 'BTN_vs_BB', ['Ah', 'Kd'], 77512, 'AKo 4-bet value. Checklist Pro cerrado.', cash({ scenario: 'face3bet' }))
  ];

  D.LESSONS.forEach(function (lesson) {
    var spots = PACKS[lesson.id];
    if (!spots || !spots.length) return;
    if (Array.isArray(lesson.spots) && lesson.spots.length) return;
    lesson.spots = spots;
    lesson.hands = spots.length;
    if (lesson.passThreshold == null || lesson.passThreshold >= 0.999) {
      lesson.passThreshold = 0.7;
      lesson.goldThreshold = 0.9;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school-share.js — Compartir logro de Escuela (imagen + URL + redes).
 * Cargar antes de school.js (chunk school).
 */
(function (global) {
  'use strict';

  var SITE_FALLBACK = 'https://www.pokerforgeai.com/';
  var CARD_W = 1080;
  var CARD_H = 1080;

  function siteUrl() {
    var site = global.PT_SITE || global.PTSeoConfig || {};
    var u = site.appUrl || site.siteUrl || '';
    if (u) return String(u).replace(/\/?$/, '/');
    try {
      if (global.location && global.location.origin) {
        return String(global.location.origin).replace(/\/?$/, '/') +
          (global.location.pathname && global.location.pathname.indexOf('/PokerTrainer') === 0
            ? global.location.pathname.replace(/\/?$/, '/')
            : '');
      }
    } catch (e) { /* ignore */ }
    return SITE_FALLBACK;
  }

  function siteHostLabel(url) {
    try {
      var u = new URL(url);
      return u.host.replace(/^www\./, '');
    } catch (e) {
      return 'pokerforgeai.com';
    }
  }

  function routeLabel(route) {
    if (route === 'spin') return 'Spins';
    if (route === 'mtt') return 'Torneos';
    if (route === 'ranges') return 'Rangos';
    if (route === 'pro') return 'Pro';
    return 'Cash';
  }

  function buildShareText(lesson, summary) {
    var url = siteUrl();
    var title = (lesson && lesson.title) || (lesson && lesson.id) || 'Lección';
    var pct = summary && summary.pct != null ? summary.pct : 0;
    var exam = !!(lesson && lesson.exam);
    var passed = !!(summary && summary.passed);
    var gold = !!(summary && summary.gold);
    var line;
    if (passed) {
      line = exam
        ? ('He aprobado el examen «' + title + '» en PokerForgeAI con un ' + pct + '%.')
        : ('He superado «' + title + '» en la Escuela de PokerForgeAI (' + pct + '%).');
      if (gold) line += ' ¡Marca oro!';
    } else {
      line = 'Estoy entrenando «' + title + '» en la Escuela de PokerForgeAI (' + pct + '%).';
    }
    return line + ' ' + url;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    var words = String(text || '').split(/\s+/);
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var trial = cur ? cur + ' ' + w : w;
      if (ctx.measureText(trial).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function drawAchievementCard(canvas, lesson, summary) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;

    var passed = !!(summary && summary.passed);
    var gold = !!(summary && summary.gold);
    var perfect = !!(summary && summary.perfect);
    var pct = summary && summary.pct != null ? Number(summary.pct) : 0;
    var accent = passed ? '#22c55e' : '#f87171';
    if (gold) accent = '#e3b341';

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.55, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.18, w * 0.55);
    glow.addColorStop(0, passed ? 'rgba(34,197,94,0.28)' : 'rgba(248,113,113,0.22)');
    if (gold) {
      glow = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.18, w * 0.55);
      glow.addColorStop(0, 'rgba(227,179,65,0.32)');
      glow.addColorStop(1, 'rgba(227,179,65,0)');
    } else {
      glow.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PokerForgeAI', 80, 120);

    ctx.fillStyle = 'rgba(230,237,243,0.7)';
    ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Escuela de Póker · ' + routeLabel(lesson && lesson.route), 80, 168);

    var status = passed
      ? ((lesson && lesson.exam) ? 'Examen superado' : 'Lección superada')
      : 'Sigo entrenando';
    ctx.fillStyle = accent;
    ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(status, 80, 280);

    var title = (lesson && lesson.title) || (lesson && lesson.id) || '';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px system-ui, -apple-system, Segoe UI, sans-serif';
    var titleLines = wrapText(ctx, title, w - 160);
    var ty = 360;
    titleLines.slice(0, 3).forEach(function (line) {
      ctx.fillText(line, 80, ty);
      ty += 64;
    });

    var ringX = w / 2;
    var ringY = 640;
    var ringR = 150;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, pct / 100)));
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '800 84px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(String(pct) + '%', ringX, ringY + 10);
    ctx.fillStyle = 'rgba(230,237,243,0.75)';
    ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('acierto', ringX, ringY + 52);

    var tags = [];
    if (lesson && lesson.id) tags.push(lesson.id);
    if (lesson && lesson.module) tags.push(lesson.module);
    if (gold) tags.push('Marca oro');
    if (perfect) tags.push('100%');
    if (summary && summary.xpGain) tags.push('+' + summary.xpGain + ' XP');
    ctx.textAlign = 'left';
    ctx.font = '700 26px system-ui, -apple-system, Segoe UI, sans-serif';
    var tagX = 80;
    var tagY = 860;
    tags.forEach(function (tag) {
      var tw = ctx.measureText(tag).width + 36;
      if (tagX + tw > w - 80) return;
      roundRect(ctx, tagX, tagY - 34, tw, 48, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.fillStyle = gold && tag.indexOf('oro') >= 0 ? '#e3b341' : 'rgba(230,237,243,0.92)';
      ctx.fillText(tag, tagX + 18, tagY);
      tagX += tw + 14;
    });

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 36px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(host, w / 2, 980);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(url.replace(/\/$/, ''), w / 2, 1020);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) {
        try {
          var data = canvas.toDataURL('image/png');
          var bin = atob(data.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (e) {
          reject(e);
        }
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      }, 'image/png');
    });
  }

  function buildPanelHtml(lesson, summary) {
    var passed = !!(summary && summary.passed);
    return (
      '<section class="school-share card-box" aria-label="Compartir logro">' +
      '<div class="school-share-head">' +
      '<h3>' + (passed ? 'Comparte tu logro' : 'Comparte tu progreso') + '</h3>' +
      '</div>' +
      '<canvas class="school-share-canvas school-share-canvas-hidden" width="1080" height="1080" aria-hidden="true"></canvas>' +
      '<div class="school-share-actions">' +
      '<button type="button" class="btn btn-primary school-share-btn" data-school-share="native">Compartir</button>' +
      '</div>' +
      '<p class="school-share-status muted-text" data-school-share-status hidden></p>' +
      '</section>'
    );
  }

  function buildHubPanelHtml() {
    return (
      '<div class="school-share school-share-hub" aria-label="Compartir resumen Escuela">' +
      '<canvas class="school-share-canvas school-share-canvas-hidden" width="1080" height="1080" aria-hidden="true"></canvas>' +
      '<div class="school-share-actions">' +
      '<button type="button" class="btn btn-ghost school-share-btn" data-school-share="hub">Compartir resumen</button>' +
      '</div>' +
      '<p class="school-share-status muted-text" data-school-share-status hidden></p>' +
      '</div>'
    );
  }

  function buildHubShareText(hub) {
    var url = siteUrl();
    var level = hub && hub.level != null ? hub.level : 1;
    var xp = hub && hub.xp != null ? hub.xp : 0;
    var route = hub ? (hub.routePassed + '/' + hub.routeTotal) : '0/0';
    var gold = hub && hub.gold != null ? hub.gold : 0;
    return 'Mi progreso en la Escuela de PokerForgeAI: Nv. ' + level +
      ' · ' + xp + ' XP · ruta ' + route + ' · ' + gold + ' oro. ' + url;
  }

  function drawHubSummaryCard(canvas, hub) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;
    hub = hub || {};

    var g = ctx.createLinearGradient(0, 0, w * 0.2, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, 80, 10, w * 0.5, 120, w * 0.55);
    glow.addColorStop(0, 'rgba(234,179,8,0.22)');
    glow.addColorStop(1, 'rgba(234,179,8,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = '#e3b341';
    ctx.font = '700 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    var eyebrow = String(hub.eyebrow || 'Escuela').toUpperCase();
    ctx.fillText(eyebrow, 80, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(hub.title || 'Escuela de Póker', 80, 200);

    ctx.fillStyle = 'rgba(230,237,243,0.88)';
    ctx.font = '600 32px system-ui, -apple-system, Segoe UI, sans-serif';
    var leadLines = wrapText(ctx, hub.lead || '', w - 160);
    var ly = 270;
    leadLines.slice(0, 3).forEach(function (line) {
      ctx.fillText(line, 80, ly);
      ly += 42;
    });

    var stats = [
      { val: 'Nv. ' + (hub.level != null ? hub.level : 1), lbl: 'Nivel Escuela' },
      { val: String(hub.xp != null ? hub.xp : 0), lbl: 'XP' },
      { val: String((hub.routePassed || 0) + '/' + (hub.routeTotal || 0)), lbl: 'Ruta' },
      { val: String(hub.gold != null ? hub.gold : 0), lbl: 'Oro' }
    ];
    var boxW = (w - 80 * 2 - 24) / 2;
    var boxH = 160;
    var startY = 420;
    stats.forEach(function (s, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var x = 80 + col * (boxW + 24);
      var y = startY + row * (boxH + 24);
      roundRect(ctx, x, y, boxW, boxH, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.val, x + 28, y + 78);
      ctx.fillStyle = 'rgba(230,237,243,0.65)';
      ctx.font = '600 26px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(s.lbl, x + 28, y + 120);
    });

    var barX = 80;
    var barY = 820;
    var barW = w - 160;
    var barH = 28;
    roundRect(ctx, barX, barY, barW, barH, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    var fillW = Math.max(8, Math.round(barW * Math.min(100, hub.xpPct || 0) / 100));
    var grad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    grad.addColorStop(0, '#e3b341');
    grad.addColorStop(1, '#22c55e');
    roundRect(ctx, barX, barY, fillW, barH, 14);
    ctx.fillStyle = grad;
    ctx.fill();

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 36px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(host, w / 2, 940);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(url.replace(/\/$/, ''), w / 2, 985);

    return canvas;
  }

  function setStatus(root, msg, ok) {
    var el = root.querySelector('[data-school-share-status]');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('is-ok', !!ok);
    el.classList.toggle('is-err', !ok);
  }

  function mountSharePanel(root, lesson, summary) {
    if (!root || !lesson || !summary) return null;
    var canvas = root.querySelector('.school-share-canvas');
    if (!canvas) return null;
    drawAchievementCard(canvas, lesson, summary);
    var text = buildShareText(lesson, summary);
    var url = siteUrl();

    var btn = root.querySelector('[data-school-share="native"]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, url: url };
  }

  function shareNative(canvas, text, url, root) {
    var nav = global.navigator;
    if (!nav || typeof nav.share !== 'function') {
      setStatus(root, 'Este dispositivo no permite compartir desde el navegador.', false);
      return;
    }
    canvasToBlob(canvas).then(function (blob) {
      var file = null;
      try {
        file = new File([blob], 'pokerforgeai-escuela-logro.png', { type: 'image/png' });
      } catch (e) {
        file = null;
      }
      /* Preferir solo la imagen (+ título corto): la URL ya va dibujada en la tarjeta. */
      var data;
      var withFile = file && (!nav.canShare || nav.canShare({ files: [file] }));
      if (withFile) {
        data = { title: 'PokerForgeAI · Escuela', files: [file] };
        if (nav.canShare && !nav.canShare(data) && nav.canShare({ files: [file], text: text })) {
          data = { title: 'PokerForgeAI · Escuela', text: text, files: [file] };
        }
      } else {
        data = { title: 'PokerForgeAI · Escuela', text: text, url: url };
      }
      return nav.share(data);
    }).then(function () {
      setStatus(root, 'Se ha compartido correctamente.', true);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        setStatus(root, '', true);
        return;
      }
      /* Fallback: algunos navegadores rechazan files-only */
      return nav.share({ title: 'PokerForgeAI · Escuela', text: text, url: url }).then(function () {
        setStatus(root, 'Se ha compartido correctamente.', true);
      }).catch(function (err2) {
        if (err2 && err2.name === 'AbortError') {
          setStatus(root, '', true);
          return;
        }
        setStatus(root, 'No se pudo abrir el menú de compartir.', false);
      });
    });
  }

  function mountHubSharePanel(root, hub) {
    if (!root || !hub) return null;
    var canvas = root.querySelector('.school-share-canvas');
    if (!canvas) return null;
    drawHubSummaryCard(canvas, hub);
    var text = buildHubShareText(hub);
    var url = siteUrl();
    var btn = root.querySelector('[data-school-share="hub"]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, url: url };
  }

  global.PTSchoolShare = {
    siteUrl: siteUrl,
    buildShareText: buildShareText,
    buildHubShareText: buildHubShareText,
    drawAchievementCard: drawAchievementCard,
    drawHubSummaryCard: drawHubSummaryCard,
    buildPanelHtml: buildPanelHtml,
    buildHubPanelHtml: buildHubPanelHtml,
    mountSharePanel: mountSharePanel,
    mountHubSharePanel: mountHubSharePanel,
    CARD_W: CARD_W,
    CARD_H: CARD_H
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * school.js — Escuela de Póker: hub multi-ruta (Cash/Spins/MTT/Rangos), runner de spots.
 * Escuela abierta a usuarios autenticados (SCHOOL_PUBLIC=true). Fases G–J: Spins, MTT, rangos/pro, leaks→lección.
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
   * SCHOOL_PUBLIC=true → cualquier usuario autenticado (no demo).
   */
  var SCHOOL_BETA_EMAILS = [
    /* legacy allowlist; con SCHOOL_PUBLIC ya no hace falta */
  ];
  var SCHOOL_PUBLIC = true;

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

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  /** ¿Puede ver el tab Escuela? Usuarios autenticados (GA). */
  function schoolMenuVisible() {
    if (isDemoActive()) return false;
    if (SCHOOL_PUBLIC) return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
    return hasAdminAccess() || isSchoolBetaUser();
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
   * Menú visible a usuarios autenticados; dentro, el plan se respeta (free ve muros Study).
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

  function schoolPlayConfig(spot, lesson) {
    var route = (lesson && lesson.route) || (spot && spot.route) || state.route || 'cash';
    var hub = route === 'spin' ? 'spin' : (route === 'mtt' ? 'mtt' : 'cash');
    var base = {
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'all',
      villainLevel: 'fish',
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : (hub === 'mtt' ? 'mtt' : 'cash6'),
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
      var lesson = Data() && Data().getLesson(s.lessonId);
      global.playAnalysisHand(force, schoolPlayConfig(s.spots[index], lesson));
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

  var ROUTE_HERO = {
    cash: {
      eyebrow: 'Cash · Ruta principal',
      title: 'Escuela de Póker',
      lead: 'Fundamentos → preflop → postflop → Pro Coach. Gates de plan activos. Las manos consumen el cupo Free del entrenador.'
    },
    spin: {
      eyebrow: 'Spins · Ruta torneo corto',
      title: 'Ruta Spins',
      lead: 'ICM, steal, push/fold y heads-up. M0 completo en Gratis; Study desde M1; Pro en Coach.'
    },
    mtt: {
      eyebrow: 'MTT · Ruta torneos',
      title: 'Ruta Torneos',
      lead: 'Early game, mid, short stack y burbuja. M0 completo en Gratis; Study desde M1; burbuja/FT en Coach.'
    },
    ranges: {
      eyebrow: 'Rangos · Laboratorio',
      title: 'Laboratorio de rangos',
      lead: 'Construir, defender y leer rangos. Complementa cash y torneos.'
    }
  };

  var MODULE_COPY = {
    cash: {
      M0: { title: 'M0 · Fundamentos Cash (Gratis)', lead: 'Desbloqueo lineal.' },
      M1: { title: 'M1 · Preflop core (Study)', lead: 'Defensa BB, 3-bet, squeeze, iso.' },
      M2: { title: 'M2 · Postflop core (Study)', lead: 'Textura, c-bet, defensa, barrels.' },
      M4: { title: 'M4 · Pro Cash (Coach)', lead: '4-bet, SRP OOP, explotación y examen Pro.' }
    },
    spin: {
      M0: { title: 'M0 · Intro Spins (Gratis)', lead: 'Lobbies, steal, defensa y examen.' },
      M1: { title: 'M1 · Short stack (Study)', lead: 'Iso, shove y charts.' },
      M2: { title: 'M2 · ICM / HU (Study–Coach)', lead: 'Payout, pressure y heads-up.' },
      M3: { title: 'M3 · Pro Spins (Coach)', lead: 'Explotación y examen Pro.' }
    },
    mtt: {
      M0: { title: 'M0 · Early MTT (Gratis)', lead: 'Fases, paciencia y examen early.' },
      M1: { title: 'M1 · Mid / steal', lead: 'Steal, 3-bet y resteal.' },
      M2: { title: 'M2 · Short stack', lead: 'Push/fold antes de la burbuja.' },
      M3: { title: 'M3 · Antes de burbuja', lead: 'Ajuste de stack y presión.' },
      M4: { title: 'M4 · Burbuja / FT (Coach)', lead: 'ICM, roles y mesa final.' }
    },
    ranges: {
      M0: { title: 'M0 · Bases de rangos', lead: 'Construir y defender.' },
      M1: { title: 'M1 · Lectura y frecuencias', lead: 'Asignar rango y node frequencies.' }
    }
  };

  function renderHub(root) {
    var data = Data();
    var school = readSchool();
    var lv = levelFromXp(school.xp);
    var routes = (data && data.ROUTES) || [];
    var routeId = state.route || 'cash';
    var hero = ROUTE_HERO[routeId] || ROUTE_HERO.cash;
    var rp = routeProgress(routeId);
    var routeTabs = routes.map(function (r) {
      var active = r.id === routeId ? ' is-active' : '';
      var soon = r.status === 'soon' ? ' is-soon' : '';
      var title = r.status === 'soon' ? (r.teaser || 'Próximamente') : '';
      return '<button type="button" class="school-route-tab' + active + soon + '" data-school-route="' + esc(r.id) + '"' +
        (r.status !== 'active' ? ' disabled title="' + esc(title) + '"' : '') + '>' +
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

    var modules = typeof data.modulesInRoute === 'function'
      ? data.modulesInRoute(routeId)
      : [];
    var modCopy = MODULE_COPY[routeId] || {};
    var idx = 0;
    var sections = modules.map(function (modId) {
      var modLessons = typeof data.lessonsForModule === 'function'
        ? data.lessonsForModule(routeId, modId)
        : data.lessonsForRoute(routeId).filter(function (l) { return l.module === modId; });
      var passed = 0;
      modLessons.forEach(function (l) { if (isLessonPassed(l.id)) passed += 1; });
      var copy = modCopy[modId] || { title: modId, lead: '' };
      var html = '<section class="school-map card-box">' +
        '<h3 class="school-map-title">' + esc(copy.title) + '</h3>' +
        '<p class="muted-text school-map-lead">' + passed + '/' + modLessons.length +
        (copy.lead ? ' · ' + esc(copy.lead) : '') + '</p>' +
        '<div class="school-nodes">' + renderModuleNodes(modLessons, idx) + '</div></section>';
      idx += modLessons.length;
      return html;
    }).join('');

    root.innerHTML =
      '<div class="school-page">' +
      '<header class="school-hero">' +
      '<p class="school-eyebrow">' + esc(hero.eyebrow) + '</p>' +
      '<h2 class="school-title">' + esc(hero.title) + '</h2>' +
      '<p class="school-lead">' + esc(hero.lead) + '</p>' +
      '<div class="school-hero-stats">' +
      '<div class="school-stat"><span class="school-stat-val">Nv. ' + lv.level + '</span><span class="school-stat-lbl">Nivel Escuela</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + lv.xp + '</span><span class="school-stat-lbl">XP</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.passed + '/' + rp.total + '</span><span class="school-stat-lbl">Ruta</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.gold + '</span><span class="school-stat-lbl">Oro</span></div>' +
      '</div>' +
      '<div class="school-xp-bar" aria-hidden="true"><div class="school-xp-fill school-xp-fill-anim" style="width:' +
      Math.min(100, Math.round((lv.into / lv.per) * 100)) + '%"></div></div>' +
      (global.PTSchoolShare && global.PTSchoolShare.buildHubPanelHtml
        ? global.PTSchoolShare.buildHubPanelHtml()
        : '') +
      '</header>' +
      '<div class="school-routes" role="tablist">' + routeTabs + '</div>' +
      (soonTeasers
        ? '<div class="muted-text school-route-teasers">Próximas rutas:<ul class="school-teaser-list">' + soonTeasers + '</ul></div>'
        : '') +
      (sections || '<p class="muted-text">No hay lecciones en esta ruta.</p>') +
      '</div>';

    var hubShare = root.querySelector('.school-share-hub');
    if (hubShare && global.PTSchoolShare && global.PTSchoolShare.mountHubSharePanel) {
      try {
        global.PTSchoolShare.mountHubSharePanel(hubShare, {
          eyebrow: hero.eyebrow,
          title: hero.title,
          lead: hero.lead,
          level: lv.level,
          xp: lv.xp,
          routePassed: rp.passed,
          routeTotal: rp.total,
          gold: rp.gold,
          xpPct: Math.min(100, Math.round((lv.into / lv.per) * 100)),
          routeId: routeId
        });
      } catch (eHub) { /* ignore */ }
    }
    root.querySelectorAll('[data-school-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-route');
        var route = routes.find(function (r) { return r.id === id; });
        if (!id || !route || route.status !== 'active') return;
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
      if (t && typeof t === 'object') {
        var title = t.title ? '<strong class="school-theory-title">' + esc(t.title) + '</strong>' : '';
        var body = esc(t.body || t.text || '');
        return '<li>' + title + (title ? ' ' : '') + body + '</li>';
      }
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
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · ' + esc(lesson.module || 'M0') + ' · ' +
      esc((Data().ROUTES.find(function (r) { return r.id === lesson.route; }) || { label: lesson.route || 'Cash' }).label) +
      ' ' + planBadge(lesson.plan) + '</p>' +
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
      '<h3>ForgeCoach</h3>' +
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
      questionToggleLabel: 'Preguntar al ForgeCoach',
      getData: function () {
        return {
          school: true,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          concept: lesson.concept,
          beginner: true
        };
      },
      persist: { kind: 'learn', lessonId: lesson.id }
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
      (global.PTSchoolShare && global.PTSchoolShare.buildPanelHtml
        ? global.PTSchoolShare.buildPanelHtml(lesson, sum)
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
    var shareRoot = root.querySelector('.school-share');
    if (shareRoot && global.PTSchoolShare && global.PTSchoolShare.mountSharePanel) {
      try {
        global.PTSchoolShare.mountSharePanel(shareRoot, lesson, sum);
        trackSchool('lesson_share_panel', {
          lessonId: lesson.id,
          passed: !!sum.passed,
          gold: !!sum.gold,
          exam: !!lesson.exam
        });
      } catch (eShare) { /* ignore */ }
    }
  }

  /** Deep-link desde Leaks / reportes → lección (solo si el menú Escuela es visible). */
  function openLesson(lessonId) {
    if (!schoolMenuVisible() || !lessonId) return false;
    var data = Data();
    var lesson = data && data.getLesson(lessonId);
    if (!lesson) return false;
    try { delete global.__ptPendingSchoolLesson; } catch (e) { /* ignore */ }
    state.route = lesson.route || 'cash';
    state.view = VIEW.lesson;
    state.lessonId = lesson.id;
    state.session = null;
    if (typeof global.goToTab === 'function') global.goToTab('school');
    else {
      var host = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (host) render(host);
    }
    return true;
  }

  function consumePendingLesson() {
    var pending = global.__ptPendingSchoolLesson;
    if (!pending) return;
    try { delete global.__ptPendingSchoolLesson; } catch (e) { /* ignore */ }
    var lesson = Data() && Data().getLesson(pending);
    if (!lesson) return;
    state.route = lesson.route || 'cash';
    state.view = VIEW.lesson;
    state.lessonId = lesson.id;
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
    consumePendingLesson();
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
    openLesson: openLesson,
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
