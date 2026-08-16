/*
 * school-data-ranges-line.js — Rangos M2–M4: lectura de línea + quiz villano (R-07…R-21).
 * Cargar tras school-data-practice.js. Mismo patrón que R-05.
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
      LQ("r07-01", "BTN", ["Ah", "Qd"], ["Jc", "7d", "2s", "9h", "3c"], 77001, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc 7d 2s — BB check → BTN c-bet → BB check-raise → BTN call" },
          { street: "Turn", text: "9h — BB bet → BTN call" },
          { street: "River", text: "3c — BB bet" }
        ],
        teachBack: "Check-raise flop + barrels: set de jotas. AKo y TT defienden BB pero no raisean J72 por value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Js"],
          teachBack: "JJ (set) explica el check-raise. AKo sin pareja no raisea; TT underpair tampoco.",
          options: [
            { id: "a", cards: ["As", "Kh"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero sin pareja/draw en J72: call o fold, no check-raise por value en flop." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Underpair jugable en call: no check-raisea flop polar sin set ni equity clara." },
            { id: "c", cards: ["Jh", "Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r07-02", "BB", ["Kd", "Qs"], ["9h", "8c", "2d", "Ad", "4c"], 77002, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB donk bet → BTN call" },
          { street: "Turn", text: "Ad — BB bet → BTN call" },
          { street: "River", text: "4c — BB bet" }
        ],
        teachBack: "Donk flop + presión: set de nueves. KQo y ATs check-callearian; no lideran 982.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9s", "9d"],
          teachBack: "99 (set) cuadra el donk. KQo y ATs no donkean ese flop por value.",
          options: [
            { id: "a", cards: ["Kh", "Qc"], label: "KQo", correct: false,
              eliminated: "Defiende BB, pero sin 9/8 en 982: check-call, no donk flop por value." },
            { id: "b", cards: ["9s", "9d"], label: "99", correct: true },
            { id: "c", cards: ["Ac", "Ts"], label: "ATs", correct: false,
              eliminated: "Call BB estándar; en 982 sin pareja suele checkear flop, no donkear tres calles." }
          ]
        }
      }),
      LQ("r07-03", "BB", ["Ah", "Jd"], ["Tc", "6s", "3h", "2d", "Kd"], 77003, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Tc 6s 3h — BB check → CO c-bet → BB raise → CO call" },
          { street: "Turn", text: "2d — BB bet → CO call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Raise flop T63 + barrels: set de dieces. QQ flats distinto; AKo no raisea sin T.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "Td"],
          teachBack: "TT set: raise flop limpio. QQ a menudo flats; AKo no raisea T63.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet rival a menudo flats o raisea turn — raise flop + barrels es más típico de set." },
            { id: "b", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero en T63 sin pareja: call/fold, no raise polar de flop." },
            { id: "c", cards: ["Th", "Td"], label: "TT", correct: true }
          ]
        }
      }),
      LQ("r07-04", "BTN", ["Qh", "Js"], ["8d", "8c", "4h", "2s", "Kd"], 77004, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8d 8c 4h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB raise → BTN call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Call flop + raise turn en paired: full de ochos. AKo no raisea turn; JJ pot-controla.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "8s"],
          teachBack: "88 full: call flop lento y raise turn. AKo y JJ no construyen esa línea.",
          options: [
            { id: "a", cards: ["Ac", "Kh"], label: "AKo", correct: false,
              eliminated: "Call flop posible con backdoors, pero raise turn en 884 sin equity: suele fold o call light." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair al 4: a menudo betea o flats turn; raise turn polar tras call flop encaja peor que el set." },
            { id: "c", cards: ["8h", "8s"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r07-05", "BB", ["Ad", "9d"], ["7h", "5c", "2s", "Td", "Qc"], 77005, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7h 5c 2s — check-check" },
          { street: "Turn", text: "Td — BB check → BTN bet → BB call" },
          { street: "River", text: "Qc — BB check → BTN bet" }
        ],
        teachBack: "Check flop + delayed barrel: set de cincos. AA betearía flop; KQo no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h", "5d"],
          teachBack: "55 set: slowplay + delayed value. AA no checkea; KQo no barrela turn+river.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en board bajo casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["Kh", "Qs"], label: "KQo", correct: false,
              eliminated: "Open late OK; sin 7/5, tras check-check el delayed barrel turn+river no es value natural." },
            { id: "c", cards: ["5h", "5d"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r07-06", "BTN", ["Kh", "Td"], ["Qs", "6c", "3d", "2h", "9c"], 77006, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs 6c 3d — BB check-raise → BTN call" },
          { street: "Turn", text: "2h — BB bet → BTN call" },
          { street: "River", text: "9c — BB bet" }
        ],
        teachBack: "Check-raise Q63: set de damas. AJs sin Q no raisea; 77 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Qd"],
          teachBack: "QQ set: check-raise value. AJs y 77 no polarizan ese flop.",
          options: [
            { id: "a", cards: ["As", "Js"], label: "AJs", correct: false,
              eliminated: "Defiende BB, pero sin Q/6 en Q63: call o fold, no check-raise por value." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: call posible, raise flop polar sin set ni draw claro es raro." },
            { id: "c", cards: ["Qh", "Qd"], label: "QQ", correct: true }
          ]
        }
      }),
      LQ("r07-07", "BB", ["Jc", "Ts"], ["4h", "4d", "9s", "Kc", "2c"], 77007, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "4h 4d 9s — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "Kc — BB check → HJ bet → BB call" },
          { street: "River", text: "2c — BB check → HJ bet" }
        ],
        teachBack: "Triple barrel en paired bajo: full de cuatros. 66 pot-controla; ATo sin 4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["4s", "4c"],
          teachBack: "44 full: triple barrel limpio. 66 y ATo no.",
          options: [
            { id: "a", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Open + c-bet flop posible, pero underpair en paired board: pot-control turn, no triple barrel." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Open HJ y c-bet aire OK, pero barrel turn K y river sin 4: no es value de tres calles." },
            { id: "c", cards: ["4s", "4c"], label: "44", correct: true }
          ]
        }
      }),
      LQ("r07-08", "BTN", ["As", "8s"], ["Kd", "Jh", "5c", "3h", "2d"], 77008, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd Jh 5c — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "3h — BB bet → BTN call" },
          { street: "River", text: "2d — BB bet" }
        ],
        teachBack: "Raise flop KJ5: set de jotas. AQo sin pareja no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Jc"],
          teachBack: "JJ set: raise flop. AQo y TT no construyen raise + barrels.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB frecuente; en KJ5 sin pareja/draw fuerte: call o fold, no raise polar." },
            { id: "b", cards: ["Th", "Td"], label: "TT", correct: false,
              eliminated: "Underpair defendible en call: rara vez raisea flop sin set." },
            { id: "c", cards: ["Js", "Jc"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r07-09", "BB", ["Qd", "9c"], ["6s", "6h", "Tc", "Ad", "3c"], 77009, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "6s 6h Tc — check-check" },
          { street: "Turn", text: "Ad — BB check → BTN bet → BB call" },
          { street: "River", text: "3c — BB check → BTN bet" }
        ],
        teachBack: "Check flop paired + delayed: full de seises. KK betearía flop; QJs sin 6 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6d", "6c"],
          teachBack: "66 full tras slowplay. KK no checkea; QJs no barrela Ad+river.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "En board paired medio casi siempre c-betea flop. Check-check lo saca." },
            { id: "b", cards: ["Qs", "Jh"], label: "QJs", correct: false,
              eliminated: "Open late OK; sin 6, tras check-check el barrel turn as + river no es value creíble." },
            { id: "c", cards: ["6d", "6c"], label: "66", correct: true }
          ]
        }
      }),
      LQ("r07-10", "BTN", ["Th", "9h"], ["8c", "3d", "3s", "Ah", "7c"], 77010, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8c 3d 3s — BB donk → BTN call" },
          { street: "Turn", text: "Ah — BB bet → BTN call" },
          { street: "River", text: "7c — BB bet" }
        ],
        teachBack: "Donk en 833: full de treses. AKo y JTs no donkean ese flop.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["3h", "3c"],
          teachBack: "33 full: donk value. AKo y JTs check-callearian.",
          options: [
            { id: "a", cards: ["As", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB, pero en 833 sin 3/8: check-call, no donk flop por value." },
            { id: "b", cards: ["3h", "3c"], label: "33", correct: true },
            { id: "c", cards: ["Jd", "Td"], label: "JTs", correct: false,
              eliminated: "Call BB OK; sin trío en flop 833 suele checkear, no liderar y meter tres calles." }
          ]
        }
      }),
      LQ("r07-11", "BB", ["Kh", "7d"], ["Jh", "Jc", "4s", "2d", "9c"], 77011, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Jh Jc 4s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet → BB call" },
          { street: "River", text: "9c — BB check → CO bet" }
        ],
        teachBack: "Triple barrel en JJ4: full de jotas. 88 pot-controla; A9o sin J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Jd"],
          teachBack: "JJ full: presión limpia. 88 y A9o no.",
          options: [
            { id: "a", cards: ["8h", "8s"], label: "88", correct: false,
              eliminated: "Open + c-bet posible, pero underpair al board paired: pot-control turn, no triple barrel." },
            { id: "b", cards: ["As", "9d"], label: "A9o", correct: false,
              eliminated: "Puede abrir CO y c-bet, pero sin J: tras call flop no mete tres calles por valor." },
            { id: "c", cards: ["Js", "Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r07-12", "BTN", ["Ad", "Td"], ["5h", "5c", "Kd", "Qs", "2h"], 77012, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "5h 5c Kd — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Qs — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Raise flop 55K: full de cincos. AQo sin 5 no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5s", "5d"],
          teachBack: "55 full: raise flop. AQo y TT no polarizan así.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB OK; en 55K sin 5: call/fold al c-bet, no raise polar." },
            { id: "b", cards: ["Th", "Tc"], label: "TT", correct: false,
              eliminated: "Underpair al K: flats o folds; raise flop sin full es raro." },
            { id: "c", cards: ["5s", "5d"], label: "55", correct: true }
          ]
        }
      })
  ];

  PACKS["R-08"] = [
      LQ("r08-01", "BTN", ["Kd", "Jh"], ["As", "Kh", "7c", "4h", "2d"], 77101, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Kh 7c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "4h — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB bet grande" }
        ],
        teachBack: "Float dos calles + bet grande river: dos pares A7. QQ raisearía antes; QJs no mete river grande.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "7s"],
          teachBack: "A7s dos pares: float y presión river. QQ raisea antes; QJs no.",
          options: [
            { id: "a", cards: ["Qc", "Qd"], label: "QQ", correct: false,
              eliminated: "Defiende y puede call flop, pero con overpair suele raisear flop/turn: float pasivo + bet grande river es raro." },
            { id: "b", cards: ["Qs", "Js"], label: "QJs", correct: false,
              eliminated: "Call BB OK; float flop posible, pero en AsKh7 sin showdown fuerte no mete bet grande de river." },
            { id: "c", cards: ["Ah", "7s"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r08-02", "BB", ["9h", "9c"], ["Qd", "Jc", "2h", "5s", "Qc"], 77102, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qd Jc 2h — check-check" },
          { street: "Turn", text: "5s — BB check → BTN bet → BB call" },
          { street: "River", text: "Qc — BB check → BTN bet" }
        ],
        teachBack: "Delayed barrel + Q river: dos pares QJ. AA betearía flop; T8s no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jh"],
          teachBack: "QJs dos pares al river Q. AA no checkea flop; T8s no.",
          options: [
            { id: "a", cards: ["Ac", "Ah"], label: "AA", correct: false,
              eliminated: "Premium: en Q-high casi siempre c-betea flop. El check-check la saca." },
            { id: "b", cards: ["Qs", "Jh"], label: "QJs", correct: true },
            { id: "c", cards: ["Td", "8d"], label: "T8s", correct: false,
              eliminated: "Open OK; sin Q/J fuerte, delayed barrel turn+river tras check-check no es value limpio." }
          ]
        }
      }),
      LQ("r08-03", "BB", ["Ah", "Kd"], ["Ts", "9c", "2d", "Th", "3s"], 77103, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Ts 9c 2d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "Th — BB check → CO bet → BB call" },
          { street: "River", text: "3s — BB check → CO bet" }
        ],
        teachBack: "Barrel tras T paired: dos pares T9. KK suele betear distinto; 88 underpair no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td", "9h"],
          teachBack: "T9s dos pares: triple barrel. KK y 88 no encajan igual.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet a menudo raisea o pot-controla distinto — call flop + bet turn paired + river es más de dos pares." },
            { id: "b", cards: ["8h", "8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn cuando el board parea el T, no triple barrel value." },
            { id: "c", cards: ["Td", "9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r08-04", "BTN", ["Qh", "Qs"], ["Jd", "Tc", "3h", "2s", "8d"], 77104, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jd Tc 3h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2s — BB bet → BTN call" },
          { street: "River", text: "8d — BB bet" }
        ],
        teachBack: "Raise flop JT3: dos pares JT. AKo y 88 no raisean ese flop por value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Th"],
          teachBack: "JTs dos pares: raise flop. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ac", "Kd"], label: "AKo", correct: false,
              eliminated: "Call BB frecuente, pero en JT3 sin pareja/draw fuerte: call o fold, no raise polar." },
            { id: "b", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair defendible en call: rara vez raisea flop sin set ni draw claro." },
            { id: "c", cards: ["Jh", "Th"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r08-05", "BB", ["Kc", "7c"], ["Ah", "Kd", "6s", "6h", "2c"], 77105, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah Kd 6s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "6h — check-check" },
          { street: "River", text: "2c — BB check → BTN bet" }
        ],
        teachBack: "C-bet flop + check turn paired + bet river: Ax full. QQ suele betear turn; QJo sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "9s"],
          teachBack: "A9s full de seises, river thin. QQ betearía turn; QJo sin as no.",
          options: [
            { id: "a", cards: ["Qh", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet flop suele seguir en turn aunque parea. Check-turn + bet-river encaja peor." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Puede abrir y c-bet aire, pero sin as: tras check turn el river bet no es value creíble." },
            { id: "c", cards: ["As", "9s"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r08-06", "BTN", ["9d", "8d"], ["Kh", "9c", "8s", "2h", "Ad"], 77106, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kh 9c 8s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2h — BB bet → BTN call" },
          { street: "River", text: "Ad — BB bet" }
        ],
        teachBack: "Raise flop K98: dos pares 98. AJo sin conexión no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "8c"],
          teachBack: "98s dos pares: raise flop. AJo y TT no.",
          options: [
            { id: "a", cards: ["As", "Jh"], label: "AJo", correct: false,
              eliminated: "Defiende BB; en K98 sin 9/8: call/fold, no raise polar de flop." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Underpair al K: flats o folds — no raisea flop sin set." },
            { id: "c", cards: ["9h", "8c"], label: "98s", correct: true }
          ]
        }
      }),
      LQ("r08-07", "BB", ["Jh", "Td"], ["Qc", "Js", "4d", "4h", "2s"], 77107, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Qc Js 4d — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "4h — BB check → HJ bet → BB call" },
          { street: "River", text: "2s — BB check → HJ bet" }
        ],
        teachBack: "Barrel tras 4 paired: QJ dos pares. 99 pot-controla; ATo sin Q/J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd", "Jc"],
          teachBack: "QJo dos pares → full de cuatros. 99 y ATo no barrela tres calles igual.",
          options: [
            { id: "a", cards: ["9s", "9c"], label: "99", correct: false,
              eliminated: "Open + c-bet posible; underpair cuando parea el 4: pot-control, no triple barrel." },
            { id: "b", cards: ["Ah", "Ts"], label: "ATo", correct: false,
              eliminated: "Puede c-bet flop, pero sin Q/J: tras board paired no mete tres calles por valor." },
            { id: "c", cards: ["Qd", "Jc"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r08-08", "BTN", ["Ad", "5d"], ["Ts", "Th", "5c", "Kd", "2h"], 77108, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ts Th 5c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet → BB raise → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Call flop + raise turn K: full 55. AKo aire no raisea turn; JJ raisearía antes.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h", "5s"],
          teachBack: "55 full: raise turn. AKo y JJ no construyen esa línea.",
          options: [
            { id: "a", cards: ["Ac", "Kh"], label: "AKo", correct: false,
              eliminated: "Float flop posible, pero raise turn al K sin 5/T: farol raro — suele call o fold." },
            { id: "b", cards: ["Jc", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: a menudo raisea flop o betea turn; call flop + raise turn K es más de full lento." },
            { id: "c", cards: ["5h", "5s"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r08-09", "BB", ["8h", "7h"], ["As", "8c", "7d", "3s", "2c"], 77109, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 8c 7d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "3s — BB bet → BTN call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Raise flop A87: dos pares 87. KK flats distinto; QJo sin 8/7 no raisea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8s", "7c"],
          teachBack: "87s dos pares: raise flop. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair al A: flats o raisea sizing distinto — raise flop + barrels es más típico de dos pares." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Call BB OK; en A87 sin 8/7: no raisea flop por value." },
            { id: "c", cards: ["8s", "7c"], label: "87s", correct: true }
          ]
        }
      }),
      LQ("r08-10", "BTN", ["Qc", "Jd"], ["Kh", "Qd", "Jc", "4s", "9h"], 77110, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kh Qd Jc — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "4s — BB check → BTN bet → BB call" },
          { street: "River", text: "9h — BB bet" }
        ],
        teachBack: "Float + bet river en KQJ: dos pares QJ. AA betearía distinto; T9s sin dos pares no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jh"],
          teachBack: "QJs dos pares: float y river. AA y T9s no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "En KQJ connected casi siempre betea o raisea antes: float pasivo + bet river es raro para AA." },
            { id: "b", cards: ["Ts", "9s"], label: "T9s", correct: false,
              eliminated: "Call flop con gutshot posible, pero sin dos pares en river: no apuesta river por value tras float." },
            { id: "c", cards: ["Qs", "Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r08-11", "BB", ["Ad", "2d"], ["9h", "6c", "6d", "9s", "Kc"], 77111, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "9h 6c 6d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "Kc — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn double paired + bet river: full de nueves. QQ suele betear turn; JTo no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9c", "9d"],
          teachBack: "99 full boat: línea lenta. QQ betea turn; JTo no cobra river.",
          options: [
            { id: "a", cards: ["Qh", "Qs"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn aunque parea. Check-turn + bet-river encaja peor que el boat." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin 9/6: tras check turn el river bet no es value." },
            { id: "c", cards: ["9c", "9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r08-12", "BTN", ["Th", "8h"], ["Ad", "Tc", "8s", "5h", "2c"], 77112, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ad Tc 8s — BB check-raise → BTN call" },
          { street: "Turn", text: "5h — BB bet → BTN call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Check-raise A-high con T8: dos pares. KQo y 77 no raisean AT8.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td", "8c"],
          teachBack: "T8s dos pares: check-raise. KQo y 77 no.",
          options: [
            { id: "a", cards: ["Kh", "Qs"], label: "KQo", correct: false,
              eliminated: "Defiende BB; en AT8 sin T/8: call/fold, no check-raise por value." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: call posible, raise flop polar sin dos pares es raro." },
            { id: "c", cards: ["Td", "8c"], label: "T8s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-09"] = [
      LQ("r09-01", "BB", ["Kh", "Qd"], ["As", "9s", "2s", "7c", "3d"], 77201, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 9s 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "7c — BB check → BTN bet → BB call" },
          { street: "River", text: "3d — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel en monotone de picas: color hecho (JsTs). KK sin picas pot-controla; AQo sin flush no barrela tres calles por value de color.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Ts"],
          teachBack: "JsTs color: triple barrel. KK sin flush y AQo sin picas no.",
          options: [
            { id: "a", cards: ["Kc", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin picas: en flop monotone suele pot-controlar turn, no triple barrel como si tuviera el color." },
            { id: "b", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Open + c-bet con as posible, pero sin color en monotone: tras call flop no mete tres calles de value de flush." },
            { id: "c", cards: ["Js", "Ts"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r09-02", "BTN", ["Ad", "Kd"], ["8h", "6h", "2h", "Qc", "5s"], 77202, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8h 6h 2h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Qc — BB bet → BTN call" },
          { street: "River", text: "5s — BB bet" }
        ],
        teachBack: "Raise flop monotone corazones: color AhXh o 9h7h. AKo rainbow no raisea; 99 sin heart tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "7h"],
          teachBack: "97s color: raise flop. AKo y 99 sin heart no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB OK; en 862 hearts sin heart: call/fold al c-bet, no raise polar de color." },
            { id: "b", cards: ["9c", "9d"], label: "99", correct: false,
              eliminated: "Overpair sin flush: flats o folds — no raisea flop monotone sin el color." },
            { id: "c", cards: ["9h", "7h"], label: "97s", correct: true }
          ]
        }
      }),
      LQ("r09-03", "BB", ["Tc", "9c"], ["Kd", "Jd", "4d", "2s", "8h"], 77203, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kd Jd 4d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "8h — BB check → CO bet" }
        ],
        teachBack: "C-bet flop diamonds + check turn + bet river: color AdXd thin. QQ sin diamond suele betear turn; QJs sin flush no cobra river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "Td"],
          teachBack: "ATo color de diamantes. QQ y QJs sin diamond no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: tras c-bet suele seguir en turn o checkear river — check-turn + bet-river de flush no encaja." },
            { id: "b", cards: ["Qc", "Jh"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin diamond: tras check turn el river bet no es value de color." },
            { id: "c", cards: ["Ad", "Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r09-04", "BTN", ["Qh", "Js"], ["Ac", "7c", "3c", "9d", "2h"], 77204, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ac 7c 3c — BB donk → BTN call" },
          { street: "Turn", text: "9d — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Donk en monotone clubs: color KcXc. AKo sin club no donkea; JTs sin club tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "Tc"],
          teachBack: "KTo color: donk value. AKo y JTs sin club no.",
          options: [
            { id: "a", cards: ["Ah", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en A73 clubs sin club: check-call, no donk flop por value de color." },
            { id: "b", cards: ["Kc", "Tc"], label: "KTo", correct: true },
            { id: "c", cards: ["Jd", "Td"], label: "JTo", correct: false,
              eliminated: "En flop: Call BB OK; sin club en monotone suele checkear, no liderar tres calles." }
          ]
        }
      }),
      LQ("r09-05", "BB", ["Ah", "8d"], ["Qs", "Js", "5s", "2c", "9d"], 77205, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs Js 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet → BB call" },
          { street: "River", text: "9d — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel en two-tone spades: color AsXs o KsTs. KK sin spade pot-controla; AQo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Ts"],
          teachBack: "KTs color. KK y AQo sin spade no barrela tres calles de flush.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: en flop two-tone suele pot-controlar turn, no triple barrel de color." },
            { id: "b", cards: ["Ac", "Qh"], label: "AQo", correct: false,
              eliminated: "Open + c-bet OK, pero sin flush: barrel turn+river no es value de color." },
            { id: "c", cards: ["Ks", "Ts"], label: "KTs", correct: true }
          ]
        }
      }),
      LQ("r09-06", "BTN", ["Kd", "9d"], ["Th", "8h", "4h", "Ac", "2s"], 77206, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Th 8h 4h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Ac — BB bet → BTN call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Raise flop hearts: color QhJh. AJs rainbow no raisea; 77 sin heart tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Jh"],
          teachBack: "QJs color: raise flop. AJs y 77 sin heart no.",
          options: [
            { id: "a", cards: ["As", "Jc"], label: "AJo", correct: false,
              eliminated: "Call BB; en T84 hearts sin heart: call/fold, no raise polar de color." },
            { id: "b", cards: ["7c", "7d"], label: "77", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Qh", "Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r09-07", "BB", ["Jc", "Td"], ["9d", "6d", "2d", "Kh", "3c"], 77207, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "9d 6d 2d — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "Kh — BB check → HJ bet → BB call" },
          { street: "River", text: "3c — BB check → HJ bet" }
        ],
        teachBack: "Triple barrel diamonds: color AdXd. QQ sin diamond no; KQo sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "8d"],
          teachBack: "A8s color. QQ y KQo sin diamond no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: pot-control turn en monotone, no triple barrel de flush." },
            { id: "b", cards: ["Kc", "Qc"], label: "KQo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no mete tres calles por value de color." },
            { id: "c", cards: ["Ad", "8d"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r09-08", "BTN", ["As", "Qs"], ["7c", "5c", "3c", "Kd", "9h"], 77208, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7c 5c 3c — check-check" },
          { street: "Turn", text: "Kd — BB check → BTN bet → BB call" },
          { street: "River", text: "9h — BB check → BTN bet" }
        ],
        teachBack: "Check flop monotone + delayed: color lento AcXc. AA betearía flop; JTo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac", "8c"],
          teachBack: "A8o color tras slowplay. AA no checkea; JTo sin club no barrela.",
          options: [
            { id: "a", cards: ["Ah", "Ad"], label: "AA", correct: false,
              eliminated: "Premium: en flop monotone casi siempre c-betea. El check-check lo elimina." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Open late OK; sin club, delayed barrel turn+river no es value de color." },
            { id: "c", cards: ["Ac", "8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r09-09", "BB", ["Kh", "9s"], ["Qd", "Jd", "8d", "2h", "4c"], 77209, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Qd Jd 8d — BB check → CO c-bet → BB raise → CO call" },
          { street: "Turn", text: "2h — BB bet → CO call" },
          { street: "River", text: "4c — BB bet" }
        ],
        teachBack: "Raise flop diamonds connected: color Td9d o AdXd. AKo sin diamond no; 99 sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td", "9d"],
          teachBack: "T9s color. AKo y 99 sin diamond no raisean.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en QJ8 diamonds sin diamond: call/fold, no raise polar." },
            { id: "b", cards: ["9c", "9h"], label: "99", correct: false,
              eliminated: "Underpair/overcard sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Td", "9d"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r09-10", "BTN", ["Tc", "9c"], ["Ah", "6h", "2h", "5s", "Kd"], 77210, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah 6h 2h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5s — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Float + bet river hearts: color KhXh. QQ sin heart raisearía antes; JTs sin flush no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "8h"],
          teachBack: "K8s color: float y river. QQ y JTs sin heart no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair sin heart: a menudo raisea flop o pot-controla — float pasivo + bet river de flush es raro." },
            { id: "b", cards: ["Js", "Ts"], label: "JTs", correct: false,
              eliminated: "Call flop con backdoors posible, pero sin flush en river: no apuesta river por value de color." },
            { id: "c", cards: ["Kh", "8h"], label: "K8s", correct: true }
          ]
        }
      }),
      LQ("r09-11", "BB", ["Ad", "7c"], ["Ts", "8s", "4s", "Qc", "2d"], 77211, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ts 8s 4s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Qc — check-check" },
          { street: "River", text: "2d — BB check → BTN bet" }
        ],
        teachBack: "C-bet + check turn + bet river: color AsXs. KK sin spade betearía turn; QJo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "5s"],
          teachBack: "A5s color thin river. KK y QJo sin spade no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: tras c-bet suele seguir en turn. Check-turn + bet-river de flush encaja peor." },
            { id: "b", cards: ["Qh", "Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin flush: tras check turn el river bet no es value de color." },
            { id: "c", cards: ["As", "5s"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r09-12", "BTN", ["Jh", "Th"], ["9c", "6c", "3c", "Ad", "2s"], 77212, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 6c 3c — BB check-raise → BTN call" },
          { street: "Turn", text: "Ad — BB bet → BTN call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Check-raise clubs: color KcXc. AQo sin club no; 88 sin flush tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "7c"],
          teachBack: "K7s color: check-raise. AQo y 88 sin club no.",
          options: [
            { id: "a", cards: ["Ah", "Qd"], label: "AQo", correct: false,
              eliminated: "Call BB; en 963 clubs sin club: call/fold, no check-raise de color." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Kc", "7c"], label: "K7s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-10"] = [
      LQ("r10-01", "BB", ["Ah", "Kd"], ["Jc", "Ts", "9d", "2h", "3c"], 77301, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc Ts 9d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet → BB call" },
          { street: "River", text: "3c — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel en JT9: escalera Q8s o KQ. AA pot-controla distinto; 88 underpair no barrela tres calles.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "8s"],
          teachBack: "Q8s escalera. AA y 88 no construyen triple barrel de straight.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "Overpair en board conectado: a menudo pot-controla turn o raisea — triple barrel lineal de escalera no es su historia." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: pot-control o fold en JT9, no triple barrel value de escalera." },
            { id: "c", cards: ["Qh", "8s"], label: "Q8s", correct: true }
          ]
        }
      }),
      LQ("r10-02", "BTN", ["Kd", "Qs"], ["8h", "7c", "6d", "2s", "Ah"], 77302, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8h 7c 6d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2s — BB bet → BTN call" },
          { street: "River", text: "Ah — BB bet" }
        ],
        teachBack: "Raise flop 876: escalera T9s o 54s. AKo sin conexión no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "9h"],
          teachBack: "T9s escalera: raise flop. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 876 sin straight/draw fuerte: call/fold, no raise polar de escalera." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats o raisea sizing distinto — raise flop de straight es más de T9s." },
            { id: "c", cards: ["Th", "9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r10-03", "BB", ["Qc", "Jd"], ["Th", "9s", "2c", "8d", "Kd"], 77303, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Th 9s 2c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "8d — BB check → CO bet → BB call" },
          { street: "River", text: "Kd — BB check → CO bet" }
        ],
        teachBack: "Barrel cuando llega 8: escalera J7 o QJ. KK suele betear distinto; 66 no cobra river de straight.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "7h"],
          teachBack: "J7s escalera al 8. KK y 66 no.",
          options: [
            { id: "a", cards: ["Ks", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet a menudo pot-controla o raisea el turn 8 — barrel lineal de escalera encaja peor." },
            { id: "b", cards: ["6h", "6c"], label: "66", correct: false,
              eliminated: "Underpair: no apuesta river por value de escalera en esa línea." },
            { id: "c", cards: ["Jh", "7h"], label: "J7s", correct: true }
          ]
        }
      }),
      LQ("r10-04", "BTN", ["Ah", "9h"], ["Qd", "Jc", "Td", "4s", "2h"], 77304, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qd Jc Td — BB donk → BTN call" },
          { street: "Turn", text: "4s — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Donk en QJT: escalera K9 o AKs. AQo sin straight no donkea; 99 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9c"],
          teachBack: "K9o escalera. AQo y 99 no donkean QJT por straight.",
          options: [
            { id: "a", cards: ["As", "Qc"], label: "AQo", correct: false,
              eliminated: "Defiende BB; en QJT sin K/9 straight: check-call, no donk flop por value de escalera." },
            { id: "b", cards: ["Kh", "9c"], label: "K9o", correct: true },
            { id: "c", cards: ["9s", "9d"], label: "99", correct: false,
              eliminated: "Underpair: no lidera QJT con donk de escalera." }
          ]
        }
      }),
      LQ("r10-05", "BB", ["Kd", "8d"], ["7h", "6c", "5s", "2d", "Ac"], 77305, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7h 6c 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "Ac — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel 765: escalera 84 o 98. QQ pot-controla; ATo sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "4h"],
          teachBack: "84s escalera. QQ y ATo no barrela tres calles de straight.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair en board bajo conectado: suele pot-controlar turn, no triple barrel de escalera." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin escalera: no mete tres calles por value de straight." },
            { id: "c", cards: ["8h", "4h"], label: "84s", correct: true }
          ]
        }
      }),
      LQ("r10-06", "BTN", ["As", "Js"], ["9c", "8d", "7h", "3s", "Kd"], 77306, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 8d 7h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "3s — BB bet → BTN call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Raise flop 987: escalera T6 o JTs. AKo no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "6h"],
          teachBack: "T6s escalera. AKo y TT no.",
          options: [
            { id: "a", cards: ["Ah", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 987 sin straight: call/fold, no raise polar." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Overpair/under: flats — no raisea flop de escalera sin T6/JT." },
            { id: "c", cards: ["Th", "6h"], label: "T6s", correct: true }
          ]
        }
      }),
      LQ("r10-07", "BB", ["Qh", "Ts"], ["Jc", "Td", "9s", "2c", "4d"], 77307, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Jc Td 9s — check-check" },
          { street: "Turn", text: "2c — BB check → HJ bet → BB call" },
          { street: "River", text: "4d — BB check → HJ bet" }
        ],
        teachBack: "Check flop + delayed en JT9: escalera KQ o 87. AA betearía flop; A9o sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Qc"],
          teachBack: "KQo escalera tras slowplay. AA no checkea; A9o no barrela.",
          options: [
            { id: "a", cards: ["As", "Ad"], label: "AA", correct: false,
              eliminated: "Premium: en JT9 casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["Ah", "9d"], label: "A9o", correct: false,
              eliminated: "Open OK; sin escalera, delayed barrel turn+river no es value de straight." },
            { id: "c", cards: ["Kh", "Qc"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r10-08", "BTN", ["Kd", "Jd"], ["Th", "8c", "7s", "6d", "2h"], 77308, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Th 8c 7s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet → BB call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Float + bet river cuando llega 6: escalera 9x. QQ raisearía antes; AJo sin straight no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "5h"],
          teachBack: "95s escalera al 6. QQ y AJo no.",
          options: [
            { id: "a", cards: ["Qs", "Qc"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float pasivo + bet river de escalera es raro." },
            { id: "b", cards: ["Ah", "Js"], label: "AJo", correct: false,
              eliminated: "Call flop posible, pero sin escalera en river: no apuesta river por value de straight." },
            { id: "c", cards: ["9h", "5h"], label: "95s", correct: true }
          ]
        }
      }),
      LQ("r10-09", "BB", ["Ah", "7c"], ["5d", "4s", "3h", "Kc", "9c"], 77309, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "5d 4s 3h — BB check → CO c-bet → BB raise → CO call" },
          { street: "Turn", text: "Kc — BB bet → CO call" },
          { street: "River", text: "9c — BB bet" }
        ],
        teachBack: "Raise flop 543: escalera 62 o A2. KK flats distinto; QJo sin straight no raisea.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h", "2h"],
          teachBack: "62s escalera. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: flats o raisea distinto — raise flop de wheel/straight es más de 62s." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Call BB; en 543 sin straight: no raisea flop por value." },
            { id: "c", cards: ["6h", "2h"], label: "62s", correct: true }
          ]
        }
      }),
      LQ("r10-10", "BTN", ["Qc", "9c"], ["Jh", "Td", "8s", "2d", "Ad"], 77310, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh Td 8s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "Ad — BB bet" }
        ],
        teachBack: "Float + bet river: escalera Q9 o KQ. AA betearía distinto; 77 sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "9d"],
          teachBack: "Q9o escalera. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "En JT8 connected casi siempre betea/raisea antes: float + bet river de escalera es raro para AA." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river por value de escalera tras float." },
            { id: "c", cards: ["Qh", "9d"], label: "Q9o", correct: true }
          ]
        }
      }),
      LQ("r10-11", "BB", ["Kd", "Td"], ["9h", "8c", "2s", "7d", "Ac"], 77311, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9h 8c 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "7d — check-check" },
          { street: "River", text: "Ac — BB check → BTN bet" }
        ],
        teachBack: "C-bet + check turn 7 + bet river: escalera JT o 65. QQ betearía turn; ATo sin straight no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Ts"],
          teachBack: "JTs escalera al 7. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn 7. Check-turn + bet-river de escalera encaja peor." },
            { id: "b", cards: ["Ah", "Tc"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin escalera: tras check turn el river bet no es value de straight." },
            { id: "c", cards: ["Jh", "Ts"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r10-12", "BTN", ["As", "8s"], ["Qc", "Jd", "Th", "4h", "2c"], 77312, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc Jd Th — BB check-raise → BTN call" },
          { street: "Turn", text: "4h — BB bet → BTN call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Check-raise QJT: escalera K9 o AK. A9o sin straight no; 88 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9h"],
          teachBack: "K9s escalera: check-raise. A9o y 88 no.",
          options: [
            { id: "a", cards: ["Ah", "9d"], label: "A9o", correct: false,
              eliminated: "Call BB; en QJT sin K/9 straight: call/fold, no check-raise de escalera." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop QJT por value de straight." },
            { id: "c", cards: ["Kh", "9h"], label: "K9s", correct: true }
          ]
        }
      })
  ];

  PACKS["R-11"] = [
      LQ("r11-01", "BB", ["9h", "9c"], ["As", "7d", "2c", "Kh", "3s"], 77401, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 7d 2c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet → BB call" },
          { street: "River", text: "3s — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel A-high: Ax value claro. TT pot-controla turn; QJs sin as abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac", "Qc"],
          teachBack: "AQo value limpio. TT y QJs no triple-barrela por valor.",
          options: [
            { id: "a", cards: ["Ts", "Th"], label: "TT", correct: false,
              eliminated: "Abre BTN y puede c-bet flop, pero en A-high seco suele pot-controlar turn: no triple-barrela por valor." },
            { id: "b", cards: ["Qh", "Js"], label: "QJs", correct: false,
              eliminated: "Open OK y c-bet posible, pero sin as ni pareja fuerte: en turn K suele dejar de meter presión." },
            { id: "c", cards: ["Ac", "Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r11-02", "BTN", ["Ah", "Qd"], ["Kd", "8c", "3h", "2s", "7d"], 77402, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 8c 3h — check-check" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB call" },
          { street: "River", text: "7d — BB check → BTN bet" }
        ],
        teachBack: "Delayed barrel K-high: Kx value. AA betearía flop; QJo sin K no dobla barrel.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "Jh"],
          teachBack: "KJo delayed value. AA no checkea; QJo sin rey no.",
          options: [
            { id: "a", cards: ["As", "Ad"], label: "AA", correct: false,
              eliminated: "Abre y en K-high seco casi siempre c-betea flop: el check-check la elimina." },
            { id: "b", cards: ["Qc", "Jd"], label: "QJo", correct: false,
              eliminated: "Open late OK, pero sin K: delayed barrel turn+river es raro." },
            { id: "c", cards: ["Kc", "Jh"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r11-03", "BB", ["Td", "Th"], ["Ah", "9c", "4d", "2s", "7h"], 77403, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Ah 9c 4d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "7h — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn + bet river: Ax thin. KK suele betear turn; QJo sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "Js"],
          teachBack: "AJo thin river. KK betearía turn; QJo sin as no.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Open + c-bet OK, pero en A-high suele betear turn también: check-turn + bet-river encaja peor." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Puede abrir CO y c-bet aire, pero sin as: tras check turn el river bet no es value creíble." },
            { id: "c", cards: ["Ad", "Js"], label: "AJo", correct: true }
          ]
        }
      }),
      LQ("r11-04", "BTN", ["Kd", "Jh"], ["Qs", "7c", "2d", "5h", "9c"], 77404, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs 7c 2d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5h — BB check → BTN bet → BB call" },
          { street: "River", text: "9c — BB bet" }
        ],
        teachBack: "Float + bet river Q-high: Qx value. AA betearía distinto; JTs sin Q no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Td"],
          teachBack: "QTo float value. AA y JTs no.",
          options: [
            { id: "a", cards: ["Ac", "Ah"], label: "AA", correct: false,
              eliminated: "En Q-high casi siempre c-betea o raisea antes: float pasivo + bet river es raro para AA." },
            { id: "b", cards: ["Js", "Ts"], label: "JTs", correct: false,
              eliminated: "Call flop posible, pero sin Q: no apuesta river por value tras float." },
            { id: "c", cards: ["Qh", "Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r11-05", "BB", ["8h", "8c"], ["Kc", "6s", "3d", "2h", "Qd"], 77405, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kc 6s 3d — check-check" },
          { street: "Turn", text: "2h — BB check → CO bet → BB call" },
          { street: "River", text: "Qd — BB check → CO bet" }
        ],
        teachBack: "Delayed barrel K-high: Kx. AA betearía flop; AJo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Js"],
          teachBack: "KJo delayed. AA no checkea; AJo sin rey no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "En K-high seco casi siempre c-betea flop: el check-check elimina el premium." },
            { id: "b", cards: ["As", "Jd"], label: "AJo", correct: false,
              eliminated: "Open CO OK; sin K, tras check-check flop el delayed barrel turn+river es farol poco natural." },
            { id: "c", cards: ["Kd", "Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r11-06", "BTN", ["Qh", "Js"], ["Ah", "Td", "4c", "8s", "2d"], 77406, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah Td 4c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "8s — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB bet" }
        ],
        teachBack: "Float dos calles + bet river A-high: Ax. KK raisearía antes; J9s sin as no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "9s"],
          teachBack: "A9s float value. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kc", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair al A: suele raisear flop/turn — float pasivo + bet river es raro." },
            { id: "b", cards: ["Jh", "9h"], label: "J9s", correct: false,
              eliminated: "Call flop posible, pero sin as: no apuesta river por value." },
            { id: "c", cards: ["As", "9s"], label: "A9s", correct: true }
          ]
        }
      }),
      LQ("r11-07", "BB", ["Jc", "9d"], ["Qd", "7h", "2s", "5c", "Kd"], 77407, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qd 7h 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5c — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel Q-high → K river: Kx o Qx. 99 pot-controla; T8s sin Q/K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Ts"],
          teachBack: "KTo value al K. 99 y T8s no.",
          options: [
            { id: "a", cards: ["9h", "9s"], label: "99", correct: false,
              eliminated: "Open + c-bet posible, pero underpair: pot-control turn, no triple barrel cuando llega K." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin Q/K: no barrela tres calles por valor." },
            { id: "c", cards: ["Kh", "Ts"], label: "KTo", correct: true }
          ]
        }
      }),
      LQ("r11-08", "BTN", ["Ad", "8d"], ["Jh", "6c", "2s", "9d", "4h"], 77408, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh 6c 2s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "9d — BB bet → BTN call" },
          { street: "River", text: "4h — BB bet" }
        ],
        teachBack: "Raise flop J62: set JJ o dos pares. AKo no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Jd"],
          teachBack: "JJ set value limpio. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en J62 sin pareja: call/fold, no raise polar." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set." },
            { id: "c", cards: ["Js", "Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r11-09", "BB", ["Kh", "Td"], ["8s", "7c", "2d", "Ah", "3c"], 77409, {
        villainPos: "HJ", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "8s 7c 2d — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "Ah — BB check → HJ bet → BB call" },
          { street: "River", text: "3c — BB check → HJ bet" }
        ],
        teachBack: "Triple barrel board bajo → A: Ax o overpair. 55 pot-controla; QJo aire para en turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac", "Qc"],
          teachBack: "AQo value. 55 y QJo no.",
          options: [
            { id: "a", cards: ["5h", "5d"], label: "55", correct: false,
              eliminated: "Open + c-bet flop posible, pero underpair: pot-control turn — no triple barrel value." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Open late y c-bet aire OK, pero barrel turn A y river es farol largo: suele checkear turn." },
            { id: "c", cards: ["Ac", "Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r11-10", "BTN", ["9s", "9c"], ["Kd", "Tc", "4h", "2s", "7c"], 77410, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd Tc 4h — BB donk → BTN call" },
          { street: "Turn", text: "2s — BB bet → BTN call" },
          { street: "River", text: "7c — BB bet" }
        ],
        teachBack: "Donk K-high: Kx value. AQo sin K no donkea; JTs tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Js"],
          teachBack: "KJo donk value. AQo y JTs no.",
          options: [
            { id: "a", cards: ["Ah", "Qd"], label: "AQo", correct: false,
              eliminated: "Defiende BB; en KT4 sin K: check-call, no donk flop por value." },
            { id: "b", cards: ["Kh", "Js"], label: "KJo", correct: true },
            { id: "c", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Call BB OK; sin K suele checkear, no donkear tres calles." }
          ]
        }
      }),
      LQ("r11-11", "BB", ["Qd", "8d"], ["As", "Jh", "3c", "9s", "2h"], 77411, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "As Jh 3c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "2h — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn + bet river: Ax thin. KK betearía turn; T9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "Td"],
          teachBack: "ATo thin. KK y T9s no.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river encaja peor." },
            { id: "b", cards: ["Th", "9h"], label: "T9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el river bet no es value." },
            { id: "c", cards: ["Ad", "Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r11-12", "BTN", ["Th", "8h"], ["Qc", "7d", "2s", "5c", "Kh"], 77412, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc 7d 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5c — BB check → BTN bet → BB call" },
          { street: "River", text: "Kh — BB bet" }
        ],
        teachBack: "Float + bet river al K: Kx. AA betearía distinto; J9s sin K/Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Js"],
          teachBack: "KJo float value al K. AA y J9s no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "En Q-high casi siempre betea antes: float + bet river al K es raro para AA." },
            { id: "b", cards: ["Jh", "9d"], label: "J9o", correct: false,
              eliminated: "Call flop posible, pero sin K/Q fuerte: no apuesta river por value." },
            { id: "c", cards: ["Kd", "Js"], label: "KJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-12"] = [
      LQ("r12-01", "BB", ["Ah", "Kd"], ["Js", "9s", "2c", "7h", "3d"], 77501, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Js 9s 2c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "7h — BB check → BTN bet → BB call" },
          { street: "River", text: "3d — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel two-tone que NO completa: farol con flush draw fallido (KsQs) o Ax. 88 pot-controla; QJo sin plan abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Qs"],
          teachBack: "KQs flush draw fallido: farol creíble. 88 y QJo sin draw no barrela river seco.",
          options: [
            { id: "a", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Open + c-bet posible, pero underpair sin draw: pot-control turn, no triple barrel cuando el color no llega." },
            { id: "b", cards: ["Qc", "Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet flop, pero sin flush draw claro: en river seco suele checkear, no farolear tres calles." },
            { id: "c", cards: ["Ks", "Qs"], label: "KQs", correct: true }
          ]
        }
      }),
      LQ("r12-02", "BTN", ["Qc", "Jd"], ["Ah", "8h", "3d", "2s", "Kc"], 77502, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah 8h 3d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB call" },
          { street: "River", text: "Kc — BB bet" }
        ],
        teachBack: "Float + bet river sin completar hearts: farol con draw fallido Th9h. KK raisearía antes; 77 sin draw no mete river.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "9h"],
          teachBack: "T9s flush draw fallido: farol river. KK y 77 no.",
          options: [
            { id: "a", cards: ["Kd", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float pasivo + bet river sin heart no es su línea." },
            { id: "b", cards: ["7c", "7d"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float cuando el color falla." },
            { id: "c", cards: ["Th", "9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r12-03", "BB", ["Kh", "9c"], ["Td", "6d", "2s", "Ac", "4h"], 77503, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Td 6d 2s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "Ac — BB check → CO bet → BB call" },
          { street: "River", text: "4h — BB check → CO bet" }
        ],
        teachBack: "Barrel diamonds que no llegan: farol AdXd o QdJd. QQ pot-controla; 88 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd", "Jd"],
          teachBack: "QJs flush draw fallido. QQ y 88 no barrela river seco.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele pot-controlar cuando el color no completa — no farolea river seco así." },
            { id: "b", cards: ["8h", "8s"], label: "88", correct: false,
              eliminated: "Underpair sin draw: pot-control, no triple barrel farol." },
            { id: "c", cards: ["Qd", "Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r12-04", "BTN", ["As", "Kd"], ["9c", "7c", "2h", "Ad", "3s"], 77504, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 7c 2h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Ad — BB bet → BTN call" },
          { street: "River", text: "3s — BB bet" }
        ],
        teachBack: "Raise flop two-tone + barrels sin club: semi-bluff que se queda en farol (QcJc). AQo sin draw no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc", "Jc"],
          teachBack: "QJs flush draw fallido tras raise. AQo y TT no.",
          options: [
            { id: "a", cards: ["Ah", "Qh"], label: "AQo", correct: false,
              eliminated: "Call BB; en 972 clubs sin club/draw: call/fold, no raise polar de flop." },
            { id: "b", cards: ["Th", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set ni flush draw claro." },
            { id: "c", cards: ["Qc", "Jc"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r12-05", "BB", ["Qd", "Td"], ["Kh", "5h", "3c", "9s", "2d"], 77505, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kh 5h 3c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "9s — check-check" },
          { street: "River", text: "2d — BB check → BTN bet" }
        ],
        teachBack: "C-bet + check turn + bet river sin heart: farol thin con AhXh fallido. JJ betearía turn; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "8h"],
          teachBack: "A8s flush draw fallido, river farol. JJ y JTo no.",
          options: [
            { id: "a", cards: ["Js", "Jc"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["Jh", "Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin heart draw: tras check turn el river bet farol es poco natural." },
            { id: "c", cards: ["Ah", "8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r12-06", "BTN", ["Kd", "9d"], ["Qs", "Js", "4c", "8h", "2d"], 77506, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs Js 4c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "8h — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB bet" }
        ],
        teachBack: "Float + bet river sin spade: farol AsTs fallido. AA betearía distinto; 77 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATs flush draw fallido. AA y 77 no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "En QJ4 casi siempre betea/raisea antes: float + bet river sin flush es raro para AA." },
            { id: "b", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["As", "Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r12-07", "BB", ["Jc", "8c"], ["Ad", "9d", "5s", "2h", "Kc"], 77507, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Ad 9d 5s — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → HJ bet → BB call" },
          { street: "River", text: "Kc — BB check → HJ bet" }
        ],
        teachBack: "Triple barrel diamonds fallidos: farol KdQd. 66 pot-controla; QTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Qd"],
          teachBack: "KQs flush draw fallido. 66 y QTo no.",
          options: [
            { id: "a", cards: ["6h", "6s"], label: "66", correct: false,
              eliminated: "Open + c-bet posible; underpair sin draw: pot-control turn, no triple barrel farol." },
            { id: "b", cards: ["Qh", "Td"], label: "QTo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond draw: no barrela tres calles cuando el color falla." },
            { id: "c", cards: ["Kd", "Qd"], label: "KQs", correct: true }
          ]
        }
      }),
      LQ("r12-08", "BTN", ["Ah", "Th"], ["8s", "6s", "3d", "Qc", "2h"], 77508, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8s 6s 3d — BB donk → BTN call" },
          { street: "Turn", text: "Qc — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Donk two-tone + presión sin spade: farol con draw fallido KsTs… o value set. Aquí KsJs draw fallido. AKo sin draw no donkea; 99 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Js"],
          teachBack: "KJs flush draw fallido vía donk. AKo y 99 no.",
          options: [
            { id: "a", cards: ["Ac", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 863 spades sin spade: check-call, no donk flop de semi-bluff." },
            { id: "b", cards: ["Ks", "Js"], label: "KJs", correct: true },
            { id: "c", cards: ["9h", "9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no donkea 863 two-tone y mete tres calles sin color." }
          ]
        }
      }),
      LQ("r12-09", "BB", ["Kd", "Td"], ["Qc", "Tc", "4h", "9s", "2d"], 77509, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc Tc 4h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "9s — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB check → BTN bet" }
        ],
        teachBack: "Barrel clubs que no completan: farol AcXc o Jc9c. KK pot-controla; AJo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jc", "9c"],
          teachBack: "J9s flush draw fallido. KK y AJo no.",
          options: [
            { id: "a", cards: ["Kh", "Ks"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando el color no llega, no farolear river seco tres calles." },
            { id: "b", cards: ["Ah", "Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin club draw: no barrela river cuando falla el color." },
            { id: "c", cards: ["Jc", "9c"], label: "J9s", correct: true }
          ]
        }
      }),
      LQ("r12-10", "BTN", ["Qh", "9h"], ["Kd", "7d", "2c", "5s", "Ah"], 77510, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 7d 2c — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "5s — BB bet → BTN call" },
          { street: "River", text: "Ah — BB bet" }
        ],
        teachBack: "Raise flop diamonds + barrels sin completar: farol QdJd. AKo sin draw no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd", "Jd"],
          teachBack: "QJs flush draw fallido tras raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en K72 diamonds sin diamond: call/fold, no raise de flush draw." },
            { id: "b", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair sin draw: no raisea flop." },
            { id: "c", cards: ["Qd", "Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r12-11", "BB", ["As", "9c"], ["Jh", "6h", "4d", "Tc", "2s"], 77511, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Jh 6h 4d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "Tc — check-check" },
          { street: "River", text: "2s — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn + bet river sin heart: farol AhXh fallido. QQ betearía turn; T9s sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "8h"],
          teachBack: "A8s draw fallido. QQ y T9s no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["Th", "9d"], label: "T9o", correct: false,
              eliminated: "Puede c-bet aire, pero sin heart: tras check turn el river farol es poco natural." },
            { id: "c", cards: ["Ah", "8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r12-12", "BTN", ["Kc", "Qc"], ["9s", "5s", "2d", "7h", "Ad"], 77512, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9s 5s 2d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "7h — BB check → BTN bet → BB call" },
          { street: "River", text: "Ad — BB bet" }
        ],
        teachBack: "Float + bet river sin spade: farol AsTs. JJ raisearía antes; 66 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATs flush draw fallido. JJ y 66 no.",
          options: [
            { id: "a", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + bet river sin flush es raro." },
            { id: "b", cards: ["6h", "6c"], label: "66", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["As", "Ts"], label: "ATs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-13"] = [
      LQ("r13-01", "BB", ["Ah", "Kd"], ["Jc", "Ts", "4d", "2h", "8c"], 77601, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc Ts 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet → BB call" },
          { street: "River", text: "8c — BB check → BTN bet" }
        ],
        teachBack: "Barrel JT4 sin completar escalera: farol Q9s (OESD fallido). 88 pot-controla; A9o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "9h"],
          teachBack: "Q9s OESD fallido: farol. 88 y A9o no barrela river blank.",
          options: [
            { id: "a", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Open + c-bet posible; underpair sin draw: pot-control turn, no triple barrel cuando la escalera falla." },
            { id: "b", cards: ["As", "9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet, pero sin OESD claro: en river blank suele checkear, no farolear tres calles." },
            { id: "c", cards: ["Qh", "9h"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r13-02", "BTN", ["Kd", "Qs"], ["9h", "8c", "2d", "Ad", "3s"], 77602, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Ad — BB bet → BTN call" },
          { street: "River", text: "3s — BB bet" }
        ],
        teachBack: "Raise flop 982 con OESD (T7s) que no llega: farol. AKo sin draw no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "7h"],
          teachBack: "T7s OESD fallido tras raise. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 982 sin straight draw fuerte: call/fold, no raise polar." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set ni OESD claro." },
            { id: "c", cards: ["Th", "7h"], label: "T7s", correct: true }
          ]
        }
      }),
      LQ("r13-03", "BB", ["Qc", "Jd"], ["7s", "6h", "2c", "Kd", "9d"], 77603, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "7s 6h 2c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "Kd — BB check → CO bet → BB call" },
          { street: "River", text: "9d — BB check → CO bet" }
        ],
        teachBack: "Barrel 76x sin completar: farol 54s o 98s. QQ pot-controla; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h", "4h"],
          teachBack: "54s OESD fallido. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando el draw falla, no farolear river tres calles." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: no barrela river blank por farol largo." },
            { id: "c", cards: ["5h", "4h"], label: "54s", correct: true }
          ]
        }
      }),
      LQ("r13-04", "BTN", ["As", "9s"], ["Th", "8d", "7c", "2s", "Kc"], 77604, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Th 8d 7c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB call" },
          { street: "River", text: "Kc — BB bet" }
        ],
        teachBack: "Float + bet river sin escalera: farol J9s OESD fallido. AA betearía distinto; 66 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "9h"],
          teachBack: "J9s OESD fallido. AA y 66 no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "En T87 connected casi siempre betea/raisea antes: float + bet river sin straight es raro para AA." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["Jh", "9h"], label: "J9s", correct: true }
          ]
        }
      }),
      LQ("r13-05", "BB", ["Kh", "8d"], ["Qc", "Jd", "4s", "2h", "9c"], 77605, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc Jd 4s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "9c — BB check → BTN bet" }
        ],
        teachBack: "C-bet + check turn + bet river al 9: farol T8s gutshot/OESD fallido… o value. Aquí T8s draw fallido. KK betearía turn; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "8h"],
          teachBack: "T8s draw fallido, river farol. KK y ATo no.",
          options: [
            { id: "a", cards: ["Ks", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin draw claro: tras check turn el river farol es poco natural." },
            { id: "c", cards: ["Th", "8h"], label: "T8s", correct: true }
          ]
        }
      }),
      LQ("r13-06", "BTN", ["Ad", "Kd"], ["8h", "7c", "3s", "Qs", "2d"], 77606, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8h 7c 3s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Qs — BB bet → BTN call" },
          { street: "River", text: "2d — BB bet" }
        ],
        teachBack: "Raise flop 873 con OESD 65s fallido. AJo sin draw no; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h", "5h"],
          teachBack: "65s OESD fallido. AJo y TT no.",
          options: [
            { id: "a", cards: ["As", "Jh"], label: "AJo", correct: false,
              eliminated: "Call BB; en 873 sin OESD: call/fold, no raise polar." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set/OESD." },
            { id: "c", cards: ["6h", "5h"], label: "65s", correct: true }
          ]
        }
      }),
      LQ("r13-07", "BB", ["Jc", "9c"], ["Td", "9s", "5h", "2c", "Kd"], 77607, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Td 9s 5h — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → HJ bet → BB call" },
          { street: "River", text: "Kd — BB check → HJ bet" }
        ],
        teachBack: "Barrel T95 sin completar: farol QJ o 87. 66 pot-controla; A8o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Jh"],
          teachBack: "QJo OESD/gutshot fallido. 66 y A8o no.",
          options: [
            { id: "a", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair sin draw: pot-control turn, no triple barrel farol." },
            { id: "b", cards: ["Ah", "8d"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin draw: no barrela tres calles al K blank." },
            { id: "c", cards: ["Qh", "Jh"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r13-08", "BTN", ["Qh", "Th"], ["6c", "5d", "2h", "As", "9s"], 77608, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "6c 5d 2h — BB donk → BTN call" },
          { street: "Turn", text: "As — BB bet → BTN call" },
          { street: "River", text: "9s — BB bet" }
        ],
        teachBack: "Donk 652 con OESD 43/87 que no llega: farol. AKo sin draw no donkea; JJ tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "7d"],
          teachBack: "87o OESD fallido vía donk. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ac", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 652 sin draw: check-call, no donk de OESD." },
            { id: "b", cards: ["8h", "7d"], label: "87o", correct: true },
            { id: "c", cards: ["Js", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: no donkea 652 y mete tres calles sin completar escalera." }
          ]
        }
      }),
      LQ("r13-09", "BB", ["Ad", "7d"], ["Jh", "Tc", "3s", "8d", "2c"], 77609, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh Tc 3s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "8d — BB check → BTN bet → BB call" },
          { street: "River", text: "2c — BB check → BTN bet" }
        ],
        teachBack: "Barrel JT3→8 sin nuts straight: farol Q9s fallido (o value). Aquí Q9s. KK pot-controla; A9o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "9s"],
          teachBack: "Q9s draw fallido. KK y A9o no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar cuando no mejora, no farolear river tres calles." },
            { id: "b", cards: ["Ah", "9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet, pero sin OESD claro: no barrela river blank." },
            { id: "c", cards: ["Qs", "9s"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r13-10", "BTN", ["Kc", "9c"], ["7h", "6s", "4d", "Qd", "2c"], 77610, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7h 6s 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Qd — BB check → BTN bet → BB call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Float + bet river sin escalera: farol 85s OESD fallido. AA betearía distinto; 99 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "5h"],
          teachBack: "85s OESD fallido. AA y 99 no.",
          options: [
            { id: "a", cards: ["As", "Ah"], label: "AA", correct: false,
              eliminated: "En 764 casi siempre betea antes: float + bet river sin straight es raro para AA." },
            { id: "b", cards: ["9h", "9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["8h", "5h"], label: "85s", correct: true }
          ]
        }
      }),
      LQ("r13-11", "BB", ["Kh", "Td"], ["9c", "8h", "2s", "Ad", "4c"], 77611, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "9c 8h 2s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "Ad — check-check" },
          { street: "River", text: "4c — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn A + bet river: farol T7s OESD fallido. QQ betearía turn; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "7h"],
          teachBack: "T7s draw fallido. QQ y JTo no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn A. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["Jh", "Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: tras check turn el river farol es poco natural." },
            { id: "c", cards: ["Th", "7h"], label: "T7s", correct: true }
          ]
        }
      }),
      LQ("r13-12", "BTN", ["As", "Js"], ["Tc", "9d", "5h", "2s", "Kd"], 77612, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Tc 9d 5h — BB check-raise → BTN call" },
          { street: "Turn", text: "2s — BB bet → BTN call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Check-raise T95 con OESD QJ/87 fallido: farol. AKo sin draw no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Jh"],
          teachBack: "QJo OESD fallido tras check-raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en T95 sin OESD: call/fold, no check-raise de draw." },
            { id: "b", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set/OESD." },
            { id: "c", cards: ["Qh", "Jh"], label: "QJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-14"] = [
      LQ("r14-01", "BB", ["Ah", "Qd"], ["Ks", "9s", "4c", "2d", "7h"], 77701, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ks 9s 4c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "7h — BB check → BTN bet" }
        ],
        teachBack: "Semi-bluff de flush que se queda en aire: JsTs. QQ pot-controla; AJo sin draw abandona.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Ts"],
          teachBack: "JTs semi-bluff → farol river. QQ y AJo no.",
          options: [
            { id: "a", cards: ["Qc", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn cuando no mejora — no convierte semi-bluff en triple barrel farol." },
            { id: "b", cards: ["Ac", "Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin flush draw: en river blank suele checkear." },
            { id: "c", cards: ["Js", "Ts"], label: "JTs", correct: true }
          ]
        }
      }),
      LQ("r14-02", "BTN", ["Kd", "Jd"], ["8h", "7h", "2c", "Qs", "3d"], 77702, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8h 7h 2c — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Qs — BB bet → BTN call" },
          { street: "River", text: "3d — BB bet" }
        ],
        teachBack: "Check-raise semi-bluff hearts (Th9h) que no completa. AKo sin draw no; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "9h"],
          teachBack: "T9s semi-bluff → farol. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 872 hearts sin heart: call/fold, no raise de semi-bluff." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set/flush draw." },
            { id: "c", cards: ["Th", "9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r14-03", "BB", ["Qc", "9c"], ["Jd", "Td", "5s", "2h", "Ac"], 77703, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Jd Td 5s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet → BB call" },
          { street: "River", text: "Ac — BB check → CO bet" }
        ],
        teachBack: "OESD+backdoor que falla: farol K9s o Q8. KK pot-controla; 88 sin equity no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9h"],
          teachBack: "K9s semi-bluff fallido. KK y 88 no.",
          options: [
            { id: "a", cards: ["Ks", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: pot-control cuando el draw falla, no farolear river tres calles." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair sin equity: no triple barrel farol." },
            { id: "c", cards: ["Kh", "9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r14-04", "BTN", ["Ah", "8h"], ["9c", "6c", "3d", "Kh", "2s"], 77704, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 6c 3d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet → BB call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Float con flush draw QcJc que falla: farol river. AA betearía distinto; 77 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qc", "Jc"],
          teachBack: "QJs semi-bluff float → farol. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ad"], label: "AA", correct: false,
              eliminated: "En 963 almost siempre betea antes: float + bet river sin flush es raro para AA." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["Qc", "Jc"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r14-05", "BB", ["Kd", "Td"], ["Qs", "Js", "4h", "8c", "2d"], 77705, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs Js 4h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "8c — check-check" },
          { street: "River", text: "2d — BB check → BTN bet" }
        ],
        teachBack: "C-bet OESD + check turn + bet river: farol T9s fallido. JJ betearía turn; ATo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "9h"],
          teachBack: "T9s semi-bluff → farol delayed. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["Ah", "Tc"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin OESD: tras check turn el river farol es poco natural." },
            { id: "c", cards: ["Th", "9h"], label: "T9s", correct: true }
          ]
        }
      }),
      LQ("r14-06", "BTN", ["Qd", "Jd"], ["7s", "5s", "2h", "Ac", "9c"], 77706, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7s 5s 2h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Ac — BB bet → BTN call" },
          { street: "River", text: "9c — BB bet" }
        ],
        teachBack: "Raise flop spades con AsXs/KsTs semi-bluff que falla. AQo sin spade no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Ts"],
          teachBack: "KTs semi-bluff → farol. AQo y 88 no.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en 752 spades sin spade: call/fold, no raise de flush draw." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set/flush draw." },
            { id: "c", cards: ["Ks", "Ts"], label: "KTs", correct: true }
          ]
        }
      }),
      LQ("r14-07", "BB", ["Ah", "9d"], ["Tc", "8d", "6h", "2s", "Kd"], 77707, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Tc 8d 6h — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → HJ bet → BB call" },
          { street: "River", text: "Kd — BB check → HJ bet" }
        ],
        teachBack: "Double gutshot/OESD Q9 que falla: farol. 55 pot-controla; AJo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "9h"],
          teachBack: "Q9s semi-bluff fallido. 55 y AJo no.",
          options: [
            { id: "a", cards: ["5h", "5c"], label: "55", correct: false,
              eliminated: "Underpair sin equity: pot-control, no triple barrel farol." },
            { id: "b", cards: ["As", "Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin draw: no barrela tres calles al K." },
            { id: "c", cards: ["Qh", "9h"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r14-08", "BTN", ["Kc", "Qc"], ["Jh", "9h", "3d", "5s", "2c"], 77708, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh 9h 3d — BB donk → BTN call" },
          { street: "Turn", text: "5s — BB bet → BTN call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Donk con flush draw Th8h que falla: farol. AKo sin draw no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "8h"],
          teachBack: "T8s semi-bluff donk → farol. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en J93 hearts sin heart: check-call, no donk de semi-bluff." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: true },
            { id: "c", cards: ["Td", "Ts"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea J93 two-tone y mete tres calles sin completar." }
          ]
        }
      }),
      LQ("r14-09", "BB", ["Qh", "8h"], ["Ad", "7d", "2c", "9s", "3h"], 77709, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ad 7d 2c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "9s — BB check → BTN bet → BB call" },
          { street: "River", text: "3h — BB check → BTN bet" }
        ],
        teachBack: "Barrel diamonds fallidos KdXd: farol. KK pot-controla; JTo sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Td"],
          teachBack: "KTo flush draw fallido. KK y JTo no.",
          options: [
            { id: "a", cards: ["Kh", "Ks"], label: "KK", correct: false,
              eliminated: "Overpair: pot-control cuando el color falla, no farolear river tres calles." },
            { id: "b", cards: ["Jh", "Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no barrela river blank." },
            { id: "c", cards: ["Kd", "Td"], label: "KTo", correct: true }
          ]
        }
      }),
      LQ("r14-10", "BTN", ["As", "Ts"], ["8c", "7h", "4d", "Kd", "2s"], 77710, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8c 7h 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet → BB call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Float OESD 65/9T que falla: farol river. QQ raisearía antes; 99 sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "6h"],
          teachBack: "96s OESD float → farol. QQ y 99 no.",
          options: [
            { id: "a", cards: ["Qc", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + bet river sin straight es raro." },
            { id: "b", cards: ["9c", "9d"], label: "99", correct: false,
              eliminated: "Overpair sin draw: no apuesta river farol tras float." },
            { id: "c", cards: ["9h", "6h"], label: "96s", correct: true }
          ]
        }
      }),
      LQ("r14-11", "BB", ["Kd", "9d"], ["Jc", "Tc", "5h", "2d", "Ah"], 77711, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Jc Tc 5h — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "Ah — BB check → CO bet" }
        ],
        teachBack: "C-bet gutshot + check turn + bet river: farol Q9s fallido. JJ betearía turn; A8o sin draw no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "9s"],
          teachBack: "Q9s semi-bluff delayed farol. JJ y A8o no.",
          options: [
            { id: "a", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river farol encaja peor." },
            { id: "b", cards: ["As", "8c"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin draw: tras check turn el river farol es poco natural." },
            { id: "c", cards: ["Qs", "9s"], label: "Q9s", correct: true }
          ]
        }
      }),
      LQ("r14-12", "BTN", ["Qh", "Jh"], ["6s", "5s", "2d", "Ac", "9h"], 77712, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "6s 5s 2d — BB check-raise → BTN call" },
          { street: "Turn", text: "Ac — BB bet → BTN call" },
          { street: "River", text: "9h — BB bet" }
        ],
        teachBack: "Check-raise flush draw AsXs/KsTs que falla: farol. AKo sin spade no; 77 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Ts"],
          teachBack: "KTs semi-bluff check-raise → farol. AKo y 77 no.",
          options: [
            { id: "a", cards: ["Ah", "Kd"], label: "AKo", correct: false,
              eliminated: "Call BB; en 652 spades sin spade: call/fold, no check-raise de draw." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no raisea flop sin set/flush draw." },
            { id: "c", cards: ["Ks", "Ts"], label: "KTs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-15"] = [
      LQ("r15-01", "BTN", ["Ah", "Qd"], ["Kc", "7d", "2s", "9h", "3c"], 77801, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kc 7d 2s — BB check → BTN c-bet → BB check-raise → BTN call" },
          { street: "Turn", text: "9h — BB bet → BTN call" },
          { street: "River", text: "3c — BB bet" }
        ],
        teachBack: "Check-raise + barrels: polar (set KK o farol con blocker). AJo sin pareja no raisea; TT underpair tampoco — aquí KK set.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Kd"],
          teachBack: "KK set polar. AJo y TT no raisean K72.",
          options: [
            { id: "a", cards: ["As", "Jh"], label: "AJo", correct: false,
              eliminated: "Call BB; en K72 sin pareja/draw: call/fold, no check-raise polar." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop polar sin set." },
            { id: "c", cards: ["Kh", "Kd"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r15-02", "BB", ["Jd", "9d"], ["As", "8c", "3h", "2d", "7s"], 77802, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 8c 3h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "7s — BB check → BTN bet grande" }
        ],
        teachBack: "Triple barrel grande A-high: polar Ax value o aire. QQ pot-controla; 55 no mete overbet — aquí AKo value.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Kc"],
          teachBack: "AKo polar value. QQ y 55 no overbetean river así.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele pot-controlar o sizing medio — overbet river polar encaja peor que Ax." },
            { id: "b", cards: ["5h", "5c"], label: "55", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river polar." },
            { id: "c", cards: ["Ah", "Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r15-03", "BTN", ["Kh", "Td"], ["Qd", "Jc", "4s", "2h", "9c"], 77803, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qd Jc 4s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet → BB call" },
          { street: "River", text: "9c — BB bet grande" }
        ],
        teachBack: "Float + overbet river: polar dos pares/straight o aire. AA raisearía antes; 88 sin equity no — aquí QJs dos pares.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jh"],
          teachBack: "QJs polar value. AA y 88 no.",
          options: [
            { id: "a", cards: ["Ac", "Ah"], label: "AA", correct: false,
              eliminated: "En QJ4 casi siempre betea/raisea antes: float + overbet river es raro para AA." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no overbetea river tras float sin equity." },
            { id: "c", cards: ["Qs", "Jh"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r15-04", "BB", ["Tc", "9c"], ["Kh", "6d", "2c", "8s", "Ad"], 77804, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh 6d 2c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "8s — BB check → CO bet → BB call" },
          { street: "River", text: "Ad — BB check → CO bet" }
        ],
        teachBack: "Triple barrel → A: polar Ax o farol. JJ pot-controla; 77 no — aquí AKo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Kc"],
          teachBack: "AKo polar al A. JJ y 77 no.",
          options: [
            { id: "a", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn, no triple barrel polar cuando llega A." },
            { id: "b", cards: ["7h", "7s"], label: "77", correct: false,
              eliminated: "Underpair: no barrela tres calles polar." },
            { id: "c", cards: ["As", "Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r15-05", "BTN", ["Qd", "Jd"], ["9s", "8c", "2h", "5d", "Kc"], 77805, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9s 8c 2h — BB check-raise → BTN call" },
          { street: "Turn", text: "5d — BB bet → BTN call" },
          { street: "River", text: "Kc — BB bet" }
        ],
        teachBack: "Check-raise 982: polar set 99 o farol. ATo sin conexión no; TT underpair tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "9d"],
          teachBack: "99 set polar. ATo y TT no.",
          options: [
            { id: "a", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Call BB; en 982 sin 9/8: call/fold, no check-raise polar." },
            { id: "b", cards: ["Th", "Tc"], label: "TT", correct: false,
              eliminated: "Overpair: flats — no raisea flop polar sin set." },
            { id: "c", cards: ["9h", "9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r15-06", "BB", ["Ah", "8d"], ["Jc", "7h", "3s", "2d", "9c"], 77806, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc 7h 3s — check-check" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "9c — BB check → BTN bet grande" }
        ],
        teachBack: "Delayed overbet: polar Jx value o aire. AA betearía flop; QTo sin J no — aquí KJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Js"],
          teachBack: "KJo delayed polar. AA no checkea; QTo sin J no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en J-high casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["Qc", "Td"], label: "QTo", correct: false,
              eliminated: "Open late OK; sin J, delayed overbet turn+river es farol poco natural vs value." },
            { id: "c", cards: ["Kh", "Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r15-07", "BTN", ["9h", "8h"], ["Ad", "Kd", "4c", "2s", "7d"], 77807, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ad Kd 4c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB call" },
          { street: "River", text: "7d — BB bet grande" }
        ],
        teachBack: "Float + overbet AK4: polar dos pares A4 o aire. QQ raisearía antes; JTs sin as no — aquí A4s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "4h"],
          teachBack: "A4s dos pares polar. QQ y JTs no.",
          options: [
            { id: "a", cards: ["Qs", "Qc"], label: "QQ", correct: false,
              eliminated: "Overpair al board AK: suele raisear antes — float + overbet river es raro." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin as/4: no overbetea river por value." },
            { id: "c", cards: ["Ah", "4h"], label: "A4s", correct: true }
          ]
        }
      }),
      LQ("r15-08", "BB", ["Kc", "7c"], ["Ts", "9d", "2h", "5c", "Qh"], 77808, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Ts 9d 2h — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "5c — BB check → HJ bet → BB call" },
          { street: "River", text: "Qh — BB check → HJ bet grande" }
        ],
        teachBack: "Triple barrel → Q: polar Qx o farol. 88 pot-controla; 66 no — aquí QJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jd"],
          teachBack: "QJo polar al Q. 88 y 66 no.",
          options: [
            { id: "a", cards: ["8h", "8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river cuando llega Q." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair: no triple barrel polar." },
            { id: "c", cards: ["Qs", "Jd"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r15-09", "BTN", ["Ad", "Td"], ["8c", "7c", "3h", "Kd", "2s"], 77809, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8c 7c 3h — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Kd — BB bet → BTN call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Raise flop two-tone: polar flush o set. AKo sin club no; JJ underpair tampoco — aquí 8h8d set… wait 8s8d.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8s", "8d"],
          teachBack: "88 set polar. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ah", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 873 clubs sin club/set: call/fold, no raise polar." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop polar sin set." },
            { id: "c", cards: ["8s", "8d"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r15-10", "BB", ["Qh", "9s"], ["As", "Jd", "5c", "3h", "2d"], 77810, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Jd 5c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "3h — check-check" },
          { street: "River", text: "2d — BB check → BTN bet grande" }
        ],
        teachBack: "C-bet + check turn + overbet river: polar Ax thin o farol. KK betearía turn; T8s sin as no — aquí ATo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Td"],
          teachBack: "ATo polar thin. KK y T8s no.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet-river encaja peor." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el overbet river no es value creíble." },
            { id: "c", cards: ["Ah", "Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r15-11", "BTN", ["Kh", "Jh"], ["Qc", "6d", "2s", "9h", "4c"], 77811, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc 6d 2s — BB donk → BTN call" },
          { street: "Turn", text: "9h — BB bet → BTN call" },
          { street: "River", text: "4c — BB bet grande" }
        ],
        teachBack: "Donk + overbet: polar Qx/set. AKo sin Q no donkea; 77 tampoco — aquí QQ.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Qd"],
          teachBack: "QQ set/overpair polar vía donk. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As", "Kd"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en Q62 sin Q: check-call, no donk polar." },
            { id: "b", cards: ["Qh", "Qd"], label: "QQ", correct: true },
            { id: "c", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no donkea Q62 y overbetea river." }
          ]
        }
      }),
      LQ("r15-12", "BB", ["Td", "8d"], ["Kh", "9c", "3s", "2h", "7d"], 77812, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh 9c 3s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet → BB call" },
          { street: "River", text: "7d — BB check → CO bet grande" }
        ],
        teachBack: "Triple barrel K-high grande: polar Kx o farol. 88 pot-controla; AJo sin K no — aquí KQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Qs"],
          teachBack: "KQo polar value. 88 y AJo no.",
          options: [
            { id: "a", cards: ["8h", "8s"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet river polar." },
            { id: "b", cards: ["Ah", "Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin K: no barrela tres calles polar por value." },
            { id: "c", cards: ["Kd", "Qs"], label: "KQo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-16"] = [
      LQ("r16-01", "BB", ["As", "Kd"], ["Qh", "Jh", "9h", "2c", "4d"], 77901, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qh Jh 9h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet → BB call" },
          { street: "River", text: "4d — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel monotone hearts: color AhXh (blocker de nuts) o farol. KK sin heart no; 88 sin heart no — aquí AhTh color.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Th"],
          teachBack: "ATs nut flush (blocker+value). KK y 88 sin heart no barrela color.",
          options: [
            { id: "a", cards: ["Kc", "Ks"], label: "KK", correct: false,
              eliminated: "Overpair sin heart: en monotone pot-controla turn, no triple barrel de color." },
            { id: "b", cards: ["8c", "8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no barrela tres calles en monotone." },
            { id: "c", cards: ["Ah", "Th"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r16-02", "BTN", ["Kd", "Qd"], ["As", "Ts", "5s", "8c", "2h"], 77902, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Ts 5s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "8c — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Raise flop spades: nut flush KsXs o farol con As blocker… aquí KsJs color. AQo rainbow no; 99 sin spade no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ks", "Js"],
          teachBack: "KJs color (blocker de K). AQo y 99 sin spade no.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en AT5 spades sin spade: call/fold, no raise polar de color." },
            { id: "b", cards: ["9h", "9d"], label: "99", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Ks", "Js"], label: "KJs", correct: true }
          ]
        }
      }),
      LQ("r16-03", "BB", ["Qh", "9c"], ["Kd", "Jd", "4d", "2s", "8h"], 77903, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kd Jd 4d — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "8h — BB check → CO bet" }
        ],
        teachBack: "C-bet + check + bet: AdXd nut flush thin. QQ sin diamond no; T9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "Td"],
          teachBack: "ATo nut flush. QQ y T9s sin diamond no.",
          options: [
            { id: "a", cards: ["Qs", "Qc"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: tras c-bet suele seguir o checkear river — check-turn + bet flush encaja peor." },
            { id: "b", cards: ["Th", "9h"], label: "T9s", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: tras check turn el river bet no es value de color." },
            { id: "c", cards: ["Ad", "Td"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r16-04", "BTN", ["Ah", "Jh"], ["9c", "7c", "2c", "Kd", "4s"], 77904, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 7c 2c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kd — BB check → BTN bet → BB call" },
          { street: "River", text: "4s — BB bet" }
        ],
        teachBack: "Float + bet river clubs: color AcXc (blocker as). QQ sin club raisearía antes; JTs sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac", "8c"],
          teachBack: "A8o nut flush. QQ y JTs sin club no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair sin club: a menudo raisea flop — float + bet river de flush es raro." },
            { id: "b", cards: ["Jd", "Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin club: no apuesta river por value de color." },
            { id: "c", cards: ["Ac", "8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r16-05", "BB", ["Kc", "8d"], ["Qs", "Js", "5s", "3h", "2d"], 77905, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs Js 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel spades: AsXs nuts. KK sin spade no; 77 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATs nut flush. KK y 77 no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: pot-control turn en two-tone, no triple barrel de color." },
            { id: "b", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair sin flush: no barrela tres calles." },
            { id: "c", cards: ["As", "Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r16-06", "BTN", ["Td", "9d"], ["Ah", "6h", "3h", "Qc", "2s"], 77906, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah 6h 3h — BB check-raise → BTN call" },
          { street: "Turn", text: "Qc — BB bet → BTN call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Check-raise hearts: KhXh o nut Ah. AKo rainbow no; 88 sin heart no — aquí Kh9h.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9h"],
          teachBack: "K9s color (blocker K). AKo y 88 sin heart no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en A63 hearts sin heart: call/fold, no check-raise de color." },
            { id: "b", cards: ["8c", "8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Kh", "9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r16-07", "BB", ["Jh", "Tc"], ["9d", "8d", "2d", "Kc", "4h"], 77907, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "9d 8d 2d — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "Kc — BB check → HJ bet → BB call" },
          { street: "River", text: "4h — BB check → HJ bet" }
        ],
        teachBack: "Barrel diamonds: AdXd nuts. QQ sin diamond no; ATo sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "5d"],
          teachBack: "A5s nut flush. QQ y ATo sin diamond no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair sin diamond: pot-control, no triple barrel de color." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin diamond: no barrela tres calles de flush." },
            { id: "c", cards: ["Ad", "5d"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r16-08", "BTN", ["Kd", "Jd"], ["Tc", "6c", "4c", "As", "2h"], 77908, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Tc 6c 4c — check-check" },
          { street: "Turn", text: "As — BB check → BTN bet → BB call" },
          { street: "River", text: "2h — BB check → BTN bet" }
        ],
        teachBack: "Slowplay + delayed color AcXc. AA betearía flop; QJo sin club no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ac", "8c"],
          teachBack: "A8o flush tras slowplay. AA no checkea; QJo sin club no.",
          options: [
            { id: "a", cards: ["Ah", "Ad"], label: "AA", correct: false,
              eliminated: "Premium: en monotone casi siempre c-betea. El check-check lo elimina." },
            { id: "b", cards: ["Qs", "Jh"], label: "QJo", correct: false,
              eliminated: "Open OK; sin club, delayed barrel no es value de color." },
            { id: "c", cards: ["Ac", "8c"], label: "A8o", correct: true }
          ]
        }
      }),
      LQ("r16-09", "BB", ["Ah", "9s"], ["Kd", "7d", "3d", "2c", "Ts"], 77909, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 7d 3d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2c — BB bet → BTN call" },
          { street: "River", text: "Ts — BB bet" }
        ],
        teachBack: "Raise flop diamonds: QdJd color (blocker Q). AKo sin diamond no; 99 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd", "Jd"],
          teachBack: "QJs color. AKo y 99 sin diamond no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en K73 diamonds sin diamond: call/fold, no raise polar." },
            { id: "b", cards: ["9h", "9c"], label: "99", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Qd", "Jd"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r16-10", "BTN", ["Qc", "Jc"], ["8s", "5s", "2s", "Kh", "9d"], 77910, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8s 5s 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kh — BB check → BTN bet → BB call" },
          { street: "River", text: "9d — BB bet" }
        ],
        teachBack: "Float + bet river spades: AsXs nuts. KK sin spade raisearía antes; T9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATs nut flush. KK y T9s sin spade no.",
          options: [
            { id: "a", cards: ["Kd", "Kc"], label: "KK", correct: false,
              eliminated: "Overpair sin spade: a menudo raisea flop — float + bet river flush es raro." },
            { id: "b", cards: ["Th", "9h"], label: "T9s", correct: false,
              eliminated: "Call flop posible, pero sin spade: no apuesta river por value de color." },
            { id: "c", cards: ["As", "Ts"], label: "ATs", correct: true }
          ]
        }
      }),
      LQ("r16-11", "BB", ["Kd", "8c"], ["Qh", "Th", "4h", "2d", "9c"], 77911, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Qh Th 4h — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — check-check" },
          { street: "River", text: "9c — BB check → CO bet" }
        ],
        teachBack: "C-bet + check + bet: AhXh nut flush. JJ sin heart betearía turn; J9s sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "8h"],
          teachBack: "A8s nut flush. JJ y J9s sin heart no.",
          options: [
            { id: "a", cards: ["Js", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair sin heart: tras c-bet suele seguir en turn. Check-turn + bet flush encaja peor." },
            { id: "b", cards: ["Jh", "9d"], label: "J9o", correct: false,
              eliminated: "Puede c-bet, pero sin heart: tras check turn el river bet no es value de color." },
            { id: "c", cards: ["Ah", "8h"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r16-12", "BTN", ["As", "9s"], ["Jc", "7c", "3c", "2d", "Kh"], 77912, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc 7c 3c — BB check-raise → BTN call" },
          { street: "Turn", text: "2d — BB bet → BTN call" },
          { street: "River", text: "Kh — BB bet" }
        ],
        teachBack: "Check-raise clubs: KcXc color (blocker). AQo sin club no; 88 sin flush no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "Tc"],
          teachBack: "KTo color. AQo y 88 sin club no.",
          options: [
            { id: "a", cards: ["Ah", "Qd"], label: "AQo", correct: false,
              eliminated: "Call BB; en J73 clubs sin club: call/fold, no check-raise de color." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair sin flush: no raisea flop monotone." },
            { id: "c", cards: ["Kc", "Tc"], label: "KTo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-17"] = [
      LQ("r17-01", "BB", ["Ah", "Kd"], ["9s", "9c", "4h", "4d", "2c"], 78001, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9s 9c 4h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "4d — BB check → BTN bet → BB call" },
          { street: "River", text: "2c — BB check → BTN bet" }
        ],
        teachBack: "Double paired board: boat 99 vs 44. Triple barrel = full de nueves. QQ pot-controla; AJo sin 9/4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "9d"],
          teachBack: "99 boat sobre 44. QQ y AJo no barrela boat.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: en board double paired suele pot-controlar turn — no triple barrel como boat de nueves." },
            { id: "b", cards: ["Ac", "Jd"], label: "AJo", correct: false,
              eliminated: "Puede c-bet, pero sin 9/4: no mete tres calles por value de full." },
            { id: "c", cards: ["9h", "9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r17-02", "BTN", ["Kc", "Qc"], ["7h", "7d", "3s", "3c", "Ad"], 78002, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "7h 7d 3s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "3c — BB bet → BTN call" },
          { street: "River", text: "Ad — BB bet" }
        ],
        teachBack: "Raise flop paired: boat 77 vs 33. AKo sin 7 no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["7c", "7s"],
          teachBack: "77 boat. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As", "Kh"], label: "AKo", correct: false,
              eliminated: "Call BB; en 773 sin 7/3: call/fold, no raise polar de boat." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop de full sin 77." },
            { id: "c", cards: ["7c", "7s"], label: "77", correct: true }
          ]
        }
      }),
      LQ("r17-03", "BB", ["Qd", "Jd"], ["Ts", "Th", "6c", "6h", "2d"], 78003, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Ts Th 6c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "6h — check-check" },
          { street: "River", text: "2d — BB check → CO bet" }
        ],
        teachBack: "C-bet + check turn boat board + bet river: full de dieces lento. KK betearía turn; A9o sin T/6 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Td", "Tc"],
          teachBack: "TT boat lento. KK y A9o no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn aunque parea. Check-turn + bet-river boat encaja peor." },
            { id: "b", cards: ["Ah", "9c"], label: "A9o", correct: false,
              eliminated: "Puede c-bet aire, pero sin T/6: tras check turn el river bet no es value de full." },
            { id: "c", cards: ["Td", "Tc"], label: "TT", correct: true }
          ]
        }
      }),
      LQ("r17-04", "BTN", ["As", "Js"], ["5d", "5c", "Kh", "Kc", "2s"], 78004, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "5d 5c Kh — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kc — BB check → BTN bet → BB raise → BTN call" },
          { street: "River", text: "2s — BB bet" }
        ],
        teachBack: "Call flop + raise turn double king: boat 55 o KK. AQo sin 5 no raisea turn; QQ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["5h", "5s"],
          teachBack: "55 boat sobre reyes. AQo y QQ no.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Float flop posible, pero raise turn cuando parea K sin 5: farol raro." },
            { id: "b", cards: ["Qh", "Qd"], label: "QQ", correct: false,
              eliminated: "Underpair al K: a menudo folds/calls — raise turn boat es más de 55." },
            { id: "c", cards: ["5h", "5s"], label: "55", correct: true }
          ]
        }
      }),
      LQ("r17-05", "BB", ["8h", "7h"], ["Jd", "Jc", "4s", "4h", "9c"], 78005, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jd Jc 4s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "4h — BB check → BTN bet → BB call" },
          { street: "River", text: "9c — BB check → BTN bet" }
        ],
        teachBack: "Triple barrel JJ44: boat de jotas. 99 pot-controla; ATo sin J/4 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Js"],
          teachBack: "JJ boat. 99 y ATo no.",
          options: [
            { id: "a", cards: ["9s", "9d"], label: "99", correct: false,
              eliminated: "Underpair: pot-control cuando el board double parea, no triple barrel boat." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin J/4: no barrela tres calles de full." },
            { id: "c", cards: ["Jh", "Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r17-06", "BTN", ["Kd", "9d"], ["8s", "8h", "2c", "2d", "Ah"], 78006, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8s 8h 2c — BB donk → BTN call" },
          { street: "Turn", text: "2d — BB bet → BTN call" },
          { street: "River", text: "Ah — BB bet" }
        ],
        teachBack: "Donk paired + presión: boat 88. AKo sin 8 no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8c", "8d"],
          teachBack: "88 boat vía donk. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 882 sin 8/2: check-call, no donk boat." },
            { id: "b", cards: ["8c", "8d"], label: "88", correct: true },
            { id: "c", cards: ["Th", "Td"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea 882 y mete tres calles de boat sin 88." }
          ]
        }
      }),
      LQ("r17-07", "BB", ["Ah", "Tc"], ["6d", "6c", "Qs", "Qh", "3s"], 78007, {
        villainPos: "HJ", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "6d 6c Qs — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "Qh — BB check → HJ bet → BB call" },
          { street: "River", text: "3s — BB check → HJ bet" }
        ],
        teachBack: "Barrel 66QQ: boat de seises o damas. KK pot-controla; J9s sin 6/Q no — aquí 66.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["6h", "6s"],
          teachBack: "66 boat. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: suele pot-controlar en double paired, no triple barrel boat de seises." },
            { id: "b", cards: ["Jh", "9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet, pero sin 6/Q: no barrela boat." },
            { id: "c", cards: ["6h", "6s"], label: "66", correct: true }
          ]
        }
      }),
      LQ("r17-08", "BTN", ["Qc", "Jd"], ["4h", "4d", "9s", "9c", "Kd"], 78008, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "4h 4d 9s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "9c — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB bet" }
        ],
        teachBack: "Float + bet river 4499K: boat 99. AA betearía distinto; 77 sin 4/9 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "9d"],
          teachBack: "99 boat. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ah"], label: "AA", correct: false,
              eliminated: "En 449 casi siempre betea/raisea antes: float + bet river boat es raro para AA." },
            { id: "b", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river por value de full tras float." },
            { id: "c", cards: ["9h", "9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r17-09", "BB", ["Kd", "Td"], ["3c", "3h", "As", "Ad", "8s"], 78009, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "3c 3h As — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Ad — check-check" },
          { street: "River", text: "8s — BB check → BTN bet" }
        ],
        teachBack: "C-bet + check turn AAA33 + bet river: boat de ases lento. QQ betearía turn; JTo sin A/3 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Ac"],
          teachBack: "AA boat lento. QQ y JTo no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-river boat encaja peor." },
            { id: "b", cards: ["Jh", "Tc"], label: "JTo", correct: false,
              eliminated: "Puede c-bet aire, pero sin A/3: tras check turn el river bet no es value de full." },
            { id: "c", cards: ["Ah", "Ac"], label: "AA", correct: true }
          ]
        }
      }),
      LQ("r17-10", "BTN", ["Th", "8h"], ["Jc", "Jd", "5d", "5s", "2h"], 78010, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc Jd 5d — BB check-raise → BTN call" },
          { street: "Turn", text: "5s — BB bet → BTN call" },
          { street: "River", text: "2h — BB bet" }
        ],
        teachBack: "Check-raise JJ5: boat JJ. AQo sin J no; 88 underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Js"],
          teachBack: "JJ boat. AQo y 88 no.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en JJ5 sin J/5: call/fold, no check-raise boat." },
            { id: "b", cards: ["8c", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop de full sin JJ." },
            { id: "c", cards: ["Jh", "Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r17-11", "BB", ["9c", "8c"], ["Kh", "Kc", "7s", "7d", "2c"], 78011, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh Kc 7s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "7d — BB check → CO bet → BB call" },
          { street: "River", text: "2c — BB check → CO bet" }
        ],
        teachBack: "Triple barrel KK77: boat de reyes. QQ pot-controla; ATo sin K/7 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Ks"],
          teachBack: "KK boat. QQ y ATo no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Underpair al K: pot-control en double paired, no triple barrel boat." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet, pero sin K/7: no barrela boat." },
            { id: "c", cards: ["Kd", "Ks"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r17-12", "BTN", ["Ad", "9d"], ["2h", "2c", "Qs", "Qd", "8h"], 78012, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "2h 2c Qs — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Qd — BB check → BTN bet → BB raise → BTN call" },
          { street: "River", text: "8h — BB bet" }
        ],
        teachBack: "Call flop + raise turn QQ22: boat 22 o QQ. AKo sin 2 no raisea; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["2s", "2d"],
          teachBack: "22 boat. AKo y JJ no.",
          options: [
            { id: "a", cards: ["Ah", "Kc"], label: "AKo", correct: false,
              eliminated: "Float posible, pero raise turn cuando parea Q sin 2: farol raro." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Underpair al Q: no raisea turn boat." },
            { id: "c", cards: ["2s", "2d"], label: "22", correct: true }
          ]
        }
      })
  ];

  PACKS["R-18"] = [
      LQ("r18-01", "BB", ["9h", "9c"], ["As", "Td", "4c", "2h", "7d"], 78101, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Td 4c — BB check → BTN c-bet pequeño → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet pequeño → BB call" },
          { street: "River", text: "7d — BB check → BTN overbet" }
        ],
        teachBack: "Pequeño-pequeño-overbet: polar Ax nuts o farol. QQ pot-controla sizing; 55 no overbetea — aquí AKo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Kc"],
          teachBack: "AKo overbet polar. QQ y 55 no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bets pequeños suele sizing medio o pot-control — overbet river polar encaja peor que Ax." },
            { id: "b", cards: ["5h", "5d"], label: "55", correct: false,
              eliminated: "Underpair: no convierte línea small-small en overbet river." },
            { id: "c", cards: ["Ah", "Kc"], label: "AKo", correct: true }
          ]
        }
      }),
      LQ("r18-02", "BTN", ["Kd", "Jd"], ["Qc", "8h", "3s", "2d", "9c"], 78102, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc 8h 3s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "9c — BB overbet" }
        ],
        teachBack: "Float + overbet river Q-high: Qx fuerte o aire. AA raisearía antes; 77 sin Q no — aquí QTs.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Ts"],
          teachBack: "QTo overbet value. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "En Q83 casi siempre betea/raisea antes: float + overbet river es raro para AA." },
            { id: "b", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river tras float sin Q." },
            { id: "c", cards: ["Qh", "Ts"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r18-03", "BB", ["Jc", "Tc"], ["Kh", "6d", "2s", "9h", "3c"], 78103, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh 6d 2s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "9h — check-check" },
          { street: "River", text: "3c — BB check → CO overbet" }
        ],
        teachBack: "C-bet + check turn + overbet: Kx thin polar. JJ betearía turn; ATo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kd", "Qs"],
          teachBack: "KQo overbet thin. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet encaja peor." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin K: tras check turn el overbet no es value." },
            { id: "c", cards: ["Kd", "Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r18-04", "BTN", ["Ah", "8h"], ["Jd", "9c", "4h", "2s", "7d"], 78104, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jd 9c 4h — BB check-raise grande → BTN call" },
          { street: "Turn", text: "2s — BB bet → BTN call" },
          { street: "River", text: "7d — BB overbet" }
        ],
        teachBack: "Check-raise grande + overbet: polar set JJ. AKo sin pareja no; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Js"],
          teachBack: "JJ set overbet. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en J94 sin pareja: call/fold, no check-raise grande polar." },
            { id: "b", cards: ["Th", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop polar grande sin set." },
            { id: "c", cards: ["Jh", "Js"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r18-05", "BB", ["Qd", "8d"], ["As", "7h", "3c", "5s", "Kd"], 78105, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 7h 3c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5s — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB check → BTN overbet" }
        ],
        teachBack: "Triple barrel → overbet al K: Ax o farol. 88 pot-controla; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Qc"],
          teachBack: "AQo overbet al K. 88 y J9s no.",
          options: [
            { id: "a", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no overbet cuando llega K." },
            { id: "b", cards: ["Jh", "9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: no overbetea river al K por value." },
            { id: "c", cards: ["Ah", "Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r18-06", "BTN", ["Kc", "9c"], ["Th", "8d", "2c", "6h", "As"], 78106, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Th 8d 2c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "6h — BB check → BTN bet → BB call" },
          { street: "River", text: "As — BB overbet" }
        ],
        teachBack: "Float + overbet al A: Ax o farol con blocker. QQ raisearía antes; 77 sin as no — aquí A5s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "5h"],
          teachBack: "A5s overbet. QQ y 77 no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — float + overbet al A es raro." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river al A tras float." },
            { id: "c", cards: ["Ah", "5h"], label: "A5s", correct: true }
          ]
        }
      }),
      LQ("r18-07", "BB", ["Jh", "9s"], ["Qc", "7d", "2h", "5c", "Td"], 78107, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Qc 7d 2h — BB check → HJ c-bet pequeño → BB call" },
          { street: "Turn", text: "5c — BB check → HJ bet pequeño → BB call" },
          { street: "River", text: "Td — BB check → HJ overbet" }
        ],
        teachBack: "Small-small-overbet Q-high: Qx polar. 99 pot-controla; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Js"],
          teachBack: "QJo overbet. 99 y 66 no.",
          options: [
            { id: "a", cards: ["9h", "9c"], label: "99", correct: false,
              eliminated: "Underpair: no convierte small-small en overbet river." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair: no overbetea river polar." },
            { id: "c", cards: ["Qh", "Js"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r18-08", "BTN", ["Ad", "Td"], ["8s", "8c", "4h", "Kd", "2d"], 78108, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8s 8c 4h — BB donk grande → BTN call" },
          { street: "Turn", text: "Kd — BB bet → BTN call" },
          { street: "River", text: "2d — BB overbet" }
        ],
        teachBack: "Donk grande paired + overbet: boat 88. AKo sin 8 no; JJ tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "8d"],
          teachBack: "88 boat overbet. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 884 sin 8: check-call, no donk grande de boat." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: true },
            { id: "c", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: no donkea grande 884 y overbetea river sin boat." }
          ]
        }
      }),
      LQ("r18-09", "BB", ["Kh", "7d"], ["Js", "9c", "3d", "2h", "Qc"], 78109, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Js 9c 3d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet → BB call" },
          { street: "River", text: "Qc — BB check → BTN overbet" }
        ],
        teachBack: "Triple barrel → overbet Q: Qx o farol. TT pot-controla; A8o sin Q/J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qd", "Td"],
          teachBack: "QTo overbet. TT y A8o no.",
          options: [
            { id: "a", cards: ["Th", "Ts"], label: "TT", correct: false,
              eliminated: "Underpair/overcard: pot-control turn, no overbet cuando llega Q." },
            { id: "b", cards: ["Ah", "8c"], label: "A8o", correct: false,
              eliminated: "Puede c-bet, pero sin Q/J fuerte: no overbetea river por value." },
            { id: "c", cards: ["Qd", "Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r18-10", "BTN", ["Qc", "Jc"], ["Kd", "5h", "2s", "9c", "7h"], 78110, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 5h 2s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "9c — BB bet → BTN call" },
          { street: "River", text: "7h — BB overbet" }
        ],
        teachBack: "Raise flop K52 + overbet: polar set KK. AJo sin K no; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Ks"],
          teachBack: "KK set overbet. AJo y 88 no.",
          options: [
            { id: "a", cards: ["As", "Jd"], label: "AJo", correct: false,
              eliminated: "Call BB; en K52 sin K: call/fold, no raise polar." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop polar sin set." },
            { id: "c", cards: ["Kh", "Ks"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r18-11", "BB", ["Td", "9d"], ["Ah", "6c", "2s", "8h", "4d"], 78111, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Ah 6c 2s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "8h — check-check" },
          { street: "River", text: "4d — BB check → CO overbet" }
        ],
        teachBack: "C-bet + check + overbet: Ax thin polar. KK betearía turn; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Qs"],
          teachBack: "AQs overbet thin. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + overbet encaja peor." },
            { id: "b", cards: ["Jh", "9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el overbet no es value." },
            { id: "c", cards: ["As", "Qs"], label: "AQs", correct: true }
          ]
        }
      }),
      LQ("r18-12", "BTN", ["9s", "8s"], ["Qh", "Tc", "4d", "2c", "Kd"], 78112, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qh Tc 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB overbet" }
        ],
        teachBack: "Float + overbet al K: Kx o farol. AA betearía distinto; 77 sin K/Q no — aquí KJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Js"],
          teachBack: "KJo overbet al K. AA y 77 no.",
          options: [
            { id: "a", cards: ["Ac", "Ah"], label: "AA", correct: false,
              eliminated: "En flop: En QT4 casi siempre betea antes: float + overbet al K es raro para AA." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no overbetea river al K tras float." },
            { id: "c", cards: ["Kh", "Js"], label: "KJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-19"] = [
      LQ("r19-01", "BB", ["Jh", "Td"], ["As", "9c", "4d", "2h", "7s"], 78201, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As 9c 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "7s — BB check → BTN bet pequeño" }
        ],
        teachBack: "C-bet + check turn + bet pequeño river: thin Ax. KK betearía turn; QJo sin as no cobra thin.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ad", "8d"],
          teachBack: "A8s thin value. KK y QJo no.",
          options: [
            { id: "a", cards: ["Kc", "Kh"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño river thin encaja peor." },
            { id: "b", cards: ["Qs", "Jd"], label: "QJo", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value creíble." },
            { id: "c", cards: ["Ad", "8d"], label: "A8s", correct: true }
          ]
        }
      }),
      LQ("r19-02", "BTN", ["Kd", "Qs"], ["Jc", "7h", "3d", "9s", "2c"], 78202, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jc 7h 3d — check-check" },
          { street: "Turn", text: "9s — BB check → BTN bet → BB call" },
          { street: "River", text: "2c — BB check → BTN bet pequeño" }
        ],
        teachBack: "Delayed + bet pequeño river: Jx thin. AA betearía flop; ATo sin J no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Jh", "Ts"],
          teachBack: "JTo thin delayed. AA no checkea; ATo sin J no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en J-high casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["As", "Td"], label: "ATo", correct: false,
              eliminated: "Open OK; sin J, delayed + bet pequeño river no es value natural." },
            { id: "c", cards: ["Jh", "Ts"], label: "JTo", correct: true }
          ]
        }
      }),
      LQ("r19-03", "BB", ["8h", "8c"], ["Kh", "Td", "5s", "2d", "9c"], 78203, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh Td 5s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet → BB call" },
          { street: "River", text: "9c — BB check → CO bet pequeño" }
        ],
        teachBack: "Triple barrel pequeño K-high: Kx thin. QQ sizing distinto; 66 no cobra thin.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "Js"],
          teachBack: "KJo thin. QQ y 66 no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea o sizing mayor — bet pequeño de tres calles thin es más de Kx." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair: pot-control, no bet pequeño river thin de Kx." },
            { id: "c", cards: ["Kc", "Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r19-04", "BTN", ["Ah", "9h"], ["Qd", "8c", "2s", "5h", "Tc"], 78204, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qd 8c 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5h — BB check → BTN bet → BB call" },
          { street: "River", text: "Tc — BB bet pequeño" }
        ],
        teachBack: "Float + bet pequeño river: Qx thin. AA raisearía antes; J9s sin Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jd"],
          teachBack: "QJo thin float. AA y J9s no.",
          options: [
            { id: "a", cards: ["Ac", "Ad"], label: "AA", correct: false,
              eliminated: "En Q82 casi siempre betea/raisea antes: float + bet pequeño river es raro para AA." },
            { id: "b", cards: ["Jh", "9d"], label: "J9o", correct: false,
              eliminated: "Call flop posible, pero sin Q: no apuesta river thin por value." },
            { id: "c", cards: ["Qs", "Jd"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r19-05", "BB", ["Kd", "9d"], ["Ah", "7c", "3h", "2s", "6d"], 78205, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah 7c 3h — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — check-check" },
          { street: "River", text: "6d — BB check → BTN bet pequeño" }
        ],
        teachBack: "C-bet + check + bet pequeño: Ax thin. JJ betearía turn; T8s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATo thin. JJ y T8s no.",
          options: [
            { id: "a", cards: ["Jh", "Jc"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño thin encaja peor." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value." },
            { id: "c", cards: ["As", "Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r19-06", "BTN", ["Qc", "Tc"], ["Kd", "9h", "4c", "2s", "8d"], 78206, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 9h 4c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB call" },
          { street: "River", text: "8d — BB bet pequeño" }
        ],
        teachBack: "Float + bet pequeño: Kx thin. AA betearía distinto; 77 sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Js"],
          teachBack: "KJo thin. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ah"], label: "AA", correct: false,
              eliminated: "En K94 casi siempre betea antes: float + bet pequeño river es raro para AA." },
            { id: "b", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river thin tras float." },
            { id: "c", cards: ["Kh", "Js"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r19-07", "BB", ["Jh", "8h"], ["Qs", "Tc", "5d", "2c", "9h"], 78207, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Qs Tc 5d — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → HJ bet → BB call" },
          { street: "River", text: "9h — BB check → HJ bet pequeño" }
        ],
        teachBack: "Triple barrel pequeño Q-high: Qx thin. 99 pot-controla; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Jd"],
          teachBack: "QJo thin. 99 y 66 no.",
          options: [
            { id: "a", cards: ["9s", "9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control turn, no bet pequeño river thin de Qx." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair: no barrela thin tres calles." },
            { id: "c", cards: ["Qh", "Jd"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r19-08", "BTN", ["Ad", "8d"], ["Jh", "6c", "2s", "9d", "4h"], 78208, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh 6c 2s — BB donk pequeño → BTN call" },
          { street: "Turn", text: "9d — BB bet pequeño → BTN call" },
          { street: "River", text: "4h — BB bet pequeño" }
        ],
        teachBack: "Donk pequeño + thin: Jx. AKo sin J no donkea; TT tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Td"],
          teachBack: "JTo thin donk. AKo y TT no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en J62 sin J: check-call, no donk thin." },
            { id: "b", cards: ["Js", "Td"], label: "JTo", correct: true },
            { id: "c", cards: ["Th", "Tc"], label: "TT", correct: false,
              eliminated: "Overpair: no donkea pequeño J62 y mete tres calles thin sin J." }
          ]
        }
      }),
      LQ("r19-09", "BB", ["Kc", "7c"], ["Ad", "Td", "3s", "8h", "2c"], 78209, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ad Td 3s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "8h — check-check" },
          { street: "River", text: "2c — BB check → BTN bet pequeño" }
        ],
        teachBack: "C-bet + check + bet pequeño: Ax thin. KK betearía turn; J9s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "9s"],
          teachBack: "A9o thin. KK y J9s no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-pequeño thin encaja peor." },
            { id: "b", cards: ["Jh", "9h"], label: "J9s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet pequeño no es value." },
            { id: "c", cards: ["Ah", "9s"], label: "A9o", correct: true }
          ]
        }
      }),
      LQ("r19-10", "BTN", ["9h", "8h"], ["Kc", "Qs", "4d", "2h", "7c"], 78210, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kc Qs 4d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → BTN bet → BB call" },
          { street: "River", text: "7c — BB bet pequeño" }
        ],
        teachBack: "Float + bet pequeño KQ4: Kx thin. AA raisearía antes; JTs sin K/Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Jd"],
          teachBack: "KJo thin. AA y JTs no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "En KQ4 casi siempre betea/raisea antes: float + bet pequeño es raro para AA." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero sin K/Q: no apuesta river thin." },
            { id: "c", cards: ["Kh", "Jd"], label: "KJo", correct: true }
          ]
        }
      }),
      LQ("r19-11", "BB", ["Td", "8c"], ["Ah", "Jh", "5c", "2d", "9s"], 78211, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Ah Jh 5c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet → BB call" },
          { street: "River", text: "9s — BB check → CO bet pequeño" }
        ],
        teachBack: "Triple barrel pequeño A-high: Ax thin. QQ sizing distinto; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATo thin. QQ y 66 no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea o sizing mayor — bet pequeño thin es más de Ax." },
            { id: "b", cards: ["6h", "6d"], label: "66", correct: false,
              eliminated: "Underpair: no barrela thin tres calles." },
            { id: "c", cards: ["As", "Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r19-12", "BTN", ["Qh", "9h"], ["Kd", "7c", "3s", "5h", "Tc"], 78212, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd 7c 3s — check-check" },
          { street: "Turn", text: "5h — BB check → BTN bet → BB call" },
          { street: "River", text: "Tc — BB check → BTN bet pequeño" }
        ],
        teachBack: "Delayed + bet pequeño: Kx thin. AA betearía flop; AJo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Js"],
          teachBack: "KJo thin delayed. AA no checkea; AJo sin K no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "En K-high seco casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["Ah", "Jd"], label: "AJo", correct: false,
              eliminated: "En flop: Open OK; sin K, delayed + bet pequeño no es value natural." },
            { id: "c", cards: ["Kh", "Js"], label: "KJo", correct: true }
          ]
        }
      })
  ];

  PACKS["R-20"] = [
      LQ("r20-01", "BTN", ["Ah", "Qd"], ["9h", "8c", "2d", "Kd", "3s"], 78301, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9h 8c 2d — BB donk → BTN call" },
          { street: "Turn", text: "Kd — check-check" },
          { street: "River", text: "3s — BB bet" }
        ],
        teachBack: "Donk flop + check turn K + bet river: set 99 o rareza. AKo sin 9 no donkea; JTs sin 9 tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9s", "9d"],
          teachBack: "99 donk raro + river. AKo y JTs no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 982 sin 9/8: check-call, no donk flop." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Call BB OK; sin 9 suele checkear flop, no donkear y luego bet river tras check turn." },
            { id: "c", cards: ["9s", "9d"], label: "99", correct: true }
          ]
        }
      }),
      LQ("r20-02", "BB", ["Kc", "7c"], ["As", "Jd", "4h", "2s", "9c"], 78302, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Jd 4h — check-check" },
          { street: "Turn", text: "2s — BB check → BTN bet → BB raise → BTN call" },
          { street: "River", text: "9c — BB check → BTN bet" }
        ],
        teachBack: "Check flop + delayed bet + call raise turn: Ax fuerte. QQ betearía flop; T8s sin as no — aquí AQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Qc"],
          teachBack: "AQo línea rara delayed. QQ no checkea flop; T8s no.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: en A-high casi siempre c-betea flop. El check-check lo saca." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: false,
              eliminated: "Open OK; sin as, delayed bet + call raise turn no es value natural." },
            { id: "c", cards: ["Ah", "Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r20-03", "BTN", ["Kd", "Jd"], ["Qc", "Tc", "5s", "2h", "8d"], 78303, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc Tc 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — BB donk turn → BTN call" },
          { street: "River", text: "8d — BB bet" }
        ],
        teachBack: "Call flop + donk turn: dos pares QT o rareza. AKo sin Q/T no donkea turn; 88 tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Th"],
          teachBack: "QTo donk turn. AKo y 88 no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call flop posible, pero donk turn en QT5 sin Q/T: no — suele checkear." },
            { id: "b", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair: no donkea turn tras call flop." },
            { id: "c", cards: ["Qh", "Th"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r20-04", "BB", ["9h", "8h"], ["Kh", "7d", "2c", "As", "3h"], 78304, {
        villainPos: "CO", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kh 7d 2c — BB check → CO c-bet → BB check-raise → CO call" },
          { street: "Turn", text: "As — BB check → CO bet → BB call" },
          { street: "River", text: "3h — BB bet" }
        ],
        teachBack: "Check-raise flop + check turn A + bet river: set KK o línea rara. AJo sin K no XR; TT tampoco — aquí KK.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kc", "Kd"],
          teachBack: "KK XR + river raro. AJo y TT no.",
          options: [
            { id: "a", cards: ["Ah", "Jd"], label: "AJo", correct: false,
              eliminated: "Call BB; en K72 sin K: call/fold, no check-raise flop." },
            { id: "b", cards: ["Tc", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no check-raisea flop polar sin set." },
            { id: "c", cards: ["Kc", "Kd"], label: "KK", correct: true }
          ]
        }
      }),
      LQ("r20-05", "BTN", ["As", "Ts"], ["8d", "6c", "3h", "Qh", "2s"], 78305, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8d 6c 3h — check-check" },
          { street: "Turn", text: "Qh — BB bet → BTN call" },
          { street: "River", text: "2s — BB check → BTN bet" }
        ],
        teachBack: "Check flop + call turn Q + bet river: 88 set slowplay. AA betearía flop; J9s sin 8 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "8s"],
          teachBack: "88 slowplay raro. AA no checkea; J9s no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en board bajo casi siempre c-betea. El check-check lo elimina." },
            { id: "b", cards: ["Jh", "9d"], label: "J9o", correct: false,
              eliminated: "Open OK; sin 8, call turn Q + bet river no es value natural." },
            { id: "c", cards: ["8h", "8s"], label: "88", correct: true }
          ]
        }
      }),
      LQ("r20-06", "BB", ["Qd", "Jd"], ["Ts", "9h", "4c", "2d", "Kd"], 78306, {
        villainPos: "BTN", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ts 9h 4c — BB donk → BTN raise → BB call" },
          { street: "Turn", text: "2d — BB check → BTN bet → BB call" },
          { street: "River", text: "Kd — BB check → BTN bet" }
        ],
        teachBack: "Donk + call raise flop + call barrels: set TT o rareza. AKo sin T no donkea; 77 tampoco — aquí TT.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Th", "Td"],
          teachBack: "TT donk vs raise. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en T94 sin T/9: check-call, no donk flop." },
            { id: "b", cards: ["Th", "Td"], label: "TT", correct: true },
            { id: "c", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair: no donkea T94 y paga raise + barrels sin set." }
          ]
        }
      }),
      LQ("r20-07", "BTN", ["Kh", "9h"], ["Ad", "7c", "2s", "5h", "Jc"], 78307, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ad 7c 2s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "5h — BB check-raise → BTN call" },
          { street: "River", text: "Jc — BB bet" }
        ],
        teachBack: "Call flop + XR turn blank: dos pares A7 o rareza. QQ raisearía flop; JTs sin as no XR turn.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "7h"],
          teachBack: "A7s XR turn raro. QQ y JTs no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: a menudo raisea flop — call flop + XR turn blank es raro." },
            { id: "b", cards: ["Jh", "Td"], label: "JTo", correct: false,
              eliminated: "Call flop posible, pero XR turn sin as/7: no." },
            { id: "c", cards: ["Ah", "7h"], label: "A7s", correct: true }
          ]
        }
      }),
      LQ("r20-08", "BB", ["Tc", "9c"], ["Qs", "6d", "3h", "8c", "2d"], 78308, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Qs 6d 3h — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "8c — BB donk → HJ call" },
          { street: "River", text: "2d — BB bet" }
        ],
        teachBack: "Call flop + donk turn 8: Q8 dos pares o rareza. KK betearía distinto; AJo sin Q no donkea turn — aquí Q8s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "8h"],
          teachBack: "Q8s donk turn. KK y AJo no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: tras c-bet rival suele pot-controlar o raisear — donk turn 8 es más de Q8." },
            { id: "b", cards: ["As", "Jd"], label: "AJo", correct: false,
              eliminated: "Call flop posible, pero donk turn sin Q/8: no." },
            { id: "c", cards: ["Qh", "8h"], label: "Q8s", correct: true }
          ]
        }
      }),
      LQ("r20-09", "BTN", ["Ad", "Kd"], ["Jh", "9c", "4s", "2c", "7h"], 78309, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh 9c 4s — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2c — check-check" },
          { street: "River", text: "7h — BB bet" }
        ],
        teachBack: "Raise flop + check turn + bet river: set JJ línea rara. AQo sin J no raisea; TT underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Jd"],
          teachBack: "JJ XR + river tras check turn. AQo y TT no.",
          options: [
            { id: "a", cards: ["Ah", "Qc"], label: "AQo", correct: false,
              eliminated: "Call BB; en J94 sin J: call/fold, no raise polar." },
            { id: "b", cards: ["Th", "Td"], label: "TT", correct: false,
              eliminated: "Underpair: no raisea flop sin set." },
            { id: "c", cards: ["Js", "Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r20-10", "BB", ["8d", "7d"], ["Kc", "Td", "5h", "As", "2s"], 78310, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kc Td 5h — check-check" },
          { street: "Turn", text: "As — BB check → BTN bet → BB call" },
          { street: "River", text: "2s — BB raise" }
        ],
        teachBack: "Check flop + call turn A + raise river: Kx fuerte o rareza. AA betearía flop; QJo sin K no raisea river — aquí KQo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Qs"],
          teachBack: "KQo raise river raro. AA no checkea; QJo sin K no.",
          options: [
            { id: "a", cards: ["Ah", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en K-high casi siempre c-betea flop. El check-check lo elimina." },
            { id: "b", cards: ["Qc", "Jd"], label: "QJo", correct: false,
              eliminated: "Open OK; sin K, call turn A + raise river no es value natural." },
            { id: "c", cards: ["Kh", "Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r20-11", "BTN", ["Qc", "Jc"], ["9s", "8h", "3d", "Kd", "2c"], 78311, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9s 8h 3d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "Kd — BB donk → BTN raise → BB call" },
          { street: "River", text: "2c — BB bet" }
        ],
        teachBack: "Call flop + donk turn K + call raise: K9 o rareza. ATo sin K no donkea; 77 tampoco — aquí K9s.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9h"],
          teachBack: "K9s donk turn vs raise. ATo y 77 no.",
          options: [
            { id: "a", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Call flop posible, pero donk turn K sin K: no." },
            { id: "b", cards: ["Kh", "9h"], label: "K9s", correct: true },
            { id: "c", cards: ["7h", "7d"], label: "77", correct: false,
              eliminated: "Underpair: no donkea turn K y paga raise sin Kx." }
          ]
        }
      }),
      LQ("r20-12", "BB", ["Ah", "5h"], ["Qd", "Jc", "7s", "2h", "9c"], 78312, {
        villainPos: "CO", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Qd Jc 7s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2h — BB check → CO bet → BB raise → CO call" },
          { street: "River", text: "9c — BB bet" }
        ],
        teachBack: "Call flop + call turn + raise river: QJ dos pares línea rara. KK raisearía antes; T8s sin Q/J no — aquí QJs.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Jh"],
          teachBack: "QJs raise river raro. KK y T8s no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea flop/turn — call-call-raise river es más de dos pares." },
            { id: "b", cards: ["Th", "8h"], label: "T8s", correct: false,
              eliminated: "Call flop posible, pero raise river sin Q/J: no." },
            { id: "c", cards: ["Qs", "Jh"], label: "QJs", correct: true }
          ]
        }
      })
  ];

  PACKS["R-21"] = [
      LQ("r21-01", "BB", ["9c", "8c"], ["As", "Kh", "7d", "2c", "4s"], 78401, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Kh 7d — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2c — BB check → BTN bet → BB call" },
          { street: "River", text: "4s — BB check → BTN bet medio" }
        ],
        teachBack: "Triple barrel sizing medio AK7: merge Ax (no solo polar). QQ pot-controla; 55 no — aquí AJo merge.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Jd"],
          teachBack: "AJo merge value. QQ y 55 no barrela medio tres calles.",
          options: [
            { id: "a", cards: ["Qs", "Qh"], label: "QQ", correct: false,
              eliminated: "Overpair: suele pot-controlar turn en AK — bet medio de tres calles merge es más de Ax." },
            { id: "b", cards: ["5h", "5d"], label: "55", correct: false,
              eliminated: "Underpair: pot-control, no bet medio river merge." },
            { id: "c", cards: ["Ah", "Jd"], label: "AJo", correct: true }
          ]
        }
      }),
      LQ("r21-02", "BTN", ["Kd", "Td"], ["Qc", "9h", "3s", "6d", "2h"], 78402, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qc 9h 3s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "6d — BB check → BTN bet → BB call" },
          { street: "River", text: "2h — BB bet medio" }
        ],
        teachBack: "Float + bet medio river: merge Qx (no overbet polar). AA raisearía antes; 77 sin Q no — aquí QJo.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Js"],
          teachBack: "QJo merge float. AA y 77 no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "En Q93 casi siempre betea/raisea antes: float + bet medio river es raro para AA." },
            { id: "b", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair: no apuesta river merge tras float sin Q." },
            { id: "c", cards: ["Qh", "Js"], label: "QJo", correct: true }
          ]
        }
      }),
      LQ("r21-03", "BB", ["Jh", "Th"], ["Kd", "8c", "2s", "5h", "9d"], 78403, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Kd 8c 2s — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "5h — check-check" },
          { street: "River", text: "9d — BB check → CO bet medio" }
        ],
        teachBack: "C-bet + check + bet medio: merge Kx thin (no polar overbet). JJ betearía turn; ATo sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Qs"],
          teachBack: "KQo merge thin. JJ y ATo no.",
          options: [
            { id: "a", cards: ["Js", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-medio merge encaja peor." },
            { id: "b", cards: ["Ah", "Td"], label: "ATo", correct: false,
              eliminated: "Puede c-bet aire, pero sin K: tras check turn el bet medio no es value." },
            { id: "c", cards: ["Kh", "Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r21-04", "BTN", ["As", "9s"], ["Jh", "Tc", "4d", "2c", "7s"], 78404, {
        villainPos: "BB", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Jh Tc 4d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "2c — BB bet medio → BTN call" },
          { street: "River", text: "7s — BB bet medio" }
        ],
        teachBack: "Raise flop + bet medio: merge set JJ o dos pares (no solo polar grande). AKo sin J no; 88 tampoco — aquí JJ.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Js", "Jd"],
          teachBack: "JJ merge raise. AKo y 88 no.",
          options: [
            { id: "a", cards: ["Ah", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en JT4 sin J: call/fold, no raise." },
            { id: "b", cards: ["8h", "8d"], label: "88", correct: false,
              eliminated: "Underpair: no raisea flop sin set." },
            { id: "c", cards: ["Js", "Jd"], label: "JJ", correct: true }
          ]
        }
      }),
      LQ("r21-05", "BB", ["Qc", "8c"], ["Ah", "9d", "5s", "3h", "2d"], 78405, {
        villainPos: "BTN", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Ah 9d 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "3h — BB check → BTN bet → BB call" },
          { street: "River", text: "2d — BB check → BTN bet medio" }
        ],
        teachBack: "Triple barrel medio A-high: merge Ax (value + algunos faroles). KK sizing distinto; 66 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["As", "Ts"],
          teachBack: "ATo merge. KK y 66 no.",
          options: [
            { id: "a", cards: ["Kh", "Kd"], label: "KK", correct: false,
              eliminated: "Overpair: a menudo raisea o pot-controla — bet medio tres calles merge es más de Ax." },
            { id: "b", cards: ["6h", "6c"], label: "66", correct: false,
              eliminated: "Underpair: no barrela merge tres calles." },
            { id: "c", cards: ["As", "Ts"], label: "ATo", correct: true }
          ]
        }
      }),
      LQ("r21-06", "BTN", ["Kh", "Jh"], ["Qs", "7d", "2c", "8h", "4s"], 78406, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Qs 7d 2c — check-check" },
          { street: "Turn", text: "8h — BB check → BTN bet medio → BB call" },
          { street: "River", text: "4s — BB check → BTN bet medio" }
        ],
        teachBack: "Check flop + delayed medio: merge Qx (ni polar ni thin extremo). AA betearía flop; J9s sin Q no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qh", "Td"],
          teachBack: "QTo merge delayed. AA no checkea; J9s no.",
          options: [
            { id: "a", cards: ["As", "Ac"], label: "AA", correct: false,
              eliminated: "Premium: en Q-high casi siempre c-betea. El check-check lo elimina." },
            { id: "b", cards: ["Js", "9d"], label: "J9o", correct: false,
              eliminated: "Open OK; sin Q, delayed bet medio no es value natural en flop check-check." },
            { id: "c", cards: ["Qh", "Td"], label: "QTo", correct: true }
          ]
        }
      }),
      LQ("r21-07", "BB", ["Td", "9d"], ["Kc", "Jc", "3h", "2s", "8d"], 78407, {
        villainPos: "HJ", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "HJ open → BB call" },
          { street: "Flop", text: "Kc Jc 3h — BB check → HJ c-bet → BB call" },
          { street: "Turn", text: "2s — BB check → HJ bet → BB call" },
          { street: "River", text: "8d — BB check → HJ bet medio" }
        ],
        teachBack: "Triple barrel medio KJ3: merge Kx. 99 pot-controla; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "Qs"],
          teachBack: "KQo merge. 99 y 55 no.",
          options: [
            { id: "a", cards: ["9h", "9c"], label: "99", correct: false,
              eliminated: "Underpair: pot-control turn, no bet medio river merge de Kx." },
            { id: "b", cards: ["5h", "5d"], label: "55", correct: false,
              eliminated: "Underpair: no barrela merge." },
            { id: "c", cards: ["Kh", "Qs"], label: "KQo", correct: true }
          ]
        }
      }),
      LQ("r21-08", "BTN", ["Ad", "8d"], ["9c", "8h", "4s", "2d", "Kh"], 78408, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "9c 8h 4s — BB donk medio → BTN call" },
          { street: "Turn", text: "2d — BB bet medio → BTN call" },
          { street: "River", text: "Kh — BB bet medio" }
        ],
        teachBack: "Donk medio + bet medio: merge 99/98 (no polar grande). AKo sin 9 no donkea; 77 tampoco — aquí 99.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["9h", "9d"],
          teachBack: "99 merge donk. AKo y 77 no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Defiende BB; en 984 sin 9/8: check-call, no donk medio." },
            { id: "b", cards: ["9h", "9d"], label: "99", correct: true },
            { id: "c", cards: ["7h", "7c"], label: "77", correct: false,
              eliminated: "Underpair: no donkea medio 984 y mete tres calles merge." }
          ]
        }
      }),
      LQ("r21-09", "BB", ["Kh", "6h"], ["As", "Td", "7c", "2h", "9s"], 78409, {
        villainPos: "BTN", facingBet: true, trapTag: "dominated",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "As Td 7c — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "2h — check-check" },
          { street: "River", text: "9s — BB check → BTN bet medio" }
        ],
        teachBack: "C-bet + check + bet medio: merge Ax thin. QQ betearía turn; J8s sin as no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Ah", "Qc"],
          teachBack: "AQo merge thin. QQ y J8s no.",
          options: [
            { id: "a", cards: ["Qs", "Qd"], label: "QQ", correct: false,
              eliminated: "Overpair: tras c-bet suele seguir en turn. Check-turn + bet-medio merge encaja peor." },
            { id: "b", cards: ["Jh", "8h"], label: "J8s", correct: false,
              eliminated: "Puede c-bet aire, pero sin as: tras check turn el bet medio no es value." },
            { id: "c", cards: ["Ah", "Qc"], label: "AQo", correct: true }
          ]
        }
      }),
      LQ("r21-10", "BTN", ["Qc", "Tc"], ["Kd", "Jh", "5s", "3c", "8h"], 78410, {
        villainPos: "BB", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "Kd Jh 5s — BB check → BTN c-bet → BB call" },
          { street: "Turn", text: "3c — BB check → BTN bet → BB call" },
          { street: "River", text: "8h — BB bet medio" }
        ],
        teachBack: "Float + bet medio KJ5: merge Kx. AA raisearía antes; 99 sin K no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Kh", "9h"],
          teachBack: "K9s merge float. AA y 99 no.",
          options: [
            { id: "a", cards: ["As", "Ah"], label: "AA", correct: false,
              eliminated: "En KJ5 casi siempre betea/raisea antes: float + bet medio es raro para AA." },
            { id: "b", cards: ["9c", "9d"], label: "99", correct: false,
              eliminated: "Underpair: no apuesta river merge tras float sin K." },
            { id: "c", cards: ["Kh", "9h"], label: "K9s", correct: true }
          ]
        }
      }),
      LQ("r21-11", "BB", ["Jd", "8d"], ["Qh", "Ts", "4c", "2d", "6s"], 78411, {
        villainPos: "CO", facingBet: true,
        lineStory: [
          { street: "Preflop", text: "CO open → BB call" },
          { street: "Flop", text: "Qh Ts 4c — BB check → CO c-bet → BB call" },
          { street: "Turn", text: "2d — BB check → CO bet → BB call" },
          { street: "River", text: "6s — BB check → CO bet medio" }
        ],
        teachBack: "Triple barrel medio QT4: merge Qx. 88 pot-controla; 55 no.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["Qs", "Js"],
          teachBack: "QJs merge. 88 y 55 no.",
          options: [
            { id: "a", cards: ["8h", "8c"], label: "88", correct: false,
              eliminated: "Underpair: pot-control turn, no bet medio river merge de Qx." },
            { id: "b", cards: ["5h", "5d"], label: "55", correct: false,
              eliminated: "Underpair: no barrela merge." },
            { id: "c", cards: ["Qs", "Js"], label: "QJs", correct: true }
          ]
        }
      }),
      LQ("r21-12", "BTN", ["Ah", "Th"], ["8s", "7c", "3d", "Kd", "2h"], 78412, {
        villainPos: "BB", facingBet: true, trapTag: "fancy_play",
        lineStory: [
          { street: "Preflop", text: "BTN open → BB call" },
          { street: "Flop", text: "8s 7c 3d — BB check → BTN c-bet → BB raise → BTN call" },
          { street: "Turn", text: "Kd — BB bet medio → BTN call" },
          { street: "River", text: "2h — BB bet medio" }
        ],
        teachBack: "Raise flop + bet medio: merge set 88 o OESD (aquí 88). AKo sin 8 no; JJ underpair tampoco.",
        quiz: {
          prompt: "¿Qué crees que tiene el villano?",
          answerCards: ["8h", "8d"],
          teachBack: "88 merge raise. AKo y JJ no.",
          options: [
            { id: "a", cards: ["As", "Kc"], label: "AKo", correct: false,
              eliminated: "Call BB; en 873 sin 8: call/fold, no raise." },
            { id: "b", cards: ["Jh", "Jd"], label: "JJ", correct: false,
              eliminated: "Overpair: flats — no raisea flop sin set." },
            { id: "c", cards: ["8h", "8d"], label: "88", correct: true }
          ]
        }
      })
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
