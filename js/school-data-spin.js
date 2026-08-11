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
    "concept": "Un Spin es un torneo de 3 jugadores con payout aleatorio (2×, 3× o 5×). No es cash: el valor en $ no siempre coincide con las fichas.",
    "theory": [
      "En un Spin (o Spin & Go) sois tres jugadores. El prize pool se multiplica al azar: a veces 2×, a veces 3× o 5×. Eso cambia cuánto “duele” eliminarte.",
      "ICM lite: las fichas no valen lo mismo en $ al final. A veces un call +EV en fichas es malo en dinero porque arriesgas tu torneo.",
      "Antes de cada lección, piensa: ¿estoy robando ciegas, defendiendo, o en zona push/fold? El stack en bb manda más que en cash deep."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Antes de cada lección, piensa: ¿estoy robando ciegas, defendiendo, o en zona push/fold? El stack en bb manda más que en cash deep."
      }
    ],
    "aiQuestions": [
      "¿Por qué un Spin no se juega igual que el cash?",
      "¿Qué es el payout 2×/3×/5×?"
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
    "concept": "Con 20–25 bb, desde el botón o la SB, abres (steal) más wide que en cash deep: las ciegas valen más relativas a tu stack.",
    "theory": [
      "Steal: abrir el bote para robar las ciegas. A 20–25 bb el bote muerto (ciegas) es un % grande de tu stack, así que el fold equity importa.",
      "Desde BTN puedes abrir más manos; desde SB un poco más tight porque quedarás fuera de posición si te pagan.",
      "Trampa: abrir basura y luego pagar un 3-bet shove. Si te re-suben all-in, necesitas un plan (fold o call shove), no spew."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: abrir basura y luego pagar un 3-bet shove. Si te re-suben all-in, necesitas un plan (fold o call shove), no spew."
      }
    ],
    "aiQuestions": [
      "¿Por qué stealeo más a 20 bb que a 100 bb?",
      "¿Qué hago si me 3-betean shove?"
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
    "plan": "study",
    "xp": 110,
    "passThreshold": 0.7,
    "goldThreshold": 0.9,
    "decisionEnd": true,
    "hands": 6,
    "concept": "Cuando el botón o la SB abren corto, desde BB eliges fold, hacer call o 3-bet (a veces shove) según stack e ICM.",
    "theory": [
      "Vs steal a 20–25 bb defiendes más selectivo que en cash 100 bb: el stack es corto y un error cuesta el torneo.",
      "3-bet shove con value y algunos faroles con blockers; hacer call con manos que juegan bien multiway corto es raro — a menudo es fold o shove.",
      "Trampa: overdefend (pagar de más) o nunca 3-betear cuando el spot pide presión."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: overdefend (pagar de más) o nunca 3-betear cuando el spot pide presión."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "plan": "study",
    "xp": 120,
    "passThreshold": 0.7,
    "goldThreshold": 0.9,
    "decisionEnd": true,
    "hands": 6,
    "concept": "Repaso: anatomía Spin, steal y defensa. Sin teoría nueva.",
    "theory": [
      "Identifica el spot: ¿steal o defensa? ¿Stack ~20 bb?",
      "Checklist: posición → stack → fold / open / 3-bet."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Checklist: posición → stack → fold / open / 3-bet."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Si alguien limpea corto, aísla (iso) con manos que quieren heads-up; no overcommiteas con basura.",
    "theory": [
      "A stacks medios-cortos, limpear es frecuente en Spins recreacionales. El iso castiga y te deja la iniciativa.",
      "Tamaño: suficiente para aislar sin meter todo el stack sin querer. No aísles 72o.",
      "Trampa: overiso trash o limpear detrás sin plan."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: overiso trash o limpear detrás sin plan."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "hands": 4,
    "concept": "Con stacks cortos a menudo el 3-bet correcto es shove (all-in), no un 3-bet pequeño que deja decisiones difíciles.",
    "theory": [
      "Stack-off threshold: por debajo de cierto stack (p. ej. ~15–20 bb según spot), 3-bet shove es más limpio que flat o 3-bet pequeño.",
      "Shovea value (AX strong, pares medios+) y faroles elegidos. Flat (hacer call) solo con manos que quieren ver flop barato — pocas a estos stacks.",
      "Trampa: 3-bet pequeño spew o flat dominado vs open short."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: 3-bet pequeño spew o flat dominado vs open short."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Si tienes más fichas que el short, puedes presionar; no suicides el chip lead en spots −EV $.",
    "theory": [
      "Chip lead: eres el stack más grande. Presionas ciegas y opens flojos, pero no pagas shoves locos “porque soy cover”.",
      "Tu objetivo es aplicar presión sin regalar dobles fáciles al short.",
      "Trampa: call shove light solo por tener más fichas (ICM suicide light)."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: call shove light solo por tener más fichas (ICM suicide light)."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Si eres el short stack, priorizas spots de double-up claros y evitas coin flips malos vs el cover.",
    "theory": [
      "Short vs cover: necesitas fichas, pero no cualquier all-in. Elige spots con fold equity o equity decente.",
      "Survive + pick spots: a veces fold es correcto aunque “necesites fichas ya”.",
      "Trampa: shove panic con basura vs cover que te paga siempre."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: shove panic con basura vs cover que te paga siempre."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Repaso M1 Spins: iso, shove thresholds, chip lead y short. Sin teoría nueva.",
    "theory": [
      "¿Iso, shove o fold?",
      "¿Soy cover o short? Eso cambia mi plan."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Soy cover o short? Eso cambia mi plan."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Entre 12 y 8 bb entras en push/fold: casi no hay open small; decides shove o fold.",
    "theory": [
      "Push/fold: con stack muy corto, open-raise pequeño deja poco fold equity y commits mal. Mejor all-in o fold según chart.",
      "BTN shoves más wide que UTG (en 3-max: BTN vs blinds). Usa el menú Rangos / charts de push como referencia.",
      "Trampa: open min-raise a 10 bb “como en cash” y luego fold al 3-bet — leak clásico."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: open min-raise a 10 bb “como en cash” y luego fold al 3-bet — leak clásico."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Cuando te shoven, el call correcto suele ser más tight que en chip EV: el ICM castiga arriesgar tu torneo.",
    "theory": [
      "Chip EV mira solo fichas. ICM (Independent Chip Model, lite aquí) mira el valor en $ según payouts. En Spins, overfold vs shove suele ser correcto.",
      "Vs shove del short, paga manos fuertes; foldea manos medias que en cash deep serían call.",
      "Trampa: hero-call “porque tengo outs” ignorando el pay jump."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: hero-call “porque tengo outs” ignorando el pay jump."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "A veces un call gana fichas en promedio pero pierde dinero de torneo. Aprende a oler esos spots.",
    "theory": [
      "+EV chips no implica +EV $. En burbuja o pay jumps, prioriza supervivencia.",
      "Trampa ICM suicide: pagar shoves light porque “soy favorito en equity”."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa ICM suicide: pagar shoves light porque “soy favorito en equity”."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Con payout 5× juegas más tight que en 2×/3×: el premio top pesa más y los seconds duelen distinto.",
    "theory": [
      "En 5× el ICM aprieta más. Robas menos loco y calls shove más tight.",
      "Trampa: jugar igual el 2× y el 5×."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: jugar igual el 2× y el 5×."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Repaso ICM Spins. Sin teoría nueva.",
    "theory": [
      "¿Chip EV o $EV?",
      "¿Payout 2× o 5× cambia mi call?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Payout 2× o 5× cambia mi call?"
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "El bubble factor mide cuánto “duele” arriesgar fichas cerca de un salto de pago.",
    "theory": [
      "Aunque en Spin 3-max el “bubble” es corto, el concepto de pay jump sigue: no arriesgues el second barato.",
      "Trampa: ignorar el payout cuando queda un all-in decisivo."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: ignorar el payout cuando queda un all-in decisivo."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Antes de shove o call, nombra el rango rival y el tuyo: no es “mi mano vs su mano”.",
    "theory": [
      "Piensa en bandas: ¿qué shoves el BTN a 10 bb? ¿Qué calls la BB?",
      "Trampa: decidir solo por “me gusta mi mano”."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: decidir solo por “me gusta mi mano”."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Vs nit stealeas más; vs maniac defiendes más tight y value-shoveas más limpio.",
    "theory": [
      "Ajusta al rival real del lobby, no solo al chart GTO.",
      "Trampa: jugar GTO ciego vs extremos obvios."
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "Trampa: jugar GTO ciego vs extremos obvios."
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
    "concept": "Certificación Spin Pro: aplica ICM, payout y explotación. Sin teoría nueva.",
    "theory": [
      "Resume tu plan short vs cover.",
      "¿Cuándo overfoldeo vs shove?"
    ],
    "examples": [
      {
        "title": "En la práctica",
        "body": "¿Cuándo overfoldeo vs shove?"
      }
    ],
    "aiQuestions": [
      "¿En qué se diferencia esto del cash?",
      "¿Qué error evitar aquí?"
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
