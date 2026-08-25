/*
 * school-data-ranges.js — Laboratorio Rangos R-01…R-27 (M0–M4)
 * Escuela: pública para usuarios autenticados (SCHOOL_PUBLIC=true en school.js).
 * Plan de gaps (R-01/R-02 matriz, deep-links): docs/ROADMAP_ESCUELA_RANGOS.md
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
      "title": "Leer un range chart 13×13",
      "openRanges": { "spot": "RFI", "heroPos": "BTN", "street": "preflop", "gameType": "cash6" },
      "matrixPreview": { "position": "BTN" }
    },
    {
      "route": "ranges",
      "module": "M0",
      "order": 1,
      "plan": "free",
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
      "title": "Construir RFI BTN en 60 s",
      "openRanges": { "spot": "RFI", "heroPos": "BTN", "street": "preflop", "gameType": "cash6" },
      "matrixPreview": { "position": "BTN" }
    },
    {
      "route": "ranges",
      "module": "M0",
      "order": 2,
      "plan": "free",
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
      "title": "Qué % del rango conecta un board",
      "matrixPreview": { "position": "BTN" }
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 3,
      "plan": "study",
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
      "title": "Eliminación de combos (blockers)",
      "matrixPreview": { "position": "BTN" },
      "openRanges": { "spot": "3bet", "heroPos": "BB", "villainPos": "BTN", "street": "preflop", "gameType": "cash6" }
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 4,
      "plan": "study",
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
      "plan": "study",
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
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 6,
      "plan": "study",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Tras una línea completa, no adivines “una mano”: recorta el rango calle a calle y elige el combo que todavía encaja. En la práctica verás sets, colores, escaleras y faroles mezclados — la pista está en la línea, no en el título.",
      "theory": [
        {
          "title": "Cada calle elimina combos",
          "body": "Open, call, check-check, raise o barrel van sacando manos del rango. Narra preflop → river antes de elegir el combo."
        },
        {
          "title": "Tres opciones creíbles",
          "body": "Las tres abren o defienden preflop; solo una sobrevive a toda la línea. Las otras mueren en flop, turn o river."
        },
        {
          "title": "Sin atajos de categoría",
          "body": "No busques “la respuesta típica de esta lección”: el villano puede tener valor hecho o aire con historia creíble."
        }
      ],
      "examples": [
        {
          "title": "Drill de voz alta",
          "body": "Di: “¿qué value llega? ¿qué medias se fueron? ¿qué faroles quedan?” Luego elige un combo concreto."
        },
        {
          "title": "Check-check que habla",
          "body": "Un premium que checkea flop A-high casi siempre miente: esa calle ya eliminó AA o KK en muchos spots."
        },
        {
          "title": "Raise polar",
          "body": "Un check-raise de flop no es “cualquier Ax”: densifica sets, dos pares y algunos faroles con equity."
        }
      ],
      "aiQuestions": [
        "¿Qué elimina un check-check de flop?",
        "¿Por qué las tres opciones deben ser creíbles preflop?",
        "¿Qué preguntas te haces antes de elegir?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-07",
      "title": "¿Qué tiene? · Lectura I"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 7,
      "plan": "study",
      "xp": 90,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Misma mecánica que Lectura I: línea completa + quiz. Sigue mezclando value y faroles. Entrena a descartar con una frase clara por calle.",
      "theory": [
        {
          "title": "Frase de descarte",
          "body": "Cada opción incorrecta necesita un motivo postflop (“pot-controla turn”, “no raisea sin set”). Si solo dices “no abre”, el ejercicio es demasiado fácil."
        },
        {
          "title": "Value vs media",
          "body": "Tras tres calles de presión, las medias sticky suelen haberse quedado atrás; densificas value y faroles creíbles."
        },
        {
          "title": "Board + línea",
          "body": "La textura importa, pero la secuencia de acciones importa más: el mismo board admite dos historias distintas según la línea."
        }
      ],
      "examples": [
        {
          "title": "Triple barrel seco",
          "body": "Ax value o farol con plan; underpair pot-controla turn y no mete tres calles por valor."
        },
        {
          "title": "Delayed barrel",
          "body": "Check flop + bet turn: a menudo Kx o Qx que no quiso c-bet; AA casi nunca checkea ese flop."
        },
        {
          "title": "Float + bet river",
          "body": "Pasivo dos calles y presión final: dos pares o farol polar, rara vez overpair puro que raisearía antes."
        }
      ],
      "aiQuestions": [
        "¿Qué es una frase de descarte útil?",
        "¿Qué densifica un triple barrel?",
        "¿Qué elimina AA del check-check?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-08",
      "title": "¿Qué tiene? · Lectura II"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 8,
      "plan": "study",
      "xp": 95,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Sube la precisión: mismas reglas, combos más finos. Sigue sin tipificar la lección — mira la línea, no el módulo.",
      "theory": [
        {
          "title": "Combos, no etiquetas",
          "body": "“Tiene color” es vago; “K♠J♠ en monotone” es un combo que puedes confrontar con blockers y con las acciones de cada calle."
        },
        {
          "title": "Blockers ligeros",
          "body": "Tus cartas quitan combos del villano. Úsalos al final del razonamiento, no como primera pista del quiz."
        },
        {
          "title": "Historia creíble",
          "body": "Si la línea es donk más barrel, el combo debe querer liderar ese flop; si no tiene motivo, descártalo."
        }
      ],
      "examples": [
        {
          "title": "Donk + barrels",
          "body": "Liderar flop y seguir: fuerte hecho o semi-bluff con plan; broadway sin conexión no donkea."
        },
        {
          "title": "Raise flop + presión",
          "body": "Polar: hecho fuerte o equity clara; underpair casi nunca raisea ese flop por value."
        },
        {
          "title": "Check turn + bet river",
          "body": "Thin value o farol delayed; overpair suele haber betado turn en vez de pot-controlar."
        }
      ],
      "aiQuestions": [
        "¿Por qué hablar en combos ayuda?",
        "¿Cuándo miras blockers?",
        "¿Qué manos donkean un flop seco?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-09",
      "title": "¿Qué tiene? · Lectura III"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 9,
      "plan": "study",
      "xp": 95,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Sigue el drill de tres opciones. La dificultad sube porque los distractores también “casi” encajan hasta una calle concreta.",
      "theory": [
        {
          "title": "Distractores duros",
          "body": "La mala opción abre BTN y c-betea flop, pero muere en turn: ahí está el entrenamiento de lectura de línea."
        },
        {
          "title": "Scare cards",
          "body": "Un as o un blank cambia qué value barrela y qué farol se rinde; incorpóralo a tu narración de la línea."
        },
        {
          "title": "No ancles la nuts",
          "body": "Si solo imaginas la mano que te gana, estás sesgado: lista value, medias y aires antes de elegir."
        }
      ],
      "examples": [
        {
          "title": "Blank river",
          "body": "Pregunta quién sigue metiendo presión sin mejorar y quién se habría quedado atrás en turn."
        },
        {
          "title": "Parea el board",
          "body": "Fulls y pot-control: la línea distingue boat de overpair que no quiere meter tres calles."
        },
        {
          "title": "Connected board",
          "body": "Escalera hecha vs draw que falla: la acción del river y si completa el board lo dicen."
        }
      ],
      "aiQuestions": [
        "¿Qué hace duro a un distractor?",
        "¿Cómo usas una scare card?",
        "¿Cómo evitas anclarte a la nuts?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-10",
      "title": "¿Qué tiene? · Lectura IV"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 10,
      "plan": "study",
      "xp": 95,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cierre de M2: consolida el método. En M3 los faroles de draw fallido y el polar serán más frecuentes — el método no cambia.",
      "theory": [
        {
          "title": "Método en 20 s",
          "body": "1) Narra la línea 2) Lista 2–3 value 3) Lista 2–3 faroles 4) Elige un combo 5) Descarta las otras dos con una frase."
        },
        {
          "title": "Puente a M3",
          "body": "Cuando el color o la escalera no llegan, la misma línea puede ser farol: no asumas siempre value hecho."
        },
        {
          "title": "Autocheck",
          "body": "Si tu respuesta “solo encaja porque es esta lección”, está mal planteada: la pista debe salir de la línea."
        }
      ],
      "examples": [
        {
          "title": "Repaso mixto",
          "body": "Sets, colores, escaleras y dos pares aparecen mezclados en el mismo bloque de práctica a propósito."
        },
        {
          "title": "Misma línea, otra textura",
          "body": "Cambia el board mentalmente: ¿sigue vivo tu combo con esa historia de acciones?"
        },
        {
          "title": "Tres calles vs dos",
          "body": "Menos agresión deja más medias en el rango; más agresión densifica polar value y faroles."
        }
      ],
      "aiQuestions": [
        "¿Cuáles son los 5 pasos del método?",
        "¿Qué cambia si el draw no completa?",
        "¿Cómo detectas un atajo de lección?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-11",
      "title": "¿Qué tiene? · Lectura V"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 13,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Misma pregunta, más faroles creíbles: draws que no completan, semi-bluffs y presión que se queda en aire. El título no te dice qué buscar.",
      "theory": [
        {
          "title": "Equity que muere",
          "body": "Quien raisea flop con draw y barrela river blank a menudo farolea: la historia era equity, no showdown value."
        },
        {
          "title": "Value que sigue",
          "body": "Hechos fuertes también barrela blank. Distingue por líneas previas (raise polar vs call sticky sin equity)."
        },
        {
          "title": "Sin spoiler de módulo",
          "body": "Mezclamos hechos y faroles a propósito: lee la línea, no el temario del módulo."
        }
      ],
      "examples": [
        {
          "title": "Raise + blank",
          "body": "Semi-bluff fallido vs set: pregunta quién raisea ese flop por value o por equity."
        },
        {
          "title": "Triple barrel two-tone",
          "body": "Flush hecho vs flush draw fallido: mira si el river completa el palo o no."
        },
        {
          "title": "Float + bet",
          "body": "Aire con historia o dos pares: mira si en flop/turn había plan de equity o showdown."
        }
      ],
      "aiQuestions": [
        "¿Qué es equity que muere?",
        "¿Cómo distingues farol de value en blank?",
        "¿Por qué el módulo no tipifica la mano?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-12",
      "title": "¿Qué tiene? · Polar y faroles I"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 14,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Más presión en river y sizing que polariza. Sigue descartando con frases postflop, no con “no abre”.",
      "theory": [
        {
          "title": "Sizing como pista",
          "body": "Overbet suele ser polar (fuerte o aire); bet pequeño suele ser thin o merge. No es regla absoluta: contrástalo con la línea previa."
        },
        {
          "title": "Blockers en polar",
          "body": "El as del palo reduce nuts de color: a veces justifica farol o call. Úsalo al final del razonamiento."
        },
        {
          "title": "Medias fuera",
          "body": "Tras tres calles grandes, QJ sin pareja rara vez llega: el rango se polarizó y las medias se fueron."
        }
      ],
      "examples": [
        {
          "title": "Overbet river",
          "body": "Nuts o set o aire; overpair medio encaja peor en overbet que en bet medio."
        },
        {
          "title": "Check-raise + barrels",
          "body": "Polar clásico de value fuerte o farol con equity; underpair no raisea flop así."
        },
        {
          "title": "Delayed overbet",
          "body": "Check flop + overbet tarde: value específico o farol raro — AA casi no checkea."
        }
      ],
      "aiQuestions": [
        "¿Qué sugiere un overbet?",
        "¿Cuándo entran los blockers?",
        "¿Qué pasa con las medias sticky?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-13",
      "title": "¿Qué tiene? · Polar y faroles II"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 15,
      "plan": "coach",
      "xp": 105,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Distractores más pegados: las dos malas opciones también tienen historia hasta turn. El river decide.",
      "theory": [
        {
          "title": "Muere en river",
          "body": "La opción mala c-betea y barrela turn, pero el river blank no justifica su bet final: ahí la descartas."
        },
        {
          "title": "Hecho vs fallido",
          "body": "Misma línea aparente: una completa el color o la escalera, la otra no. Lee el board final con cuidado."
        },
        {
          "title": "No inventes",
          "body": "Si no puedes explicar por qué ese combo apuesta river tras esa línea, no lo elijas."
        }
      ],
      "examples": [
        {
          "title": "OESD fallido",
          "body": "Raise flop connected + river blank: farol con historia de escalera que no llegó."
        },
        {
          "title": "Flush fallido",
          "body": "Two-tone + blank: farol o color hecho según si el river completa el palo."
        },
        {
          "title": "Set lento",
          "body": "Check flop + presión tarde: ¿slowplay de set o delayed farol? La calle intermedia decide."
        }
      ],
      "aiQuestions": [
        "¿Qué significa “muere en river”?",
        "¿Cómo lees un blank final?",
        "¿Qué te exige explicar un combo?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-14",
      "title": "¿Qué tiene? · Polar y faroles III"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 16,
      "plan": "coach",
      "xp": 105,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Consolida polar: value fuerte, faroles con historia, medias fuera. Preparación de M4 (sizing fino y líneas raras).",
      "theory": [
        {
          "title": "Lista polar",
          "body": "Antes de elegir: anota 2 value fuertes y 2 faroles con equity previa. Si no sales, estás anclado a una sola mano."
        },
        {
          "title": "Call ≠ raise",
          "body": "Defender BB no autoriza check-raise sin set o draw: esa es la trampa clásica del distractor."
        },
        {
          "title": "Puente a M4",
          "body": "En M4 el sizing y las líneas raras afinarán el mismo método de narrar y descartar calle a calle."
        }
      ],
      "examples": [
        {
          "title": "XR flop seco",
          "body": "Set o farol con equity; AKo limpio sin pareja no check-raisea ese flop por value."
        },
        {
          "title": "Donk + presión",
          "body": "Hecho que quiere liderar o draw con plan; broadway sin conexión no donkea flop."
        },
        {
          "title": "Small-small-overbet",
          "body": "Polar fino: Ax fuerte o farol; underpair no convierte c-bets pequeños en overbet."
        }
      ],
      "aiQuestions": [
        "¿Cómo armas una lista polar?",
        "¿Por qué call no implica raise?",
        "¿Qué añade M4 al método?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-15",
      "title": "¿Qué tiene? · Polar y faroles IV"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 17,
      "plan": "coach",
      "xp": 110,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cierre M3: mezcla final de hechos y faroles. Si aciertas sin mirar la línea, estás usando atajos — cámbialo.",
      "theory": [
        {
          "title": "Autocheck anti-atajo",
          "body": "Pregúntate: “¿lo elegí porque la línea lo dice o porque en esta lección suele ser X?” Solo vale lo primero."
        },
        {
          "title": "Resumen de descartes",
          "body": "Practica decir en una frase por qué mueren las dos opciones incorrectas antes de revelar."
        },
        {
          "title": "Listo para M4",
          "body": "Boats, thin value y líneas raras: misma pregunta del quiz, más exigencia en sizing y timing."
        }
      ],
      "examples": [
        {
          "title": "Repaso mixto M3",
          "body": "Draws fallidos, colores, polar y algún hecho claro aparecen mezclados a propósito."
        },
        {
          "title": "Una frase cada una",
          "body": "Escribe mentalmente el descarte de las opciones b y c antes de pulsar tu respuesta."
        },
        {
          "title": "Tempo de spot",
          "body": "20–30 s por spot: narra la línea, lista value y faroles, elige un combo."
        }
      ],
      "aiQuestions": [
        "¿Qué es un atajo de lección?",
        "¿Cómo resumes un descarte?",
        "¿Qué cambia en M4?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-16",
      "title": "¿Qué tiene? · Polar y faroles V"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 20,
      "plan": "coach",
      "xp": 110,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Boats, thin value y líneas raras mezclados con faroles. El sizing y el timing cuentan tanto como la categoría de mano.",
      "theory": [
        {
          "title": "Sizing + timing",
          "body": "Bet pequeño tras check turn no es lo mismo que overbet tras check-raise. Misma “presión”, distinto rango implicado."
        },
        {
          "title": "Double paired",
          "body": "Boat vs overpair: quien barrela tres calles suele tener el full, no solo KK sin boat."
        },
        {
          "title": "Líneas raras",
          "body": "Donk + check turn + bet river sigue siendo legible si el combo quiere esa historia de timing."
        }
      ],
      "examples": [
        {
          "title": "Boat lento",
          "body": "Check turn + bet river en double paired: full que no grita; overpair suele betear turn."
        },
        {
          "title": "Thin pequeño",
          "body": "Ax thin tras pot-control; no es polar de overbet ni farol sin historia."
        },
        {
          "title": "Donk raro",
          "body": "Lidera flop, frena en scare card y retoma river: set o hecho que mezcla timing."
        }
      ],
      "aiQuestions": [
        "¿Qué aporta el sizing?",
        "¿Cómo lees double paired?",
        "¿Cuándo una línea rara es legible?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-17",
      "title": "¿Qué tiene? · Lectura avanzada I"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 21,
      "plan": "coach",
      "xp": 115,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Nivel avanzado: merge vs polar, thin vs farol. Sigue sin tipificar — el quiz mezcla todo a propósito.",
      "theory": [
        {
          "title": "Merge",
          "body": "Bet medio: value más algunos faroles. Ni overbet polar extremo ni thin mínimo de una sola calle."
        },
        {
          "title": "Thin value",
          "body": "Cobra peores pares y no busca stacks. Si el sizing es pequeño tras pot-control, piensa thin value."
        },
        {
          "title": "Farol con historia",
          "body": "Sin equity ya en river, pero la línea previa (draw o raise) hace creíble el farol."
        }
      ],
      "examples": [
        {
          "title": "Bet medio tres calles",
          "body": "Merge de Ax o Kx con algunos faroles; no es overbet de nuts."
        },
        {
          "title": "Overbet vs thin",
          "body": "Compara sizing en spots similares: el tamaño cambia el rango que asignas."
        },
        {
          "title": "Raise river",
          "body": "Pasivo hasta el final y raise: fuerte específico, no media sticky sin motivo."
        }
      ],
      "aiQuestions": [
        "¿Qué es merge?",
        "¿Cómo distingues thin de polar?",
        "¿Qué pide un raise river?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-18",
      "title": "¿Qué tiene? · Lectura avanzada II"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 22,
      "plan": "coach",
      "xp": 115,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Distractores casi perfectos hasta river. Una sola calle o un sizing te da el descarte correcto.",
      "theory": [
        {
          "title": "Una calle decide",
          "body": "Las tres opciones llegan a turn; solo una justifica el river. Ahí está el descarte fino."
        },
        {
          "title": "Pot-control vs presión",
          "body": "Overpair que pot-controla no se convierte de pronto en overbet sin scare card clara."
        },
        {
          "title": "No fuerces el combo",
          "body": "Si tu combo “podría” pero no “quiere” esa línea, descártalo: la historia debe ser natural."
        }
      ],
      "examples": [
        {
          "title": "Casi set",
          "body": "Underpair que flats no es set que raisea flop: el raise polar lo distingue."
        },
        {
          "title": "Casi flush",
          "body": "Draw fallido vs color hecho: el board final dice si el palo completó."
        },
        {
          "title": "Casi thin",
          "body": "Farol que imita thin sizing: mira si había equity previa que justifique la presión."
        }
      ],
      "aiQuestions": [
        "¿Qué significa que una calle decide?",
        "¿Cuándo pot-control elimina un combo?",
        "¿Qué es “quiere” la línea?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-19",
      "title": "¿Qué tiene? · Lectura avanzada III"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 23,
      "plan": "coach",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Líneas raras y boats finos. El método de M2 sigue siendo la base aunque el sizing sea más avanzado.",
      "theory": [
        {
          "title": "Vuelve al método",
          "body": "Narra la línea, lista value y faroles, elige un combo y descarta las otras dos con una frase clara."
        },
        {
          "title": "Timing mixto",
          "body": "Check-raise flop + check turn + bet river: set que mezcla timing, no AKo sin pareja."
        },
        {
          "title": "Boat vs boat",
          "body": "En double paired, la agresión suele ser el boat alto o el de la pareja del flop, no un overpair limpio."
        }
      ],
      "examples": [
        {
          "title": "XR + check + bet",
          "body": "Set con timing raro: raisea flop, frena turn y cobra river."
        },
        {
          "title": "Donk turn",
          "body": "Cambia quién lidera a mitad de mano: el combo debe querer ese donk de turn."
        },
        {
          "title": "Full house",
          "body": "Línea lenta o gritada: ambas posibles; mira check-turn vs triple barrel."
        }
      ],
      "aiQuestions": [
        "¿Cuál es el método base?",
        "¿Qué sugiere XR más check más bet?",
        "¿Cómo piensas boat vs boat?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-20",
      "title": "¿Qué tiene? · Lectura avanzada IV"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 24,
      "plan": "coach",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cierre de la ruta Rangos: quiz mixto de nivel avanzado. Si enganchas, es porque lees la línea — no porque el título spoilera la categoría.",
      "theory": [
        {
          "title": "Enganche real",
          "body": "El juego es “¿qué combo sobrevive?”. La teoría solo te da el método; la práctica es el reto sin pistas de temario."
        },
        {
          "title": "Sin pistas de temario",
          "body": "Aquí hay boats, thin, faroles y hechos claros mezclados a propósito para que no adivines por el módulo."
        },
        {
          "title": "Siguiente nivel",
          "body": "Repite spots fallados: escribir el descarte de la opción incorrecta es el aprendizaje que queda."
        }
      ],
      "examples": [
        {
          "title": "Bloque final mixto",
          "body": "Todo tipo de manos en un solo tramo de práctica: el método unifica el bloque."
        },
        {
          "title": "Revisa fallos",
          "body": "Relee la frase de eliminación de la opción que elegiste mal y vuelve a narrar la línea."
        },
        {
          "title": "Comparte",
          "body": "Usa el botón de compartir: reta a un amigo con la imagen sin revelar la respuesta."
        }
      ],
      "aiQuestions": [
        "¿Qué hace enganchar el quiz?",
        "¿Por qué mezclamos categorías?",
        "¿Cómo usas un fallo para aprender?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-21",
      "title": "¿Qué tiene? · Lectura avanzada V"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 11,
      "plan": "study",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cierre M2: faroles que se delatan por la línea (draws que mueren, presión sin equity). La respuesta correcta es aire — dedúcela por cómo actúa, no por el título.",
      "theory": [
        {
          "title": "Equity que muere",
          "body": "Si barrela two-tone y el river es brick, muchas manos value habrían elegido otro sizing; el draw fallido sigue necesitando fold equity."
        },
        {
          "title": "Value más lineal",
          "body": "Top pair y sets suelen sizing continuo. Saltos a overbet o check-turn + bomb en blank empujan el rango a polar — y el lado air es creíble."
        },
        {
          "title": "Descarta el hecho fuerte",
          "body": "Pregunta: “si tuviera QJ aquí, ¿jugaría exactamente así?”. Si la respuesta es no, no elijas QJ."
        }
      ],
      "examples": [
        {
          "title": "FD + brick",
          "body": "C-bet + barrel + overbet en blank: KdXd muerto late más que AKo value."
        },
        {
          "title": "OESD float",
          "body": "Float + overbet sin completar: 98s muerto, no KTo."
        },
        {
          "title": "Donk sin llegar",
          "body": "Donk en two-tone y presión hasta brick: combo draw fallido, no set limpio."
        }
      ],
      "aiQuestions": [
        "¿Qué sizing delata polar air?",
        "¿Por qué el value fuerte no checkea turn y bomba river?",
        "¿Cómo descartas un top pair creíble?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-22",
      "title": "¿Qué tiene? · Faroles por línea I"
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 12,
      "plan": "study",
      "xp": 105,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Más faroles con historia: blockers, delayed bombs, raise turn blank. Sigue siendo Study: difícil, pero la lógica de descarte es explícita.",
      "theory": [
        {
          "title": "Blocker ≠ value",
          "body": "A5o puede bombear river como blocker; ATo con showdown suele haber betead turn."
        },
        {
          "title": "XR + freno",
          "body": "Check-raise con equity y luego check turn + bet river brick: el draw murió; el set habría seguido."
        },
        {
          "title": "Representar el board",
          "body": "Cuando completa una escalera y apuesta grande sin haber mostrado antes, a menudo representa — no tiene."
        }
      ],
      "examples": [
        {
          "title": "Delayed overbet",
          "body": "Check turn + overbet: aire con blocker, no top pair."
        },
        {
          "title": "Raise turn blank",
          "body": "Raise en blank tras call flop: gutshot muerto, no overpair."
        },
        {
          "title": "Donk turn miss",
          "body": "Donk de equity y bet river miss: 96o, no KK."
        }
      ],
      "aiQuestions": [
        "¿Qué es un farol de blocker?",
        "¿Qué elimina un check-turn tras XR?",
        "¿Cuándo “representar” es sospechoso?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-23",
      "title": "¿Qué tiene? · Faroles por línea II"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 18,
      "plan": "coach",
      "xp": 110,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "M3 Coach: faroles con distractores value fuertes. La línea sigue siendo la prueba — si el hecho grande no encaja al 100 %, es air.",
      "theory": [
        {
          "title": "Tiny → overbet",
          "body": "Pequeño-pequeño-overbet es el print polar. El value medio casi nunca salta así; el draw fallido sí."
        },
        {
          "title": "Distractores duros",
          "body": "Las opciones incorrectas parecen “obvias”. Oblígate a una frase de descarte postflop antes de elegir."
        },
        {
          "title": "Scare card",
          "body": "As o rey que asusta + sizing extremo: ¿quién necesita fold equity? El que no tiene showdown."
        }
      ],
      "examples": [
        {
          "title": "Polar print",
          "body": "Tiny bets y overbet final: K6s muerto, no AKo lineal."
        },
        {
          "title": "XR sin nut",
          "body": "XR two-tone y presión brick: A9s story, no QQ limpio."
        },
        {
          "title": "Float overbet",
          "body": "Float + overbet tras A: 54s muerto, no AA."
        }
      ],
      "aiQuestions": [
        "¿Por qué tiny-tiny-overbet es polar?",
        "¿Cómo evitas el distractor de dos pares?",
        "¿Qué hace un scare card al rango air?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-24",
      "title": "¿Qué tiene? · Faroles difíciles I"
    },
    {
      "route": "ranges",
      "module": "M3",
      "order": 19,
      "plan": "coach",
      "xp": 115,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Más presión: donk+raise, representan nuts, blockers en AK-high. Si aciertas sin narrar la línea, estás adivinando.",
      "theory": [
        {
          "title": "Historia vs mano",
          "body": "El villano cuenta una historia (escalera, color). Si la historia empieza tarde o con sizing raro, suele ser mentira."
        },
        {
          "title": "Call ≠ raise",
          "body": "Manos value fuertes raisean o betean turn; las que solo hacen call y luego “reviven” en river son sospechosas."
        },
        {
          "title": "Autocheck",
          "body": "Antes de marcar: “¿esta opción habría checkeado turn?”. Si no, elimínala."
        }
      ],
      "examples": [
        {
          "title": "Donk fallido",
          "body": "Donk + call raise + bet brick: 87s muerto."
        },
        {
          "title": "Representa escalera",
          "body": "Bet cuando completa el board: Q9o air, no JJ."
        },
        {
          "title": "AK-high air",
          "body": "Triple barrel sin showdown: QJs blocker, no AKo."
        }
      ],
      "aiQuestions": [
        "¿Qué es “contar una historia” en river?",
        "¿Por qué el value raisea turn?",
        "¿Cómo usas el autocheck de turn?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-25",
      "title": "¿Qué tiene? · Faroles difíciles II"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 25,
      "plan": "coach",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "M4: faroles que parecen thin value. El sizing pequeño de river tras presión, o el overbet tras tiny, delatan air con disfraz.",
      "theory": [
        {
          "title": "Thin falso",
          "body": "Un tiny river tras tres calles no es thin value típico: es air que no quiere un call grande."
        },
        {
          "title": "Blocker polar",
          "body": "KQo en A-high puede overbetear como blocker; A8o con showdown no necesita ese print."
        },
        {
          "title": "Línea rara = air o nuts",
          "body": "Si no es nuts (y el board no lo permite), es air. No inventes “merge mágico”."
        }
      ],
      "examples": [
        {
          "title": "Tiny river",
          "body": "Triple barrel + tiny: AQs FD muerto fingiendo thin."
        },
        {
          "title": "Raise turn A",
          "body": "Check flop + raise A: JTs air, no QQ."
        },
        {
          "title": "Representa 5",
          "body": "Overbet cuando completa 64: 96s mentira."
        }
      ],
      "aiQuestions": [
        "¿Por qué un tiny river huele a air?",
        "¿Qué es farol de blocker en M4?",
        "¿Cuándo descartas el merge?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-26",
      "title": "¿Qué tiene? · Faroles avanzados I"
    },
    {
      "route": "ranges",
      "module": "M4",
      "order": 26,
      "plan": "coach",
      "xp": 125,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Cierre Rangos: los faroles más difíciles. Misma mecánica de quiz; la pista está solo en la forma de actuar.",
      "theory": [
        {
          "title": "Misma prueba",
          "body": "Calle a calle: ¿qué combos sobreviven? Si el value fuerte murió en turn, el river bet es air o bluff-catcher — aquí air."
        },
        {
          "title": "Sin atajo de módulo",
          "body": "Sabes que la lección es de faroles, pero cada spot exige la frase de descarte. No marques “la más fea” a ciegas."
        },
        {
          "title": "Repite fallos",
          "body": "Si fallas, reescribe por qué la opción value no juega así. Ese músculo es el producto."
        }
      ],
      "examples": [
        {
          "title": "Polar print M4",
          "body": "Tiny-tiny-overbet: KQo farol, no ATo."
        },
        {
          "title": "XR + overbet",
          "body": "XR hearts + check + overbet: QJs muerto."
        },
        {
          "title": "Thin-fake",
          "body": "Triple + tiny: A6s FD fallido, no KJo."
        }
      ],
      "aiQuestions": [
        "¿Cuál es la prueba final de un farol?",
        "¿Por qué no basta saber que “es lección de faroles”?",
        "¿Cómo conviertes un fallo en método?"
      ],
      "spots": [],
      "exam": false,
      "id": "R-27",
      "title": "¿Qué tiene? · Faroles avanzados II"
    },
    {
      "route": "ranges",
      "module": "M1",
      "order": 5.5,
      "plan": "study",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 0,
      "exam": true,
      "concept": "Examen M1: mezcla localizar celdas, ¿entra en el rango? y blockers — sin pistas de módulo.",
      "theory": [
        {
          "title": "Qué evalúa este examen",
          "body": "Repasas matriz, RFI BTN y eliminación de combos. Si apruebas, demuestras que lees el chart y no solo memorizas spots de open/fold."
        },
        {
          "title": "Cómo prepararte",
          "body": "Antes de empezar: localiza AA, 72o y AKs sin dudar; nombra bandas del botón en sesenta segundos; recuerda que un as en la mano bloquea combos de AA/AK del rival."
        }
      ],
      "examples": [
        {
          "title": "Sin spoilers",
          "body": "Cada spot es independiente. Usa el mismo método: diagonal / suited / offsuit → banda → blockers. Si fallas, vuelve a R-01, R-02 o R-04."
        }
      ],
      "aiQuestions": [
        "¿Qué repasarías si fallas el examen M1 de rangos?"
      ],
      "spots": [],
      "id": "R-28",
      "title": "Examen M1 · Matriz y blockers",
      "openRanges": { "spot": "RFI", "heroPos": "BTN", "street": "preflop", "gameType": "cash6" },
      "matrixPreview": { "position": "BTN" }
    },
    {
      "route": "ranges",
      "module": "M2",
      "order": 12.5,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 0,
      "exam": true,
      "concept": "Examen M2: lectura de línea + ¿qué tiene? mezclado con trampas del bloque Study.",
      "theory": [
        {
          "title": "Qué evalúa este examen",
          "body": "Tras Lectura I–V y faroles por línea, demuestras que descartas combos con la historia completa, no con el river aislado ni con el título de la lección."
        },
        {
          "title": "Método en el examen",
          "body": "Lee preflop → flop → turn → river. Elimina lo imposible en cada calle. Entre las tres opciones, solo una sobrevive a toda la línea. Sin atajos de categoría."
        }
      ],
      "examples": [
        {
          "title": "Método",
          "body": "Si el villano check-raisea flop y overbetea river brick, prioriza draws fallidos y polar, no medias manos que habrían betado turn."
        }
      ],
      "aiQuestions": [
        "¿Cómo usas la línea completa para eliminar combos?"
      ],
      "spots": [],
      "id": "R-29",
      "title": "Examen M2 · Lectura de línea"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);
