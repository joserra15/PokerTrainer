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
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN a ~20 bb: steal/open claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['7c', '2d'], 40102, { trapTag: 'dominated', teachBack: '72o: fold. No stealees basura total.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB: open/steal razonable a 20 bb.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['Qd', '8c'], 40104, { trapTag: 'fancy_play', teachBack: 'Q8o SB: a menudo fold — no eres BTN.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['9s', '9c'], 40105, { teachBack: '99 BTN: open claro.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['8h', '7h'], 40106, { teachBack: '87s BTN: steal razonable con jugabilidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['As', 'Kd'], 40201, { teachBack: 'AKo vs steal BTN: 3-bet/value claro.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['7c', '2d'], 40202, { trapTag: 'dominated', teachBack: '72o: fold. No overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJs vs SB steal: defensa razonable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '5d'], 40204, { teachBack: 'A5s: 3-bet farol/pressure frecuente vs BTN.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['Td', '8c'], 40205, { trapTag: 'fancy_play', teachBack: 'T8o: fold típico vs steal — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['9s', '9c'], 40206, { teachBack: '99 vs SB: 3-bet o continue sólido.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 3).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 3));
    if (kind === 'SPIN_ISO') return [
      iso('s04-01', 'BTN', 'SB', ['Ah', 'Js'], 40401, { teachBack: 'AJs BTN vs limp: iso.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-02', 'BTN', 'SB', ['7c', '2d'], 40402, { trapTag: 'dominated', teachBack: '72o: fold. No overiso.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQs: iso value.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      iso('s04-04', 'BTN', 'SB', ['Qd', '8c'], 40404, { trapTag: 'fancy_play', teachBack: 'Q8o: fold frecuente.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH' || kind === 'SPIN_EXAM_M1') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs corto: shove/open shove candidato.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['7c', '2d'], 40502, { trapTag: 'dominated', teachBack: '72o: fold. No panic shove.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJs SB corto: shove frecuente.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['9s', '9c'], 40504, { teachBack: '99: shove value claro a 10–12 bb.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo BTN early: open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['Qd', '8c'], 50102, { trapTag: 'dominated', teachBack: 'Q8o UTG early: fold. Paciencia.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO: open estándar early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['7h', '2d'], 50104, { trapTag: 'dominated', teachBack: '72o: fold. No spew early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['9s', '9c'], 50105, { teachBack: '99 BTN: open claro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['Ah', '5d'], 50106, { trapTag: 'fancy_play', teachBack: 'A5o HJ early: a menudo fold — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 4);
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Kh', '9s'], 50401, { teachBack: 'K9o BTN mid: steal razonable.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['7c', '2d'], 50402, { trapTag: 'dominated', teachBack: '72o: fold.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '5s'], 50403, { teachBack: 'A5s CO: steal/open OK mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB: open/steal frecuente.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['8h', '7h'], 50406, { teachBack: '87s BTN: steal con jugabilidad.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['As', 'Kd'], 50501, { teachBack: 'AKo: 3-bet value vs steal.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['7c', '2d'], 50503, { trapTag: 'dominated', teachBack: '72o: fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 2).concat(packSpots('MTT_3BET', D).slice(0, 2));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '5s'], 50901, { teachBack: 'A5o BTN a ~10–12 bb: shove candidato.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['7c', '2d'], 50902, { trapTag: 'dominated', teachBack: '72o: fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['9s', '9c'], 50904, { teachBack: '99: shove value.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) })
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
    "concept": "La matriz 13×13 muestra con qué frecuencia se juega cada mano. Aprende a leerla antes de memorizar.",
    "theory": [
      "Filas/columnas son ranks (A…2). Suited arriba/un lado, offsuit al otro, pares en diagonal — según la UI del menú Rangos.",
      "Un color o % indica frecuencia: no todo es “siempre” o “nunca”.",
      "Abre el menú Rangos y localiza RFI BTN vs UTG: el BTN es mucho más wide."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Filas/columnas son ranks (A…2). Suited arriba/un lado, offsuit al otro, pares en diagonal — según la UI del menú Rangos."
      }
    ],
    "aiQuestions": [
      "¿Dónde están los pares en la matriz?",
      "¿Qué significa un % en una celda?"
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
    "concept": "Ejercicio mental: lista las categorías de open desde el botón (pares, broadway, suited connectors…).",
    "theory": [
      "En 60 segundos, nombra bandas: 22+, A2s+, ATo+, K9s+, etc. Luego contrasta con el menú Rangos.",
      "El objetivo no es memorizar pixel a pixel; es tener un mapa mental.",
      "Trampa: open BTN “cualquier dos” sin bandas."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "En 60 segundos, nombra bandas: 22+, A2s+, ATo+, K9s+, etc. Luego contrasta con el menú Rangos."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Dado un flop, estima qué parte del rango rival pegó pareja, draw o aire.",
    "theory": [
      "Ejemplo: rango BTN wide en K72r conecta top pair menos que en JTs9. La textura cambia la ventaja de rango.",
      "Úsalo para decidir c-bet (enlace con Cash M2).",
      "Trampa: asumir que “siempre conectó” o “nunca conectó”."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Ejemplo: rango BTN wide en K72r conecta top pair menos que en JTs9. La textura cambia la ventaja de rango."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Tus cartas quitan combinaciones del rango rival (blockers). Eso cambia faroles y bluff-catchers.",
    "theory": [
      "Con A♠X, el rival tiene menos AA y menos AKx de ese palo. Por eso Axs es farol frecuente de 3-bet (C-08).",
      "Practica: “¿qué combos quito?” antes de farolear river.",
      "Trampa: farolear sin blockers en rivers pesados."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Con A♠X, el rival tiene menos AA y menos AKx de ese palo. Por eso Axs es farol frecuente de 3-bet (C-08)."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Tras open–call–check–bet, reduce el rango rival a una historia creíble.",
    "theory": [
      "Cada acción elimina manos. El rango se “capea” o se polariza según la línea.",
      "Ejercicio: escribe 2–3 manos tipo que llegan a ese river.",
      "Trampa: poner al rival siempre en la mano que te gana."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Cada acción elimina manos. El rango se “capea” o se polariza según la línea."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "En un nodo GTO, las acciones tienen frecuencias (a veces bet 70 / check 30). No todo es puro.",
    "theory": [
      "Node locking mental: eliges una acción “como si” mezclaras, aunque en práctica juegues una línea.",
      "Útil para entender por qué un spot no es “siempre c-bet”.",
      "Trampa: exigir 100 % o 0 % en todos los spots."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Node locking mental: eliges una acción “como si” mezclaras, aunque en práctica juegues una línea."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
