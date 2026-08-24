/*
 * school-data-ranges-line.js — Rangos M2–M4: lectura de línea + quiz villano (R-07…R-27) + examen R-29.
 * Spots mezclados por módulo (sets/colores/escaleras/draws/boats…) sin tipificar la lección.
 * Cargar tras school-data-practice.js. Mismo patrón que R-05.
 * Deuda ER-10: archivo monolítico (~5,6k líneas); futuro split M2/M3/M4 o generador.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var flop = D.flopSpot;
  function cash(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100' }, extra || {});
  }
  function lineCfg() {
    return cash({
      scenario: 'rfi',
      practiceStreet: 'river',
      schoolDecisionEnd: true,
      schoolLineQuiz: true
    });
  }
  function LQ(id, heroPos, heroCards, board, seed, meta) {
    meta = meta || {};
    var spot = flop(id, heroPos, heroCards, board, seed, {
      street: 'river',
      villainPos: meta.villainPos || (meta.facingBet === false ? 'BB' : 'BTN'),
      facingBet: meta.facingBet !== false,
      teachBack: meta.teachBack || '',
      trapTag: meta.trapTag || 'none',
      playConfig: lineCfg()
    });
    spot.lineStory = meta.lineStory || [];
    spot.villainQuiz = meta.quiz;
    return spot;
  }

  var PACKS = {};

  PACKS["R-07"] = [
      LQ("r07-01", "BB", ["Kh","7d"], ["Jh","Jc","4s","2d","9c"], 70701, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Jc 4s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → CO bet 66% pot" }
        ],
        teachBack: "Triple barrel en JJ4: full de jotas. 88 pot-controla; A9o sin J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Jd"],
          teachBack: "JJ full: presión limpia. 88 y A9o no.",
          options: [
            { id: "a", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Open + c-bet posible, pero underpair al board paired: pot-control turn, no triple barrel." },
            { id: "b", cards: ["As","9d"], label: "A9o", correct: false,
              eliminated: "Puede abrir CO y c-bet, pero sin J: tras call flop no mete tres calles por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Js","Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r07-02", "BB", ["Tc","9c"], ["Kd","Jd","4d","2s","8h"], 70702, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd Jd 4d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "8h — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet flop diamonds + check turn + bet river: color AdXd thin. QQ sin diamond suele betear turn; QJs sin flush no cobra river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","Td"],
          teachBack: "ATo color de diamantes. QQ y QJs sin diamond no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: tras c-bet suele seguir en turn o checkear river — check-turn + bet-river de flush no encaja. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qc","Jh"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin diamond: tras check turn el river bet no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ad","Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r07-03", "BTN", ["Qh","Js"], ["Ah","Td","4c","8s","2d"], 70703, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah Td 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "Float dos calles + bet river A-high: Ax. KK raisearía antes; J9s sin as no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","9s"],
          teachBack: "A9s float value. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kc","Kd"], label: "KK", correct: false,
              eliminated: "Overpair al A: suele raisear flop/turn — float pasivo + bet river es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Jh","9h"], label: "J9s", correct: false,
              eliminated: "Call flop posible, pero sin as: no apuesta river por value. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","9s"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r07-04", "BB", ["Ad","9d"], ["7h","5c","2s","Td","Qc"], 70704, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7h 5c 2s — check-check" },
          { street: "Turn", text: "Td — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Qc — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop + delayed barrel: set de cincos. AA betearía flop; KQo no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h","5d"],
          teachBack: "55 set: slowplay + delayed value. AA no checkea; KQo no barrela turn+river.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "Premium: en board bajo casi siempre c-betea flop. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Kh","Qs"], label: "KQo", correct: false,
              eliminated: "Open late OK; sin 7/5, tras check-check el delayed barrel turn+river no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["5h","5d"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r07-05", "BB", ["Qd","8d"], ["As","Jh","3c","9s","2h"], 70705, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "As Jh 3c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "2h — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river: Ax thin. KK betearía turn; T9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","Td"],
          teachBack: "ATo thin. KK y T9s no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Th","9h"], label: "T9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el river bet no es value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ad","Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r07-06", "BB", ["Kd","8d"], ["7h","6c","5s","2d","Ac"], 70706, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7h 6c 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ac — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel 765: escalera 84 o 98. QQ pot-controla; ATo sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","4h"],
          teachBack: "84s escalera. QQ y ATo no barrela tres calles de straight.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair en board bajo conectado: suele pot-controlar turn, no triple barrel de escalera. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin escalera: no mete tres calles por value de straight. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["8h","4h"], label: "84s", correct: true }
          ]
        }
      }),
      LQ("r07-07", "BTN", ["Th","8h"], ["Ad","Tc","8s","5h","2c"], 70707, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ad Tc 8s — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "5h — BB bet 66% pot → BTN call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Check-raise A-high con T8: dos pares. KQo y 77 no raisean AT8.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","8c"],
          teachBack: "T8s dos pares: check-raise. KQo y 77 no.",
          options: [
            { id: "a", cards: ["Kh","Qs"], label: "KQo", correct: false,
              eliminated: "Defiende BB; en AT8 sin T/8: call/fold, no check-raise por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: call posible, raise flop polar sin dos pares es raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Td","8c"], label: "T8s", correct: true }
          ]
        }
      }),
      LQ("r07-08", "BTN", ["Qh","Js"], ["8d","8c","4h","2s","Kd"], 70708, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8d 8c 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Call flop + raise turn en paired: full de ochos. AKo no raisea turn; JJ pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","8s"],
          teachBack: "88 full: call flop lento y raise turn. AKo y JJ no construyen esa línea.",
          options: [
            { id: "a", cards: ["Ac","Kh"], label: "AKo", correct: false,
              eliminated: "Call flop posible con backdoors, pero raise turn en 884 sin equity: suele fold o call light. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair al 4: a menudo betea o flats turn; raise turn polar tras call flop encaja peor que el set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["8h","8s"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r07-09", "BB", ["Kh","Qd"], ["As","9s","2s","7c","3d"], 70709, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 9s 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel en monotone de picas: color hecho (JsTs). KK sin picas pot-controla; AQo sin flush no barrela tres calles por value de color.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Ts"],
          teachBack: "JsTs color: triple barrel. KK sin flush y AQo sin picas no.",
          options: [
            { id: "a", cards: ["Kc","Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin picas: en flop monotone suele pot-controlar turn, no triple barrel como si tuviera el color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Open + c-bet con as posible, pero sin color en monotone: tras call flop no mete tres calles de value de flush. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Js","Ts"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r07-10", "BTN", ["Th","8h"], ["Qc","7d","2s","5c","Kh"], 70710, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 7d 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kh — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river al K: Kx. AA betearía distinto; J9s sin K/Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Js"],
          teachBack: "KJo float value al K. AA y J9s no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En Q-high casi siempre betea antes: float + bet river al K es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Jh","9d"], label: "J9o", correct: false,
              eliminated: "Call flop posible, pero sin K/Q fuerte: no apuesta river por value. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kd","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r07-11", "BTN", ["Kd","Qs"], ["8h","7c","6d","2s","Ah"], 70711, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8h 7c 6d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2s — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ah — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 876: escalera T9s o 54s. AKo sin conexión no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s escalera: raise flop. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 876 sin straight/draw fuerte: call/fold, no raise polar de escalera. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats o raisea sizing distinto — raise flop de straight es más de T9s." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r07-12", "BTN", ["Qh","Qs"], ["Jd","Tc","3h","2s","8d"], 70712, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd Tc 3h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2s — BB bet 66% pot → BTN call" },
          { street: "River", text: "8d — BB bet 66% pot" }
        ],
        teachBack: "Raise flop JT3: dos pares JT. AKo y 88 no raisean ese flop por value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Th"],
          teachBack: "JTs dos pares: raise flop. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ac","Kd"], label: "AKo", correct: false,
              eliminated: "Call BB frecuente, pero en JT3 sin pareja/draw fuerte: call o fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair defendible en call: rara vez raisea flop sin set ni draw claro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Jh","Th"], label: "JTs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-08"] = [
      LQ("r08-01", "BTN", ["Th","9h"], ["8c","3d","3s","Ah","7c"], 70801, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8c 3d 3s — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "Ah — BB bet 66% pot → BTN call" },
          { street: "River", text: "7c — BB bet 66% pot" }
        ],
        teachBack: "Donk en 833: full de treses. AKo y JTs no donkean ese flop.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["3h","3c"],
          teachBack: "33 full: donk value. AKo y JTs check-callearian.",
          options: [
            { id: "a", cards: ["As","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero en 833 sin 3/8: check-call, no donk flop por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["3h","3c"], label: "33", correct: true },
            { id: "c", cards: ["Jd","Td"], label: "JTs", correct: false,
              eliminated: "Call BB OK; sin trío en flop 833 suele checkear, no liderar y meter tres calles. El raise 3× exige equity fuerte; este combo no justifica ese sizing." }
          ]
        }
      }),
      LQ("r08-02", "BTN", ["Kd","9d"], ["Th","8h","4h","Ac","2s"], 70802, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Th 8h 4h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Ac — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop hearts: color QhJh. AJs rainbow no raisea; 77 sin heart tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs color: raise flop. AJs y 77 sin heart no.",
          options: [
            { id: "a", cards: ["As","Jc"], label: "AJo", correct: false,
              eliminated: "Call BB; en T84 hearts sin heart: call/fold, no raise polar de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["7c","7d"], label: "77", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r08-03", "BB", ["8h","8c"], ["Kc","6s","3d","2h","Qd"], 70803, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kc 6s 3d — check-check" },
          { street: "Turn", text: "2h — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Qd — BB check → CO bet 66% pot" }
        ],
        teachBack: "Delayed barrel K-high: Kx. AA betearía flop; AJo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Js"],
          teachBack: "KJo delayed. AA no checkea; AJo sin rey no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En K-high seco casi siempre c-betea flop: el check-check elimina el premium. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["As","Jd"], label: "AJo", correct: false,
              eliminated: "Open CO OK; sin K, tras check-check flop el delayed barrel turn+river es farol poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kd","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r08-04", "CO", ["Ah","Jd"], ["Tc","6s","3h","2d","Kd"], 70804, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 6s 3h — BB check → CO c-bet 33% pot → BB raise 3× → CO call" },
          { street: "Turn", text: "2d — BB bet 66% pot → CO call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Raise flop T63 + barrels: set de dieces. QQ flats distinto; AKo no raisea sin T.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","Td"],
          teachBack: "TT set: raise flop limpio. QQ a menudo flats; AKo no raisea T63.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet rival a menudo flats o raisea turn — raise flop + barrels es más típico de set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero en T63 sin pareja: call/fold, no raise polar de flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Th","Td"], label: "TT", correct: true }
          ]
        }
      }),
      LQ("r08-05", "BB", ["Td","Th"], ["Ah","9c","4d","2s","7h"], 70805, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 9c 4d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "7h — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river: Ax thin. KK suele betear turn; QJo sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","Js"],
          teachBack: "AJo thin river. KK betearía turn; QJo sin as no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Open + c-bet OK, pero en A-high suele betear turn también: check-turn + bet-river encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Puede abrir CO y c-bet aire, pero sin as: tras check turn el river bet no es value creíble. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ad","Js"], label: "AJo", correct: true }
          ]
        }
      }),
      LQ("r08-06", "BB", ["Qc","Jd"], ["Th","9s","2c","8d","Kd"], 70806, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Th 9s 2c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "8d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → CO bet 66% pot" }
        ],
        teachBack: "Barrel cuando llega 8: escalera J7 o QJ. KK suele betear distinto; 66 no cobra river de straight.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","7h"],
          teachBack: "J7s escalera al 8. KK y 66 no.",
          options: [
            { id: "a", cards: ["Ks","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet a menudo pot-controla o raisea el turn 8 — barrel lineal de escalera encaja peor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["6h","6c"], label: "66", correct: false,
              eliminated: "Underpair: no apuesta river por value de escalera en esa línea. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Jh","7h"], label: "J7s", correct: true }
          ]
        }
      }),
      LQ("r08-07", "BB", ["9h","9c"], ["Qd","Jc","2h","5s","Qc"], 70807, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jc 2h — check-check" },
          { street: "Turn", text: "5s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Qc — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Delayed barrel + Q river: dos pares QJ. AA betearía flop; T8s no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jh"],
          teachBack: "QJs dos pares al river Q. AA no checkea flop; T8s no.",
          options: [
            { id: "a", cards: ["Ac","Ah"], label: "AA", correct: false,
              eliminated: "Premium: en Q-high casi siempre c-betea flop. El check-check la saca. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qs","Jh"], label: "QJs", correct: true },
            { id: "c", cards: ["Td","8d"], label: "T8s", correct: false,
              eliminated: "Open OK; sin Q/J fuerte, delayed barrel turn+river tras check-check no es value limpio. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." }
          ]
        }
      }),
      LQ("r08-08", "BTN", ["Ad","5d"], ["Ts","Th","5c","Kd","2h"], 70808, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ts Th 5c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Call flop + raise turn K: full 55. AKo aire no raisea turn; JJ raisearía antes.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h","5s"],
          teachBack: "55 full: raise turn. AKo y JJ no construyen esa línea.",
          options: [
            { id: "a", cards: ["Ac","Kh"], label: "AKo", correct: false,
              eliminated: "Float flop posible, pero raise turn al K sin 5/T: farol raro — suele call o fold. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jc","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: a menudo raisea flop o betea turn; call flop + raise turn K es más de full lento. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["5h","5s"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r08-09", "BB", ["Ad","7c"], ["Ts","8s","4s","Qc","2d"], 70809, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ts 8s 4s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Qc — check-check" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river: color AsXs. KK sin spade betearía turn; QJo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","5s"],
          teachBack: "A5s color thin river. KK y QJo sin spade no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: tras c-bet suele seguir en turn. Check-turn + bet-river de flush encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qh","Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin flush: tras check turn el river bet no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["As","5s"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r08-10", "BB", ["Kh","Td"], ["8s","7c","2d","Ah","3c"], 70810, {
        villainPos: "HJ", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "8s 7c 2d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ah — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "3c — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Triple barrel board bajo → A: Ax o overpair. 55 pot-controla; QJo aire para en turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","Qc"],
          teachBack: "AQo value. 55 y QJo no.",
          options: [
            { id: "a", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Open + c-bet flop posible, pero underpair: pot-control turn — no triple barrel value." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Open late y c-bet aire OK, pero barrel turn A y river es farol largo: suele checkear turn. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r08-11", "BB", ["Qh","Ts"], ["Jc","Td","9s","2c","4d"], 70811, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Jc Td 9s — check-check" },
          { street: "Turn", text: "2c — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "4d — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Check flop + delayed en JT9: escalera KQ o 87. AA betearía flop; A9o sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qc"],
          teachBack: "KQo escalera tras slowplay. AA no checkea; A9o no barrela.",
          options: [
            { id: "a", cards: ["As","Ad"], label: "AA", correct: false,
              eliminated: "Premium: en JT9 casi siempre c-betea flop. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","9d"], label: "A9o", correct: false,
              eliminated: "Open OK; sin escalera, delayed barrel turn+river no es value de straight. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kh","Qc"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r08-12", "BTN", ["Ad","Kd"], ["8h","6h","2h","Qc","5s"], 70812, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8h 6h 2h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Qc — BB bet 66% pot → BTN call" },
          { street: "River", text: "5s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop monotone corazones: color AhXh o 9h7h. AKo rainbow no raisea; 99 sin heart tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","7h"],
          teachBack: "97s color: raise flop. AKo y 99 sin heart no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB OK; en 862 hearts sin heart: call/fold al c-bet, no raise polar de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Overpair sin flush: flats o folds — no raisea flop monotone sin el color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["9h","7h"], label: "97s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-09"] = [
      LQ("r09-01", "BB", ["Ad","2d"], ["9h","6c","6d","9s","Kc"], 70901, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 6c 6d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "Kc — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn double paired + bet river: full de nueves. QQ suele betear turn; JTo no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9c","9d"],
          teachBack: "99 full boat: línea lenta. QQ betea turn; JTo no cobra river.",
          options: [
            { id: "a", cards: ["Qh","Qs"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn aunque parea. Check-turn + bet-river encaja peor que el boat. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin 9/6: tras check turn el river bet no es value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["9c","9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r09-02", "BTN", ["Qh","Js"], ["Ac","7c","3c","9d","2h"], 70902, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ac 7c 3c — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "9d — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Donk en monotone clubs: color KcXc. AKo sin club no donkea; JTs sin club tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","Tc"],
          teachBack: "KTo color: donk value. AKo y JTs sin club no.",
          options: [
            { id: "a", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en A73 clubs sin club: check-call, no donk flop por value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Kc","Tc"], label: "KTo", correct: true },
            { id: "c", cards: ["Jd","Td"], label: "JTo", correct: false,
              eliminated: "En flop: Call BB OK; sin club en monotone suele checkear, no liderar tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r09-03", "BTN", ["Kd","Jh"], ["Qs","7c","2d","5h","9c"], 70903, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs 7c 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river Q-high: Qx value. AA betearía distinto; JTs sin Q no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Td"],
          teachBack: "QTo float value. AA y JTs no.",
          options: [
            { id: "a", cards: ["Ac","Ah"], label: "AA", correct: false,
              eliminated: "En Q-high casi siempre c-betea o raisea antes: float pasivo + bet river es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Js","Ts"], label: "JTs", correct: false,
              eliminated: "Call flop posible, pero sin Q: no apuesta river por value tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r09-04", "BTN", ["Ah","Qd"], ["Jc","7d","2s","9h","3c"], 70904, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc 7d 2s — BB check → BTN c-bet 33% pot → BB check-raise 3× → BTN call" },
          { street: "Turn", text: "9h — BB bet 66% pot → BTN call" },
          { street: "River", text: "3c — BB bet 66% pot" }
        ],
        teachBack: "Check-raise flop + barrels: set de jotas. AKo y TT defienden BB pero no raisean J72 por value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Js"],
          teachBack: "JJ (set) explica el check-raise. AKo sin pareja no raisea; TT underpair tampoco.",
          options: [
            { id: "a", cards: ["As","Kh"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero sin pareja/draw en J72: call o fold, no check-raise por value en flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair jugable en call: no check-raisea flop polar sin set ni equity clara. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Jh","Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r09-05", "BTN", ["Kh","Td"], ["Qs","6c","3d","2h","9c"], 70905, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs 6c 3d — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "2h — BB bet 66% pot → BTN call" },
          { street: "River", text: "9c — BB bet 66% pot" }
        ],
        teachBack: "Check-raise Q63: set de damas. AJs sin Q no raisea; 77 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Qd"],
          teachBack: "QQ set: check-raise value. AJs y 77 no polarizan ese flop.",
          options: [
            { id: "a", cards: ["As","Js"], label: "AJs", correct: false,
              eliminated: "Defiende BB, pero sin Q/6 en Q63: call o fold, no check-raise por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: call posible, raise flop polar sin set ni draw claro es raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qh","Qd"], label: "QQ", correct: true }
          ]
        }
      }),
      LQ("r09-06", "BTN", ["Ah","9h"], ["Qd","Jc","Td","4s","2h"], 70906, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jc Td — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "4s — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Donk en QJT: escalera K9 o AKs. AQo sin straight no donkea; 99 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9c"],
          teachBack: "K9o escalera. AQo y 99 no donkean QJT por straight.",
          options: [
            { id: "a", cards: ["As","Qc"], label: "AQo", correct: false,
              eliminated: "Defiende BB; en QJT sin K/9 straight: check-call, no donk flop por value de escalera. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Kh","9c"], label: "K9o", correct: true },
            { id: "c", cards: ["9s","9d"], label: "99", correct: false,
              eliminated: "Underpair: no lidera QJT con donk de escalera. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r09-07", "BTN", ["Qc","Jd"], ["Kh","Qd","Jc","4s","9h"], 70907, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh Qd Jc — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "4s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9h — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river en KQJ: dos pares QJ. AA betearía distinto; T9s sin dos pares no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jh"],
          teachBack: "QJs dos pares: float y river. AA y T9s no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En KQJ connected casi siempre betea o raisea antes: float pasivo + bet river es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ts","9s"], label: "T9s", correct: false,
              eliminated: "Call flop con gutshot posible, pero sin dos pares en river: no apuesta river por value tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qs","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r09-08", "BB", ["Qd","9c"], ["6s","6h","Tc","Ad","3c"], 70908, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "6s 6h Tc — check-check" },
          { street: "Turn", text: "Ad — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop paired + delayed: full de seises. KK betearía flop; QJs sin 6 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6d","6c"],
          teachBack: "66 full tras slowplay. KK no checkea; QJs no barrela Ad+river.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "En board paired medio casi siempre c-betea flop. Check-check lo saca. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qs","Jh"], label: "QJs", correct: false,
              eliminated: "Open late OK; sin 6, tras check-check el barrel turn as + river no es value creíble. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["6d","6c"], label: "66", correct: true }
          ]
        }
      }),
      LQ("r09-09", "CO", ["Kh","9s"], ["Qd","Jd","8d","2h","4c"], 70909, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jd 8d — BB check → CO c-bet 33% pot → BB raise 3× → CO call" },
          { street: "Turn", text: "2h — BB bet 66% pot → CO call" },
          { street: "River", text: "4c — BB bet 66% pot" }
        ],
        teachBack: "Raise flop diamonds connected: color Td9d o AdXd. AKo sin diamond no; 99 sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","9d"],
          teachBack: "T9s color. AKo y 99 sin diamond no raisean.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en QJ8 diamonds sin diamond: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["9c","9h"], label: "99", correct: false,
              eliminated: "Underpair/overcard sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Td","9d"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r09-10", "BTN", ["Ad","8d"], ["Jh","6c","2s","9d","4h"], 70910, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 6c 2s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "9d — BB bet 66% pot → BTN call" },
          { street: "River", text: "4h — BB bet 66% pot" }
        ],
        teachBack: "Raise flop J62: set JJ o dos pares. AKo no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Jd"],
          teachBack: "JJ set value limpio. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en J62 sin pareja: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Js","Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r09-11", "CO", ["Ah","7c"], ["5d","4s","3h","Kc","9c"], 70911, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "5d 4s 3h — BB check → CO c-bet 33% pot → BB raise 3× → CO call" },
          { street: "Turn", text: "Kc — BB bet 66% pot → CO call" },
          { street: "River", text: "9c — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 543: escalera 62 o A2. KK flats distinto; QJo sin straight no raisea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","2h"],
          teachBack: "62s escalera. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: flats o raisea distinto — raise flop de wheel/straight es más de 62s. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Call BB; en 543 sin straight: no raisea flop por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["6h","2h"], label: "62s", correct: true }
          ]
        }
      }),
      LQ("r09-12", "BTN", ["Jh","Th"], ["9c","6c","3c","Ad","2s"], 70912, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 6c 3c — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "Ad — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Check-raise clubs: color KcXc. AQo sin club no; 88 sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","7c"],
          teachBack: "K7s color: check-raise. AQo y 88 sin club no.",
          options: [
            { id: "a", cards: ["Ah","Qd"], label: "AQo", correct: false,
              eliminated: "Call BB; en 963 clubs sin club: call/fold, no check-raise de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kc","7c"], label: "K7s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-10"] = [
      LQ("r10-01", "BB", ["Jh","Td"], ["Qc","Js","4d","4h","2s"], 71001, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Qc Js 4d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "4h — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "2s — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Barrel tras 4 paired: QJ dos pares. 99 pot-controla; ATo sin Q/J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","Jc"],
          teachBack: "QJo dos pares → full de cuatros. 99 y ATo no barrela tres calles igual.",
          options: [
            { id: "a", cards: ["9s","9c"], label: "99", correct: false,
              eliminated: "Open + c-bet posible; underpair cuando parea el 4: pot-control, no triple barrel. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Ah","Ts"], label: "ATo", correct: false,
              eliminated: "Puede c-bet flop, pero sin Q/J: tras board paired no mete tres calles por valor. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qd","Jc"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r10-02", "BB", ["As","Qs"], ["7c","5c","3c","Kd","9h"], 71002, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7c 5c 3c — check-check" },
          { street: "Turn", text: "Kd — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9h — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop monotone + delayed: color lento AcXc. AA betearía flop; JTo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","8c"],
          teachBack: "A8o color tras slowplay. AA no checkea; JTo sin club no barrela.",
          options: [
            { id: "a", cards: ["Ah","Ad"], label: "AA", correct: false,
              eliminated: "Premium: en flop monotone casi siempre c-betea. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Open late OK; sin club, delayed barrel turn+river no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ac","8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r10-03", "BTN", ["9s","9c"], ["Kd","Tc","4h","2s","7c"], 71003, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd Tc 4h — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "2s — BB bet 66% pot → BTN call" },
          { street: "River", text: "7c — BB bet 66% pot" }
        ],
        teachBack: "Donk K-high: Kx value. AQo sin K no donkea; JTs tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Js"],
          teachBack: "KJo donk value. AQo y JTs no.",
          options: [
            { id: "a", cards: ["Ah","Qd"], label: "AQo", correct: false,
              eliminated: "Defiende BB; en KT4 sin K: check-call, no donk flop por value. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Kh","Js"], label: "KJo", correct: true },
            { id: "c", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Call BB OK; sin K suele checkear, no donkear tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r10-04", "BTN", ["Kd","Qs"], ["9h","8c","2d","Ad","4c"], 71004, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "Ad — BB bet 66% pot → BTN call" },
          { street: "River", text: "4c — BB bet 66% pot" }
        ],
        teachBack: "Donk flop + presión: set de nueves. KQo y ATs check-callearian; no lideran 982.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9s","9d"],
          teachBack: "99 (set) cuadra el donk. KQo y ATs no donkean ese flop por value.",
          options: [
            { id: "a", cards: ["Kh","Qc"], label: "KQo", correct: false,
              eliminated: "Defiende BB, pero sin 9/8 en 982: check-call, no donk flop por value. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["9s","9d"], label: "99", correct: true },
            { id: "c", cards: ["Ac","Ts"], label: "ATs", correct: false,
              eliminated: "Call BB estándar; en 982 sin pareja suele checkear flop, no donkear tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r10-05", "BTN", ["Kd","Jd"], ["Th","8c","7s","6d","2h"], 71005, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Th 8c 7s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river cuando llega 6: escalera 9x. QQ raisearía antes; AJo sin straight no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","5h"],
          teachBack: "95s escalera al 6. QQ y AJo no.",
          options: [
            { id: "a", cards: ["Qs","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float pasivo + bet river de escalera es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Js"], label: "AJo", correct: false,
              eliminated: "Call flop posible, pero sin escalera en river: no apuesta river por value de straight. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9h","5h"], label: "95s", correct: true }
          ]
        }
      }),
      LQ("r10-06", "BTN", ["9d","8d"], ["Kh","9c","8s","2h","Ad"], 71006, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 9c 8s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2h — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ad — BB bet 66% pot" }
        ],
        teachBack: "Raise flop K98: dos pares 98. AJo sin conexión no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","8c"],
          teachBack: "98s dos pares: raise flop. AJo y TT no.",
          options: [
            { id: "a", cards: ["As","Jh"], label: "AJo", correct: false,
              eliminated: "Defiende BB; en K98 sin 9/8: call/fold, no raise polar de flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair al K: flats o folds — no raisea flop sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["9h","8c"], label: "98s", correct: true }
          ]
        }
      }),
      LQ("r10-07", "BB", ["Kc","7c"], ["Ah","Kd","6s","6h","2c"], 71007, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah Kd 6s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6h — check-check" },
          { street: "River", text: "2c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet flop + check turn paired + bet river: Ax full. QQ suele betear turn; QJo sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","9s"],
          teachBack: "A9s full de seises, river thin. QQ betearía turn; QJo sin as no.",
          options: [
            { id: "a", cards: ["Qh","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet flop suele seguir en turn aunque parea. Check-turn + bet-river encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Puede abrir y c-bet aire, pero sin as: tras check turn el river bet no es value creíble. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["As","9s"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r10-08", "BB", ["Jc","Td"], ["9d","6d","2d","Kh","3c"], 71008, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "9d 6d 2d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kh — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "3c — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Triple barrel diamonds: color AdXd. QQ sin diamond no; KQo sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","8d"],
          teachBack: "A8s color. QQ y KQo sin diamond no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: pot-control turn en monotone, no triple barrel de flush." },
            { id: "b", cards: ["Kc","Qc"], label: "KQo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no mete tres calles por value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ad","8d"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r10-09", "BB", ["9h","9c"], ["As","7d","2c","Kh","3s"], 71009, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 7d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel A-high: Ax value claro. TT pot-controla turn; QJs sin as abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","Qc"],
          teachBack: "AQo value limpio. TT y QJs no triple-barrela por valor.",
          options: [
            { id: "a", cards: ["Ts","Th"], label: "TT", correct: false,
              eliminated: "Abre BTN y puede c-bet flop, pero en A-high seco suele pot-controlar turn: no triple-barrela por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Qh","Js"], label: "QJs", correct: false,
              eliminated: "Open OK y c-bet posible, pero sin as ni pareja fuerte: en turn K suele dejar de meter presión. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r10-10", "BTN", ["As","Js"], ["9c","8d","7h","3s","Kd"], 71010, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 8d 7h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "3s — BB bet 66% pot → BTN call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 987: escalera T6 o JTs. AKo no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","6h"],
          teachBack: "T6s escalera. AKo y TT no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 987 sin straight: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Overpair/under: flats — no raisea flop de escalera sin T6/JT. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Th","6h"], label: "T6s", correct: true }
          ]
        }
      }),
      LQ("r10-11", "BTN", ["Kd","Jh"], ["As","Kh","7c","4h","2d"], 71011, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Kh 7c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "4h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB overbet 125% pot" }
        ],
        teachBack: "Float dos calles + bet grande river: dos pares A7. QQ raisearía antes; QJs no mete river grande.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","7s"],
          teachBack: "A7s dos pares: float y presión river. QQ raisea antes; QJs no.",
          options: [
            { id: "a", cards: ["Qc","Qd"], label: "QQ", correct: false,
              eliminated: "Defiende y puede call flop, pero con overpair suele raisear flop/turn: float pasivo + bet grande river es raro. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Qs","Js"], label: "QJs", correct: false,
              eliminated: "Call BB OK; float flop posible, pero en AsKh7 sin showdown fuerte no mete bet grande de river. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Ah","7s"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r10-12", "BB", ["Ah","Kd"], ["Jc","Ts","9d","2h","3c"], 71012, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc Ts 9d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel en JT9: escalera Q8s o KQ. AA pot-controla distinto; 88 underpair no barrela tres calles.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","8s"],
          teachBack: "Q8s escalera. AA y 88 no construyen triple barrel de straight.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "Overpair en board conectado: a menudo pot-controla turn o raisea — triple barrel lineal de escalera no es su historia. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: pot-control o fold en JT9, no triple barrel value de escalera. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","8s"], label: "Q8s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-11"] = [
      LQ("r11-01", "BB", ["Jc","Ts"], ["4h","4d","9s","Kc","2c"], 71101, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "4h 4d 9s — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kc — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Triple barrel en paired bajo: full de cuatros. 66 pot-controla; ATo sin 4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["4s","4c"],
          teachBack: "44 full: triple barrel limpio. 66 y ATo no.",
          options: [
            { id: "a", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Open + c-bet flop posible, pero underpair en paired board: pot-control turn, no triple barrel." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Open HJ y c-bet aire OK, pero barrel turn K y river sin 4: no es value de tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["4s","4c"], label: "44", correct: true }
          ]
        }
      }),
      LQ("r11-02", "BB", ["Ah","8d"], ["Qs","Js","5s","2c","9d"], 71102, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs Js 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel en two-tone spades: color AsXs o KsTs. KK sin spade pot-controla; AQo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Ts"],
          teachBack: "KTs color. KK y AQo sin spade no barrela tres calles de flush.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: en flop two-tone suele pot-controlar turn, no triple barrel de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ac","Qh"], label: "AQo", correct: false,
              eliminated: "Open + c-bet OK, pero sin flush: barrel turn+river no es value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ks","Ts"], label: "KTs", correct: true }
          ]
        }
      }),
      LQ("r11-03", "BB", ["Jc","9d"], ["Qd","7h","2s","5c","Kd"], 71103, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd 7h 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel Q-high → K river: Kx o Qx. 99 pot-controla; T8s sin Q/K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Ts"],
          teachBack: "KTo value al K. 99 y T8s no.",
          options: [
            { id: "a", cards: ["9h","9s"], label: "99", correct: false,
              eliminated: "Open + c-bet posible, pero underpair: pot-control turn, no triple barrel cuando llega K." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin Q/K: no barrela tres calles por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kh","Ts"], label: "KTo", correct: true }
          ]
        }
      }),
      LQ("r11-04", "BTN", ["As","8s"], ["Kd","Jh","5c","3h","2d"], 71104, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd Jh 5c — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "3h — BB bet 66% pot → BTN call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "Raise flop KJ5: set de jotas. AQo sin pareja no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Jc"],
          teachBack: "JJ set: raise flop. AQo y TT no construyen raise + barrels.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB frecuente; en KJ5 sin pareja/draw fuerte: call o fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","Td"], label: "TT", correct: false,
              eliminated: "Underpair defendible en call: rara vez raisea flop sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Js","Jc"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r11-05", "BTN", ["Qc","9c"], ["Jh","Td","8s","2d","Ad"], 71105, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Td 8s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ad — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river: escalera Q9 o KQ. AA betearía distinto; 77 sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","9d"],
          teachBack: "Q9o escalera. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "En JT8 connected casi siempre betea/raisea antes: float + bet river de escalera es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river por value de escalera tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","9d"], label: "Q9o", correct: true }
          ]
        }
      }),
      LQ("r11-06", "BTN", ["8h","7h"], ["As","8c","7d","3s","2c"], 71106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 8c 7d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "3s — BB bet 66% pot → BTN call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Raise flop A87: dos pares 87. KK flats distinto; QJo sin 8/7 no raisea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8s","7c"],
          teachBack: "87s dos pares: raise flop. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair al A: flats o raisea sizing distinto — raise flop + barrels es más típico de dos pares." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Call BB OK; en A87 sin 8/7: no raisea flop por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["8s","7c"], label: "87s", correct: true }
          ]
        }
      }),
      LQ("r11-07", "BTN", ["Ad","Td"], ["5h","5c","Kd","Qs","2h"], 71107, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "5h 5c Kd — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Qs — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 55K: full de cincos. AQo sin 5 no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5s","5d"],
          teachBack: "55 full: raise flop. AQo y TT no polarizan así.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB OK; en 55K sin 5: call/fold al c-bet, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Underpair al K: flats o folds; raise flop sin full es raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["5s","5d"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r11-08", "BTN", ["Tc","9c"], ["Ah","6h","2h","5s","Kd"], 71108, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 6h 2h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river hearts: color KhXh. QQ sin heart raisearía antes; JTs sin flush no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","8h"],
          teachBack: "K8s color: float y river. QQ y JTs sin heart no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair sin heart: a menudo raisea flop o pot-controla — float pasivo + bet river de flush es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Js","Ts"], label: "JTs", correct: false,
              eliminated: "Call flop con backdoors posible, pero sin flush en river: no apuesta river por value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kh","8h"], label: "K8s", correct: true }
          ]
        }
      }),
      LQ("r11-09", "BB", ["Ah","Qd"], ["Kd","8c","3h","2s","7d"], 71109, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 8c 3h — check-check" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "7d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Delayed barrel K-high: Kx value. AA betearía flop; QJo sin K no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","Jh"],
          teachBack: "KJo delayed value. AA no checkea; QJo sin rey no.",
          options: [
            { id: "a", cards: ["As","Ad"], label: "AA", correct: false,
              eliminated: "Abre y en K-high seco casi siempre c-betea flop: el check-check la elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qc","Jd"], label: "QJo", correct: false,
              eliminated: "Open late OK, pero sin K: delayed barrel turn+river es raro. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kc","Jh"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r11-10", "BTN", ["As","8s"], ["Qc","Jd","Th","4h","2c"], 71110, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Jd Th — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "4h — BB bet 66% pot → BTN call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Check-raise QJT: escalera K9 o AK. A9o sin straight no; 88 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9h"],
          teachBack: "K9s escalera: check-raise. A9o y 88 no.",
          options: [
            { id: "a", cards: ["Ah","9d"], label: "A9o", correct: false,
              eliminated: "Call BB; en QJT sin K/9 straight: call/fold, no check-raise de escalera. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop QJT por value de straight. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kh","9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r11-11", "BB", ["Ah","Kd"], ["Ts","9c","2d","Th","3s"], 71111, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ts 9c 2d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Th — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "3s — BB check → CO bet 66% pot" }
        ],
        teachBack: "Barrel tras T paired: dos pares T9. KK suele betear distinto; 88 underpair no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","9h"],
          teachBack: "T9s dos pares: triple barrel. KK y 88 no encajan igual.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet a menudo raisea o pot-controla distinto — call flop + bet turn paired + river es más de dos pares. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn cuando el board parea el T, no triple barrel value." },
            { id: "c", cards: ["Td","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r11-12", "BB", ["Kd","Td"], ["9h","8c","2s","7d","Ac"], 71112, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 8c 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7d — check-check" },
          { street: "River", text: "Ac — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn 7 + bet river: escalera JT o 65. QQ betearía turn; ATo sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Ts"],
          teachBack: "JTs escalera al 7. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn 7. Check-turn + bet-river de escalera encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Tc"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin escalera: tras check turn el river bet no es value de straight. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Jh","Ts"], label: "JTs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-12"] = [
      LQ("r12-01", "BTN", ["Qd","Jd"], ["7s","5s","2h","Ac","9c"], 71201, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7s 5s 2h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Ac — BB bet 66% pot → BTN call" },
          { street: "River", text: "9c — BB bet 66% pot" }
        ],
        teachBack: "Raise flop spades con AsXs/KsTs semi-bluff que falla. AQo sin spade no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Ts"],
          teachBack: "KTs semi-bluff → farol. AQo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en 752 spades sin spade: call/fold, no raise de flush draw. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set/flush draw. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ks","Ts"], label: "KTs", correct: true }
          ]
        }
      }),
      LQ("r12-02", "BB", ["Jh","Tc"], ["9d","8d","2d","Kc","4h"], 71202, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "9d 8d 2d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kc — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "4h — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Barrel diamonds: AdXd nuts. QQ sin diamond no; ATo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","5d"],
          teachBack: "A5s nut flush. QQ y ATo sin diamond no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: pot-control, no triple barrel de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no barrela tres calles de flush. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ad","5d"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r12-03", "BB", ["Jd","9d"], ["As","8c","3h","2d","7s"], 71203, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 8c 3h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "7s — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Triple barrel grande A-high: polar Ax value o aire. QQ pot-controla; 55 no mete overbet — aquí AKo value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Kc"],
          teachBack: "AKo polar value. QQ y 55 no overbetean river así.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele pot-controlar o sizing medio — overbet river polar encaja peor que Ax." },
            { id: "b", cards: ["5h","5c"], label: "55", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river polar." },
            { id: "c", cards: ["Ah","Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r12-04", "BTN", ["Kh","Td"], ["Qd","Jc","4s","2h","9c"], 71204, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jc 4s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet river: polar dos pares/straight o aire. AA raisearía antes; 88 sin equity no — aquí QJs dos pares.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jh"],
          teachBack: "QJs polar value. AA y 88 no.",
          options: [
            { id: "a", cards: ["Ac","Ah"], label: "AA", correct: false,
              eliminated: "En QJ4 casi siempre betea/raisea antes: float + overbet river es raro para AA." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea river tras float sin equity." },
            { id: "c", cards: ["Qs","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r12-05", "BTN", ["As","Ts"], ["8c","7h","4d","Kd","2s"], 71205, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8c 7h 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Float OESD 65/9T que falla: farol river. QQ raisearía antes; 99 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","6h"],
          teachBack: "96s OESD float → farol. QQ y 99 no.",
          options: [
            { id: "a", cards: ["Qc","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + bet river sin straight es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9h","6h"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r12-06", "BB", ["Qh","9c"], ["Kd","Jd","4d","2s","8h"], 71206, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd Jd 4d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "8h — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet: AdXd nut flush thin. QQ sin diamond no; T9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","Td"],
          teachBack: "ATo nut flush. QQ y T9s sin diamond no.",
          options: [
            { id: "a", cards: ["Qs","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: tras c-bet suele seguir o checkear river — check-turn + bet flush encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Th","9h"], label: "T9s", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: tras check turn el river bet no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ad","Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r12-07", "BB", ["Td","8d"], ["Kh","9c","3s","2h","7d"], 71207, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 9c 3s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "7d — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Triple barrel K-high grande: polar Kx o farol. 88 pot-controla; AJo sin K no — aquí KQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Qs"],
          teachBack: "KQo polar value. 88 y AJo no.",
          options: [
            { id: "a", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river polar." },
            { id: "b", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin K: no barrela tres calles polar por value. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Kd","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r12-08", "BTN", ["Kc","Qc"], ["Jh","9h","3d","5s","2c"], 71208, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 9h 3d — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "5s — BB bet 66% pot → BTN call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Donk con flush draw Th8h que falla: farol. AKo sin draw no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","8h"],
          teachBack: "T8s semi-bluff donk → farol. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en J93 hearts sin heart: check-call, no donk de semi-bluff. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: true },
            { id: "c", cards: ["Td","Ts"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea J93 two-tone y mete tres calles sin completar. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r12-09", "BTN", ["Qc","Jd"], ["Ah","8h","3d","2s","Kc"], 71209, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 8h 3d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kc — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river sin completar hearts: farol con draw fallido Th9h. KK raisearía antes; 77 sin draw no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s flush draw fallido: farol river. KK y 77 no.",
          options: [
            { id: "a", cards: ["Kd","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float pasivo + bet river sin heart no es su línea. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7c","7d"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float cuando el color falla. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r12-10", "BTN", ["As","9s"], ["Th","8d","7c","2s","Kc"], 71210, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Th 8d 7c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kc — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river sin escalera: farol J9s OESD fallido. AA betearía distinto; 66 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","9h"],
          teachBack: "J9s OESD fallido. AA y 66 no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En T87 connected casi siempre betea/raisea antes: float + bet river sin straight es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Jh","9h"], label: "J9s", correct: true }
          ]
        }
      }),
      LQ("r12-11", "BTN", ["As","Js"], ["Tc","9d","5h","2s","Kd"], 71211, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 9d 5h — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "2s — BB bet 66% pot → BTN call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Check-raise T95 con OESD QJ/87 fallido: farol. AKo sin draw no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJo OESD fallido tras check-raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en T95 sin OESD: call/fold, no check-raise de draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set/OESD. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qh","Jh"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r12-12", "BB", ["As","9c"], ["Jh","6h","4d","Tc","2s"], 71212, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 6h 4d — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Tc — check-check" },
          { street: "River", text: "2s — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river sin heart: farol AhXh fallido. QQ betearía turn; T9s sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","8h"],
          teachBack: "A8s draw fallido. QQ y T9s no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Th","9d"], label: "T9o", correct: false,
              eliminated: "Puede c-bet aire, pero sin heart: tras check turn el river farol es poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","8h"], label: "A8s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-13"] = [
      LQ("r13-01", "BTN", ["Ah","Th"], ["8s","6s","3d","Qc","2h"], 71301, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 6s 3d — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "Qc — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Donk two-tone + presión sin spade: farol con draw fallido KsTs… o value set. Aquí KsJs draw fallido. AKo sin draw no donkea; 99 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Js"],
          teachBack: "KJs flush draw fallido vía donk. AKo y 99 no.",
          options: [
            { id: "a", cards: ["Ac","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 863 spades sin spade: check-call, no donk flop de semi-bluff. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ks","Js"], label: "KJs", correct: true },
            { id: "c", cards: ["9h","9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no donkea 863 two-tone y mete tres calles sin color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." }
          ]
        }
      }),
      LQ("r13-02", "BTN", ["Ad","Td"], ["8c","7c","3h","Kd","2s"], 71302, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8c 7c 3h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Kd — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop two-tone: polar flush o set. AKo sin club no; JJ underpair tampoco — aquí 8h8d set… wait 8s8d.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8s","8d"],
          teachBack: "88 set polar. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 873 clubs sin club/set: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop polar sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["8s","8d"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r13-03", "BTN", ["Qd","Jd"], ["9s","8c","2h","5d","Kc"], 71303, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 8c 2h — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "5d — BB bet 66% pot → BTN call" },
          { street: "River", text: "Kc — BB bet 66% pot" }
        ],
        teachBack: "Check-raise 982: polar set 99 o farol. ATo sin conexión no; TT underpair tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","9d"],
          teachBack: "99 set polar. ATo y TT no.",
          options: [
            { id: "a", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Call BB; en 982 sin 9/8: call/fold, no check-raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop polar sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["9h","9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r13-04", "BTN", ["Qh","Jh"], ["6s","5s","2d","Ac","9h"], 71304, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "6s 5s 2d — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "Ac — BB bet 66% pot → BTN call" },
          { street: "River", text: "9h — BB bet 66% pot" }
        ],
        teachBack: "Check-raise flush draw AsXs/KsTs que falla: farol. AKo sin spade no; 77 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Ts"],
          teachBack: "KTs semi-bluff check-raise → farol. AKo y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Call BB; en 652 spades sin spade: call/fold, no check-raise de draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no raisea flop sin set/flush draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Ks","Ts"], label: "KTs", correct: true }
          ]
        }
      }),
      LQ("r13-05", "BTN", ["Ah","9s"], ["Kd","7d","3d","2c","Ts"], 71305, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 7d 3d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2c — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ts — BB bet 66% pot" }
        ],
        teachBack: "Raise flop diamonds: QdJd color (blocker Q). AKo sin diamond no; 99 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","Jd"],
          teachBack: "QJs color. AKo y 99 sin diamond no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en K73 diamonds sin diamond: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qd","Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r13-06", "BTN", ["Ah","Qd"], ["Kc","7d","2s","9h","3c"], 71306, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kc 7d 2s — BB check → BTN c-bet 33% pot → BB check-raise 3× → BTN call" },
          { street: "Turn", text: "9h — BB bet 66% pot → BTN call" },
          { street: "River", text: "3c — BB bet 66% pot" }
        ],
        teachBack: "Check-raise + barrels: polar (set KK o farol con blocker). AJo sin pareja no raisea; TT underpair tampoco — aquí KK set.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Kd"],
          teachBack: "KK set polar. AJo y TT no raisean K72.",
          options: [
            { id: "a", cards: ["As","Jh"], label: "AJo", correct: false,
              eliminated: "Call BB; en K72 sin pareja/draw: call/fold, no check-raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop polar sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kh","Kd"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r13-07", "BTN", ["Ad","Kd"], ["8h","7c","3s","Qs","2d"], 71307, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8h 7c 3s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Qs — BB bet 66% pot → BTN call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 873 con OESD 65s fallido. AJo sin draw no; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","5h"],
          teachBack: "65s OESD fallido. AJo y TT no.",
          options: [
            { id: "a", cards: ["As","Jh"], label: "AJo", correct: false,
              eliminated: "Call BB; en 873 sin OESD: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set/OESD. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["6h","5h"], label: "65s", correct: true }
          ]
        }
      }),
      LQ("r13-08", "BB", ["Kd","Jd"], ["Tc","6c","4c","As","2h"], 71308, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 6c 4c — check-check" },
          { street: "Turn", text: "As — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2h — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Slowplay + delayed color AcXc. AA betearía flop; QJo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","8c"],
          teachBack: "A8o flush tras slowplay. AA no checkea; QJo sin club no.",
          options: [
            { id: "a", cards: ["Ah","Ad"], label: "AA", correct: false,
              eliminated: "Premium: en monotone casi siempre c-betea. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Qs","Jh"], label: "QJo", correct: false,
              eliminated: "Open OK; sin club, delayed barrel no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ac","8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r13-09", "BB", ["Qh","8h"], ["Ad","7d","2c","9s","3h"], 71309, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ad 7d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3h — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel diamonds fallidos KdXd: farol. KK pot-controla; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Td"],
          teachBack: "KTo flush draw fallido. KK y JTo no.",
          options: [
            { id: "a", cards: ["Kh","Ks"], label: "KK", correct: false,
              eliminated: "Overpair: pot-control cuando el color falla, no farolear river tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Jh","Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no barrela river blank. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kd","Td"], label: "KTo", correct: true }
          ]
        }
      }),
      LQ("r13-10", "BB", ["Kh","Td"], ["9c","8h","2s","Ad","4c"], 71310, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 8h 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ad — check-check" },
          { street: "River", text: "4c — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn A + bet river: farol T7s OESD fallido. QQ betearía turn; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","7h"],
          teachBack: "T7s draw fallido. QQ y JTo no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn A. Check-turn + bet-river farol encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: tras check turn el river farol es poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Th","7h"], label: "T7s", correct: true }
          ]
        }
      }),
      LQ("r13-11", "BTN", ["Qh","9h"], ["Kd","7d","2c","5s","Ah"], 71311, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 7d 2c — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "5s — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ah — BB bet 66% pot" }
        ],
        teachBack: "Raise flop diamonds + barrels sin completar: farol QdJd. AKo sin draw no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","Jd"],
          teachBack: "QJs flush draw fallido tras raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en K72 diamonds sin diamond: call/fold, no raise de flush draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair sin draw: no raisea flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qd","Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r13-12", "BTN", ["As","Kd"], ["9c","7c","2h","Ad","3s"], 71312, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 7c 2h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Ad — BB bet 66% pot → BTN call" },
          { street: "River", text: "3s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop two-tone + barrels sin club: semi-bluff que se queda en farol (QcJc). AQo sin draw no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc","Jc"],
          teachBack: "QJs flush draw fallido tras raise. AQo y TT no.",
          options: [
            { id: "a", cards: ["Ah","Qh"], label: "AQo", correct: false,
              eliminated: "Call BB; en 972 clubs sin club/draw: call/fold, no raise polar de flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set ni flush draw claro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qc","Jc"], label: "QJs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-14"] = [
      LQ("r14-01", "BB", ["Qc","Jd"], ["7s","6h","2c","Kd","9d"], 71401, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "7s 6h 2c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "9d — BB check → CO bet 66% pot" }
        ],
        teachBack: "Barrel 76x sin completar: farol 54s o 98s. QQ pot-controla; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h","4h"],
          teachBack: "54s OESD fallido. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando el draw falla, no farolear river tres calles. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: no barrela river blank por farol largo. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["5h","4h"], label: "54s", correct: true }
          ]
        }
      }),
      LQ("r14-02", "BTN", ["Ah","Jh"], ["9c","7c","2c","Kd","4s"], 71402, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 7c 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4s — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river clubs: color AcXc (blocker as). QQ sin club raisearía antes; JTs sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","8c"],
          teachBack: "A8o nut flush. QQ y JTs sin club no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair sin club: a menudo raisea flop — float + bet river de flush es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Jd","Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin club: no apuesta river por value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r14-03", "BB", ["Kc","7c"], ["Ts","9d","2h","5c","Qh"], 71403, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Ts 9d 2h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "5c — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "Qh — BB check → HJ overbet 125% pot" }
        ],
        teachBack: "Triple barrel → Q: polar Qx o farol. 88 pot-controla; 66 no — aquí QJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jd"],
          teachBack: "QJo polar al Q. 88 y 66 no.",
          options: [
            { id: "a", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river cuando llega Q." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair: no triple barrel polar. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Qs","Jd"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r14-04", "BB", ["Kd","Td"], ["Qs","Js","4h","8c","2d"], 71404, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs Js 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8c — check-check" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet OESD + check turn + bet river: farol T9s fallido. JJ betearía turn; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s semi-bluff → farol delayed. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Tc"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: tras check turn el river farol es poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r14-05", "BTN", ["Kd","Qd"], ["As","Ts","5s","8c","2h"], 71405, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Ts 5s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "8c — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Raise flop spades: nut flush KsXs o farol con As blocker… aquí KsJs color. AQo rainbow no; 99 sin spade no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Js"],
          teachBack: "KJs color (blocker de K). AQo y 99 sin spade no.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en AT5 spades sin spade: call/fold, no raise polar de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["9h","9d"], label: "99", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Ks","Js"], label: "KJs", correct: true }
          ]
        }
      }),
      LQ("r14-06", "BTN", ["Kh","Jh"], ["Qc","6d","2s","9h","4c"], 71406, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 6d 2s — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "9h — BB bet 66% pot → BTN call" },
          { street: "River", text: "4c — BB overbet 125% pot" }
        ],
        teachBack: "Donk + overbet: polar Qx/set. AKo sin Q no donkea; 77 tampoco — aquí QQ.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Qd"],
          teachBack: "QQ set/overpair polar vía donk. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en Q62 sin Q: check-call, no donk polar. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Qh","Qd"], label: "QQ", correct: true },
            { id: "c", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no donkea Q62 y overbetea river." }
          ]
        }
      }),
      LQ("r14-07", "BB", ["Ah","Qd"], ["Ks","9s","4c","2d","7h"], 71407, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ks 9s 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "7h — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Semi-bluff de flush que se queda en aire: JsTs. QQ pot-controla; AJo sin draw abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Ts"],
          teachBack: "JTs semi-bluff → farol river. QQ y AJo no.",
          options: [
            { id: "a", cards: ["Qc","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn cuando no mejora — no convierte semi-bluff en triple barrel farol. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ac","Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin flush draw: en river blank suele checkear. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Js","Ts"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r14-08", "BTN", ["Qc","Jc"], ["8s","5s","2s","Kh","9d"], 71408, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 5s 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9d — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river spades: AsXs nuts. KK sin spade raisearía antes; T9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATs nut flush. KK y T9s sin spade no.",
          options: [
            { id: "a", cards: ["Kd","Kc"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: a menudo raisea flop — float + bet river flush es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Th","9h"], label: "T9s", correct: false,
              eliminated: "Call flop posible, pero sin spade: no apuesta river por value de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r14-09", "BTN", ["Qh","Th"], ["6c","5d","2h","As","9s"], 71409, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "6c 5d 2h — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "As — BB bet 66% pot → BTN call" },
          { street: "River", text: "9s — BB bet 66% pot" }
        ],
        teachBack: "Donk 652 con OESD 43/87 que no llega: farol. AKo sin draw no donkea; JJ tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","7d"],
          teachBack: "87o OESD fallido vía donk. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ac","Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 652 sin draw: check-call, no donk de OESD. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","7d"], label: "87o", correct: true },
            { id: "c", cards: ["Js","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: no donkea 652 y mete tres calles sin completar escalera. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r14-10", "BB", ["Kh","9c"], ["Td","6d","2s","Ac","4h"], 71410, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Td 6d 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ac — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "4h — BB check → CO bet 66% pot" }
        ],
        teachBack: "Barrel diamonds que no llegan: farol AdXd o QdJd. QQ pot-controla; 88 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","Jd"],
          teachBack: "QJs flush draw fallido. QQ y 88 no barrela river seco.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele pot-controlar cuando el color no completa — no farolea river seco así. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair sin draw: pot-control, no triple barrel farol. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qd","Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r14-11", "BTN", ["Kd","Jd"], ["8h","7h","2c","Qs","3d"], 71411, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8h 7h 2c — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Qs — BB bet 66% pot → BTN call" },
          { street: "River", text: "3d — BB bet 66% pot" }
        ],
        teachBack: "Check-raise semi-bluff hearts (Th9h) que no completa. AKo sin draw no; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s semi-bluff → farol. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 872 hearts sin heart: call/fold, no raise de semi-bluff. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set/flush draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r14-12", "BTN", ["Ah","8h"], ["9c","6c","3d","Kh","2s"], 71412, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 6c 3d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Float con flush draw QcJc que falla: farol river. AA betearía distinto; 77 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc","Jc"],
          teachBack: "QJs semi-bluff float → farol. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ad"], label: "AA", correct: false,
              eliminated: "En 963 almost siempre betea antes: float + bet river sin flush es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qc","Jc"], label: "QJs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-15"] = [
      LQ("r15-01", "BB", ["Qd","Td"], ["Kh","5h","3c","9s","2d"], 71501, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 5h 3c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river sin heart: farol thin con AhXh fallido. JJ betearía turn; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","8h"],
          teachBack: "A8s flush draw fallido, river farol. JJ y JTo no.",
          options: [
            { id: "a", cards: ["Js","Jc"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Jh","Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin heart draw: tras check turn el river bet farol es poco natural. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ah","8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r15-02", "BB", ["Kd","8c"], ["Qh","Th","4h","2d","9c"], 71502, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh Th 4h — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "9c — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet: AhXh nut flush. JJ sin heart betearía turn; J9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","8h"],
          teachBack: "A8s nut flush. JJ y J9s sin heart no.",
          options: [
            { id: "a", cards: ["Js","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair sin heart: tras c-bet suele seguir en turn. Check-turn + bet flush encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","9d"], label: "J9o", correct: false,
              eliminated: "Puede c-bet, pero sin heart: tras check turn el river bet no es value de color. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r15-03", "BTN", ["9h","8h"], ["Ad","Kd","4c","2s","7d"], 71503, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ad Kd 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "7d — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet AK4: polar dos pares A4 o aire. QQ raisearía antes; JTs sin as no — aquí A4s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","4h"],
          teachBack: "A4s dos pares polar. QQ y JTs no.",
          options: [
            { id: "a", cards: ["Qs","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair al board AK: suele raisear antes — float + overbet river es raro." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin as/4: no overbetea river por value." },
            { id: "c", cards: ["Ah","4h"], label: "A4s", correct: true }
          ]
        }
      }),
      LQ("r15-04", "BB", ["Kd","9d"], ["Jc","Tc","5h","2d","Ah"], 71504, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc Tc 5h — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "Ah — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet gutshot + check turn + bet river: farol Q9s fallido. JJ betearía turn; A8o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","9s"],
          teachBack: "Q9s semi-bluff delayed farol. JJ y A8o no.",
          options: [
            { id: "a", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["As","8c"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin draw: tras check turn el river farol es poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qs","9s"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r15-05", "BB", ["Kc","8d"], ["Qs","Js","5s","3h","2d"], 71505, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs Js 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel spades: AsXs nuts. KK sin spade no; 77 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATs nut flush. KK y 77 no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: pot-control turn en two-tone, no triple barrel de color." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair sin flush: no barrela tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r15-06", "BB", ["Tc","9c"], ["Kh","6d","2c","8s","Ad"], 71506, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 6d 2c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "8s — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Ad — BB check → CO bet 66% pot" }
        ],
        teachBack: "Triple barrel → A: polar Ax o farol. JJ pot-controla; 77 no — aquí AKo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Kc"],
          teachBack: "AKo polar al A. JJ y 77 no.",
          options: [
            { id: "a", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn, no triple barrel polar cuando llega A. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7s"], label: "77", correct: false,
              eliminated: "Underpair: no barrela tres calles polar. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r15-07", "BTN", ["Kc","Qc"], ["9s","5s","2d","7h","Ad"], 71507, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 5s 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ad — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river sin spade: farol AsTs. JJ raisearía antes; 66 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATs flush draw fallido. JJ y 66 no.",
          options: [
            { id: "a", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + bet river sin flush es raro. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["6h","6c"], label: "66", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r15-08", "BTN", ["As","9s"], ["Jc","7c","3c","2d","Kh"], 71508, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc 7c 3c — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "2d — BB bet 66% pot → BTN call" },
          { street: "River", text: "Kh — BB bet 66% pot" }
        ],
        teachBack: "Check-raise clubs: KcXc color (blocker). AQo sin club no; 88 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","Tc"],
          teachBack: "KTo color. AQo y 88 sin club no.",
          options: [
            { id: "a", cards: ["Ah","Qd"], label: "AQo", correct: false,
              eliminated: "Call BB; en J73 clubs sin club: call/fold, no check-raise de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kc","Tc"], label: "KTo", correct: true }
          ]
        }
      }),
      LQ("r15-09", "BB", ["Jc","9c"], ["Td","9s","5h","2c","Kd"], 71509, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Td 9s 5h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Barrel T95 sin completar: farol QJ o 87. 66 pot-controla; A8o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJo OESD/gutshot fallido. 66 y A8o no.",
          options: [
            { id: "a", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair sin draw: pot-control turn, no triple barrel farol." },
            { id: "b", cards: ["Ah","8d"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin draw: no barrela tres calles al K blank. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","Jh"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r15-10", "BB", ["Ah","Kd"], ["Js","9s","2c","7h","3d"], 71510, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Js 9s 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel two-tone que NO completa: farol con flush draw fallido (KsQs) o Ax. 88 pot-controla; QJo sin plan abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks","Qs"],
          teachBack: "KQs flush draw fallido: farol creíble. 88 y QJo sin draw no barrela river seco.",
          options: [
            { id: "a", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Open + c-bet posible, pero underpair sin draw: pot-control turn, no triple barrel cuando el color no llega." },
            { id: "b", cards: ["Qc","Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet flop, pero sin flush draw claro: en river seco suele checkear, no farolear tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ks","Qs"], label: "KQs", correct: true }
          ]
        }
      }),
      LQ("r15-11", "BB", ["Kh","8d"], ["Qc","Jd","4s","2h","9c"], 71511, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Jd 4s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "9c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river al 9: farol T8s gutshot/OESD fallido… o value. Aquí T8s draw fallido. KK betearía turn; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","8h"],
          teachBack: "T8s draw fallido, river farol. KK y ATo no.",
          options: [
            { id: "a", cards: ["Ks","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin draw claro: tras check turn el river farol es poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Th","8h"], label: "T8s", correct: true }
          ]
        }
      }),
      LQ("r15-12", "BTN", ["Kd","Qs"], ["9h","8c","2d","Ad","3s"], 71512, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Ad — BB bet 66% pot → BTN call" },
          { street: "River", text: "3s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop 982 con OESD (T7s) que no llega: farol. AKo sin draw no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","7h"],
          teachBack: "T7s OESD fallido tras raise. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 982 sin straight draw fuerte: call/fold, no raise polar. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set ni OESD claro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Th","7h"], label: "T7s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-16"] = [
      LQ("r16-01", "BB", ["Kd","Td"], ["Qc","Tc","4h","9s","2d"], 71601, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Tc 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel clubs que no completan: farol AcXc o Jc9c. KK pot-controla; AJo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jc","9c"],
          teachBack: "J9s flush draw fallido. KK y AJo no.",
          options: [
            { id: "a", cards: ["Kh","Ks"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando el color no llega, no farolear river seco tres calles. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin club draw: no barrela river cuando falla el color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Jc","9c"], label: "J9s", correct: true }
          ]
        }
      }),
      LQ("r16-02", "BTN", ["Td","9d"], ["Ah","6h","3h","Qc","2s"], 71602, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 6h 3h — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "Qc — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Check-raise hearts: KhXh o nut Ah. AKo rainbow no; 88 sin heart no — aquí Kh9h.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9h"],
          teachBack: "K9s color (blocker K). AKo y 88 sin heart no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en A63 hearts sin heart: call/fold, no check-raise de color. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kh","9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r16-03", "BB", ["Qh","9s"], ["As","Jd","5c","3h","2d"], 71603, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Jd 5c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3h — check-check" },
          { street: "River", text: "2d — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "C-bet + check turn + overbet river: polar Ax thin o farol. KK betearía turn; T8s sin as no — aquí ATo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Td"],
          teachBack: "ATo polar thin. KK y T8s no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet-river encaja peor." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el overbet river no es value creíble." },
            { id: "c", cards: ["Ah","Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r16-04", "BTN", ["Kc","9c"], ["7h","6s","4d","Qd","2c"], 71604, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7h 6s 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Qd — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river sin escalera: farol 85s OESD fallido. AA betearía distinto; 99 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","5h"],
          teachBack: "85s OESD fallido. AA y 99 no.",
          options: [
            { id: "a", cards: ["As","Ah"], label: "AA", correct: false,
              eliminated: "En 764 casi siempre betea antes: float + bet river sin straight es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["9h","9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["8h","5h"], label: "85s", correct: true }
          ]
        }
      }),
      LQ("r16-05", "BB", ["As","Kd"], ["Qh","Jh","9h","2c","4d"], 71605, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh Jh 9h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel monotone hearts: color AhXh (blocker de nuts) o farol. KK sin heart no; 88 sin heart no — aquí AhTh color.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Th"],
          teachBack: "ATs nut flush (blocker+value). KK y 88 sin heart no barrela color.",
          options: [
            { id: "a", cards: ["Kc","Ks"], label: "KK", correct: false,
              eliminated: "Overpair sin heart: en monotone pot-controla turn, no triple barrel de color. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no barrela tres calles en monotone. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ah","Th"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r16-06", "BB", ["Ah","8d"], ["Jc","7h","3s","2d","9c"], 71606, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc 7h 3s — check-check" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Delayed overbet: polar Jx value o aire. AA betearía flop; QTo sin J no — aquí KJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Js"],
          teachBack: "KJo delayed polar. AA no checkea; QTo sin J no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "Premium: en J-high casi siempre c-betea flop. El check-check lo elimina. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Qc","Td"], label: "QTo", correct: false,
              eliminated: "Open late OK; sin J, delayed overbet turn+river es farol poco natural vs value." },
            { id: "c", cards: ["Kh","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r16-07", "BB", ["Ah","Kd"], ["Jc","Ts","4d","2h","8c"], 71607, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc Ts 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel JT4 sin completar escalera: farol Q9s (OESD fallido). 88 pot-controla; A9o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","9h"],
          teachBack: "Q9s OESD fallido: farol. 88 y A9o no barrela river blank.",
          options: [
            { id: "a", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Open + c-bet posible; underpair sin draw: pot-control turn, no triple barrel cuando la escalera falla." },
            { id: "b", cards: ["As","9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet, pero sin OESD claro: en river blank suele checkear, no farolear tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","9h"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r16-08", "BTN", ["Kd","9d"], ["Qs","Js","4c","8h","2d"], 71608, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs Js 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river sin spade: farol AsTs fallido. AA betearía distinto; 77 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATs flush draw fallido. AA y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En QJ4 casi siempre betea/raisea antes: float + bet river sin flush es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["As","Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r16-09", "BB", ["Ah","9d"], ["Tc","8d","6h","2s","Kd"], 71609, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Tc 8d 6h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Double gutshot/OESD Q9 que falla: farol. 55 pot-controla; AJo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","9h"],
          teachBack: "Q9s semi-bluff fallido. 55 y AJo no.",
          options: [
            { id: "a", cards: ["5h","5c"], label: "55", correct: false,
              eliminated: "Underpair sin equity: pot-control, no triple barrel farol. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["As","Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin draw: no barrela tres calles al K. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","9h"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r16-10", "BB", ["Jc","8c"], ["Ad","9d","5s","2h","Kc"], 71610, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Ad 9d 5s — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "Kc — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Triple barrel diamonds fallidos: farol KdQd. 66 pot-controla; QTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Qd"],
          teachBack: "KQs flush draw fallido. 66 y QTo no.",
          options: [
            { id: "a", cards: ["6h","6s"], label: "66", correct: false,
              eliminated: "Open + c-bet posible; underpair sin draw: pot-control turn, no triple barrel farol." },
            { id: "b", cards: ["Qh","Td"], label: "QTo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond draw: no barrela tres calles cuando el color falla. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kd","Qd"], label: "KQs", correct: true }
          ]
        }
      }),
      LQ("r16-11", "BB", ["Qc","9c"], ["Jd","Td","5s","2h","Ac"], 71611, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd Td 5s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Ac — BB check → CO bet 66% pot" }
        ],
        teachBack: "OESD+backdoor que falla: farol K9s o Q8. KK pot-controla; 88 sin equity no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9h"],
          teachBack: "K9s semi-bluff fallido. KK y 88 no.",
          options: [
            { id: "a", cards: ["Ks","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: pot-control cuando el draw falla, no farolear river tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair sin equity: no triple barrel farol. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kh","9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r16-12", "BB", ["Ad","7d"], ["Jh","Tc","3s","8d","2c"], 71612, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Tc 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel JT3→8 sin nuts straight: farol Q9s fallido (o value). Aquí Q9s. KK pot-controla; A9o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","9s"],
          teachBack: "Q9s draw fallido. KK y A9o no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando no mejora, no farolear river tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet, pero sin OESD claro: no barrela river blank. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qs","9s"], label: "Q9s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-17"] = [
      LQ("r17-01", "BTN", ["Ad","Td"], ["8s","8c","4h","Kd","2d"], 71701, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 8c 4h — BB donk 75% pot → BTN call" },
          { street: "Turn", text: "Kd — BB bet 66% pot → BTN call" },
          { street: "River", text: "2d — BB overbet 125% pot" }
        ],
        teachBack: "Donk grande paired + overbet: boat 88. AKo sin 8 no; JJ tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","8d"],
          teachBack: "88 boat overbet. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 884 sin 8: check-call, no donk grande de boat. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: true },
            { id: "c", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: no donkea grande 884 y overbetea river sin boat." }
          ]
        }
      }),
      LQ("r17-02", "BTN", ["Ah","Th"], ["8s","7c","3d","Kd","2h"], 71702, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 7c 3d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "Kd — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Raise flop + bet medio: merge set 88 o OESD (aquí 88). AKo sin 8 no; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","8d"],
          teachBack: "88 merge raise. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 873 sin 8: call/fold, no raise. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["8h","8d"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r17-03", "BTN", ["Qd","Jd"], ["Ts","9h","4c","2d","Kd"], 71703, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ts 9h 4c — BB donk 50% pot → BTN raise 3× → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Donk + call raise flop + call barrels: set TT o rareza. AKo sin T no donkea; 77 tampoco — aquí TT.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","Td"],
          teachBack: "TT donk vs raise. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en T94 sin T/9: check-call, no donk flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","Td"], label: "TT", correct: true },
            { id: "c", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: no donkea T94 y paga raise + barrels sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." }
          ]
        }
      }),
      LQ("r17-04", "BB", ["9h","9c"], ["As","Td","4c","2h","7d"], 71704, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Td 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 33% pot → BB call" },
          { street: "River", text: "7d — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Pequeño-pequeño-overbet: polar Ax nuts o farol. QQ pot-controla sizing; 55 no overbetea — aquí AKo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Kc"],
          teachBack: "AKo overbet polar. QQ y 55 no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bets pequeños suele sizing medio o pot-control — overbet river polar encaja peor que Ax." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: no convierte línea small-small en overbet river." },
            { id: "c", cards: ["Ah","Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r17-05", "CO", ["Ah","5h"], ["Qd","Jc","7s","2h","9c"], 71705, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jc 7s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet 66% pot → BB raise 3× → CO call" },
          { street: "River", text: "9c — BB bet 66% pot" }
        ],
        teachBack: "Call flop + call turn + raise river: QJ dos pares línea rara. KK raisearía antes; T8s sin Q/J no — aquí QJs.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jh"],
          teachBack: "QJs raise river raro. KK y T8s no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — call-call-raise river es más de dos pares. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: false,
              eliminated: "Call flop posible, pero raise river sin Q/J: no. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qs","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r17-06", "BB", ["Qd","Jd"], ["Ts","Th","6c","6h","2d"], 71706, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ts Th 6c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "6h — check-check" },
          { street: "River", text: "2d — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check turn boat board + bet river: full de dieces lento. KK betearía turn; A9o sin T/6 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","Tc"],
          teachBack: "TT boat lento. KK y A9o no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn aunque parea. Check-turn + bet-river boat encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet aire, pero sin T/6: tras check turn el river bet no es value de full. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Td","Tc"], label: "TT", correct: true }
          ]
        }
      }),
      LQ("r17-07", "BTN", ["Qc","Tc"], ["Kd","9h","4c","2s","8d"], 71707, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 9h 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8d — BB bet 33% pot" }
        ],
        teachBack: "Float + bet pequeño: Kx thin. AA betearía distinto; 77 sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Js"],
          teachBack: "KJo thin. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ah"], label: "AA", correct: false,
              eliminated: "En K94 casi siempre betea antes: float + bet pequeño river es raro para AA. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river thin tras float." },
            { id: "c", cards: ["Kh","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r17-08", "BTN", ["Th","8h"], ["Jc","Jd","5d","5s","2h"], 71708, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc Jd 5d — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "5s — BB bet 66% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Check-raise JJ5: boat JJ. AQo sin J no; 88 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Js"],
          teachBack: "JJ boat. AQo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en JJ5 sin J/5: call/fold, no check-raise boat. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop de full sin JJ. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Jh","Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r17-09", "BB", ["Qh","9h"], ["Kd","7c","3s","5h","Tc"], 71709, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 7c 3s — check-check" },
          { street: "Turn", text: "5h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Tc — BB check → BTN bet 33% pot" }
        ],
        teachBack: "Delayed + bet pequeño: Kx thin. AA betearía flop; AJo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Js"],
          teachBack: "KJo thin delayed. AA no checkea; AJo sin K no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "En K-high seco casi siempre c-betea flop. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "En flop: Open OK; sin K, delayed + bet pequeño no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kh","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r17-10", "BTN", ["As","9s"], ["Jh","Tc","4d","2c","7s"], 71710, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Tc 4d — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2c — BB bet 66% pot → BTN call" },
          { street: "River", text: "7s — BB bet 66% pot" }
        ],
        teachBack: "Raise flop + bet medio: merge set JJ o dos pares (no solo polar grande). AKo sin J no; 88 tampoco — aquí JJ.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Jd"],
          teachBack: "JJ merge raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en JT4 sin J: call/fold, no raise. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Js","Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r17-11", "BB", ["Jh","Th"], ["Kd","8c","2s","5h","9d"], 71711, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 8c 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — check-check" },
          { street: "River", text: "9d — BB check → CO bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet medio: merge Kx thin (no polar overbet). JJ betearía turn; ATo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo merge thin. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Js","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-medio merge encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin K: tras check turn el bet medio no es value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r17-12", "BB", ["Jh","8h"], ["Qs","Tc","5d","2c","9h"], 71712, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Qs Tc 5d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "9h — BB check → HJ bet 33% pot" }
        ],
        teachBack: "Triple barrel pequeño Q-high: Qx thin. 99 pot-controla; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jd"],
          teachBack: "QJo thin. 99 y 66 no.",
          options: [
            { id: "a", cards: ["9s","9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control turn, no bet pequeño river thin de Qx." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair: no barrela thin tres calles." },
            { id: "c", cards: ["Qh","Jd"], label: "QJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-18"] = [
      LQ("r18-01", "BB", ["Ah","Tc"], ["6d","6c","Qs","Qh","3s"], 71801, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "6d 6c Qs — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Qh — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "3s — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Barrel 66QQ: boat de seises o damas. KK pot-controla; J9s sin 6/Q no — aquí 66.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","6s"],
          teachBack: "66 boat. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar en double paired, no triple barrel boat de seises. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["Jh","9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet, pero sin 6/Q: no barrela boat. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["6h","6s"], label: "66", correct: true }
          ]
        }
      }),
      LQ("r18-02", "BB", ["Kc","7c"], ["As","Jd","4h","2s","9c"], 71802, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Jd 4h — check-check" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "9c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop + delayed bet + call raise turn: Ax fuerte. QQ betearía flop; T8s sin as no — aquí AQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Qc"],
          teachBack: "AQo línea rara delayed. QQ no checkea flop; T8s no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: en A-high casi siempre c-betea flop. El check-check lo saca. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: false,
              eliminated: "Open OK; sin as, delayed bet + call raise turn no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r18-03", "BTN", ["Ad","Kd"], ["Jh","9c","4s","2c","7h"], 71803, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 9c 4s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2c — check-check" },
          { street: "River", text: "7h — BB bet 66% pot" }
        ],
        teachBack: "Raise flop + check turn + bet river: set JJ línea rara. AQo sin J no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Jd"],
          teachBack: "JJ XR + river tras check turn. AQo y TT no.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en J94 sin J: call/fold, no raise polar. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Th","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Js","Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r18-04", "BB", ["Qc","8c"], ["Ah","9d","5s","3h","2d"], 71804, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 9d 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel medio A-high: merge Ax (value + algunos faroles). KK sizing distinto; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATo merge. KK y 66 no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea o pot-controla — bet medio tres calles merge es más de Ax. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["6h","6c"], label: "66", correct: false,
              eliminated: "Underpair: no barrela merge tres calles. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["As","Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r18-05", "BTN", ["Kh","9h"], ["Ad","7c","2s","5h","Jc"], 71805, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ad 7c 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — BB check-raise 3× → BTN call" },
          { street: "River", text: "Jc — BB bet 66% pot" }
        ],
        teachBack: "Call flop + XR turn blank: dos pares A7 o rareza. QQ raisearía flop; JTs sin as no XR turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","7h"],
          teachBack: "A7s XR turn raro. QQ y JTs no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop — call flop + XR turn blank es raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero XR turn sin as/7: no. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Ah","7h"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r18-06", "BTN", ["Kd","9d"], ["8s","8h","2c","2d","Ah"], 71806, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 8h 2c — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "2d — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ah — BB bet 66% pot" }
        ],
        teachBack: "Donk paired + presión: boat 88. AKo sin 8 no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8c","8d"],
          teachBack: "88 boat vía donk. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 882 sin 8/2: check-call, no donk boat. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: true },
            { id: "c", cards: ["Th","Td"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea 882 y mete tres calles de boat sin 88. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." }
          ]
        }
      }),
      LQ("r18-07", "BB", ["Jc","Tc"], ["Kh","6d","2s","9h","3c"], 71807, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 6d 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "9h — check-check" },
          { street: "River", text: "3c — BB check → CO overbet 125% pot" }
        ],
        teachBack: "C-bet + check turn + overbet: Kx thin polar. JJ betearía turn; ATo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Qs"],
          teachBack: "KQo overbet thin. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet encaja peor." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin K: tras check turn el overbet no es value." },
            { id: "c", cards: ["Kd","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r18-08", "BB", ["Jd","8d"], ["Qh","Ts","4c","2d","6s"], 71808, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh Ts 4c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "6s — BB check → CO bet 66% pot" }
        ],
        teachBack: "Triple barrel medio QT4: merge Qx. 88 pot-controla; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Js"],
          teachBack: "QJs merge. 88 y 55 no.",
          options: [
            { id: "a", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no bet medio river merge de Qx." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: no barrela merge. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Qs","Js"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r18-09", "BTN", ["Kd","Td"], ["Qc","9h","3s","6d","2h"], 71809, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 9h 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Float + bet medio river: merge Qx (no overbet polar). AA raisearía antes; 77 sin Q no — aquí QJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Js"],
          teachBack: "QJo merge float. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "En Q93 casi siempre betea/raisea antes: float + bet medio river es raro para AA. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river merge tras float sin Q. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Qh","Js"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r18-10", "BTN", ["Kc","9c"], ["Th","8d","2c","6h","As"], 71810, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Th 8d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "As — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet al A: Ax o farol con blocker. QQ raisearía antes; 77 sin as no — aquí A5s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","5h"],
          teachBack: "A5s overbet. QQ y 77 no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + overbet al A es raro." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river al A tras float." },
            { id: "c", cards: ["Ah","5h"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r18-11", "BB", ["Qd","8d"], ["As","7h","3c","5s","Kd"], 71811, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 7h 3c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Triple barrel → overbet al K: Ax o farol. 88 pot-controla; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Qc"],
          teachBack: "AQo overbet al K. 88 y J9s no.",
          options: [
            { id: "a", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet cuando llega K." },
            { id: "b", cards: ["Jh","9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: no overbetea river al K por value." },
            { id: "c", cards: ["Ah","Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r18-12", "BB", ["Kc","7c"], ["Ad","Td","3s","8h","2c"], 71812, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ad Td 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8h — check-check" },
          { street: "River", text: "2c — BB check → BTN bet 33% pot" }
        ],
        teachBack: "C-bet + check + bet pequeño: Ax thin. KK betearía turn; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","9s"],
          teachBack: "A9o thin. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño thin encaja peor." },
            { id: "b", cards: ["Jh","9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","9s"], label: "A9o", correct: true }
          ]
        }
      })
  ];

  PACKS["R-19"] = [
      LQ("r19-01", "BB", ["8h","7h"], ["Jd","Jc","4s","4h","9c"], 71901, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd Jc 4s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "4h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel JJ44: boat de jotas. 99 pot-controla; ATo sin J/4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Js"],
          teachBack: "JJ boat. 99 y ATo no.",
          options: [
            { id: "a", cards: ["9s","9d"], label: "99", correct: false,
              eliminated: "Underpair: pot-control cuando el board double parea, no triple barrel boat. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin J/4: no barrela tres calles de full. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Jh","Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r19-02", "BTN", ["8d","7d"], ["Kc","Td","5h","As","2s"], 71902, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kc Td 5h — check-check" },
          { street: "Turn", text: "As — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Check flop + call turn A + lead river: Kx fuerte o rareza. AA en BB raisearía turn o sizing más claro; QJo sin K no lead river — aquí KQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo lead river tras call turn. AA no; QJo sin K no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "En BB con As en turn: raise o presión más clara. Call turn + lead river thin no es la línea típica de AA." },
            { id: "b", cards: ["Qc","Jd"], label: "QJo", correct: false,
              eliminated: "Defiende BB OK; sin K, call turn A + lead river no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r19-03", "CO", ["9h","8h"], ["Kh","7d","2c","As","3h"], 71903, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 7d 2c — BB check → CO c-bet 33% pot → BB check-raise 3× → CO call" },
          { street: "Turn", text: "As — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "3h — BB bet 66% pot" }
        ],
        teachBack: "Check-raise flop + check turn A + bet river: set KK o línea rara. AJo sin K no XR; TT tampoco — aquí KK.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","Kd"],
          teachBack: "KK XR + river raro. AJo y TT no.",
          options: [
            { id: "a", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Call BB; en K72 sin K: call/fold, no check-raise flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no check-raisea flop polar sin set. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kc","Kd"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r19-04", "BB", ["Jh","9s"], ["Qc","7d","2h","5c","Td"], 71904, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Qc 7d 2h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "5c — BB check → HJ bet 33% pot → BB call" },
          { street: "River", text: "Td — BB check → HJ overbet 125% pot" }
        ],
        teachBack: "Small-small-overbet Q-high: Qx polar. 99 pot-controla; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Js"],
          teachBack: "QJo overbet. 99 y 66 no.",
          options: [
            { id: "a", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: no convierte small-small en overbet river." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair: no overbetea river polar." },
            { id: "c", cards: ["Qh","Js"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r19-05", "BTN", ["Kd","Jd"], ["Qc","Tc","5s","2h","8d"], 71905, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Tc 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB donk 50% pot → BTN call" },
          { street: "River", text: "8d — BB bet 66% pot" }
        ],
        teachBack: "Call flop + donk turn: dos pares QT o rareza. AKo sin Q/T no donkea turn; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Th"],
          teachBack: "QTo donk turn. AKo y 88 no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call flop posible, pero donk turn en QT5 sin Q/T: no — suele checkear. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: no donkea turn tras call flop. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","Th"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r19-06", "BTN", ["As","Js"], ["5d","5c","Kh","Kc","2s"], 71906, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "5d 5c Kh — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kc — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "2s — BB bet 66% pot" }
        ],
        teachBack: "Call flop + raise turn double king: boat 55 o KK. AQo sin 5 no raisea turn; QQ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h","5s"],
          teachBack: "55 boat sobre reyes. AQo y QQ no.",
          options: [
            { id: "a", cards: ["Ah","Qc"], label: "AQo", correct: false,
              eliminated: "Float flop posible, pero raise turn cuando parea K sin 5: farol raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Qh","Qd"], label: "QQ", correct: false,
              eliminated: "Underpair al K: a menudo folds/calls — raise turn boat es más de 55. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["5h","5s"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r19-07", "BB", ["Kh","6h"], ["As","Td","7c","2h","9s"], 71907, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Td 7c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "9s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet medio: merge Ax thin. QQ betearía turn; J8s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Qc"],
          teachBack: "AQo merge thin. QQ y J8s no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-medio merge encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","8h"], label: "J8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet medio no es value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r19-08", "BB", ["Td","8c"], ["Ah","Jh","5c","2d","9s"], 71908, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah Jh 5c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "9s — BB check → CO bet 33% pot" }
        ],
        teachBack: "Triple barrel pequeño A-high: Ax thin. QQ sizing distinto; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATo thin. QQ y 66 no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea o sizing mayor — bet pequeño thin es más de Ax." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair: no barrela thin tres calles." },
            { id: "c", cards: ["As","Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r19-09", "BTN", ["Kd","Jd"], ["Qc","8h","3s","2d","9c"], 71909, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 8h 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet river Q-high: Qx fuerte o aire. AA raisearía antes; 77 sin Q no — aquí QTs.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Ts"],
          teachBack: "QTo overbet value. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "En Q83 casi siempre betea/raisea antes: float + overbet river es raro para AA." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river tras float sin Q." },
            { id: "c", cards: ["Qh","Ts"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r19-10", "BB", ["Jh","Td"], ["As","9c","4d","2h","7s"], 71910, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 9c 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "7s — BB check → BTN bet 33% pot" }
        ],
        teachBack: "C-bet + check turn + bet pequeño river: thin Ax. KK betearía turn; QJo sin as no cobra thin.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","8d"],
          teachBack: "A8s thin value. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño river thin encaja peor." },
            { id: "b", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value creíble. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ad","8d"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r19-11", "BTN", ["Ad","8d"], ["Jh","6c","2s","9d","4h"], 71911, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 6c 2s — BB donk 33% pot → BTN call" },
          { street: "Turn", text: "9d — BB bet 33% pot → BTN call" },
          { street: "River", text: "4h — BB bet 33% pot" }
        ],
        teachBack: "Donk pequeño + thin: Jx. AKo sin J no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","Td"],
          teachBack: "JTo thin donk. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en J62 sin J: check-call, no donk thin." },
            { id: "b", cards: ["Js","Td"], label: "JTo", correct: true },
            { id: "c", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea pequeño J62 y mete tres calles thin sin J." }
          ]
        }
      }),
      LQ("r19-12", "BTN", ["9s","8s"], ["Qh","Tc","4d","2c","Kd"], 71912, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh Tc 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet al K: Kx o farol. AA betearía distinto; 77 sin K/Q no — aquí KJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Js"],
          teachBack: "KJo overbet al K. AA y 77 no.",
          options: [
            { id: "a", cards: ["Ac","Ah"], label: "AA", correct: false,
              eliminated: "En flop: En QT4 casi siempre betea antes: float + overbet al K es raro para AA." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river al K tras float." },
            { id: "c", cards: ["Kh","Js"], label: "KJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-20"] = [
      LQ("r20-01", "BTN", ["Kc","Qc"], ["7h","7d","3s","3c","Ad"], 72001, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7h 7d 3s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "3c — BB bet 66% pot → BTN call" },
          { street: "River", text: "Ad — BB bet 66% pot" }
        ],
        teachBack: "Raise flop paired: boat 77 vs 33. AKo sin 7 no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["7c","7s"],
          teachBack: "77 boat. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As","Kh"], label: "AKo", correct: false,
              eliminated: "Call BB; en 773 sin 7/3: call/fold, no raise polar de boat. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop de full sin 77. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["7c","7s"], label: "77", correct: true }
          ]
        }
      }),
      LQ("r20-02", "BTN", ["Qc","Jc"], ["9s","8h","3d","Kd","2c"], 72002, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 8h 3d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB donk 50% pot → BTN raise 3× → BB call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Call flop + donk turn K + call raise: K9 o rareza. ATo sin K no donkea; 77 tampoco — aquí K9s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9h"],
          teachBack: "K9s donk turn vs raise. ATo y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Call flop posible, pero donk turn K sin K: no. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Kh","9h"], label: "K9s", correct: true },
            { id: "c", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no donkea turn K y paga raise sin Kx. El raise 3× exige equity fuerte; este combo no justifica ese sizing." }
          ]
        }
      }),
      LQ("r20-03", "BTN", ["Ah","Qd"], ["9h","8c","2d","Kd","3s"], 72003, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "Kd — check-check" },
          { street: "River", text: "3s — BB bet 66% pot" }
        ],
        teachBack: "Donk flop + check turn K + bet river: set 99 o rareza. AKo sin 9 no donkea; JTs sin 9 tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9s","9d"],
          teachBack: "99 donk raro + river. AKo y JTs no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 982 sin 9/8: check-call, no donk flop. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Call BB OK; sin 9 suele checkear flop, no donkear y luego bet river tras check turn. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["9s","9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r20-04", "BB", ["Kd","9d"], ["Ah","7c","3h","2s","6d"], 72004, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 7c 3h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "6d — BB check → BTN bet 33% pot" }
        ],
        teachBack: "C-bet + check + bet pequeño: Ax thin. JJ betearía turn; T8s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Ts"],
          teachBack: "ATo thin. JJ y T8s no.",
          options: [
            { id: "a", cards: ["Jh","Jc"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño thin encaja peor." },
            { id: "b", cards: ["Th","8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["As","Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r20-05", "BTN", ["Ad","9d"], ["2h","2c","Qs","Qd","8h"], 72005, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "2h 2c Qs — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Qd — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "8h — BB bet 66% pot" }
        ],
        teachBack: "Call flop + raise turn QQ22: boat 22 o QQ. AKo sin 2 no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["2s","2d"],
          teachBack: "22 boat. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Float posible, pero raise turn cuando parea Q sin 2: farol raro. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Jh","Jd"], label: "JJ", correct: false,
              eliminated: "Underpair al Q: no raisea turn boat. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["2s","2d"], label: "22", correct: true }
          ]
        }
      }),
      LQ("r20-06", "BB", ["Kh","Jh"], ["Qs","7d","2c","8h","4s"], 72006, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs 7d 2c — check-check" },
          { street: "Turn", text: "8h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop + delayed medio: merge Qx (ni polar ni thin extremo). AA betearía flop; J9s sin Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Td"],
          teachBack: "QTo merge delayed. AA no checkea; J9s no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "Premium: en Q-high casi siempre c-betea. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Js","9d"], label: "J9o", correct: false,
              eliminated: "Open OK; sin Q, delayed bet medio no es value natural en flop check-check. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qh","Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r20-07", "BB", ["Ah","Kd"], ["9s","9c","4h","4d","2c"], 72007, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 9c 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "4d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Double paired board: boat 99 vs 44. Triple barrel = full de nueves. QQ pot-controla; AJo sin 9/4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","9d"],
          teachBack: "99 boat sobre 44. QQ y AJo no barrela boat.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: en board double paired suele pot-controlar turn — no triple barrel como boat de nueves. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ac","Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin 9/4: no mete tres calles por value de full. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9h","9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r20-08", "BB", ["Td","9d"], ["Kc","Jc","3h","2s","8d"], 72008, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Kc Jc 3h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "8d — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Triple barrel medio KJ3: merge Kx. 99 pot-controla; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo merge. 99 y 55 no.",
          options: [
            { id: "a", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control turn, no bet medio river merge de Kx." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: no barrela merge. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r20-09", "BTN", ["Ad","8d"], ["9c","8h","4s","2d","Kh"], 72009, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9c 8h 4s — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "2d — BB bet 66% pot → BTN call" },
          { street: "River", text: "Kh — BB bet 66% pot" }
        ],
        teachBack: "Donk medio + bet medio: merge 99/98 (no polar grande). AKo sin 9 no donkea; 77 tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","9d"],
          teachBack: "99 merge donk. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 984 sin 9/8: check-call, no donk medio. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["9h","9d"], label: "99", correct: true },
            { id: "c", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: no donkea medio 984 y mete tres calles merge. La secuencia de sizings no encaja con value de este combo." }
          ]
        }
      }),
      LQ("r20-10", "BTN", ["Qc","Jc"], ["Kd","5h","2s","9c","7h"], 72010, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 5h 2s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "9c — BB bet 66% pot → BTN call" },
          { street: "River", text: "7h — BB overbet 125% pot" }
        ],
        teachBack: "Raise flop K52 + overbet: polar set KK. AJo sin K no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Ks"],
          teachBack: "KK set overbet. AJo y 88 no.",
          options: [
            { id: "a", cards: ["As","Jd"], label: "AJo", correct: false,
              eliminated: "Call BB; en K52 sin K: call/fold, no raise polar. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop polar sin set. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Kh","Ks"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r20-11", "BB", ["8h","8c"], ["Kh","Td","5s","2d","9c"], 72011, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh Td 5s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → CO bet 33% pot" }
        ],
        teachBack: "Triple barrel pequeño K-high: Kx thin. QQ sizing distinto; 66 no cobra thin.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc","Js"],
          teachBack: "KJo thin. QQ y 66 no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea o sizing mayor — bet pequeño de tres calles thin es más de Kx." },
            { id: "b", cards: ["6h","6d"], label: "66", correct: false,
              eliminated: "Underpair: pot-control, no bet pequeño river thin de Kx." },
            { id: "c", cards: ["Kc","Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r20-12", "BB", ["Td","9d"], ["Ah","6c","2s","8h","4d"], 72012, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 6c 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "8h — check-check" },
          { street: "River", text: "4d — BB check → CO overbet 125% pot" }
        ],
        teachBack: "C-bet + check + overbet: Ax thin polar. KK betearía turn; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As","Qs"],
          teachBack: "AQs overbet thin. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet encaja peor." },
            { id: "b", cards: ["Jh","9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el overbet no es value." },
            { id: "c", cards: ["As","Qs"], label: "AQs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-21"] = [
      LQ("r21-01", "BB", ["Kd","Td"], ["3c","3h","As","Ad","8s"], 72101, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "3c 3h As — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ad — check-check" },
          { street: "River", text: "8s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn AAA33 + bet river: boat de ases lento. QQ betearía turn; JTo sin A/3 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Ac"],
          teachBack: "AA boat lento. QQ y JTo no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river boat encaja peor. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Jh","Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin A/3: tras check turn el river bet no es value de full. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Ah","Ac"], label: "AA", correct: true }
          ]
        }
      }),
      LQ("r21-02", "BB", ["As","Ts"], ["8d","6c","3h","Qh","2s"], 72102, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8d 6c 3h — check-check" },
          { street: "Turn", text: "Qh — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Check flop + call turn Q + bet river: 88 set slowplay. AA betearía flop; J9s sin 8 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","8s"],
          teachBack: "88 slowplay raro. AA no checkea; J9s no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "Premium: en board bajo casi siempre c-betea. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Jh","9d"], label: "J9o", correct: false,
              eliminated: "Open OK; sin 8, call turn Q + bet river no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["8h","8s"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r21-03", "BTN", ["Ah","8h"], ["Jd","9c","4h","2s","7d"], 72103, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd 9c 4h — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "2s — BB bet 66% pot → BTN call" },
          { street: "River", text: "7d — BB overbet 125% pot" }
        ],
        teachBack: "Check-raise grande + overbet: polar set JJ. AKo sin pareja no; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Js"],
          teachBack: "JJ set overbet. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en J94 sin pareja: call/fold, no check-raise grande polar. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Th","Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop polar grande sin set. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Jh","Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r21-04", "HJ", ["Tc","9c"], ["Qs","6d","3h","8c","2d"], 72104, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Qs 6d 3h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "8c — BB donk 50% pot → HJ call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "Call flop + donk turn 8: Q8 dos pares o rareza. KK betearía distinto; AJo sin Q no donkea turn — aquí Q8s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","8h"],
          teachBack: "Q8s donk turn. KK y AJo no.",
          options: [
            { id: "a", cards: ["Kh","Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet rival suele pot-controlar o raisear — donk turn 8 es más de Q8. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["As","Jd"], label: "AJo", correct: false,
              eliminated: "Call flop posible, pero donk turn sin Q/8: no. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","8h"], label: "Q8s", correct: true }
          ]
        }
      }),
      LQ("r21-05", "BB", ["9c","8c"], ["Kh","Kc","7s","7d","2c"], 72105, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh Kc 7s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "7d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → CO bet 66% pot" }
        ],
        teachBack: "Triple barrel KK77: boat de reyes. QQ pot-controla; ATo sin K/7 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","Ks"],
          teachBack: "KK boat. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs","Qd"], label: "QQ", correct: false,
              eliminated: "Underpair al K: pot-control en double paired, no triple barrel boat. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin K/7: no barrela boat. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kd","Ks"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r21-06", "BTN", ["9h","8h"], ["Kc","Qs","4d","2h","7c"], 72106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kc Qs 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "7c — BB bet 33% pot" }
        ],
        teachBack: "Float + bet pequeño KQ4: Kx thin. AA raisearía antes; JTs sin K/Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Jd"],
          teachBack: "KJo thin. AA y JTs no.",
          options: [
            { id: "a", cards: ["As","Ac"], label: "AA", correct: false,
              eliminated: "En KQ4 casi siempre betea/raisea antes: float + bet pequeño es raro para AA. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin K/Q: no apuesta river thin." },
            { id: "c", cards: ["Kh","Jd"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r21-07", "BTN", ["Qc","Jd"], ["4h","4d","9s","9c","Kd"], 72107, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "4h 4d 9s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Float + bet river 4499K: boat 99. AA betearía distinto; 77 sin 4/9 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","9d"],
          teachBack: "99 boat. AA y 77 no.",
          options: [
            { id: "a", cards: ["As","Ah"], label: "AA", correct: false,
              eliminated: "En 449 casi siempre betea/raisea antes: float + bet river boat es raro para AA. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river por value de full tras float. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9h","9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r21-08", "BB", ["9c","8c"], ["As","Kh","7d","2c","4s"], 72108, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Kh 7d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel sizing medio AK7: merge Ax (no solo polar). QQ pot-controla; 55 no — aquí AJo merge.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Jd"],
          teachBack: "AJo merge value. QQ y 55 no barrela medio tres calles.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn en AK — bet medio de tres calles merge es más de Ax. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: pot-control, no bet medio river merge. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Ah","Jd"], label: "AJo", correct: true }
          ]
        }
      }),
      LQ("r21-09", "BB", ["Kd","Qs"], ["Jc","7h","3d","9s","2c"], 72109, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc 7h 3d — check-check" },
          { street: "Turn", text: "9s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → BTN bet 33% pot" }
        ],
        teachBack: "Delayed + bet pequeño river: Jx thin. AA betearía flop; ATo sin J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Ts"],
          teachBack: "JTo thin delayed. AA no checkea; ATo sin J no.",
          options: [
            { id: "a", cards: ["Ah","Ac"], label: "AA", correct: false,
              eliminated: "Premium: en J-high casi siempre c-betea flop. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["As","Td"], label: "ATo", correct: false,
              eliminated: "Open OK; sin J, delayed + bet pequeño river no es value natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Jh","Ts"], label: "JTo", correct: true }
          ]
        }
      }),
      LQ("r21-10", "BTN", ["Ah","9h"], ["Qd","8c","2s","5h","Tc"], 72110, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd 8c 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Tc — BB bet 33% pot" }
        ],
        teachBack: "Float + bet pequeño river: Qx thin. AA raisearía antes; J9s sin Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Jd"],
          teachBack: "QJo thin float. AA y J9s no.",
          options: [
            { id: "a", cards: ["Ac","Ad"], label: "AA", correct: false,
              eliminated: "En Q82 casi siempre betea/raisea antes: float + bet pequeño river es raro para AA. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["Jh","9d"], label: "J9o", correct: false,
              eliminated: "Call flop posible, pero sin Q: no apuesta river thin por value." },
            { id: "c", cards: ["Qs","Jd"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r21-11", "BB", ["Kh","7d"], ["Js","9c","3d","2h","Qc"], 72111, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Js 9c 3d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Qc — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Triple barrel → overbet Q: Qx o farol. TT pot-controla; A8o sin Q/J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","Td"],
          teachBack: "QTo overbet. TT y A8o no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Underpair/overcard: pot-control turn, no overbet cuando llega Q." },
            { id: "b", cards: ["Ah","8c"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin Q/J fuerte: no overbetea river por value." },
            { id: "c", cards: ["Qd","Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r21-12", "BTN", ["Qc","Tc"], ["Kd","Jh","5s","3c","8h"], 72112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd Jh 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8h — BB bet 66% pot" }
        ],
        teachBack: "Float + bet medio KJ5: merge Kx. AA raisearía antes; 99 sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","9h"],
          teachBack: "K9s merge float. AA y 99 no.",
          options: [
            { id: "a", cards: ["As","Ah"], label: "AA", correct: false,
              eliminated: "En KJ5 casi siempre betea/raisea antes: float + bet medio es raro para AA. La secuencia de sizings no encaja con value de este combo." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Underpair: no apuesta river merge tras float sin K. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Kh","9h"], label: "K9s", correct: true }
          ]
        }
      })
  ];


  PACKS["R-22"] = [
      LQ("r22-01", "BB", ["Kh","7c"], ["As","9d","4d","2c","8h"], 22101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 9d 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8h — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Triple barrel A-high two-tone + overbet en brick: FD KdXd fallido. AKo value más lineal; 99 pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd","5d"],
          teachBack: "K5s FD fallido → farol. AKo y 99 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Top pair fuerte: sizing value medio/claro. El salto a overbet cuando muere el diamond es polar air en esa línea de turn/river." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Set/underpair medio: pot-control turn o bet medio — no overbet river brick." },
            { id: "c", cards: ["Kd","5d"], label: "K5s", correct: true }
          ]
        }
      }),
      LQ("r22-02", "BB", ["Qc","8d"], ["Jh","Td","3c","7c","2s"], 22102, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Td 3c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "7c — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "2s — BB check → CO bet 66% pot" }
        ],
        teachBack: "OESD en JT que falla en brick: farol. KJo value; 88 pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9s","8s"],
          teachBack: "98s OESD fallido. KJo y 88 no.",
          options: [
            { id: "a", cards: ["Kh","Js"], label: "KJo", correct: false,
              eliminated: "Top pair: cobra sizing value; no necesita tres calles como equity muerta en esa línea de turn/river." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no barrel river brick por valor." },
            { id: "c", cards: ["9s","8s"], label: "98s", correct: true }
          ]
        }
      }),
      LQ("r22-03", "BTN", ["As","5s"], ["Kd","7h","2c","9d","3s"], 22103, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 7h 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3s — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet brick: FD TdXd fallido. KTo value; QQ raisearía antes.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","6d"],
          teachBack: "T6s FD fallido → farol. KTo y QQ no.",
          options: [
            { id: "a", cards: ["Kh","Tc"], label: "KTo", correct: false,
              eliminated: "Top pair: tras float suele betear medio por value, no overbet polar en esa línea de turn/river." },
            { id: "b", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + overbet brick es raro." },
            { id: "c", cards: ["Td","6d"], label: "T6s", correct: true }
          ]
        }
      }),
      LQ("r22-04", "BB", ["Jh","4h"], ["Qc","9c","2d","5h","8s"], 22104, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 9c 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — check-check" },
          { street: "River", text: "8s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check turn + bet river brick: FD clubs fallido. QJo betearía turn; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","7c"],
          teachBack: "A7s FD fallido delayed. QJo y 77 no.",
          options: [
            { id: "a", cards: ["Qd","Js"], label: "QJo", correct: false,
              eliminated: "Top pair: tras c-bet suele seguir en turn — check-turn + bet-river brick encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: pot-control; no retoma river brick como value. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ac","7c"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r22-05", "BB", ["Td","6c"], ["8h","7h","3s","Kd","2c"], 22105, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "8h 7h 3s — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → HJ overbet 125% pot" }
        ],
        teachBack: "Combo draw hearts que falla + overbet: farol. AA pot-controla K; 99 no overbetea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","6h"],
          teachBack: "96s combo draw fallido. AA y 99 no.",
          options: [
            { id: "a", cards: ["As","Ah"], label: "AA", correct: false,
              eliminated: "Overpair: con K en turn suele pot-controlar o bet medio — overbet brick no es value típico." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw hecho: no overbetea river tras scare K." },
            { id: "c", cards: ["9h","6h"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r22-06", "BTN", ["Kh","9c"], ["As","Jd","5c","4h","2d"], 22106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Jd 5c — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "4h — BB bet 66% pot → BTN call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "XR A-high + barrels en blanks: gutshot/backdoor (T9) fallido. AKo sizing distinto; 88 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Tc","9d"],
          teachBack: "T9o equity fallida. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Top pair fuerte: sizing más value; XR + tres blanks extremos es polar — aquí el air encaja mejor en esa línea de turn/river." },
            { id: "b", cards: ["8s","8h"], label: "88", correct: false,
              eliminated: "Underpair: no check-raisea A-high seco sin equity clara. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Tc","9d"], label: "T9o", correct: true }
          ]
        }
      }),
      LQ("r22-07", "BB", ["Qd","7d"], ["Tc","6c","2h","9s","4d"], 22107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 6c 2h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel clubs que no llegan: 87o FD fallido. TT set distinto; ATo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8c","7h"],
          teachBack: "87o FD fallido. TT y ATo no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Set: sizing value/protección — barrel lineal de “miedo” en brick encaja peor." },
            { id: "b", cards: ["Ah","Td"], label: "ATo", correct: false,
              eliminated: "Top pair sin club: pot-control o bet medio; no tres calles de draw muerto. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["8c","7h"], label: "87o", correct: true }
          ]
        }
      }),
      LQ("r22-08", "BB", ["9h","5c"], ["Jh","8h","4s","2c","Kd"], 22108, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 8h 4s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Kd — BB check → CO bet 66% pot" }
        ],
        teachBack: "Scare K + bet tras hearts: QhXh fallido. KJo value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","5h"],
          teachBack: "Q5s FD fallido + scare. KJo y 77 no.",
          options: [
            { id: "a", cards: ["Kc","Js"], label: "KJo", correct: false,
              eliminated: "Dos pares/top: cobra value; presión “de miedo” en K es más hearts muertos en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7s","7d"], label: "77", correct: false,
              eliminated: "Underpair: no barrela K-scare por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","5h"], label: "Q5s", correct: true }
          ]
        }
      }),
      LQ("r22-09", "BTN", ["Ad","8d"], ["Qs","7c","3c","Jh","2h"], 22109, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs 7c 3c — check-check" },
          { street: "Turn", text: "Jh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Check flop + call delayed + lead brick: backdoor/float air. QQ betearía flop; 99 no lead.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s float → farol. QQ y 99 no.",
          options: [
            { id: "a", cards: ["Qh","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: casi siempre c-betea Q73. El check-check la elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Underpair: no lead river tras call turn sin showdown fuerte. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r22-10", "BB", ["Kc","4d"], ["9s","8d","2d","7c","Ah"], 22110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 8d 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ah — BB check → BTN bet 66% pot" }
        ],
        teachBack: "OESD que falla + A scare: farol. AKo value; TT pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","5h"],
          teachBack: "65s OESD fallido. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kd"], label: "AKo", correct: false,
              eliminated: "Al llegar A: value más claro o check; barrel de “necesito fold” encaja peor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: pot-control en board conectado, no tres calles + A. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["6h","5h"], label: "65s", correct: true }
          ]
        }
      }),
      LQ("r22-11", "BB", ["Jd","3c"], ["Kh","6h","5c","2s","9d"], 22111, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 6h 5c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9d — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet tras hearts: AhXh fallido. KTo value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","8h"],
          teachBack: "A8s FD fallido overbet. KTo y 88 no.",
          options: [
            { id: "a", cards: ["Kc","Ts"], label: "KTo", correct: false,
              eliminated: "Top pair: sizing value medio; overbet extremo en blank es polar air en esa línea de turn/river." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea river." },
            { id: "c", cards: ["Ah","8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r22-12", "BTN", ["Qs","5h"], ["Tc","9c","4d","2h","7s"], 22112, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 9c 4d — BB donk 50% pot → BTN call" },
          { street: "Turn", text: "2h — BB bet 66% pot → BTN call" },
          { street: "River", text: "7s — BB bet 66% pot" }
        ],
        teachBack: "Donk + barrels en T9cc sin completar: JcXc fallido. TT set distinto; AKo no donkea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jc","8c"],
          teachBack: "J8s combo draw donk fallido. TT y AKo no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Set: donk posible, pero la presión hasta brick “sin cambio” es más draw muerto. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Sin T/9/club: no donkea T9 two-tone. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Jc","8c"], label: "J8s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-23"] = [
      LQ("r23-01", "BB", ["9c","6d"], ["Ah","8s","3c","7d","2h"], 23101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 8s 3c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7d — check-check" },
          { street: "River", text: "2h — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "C-bet + check turn + overbet: blocker A air. ATo betearía turn; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","5d"],
          teachBack: "A5o blocker farol delayed. ATo y 55 no.",
          options: [
            { id: "a", cards: ["Ad","Tc"], label: "ATo", correct: false,
              eliminated: "Top pair: tras c-bet suele betear turn value — check-turn + overbet es polar air." },
            { id: "b", cards: ["5h","5c"], label: "55", correct: false,
              eliminated: "Underpair: no overbetea river tras check turn." },
            { id: "c", cards: ["Ac","5d"], label: "A5o", correct: true }
          ]
        }
      }),
      LQ("r23-02", "BB", ["Kd","8c"], ["Qc","Jd","4h","9s","3c"], 23102, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Jd 4h — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "3c — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Overbet brick en QJ: T8s gutshot fallido. QJo value; TT pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","8h"],
          teachBack: "T8s gutshot fallido. QJo y TT no.",
          options: [
            { id: "a", cards: ["Qh","Js"], label: "QJo", correct: false,
              eliminated: "Dos pares: cobra value sizing, no overbet polar air en esa línea de turn/river." },
            { id: "b", cards: ["Tc","Td"], label: "TT", correct: false,
              eliminated: "Underpair: pot-control, no overbet." },
            { id: "c", cards: ["Th","8h"], label: "T8s", correct: true }
          ]
        }
      }),
      LQ("r23-03", "BTN", ["Ah","7c"], ["Kd","9c","5s","2d","8h"], 23103, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 9c 5s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "8h — BB bet 66% pot" }
        ],
        teachBack: "XR flop + check turn + bet river: QJs draw fallido. KK betearía turn; 77 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs XR equity fallida. KK y 77 no.",
          options: [
            { id: "a", cards: ["Kc","Kh"], label: "KK", correct: false,
              eliminated: "Overpair/set: tras XR suele seguir en turn — check-turn + bet-river brick es draw muerto. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["7s","7d"], label: "77", correct: false,
              eliminated: "Underpair: no check-raisea K95 seco. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r23-04", "BB", ["Ts","4h"], ["Jh","7d","2c","As","6s"], 23104, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh 7d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "As — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "6s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel A scare sin value: QTo air. AJ value; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","Tc"],
          teachBack: "QTo air con blocker. AJo y 99 no.",
          options: [
            { id: "a", cards: ["Ad","Jc"], label: "AJo", correct: false,
              eliminated: "Dos pares: value claro en A — no necesita presión de farol en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control al A, no barrel river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qs","Tc"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r23-05", "BB", ["8d","3c"], ["5h","5c","Kd","9s","2h"], 23105, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "5h 5c Kd — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "2h — BB check → HJ bet 66% pot" }
        ],
        teachBack: "Paired board + presión: A-high air. KK full distinto; 87 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","Tc"],
          teachBack: "ATo air en paired. KK y 87o no.",
          options: [
            { id: "a", cards: ["Kh","Kc"], label: "KK", correct: false,
              eliminated: "Full/overpair: sizing value; bet de “robo” en blank encaja peor en esa línea de turn/river." },
            { id: "b", cards: ["8h","7s"], label: "87o", correct: false,
              eliminated: "Sin showdown: no mete tres calles value en paired en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ah","Tc"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r23-06", "BTN", ["Kd","Jd"], ["Tc","8c","3h","6s","2d"], 23106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 8c 3h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB overbet 125% pot" }
        ],
        teachBack: "Overbet tras call down: 97s FD fallido. TT set; AQo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9c","7c"],
          teachBack: "97s FD fallido overbet. TT y AQo no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Set: value sizing; overbet extremo tras línea pasiva es polar air en esa línea de turn/river." },
            { id: "b", cards: ["Ah","Qs"], label: "AQo", correct: false,
              eliminated: "Sin club/T: no llega a overbet river por value." },
            { id: "c", cards: ["9c","7c"], label: "97s", correct: true }
          ]
        }
      }),
      LQ("r23-07", "BB", ["Qh","2c"], ["9d","6d","4c","Kh","3s"], 23107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9d 6d 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel K scare diamonds miss: AdXd fallido. K9 value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","5d"],
          teachBack: "A5s FD fallido. K9o y 77 no.",
          options: [
            { id: "a", cards: ["Kc","9c"], label: "K9o", correct: false,
              eliminated: "Dos pares: value; la presión “necesito fold” encaja más con diamond muerto en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no barrela K-scare por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ad","5d"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r23-08", "BB", ["Jc","5d"], ["As","Td","7h","2c","8d"], 23108, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "As Td 7h — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — check-check" },
          { street: "River", text: "8d — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Check turn + overbet: KQo air. AJ betearía turn; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo air delayed. AJo y 99 no.",
          options: [
            { id: "a", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Top pair: betea turn value — check-turn + overbet es polar." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: no overbetea river." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r23-09", "BTN", ["9h","9c"], ["Qd","Jc","5s","3h","8c"], 23109, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jc 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "8c — BB bet 66% pot" }
        ],
        teachBack: "Call + raise turn blank + bet river: T9o gutshot fallido. QQ raise flop; AKo no raise turn blank.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9d"],
          teachBack: "T9o raise turn air. QQ y AKo no.",
          options: [
            { id: "a", cards: ["Qs","Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: raisearía flop o jugaría turn distinto — raise turn blank es polar air. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Sin Q/J: no raisea turn blank tras call flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Th","9d"], label: "T9o", correct: true }
          ]
        }
      }),
      LQ("r23-10", "BB", ["Kh","6c"], ["8s","7c","2d","Ac","4h"], 23110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 7c 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ac — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4h — BB check → BTN bet 66% pot" }
        ],
        teachBack: "OESD + A scare sin equity: 96s farol. AKo value; TT pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9d","6d"],
          teachBack: "96s OESD fallido. AKo y TT no.",
          options: [
            { id: "a", cards: ["As","Kd"], label: "AKo", correct: false,
              eliminated: "Top pair A: value sizing; barrel de robo encaja peor." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: pot-control al A en board conectado. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9d","6d"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r23-11", "BB", ["Qd","4c"], ["Jh","Th","5d","2s","9c"], 23111, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Th 5d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Llega 9 (straight board) + bet: Q8s representa — farol. JTo value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc","8c"],
          teachBack: "Q8s representa escalera — farol. JTo y 88 no.",
          options: [
            { id: "a", cards: ["Js","Td"], label: "JTo", correct: false,
              eliminated: "Dos pares: value; sizing representacional de “tengo la escalera” es más air en esa línea de turn/river." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no betea river en straight board por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qc","8c"], label: "Q8s", correct: true }
          ]
        }
      }),
      LQ("r23-12", "BTN", ["Ac","6h"], ["Kd","8d","4c","7s","2h"], 23112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 8d 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7s — BB donk 50% pot → BTN call" },
          { street: "River", text: "2h — BB bet 66% pot" }
        ],
        teachBack: "Donk turn (equity) + bet river miss: 96o fallido. KK distinto; AJo no donkea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","6s"],
          teachBack: "96o donk equity fallida. KK y AJo no.",
          options: [
            { id: "a", cards: ["Kh","Kc"], label: "KK", correct: false,
              eliminated: "Overpair: no donkea turn típico tras call flop — línea de draw. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Sin K/8/diamond: no donkea turn. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["9h","6s"], label: "96o", correct: true }
          ]
        }
      })
  ];

  PACKS["R-24"] = [
      LQ("r24-01", "BB", ["Jh","5c"], ["As","9h","4h","2d","7c"], 24101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 9h 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet 33% pot → BB call" },
          { street: "River", text: "7c — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Tiny-tiny-overbet: polar. Hearts muertos → KhXh farol. AKo value continuo; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","6h"],
          teachBack: "K6s FD fallido polar. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Top pair fuerte: sizing value estable. El salto a overbet tras tiny bets es polar — lado air en esa línea de turn/river." },
            { id: "b", cards: ["8s","8d"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea river polar." },
            { id: "c", cards: ["Kh","6h"], label: "K6s", correct: true }
          ]
        }
      }),
      LQ("r24-02", "CO", ["Td","4c"], ["Qc","Jc","3s","8h","2d"], 24102, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Jc 3s — BB check → CO c-bet 33% pot → BB raise 3× → CO call" },
          { street: "Turn", text: "8h — BB bet 66% pot → CO call" },
          { street: "River", text: "2d — BB bet 66% pot" }
        ],
        teachBack: "XR flop + presión brick: Ad9d story fallida. QQ set; AKo no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","9d"],
          teachBack: "A9s equity story fallida. QQ y AKo no.",
          options: [
            { id: "a", cards: ["Qh","Qs"], label: "QQ", correct: false,
              eliminated: "Set: sizing value; bet lineal en blank extremo es más polar air en esa línea de turn/river." },
            { id: "b", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Sin Q/J/club: no check-raisea QJ two-tone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Ad","9d"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r24-03", "BTN", ["Kh","9s"], ["7d","6d","2c","As","3h"], 24103, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "7d 6d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "As — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3h — BB overbet 125% pot" }
        ],
        teachBack: "Float + overbet blank tras A: 54s OESD fallido. AA value; TT no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h","4h"],
          teachBack: "54s OESD fallido. AA y TT no.",
          options: [
            { id: "a", cards: ["Ac","Ad"], label: "AA", correct: false,
              eliminated: "Nuts A: sizing value; overbet polar tras float pasivo es más draw muerto en esa línea de turn/river." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: no overbetea river air tras call down." },
            { id: "c", cards: ["5h","4h"], label: "54s", correct: true }
          ]
        }
      }),
      LQ("r24-04", "BB", ["Qc","3d"], ["Jh","Ts","4c","2h","8d"], 24104, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Ts 4c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel JT sin mejorar: 9x OESD/Q9 air. JT value; 99 pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9c","7c"],
          teachBack: "97s OESD fallido. JTo y 99 no.",
          options: [
            { id: "a", cards: ["Js","Td"], label: "JTo", correct: false,
              eliminated: "Dos pares: value sizing; barrel “sin miedo a showdown” encaja peor." },
            { id: "b", cards: ["9h","9s"], label: "99", correct: false,
              eliminated: "Underpair: pot-control turn, no triple barrel." },
            { id: "c", cards: ["9c","7c"], label: "97s", correct: true }
          ]
        }
      }),
      LQ("r24-05", "BB", ["8h","5s"], ["Kd","Qd","3c","7s","2c"], 24105, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Kd Qd 3c — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "7s — check-check" },
          { street: "River", text: "2c — BB check → HJ overbet 125% pot" }
        ],
        teachBack: "C-bet + check + overbet: AdXd fallido o JT air. KQo value betearía turn; TT no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","5d"],
          teachBack: "A5s FD fallido delayed overbet. KQo y TT no.",
          options: [
            { id: "a", cards: ["Kh","Qs"], label: "KQo", correct: false,
              eliminated: "Dos pares: betea turn value — check-turn + overbet es polar air/nuts." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Underpair: no overbetea river." },
            { id: "c", cards: ["Ad","5d"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r24-06", "BTN", ["As","9h"], ["8c","7c","2d","Kh","4s"], 24106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8c 7c 2d — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "Kh — BB bet 66% pot → BTN call" },
          { street: "River", text: "4s — BB bet 66% pot" }
        ],
        teachBack: "XR 87cc + bet K scare + river: 9cTc fallido. KK distinto; 55 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Tc","9c"],
          teachBack: "T9s combo XR fallido. KK y 55 no.",
          options: [
            { id: "a", cards: ["Kc","Kd"], label: "KK", correct: false,
              eliminated: "Overpair/set: no suele XR flop bajo y luego “asustar” con K de esa forma — más típico del draw. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: no check-raisea 872 two-tone. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Tc","9c"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r24-07", "BB", ["Qd","6c"], ["Ah","5h","3s","9c","2d"], 24107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 5h 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel A-high hearts miss: KhXh farol. A9 value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","7h"],
          teachBack: "K7s FD fallido. A9o y 77 no.",
          options: [
            { id: "a", cards: ["As","9d"], label: "A9o", correct: false,
              eliminated: "Dos pares: value; barrel de miedo sin hearts hechos es air. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7s","7d"], label: "77", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kh","7h"], label: "K7s", correct: true }
          ]
        }
      }),
      LQ("r24-08", "BB", ["Jc","4h"], ["Td","9d","6s","2c","Kh"], 24108, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Td 9d 6s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "Kh — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Overbet K scare diamonds miss: QdXd/87d fallido. KT value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","5d"],
          teachBack: "Q5s FD fallido overbet. KTo y 88 no.",
          options: [
            { id: "a", cards: ["Kc","Ts"], label: "KTo", correct: false,
              eliminated: "Dos pares: value sizing; overbet de scare es polar — air side en esa línea de turn/river." },
            { id: "b", cards: ["8h","8c"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea K-scare en esa línea de turn/river." },
            { id: "c", cards: ["Qd","5d"], label: "Q5s", correct: true }
          ]
        }
      }),
      LQ("r24-09", "BTN", ["Qh","8c"], ["As","7d","2c","5h","9s"], 24109, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 7d 2c — check-check" },
          { street: "Turn", text: "5h — BB bet 66% pot → BTN call" },
          { street: "River", text: "9s — BB bet 66% pot" }
        ],
        teachBack: "Check flop + donk turn + bet river: 46s/33 rareza o air. AA betearía flop; KJo no donkea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6c","4c"],
          teachBack: "64s gutshot/backdoor → farol. AA y KJo no.",
          options: [
            { id: "a", cards: ["Ah","Ad"], label: "AA", correct: false,
              eliminated: "Premium: c-betea A72 casi siempre. El check-check lo elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Kh","Jd"], label: "KJo", correct: false,
              eliminated: "Sin A/7: no donkea turn tras check flop. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["6c","4c"], label: "64s", correct: true }
          ]
        }
      }),
      LQ("r24-10", "BB", ["9d","3h"], ["Qc","8c","5d","Jh","2s"], 24110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 8c 5d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Jh — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel clubs miss + J: AcXc fallido. QJ value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","4c"],
          teachBack: "A4s FD fallido. QJo y 77 no.",
          options: [
            { id: "a", cards: ["Qd","Js"], label: "QJo", correct: false,
              eliminated: "Dos pares: value; presión sin club hecho es más air en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7c"], label: "77", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","4c"], label: "A4s", correct: true }
          ]
        }
      }),
      LQ("r24-11", "BB", ["Td","6h"], ["Kh","9h","3d","5c","2s"], 24111, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 9h 3d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2s — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet tras hearts: AhXh fallido. K9 value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","7h"],
          teachBack: "A7s FD fallido overbet. K9o y 88 no.",
          options: [
            { id: "a", cards: ["Kc","9c"], label: "K9o", correct: false,
              eliminated: "Dos pares: value sizing; overbet extremo es polar air en esa línea de turn/river." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Ah","7h"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r24-12", "BTN", ["Jc","7d"], ["As","Td","6c","4h","9s"], 24112, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Td 6c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "4h — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "9s — BB bet 66% pot" }
        ],
        teachBack: "Call + raise turn blank + bet: KQ/QJ air. AA distinto; 88 no raise turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo raise turn air. AA y 88 no.",
          options: [
            { id: "a", cards: ["Ah","Ad"], label: "AA", correct: false,
              eliminated: "Premium: raise/bet distinto — raise turn blank tras call es polar air. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: no raisea turn blank. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-25"] = [
      LQ("r25-01", "BB", ["9h","4c"], ["Qd","Jd","5s","2c","8h"], 25101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd Jd 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "8h — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet brick diamonds: TdXd/KT fallido. QJ value; TT pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td","6d"],
          teachBack: "T6s FD fallido. QJo y TT no.",
          options: [
            { id: "a", cards: ["Qh","Js"], label: "QJo", correct: false,
              eliminated: "Dos pares: value; overbet polar en blank es el lado air del espectro en esa línea de turn/river." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Underpair: pot-control, no overbet." },
            { id: "c", cards: ["Td","6d"], label: "T6s", correct: true }
          ]
        }
      }),
      LQ("r25-02", "BB", ["Kc","3d"], ["Ah","8h","4c","7s","2d"], 25102, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah 8h 4c — BB check → CO c-bet 33% pot → BB raise 3× → CO call" },
          { street: "Turn", text: "7s — check-check" },
          { street: "River", text: "2d — BB check → CO bet 66% pot" }
        ],
        teachBack: "XR flop hearts + check turn + bet: KhXh fallido. AA betearía turn; 99 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","5h"],
          teachBack: "K5s XR FD fallido. AA y 99 no.",
          options: [
            { id: "a", cards: ["As","Ad"], label: "AA", correct: false,
              eliminated: "Premium: tras XR suele seguir en turn — check-turn + bet-river es draw muerto. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: no check-raisea A-high. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Kh","5h"], label: "K5s", correct: true }
          ]
        }
      }),
      LQ("r25-03", "BTN", ["Qd","7c"], ["Tc","9s","3h","6d","2c"], 25103, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 9s 3h — BB donk 50% pot → BTN raise 3× → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Donk + call raise + bet river brick: 87s/J8s fallido. TT set; AKo no donkea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h","7h"],
          teachBack: "87s donk equity fallida. TT y AKo no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Set: tras donk+raise suele línea value distinta — bet river brick de “robo” es air. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["Ah","Kd"], label: "AKo", correct: false,
              eliminated: "Sin T/9: no donkea T93. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["8h","7h"], label: "87s", correct: true }
          ]
        }
      }),
      LQ("r25-04", "BB", ["Jh","2s"], ["Kd","7d","5c","9h","3s"], 25104, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 7d 5c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "9h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "3s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel diamonds miss: AdXd farol. K9 value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","4d"],
          teachBack: "A4s FD fallido. K9o y 88 no.",
          options: [
            { id: "a", cards: ["Kc","9c"], label: "K9o", correct: false,
              eliminated: "Dos pares: value; barrel sin diamond es más air. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8c","8h"], label: "88", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ad","4d"], label: "A4s", correct: true }
          ]
        }
      }),
      LQ("r25-05", "BB", ["Tc","5h"], ["Qs","8s","2d","Ah","4c"], 25105, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Qs 8s 2d — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ah — BB check → HJ bet 66% pot → BB call" },
          { street: "River", text: "4c — BB check → HJ overbet 125% pot" }
        ],
        teachBack: "Overbet A scare spades miss: JsXs fallido. AQ value; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js","7s"],
          teachBack: "J7s FD fallido. AQo y 99 no.",
          options: [
            { id: "a", cards: ["Ad","Qc"], label: "AQo", correct: false,
              eliminated: "Dos pares: value; overbet de scare sin spade es polar air en esa línea de turn/river." },
            { id: "b", cards: ["9h","9d"], label: "99", correct: false,
              eliminated: "Underpair: no overbetea A-scare en esa línea de turn/river." },
            { id: "c", cards: ["Js","7s"], label: "J7s", correct: true }
          ]
        }
      }),
      LQ("r25-06", "BTN", ["Kh","6d"], ["Jc","Tc","4h","2s","8d"], 25106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jc Tc 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "8d — BB bet 66% pot" }
        ],
        teachBack: "Call c-bet + check turn + bet river: Q9s/A9s representa — farol. JJ distinto; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","9c"],
          teachBack: "Q9o representa straight — farol. JJ y 99 no.",
          options: [
            { id: "a", cards: ["Jh","Js"], label: "JJ", correct: false,
              eliminated: "Set: betearía turn o sizing distinto — check-turn + bet-river representacional es air." },
            { id: "b", cards: ["9h","9s"], label: "99", correct: false,
              eliminated: "Underpair: no lead river tras check turn. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qd","9c"], label: "Q9o", correct: true }
          ]
        }
      }),
      LQ("r25-07", "BB", ["8c","3h"], ["As","Kd","6h","2c","9d"], 25107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Kd 6h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9d — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Triple barrel AK-high sin showdown: QJ air. AK value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs air blocker. AKo y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Nuts top: value sizing; barrel de “solo quiero fold” encaja peor que QJ air." },
            { id: "b", cards: ["7s","7d"], label: "77", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel AK-high. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r25-08", "BB", ["Td","4s"], ["9h","8h","3c","Ac","2d"], 25108, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "9h 8h 3c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ac — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Overbet tras A scare hearts miss: 7h6h fallido. A9 value; TT pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["7h","6h"],
          teachBack: "76s combo fallido. A9o y TT no.",
          options: [
            { id: "a", cards: ["As","9c"], label: "A9o", correct: false,
              eliminated: "Dos pares: value; overbet scare sin heart es air polar en esa línea de turn/river." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: pot-control al A, no overbet." },
            { id: "c", cards: ["7h","6h"], label: "76s", correct: true }
          ]
        }
      }),
      LQ("r25-09", "BTN", ["As","5c"], ["Qh","7d","2s","Jc","4h"], 25109, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh 7d 2s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Jc — BB donk 50% pot → BTN call" },
          { street: "River", text: "4h — BB bet 66% pot" }
        ],
        teachBack: "Float + donk turn J + bet: T9s gutshot fallido. QQ distinto; KTo no donkea turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th","9h"],
          teachBack: "T9s donk equity fallida. QQ y KTo no.",
          options: [
            { id: "a", cards: ["Qs","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: no donkea turn tras call flop — línea de draw/air. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["Kd","Td"], label: "KTo", correct: false,
              eliminated: "Sin Q/J fuerte para donk: no lidera turn así. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Th","9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r25-10", "BB", ["Jd","6c"], ["Kh","5h","2d","8s","3c"], 25110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 5h 2d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "8s — check-check" },
          { street: "River", text: "3c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet: AhXh fallido. K8 value betearía turn; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","9h"],
          teachBack: "A9s FD fallido delayed. K8o y 77 no.",
          options: [
            { id: "a", cards: ["Kc","8c"], label: "K8o", correct: false,
              eliminated: "Dos pares: betea turn value — check-turn + bet-river es polar air. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no retoma river tras check turn. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Ah","9h"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r25-11", "BB", ["Qc","4d"], ["9s","8d","7c","2h","Ad"], 25111, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "9s 8d 7c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ad — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Straight board + A: 6x air o JT. TT set distinto; A9 value sizing.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","5h"],
          teachBack: "65s OESD/wrap fallido. TTo y A9o no.",
          options: [
            { id: "a", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair/set: value distinto; barrel A en straight board “de miedo” es air. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["As","9c"], label: "A9o", correct: false,
              eliminated: "Top pair A: value; la línea de presión sin nuts de escalera encaja peor que 65s muerto en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["6h","5h"], label: "65s", correct: true }
          ]
        }
      }),
      LQ("r25-12", "BTN", ["Kd","8h"], ["Qc","Jc","5d","3s","9h"], 25112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc Jc 5d — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "3s — BB bet 66% pot → BTN call" },
          { street: "River", text: "9h — BB overbet 125% pot" }
        ],
        teachBack: "XR QJ + overbet 9: AdXd/T8s fallido. QQ set; AKo no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad","Td"],
          teachBack: "ATo FD/backdoor fallido overbet. QQ y AKo no.",
          options: [
            { id: "a", cards: ["Qh","Qs"], label: "QQ", correct: false,
              eliminated: "Set: value; overbet extremo en 9 es polar — air side tras XR de equity en esa línea de turn/river." },
            { id: "b", cards: ["Ah","Kh"], label: "AKo", correct: false,
              eliminated: "Sin Q/J/club: no check-raisea QJ. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Ad","Td"], label: "ATo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-26"] = [
      LQ("r26-01", "BB", ["Jh","6c"], ["As","8d","3c","7h","2s"], 26101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As 8d 3c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "7h — BB check → BTN bet 33% pot → BB call" },
          { street: "River", text: "2s — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Pequeño-pequeño-overbet sin mejora: KQo/QJ blocker farol. A8 value continuo; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo blocker polar farol. A8o y 55 no.",
          options: [
            { id: "a", cards: ["Ah","8c"], label: "A8o", correct: false,
              eliminated: "Dos pares: sizing value estable. El overbet tras tiny bets delata polar air en esa línea de turn/river." },
            { id: "b", cards: ["5h","5d"], label: "55", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r26-02", "BB", ["Td","4h"], ["Kh","9c","5c","2d","8s"], 26102, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 9c 5c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "8s — BB check → CO bet 33% pot" }
        ],
        teachBack: "Triple barrel y river tiny: a menudo air con blocker (AQ) que “cobra thin” falso. K9 value medio; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","Qc"],
          teachBack: "AQc FD fallido + thin fake. K9o y 77 no.",
          options: [
            { id: "a", cards: ["Kd","9d"], label: "K9o", correct: false,
              eliminated: "Dos pares: sizing value medio claro; tiny river tras presión huele a air que no quiere showdown grande." },
            { id: "b", cards: ["7h","7s"], label: "77", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Ac","Qc"], label: "AQs", correct: true }
          ]
        }
      }),
      LQ("r26-03", "BTN", ["9s","9c"], ["Qd","7h","2c","Ad","3s"], 26103, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qd 7h 2c — check-check" },
          { street: "Turn", text: "Ad — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "3s — BB bet 66% pot" }
        ],
        teachBack: "Check flop + raise turn A + bet: JTs/KTs air o rareza. QQ betearía flop; 88 no raise A.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Th"],
          teachBack: "JTs raise turn air. QQ y 88 no.",
          options: [
            { id: "a", cards: ["Qs","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: c-betea Q72. El check-check la saca. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea turn A. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Jh","Th"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r26-04", "BB", ["8d","3c"], ["Js","Ts","4d","6h","2c"], 26104, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Js Ts 4d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "2c — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet en JT spades miss: QsXs/98s fallido. JT value; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs","5s"],
          teachBack: "Q5s FD fallido overbet. JTo y 99 no.",
          options: [
            { id: "a", cards: ["Jh","Td"], label: "JTo", correct: false,
              eliminated: "Dos pares: value; overbet polar en blank es air en esa línea de turn/river." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Qs","5s"], label: "Q5s", correct: true }
          ]
        }
      }),
      LQ("r26-05", "BB", ["Kh","5d"], ["Ac","6c","2h","9s","4d"], 26105, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Ac 6c 2h — BB check → HJ c-bet 33% pot → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "4d — BB check → HJ bet 66% pot" }
        ],
        teachBack: "C-bet + check + bet: QcXc fallido. A9 value betearía turn; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc","7c"],
          teachBack: "Q7s FD fallido delayed. A9o y 77 no.",
          options: [
            { id: "a", cards: ["Ah","9c"], label: "A9o", correct: false,
              eliminated: "Dos pares: betea turn — check-turn + bet-river es polar air. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no retoma river. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qc","7c"], label: "Q7s", correct: true }
          ]
        }
      }),
      LQ("r26-06", "BTN", ["Qd","6c"], ["8h","7h","3s","Kd","2c"], 26106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8h 7h 3s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet 66% pot → BB raise 3× → BTN call" },
          { street: "River", text: "2c — BB bet 66% pot" }
        ],
        teachBack: "Call c-bet + raise turn K + bet: 9hXh fallido. KK distinto; ATo no raise K.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h","6h"],
          teachBack: "96s combo raise turn fallido. KK y ATo no.",
          options: [
            { id: "a", cards: ["Kh","Kc"], label: "KK", correct: false,
              eliminated: "Overpair: raise/bet distinto — raise turn scare tras call es polar draw/air. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "b", cards: ["As","Td"], label: "ATo", correct: false,
              eliminated: "Sin K/8/heart: no raisea turn K. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["9h","6h"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r26-07", "BB", ["Jc","3h"], ["Qs","Td","5s","2h","9c"], 26107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs Td 5s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9c — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Llega 9 (straight) + bet: K8/J8 representa — farol. QT value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","8h"],
          teachBack: "K8s representa escalera — farol. QTo y 88 no.",
          options: [
            { id: "a", cards: ["Qh","Tc"], label: "QTo", correct: false,
              eliminated: "Dos pares: value; bet representacional de nuts de escalera es más air en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["8c","8d"], label: "88", correct: false,
              eliminated: "Underpair: no betea river straight board por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Kh","8h"], label: "K8s", correct: true }
          ]
        }
      }),
      LQ("r26-08", "BB", ["9d","5c"], ["Ah","Jh","4s","7c","2d"], 26108, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Ah Jh 4s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "7c — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "2d — BB check → CO overbet 125% pot" }
        ],
        teachBack: "Overbet hearts miss: KhXh fallido. AJ value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","6h"],
          teachBack: "K6s FD fallido. AJo y 88 no.",
          options: [
            { id: "a", cards: ["As","Jd"], label: "AJo", correct: false,
              eliminated: "Dos pares: value; overbet sin heart es polar air en esa línea de turn/river." },
            { id: "b", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Kh","6h"], label: "K6s", correct: true }
          ]
        }
      }),
      LQ("r26-09", "BTN", ["Ac","7d"], ["Kd","8c","3h","5s","Ts"], 26109, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kd 8c 3h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Ts — BB bet 33% pot" }
        ],
        teachBack: "Float + tiny river: QJ/JT air fingiendo thin. K8 value medio; 99 no tiny.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs air thin-fake. K8o y 99 no.",
          options: [
            { id: "a", cards: ["Kh","8h"], label: "K8o", correct: false,
              eliminated: "Dos pares: sizing value medio/claro, no tiny de vergüenza en esa línea de turn/river." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: no lead tiny river tras float. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r26-10", "BB", ["Td","3s"], ["Qc","9c","2h","6d","4s"], 26110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qc 9c 2h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4s — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel clubs miss: AcXc farol. Q6 value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","5c"],
          teachBack: "A5s FD fallido. Q6o y 77 no.",
          options: [
            { id: "a", cards: ["Qh","6h"], label: "Q6o", correct: false,
              eliminated: "Dos pares: value; barrel sin club es air. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","5c"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r26-11", "BB", ["Jh","4c"], ["8s","7d","2c","Ah","5h"], 26111, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "8s 7d 2c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ah — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "5h — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet tras A + 5 (straight complete para 64/96): a menudo 96s muerto que representa. A8 value; TT no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9c","6c"],
          teachBack: "96s representa escalera — farol. A8o y TT no.",
          options: [
            { id: "a", cards: ["As","8h"], label: "A8o", correct: false,
              eliminated: "Dos pares: value; overbet representacional de nuts de escalera es air en esa línea de turn/river." },
            { id: "b", cards: ["Th","Tc"], label: "TT", correct: false,
              eliminated: "Overpair: pot-control al A, no overbet de historia." },
            { id: "c", cards: ["9c","6c"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r26-12", "BTN", ["Kd","5c"], ["Jh","Tc","4s","2d","8c"], 26112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jh Tc 4s — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "8c — BB bet 66% pot" }
        ],
        teachBack: "XR flop + check turn + bet: Q9s/A9s fallido. JJ distinto; 99 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","9h"],
          teachBack: "Q9s XR equity fallida. JJ y 99 no.",
          options: [
            { id: "a", cards: ["Js","Jd"], label: "JJ", correct: false,
              eliminated: "Set: tras XR suele betear turn — check-turn + bet-river es draw muerto. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["9c","9d"], label: "99", correct: false,
              eliminated: "Underpair: no check-raisea JT4. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Qh","9h"], label: "Q9s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-27"] = [
      LQ("r27-01", "BB", ["Qc","5h"], ["As","Td","6c","3h","9s"], 27101, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Td 6c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet 33% pot → BB call" },
          { street: "River", text: "9s — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Tiny-tiny-overbet A-high: KQo blocker farol. AT value continuo; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh","Qs"],
          teachBack: "KQo polar blocker farol. ATo y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Tc"], label: "ATo", correct: false,
              eliminated: "Dos pares: sizing value estable. Overbet tras tiny delata polar air en esa línea de turn/river." },
            { id: "b", cards: ["7h","7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Kh","Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r27-02", "BB", ["8c","4d"], ["Kh","7h","2s","Jc","5d"], 27102, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 7h 2s — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Jc — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "5d — BB check → CO bet 33% pot" }
        ],
        teachBack: "Triple + tiny river: AhXh fallido fingiendo thin. KJ value medio; 99 no tiny.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","6h"],
          teachBack: "A6s FD fallido thin-fake. KJo y 99 no.",
          options: [
            { id: "a", cards: ["Kc","Js"], label: "KJo", correct: false,
              eliminated: "Dos pares: sizing value claro, no tiny de vergüenza en river." },
            { id: "b", cards: ["9h","9s"], label: "99", correct: false,
              eliminated: "Underpair: pot-control, no triple + tiny. La secuencia de sizings no encaja con value de este combo." },
            { id: "c", cards: ["Ah","6h"], label: "A6s", correct: true }
          ]
        }
      }),
      LQ("r27-03", "BTN", ["Ad","8h"], ["Qs","9d","3c","5h","2s"], 27103, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qs 9d 3c — check-check" },
          { street: "Turn", text: "5h — BB bet 66% pot → BTN call" },
          { street: "River", text: "2s — BB overbet 125% pot" }
        ],
        teachBack: "Check flop + bet turn + overbet: JT/T8 air. QQ betearía flop; 77 no overbetea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh","Th"],
          teachBack: "JTs air overbet. QQ y 77 no.",
          options: [
            { id: "a", cards: ["Qh","Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: c-betea Q93. Check-check lo elimina. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["7c","7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea tras lead turn." },
            { id: "c", cards: ["Jh","Th"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r27-04", "BB", ["Td","6c"], ["Jd","8d","4h","2c","9s"], 27104, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd 8d 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "9s — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet 9 (straight complete): QTs/T7s representa o FD muerto. J9 value; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd","5d"],
          teachBack: "Q5s FD fallido + representa. J9o y 77 no.",
          options: [
            { id: "a", cards: ["Jh","9h"], label: "J9o", correct: false,
              eliminated: "Dos pares: value; overbet de “tengo la escalera” es air/FD muerto en esa línea de turn/river." },
            { id: "b", cards: ["7h","7s"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Qd","5d"], label: "Q5s", correct: true }
          ]
        }
      }),
      LQ("r27-05", "HJ", ["Kh","3c"], ["Ac","7c","2d","5s","9h"], 27105, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open 2,2 bb → BB call" },
          { street: "Flop", text: "Ac 7c 2d — BB check → HJ c-bet 33% pot → BB raise 3× → HJ call" },
          { street: "Turn", text: "5s — BB bet 66% pot → HJ call" },
          { street: "River", text: "9h — BB bet 66% pot" }
        ],
        teachBack: "XR A7cc + barrels brick: QcXc/64s fallido. AA distinto; 88 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc","6c"],
          teachBack: "Q6s XR FD fallido. AA y 88 no.",
          options: [
            { id: "a", cards: ["Ah","As"], label: "AA", correct: false,
              eliminated: "Premium: tras XR sizing value — presión lineal en blanks es más draw muerto en esa línea de turn/river." },
            { id: "b", cards: ["8h","8d"], label: "88", correct: false,
              eliminated: "Underpair: no check-raisea A-high. El raise 3× exige equity fuerte; este combo no justifica ese sizing." },
            { id: "c", cards: ["Qc","6c"], label: "Q6s", correct: true }
          ]
        }
      }),
      LQ("r27-06", "BTN", ["Qs","4h"], ["Tc","9c","5d","2h","Kd"], 27106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 9c 5d — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "Kd — BB bet 66% pot" }
        ],
        teachBack: "Call + check + bet K scare: JcXc fallido. TT distinto; AJo no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jc","8c"],
          teachBack: "J8s FD fallido + scare. TT y AJo no.",
          options: [
            { id: "a", cards: ["Th","Ts"], label: "TT", correct: false,
              eliminated: "Set: betearía turn — check-turn + bet-river scare es draw muerto. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "b", cards: ["Ah","Jd"], label: "AJo", correct: false,
              eliminated: "Sin T/9/club: no llega a esa presión de scare en esa línea de turn/river. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair." },
            { id: "c", cards: ["Jc","8c"], label: "J8s", correct: true }
          ]
        }
      }),
      LQ("r27-07", "BB", ["9c","3d"], ["Qh","Jh","6s","2c","4d"], 27107, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Qh Jh 6s — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "4d — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "Overbet hearts miss: AhXh/T9s fallido. QJ value; 88 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah","5h"],
          teachBack: "A5s FD fallido. QJo y 88 no.",
          options: [
            { id: "a", cards: ["Qs","Jd"], label: "QJo", correct: false,
              eliminated: "Dos pares: value; overbet sin heart es polar air en esa línea de turn/river." },
            { id: "b", cards: ["8h","8s"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Ah","5h"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r27-08", "BB", ["Td","5h"], ["8d","7s","3c","Ac","2h"], 27108, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open 2,5 bb → BB call" },
          { street: "Flop", text: "8d 7s 3c — BB check → CO c-bet 33% pot → BB call" },
          { street: "Turn", text: "Ac — BB check → CO bet 66% pot → BB call" },
          { street: "River", text: "2h — BB check → CO bet 66% pot" }
        ],
        teachBack: "OESD + A: 65s/9T farol. A8 value; 99 pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h","5c"],
          teachBack: "65o OESD fallido. A8o y 99 no.",
          options: [
            { id: "a", cards: ["As","8h"], label: "A8o", correct: false,
              eliminated: "Dos pares: value sizing; barrel de robo encaja peor." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Overpair: pot-control al A. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["6h","5c"], label: "65o", correct: true }
          ]
        }
      }),
      LQ("r27-09", "BTN", ["Kh","9c"], ["Jd","Tc","4h","6s","2d"], 27109, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Jd Tc 4h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "6s — BB donk 50% pot → BTN call" },
          { street: "River", text: "2d — BB overbet 125% pot" }
        ],
        teachBack: "Float + donk turn + overbet: Q9s/98s fallido. JJ distinto; AQo no donkea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","9h"],
          teachBack: "Q9s donk equity fallida. JJ y AQo no.",
          options: [
            { id: "a", cards: ["Js","Jh"], label: "JJ", correct: false,
              eliminated: "Set: no donkea turn tras call — línea de draw/air. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "b", cards: ["Ah","Qd"], label: "AQo", correct: false,
              eliminated: "Sin J/T: no donkea turn. El overbet river (125% pot) pide polarización: nuts o farol, no value medio." },
            { id: "c", cards: ["Qh","9h"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r27-10", "BB", ["8h","3s"], ["As","Kd","9c","5h","2c"], 27110, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "As Kd 9c — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "5h — check-check" },
          { street: "River", text: "2c — BB check → BTN overbet 125% pot" }
        ],
        teachBack: "C-bet + check + overbet AK9: QJ blocker farol. AK value betearía turn; 77 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs blocker polar farol. AKo y 77 no.",
          options: [
            { id: "a", cards: ["Ah","Kc"], label: "AKo", correct: false,
              eliminated: "Nuts: betea turn value — check-turn + overbet es polar air." },
            { id: "b", cards: ["7d","7c"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea en esa línea de turn/river." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r27-11", "BB", ["Jd","4c"], ["Tc","6c","5h","2s","Qd"], 27111, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Tc 6c 5h — BB check → BTN c-bet 33% pot → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet 66% pot → BB call" },
          { street: "River", text: "Qd — BB check → BTN bet 66% pot" }
        ],
        teachBack: "Barrel clubs miss + Q: AcXc/87 fallido. TQ value; 99 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac","8c"],
          teachBack: "A8s FD fallido. QTo y 99 no.",
          options: [
            { id: "a", cards: ["Qh","Ts"], label: "QTo", correct: false,
              eliminated: "Dos pares: value; presión sin club es air en esa línea de turn/river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "b", cards: ["9h","9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control, no triple barrel. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor." },
            { id: "c", cards: ["Ac","8c"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r27-12", "BTN", ["Ah","6d"], ["Kh","9h","3c","7s","2d"], 27112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open 2,5 bb → BB call" },
          { street: "Flop", text: "Kh 9h 3c — BB check-raise 3× → BTN call" },
          { street: "Turn", text: "7s — check-check" },
          { street: "River", text: "2d — BB overbet 125% pot" }
        ],
        teachBack: "XR hearts + check turn + overbet: QhJh fallido. KK betearía turn; 88 no XR.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh","Jh"],
          teachBack: "QJs XR FD fallido overbet. KK y 88 no.",
          options: [
            { id: "a", cards: ["Kc","Kd"], label: "KK", correct: false,
              eliminated: "Overpair/set: tras XR suele betear turn — check + overbet brick es draw muerto." },
            { id: "b", cards: ["8c","8h"], label: "88", correct: false,
              eliminated: "Underpair: no check-raisea K93 two-tone." },
            { id: "c", cards: ["Qh","Jh"], label: "QJs", correct: true }
          ]
        }
      })
  ];

  /* Examen M2: mezcla lectura + faroles (spots de R-07 y R-22) */
  PACKS['R-29'] = (PACKS['R-07'] || []).slice(0, 6).concat((PACKS['R-22'] || []).slice(0, 6)).map(function (sp, i) {
    var copy = Object.assign({}, sp);
    copy.id = 'r29-' + String(i + 1).padStart(2, '0');
    if (copy.seed) copy.seed = 79000 + i + 1;
    return copy;
  });

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
