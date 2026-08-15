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
      "concept": "Tras una línea completa (preflop → river), no pongas al rival en “una mano”: recorta su rango calle a calle y acaba preguntándote qué combos siguen vivos.",
      "theory": [
        {
          "title": "Cada calle elimina manos",
          "body": "Asignar rango es ir capeando (recortando) combinaciones imposibles en cada calle. Quien hace open RFI no tiene 72o. Quien hace call a un c-bet en flop seco ya no es el RFI entero. Quien apuesta river tras tres calles de agresión densifica value y faroles creíbles; muchas medias sticky ya se quedaron atrás."
        },
        {
          "title": "Lee la línea, luego elige un combo",
          "body": "Ejercicio de profesor: narra preflop → flop → turn → river en voz alta. En el river lista 2–3 manos tipo de value, 2–3 medias y 2–3 aires que llegan a esa línea. Luego elige UN combo concreto que sobreviva. Si solo puedes imaginar la nuts que te gana, estás sesgado."
        },
        {
          "title": "Quiz final: ¿qué crees que tiene?",
          "body": "Antes de ver las cartas del villano, elige entre tres manos creíbles de preflop: la que encaja con toda la línea y dos que abren/defienden pero mueren en flop, turn o river (check-check que elimina AA, pot-control que saca underpairs, etc.). Si solo descartas basura de open, el ejercicio es demasiado fácil."
        }
      ],
      "examples": [
        {
          "title": "Triple barrel en A-high seco",
          "body": "BTN open, BB call, flop check-call, turn check-call, river bet. El BTN en river ya no es el RFI entero: se densificó en Ax value y algunos faroles con blockers; 72o nunca abrió y muchas basuras checkearon atrás en turn."
        },
        {
          "title": "Check-raise en flop",
          "body": "BB check-raisea un c-bet en board seco. Historia típica: sets, dos pares, a veces faroles con blockers. QJ sin pareja queda fuera del value; no digas “me tiene AK” sin mirar la línea."
        },
        {
          "title": "Drill de tres opciones",
          "body": "Al final de cada mano de práctica verás tres combos. Pregunta: ¿cuál sigue vivo tras open + call flop + bet turn + bet river? Las otras dos deben tener una frase de descarte clara."
        }
      ],
      "aiQuestions": [
        "¿Qué manos elimina un check-raise de flop del rango “solo call”?",
        "¿Cómo evitas poner al rival siempre en la nuts tras un river bet?",
        "Antes de ver las cartas del villano, ¿qué pregunta te haces?"
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
