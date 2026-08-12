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
    "concept": "Un MTT tiene fases: early, mid, short, push y burbuja. El ante y el stack en bb cambian tu plan.",
    "theory": [
      "Early: stacks profundos, juego parecido a cash (con paciencia). Mid: más steals. Short/push: open/shove y push/fold. Bubble: ICM fuerte.",
      "El ante (pago obligatorio extra) engorda el bote y empuja a robar más. Identifica tu stack en bb, no solo las fichas absolutas.",
      "Honestidad: aquí entrenamos principios ICM y fases; no un solver de field completo de cientos de jugadores."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Early: stacks profundos, juego parecido a cash (con paciencia). Mid: más steals. Short/push: open/shove y push/fold. Bubble: ICM fuerte."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "En early no spewees: juegas spots claros, builds stack sin coin flips inútiles.",
    "theory": [
      "Con 40–60+ bb el juego se parece al cash, pero el objetivo es llegar a mid con stack jugable, no hero-callar early.",
      "Evita spew: 3-bet wars sin necesidad, bluffs sin plan. Las fichas early se defienden mejor.",
      "Trampa: jugar “final table” en la primera ciega."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Con 40–60+ bb el juego se parece al cash, pero el objetivo es llegar a mid con stack jugable, no hero-callar early."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "plan": "study",
    "xp": 80,
    "passThreshold": 1,
    "goldThreshold": 1,
    "decisionEnd": true,
    "hands": 0,
    "concept": "Lee la mesa: quién es big stack, mid o short. Eso cambia quién puede presionar y a quién.",
    "theory": [
      "M (o “M-ratio”) es una forma de pensar stacks en ciegas/antes. En la práctica: cuenta bb efectivas.",
      "Big stacks presionan; shorts buscan double; mids sobreviven. No trates a todos igual.",
      "Trampa: ignorear stacks y jugar solo tu mano."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "M (o “M-ratio”) es una forma de pensar stacks en ciegas/antes. En la práctica: cuenta bb efectivas."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
    ],
    "spots": [],
    "exam": false,
    "id": "T-02",
    "title": "Antenas de stack (M / big stacks)"
  },
  {
    "route": "mtt",
    "module": "M0",
    "order": 3,
    "plan": "study",
    "xp": 110,
    "passThreshold": 0.7,
    "goldThreshold": 0.9,
    "decisionEnd": true,
    "hands": 4,
    "concept": "Repaso fases y early game. Sin teoría nueva.",
    "theory": [
      "¿Early, mid o short?",
      "¿Paciencia o presión?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Early, mid o short?"
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Antes de entrar en push/fold, roba ciegas desde late con opens estándar.",
    "theory": [
      "Steal mid-late: abres CO/BTN/SB para ganar ciegas+ante sin ir all-in aún.",
      "Elige manos con plan si te 3-betean. No abras basura y te pegues.",
      "Trampa: passivity total hasta 12 bb — llegas short sin fichas robadas."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Steal mid-late: abres CO/BTN/SB para ganar ciegas+ante sin ir all-in aún."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "A mid stacks, el 3-bet polar (value + faroles) aplica presión; no es solo QQ+.",
    "theory": [
      "Igual que en cash M1, polarizas: manos fuertes y faroles con blockers. El stack define si cabe un 3-bet non-all-in.",
      "Vs opens late puedes 3-betear más light; vs early, más value.",
      "Trampa: 3-bet spew mid sin fold equity."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Igual que en cash M1, polarizas: manos fuertes y faroles con blockers. El stack define si cabe un 3-bet non-all-in."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Resteal: 3-betear (a veces shove) al steal del late. Defense: no overfoldear ciegas vs robos.",
    "theory": [
      "Cuando el BTN stealea, BB/SB pueden restealear con value y faroles elegidos.",
      "Defensa: fold/call/3-bet según stack. A mid stacks aún hay flats selectivos.",
      "Trampa: never-defend o resteal loco vs UTG."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Cuando el BTN stealea, BB/SB pueden restealear con value y faroles elegidos."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Repaso mid: steal, 3-bet, resteal. Sin teoría nueva.",
    "theory": [
      "¿Steal o resteal?",
      "¿Polar o fold?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Steal o resteal?"
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Entre 20 y 12 bb eliges open-raise o shove según mano y posición; ya no eres deep.",
    "theory": [
      "Thresholds: algunas manos open; otras shove; basura fold. Depende de bb y de quién queda detrás.",
      "No min-raiseas manos shove por miedo — te metes en spots peores.",
      "Trampa: open/fold ranges rotos (open flojo y fold al shove)."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Thresholds: algunas manos open; otras shove; basura fold. Depende de bb y de quién queda detrás."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Como en Spins: a 12–8 bb el plan base es shove o fold según chart y posición.",
    "theory": [
      "Push/fold simplifica: all-in o fold. Usa charts como referencia (menú Rangos / push-fold).",
      "BTN shoves más wide. Early positions más tight.",
      "Trampa: open small a 10 bb."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Push/fold simplifica: all-in o fold. Usa charts como referencia (menú Rangos / push-fold)."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Primero aprendes calls vs shove mirando chip EV; luego (Coach) añadimos ICM.",
    "theory": [
      "Chip EV: ¿tengo equity suficiente vs el rango de shove para call? Es la base.",
      "Manos fuertes pagan; medias dependen de posición y sizing (aquí: all-in).",
      "Trampa: call light “para ver” o fold panic con AQ vs shove corto."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Chip EV: ¿tengo equity suficiente vs el rango de shove para call? Es la base."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Con ICM, calls vs shove son más tight que en chip EV puro.",
    "theory": [
      "El $EV castiga arriesgar tu stack cerca de premios. Overfold es a menudo correcto.",
      "Honestidad: usamos principios, no un ICM de field completo."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "El $EV castiga arriesgar tu stack cerca de premios. Overfold es a menudo correcto."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Repaso short/push. Sin teoría nueva.",
    "theory": [
      "¿Open, shove o fold?",
      "¿Call shove chip EV o ya pienso ICM?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Open, shove o fold?"
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "En burbuja cada rol tiene un plan: big presiona, mid sobrevive, short busca spots.",
    "theory": [
      "Teaser Study visible en mapa; jugar el pack es Coach.",
      "Big stack aplica presión. Mid evita coin flips. Short pick spots.",
      "Trampa: mid stack hero-call vs big."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Teaser Study visible en mapa; jugar el pack es Coach."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Como big stack en burbuja, abres y shoves más; no regalas dobles al short sin fold equity.",
    "theory": [
      "Presión ≠ call light. Haces que los mids se tiren.",
      "Trampa: pagar al short “porque puedo”."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Presión ≠ call light. Haces que los mids se tiren."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Mid stack en burbuja: prioridad no chocarte con el big; deja que shorts se eliminen.",
    "theory": [
      "Fold equity propia baja vs big. Evita spots −EV $ aunque sean +EV chips.",
      "Trampa: open spew mid vs big."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Fold equity propia baja vs big. Evita spots −EV $ aunque sean +EV chips."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Short en burbuja: shoves selectivos para escalar; no min-raise suicide.",
    "theory": [
      "Necesitas doble, pero elige spots. Ladder = subir un peldaño de payout.",
      "Trampa: shove panic UTG con basura."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Necesitas doble, pero elige spots. Ladder = subir un peldaño de payout."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Tras el ITM, los saltos de pago siguen importando: no “ya estoy pagado, all-in light”.",
    "theory": [
      "Cada eliminación puede subir tu prize. Sigue pensando ICM.",
      "Trampa: spew post-bubble."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Cada eliminación puede subir tu prize. Sigue pensando ICM."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Repaso burbuja y roles. Sin teoría nueva.",
    "theory": [
      "¿Soy short, mid o big?",
      "¿Presiono o sobrevivo?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Soy short, mid o big?"
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "En final table el ICM se intensifica: pay jumps grandes, covers y shorts extremos.",
    "theory": [
      "Principios: covers presionan; mids cuidan; shorts pick spots.",
      "No prometemos solver de FT completa."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Principios: covers presionan; mids cuidan; shorts pick spots."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Entrena a separar “gano fichas” de “gano dinero de torneo”.",
    "theory": [
      "Si el spot es +EV chips y −EV $, fold es a menudo correcto en burbuja/FT.",
      "Trampa: idolatrar solo equity."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Si el spot es +EV chips y −EV $, fold es a menudo correcto en burbuja/FT."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Asigna rangos de shove/call según rol y stack, no solo tu mano.",
    "theory": [
      "Pregunta: ¿qué shoves este short? ¿Qué paga este mid?",
      "Trampa: hand-reading de cash deep en burbuja."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Pregunta: ¿qué shoves este short? ¿Qué paga este mid?"
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
    "concept": "Certificación MTT Pro. Sin teoría nueva.",
    "theory": [
      "Resume bubble roles.",
      "Chip EV vs $EV en una frase."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Resume bubble roles."
      }
    ],
    "aiQuestions": [
      "¿En qué fase del torneo estoy?",
      "¿Qué cambia vs cash?"
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
