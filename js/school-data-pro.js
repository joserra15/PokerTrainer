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
    "concept": "El 4-bet (y cold 4-bet sin haber abierto) es la capa siguiente al 3-bet: value premium y faroles con blockers.",
    "theory": [
      "Value: KK+/AK a menudo. Faroles: ases suited selectivos. Cold 4-bet: subes sin haber entrado antes — más tight.",
      "Vs 3-bet early, 4-beteas menos light que vs 3-bet BTN.",
      "Trampa: 4-bet spew con KQo offsuit."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Value: KK+/AK a menudo. Faroles: ases suited selectivos. Cold 4-bet: subes sin haber entrado antes — más tight."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "En single-raised pot fuera de posición a stacks deep, construyes check-call y check-raise con plan.",
    "theory": [
      "No autocbet OOP en wet (C-16). Deep: más calles por delante; pot control importa.",
      "Líneas: check-call con medias; check-raise polar con fuertes/faroles.",
      "Trampa: donk bet spew sin plan."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "No autocbet OOP en wet (C-16). Deep: más calles por delante; pot control importa."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Mismo spot, dos rivales: vs fish value-bet más thin; vs reg bluffea más selectivo.",
    "theory": [
      "Fish: paga de más → value thin. Reg: defiende mejor → faroles con blockers y menos thin crazy.",
      "No juegues un solo “GTO” ciego a la población.",
      "Trampa: farolear rivers vs calling station."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Fish: paga de más → value thin. Reg: defiende mejor → faroles con blockers y menos thin crazy."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Ejercicio: dado un board y una línea, describe el rango rival en bandas (no una sola mano).",
    "theory": [
      "Escribe value / medias / aire. Contrasta con el menú Rangos cuando exista chart.",
      "Enlace con R-05.",
      "Trampa: put hero en “siempre la nuts”."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Escribe value / medias / aire. Contrasta con el menú Rangos cuando exista chart."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Piensa frecuencias: “aquí c-beteo ~70 %”. Aunque ejecutes una acción, entiendes el mix.",
    "theory": [
      "Ayuda a no tiltar cuando el chart “a veces check”.",
      "Enlace con R-06.",
      "Trampa: exigir pure strategies en todos lados."
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Ayuda a no tiltar cuando el chart “a veces check”."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
    "concept": "Certificación Cash Pro: 4-bet, SRP OOP, explotación y rangos. Sin teoría nueva.",
    "theory": [
      "Resume 4-bet value vs farol.",
      "Fish vs reg en river value: ¿qué cambia?"
    ],
    "examples": [
      {
        "title": "Idea clave",
        "body": "Resume 4-bet value vs farol."
      }
    ],
    "aiQuestions": [
      "¿Qué debo recordar de esta lección?"
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
