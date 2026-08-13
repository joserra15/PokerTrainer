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
