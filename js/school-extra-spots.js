/*
 * school-extra-spots.js — Amplía spots Cash M1/M2 (≥10–14) y sincroniza hands.
 * Cargar tras M1/M2 (bundle school).
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var vs = D.vsRfiSpot;
  var f3 = D.face3betSpot;
  var iso = D.isoSpot;
  var sq = D.squeezeSpot;
  var bb = D.bbVsSbLimpSpot;
  var flop = D.flopSpot;

  var EXTRA = {
    'C-07': [
      vs('c07-09', 'BB_vs_BTN', ['Ts', '9s'], 17009, { teachBack: 'T9s vs BTN: call cómodo. Conectores suited se defienden bien vs opens late.' }),
      vs('c07-10', 'BB_vs_UTG', ['Ah', 'Jd'], 17010, { trapTag: 'dominated', teachBack: 'AJo vs UTG: a menudo fold. Early open tight — no overdefend Ax offsuit.' }),
      vs('c07-11', 'BB_vs_CO', ['Kd', 'Qs'], 17011, { teachBack: 'KQo vs CO: 3-bet o call sólido. Broadway offsuit fuerte vs late.' }),
      vs('c07-12', 'BB_vs_HJ', ['8c', '7d'], 17012, { trapTag: 'fancy_play', teachBack: '87o vs HJ: fold. No defiendas basura offsuit vs middle.' })
    ],
    'C-08': [
      vs('c08-09', 'BB_vs_BTN', ['Jh', 'Jd'], 18009, { teachBack: 'JJ vs BTN: 3-bet value. Quieres máximo dinero con la mejor mano.' }),
      vs('c08-10', 'BB_vs_CO', ['Kd', '2d'], 18010, { teachBack: 'K2s vs CO: a veces 3-bet farol con blocker de K; no es spew como KTo.' }),
      vs('c08-11', 'SB_vs_BTN', ['Qh', 'Td'], 18011, { trapTag: 'fancy_play', teachBack: 'QTo SB vs BTN: no 3-bet spew. Fold o call selectivo — no polar sin blockers claros.' }),
      vs('c08-12', 'BB_vs_BTN', ['Ts', 'Td'], 18012, { teachBack: 'TT vs BTN: 3-bet value. Par medio-fuerte — construye bote; no la trates como farol.' })
    ],
    'C-09': [
      f3('c09-09', 'BTN_vs_BB', ['Qs', 'Qd'], 19009, { teachBack: 'QQ vs 3-bet: 4-bet value. Premium — quieres bote grande.' }),
      f3('c09-10', 'CO_vs_BB', ['Jh', '9h'], 19010, { teachBack: 'J9s CO vs 3-bet: call frecuente en posición. No hero-fold conectores suited.' }),
      f3('c09-11', 'UTG_vs_BB', ['Qd', 'Js'], 19011, { trapTag: 'dominated', teachBack: 'QJo UTG vs 3-bet: a menudo fold OOP. Continúa tight desde early.' }),
      f3('c09-12', 'BTN_vs_SB', ['Jh', 'Jc'], 19012, { teachBack: 'JJ BTN vs 3-bet SB: 4-bet o call value. Premium en posición.' })
    ],
    'C-10': [
      sq('c10-07', 'BB', 'CO', 'BTN', ['Qs', 'Qd'], 20007, { teachBack: 'QQ: squeeze value. Quieres aislar o meter el máximo con nuts.' }),
      sq('c10-08', 'BB', 'HJ', 'BTN', ['Td', '9c'], 20008, { trapTag: 'fancy_play', teachBack: 'T9o: no squeeze spew. Fold — dead money no justifica basura.' }),
      sq('c10-09', 'SB', 'CO', 'BTN', ['Jh', 'Js'], 20009, { teachBack: 'JJ: squeeze value razonable. Par fuerte ante open+call.' }),
      sq('c10-10', 'BB', 'CO', 'BTN', ['Ah', '4h'], 20010, { teachBack: 'A4s: squeeze polar. Farol con as blocker, misma lógica que 3-bet polar.' }),
      sq('c10-11', 'BB', 'UTG', 'CO', ['Ts', '9s'], 20011, { trapTag: 'fancy_play', teachBack: 'T9s vs UTG+call: fold o call muy selectivo — no squeeze loco vs early.' }),
      sq('c10-12', 'BB', 'CO', 'BTN', ['As', 'Ah'], 20012, { teachBack: 'AA: squeeze value. Premium claro ante dead money.' })
    ],
    'C-11': [
      iso('c11-07', 'BTN', 'CO', ['Ah', 'Qd'], 21007, { teachBack: 'AQo vs limp: iso value. Premium — aísla y cobra.' }),
      iso('c11-08', 'CO', 'HJ', ['Qc', '2h'], 21008, { trapTag: 'dominated', teachBack: 'Q2o vs limp: fold. No overiso basura.' }),
      iso('c11-09', 'BTN', 'SB', ['Jh', 'Ts'], 21009, { teachBack: 'JTo vs limp: iso razonable. Conectores altos suited con iniciativa.' }),
      iso('c11-10', 'SB', 'BTN', ['Qd', '9c'], 21010, { trapTag: 'fancy_play', teachBack: 'Q9o vs limp OOP: fold frecuente. No aísles frágiles offsuit.' }),
      iso('c11-11', 'BTN', 'CO', ['9s', '9c'], 21011, { teachBack: '99 vs limp: iso claro. Par medio — heads-up con ventaja.' }),
      iso('c11-12', 'CO', 'UTG', ['Ad', '7d'], 21012, { teachBack: 'A7s vs limp: iso OK. Ax suited castiga limps wide.' })
    ],
    'C-12': [
      bb('c12-07', ['Kd', 'Kh'], 22007, { teachBack: 'KK BB vs SB limp: raise value. Premium — no check raro.' }),
      bb('c12-08', ['5d', '3c'], 22008, { trapTag: 'dominated', teachBack: '53o: check. No raise spew vs limp SB.' }),
      bb('c12-09', ['9s', '8s'], 22009, { teachBack: '98s vs SB limp: raise o check mixto; conectores suited juegan bien.' }),
      bb('c12-10', ['Qc', 'Th'], 22010, { trapTag: 'fancy_play', teachBack: 'QTo: no raise automático. Check frecuente — mano frágil.' }),
      bb('c12-11', ['Ac', 'Qc'], 22011, { teachBack: 'AQs: raise value vs limp SB. Par fuerte — aísla.' }),
      bb('c12-12', ['Ah', '4h'], 22012, { teachBack: 'A4s: raise frecuente. Ax suited castiga limps de SB.' })
    ],
    'C-13': [
      vs('c13-11', 'BB_vs_BTN', ['As', 'Ts'], 23011, { teachBack: 'ATs vs BTN: 3-bet o call. Examen M1 — aplica defensa late.' }),
      vs('c13-12', 'BB_vs_UTG', ['Kd', 'Jd'], 23012, { trapTag: 'dominated', teachBack: 'KJs vs UTG: fold en examen. Early = tight.' }),
      f3('c13-13', 'BTN_vs_BB', ['Ks', '7d'], 23013, { teachBack: 'K7o vs 3-bet: 4-bet o call value. Examen — no hero-fold premium.' }),
      iso('c13-14', 'BTN', 'SB', ['Qs', 'Js'], 23014, { teachBack: 'QJs vs limp: iso. Examen M1 — aísla manos fuertes.' })
    ],
    'C-14': [
      flop('c14-07', 'BTN', ['Ah', 'Kd'], ['Qs', '7c', '2d'], 24007, { teachBack: 'Q-high seco: c-bet pequeño IP con AK. Niega equity barato.' }),
      flop('c14-08', 'CO', ['Jh', 'Td'], ['9s', '8s', '2h'], 24008, { trapTag: 'fancy_play', teachBack: 'Board semi-wet: no autocbet grande. Selectivo.' }),
      flop('c14-09', 'BTN', ['5s', '5c'], ['Kh', '9d', '3c'], 24009, { teachBack: 'Pareja baja en K-high seco: c-bet pequeño o check mixto.' }),
      flop('c14-10', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 24010, { teachBack: 'Top pair A-high seco: c-bet value frecuente.' }),
      flop('c14-11', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 24011, { trapTag: 'fancy_play', teachBack: 'Board muy conectado: pot control. No hinches sin necesidad.' }),
      flop('c14-12', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 24012, { teachBack: 'A-high seco con backdoors: c-bet ligero IP razonable.' }),
      flop('c14-13', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 24013, { teachBack: 'J-high seco IP: c-bet pequeño con KQ suited. Niega equity.' }),
      flop('c14-14', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 24014, { trapTag: 'fancy_play', teachBack: 'Underpair en A-high: check mixto frecuente. No autocbet spew.' })
    ],
    'C-15': [
      flop('c15-09', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 25009, { teachBack: 'K-high seco: c-bet pequeño con AJ. Plan IP estándar.' }),
      flop('c15-10', 'CO', ['Qd', 'Td'], ['As', '5h', '2c'], 25010, { teachBack: 'A-high seco: c-bet frecuente IP. Niega outs barato.' }),
      flop('c15-11', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 25011, { teachBack: 'K-high seco con backdoors: c-bet ligero OK.' }),
      flop('c15-12', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 25012, { trapTag: 'fancy_play', teachBack: 'Conectado: no trates como seco. Selectivo, no autocbet.' }),
      flop('c15-13', 'BTN', ['As', 'Kd'], ['Qh', '8d', '3c'], 25013, { teachBack: 'Q-high seco IP con AK: c-bet pequeño estándar.' }),
      flop('c15-14', 'CO', ['9h', '8h'], ['Ad', '6c', '2s'], 25014, { teachBack: 'A-high seco con backdoors: c-bet ligero IP frecuente.' })
    ],
    'C-16': [
      flop('c16-07', 'SB', ['Ah', 'Kd'], ['Qs', 'Jh', '9c'], 26007, { teachBack: 'Wet OOP: check frecuente con AK air. No autocbet.' }),
      flop('c16-08', 'BB', ['9s', '9c'], ['Ah', '7d', '2c'], 26008, { teachBack: 'Pareja media A-high OOP: bet pequeño o check mixto.' }),
      flop('c16-09', 'SB', ['Kh', 'Td'], ['As', '8c', '3h'], 26009, { trapTag: 'fancy_play', teachBack: 'KTo air OOP en A-high: check/cede. No inventes c-bet.' }),
      flop('c16-10', 'BB', ['8h', '7h'], ['9s', '6d', '2c'], 26010, { teachBack: 'Draw OOP: check o bet selectivo. Ten plan de turn.' }),
      flop('c16-11', 'SB', ['Qs', 'Qd'], ['Jh', 'Tc', '2d'], 26011, { teachBack: 'Overpair OOP: bet pequeño o check. No hinches sin plan.' }),
      flop('c16-12', 'BB', ['Ad', '5c'], ['Kh', '9s', '4d'], 26012, { trapTag: 'fancy_play', teachBack: 'A-high air OOP en K-high: check. Cede la calle.' }),
      flop('c16-13', 'SB', ['Jc', 'Td'], ['9h', '8s', '2c'], 26013, { teachBack: 'Board semi-wet OOP: check frecuente sin made hand fuerte.' }),
      flop('c16-14', 'BB', ['Kh', 'Qs'], ['Ad', '7c', '3h'], 26014, { trapTag: 'fancy_play', teachBack: 'KQ air OOP en A-high: check. No inventes presión.' })
    ],
    'C-17': [
      flop('c17-07', 'BB', ['Ah', 'Kd'], ['Qs', 'Jh', '2c'], 27007, { facingBet: true, teachBack: 'Con odds y overcards: call vs c-bet pequeño. Cuenta outs.' }),
      flop('c17-08', 'BB', ['8h', '7d'], ['As', 'Kd', '2c'], 27008, { facingBet: true, trapTag: 'fancy_play', teachBack: 'Sin odds ni backdoors fuertes: fold. No pagues caro por ilusión.' }),
      flop('c17-09', 'BB', ['9s', '8s'], ['7h', '6d', '2c'], 27009, { facingBet: true, teachBack: 'OESD/gutshot+: call si pot odds alcanzan. Precio del bote manda.' }),
      flop('c17-10', 'BB', ['Kh', 'Qd'], ['As', '8c', '3h'], 27010, { facingBet: true, teachBack: 'Overcards + backdoor: call mixto vs bet pequeño.' }),
      flop('c17-11', 'BB', ['Jd', 'Td'], ['9s', '8h', '2c'], 27011, { facingBet: true, teachBack: 'Straight draw fuerte: call. Tienes equity real.' }),
      flop('c17-12', 'BB', ['Qc', '9c'], ['Ah', 'Kd', '7s'], 27012, { facingBet: true, trapTag: 'dominated', teachBack: 'Sin odds OOP: fold. No hero-call sin precio.' }),
      flop('c17-13', 'BB', ['Ts', '9s'], ['8h', '7d', '2c'], 27013, { facingBet: true, teachBack: 'OESD suited: call vs c-bet si el precio es bueno.' }),
      flop('c17-14', 'BB', ['5h', '4d'], ['As', 'Kd', '9c'], 27014, { facingBet: true, trapTag: 'fancy_play', teachBack: 'Sin equity real OOP: fold. No persigas illusory outs.' })
    ],
    'C-18': [
      flop('c18-07', 'BTN', ['As', 'Ah'], ['Kh', '9d', '2c'], 28007, { street: 'turn', teachBack: 'AA en seco: barrel turn value frecuente tras c-bet flop.' }),
      flop('c18-08', 'BTN', ['8h', '7h'], ['As', 'Kd', '2c'], 28008, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Air sin equity en turn: give up. No second barrel spew.' }),
      flop('c18-09', 'CO', ['Qs', 'Qd'], ['Jh', '8c', '3d'], 28009, { street: 'turn', teachBack: 'Overpair: barrel value. Cobra a peores y niega.' }),
      flop('c18-10', 'BTN', ['Ah', '5h'], ['As', '9d', '4c'], 28010, { street: 'turn', teachBack: 'Top pair: value turn. No check raro siempre.' }),
      flop('c18-11', 'BTN', ['Kd', 'Td'], ['Kh', '7s', '2c'], 28011, { street: 'turn', teachBack: 'Top pair K: barrel frecuente. Value + protección.' }),
      flop('c18-12', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 28012, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Turn en board wet: sé selectivo. No barrel automático.' }),
      flop('c18-13', 'BTN', ['9s', '9c'], ['Ah', '6d', '2c'], 28013, { street: 'turn', teachBack: 'Pareja media en A-high: barrel selectivo o pot control.' }),
      flop('c18-14', 'CO', ['7h', '6h'], ['Kd', '9c', '2s'], 28014, { street: 'turn', trapTag: 'fancy_play', teachBack: 'Air en K-high turn: give up frecuente. No second barrel spew.' })
    ],
    'C-19': [
      flop('c19-07', 'BTN', ['As', 'Kd'], ['Qs', '7h', '2c'], 29007, { street: 'river', teachBack: 'River value: bet si te pagan peores. No check nuts relative siempre.' }),
      flop('c19-08', 'BTN', ['8h', '7h'], ['As', 'Kd', '2c'], 29008, { street: 'river', trapTag: 'fancy_play', teachBack: 'Air river: fold o bluff solo con blockers. No spew.' }),
      flop('c19-09', 'CO', ['Qh', 'Qd'], ['Js', '8c', '3d'], 29009, { street: 'river', teachBack: 'Overpair river: value bet. Cobra a Jx/peores.' }),
      flop('c19-10', 'BTN', ['Ah', '5d'], ['As', '9c', '4h'], 29010, { street: 'river', teachBack: 'Top pair river: value. Thin OK vs calling range.' }),
      flop('c19-11', 'BTN', ['Kh', 'Td'], ['Kd', '7s', '2c'], 29011, { street: 'river', teachBack: 'Top pair K river: value bet frecuente.' }),
      flop('c19-12', 'BB', ['Jc', 'Tc'], ['Ts', '8h', '7d'], 29012, { street: 'river', facingBet: true, trapTag: 'dominated', teachBack: 'Facing river bet con mano media: fold si el precio no justifica call.' }),
      flop('c19-13', 'BTN', ['Jd', 'Js'], ['9h', '6c', '2d'], 29013, { street: 'river', teachBack: 'Overpair river seco: value bet. Cobra a 9x/peores.' }),
      flop('c19-14', 'BTN', ['Qd', '9c'], ['Ah', 'Kh', '3s'], 29014, { street: 'river', trapTag: 'fancy_play', teachBack: 'Air river en A-K: no bluff spew sin blockers fuertes.' })
    ],
    'C-20': [
      flop('c20-09', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 30009, { teachBack: 'Examen: seco IP → c-bet pequeño. Aplica C-14/C-15.' }),
      flop('c20-10', 'BB', ['9s', '9c'], ['Ah', '8d', '3c'], 30010, { facingBet: true, teachBack: 'Examen: OOP vs c-bet → call con pareja media frecuente.' }),
      flop('c20-11', 'BTN', ['8h', '7h'], ['9s', '8s', '7d'], 30011, { trapTag: 'fancy_play', teachBack: 'Examen: wet → no autocbet spew.' }),
      flop('c20-12', 'BTN', ['Kd', 'Kh'], ['Qc', 'Jd', '2s'], 30012, { street: 'turn', teachBack: 'Examen: overpair turn → barrel value.' }),
      flop('c20-13', 'CO', ['As', '5s'], ['Ah', '9c', '4d'], 30013, { street: 'river', teachBack: 'Examen: top pair river → value thin OK.' }),
      flop('c20-14', 'BB', ['Qh', 'Jd'], ['Ts', '8c', '3h'], 30014, { facingBet: true, trapTag: 'dominated', teachBack: 'Examen: sin odds OOP → fold vs c-bet.' }),
      flop('c20-15', 'BTN', ['Ah', 'Kd'], ['Qs', '7h', '2c'], 30015, { teachBack: 'Examen: Q-high seco IP → c-bet pequeño con AK.' }),
      flop('c20-16', 'SB', ['Jh', 'Td'], ['As', '8c', '3d'], 30016, { trapTag: 'fancy_play', teachBack: 'Examen: air OOP A-high → check/cede, no inventes.' })
    ]
  };

  D.LESSONS.forEach(function (lesson) {
    var extra = EXTRA[lesson.id];
    if (extra && extra.length) {
      lesson.spots = (lesson.spots || []).concat(extra);
    }
    if (Array.isArray(lesson.spots) && lesson.spots.length) {
      lesson.hands = lesson.spots.length;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
