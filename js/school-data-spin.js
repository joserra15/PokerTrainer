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
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo en el botón (BTN) con ~20 bb: open/steal claro. Si todos folden, ganas las ciegas sin ver flop — por eso robamos más cuando el stack es corto.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['7c', '2d'], 40102, { trapTag: 'dominated', teachBack: '72o: fold. No stealees (abrir para robar ciegas) basura total: si te pagan o te re-suben, la mano casi nunca aguanta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs desde SB a ~20 bb: open/steal razonable. Ojo: si te pagan, juegas fuera de posición (OOP) — por eso abrimos un poco más tight que desde BTN.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['Qd', '8c'], 40104, { trapTag: 'fancy_play', teachBack: 'Q8o SB: a menudo fold. No estás en BTN: aquí el steal es más arriesgado porque quedarás OOP si te igualan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['9s', '9c'], 40105, { teachBack: '99 BTN: open claro. Par medio fuerte a 20 bb — quieres robar o jugar un pot manejable, no limpear.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['8h', '7h'], 40106, { teachBack: '87s BTN: steal razonable. Conectada (suited) y puede mejorar en flop; buen candidato a robar ciegas.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['As', 'Kd'], 40201, { teachBack: 'AKo vs steal del BTN: 3-bet (resubida) por valor claro. Mano premium a stack corto — presionas o vas all-in si te conviene.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['7c', '2d'], 40202, { trapTag: 'dominated', teachBack: '72o BB: fold. No overdefiendas (pagar de más) las ciegas con basura — en torneo corto un error elimina.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJs vs steal de SB: defensa razonable. Puedes 3-betear o hacer call según stack; no es mano para pagar a ciegas siempre.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '5d'], 40204, { teachBack: 'A5s: 3-bet de presión/farol frecuente vs BTN. Blocker de as y jugabilidad si te pagan — castiga steals wide.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['Td', '8c'], 40205, { trapTag: 'fancy_play', teachBack: 'T8o: fold típico vs steal. No hero-call (pagar solo porque «puede ir bien») — dominada y difícil de jugar OOP.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['9s', '9c'], 40206, { teachBack: '99 vs SB: 3-bet o continue sólido. Par medio fuerte en spot corto — no foldees por defecto.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 3).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 3));
    if (kind === 'SPIN_ISO') return [
      iso('s04-01', 'BTN', 'SB', ['Ah', 'Js'], 40401, { teachBack: 'AJs BTN vs limp: iso (aislar). Subes para jugar heads-up contra el limper con mano fuerte.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-02', 'BTN', 'SB', ['7c', '2d'], 40402, { trapTag: 'dominated', teachBack: '72o: fold. No overiso (aislar) con basura — te dejan en pot multiway o te pagan dominado.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQs: iso por valor. Mano fuerte vs limp corto — quieres bote heads-up con iniciativa.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      iso('s04-04', 'BTN', 'SB', ['Qd', '8c'], 40404, { trapTag: 'fancy_play', teachBack: 'Q8o: fold frecuente vs limp. No aísles manos frágiles que no mejoran bien postflop.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH' || kind === 'SPIN_EXAM_M1') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs con stack ~12 bb: shove (all-in) candidato. A estas profundidades open pequeño suele ser peor que ir all-in o fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['7c', '2d'], 40502, { trapTag: 'dominated', teachBack: '72o: fold. No panic shove (all-in por desesperación) — sin fold equity ni equity real.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJs SB ~10 bb: shove frecuente. Stack corto + ciegas en juego = push/fold, no open min.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['9s', '9c'], 40504, { teachBack: '99 a 10–12 bb: shove por valor claro. Par medio fuerte en zona push/fold — quieres doblar o robar.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo BTN early: open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['Qd', '8c'], 50102, { trapTag: 'dominated', teachBack: 'Q8o UTG early: fold. Paciencia.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO: open estándar early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['7h', '2d'], 50104, { trapTag: 'dominated', teachBack: '72o: fold. No spew early.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['9s', '9c'], 50105, { teachBack: '99 BTN: open claro. Par medio fuerte a 20 bb — quieres robar o jugar un pot manejable, no limpear.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
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
    "concept": "Con 20–25 bb (ciegas grandes), desde el botón (BTN, último en hablar preflop) o la ciega pequeña (SB), puedes abrir más manos que en cash deep: robar ciegas (steal) gana fichas sin pelear un pot grande — y en torneo corto eso acerca al payout.",
    "theory": [
      "Steal (robo de ciegas): open-raise (subir de entrada) esperando que todos folden. A 20–25 bb las ciegas ya en mesa son un % grande de tu stack; fold equity (probabilidad de que tiren) vale mucho.",
      "BTN vs SB: desde BTN robas más wide porque solo quedan SB y BB detrás. Desde SB abres un poco más tight: si te pagan, juegas fuera de posición (OOP = actúas primero postflop) y eso penaliza manos marginales.",
      "Open no es «cualquier mano»: basura (72o, Q8o fuera de lugar) se castiga si te 3-betean (resubida) o si te pagan y quedas OOP. Ten plan: ¿fold al shove? ¿call shove con value?",
      "Trampa clásica: stealear wide y luego pagar un 3-bet shove (all-in) con mano dominada. En Spin, perder el stack suele ser perder el torneo — no spew (tirar fichas)."
    ],
    "examples": [
      {
        "title": "Steal desde BTN",
        "body": "Todos folden hasta BTN con 22 bb. Abres 2.2x: si SB y BB folden, ganas las ciegas sin ver flop. No «ganaste euros» — ganaste fichas que te acercan a eliminar rivales."
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
    "plan": "study",
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
        "body": "BTN abre steal a 20 bb, tú BB con AKo: 3-bet shove suele ser mejor que call — maximizas fold equity o vas all-in con mano premium."
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
    "plan": "study",
    "xp": 120,
    "passThreshold": 0.7,
    "goldThreshold": 0.9,
    "decisionEnd": true,
    "hands": 6,
    "concept": "Repaso M0: anatomía Spin (fichas ≠ €), steal desde BTN/SB y defensa BB. Sin vocabulario nuevo — aplica el checklist con calma.",
    "theory": [
      "Paso 1 — ¿Qué spot es? Steal (tú abres para robar) vs defensa BB (te abren). Examen = mezcla de ambos.",
      "Paso 2 — Stack en bb: ~20 bb → opens y 3-bets más agresivos; no juegues como cash 100 bb.",
      "Paso 3 — Acción: fold / open / 3-bet (o shove). Recuerda: en Spin perder stack ≈ perder torneo.",
      "Checklist rápido: posición → stack bb → ¿fold equity o necesito valor? → ejecuta sin spew."
    ],
    "examples": [
      {
        "title": "Antes de clicar",
        "body": "Lee posición y stack antes de la mano. «BTN 22 bb steal» y «BB 20 bb vs steal» no usan el mismo rango mental."
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
    "concept": "Si alguien limpea (igualar la ciega grande para entrar sin subir), aíslas (iso = subir para jugar heads-up) con manos fuertes. No overcommiteas con basura a stack corto.",
    "theory": [
      "Limpear en recreativos: entran baratos. Iso castiga: subes para que solo el limper pague (idealmente) y tú llevas iniciativa heads-up (1 vs 1).",
      "Sizing iso: bastante para aislar, pero sin meter todo el stack sin querer a 15–20 bb. Objetivo: pot manejable con mano que domina limps wide.",
      "Manos iso: Ax suited, broadways, pares medios+. Fold basura (72o, Q8o) — no aísles «porque estoy en BTN».",
      "Trampa: overiso trash o limpear tú detrás sin plan — regalas ciegas o entras multiway OOP."
    ],
    "examples": [
      {
        "title": "Iso clásico",
        "body": "SB limpea, BTN con AJs: iso a ~3–4 bb. Quieres heads-up con mano que domina el rango de limp."
      },
      {
        "title": "Fold vs limp",
        "body": "BTN con 72o vs limp SB: fold. No iso — no domina nada y el pot se complica."
      }
    ],
    "aiQuestions": [
      "¿Qué manos iso desde BTN vs limp en Spin?",
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
    "concept": "Con stacks cortos (~10–15 bb), el 3-bet correcto suele ser shove (all-in), no una resubida pequeña que te deja en calle sin salida.",
    "theory": [
      "Stack-off threshold: por debajo de ~15–20 bb (según spot), 3-bet shove es más limpio que 3-bet pequeño + decisión en turn/river imposible.",
      "Shove value: AX fuerte, pares medios+. Shove farol: algunas Ax suited con blockers. Flat (hacer call al open) solo manos que quieren ver flop barato — pocas aquí.",
      "Open shove desde BTN/SB a ~10 bb entra en push/fold (S-09): no min-raise «como cash».",
      "Trampa: 3-bet pequeño spew o flat dominado vs open short — te quedan 5 bb y OOP."
    ],
    "examples": [
      {
        "title": "3-bet shove vs open",
        "body": "CO open a 12 bb, tú BTN con 99: shove suele ser mejor que 3-bet a 3 bb — o doblas o foldas limpio."
      },
      {
        "title": "No flat dominado",
        "body": "Open steal, tú BB con K9o a 14 bb: fold o shove selectivo — flat OOP rara vez es correcto."
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
    "concept": "Chip lead (más fichas que los rivales): puedes presionar ciegas y opens flojos, pero no pagas shoves light solo porque «tengo más fichas» — recuerda fichas ≠ € (ICM).",
    "theory": [
      "Cover vs short: si eres el stack más grande (cover), aplicas presión — steals, iso, 3-bets — para robar o eliminar al short.",
      "No suicides el lead: call shove light vs short porque «soy favorito en equity» puede ser ICM suicide — pierdes torneo y el 2.º puesto no paga igual que el 1.º.",
      "Objetivo: acumular fichas sin regalar dobles fáciles. Presiona spots donde el short folda; foldea cuando su shove representa value.",
      "Trampa: confundir «tengo más fichas» con «debo pagar todo» — en Spin el payout manda."
    ],
    "examples": [
      {
        "title": "Presión con cover",
        "body": "Short tiene 8 bb, tú 25 bb en BTN: steal wide — el short no puede defenderte todo."
      },
      {
        "title": "Fold con cover",
        "body": "Short shove 10 bb desde SB, tú BB cover con A9o: a veces fold es correcto si ICM aprieta (cerca del dinero)."
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
    "concept": "Short stack (pocas bb): necesitas fichas para llegar al payout, pero no cualquier all-in. Elige double-up (doblar) claros con fold equity o equity decente.",
    "theory": [
      "Short vs cover: el rival tiene más fichas y puede eliminarte. Shove selectivo — manos que foldan often o van bien cuando te pagan.",
      "Survive + pick spots: a veces fold es correcto aunque «necesites fichas». Perder todo en flip malo = 0 €.",
      "Fold equity: si shoveas y todos folden, ganas el bote sin showdown — vital cuando eres short.",
      "Trampa: panic shove con basura vs cover que paga wide — te eliminan sin EV real."
    ],
    "examples": [
      {
        "title": "Shove con fold equity",
        "body": "10 bb en BTN, todos fold hasta ti: shove A5s — folds ganan ciegas; si te pagan, aún tienes equity."
      },
      {
        "title": "Fold para sobrevivir",
        "body": "8 bb en BB, cover shove desde SB: fold 65o aunque «necesites fichas» — dominada y sin fold equity."
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
    "concept": "Repaso M1: iso vs limp, 3-bet shove, chip lead y short vs cover. Examen = mezcla sin teoría nueva.",
    "theory": [
      "¿Limp en mesa? → iso (aislar) con manos fuertes; fold basura — no regales pot multiway.",
      "¿Te abren en zona corta? → 3-bet shove o fold; evita 3-bet pequeño que te deja sin stack útil.",
      "¿Eres cover (más fichas) o short? → cover presiona steals; short elige shoves con fold equity, no panic.",
      "Antes de actuar: anota stack en bb + posición + rol (steal / defensa / iso / push)."
    ],
    "examples": [
      {
        "title": "Checklist examen",
        "body": "Lee stack y limp/open antes de clicar. M1 Spins = acciones binarias (shove/fold) más often que en M0."
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
    "concept": "Entre 12 y 8 bb entras en push/fold: casi no hay open pequeño — decides shove (all-in) o fold según charts de stack corto.",
    "theory": [
      "Push/fold: con stack muy corto, min-raise deja poco fold equity y te commitea mal. Regla práctica: all-in o fold.",
      "BTN shovea más wide que posiciones tempranas (en 3-max: BTN vs blinds es el steal más loose). Usa menú Rangos / charts push-fold como referencia.",
      "Shove = poner todas las fichas. No confundas con open 2x — a 10 bb eso suele ser leak.",
      "Trampa: open min a 10 bb «como cash» y fold al 3-bet — pierdes ciegas + iniciativa."
    ],
    "examples": [
      {
        "title": "Push desde BTN",
        "body": "10 bb BTN, folds a ti: shove KTs — o robas o vas all-in con equity si te pagan."
      },
      {
        "title": "Fold en zona gris",
        "body": "9 bb UTG equivalente (HJ first in 3-max): Q9o often fold — peor fold equity que BTN."
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
    "concept": "Cuando te shovean, el call correcto suele ser más tight que «chip EV» (valor en fichas): ICM castiga arriesgar tu torneo por un flip.",
    "theory": [
      "Chip EV: solo mira fichas ganadas/perdidas en promedio. ICM: mira € según payout 1.º/2.º/3.º. En Spins, overfold vs shove suele ser correcto.",
      "Call shove con manos fuertes (pares altos, Ax fuerte); fold manos medias que en cash 100 bb pagarías (A9o, KQo marginal).",
      "Hero-call: pagar shove «porque puedo ganar» sin odds de payout — trampa ICM.",
      "Vs shove del short: a veces pagas wider (eliminarlo te da €); vs cover, más tight."
    ],
    "examples": [
      {
        "title": "Fold ICM correcto",
        "body": "Cover te shovea, tú 22 bb con AJo: a veces fold es mejor que flip — quedarte 2.º paga algo; bust = 0 €."
      },
      {
        "title": "Call vs short",
        "body": "Short shove 7 bb, tú BB con 99: call claro — equity alta y eliminar rival acerca al 1.º puesto."
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
    "concept": "A veces un call gana fichas en promedio (+EV chips) pero pierde dinero de torneo (−EV $). Aprende a oler esos spots antes de pagar.",
    "theory": [
      "+EV chips / −EV $: ganas fichas a largo plazo pero reduces tu premio esperado en € porque arriesgas eliminación cerca del dinero.",
      "Pay jump: salto entre 2.º y 1.º (o ITM vs bust). Cuanto mayor el salto, más caro es flippear.",
      "Prioriza supervivencia cuando el payout pesa: fold manos que «van bien en fichas» pero no justifican bust.",
      "Trampa ICM suicide: call shove light porque «soy 55 % favorito» ignorando que bust = perder la entrada entera."
    ],
    "examples": [
      {
        "title": "Spot +EV chips / −EV $",
        "body": "3-max, 2.º ya cobra, tú mid con 18 bb call shove de cover con A8s: puede ser +chips pero −€ si bust te cuesta el segundo premio grande."
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
    "concept": "Payout 5× (premio total cinco veces las entradas) aprieta más que 2×/3×: juegas más tight — el 1.º pesa mucho y el 2.º duele más perder.",
    "theory": [
      "Multiplicador (S-00): 2×/3×/5× cambia cuánto € hay en juego. En 5× el 1.º se lleva una parte mayor — ICM más fuerte.",
      "5× → menos steals locos, más tight vs shove, menos flips marginales. 2× → algo más de chip EV permitido.",
      "Misma mano, distinto payout: AJo call shove puede ser OK en 2× y fold en 5×.",
      "Trampa: jugar igual el spin de 2× que el de 5× — leak muy caro en lobbies reales."
    ],
    "examples": [
      {
        "title": "5× más tight",
        "body": "Ruleta mostró 5× antes de empezar: guarda ese dato mental. Si dudas entre shove marginal y fold, inclínate a fold."
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
    "concept": "Examen ICM Spins: push/fold, call shove, +EV chips vs −EV $ y ajuste por payout. Sin teoría nueva.",
    "theory": [
      "Pregunta clave en cada spot: ¿decido mirando solo fichas (chip EV) o el premio en € (ICM)?",
      "¿Stack ≤12 bb? → push/fold: shove (all-in) o fold; no min-raise estilo cash.",
      "¿Multiplicador 2×/3× vs 5×? → en 5× juega más tight en calls y steals marginales.",
      "Checklist examen: stack bb → rol cover/short → payout → fold / shove / call."
    ],
    "examples": [
      {
        "title": "Antes del examen",
        "body": "Repasa S-09…S-12: push/fold, overfold vs shove, spots −EV $, 5× más tight."
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
    "concept": "Bubble factor (presión de «burbuja»): mide cuánto duele arriesgar fichas cerca de un salto de pago. En Spin 3-max el heads-up (HU) ya es pay jump decisivo.",
    "theory": [
      "Bubble: zona donde un bust te deja sin € y otro jugador cobra. En 3-max, pasar de 3.º a 2.º o de 2.º a 1.º ya es bubble mental.",
      "Pay jump HU: el 1.º vs 2.º puede ser 70/30 o similar — no es indiferente flippear.",
      "Bubble factor alto → fold más, shove más selectivo. No regales el second place barato.",
      "Trampa: ignorar el payout en el all-in que decide el torneo — un flip puede costarte € aunque sea 50/50 en fichas."
    ],
    "examples": [
      {
        "title": "HU pay jump",
        "body": "Heads-up (2 jugadores): el 1.º gana mucho más que el 2.º. Un flip innecesario puede costarte la diferencia en € aunque ganes fichas 50/50."
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
    "concept": "Range vs range: antes de shove o call, piensa en bandas de manos (rangos), no solo «mi carta es bonita».",
    "theory": [
      "Rango: conjunto de manos que el rival puede tener. Ej.: «BTN shove 10 bb» suele ser más wide que «BB call vs shove».",
      "Tu shove: ¿qué manos peores pagan? ¿qué manos mejores te tienen? Si estás dominado often, fold.",
      "Range vs range: tu AK vs su shove range — no AK vs «creo que tiene QQ».",
      "Trampa: decidir solo por sensación («me gusta mi mano») sin nombrar el rango rival probable."
    ],
    "examples": [
      {
        "title": "Nombrar rangos",
        "body": "BTN shove 10 bb: muchas Ax, pares, conectadas. BB call: más tight — pares, Ax fuerte. A5o desde BB vs shove BTN: often fold."
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
    "concept": "Explotación: vs nit (pasa mucho) stealeas más; vs maniac (juega muchas manos agresivo) defiendes tighter y value-shoveas más limpio.",
    "theory": [
      "Nit: folda steals — abre/stealea más wide. No necesitas GTO perfecto si el rival tira todo.",
      "Maniac: paga y shovea wide — reduce faroles, value-shove más grueso, no bluffcatch light.",
      "Ajuste > chart ciego: observa 10–20 manos del rival en lobby si puedes.",
      "Trampa: jugar GTO de libro vs nit/maniac obvios — dejas € sobre la mesa si no ajustas al rival real."
    ],
    "examples": [
      {
        "title": "Vs nit",
        "body": "SB folda 80 % vs steal BTN: abre wider — cualquier fold es fichas gratis hacia el payout."
      },
      {
        "title": "Vs maniac",
        "body": "BB paga y 3-betea light: tighten opens marginales, shove value (TT+) más often."
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
    "concept": "Certificación Spin Pro: integra anatomía (fichas≠€), steal/defensa, push/fold, ICM, payout y explotación. Sin vocabulario nuevo.",
    "theory": [
      "Repaso mental: ¿cuántas bb tengo? ¿Es spot de steal, defensa BB, iso vs limp o push/fold?",
      "¿Soy cover (más fichas) o short? ¿El multiplicador fue 2×/3× o 5×? Eso cambia tightness.",
      "¿Decido en fichas (chip EV) o en euros (ICM)? ¿Nombré el rango rival antes de call/shove?",
      "Checklist final del examen: posición → stack bb → payout → acción sin spew ni hero-call."
    ],
    "examples": [
      {
        "title": "Plan Pro en una frase",
        "body": "Sobrevive al payout correcto, presiona con cover, shove/fold limpio short, overfold ICM cuando el pay jump duele."
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
