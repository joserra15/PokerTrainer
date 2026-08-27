/*
 * school-data-practice.js — Práctica (≥12 spots) para lecciones que eran teoría-only.
 * Cargar tras school-extra-spots.js. No pisa packs que ya tienen manos.
 *
 * Criterio: cada spot tiene una decisión GTO clara (open/fold, shove/fold,
 * call/fold, 3-bet/fold, c-bet/check). El teachBack ancla el concepto de la
 * lección; no pedimos ICM-fold donde el motor puntúa call.
 */
(function (global) {
  'use strict';
  var D = global.PTSchoolData;
  if (!D || !D.LESSONS) return;

  var rfi = D.rfiSpot, vs = D.vsRfiSpot, f3 = D.face3betSpot;
  var flop = D.flopSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;

  function cash(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100' }, extra || {});
  }
  function spin(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb20' }, extra || {});
  }
  function mtt(extra) {
    return Object.assign({ scenario: 'rfi', practiceStreet: 'preflop', formatHub: 'mtt', gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' }, extra || {});
  }

  function R(id, pos, cards, seed, tb, cfg, trap) {
    return rfi(id, pos, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function V(id, key, cards, seed, tb, cfg, trap) {
    return vs(id, key, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function F3(id, key, cards, seed, tb, cfg, trap) {
    return f3(id, key, cards, seed, { teachBack: tb, playConfig: cfg, trapTag: trap || 'none' });
  }
  function Fl(id, pos, cards, board, seed, tb, extra) {
    extra = extra || {};
    extra.teachBack = tb;
    extra.trapTag = extra.trapTag || 'none';
    return flop(id, pos, cards, board, seed, extra);
  }

  var PACKS = {};

  /* —— C-00: cómo funciona la Escuela (open/fold cristalino) —— */
  PACKS['C-00'] = [
    R('c00-01', 'BTN', ['Ts', 'Tc'], 70001, 'TT en el botón: open claro. En la Escuela cada mano está diseñada: aquí la respuesta es subir, no “probar suerte”.', cash()),
    R('c00-02', 'UTG', ['Kh', 'Jd'], 70002, 'KJo UTG: fold. El spot te pide tirar — no hay truco. Así funciona una lección: decisión preparada, no mano aleatoria.', cash(), 'dominated'),
    R('c00-03', 'CO', ['Kd', 'Kh'], 70003, 'KK cutoff: open. Premium = subes primero el bote. Luego ves si acertaste y pasas al siguiente spot.', cash()),
    R('c00-04', 'BTN', ['9c', '2h'], 70004, '92o incluso en botón: fold. Posición no lava basura. La Escuela te evalúa solo en esta decisión.', cash(), 'dominated'),
    R('c00-05', 'UTG', ['Jh', 'Jd'], 70005, 'JJ UTG: open. Early también abre premiums. Lee la silla, luego las cartas, luego actúa.', cash()),
    R('c00-06', 'HJ', ['8d', '3c'], 70006, '83o hijack: fold. Si dudas, pregunta: ¿esto entra en un open de cash a 100 bb? Casi nunca.', cash(), 'fancy_play'),
    R('c00-07', 'BTN', ['Qs', 'Js'], 70007, 'QJs botón: open. Broadway suited en late es el tipo de spot “sí” que la lección quiere clavar.', cash()),
    R('c00-08', 'CO', ['Td', '4c'], 70008, 'T4o cutoff: fold. No abras “porque queda poca gente” con basura offsuit.', cash(), 'dominated'),
    R('c00-09', 'HJ', ['8s', '8c'], 70009, '88 hijack: open. Par medio fuerte — iniciativa, no limp.', cash()),
    R('c00-10', 'UTG', ['Kh', '8d'], 70010, 'K8o UTG: fold. Demasiada gente detrás. Misma mano en BTN ya sería otro debate (C-01).', cash(), 'fancy_play'),
    R('c00-11', 'CO', ['Ah', 'Qs'], 70011, 'AQo cutoff: open claro. Ax fuerte offsuit — construyes bote con plan.', cash()),
    R('c00-12', 'BTN', ['8c', '2h'], 70012, '82o botón: fold. El botón abre wide, no cualquier dos cartas. Apruebas al acertar el umbral; puedes repetir.', cash(), 'dominated')
  ];

  /* —— Spins —— */
  var st20 = spin({ scenario: 'steal', stackDepth: 'bb20' });
  var st25 = spin({ scenario: 'steal', stackDepth: 'bb25' });
  var cover25 = spin({ scenario: 'steal', stackDepth: 'bb25', stackRole: 'cover' });
  var coverVs20 = spin({ scenario: '3bet', stackDepth: 'bb20', stackRole: 'cover' });
  var pf10 = spin({ scenario: 'push', stackDepth: 'bb10' });
  var pf12 = spin({ scenario: 'push', stackDepth: 'bb12' });
  var short10 = spin({ scenario: 'push', stackDepth: 'bb10', stackRole: 'short' });
  var short12 = spin({ scenario: 'push', stackDepth: 'bb12', stackRole: 'short' });
  var vs20 = spin({ scenario: '3bet', stackDepth: 'bb20' });
  var vsPush = spin({ scenario: 'push', stackDepth: 'bb10' });

  PACKS['S-00'] = [
    R('s00-01', 'BTN', ['Ts', 'Tc'], 71001, 'TT BTN ~20 bb: shove por valor. En Spin las fichas no son euros: un stack corto pide fold equity, no open de cash a 100 bb.', st20),
    R('s00-02', 'BTN', ['9c', '2s'], 71002, '92o: fold. Perder el stack suele ser perder la entrada. No spew “porque son solo fichas”.', st20, 'dominated'),
    R('s00-03', 'SB', ['Kh', 'Js'], 71003, 'KJo SB ~20 bb: open steal ~2,5–3 bb (no shove). 3-max: SB aún tiene al BB detrás.', st20),
    R('s00-04', 'SB', ['9h', '7d'], 71004, '97o SB: fold. En Spin 3-max no eres BTN: OOP si te pagan y el payout duele.', st20, 'fancy_play'),
    R('s00-05', 'BTN', ['7h', '7d'], 71005, '77 BTN 20 bb: shove. Par medio fuerte — quieres ciegas o doblar, no min-raise de cash.', st20),
    R('s00-06', 'BTN', ['Jh', '9h'], 71006, 'J9s BTN: open steal ~2,5 bb. Mano media del rango: roba sin commitear todo el torneo.', st20),
    R('s00-07', 'SB', ['Js', '4d'], 71007, 'J4o SB: fold. Anatomía del Spin: cada error puede ser eliminación, no un pot de cash.', st20, 'dominated'),
    R('s00-08', 'BTN', ['Ah', 'Td'], 71008, 'ATo BTN ~20 bb: shove frecuente. Stack corto + fold equity; no lo trates como cash deep.', st20),
    R('s00-09', 'SB', ['As', '6s'], 71009, 'A6s SB: open steal razonable. Ax suited con plan; no es auto-shove como AA.', st20),
    R('s00-10', 'BTN', ['Jc', '3d'], 71010, 'J3o: fold. Wide de botón no es “cualquier Ax/Jx”. Fichas de torneo, no céntimos.', st20, 'fancy_play'),
    R('s00-11', 'BTN', ['Kd', 'Kh'], 71011, 'KK ~20 bb: shove value. Premium — maximizas o fold equity o all-in con equity alta.', st20),
    R('s00-12', 'SB', ['Qd', '9c'], 71012, 'Q9o SB: fold frecuente. Offsuit frágil OOP en 3-max. Recuerda: payout 2×/3×/5×, no chip EV de cash.', st20, 'dominated')
  ];

  PACKS['S-06'] = [
    R('s06-01', 'BTN', ['Qs', 'Jh'], 71601, 'Cover (~25 bb) BTN con QJo: steal razonable. El lead se usa para presionar ciegas, no para hero-call.', cover25),
    R('s06-02', 'BTN', ['8d', '4h'], 71602, 'Aunque seas cover, 84o es fold. Presión ≠ spew: si te pagan, la mano no aguanta.', cover25, 'dominated'),
    R('s06-03', 'SB', ['As', 'Ts'], 71603, 'Cover SB con ATs: open/steal. Pones al short en un spot feo; no necesitas ir all-in siempre.', cover25),
    V('s06-04', 'BB_vs_BTN', ['Qc', 'Th'], 71604, 'Short abre y tú eres cover con QTo: fold. No pagues light “porque tengo más fichas” — ICM suicide.', coverVs20, 'fancy_play'),
    V('s06-05', 'BB_vs_BTN', ['Jh', 'Jd'], 71605, 'Cover vs steal con JJ: 3-bet shove value. Aquí sí: equity alta y eliminar acerca al 1.º.', coverVs20),
    V('s06-06', 'BB_vs_SB', ['9h', '6d'], 71606, '96o vs steal: fold siempre. El lead no justifica basura.', coverVs20, 'dominated'),
    R('s06-07', 'BTN', ['6d', '5d'], 71607, 'Cover BTN 65s: steal con jugabilidad. Robas a shorts que overfoldean.', cover25),
    V('s06-08', 'BB_vs_BTN', ['Ts', 'Tc'], 71608, 'TT cover vs steal: 3-bet shove. Value claro — no es call light.', coverVs20),
    V('s06-09', 'BB_vs_BTN', ['8s', '6c'], 71609, '86o cover vs steal: fold. Chip EV dudoso y $EV peor. El lead se guarda.', coverVs20, 'fancy_play'),
    R('s06-10', 'SB', ['Qd', 'Td'], 71610, 'Cover SB QTs: open steal frecuente. Presión con manos que foldean mucho.', cover25),
    V('s06-11', 'BB_vs_SB', ['Td', 'Tc'], 71611, 'TT cover vs steal SB: 3-bet shove value. Par medio fuerte — no flat eterno.', coverVs20),
    R('s06-12', 'BTN', ['9h', '4c'], 71612, '94o cover: fold. El chip lead no convierte basura en steal.', cover25, 'dominated')
  ];

  PACKS['S-07'] = [
    R('s07-01', 'BTN', ['As', 'Ts'], 71701, 'Short (~10–12 bb) BTN ATs: shove para doblarte. Vs cover elige equity + fold equity, no panic.', short12),
    R('s07-02', 'BTN', ['Td', '6h'], 71702, 'Short con T6o: fold. Necesitas doblarte, sí; no con basura vs un cover que te elimina.', short12, 'dominated'),
    R('s07-03', 'SB', ['Kh', 'Jh'], 71703, 'Short SB KJs: shove frecuente. Broadway usable — spot para double-up, no min-raise.', short10),
    R('s07-04', 'SB', ['Qd', '7c'], 71704, 'Q7o SB corto: fold. Panic shove OOP vs cover es el leak del short desesperado.', short10, 'fancy_play'),
    R('s07-05', 'BTN', ['8s', '8c'], 71705, '88 short: shove value. Par medio — quieres que el cover foldee o ir a equity decente.', short10),
    R('s07-06', 'BTN', ['7s', '6s'], 71706, '76s BTN corto: shove frecuente. Conectores suited con fold equity vs cover.', short10),
    R('s07-07', 'SB', ['9c', '6d'], 71707, '96o SB corto: fold. Sin equity ni fold equity real.', short10, 'dominated'),
    R('s07-08', 'BTN', ['Kd', 'Kh'], 71708, 'KK ~12 bb: shove value. Premium vs cover — no open min.', short12),
    R('s07-09', 'SB', ['Kh', 'Th'], 71709, 'KTs SB corto: shove frecuente. Charts SB cortos incluyen esta broadway suited.', short10),
    R('s07-10', 'BTN', ['Jh', 'Td'], 71710, 'JTo BTN ~12 bb: shove candidato desde botón. Late + short = fold equity.', short12),
    R('s07-11', 'BTN', ['Ac', 'Qc'], 71711, 'AQs ~10 bb: shove. Ax suited premium — all-in, no “ver flop barato”.', short10),
    R('s07-12', 'SB', ['8d', '5c'], 71712, '85o SB corto: fold. Elige spots; no todas las manos “necesitan fichas”.', short10, 'fancy_play')
  ];

  PACKS['S-10'] = [
    V('s10-01', 'BB_vs_BTN', ['As', 'Kd'], 72001, 'AKo vs shove/steal corto: call (o 3-bet shove). Incluso con ICM, premiums claros se pagan.', vsPush),
    V('s10-02', 'BB_vs_BTN', ['Jc', '8d'], 72002, 'J8o vs shove: fold. Chip EV negativo e ICM peor. Overfold vs shove es el default sano en Spins.', vsPush, 'dominated'),
    V('s10-03', 'BB_vs_SB', ['Ad', 'Kd'], 72003, 'AKs vs shove SB: call. Par fuerte — chip EV y $EV suelen coincidir.', vsPush),
    V('s10-04', 'BB_vs_BTN', ['Jh', '7d'], 72004, 'J7o vs shove BTN: fold. Equity insuficiente; el ICM pide aún más tightness.', vsPush, 'fancy_play'),
    V('s10-05', 'BB_vs_BTN', ['Tc', '4d'], 72005, 'T4o vs shove: call. Nuts. ICM no convierte AA en fold.', vsPush),
    V('s10-06', 'BB_vs_SB', ['Jd', '8c'], 72006, 'J8o vs shove: fold. Dominada y OOP. Overfold, no hero-call.', vsPush, 'dominated'),
    V('s10-07', 'BB_vs_BTN', ['Ah', 'Kd'], 72007, 'AKo vs shove: call. Premium — el ICM no te pide tirar reyes.', vsPush),
    V('s10-08', 'BB_vs_BTN', ['Qh', '9c'], 72008, 'Q9o vs shove BTN: fold frecuente. Flip feo + riesgo de bust = −EV $ típico.', vsPush, 'fancy_play'),
    V('s10-09', 'BB_vs_SB', ['As', 'Js'], 72009, 'AJs vs shove SB: call o 3-bet shove sólido. Ax fuerte — no overfold panic.', vsPush),
    V('s10-10', 'BB_vs_BTN', ['8h', '7d'], 72010, '87o vs shove: fold. Conectores offsuit no son precio vs all-in.', vsPush, 'dominated'),
    V('s10-11', 'BB_vs_BTN', ['6s', '6c'], 72011, '66 vs shove BTN: call frecuente. Par medio fuerte vs rango wide de botón corto.', vsPush),
    V('s10-12', 'BB_vs_SB', ['Ks', '7d'], 72012, 'K7o vs shove SB: fold frecuente. Dominada; ICM aprieta más que chip EV.', vsPush, 'fancy_play')
  ];

  PACKS['S-11'] = [
    V('s11-01', 'BB_vs_BTN', ['Td', '9c'], 72101, 'T9o vs shove: fold. Puede “verse” como precio en fichas; en $EV es un mal spot. Olor a +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-02', 'BB_vs_BTN', ['Ad', 'Kd'], 72102, 'AKs: call. Aquí chip EV y $EV coinciden — no todos los spots son trampa.', vsPush),
    V('s11-03', 'BB_vs_SB', ['Jh', '9d'], 72103, 'J9o vs shove: fold. Pay jump: arriesgar el torneo por un flip mediocre pierde euros.', vsPush, 'dominated'),
    V('s11-04', 'BB_vs_BTN', ['Kd', 'Kh'], 72104, 'KK: call. Premium — no inventes fold ICM con reyes.', vsPush),
    V('s11-05', 'BB_vs_BTN', ['Kc', '8h'], 72105, 'K8o vs shove: fold. El call “porque tengo outs” es el leak +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-06', 'BB_vs_SB', ['Td', 'Th'], 72106, 'TT vs shove SB: call. Equity alta; este no es el mal spot.', vsPush),
    V('s11-07', 'BB_vs_BTN', ['8c', '6d'], 72107, '86o: fold. Sin historia vs shove. El pay jump manda.', vsPush, 'dominated'),
    V('s11-08', 'BB_vs_BTN', ['9s', '9c'], 72108, '99 vs shove BTN: call frecuente. Par vs rango wide — $EV suele aguantar.', vsPush),
    V('s11-09', 'BB_vs_SB', ['Kh', '8c'], 72109, 'K8o vs shove: fold. Dominada; oler −EV $ antes de pagar.', vsPush, 'fancy_play'),
    V('s11-10', 'BB_vs_BTN', ['Jc', 'Js'], 72110, 'JJ: call. Cuando coinciden fichas y euros, paga.', vsPush),
    V('s11-11', 'BB_vs_BTN', ['Th', '5c'], 72111, 'T5o: fold. Ni chip EV ni $EV.', vsPush, 'dominated'),
    V('s11-12', 'BB_vs_SB', ['Ah', 'Ts'], 72112, 'ATo vs shove SB: call o continue sólido. Ax fuerte — no es el spot “malo”.', vsPush)
  ];

  var st5x = spin({ scenario: 'steal', stackDepth: 'bb20', spinPayout: '5x' });
  var vs5x = spin({ scenario: 'push', stackDepth: 'bb10', spinPayout: '5x' });
  PACKS['S-12'] = [
    R('s12-01', 'BTN', ['Ah', 'Qd'], 72201, 'AQo BTN 5×: shove. Premium sigue siendo shove; el 5× aprieta las manos medias, no KK/AK.', st5x),
    R('s12-02', 'BTN', ['6s', '3h'], 72202, '63o 5×: fold. Con premio gordo, spew duele más. Tight extra vs 2×/3×.', st5x, 'dominated'),
    R('s12-03', 'SB', ['9s', '6c'], 72203, '96o SB 5×: fold. En 5× el 1.º pesa: menos steals locos OOP.', st5x, 'fancy_play'),
    R('s12-04', 'BTN', ['8h', '8d'], 72204, '88 BTN 5×: shove value. Par medio fuerte sigue siendo plan shove a 20 bb.', st5x),
    V('s12-05', 'BB_vs_BTN', ['9c', '5h'], 72205, '95o vs shove en 5×: fold. Overfold más que en 2× — el bust te saca de un prize pool gordo.', vs5x, 'fancy_play'),
    V('s12-06', 'BB_vs_BTN', ['Jh', 'Jd'], 72206, 'JJ 5×: call. El multiplicador no pide tirar ases.', vs5x),
    R('s12-07', 'SB', ['Kh', 'Js'], 72207, 'KJo SB 5×: open steal razonable (no shove panic). Broadway usable; 5× pide menos locura, no parálisis.', st5x),
    R('s12-08', 'BTN', ['5c', '4d'], 72208, '54o 5×: fold. En 5× el steal basura es aún peor.', st5x, 'dominated'),
    V('s12-09', 'BB_vs_SB', ['Qh', '8c'], 72209, 'Q8o vs shove 5×: fold. Tight extra vs 3×.', vs5x, 'fancy_play'),
    V('s12-10', 'BB_vs_BTN', ['Kd', 'Kh'], 72210, 'KK 5×: call. Premium = paga.', vs5x),
    R('s12-11', 'BTN', ['Th', '9h'], 72211, 'T9s BTN 5×: open steal ~2,5 bb (no shove). Jugabilidad; 5× no elimina el steal con conectores, sí el spew.', st5x),
    R('s12-12', 'SB', ['Jd', '8c'], 72212, 'J8o SB 5×: fold. Misma mano, distinto multiplicador: aquí más tight.', st5x, 'dominated')
  ];

  PACKS['S-13'] = [
    R('s13-01', 'BTN', ['As', 'Ts'], 72301, 'Examen ICM: ATs ~12 bb BTN — shove. Zona push/fold, no min-raise.', pf12),
    R('s13-02', 'BTN', ['9h', '7d'], 72302, '97o corto: fold. Checklist: ¿fichas o euros? Aquí ni siquiera fichas.', pf12, 'dominated'),
    V('s13-03', 'BB_vs_BTN', ['Jh', 'Jd'], 72303, 'JJ vs shove: call. Premium — ICM no lo tira.', vsPush),
    V('s13-04', 'BB_vs_BTN', ['Td', '6s'], 72304, 'T6o vs shove: fold. Olor a −EV $.', vsPush, 'fancy_play'),
    R('s13-05', 'SB', ['Kh', 'Js'], 72305, 'KJo SB corto: shove. Push/fold limpio.', pf10),
    V('s13-06', 'BB_vs_SB', ['Qh', '9c'], 72306, 'Q9o vs shove: fold. Overfold vs shove en examen ICM.', vsPush, 'fancy_play'),
    R('s13-07', 'BTN', ['7s', '7c'], 72307, '77 ~10 bb: shove value.', pf10),
    V('s13-08', 'BB_vs_BTN', ['8d', '6c'], 72308, '86o vs shove: fold.', vsPush, 'dominated'),
    R('s13-09', 'BTN', ['Ts', 'Tc'], 72309, 'TT 12 bb: shove. No open min en examen.', pf12),
    V('s13-10', 'BB_vs_BTN', ['Kd', 'Kh'], 72310, 'KK vs shove: call.', vsPush),
    R('s13-11', 'SB', ['Jd', '7h'], 72311, 'J7o SB corto: fold. No panic shove.', pf10, 'fancy_play'),
    V('s13-12', 'BB_vs_SB', ['As', 'Ah'], 72312, 'AA vs shove: call. Checklist cerrado.', vsPush)
  ];

  PACKS['S-14'] = [
    R('s14-01', 'BTN', ['As', 'Ts'], 72401, 'ATs HU/corto: shove. Bubble factor: el pay jump HU duele — elige spots con fold equity, no flips basura.', pf12),
    R('s14-02', 'BTN', ['Kh', '7c'], 72402, 'K7o: fold. No flippees barato el 2.º por orgullo.', pf12, 'dominated'),
    V('s14-03', 'BB_vs_BTN', ['Jd', '8h'], 72403, 'J8o vs shove cerca de HU: fold. Bubble factor alto — overfold.', vsPush, 'fancy_play'),
    V('s14-04', 'BB_vs_BTN', ['Ac', 'Qc'], 72404, 'AQs vs shove: call. Incluso con bubble factor, premiums se pagan.', vsPush),
    R('s14-05', 'SB', ['Kh', 'Js'], 72405, 'KJo SB corto: shove. Presión de pay jump no paraliza broadway usable.', pf10),
    V('s14-06', 'BB_vs_BTN', ['8h', '5d'], 72406, '85o vs shove: fold. Flip mediocre + jump = mala compra.', vsPush, 'fancy_play'),
    R('s14-07', 'BTN', ['Td', 'Tc'], 72407, 'TT: shove value. Par vs rango — no es flip de basura.', pf10),
    V('s14-08', 'BB_vs_SB', ['Qd', '8c'], 72408, 'Q8o: fold.', vsPush, 'dominated'),
    R('s14-09', 'BTN', ['Ah', 'Jh'], 72409, 'AJs: shove. Bubble mental ≠ never shove premiums.', pf12),
    V('s14-10', 'BB_vs_BTN', ['Ks', 'Qs'], 72410, 'KQs: call vs shove.', vsPush),
    R('s14-11', 'SB', ['Qh', '6s'], 72411, 'Q6o SB: fold. No compres el 2.º con panic shove.', pf10, 'fancy_play'),
    V('s14-12', 'BB_vs_BTN', ['Qs', 'Qd'], 72412, 'QQ: call. El bubble factor no tira ases.', vsPush)
  ];

  PACKS['S-15'] = [
    R('s15-01', 'BTN', ['As', 'Ts'], 72501, 'ATs shove 10–12 bb: mide tu rango (Ax suited, pares, broadway) vs el call del BB, no vs “tiene QQ”.', pf12),
    R('s15-02', 'BTN', ['Jh', '7s'], 72502, 'J7o no está en el rango de shove. Range vs range empieza por no meter basura en tu banda.', pf12, 'dominated'),
    V('s15-03', 'BB_vs_BTN', ['Qs', 'Qh'], 72503, 'QQ vs rango de shove BTN corto: call. AK gana vs un shove wide, no vs una mano concreta.', vsPush),
    V('s15-04', 'BB_vs_BTN', ['Qc', '7h'], 72504, 'Q7o vs ese mismo rango: fold. Contra la banda, no contra “creo que tiene 87s”.', vsPush, 'fancy_play'),
    R('s15-05', 'SB', ['Kh', 'Js'], 72505, 'KJo SB: shove frecuente — entra en la banda SB corta.', pf10),
    V('s15-06', 'BB_vs_SB', ['Qh', '9c'], 72506, 'Q9o vs shove SB: fold. El rango de shove SB es más tight que BTN; Q9o queda fuera.', vsPush, 'fancy_play'),
    R('s15-07', 'BTN', ['8s', '8c'], 72507, '88: shove value. Par medio es banda de valor, no “una mano bonita”.', pf10),
    V('s15-08', 'BB_vs_BTN', ['Td', '6h'], 72508, 'T6o: fold. Fuera de cualquier banda de call.', vsPush, 'dominated'),
    R('s15-09', 'BTN', ['As', '6s'], 72509, 'A6s: shove frecuente. Ax suited = banda de presión + blocker de as.', pf10),
    V('s15-10', 'BB_vs_BTN', ['As', 'Kd'], 72510, 'AKo vs shove BTN: call. Tu par contra un rango, no contra AK imaginario.', vsPush),
    R('s15-11', 'SB', ['Ad', '9c'], 72511, 'A9o SB corto: shove frecuente. Entra en muchos charts SB.', pf10),
    V('s15-12', 'BB_vs_SB', ['Jh', '8d'], 72512, 'J8o vs shove: fold. No asignes “él tiene air” para justificar el call.', vsPush, 'fancy_play')
  ];

  PACKS['S-16'] = [
    R('s16-01', 'BTN', ['Jh', 'Td'], 72601, 'Vs nit (foldea mucho): JTo BTN steal OK. Explotas el overfold — más wide que vs GTO ciego.', st20),
    R('s16-02', 'BTN', ['Qh', '3d'], 72602, 'Vs nit tampoco Q3o. Explotación no es spew: el nit paga a veces y entonces estás muerto.', st20, 'dominated'),
    V('s16-03', 'BB_vs_BTN', ['Ad', 'Kd'], 72603, 'Vs maniac que abre/shovea wide: AKs call/3-bet value. Value más limpio, menos farol.', vs20),
    V('s16-04', 'BB_vs_BTN', ['Th', '7c'], 72604, 'Vs maniac con T7o: fold. Él paga y shovea wide — no farolees ni hero-calles basura.', vs20, 'fancy_play'),
    R('s16-05', 'SB', ['Ah', '4h'], 72605, 'Vs nit SB A4s: steal razonable. El nit tira ciegas; Ax suited castiga.', st20),
    V('s16-06', 'BB_vs_BTN', ['Qd', '7c'], 72606, 'Q7o vs cualquier perfil: fold.', vs20, 'dominated'),
    R('s16-07', 'BTN', ['7h', '7d'], 72607, '77 vs nit: shove/open fuerte. Value — el nit foldea de más.', st20),
    V('s16-08', 'BB_vs_BTN', ['Td', 'Th'], 72608, 'TT vs maniac: 3-bet shove value. Cobra al que juega demasiadas manos.', vs20),
    R('s16-09', 'BTN', ['Jh', '9h'], 72609, 'J9s vs nit: steal OK. Vs maniac serías más cauto; aquí el nit tira.', st20),
    V('s16-10', 'BB_vs_BTN', ['Kh', '8d'], 72610, 'K8o vs maniac: fold. Él no tira; tu farol muere. Tight vs agresión loca.', vs20, 'fancy_play'),
    R('s16-11', 'SB', ['Qd', '7c'], 72611, 'Q7o SB vs nit: a menudo fold igual — OOP. Explotar no es abrir basura OOP.', st20, 'fancy_play'),
    V('s16-12', 'BB_vs_SB', ['Ah', 'Js'], 72612, 'AJo vs steal: 3-bet/continue. Vs nit presión; vs maniac value. Ambos perfiles: no fold panic con AJ.', vs20)
  ];

  PACKS['S-17'] = [
    R('s17-01', 'BTN', ['Jc', 'Js'], 72701, 'Pro Spin: JJ ~20 bb shove. Etiqueta el spot (steal corto) antes de clicar.', st20),
    R('s17-02', 'BTN', ['Kh', '2c'], 72702, 'K2o: fold. Mapa: no es iso, no es push premium, es basura.', st20, 'dominated'),
    V('s17-03', 'BB_vs_BTN', ['Ah', 'Qd'], 72703, 'AQo vs steal: 3-bet shove. Defensa BB, no overdefend.', vs20),
    V('s17-04', 'BB_vs_BTN', ['9d', '7h'], 72704, '97o vs steal/shove: fold. ICM + rango.', vs20, 'fancy_play'),
    R('s17-05', 'BTN', ['As', 'Ts'], 72705, 'ATs 12 bb: shove. Push/fold limpio.', pf12),
    bb('s17-06', ['Ah', 'Js'], 72706, { teachBack: 'AJo BB vs limp SB: iso. En 3-max aíslas con fuertes, no check eterno.', playConfig: spin({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
    R('s17-07', 'SB', ['Jh', '8d'], 72707, 'J8o SB corto: fold. No panic.', pf10, 'fancy_play'),
    V('s17-08', 'BB_vs_BTN', ['Jh', 'Jd'], 72708, 'JJ vs steal: 3-bet shove value.', vs20),
    R('s17-09', 'BTN', ['5c', '4c'], 72709, '54s BTN 20 bb: open steal ~2,5 bb. Mano media del rango.', st20),
    V('s17-10', 'BB_vs_BTN', ['Kc', '6h'], 72710, 'K6o vs steal: fold.', vs20, 'dominated'),
    R('s17-11', 'BTN', ['Ts', 'Th'], 72711, 'TT ~10 bb: shove.', pf10),
    V('s17-12', 'BB_vs_BTN', ['Ts', 'Tc'], 72712, 'TT vs shove/steal: call o 3-bet. Certificación: premium se cobra.', vsPush)
  ];

  /* —— MTT —— */
  var early = mtt({ mttPhase: 'early', stackDepth: 'bb40' });
  var midSt = mtt({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' });
  var mid25 = mtt({ mttPhase: 'mid', stackDepth: 'bb25' });
  var big45 = mtt({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb45' });
  var mid22 = mtt({ mttPhase: 'mid', stackDepth: 'bb22' });
  var pushM = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' });
  var push12 = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' });
  var vsMid = mtt({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' });
  var vsPushM = mtt({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' });
  var vsBig = mtt({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb45' });
  var f3mid = mtt({ scenario: 'face3bet', mttPhase: 'mid', stackDepth: 'bb22' });

  PACKS['T-00'] = [
    R('t00-01', 'BTN', ['Ah', 'Td'], 73001, 'Early (~40 bb) ATo BTN: open cash-like. Fase early = paciencia y opens claros, no shove.', early),
    R('t00-02', 'UTG', ['Jh', 'Td'], 73002, 'Early UTG JTo: fold. Ante o no, early no spew desde early position.', early, 'dominated'),
    R('t00-03', 'CO', ['Ks', 'Js'], 73003, 'Early KJs CO: open. Construyes stack con iniciativa; el ante aún no te obliga a locura.', early),
    R('t00-04', 'BTN', ['Ah', '8h'], 73004, 'Mid (~25 bb) A8s BTN: steal. Cambió la fase: ahora robas más que en early.', midSt),
    R('t00-05', 'BTN', ['8c', '2h'], 73005, 'Mid 82o: fold. El ante no convierte basura en steal.', midSt, 'dominated'),
    R('t00-06', 'CO', ['As', '3s'], 73006, 'Mid A3s CO: steal/open OK. Stack en bb + fase mid = más fold equity que early.', midSt),
    R('t00-07', 'BTN', ['As', 'Ts'], 73007, 'Push (~10–12 bb) ATs BTN: shove. Fase push: o all-in o fold — el open min es leak.', push12),
    R('t00-08', 'BTN', ['9c', '6d'], 73008, 'Push 96o: fold. Distinta fase, misma basura: no panic shove.', push12, 'dominated'),
    R('t00-09', 'SB', ['Kh', 'Jh'], 73009, 'Push KJs SB: shove. Cuenta bb: ya no estás early.', pushM),
    R('t00-10', 'UTG', ['Ts', '7c'], 73010, 'Early T7o UTG: fold. Identifica fase ANTES de las cartas.', early, 'fancy_play'),
    R('t00-11', 'BTN', ['Jh', 'Jc'], 73011, 'Mid JJ BTN: open. Par medio en mid — iniciativa, no esperar a ser short.', midSt),
    R('t00-12', 'BTN', ['Ts', 'Tc'], 73012, 'Push TT: shove. Par fuerte en zona corta — all-in.', pushM)
  ];

  PACKS['T-10'] = [
    V('t10-01', 'BB_vs_BTN', ['Qs', 'Qh'], 74001, 'QQ/QQ vs shove corto: call chip EV. Equity vs rango wide — base antes del ICM fino.', vsPushM),
    V('t10-02', 'BB_vs_BTN', ['9h', '7d'], 74002, '97o vs shove: fold. Ni chip EV. “Ver” no es argumento.', vsPushM, 'dominated'),
    V('t10-03', 'BB_vs_SB', ['As', 'Kd'], 74003, 'AKo vs shove: call. Par fuerte — chip EV claro.', vsPushM),
    V('t10-04', 'BB_vs_BTN', ['Td', '6s'], 74004, 'T6o vs shove: fold. Equity insuficiente vs el rango.', vsPushM, 'fancy_play'),
    V('t10-05', 'BB_vs_BTN', ['Jh', 'Jd'], 74005, 'JJ: call. Chip EV máximo.', vsPushM),
    V('t10-06', 'BB_vs_SB', ['Jd', '8c'], 74006, 'J8o: fold. Dominada.', vsPushM, 'dominated'),
    V('t10-07', 'BB_vs_BTN', ['Qs', 'Qd'], 74007, 'QQ: call.', vsPushM),
    V('t10-08', 'BB_vs_BTN', ['Qh', '9c'], 74008, 'Q9o vs shove BTN: fold frecuente. Zona gris hacia fold — no “quiero ver”.', vsPushM, 'fancy_play'),
    V('t10-09', 'BB_vs_SB', ['As', 'Js'], 74009, 'AJs vs shove SB: call sólido. Ax fuerte vs rango.', vsPushM),
    V('t10-10', 'BB_vs_BTN', ['8h', '7d'], 74010, '87o: fold. Precio vs all-in no está.', vsPushM, 'dominated'),
    V('t10-11', 'BB_vs_BTN', ['6s', '6c'], 74011, '66 vs shove BTN: call frecuente. Par vs rango wide.', vsPushM),
    V('t10-12', 'BB_vs_CO', ['Qh', '8c'], 74012, 'Q8o vs shove CO: fold frecuente. CO shoves tighter que BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-11'] = [
    V('t11-01', 'BB_vs_BTN', ['Ad', 'Kd'], 74101, 'AKs vs shove: call. ICM aprieta, pero premiums siguen pagándose.', vsPushM),
    V('t11-02', 'BB_vs_BTN', ['8h', '5d'], 74102, '85o: fold. $EV pide más tightness que chip EV — este ya era fold en fichas.', vsPushM, 'fancy_play'),
    V('t11-03', 'BB_vs_SB', ['Td', 'Th'], 74103, 'TT: call. ICM no tira damas.', vsPushM),
    V('t11-04', 'BB_vs_BTN', ['Qh', '9c'], 74104, 'Q9o vs shove: fold. Overfold vs chip EV: correcto cerca de premios.', vsPushM, 'fancy_play'),
    V('t11-05', 'BB_vs_BTN', ['Ah', 'Ah'], 74105, 'AA: call.', vsPushM),
    V('t11-06', 'BB_vs_SB', ['Qh', '9d'], 74106, 'Q9o: fold.', vsPushM, 'dominated'),
    V('t11-07', 'BB_vs_BTN', ['Jh', 'Jc'], 74107, 'JJ: call.', vsPushM),
    V('t11-08', 'BB_vs_BTN', ['Jh', '9d'], 74108, 'J9o: fold. $EV castiga el flip mediocre.', vsPushM, 'fancy_play'),
    V('t11-09', 'BB_vs_SB', ['As', 'Js'], 74109, 'AJs: call/continue. Ax fuerte — no panic fold ICM.', vsPushM),
    V('t11-10', 'BB_vs_BTN', ['8h', '6c'], 74110, '86o: fold.', vsPushM, 'dominated'),
    V('t11-11', 'BB_vs_BTN', ['9s', '9c'], 74111, '99 vs shove BTN: call frecuente. Par vs wide — $EV suele aguantar.', vsPushM),
    V('t11-12', 'BB_vs_CO', ['Kc', 'Td'], 74112, 'KTo vs shove CO: fold frecuente. ICM más tight que vs BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-12'] = [
    R('t12-01', 'BTN', ['Ts', '9s'], 74201, 'Examen short: T9s BTN ~12 bb shove. ¿20–12 o push? Aquí push/fold.', push12),
    R('t12-02', 'BTN', ['8d', '6c'], 74202, '86o: fold. No open min a 9 bb.', push12, 'dominated'),
    V('t12-03', 'BB_vs_BTN', ['Jc', 'Js'], 74203, 'JJ vs shove: call chip EV (y suele $EV).', vsPushM),
    V('t12-04', 'BB_vs_BTN', ['Qc', '7h'], 74204, 'Q7o vs shove: fold. ICM + equity.', vsPushM, 'fancy_play'),
    R('t12-05', 'CO', ['8h', '8d'], 74205, '88 ~12 bb: shove value. Zona 20–12/push: par medio va all-in.', push12),
    R('t12-06', 'SB', ['Qd', '7c'], 74206, 'Q7o SB corto: fold.', pushM, 'fancy_play'),
    V('t12-07', 'BB_vs_BTN', ['Ah', 'Qd'], 74207, 'AQo: call vs shove.', vsPushM),
    R('t12-08', 'BTN', ['As', 'Ts'], 74208, 'ATs corto: shove.', push12),
    V('t12-09', 'BB_vs_BTN', ['Js', '9c'], 74209, 'J9o vs shove: fold.', vsPushM, 'dominated'),
    R('t12-10', 'SB', ['Ks', 'Ts'], 74210, 'KTs SB: shove frecuente.', pushM),
    V('t12-11', 'BB_vs_SB', ['Qs', 'Qd'], 74211, 'QQ: call.', vsPushM),
    R('t12-12', 'BTN', ['Jd', '8h'], 74212, 'J8o 12 bb: shove. Checklist: bb → shove/fold → ejecuta.', push12)
  ];

  PACKS['T-13'] = [
    R('t13-01', 'BTN', ['As', '9h'], 74301, 'Big (~45 bb) BTN A9o: steal. Rol big = presión. Identifica rol antes de la mano.', big45),
    R('t13-02', 'BTN', ['6h', '2c'], 74302, 'Big con 62o: fold. Rol no lava basura.', big45, 'dominated'),
    R('t13-03', 'CO', ['Jh', '8d'], 74303, 'Mid (~22 bb) CO J8o con covers detrás: fold. Rol mid = sobrevivir, no chocar.', mid22, 'fancy_play'),
    R('t13-04', 'BTN', ['As', 'Ts'], 74304, 'Short BTN ATs: shove. Rol short = ladder/doble selectivo.', push12),
    V('t13-05', 'BB_vs_BTN', ['Kh', '8d'], 74305, 'Cover/big vs open wide con K8o: fold. No pagues light “soy cover”.', vsBig, 'fancy_play'),
    V('t13-06', 'BB_vs_BTN', ['Jh', 'Jd'], 74306, 'Cover JJ vs open BTN: 3-bet value. Big también cobra premiums.', vsBig),
    R('t13-07', 'UTG', ['Ad', '7d'], 74307, 'Mid UTG A7s: fold. Early + mid + covers = disciplina.', mid25, 'dominated'),
    R('t13-08', 'BTN', ['7s', '7c'], 74308, 'Mid BTN 77: open. Spot limpio — mid no es “nunca juego”.', mid25),
    R('t13-09', 'BTN', ['Kh', '7c'], 74309, 'Short K7o: fold. Ladder no es panic shove.', push12, 'dominated'),
    F3('t13-10', 'BTN_vs_BB', ['Td', 'Tc'], 74310, 'Mid TT vs 3-bet del cover: fold frecuente. Evita coin flip vs quien te elimina.', f3mid, 'fancy_play'),
    R('t13-11', 'SB', ['Kh', 'Jh'], 74311, 'Short SB KJs: shove. Rol short en late.', pushM),
    R('t13-12', 'BTN', ['Ts', 'Tc'], 74312, 'Big TT BTN: open/presión. El big abre más; no spew, sí iniciativa.', big45)
  ];

  PACKS['T-14'] = [
    R('t14-01', 'BTN', ['Kc', 'Ts'], 74401, 'Big stack BTN KTo: steal. Presión ICM = fold equity, no call light.', big45),
    R('t14-02', 'BTN', ['5d', '3c'], 74402, '53o big: fold. Presión ≠ pagar/abrir basura.', big45, 'dominated'),
    R('t14-03', 'CO', ['As', '6s'], 74403, 'Big CO A6s: open/steal. Castigas mids que overfoldean.', big45),
    V('t14-04', 'BB_vs_BTN', ['Qd', '9c'], 74404, 'Big vs open: Q9o fold. Si el short ya está committed, no regales el doble.', vsBig, 'fancy_play'),
    V('t14-05', 'BB_vs_BTN', ['Kd', 'Kh'], 74405, 'KK big vs open: 3-bet value. Cobra; no flat eterno por “presión”.', vsBig),
    R('t14-06', 'SB', ['Qd', 'Td'], 74406, 'Big SB QTs: open frecuente. Presión desde ciegas con broadway.', big45),
    R('t14-07', 'BTN', ['Th', '9h'], 74407, 'T9s big BTN: steal. Jugabilidad + fold equity vs mids asustados.', big45),
    V('t14-08', 'BB_vs_BTN', ['9c', '5h'], 74408, '95o vs open: fold. El big no hero-calla.', vsBig, 'dominated'),
    R('t14-09', 'CO', ['Jd', '8c'], 74409, 'J8o CO: fold típico. Presión selectiva, no cualquier offsuit.', big45, 'fancy_play'),
    V('t14-10', 'BB_vs_BTN', ['Ac', 'Qc'], 74410, 'AQs big: 3-bet value. Misma lógica que QQ.', vsBig),
    R('t14-11', 'BTN', ['As', 'Jd'], 74411, 'AJo BTN big: steal claro.', big45),
    R('t14-12', 'SB', ['4s', '2d'], 74412, '42o SB: fold. Cover no stealea basura OOP.', big45, 'dominated')
  ];

  PACKS['T-15'] = [
    R('t15-01', 'CO', ['Ts', '7c'], 74501, 'Mid CO T7o con covers: fold. Supervivencia = no opens flojos vs quien te elimina.', mid22, 'fancy_play'),
    R('t15-02', 'UTG', ['Ah', '4h'], 74502, 'Mid UTG A4s: fold. Demasiada gente (y covers) detrás.', mid25, 'dominated'),
    R('t15-03', 'BTN', ['8s', '8c'], 74503, 'Mid BTN 88: open. Supervivir no es foldear premiums/pares claros.', mid25),
    F3('t15-04', 'BTN_vs_BB', ['7h', '7d'], 74504, 'Mid 77 vs 3-bet cover: fold frecuente. Evita el coin flip de eliminación.', f3mid, 'fancy_play'),
    R('t15-05', 'BTN', ['Ah', 'Td'], 74505, 'Mid ATo BTN: open. Late + mano fuerte = spot limpio.', mid25),
    R('t15-06', 'HJ', ['Js', '9h'], 74506, 'Mid J9o HJ: fold frecuente. Mid no spew middle.', mid25, 'fancy_play'),
    F3('t15-07', 'BTN_vs_BB', ['7d', '3c'], 74507, '73o vs 3-bet: fold. Obvio — el mid no hero-calla.', f3mid, 'dominated'),
    R('t15-08', 'CO', ['Ah', 'Jh'], 74508, 'AJs CO mid: open. Value — supervivencia no es parálisis.', mid25),
    F3('t15-09', 'CO_vs_BB', ['Ah', 'Td'], 74509, 'ATo CO vs 3-bet cover: fold frecuente. OOP + eliminación.', f3mid, 'fancy_play'),
    R('t15-10', 'BTN', ['Jh', '9h'], 74510, 'J9s BTN mid: open razonable. Jugabilidad en late.', mid25),
    R('t15-11', 'UTG', ['Ad', '8c'], 74511, 'A8o UTG: fold.', mid25, 'dominated'),
    F3('t15-12', 'BTN_vs_BB', ['Ts', 'Tc'], 74512, 'TT vs 3-bet: 4-bet/call value. Mid también stackea premiums.', f3mid)
  ];

  PACKS['T-16'] = [
    R('t16-01', 'BTN', ['As', 'Ts'], 74601, 'Short BTN ATs: shove. Ladder: late + folds delante. No UTG basura.', push12),
    R('t16-02', 'UTG', ['9h', '7d'], 74602, 'Short UTG 97o: fold. Antitexto del ladder: early + basura = bust.', push12, 'fancy_play'),
    R('t16-03', 'SB', ['Kh', 'Jh'], 74603, 'Short SB KJs: shove. Late-ish + broadway.', pushM),
    R('t16-04', 'BTN', ['Qd', '8c'], 74604, 'Q8o: fold. A veces fold + esperar eliminación ajena es el ladder.', push12, 'dominated'),
    R('t16-05', 'CO', ['Ts', 'Th'], 74605, 'TT short: shove. Par — double-up claro.', push12),
    R('t16-06', 'SB', ['Kc', '8h'], 74606, 'K8o SB: fold. Selectivo, no panic.', pushM, 'fancy_play'),
    R('t16-07', 'BTN', ['As', '3s'], 74607, 'A3s BTN: shove frecuente. Fold equity vs mids ICM-tight.', pushM),
    R('t16-08', 'CO', ['Jh', 'Td'], 74608, 'JTo CO corto: fold frecuente. No tan late como BTN.', push12, 'fancy_play'),
    R('t16-09', 'BTN', ['Ks', 'Qs'], 74609, 'KQs: shove. Ladder también es value shove.', push12),
    R('t16-10', 'SB', ['Jh', '7s'], 74610, 'J7o SB: fold.', pushM, 'dominated'),
    R('t16-11', 'BTN', ['5c', '4c'], 74611, '54s BTN corto: shove candidato. Conector + late.', push12),
    R('t16-12', 'UTG', ['Kd', '9h'], 74612, 'K9o UTG: fold. Espera un asiento mejor.', push12, 'dominated')
  ];

  PACKS['T-17'] = [
    R('t17-01', 'BTN', ['Qs', 'Jh'], 74701, 'Post-ITM QJo BTN mid: steal OK. Ya cobras mínimo, pero el jump sigue: abre, no spew.', midSt),
    R('t17-02', 'BTN', ['8h', '3d'], 74702, '83o post-ITM: fold. “Ya estoy pagado” no es all-in light.', midSt, 'dominated'),
    V('t17-03', 'BB_vs_BTN', ['Th', '7c'], 74703, 'T7o vs shove post-ITM: fold. ICM sigue encendido.', vsPushM, 'fancy_play'),
    V('t17-04', 'BB_vs_BTN', ['Qs', 'Qh'], 74704, 'QQ vs shove: call. Pay jump no tira AK.', vsPushM),
    R('t17-05', 'CO', ['Ad', '8d'], 74705, 'A8s CO: steal. Más agresión que burbuja extrema, no locura.', midSt),
    R('t17-06', 'CO', ['Jd', '8c'], 74706, 'J8o CO: fold. Post-bubble ≠ cualquier offsuit.', midSt, 'fancy_play'),
    V('t17-07', 'BB_vs_BTN', ['As', 'Kd'], 74707, 'AKo: call vs shove.', vsPushM),
    R('t17-08', 'BTN', ['8d', '6d'], 74708, '86s BTN: steal. Jugabilidad post-ITM.', midSt),
    V('t17-09', 'BB_vs_BTN', ['Kc', '8d'], 74709, 'K8o vs shove: fold.', vsPushM, 'dominated'),
    R('t17-10', 'SB', ['Qd', 'Td'], 74710, 'QTs SB: open/steal frecuente.', midSt),
    R('t17-11', 'BTN', ['As', 'Ts'], 74711, 'ATs corto: shove. ITM no apaga push/fold.', push12),
    V('t17-12', 'BB_vs_BTN', ['Kd', 'Kh'], 74712, 'KK: call. El min-cash no cambia nuts.', vsPushM)
  ];

  PACKS['T-18'] = [
    R('t18-01', 'BTN', ['Jh', 'Td'], 74801, 'Examen bubble: ¿rol big? JTo steal. Presión.', big45),
    R('t18-02', 'CO', ['9s', '6c'], 74802, '¿Rol mid? 96o fold vs covers.', mid22, 'fancy_play'),
    R('t18-03', 'BTN', ['As', 'Ts'], 74803, '¿Rol short? ATs shove.', push12),
    V('t18-04', 'BB_vs_BTN', ['Td', '9c'], 74804, 'Cover T9o vs open: fold. No dobles fáciles.', vsBig, 'fancy_play'),
    R('t18-05', 'BTN', ['9c', '2s'], 74805, '92o cualquier rol: fold.', big45, 'dominated'),
    F3('t18-06', 'BTN_vs_BB', ['Jh', 'Jc'], 74806, 'Mid JJ vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t18-07', 'BB_vs_BTN', ['Ad', 'Kd'], 74807, 'AKs cover: 3-bet value.', vsBig),
    R('t18-08', 'UTG', ['Ac', '9c'], 74808, 'Mid UTG A9s: fold.', mid25, 'dominated'),
    R('t18-09', 'SB', ['Kh', 'Jh'], 74809, 'Short SB KJs: shove.', pushM),
    R('t18-10', 'BTN', ['6s', '6c'], 74810, 'Mid 66 BTN: open. Supervivir ≠ parálisis.', mid25),
    V('t18-11', 'BB_vs_BTN', ['Td', 'Th'], 74811, 'TT cover: 3-bet.', vsBig),
    R('t18-12', 'BTN', ['Td', '6h'], 74812, 'Short T6o: fold. Checklist: rol → job → acción.', push12, 'dominated')
  ];

  PACKS['T-19'] = [
    R('t19-01', 'BTN', ['Ah', '8h'], 74901, 'FT big A8s BTN: steal. ICM a máximo volumen — presión de cover.', big45),
    R('t19-02', 'CO', ['Jd', '7h'], 74902, 'FT mid J7o: fold. Jumps enormes; no chocar vs cover.', mid22, 'fancy_play'),
    R('t19-03', 'BTN', ['As', 'Ts'], 74903, 'FT short ATs: shove selectivo. Pick spots, no UTG trash.', push12),
    V('t19-04', 'BB_vs_BTN', ['Qc', 'Th'], 74904, 'FT cover QTo vs open: fold. Un flip malo destroza horas.', vsBig, 'fancy_play'),
    V('t19-05', 'BB_vs_BTN', ['Jc', 'Js'], 74905, 'JJ FT: 3-bet value. Premium sigue siendo bote grande.', vsBig),
    R('t19-06', 'BTN', ['Js', '4d'], 74906, 'J4o FT: fold. Cualquier rol.', big45, 'dominated'),
    F3('t19-07', 'BTN_vs_BB', ['9h', '9c'], 74907, 'Mid 99 vs 3-bet chip leader: fold frecuente. ICM FT.', f3mid, 'fancy_play'),
    R('t19-08', 'BTN', ['8h', '8d'], 74908, 'Mid/FT 88 BTN: open si el spot es limpio.', mid25),
    R('t19-09', 'SB', ['Kh', 'Jh'], 74909, 'Short FT KJs SB: shove.', pushM),
    V('t19-10', 'BB_vs_BTN', ['Ah', 'Qd'], 74910, 'AQo FT: 3-bet value.', vsBig),
    R('t19-11', 'UTG', ['Ah', '2h'], 74911, 'A2s UTG FT: fold. Covers detrás.', mid25, 'dominated'),
    R('t19-12', 'BTN', ['Jh', 'Jd'], 74912, 'JJ BTN FT: open/presión. Mapa usable, no solver de FT.', big45)
  ];

  PACKS['T-20'] = [
    V('t20-01', 'BB_vs_BTN', ['9d', '7h'], 75001, '97o vs shove: fold. Verbaliza: “en fichas dudoso; en dinero me tiro”. Drill chip EV vs $EV.', vsPushM, 'fancy_play'),
    V('t20-02', 'BB_vs_BTN', ['Ts', 'Tc'], 75002, 'TT: call. Aquí coinciden chip EV y $EV — dilo en voz alta.', vsPushM),
    V('t20-03', 'BB_vs_BTN', ['Qh', '9c'], 75003, 'Q9o: fold. +EV chips dudoso / −EV $ típico de burbuja-FT.', vsPushM, 'fancy_play'),
    V('t20-04', 'BB_vs_BTN', ['Ad', 'Kd'], 75004, 'AKs: call. Coinciden.', vsPushM),
    V('t20-05', 'BB_vs_SB', ['Jd', '8c'], 75005, 'J8o: fold. Ni fichas ni dinero.', vsPushM, 'dominated'),
    V('t20-06', 'BB_vs_BTN', ['Kd', 'Kh'], 75006, 'KK: call. Premium alinea ambos EV.', vsPushM),
    V('t20-07', 'BB_vs_BTN', ['Jh', '9d'], 75007, 'J9o: fold. “En fichas a veces pago; en dinero no.”', vsPushM, 'fancy_play'),
    V('t20-08', 'BB_vs_BTN', ['As', 'Ah'], 75008, 'AA: call.', vsPushM),
    V('t20-09', 'BB_vs_SB', ['Td', '8h'], 75009, 'T8o: fold.', vsPushM, 'dominated'),
    V('t20-10', 'BB_vs_BTN', ['7s', '7c'], 75010, '77 vs shove BTN: call frecuente. Par vs wide — suelen coincidir.', vsPushM),
    V('t20-11', 'BB_vs_CO', ['Ks', '7d'], 75011, 'K7o vs shove CO: fold. $EV aprieta vs rangos menos wide.', vsPushM, 'fancy_play'),
    V('t20-12', 'BB_vs_SB', ['As', 'Js'], 75012, 'AJs: call. Ax fuerte — no idolatres solo el miedo ICM.', vsPushM)
  ];

  PACKS['T-21'] = [
    R('t21-01', 'BTN', ['As', 'Ts'], 75101, '¿Qué % shovea este short BTN? ATs entra. Asigna rango de shove, luego encaja tu combo.', push12),
    R('t21-02', 'BTN', ['9c', '6d'], 75102, '96o no está en el rango de shove. Lectura: fuera de banda.', push12, 'dominated'),
    V('t21-03', 'BB_vs_BTN', ['Ac', 'Qc'], 75103, '¿Qué paga este mid vs shove short? AQs sí. Rango de call, no “su mano”.', vsPushM),
    V('t21-04', 'BB_vs_BTN', ['8s', '6c'], 75104, '86o: el mid overfoldea vs cover/shove. Fold — tu combo no entra en su banda de call.', vsPushM, 'fancy_play'),
    R('t21-05', 'SB', ['Kh', 'Jh'], 75105, 'Short SB KJs: entra en shove SB. Pregunta el % del asiento.', pushM),
    V('t21-06', 'BB_vs_BTN', ['Qh', '8c'], 75106, 'Q8o vs open del BTN wide: fold. El big no paga light por ego — tú tampoco.', vsBig, 'fancy_play'),
    R('t21-07', 'BTN', ['Td', 'Tc'], 75107, 'TT short: banda de value shove.', pushM),
    V('t21-08', 'BB_vs_BTN', ['Ah', 'Jh'], 75108, 'AJs: banda de 3-bet/call. Value vs open late.', vsBig),
    R('t21-09', 'CO', ['Qh', '6s'], 75109, 'Q6o mid CO: no entra en open vs cover. Rango recortado por rol.', mid22, 'fancy_play'),
    V('t21-10', 'BB_vs_BTN', ['8s', '7d'], 75110, '87o: fuera de todo rango de call.', vsPushM, 'dominated'),
    R('t21-11', 'BTN', ['7s', '6s'], 75111, '76s short BTN: banda de shove con blocker. Range reading, no “me gusta el as”.', pushM),
    V('t21-12', 'BB_vs_SB', ['Ah', 'Js'], 75112, 'AJo vs shove SB: entra en call. SB shovea más tight — AJ aún gana vs esa banda.', vsPushM)
  ];

  PACKS['T-22'] = [
    R('t22-01', 'BTN', ['Ah', 'Td'], 75201, 'Pro MTT: early ATo BTN open. Paso 1: fase y bb.', early),
    R('t22-02', 'UTG', ['Qh', '9c'], 75202, 'Early Q9o UTG: fold.', early, 'dominated'),
    R('t22-03', 'BTN', ['Kd', 'Jd'], 75203, 'Mid steal KJs. Paso 2: rol y job.', midSt),
    R('t22-04', 'BTN', ['As', 'Ts'], 75204, 'Push ATs shove. Fase push.', push12),
    V('t22-05', 'BB_vs_BTN', ['Jh', '7d'], 75205, 'J7o vs shove: fold $EV.', vsPushM, 'fancy_play'),
    V('t22-06', 'BB_vs_BTN', ['Ks', 'Qs'], 75206, 'KQs vs shove: call.', vsPushM),
    R('t22-07', 'BTN', ['Kh', 'Jd'], 75207, 'Bubble/FT big: KJo steal.', big45),
    R('t22-08', 'CO', ['Qd', '7c'], 75208, 'Mid bubble Q7o: fold.', mid22, 'fancy_play'),
    F3('t22-09', 'BTN_vs_BB', ['8s', '8c'], 75209, 'Mid 88 vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t22-10', 'BB_vs_BTN', ['Qs', 'Qd'], 75210, 'QQ cover: 3-bet.', vsBig),
    R('t22-11', 'BTN', ['8h', '5c'], 75211, '85o cualquier fase: fold.', push12, 'dominated'),
    R('t22-12', 'SB', ['Kh', 'Jh'], 75212, 'Short KJs SB shove. Certificación: fase → rol → acción.', pushM)
  ];

  /* —— Rangos: R-01 quiz matriz · R-02 pintar RFI —— */
  function mxLocate(id, seed, cell, prompt, teach, trap) {
    return {
      id: id,
      kind: 'matrixQuiz',
      seed: seed,
      heroPos: 'BTN',
      teachBack: teach || '',
      trapTag: trap || undefined,
      quiz: { mode: 'locate', targetCell: cell, prompt: prompt }
    };
  }
  function mxChoice(id, seed, prompt, options, correctId, teach, previewSelected) {
    return {
      id: id,
      kind: 'matrixQuiz',
      seed: seed,
      heroPos: 'BTN',
      teachBack: teach || '',
      quiz: {
        mode: 'choice',
        prompt: prompt,
        options: options,
        correctId: correctId,
        previewSelected: previewSelected || {}
      }
    };
  }
  function mxInRange(id, seed, hand, position, teach, trap) {
    return {
      id: id,
      kind: 'matrixQuiz',
      seed: seed,
      heroPos: position || 'BTN',
      teachBack: teach || '',
      trapTag: trap || undefined,
      quiz: {
        mode: 'inRange',
        hand: hand,
        position: position || 'BTN',
        prompt: '¿' + hand + ' entra en el RFI ' + (position || 'BTN') + ' del chart cash 6-max?'
      }
    };
  }
  function mxPaint(id, seed, band, prompt, teach, seconds, passOverlap) {
    return {
      id: id,
      kind: 'matrixPaint',
      seed: seed,
      heroPos: 'BTN',
      teachBack: teach || '',
      paint: {
        position: 'BTN',
        band: band || 'all',
        prompt: prompt,
        seconds: seconds || 0,
        passOverlap: passOverlap != null ? passOverlap : 0.7
      }
    };
  }

  PACKS['R-01'] = [
    mxLocate('r01-01', 76001, 'AA', 'Localiza AA en la matriz.', 'AA está en la esquina superior izquierda: par en la diagonal.'),
    mxLocate('r01-02', 76002, '72o', 'Localiza 72o (offsuit).', '72o está abajo a la derecha, debajo de la diagonal. Offsuit = debajo.', 'dominated'),
    mxLocate('r01-03', 76003, 'AKs', 'Localiza AKs (suited).', 'AKs: fila A, columna K, lado suited (encima de la diagonal).'),
    mxLocate('r01-04', 76004, 'AKo', 'Localiza AKo (offsuit).', 'AKo es la misma familia que AKs pero debajo de la diagonal.'),
    mxLocate('r01-05', 76005, '99', 'Localiza el par 99.', 'Los pares viven en la diagonal. 99 está en el centro-alto.'),
    mxLocate('r01-06', 76006, 'T9s', 'Localiza T9s.', 'Conectores suited: encima de la diagonal, cerca uno del otro.'),
    mxChoice('r01-07', 76007, 'A simple vista, ¿qué rango de RFI es más wide?', [
      { id: 'btn', label: 'BTN (botón)' },
      { id: 'utg', label: 'UTG' },
      { id: 'same', label: 'Los dos iguales' }
    ], 'btn', 'BTN pinta muchas más celdas que UTG. Posición late = rango más ancho.'),
    mxChoice('r01-08', 76008, 'Si una celda marca 40 %, ¿qué significa?', [
      { id: 'always', label: 'Siempre se juega' },
      { id: 'mix', label: 'Se mezcla: a veces sí, a veces no' },
      { id: 'never', label: 'Nunca se juega' }
    ], 'mix', 'El % es frecuencia, no un sí/no absoluto.'),
    mxLocate('r01-09', 76009, 'KJo', 'Localiza KJo.', 'KJo: offsuit broadway, debajo de la diagonal.'),
    mxLocate('r01-10', 76010, 'A5s', 'Localiza A5s.', 'Ax suited: fila A, columna 5, lado suited.'),
    mxLocate('r01-11', 76011, '22', 'Localiza el par más bajo: 22.', '22 cierra la diagonal abajo a la derecha.'),
    mxChoice('r01-12', 76012, '¿Dónde están los pares en la matriz 13×13?', [
      { id: 'diag', label: 'En la diagonal' },
      { id: 'top', label: 'Solo en la primera fila' },
      { id: 'bottom', label: 'Solo offsuit abajo' }
    ], 'diag', 'AA…22 forman la diagonal. Sin eso, aún no lees el chart.')
  ];

  PACKS['R-02'] = [
    mxPaint('r02-01', 76101, 'pairs', 'Marca todos los pares (22+) que abrirías RFI BTN.', 'Banda 1: pares. En BTN casi todos los pares entran.', 0, 0.85),
    mxPaint('r02-02', 76102, 'ax_suited', 'Marca los Ax suited del RFI BTN.', 'Banda Ax suited: A2s+ en el chart BTN.', 0, 0.75),
    mxInRange('r02-03', 76103, 'ATo', 'BTN', 'ATo: broadway offsuit — entra en RFI BTN.'),
    mxInRange('r02-04', 76104, '64o', 'BTN', '64o no entra. Wide no es cualquier dos.', 'dominated'),
    mxPaint('r02-05', 76105, 'broadway_o', 'Marca broadway offsuit típicos del RFI BTN.', 'Banda broadway offsuit: ATo+, KQo, etc.', 0, 0.7),
    mxInRange('r02-06', 76106, 'T8s', 'BTN', 'T8s: suited connector — entra en BTN.'),
    mxInRange('r02-07', 76107, '52o', 'BTN', '52o: fuera de bandas. Fold en el chart.', 'dominated'),
    mxPaint('r02-08', 76108, 'sc', 'Marca conectores / gapers suited del RFI BTN (sin Ax ni Kx).', 'Banda sc: 76s, 65s, 54s…', 0, 0.65),
    mxInRange('r02-09', 76109, 'T2o', 'BTN', 'T2o: basura total. Fuera del chart BTN.', 'fancy_play'),
    mxInRange('r02-10', 76110, 'KQo', 'BTN', 'KQo: broadway offsuit claro. Entra.'),
    mxPaint('r02-11', 76111, 'all', '60 s: pinta el RFI BTN completo (raise + mix del chart).', 'Contrasta tu mapa mental con el chart. Wide ≠ spew.', 60, 0.65),
    mxPaint('r02-12', 76112, 'all', 'Otra pasada: RFI BTN completo sin cronómetro estricto (90 s).', 'Si BTN y CO te salen iguales, aún no discriminas posición.', 90, 0.7)
  ];

  /* Examen M1: mezcla matriz + blockers (open/fold 3-bet) */
  PACKS['R-28'] = [
    mxLocate('r28-01', 78001, 'AA', 'Examen: localiza AA.', 'Diagonal: AA.'),
    mxLocate('r28-02', 78002, '72o', 'Examen: localiza 72o.', 'Offsuit abajo.'),
    mxChoice('r28-03', 78003, '¿BTN es más wide que UTG en RFI?', [
      { id: 'yes', label: 'Sí' },
      { id: 'no', label: 'No' }
    ], 'yes', 'BTN pinta más celdas.'),
    mxInRange('r28-04', 78004, 'A5s', 'BTN', 'A5s entra en BTN.'),
    mxInRange('r28-05', 78005, '93o', 'BTN', '93o fuera.', 'dominated'),
    mxPaint('r28-06', 78006, 'pairs', 'Marca los pares del RFI BTN.', 'Pares casi todos.', 0, 0.8),
    V('r28-07', 'BB_vs_BTN', ['Ah', '4h'], 78007, 'A4s vs BTN: 3-bet polar con blocker de as.', cash({ scenario: '3bet' })),
    V('r28-08', 'BB_vs_BTN', ['Kd', 'Tc'], 78008, 'KTo: fold. Mal blocker y dominada.', cash({ scenario: '3bet' }), 'fancy_play'),
    V('r28-09', 'BB_vs_BTN', ['Qs', 'Qd'], 78009, 'QQ: 3-bet value.', cash({ scenario: '3bet' })),
    mxLocate('r28-10', 78010, 'T9s', 'Localiza T9s.', 'Suited encima de la diagonal.'),
    mxChoice('r28-11', 78011, 'Un 35 % en una celda significa…', [
      { id: 'mix', label: 'Frecuencia / mezcla' },
      { id: 'always', label: 'Siempre open' }
    ], 'mix', 'Frecuencia, no absoluto.'),
    mxInRange('r28-12', 78012, 'KQo', 'BTN', 'KQo entra.')
  ];

  PACKS['R-03'] = [
    Fl('r03-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 76201, 'K72 rainbow: rango BTN wide conecta poco (pocos Kx). C-bet pequeño — ventaja de rango en seco.'),
    Fl('r03-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 76202, '987 two-tone: el caller conecta más (pares, draws). Menos c-bet auto. Textura > “tengo AQ”.', { trapTag: 'fancy_play' }),
    Fl('r03-03', 'BTN', ['Kd', 'Qd'], ['As', '8h', '3c'], 76203, 'A-high seco: % de top pair del rango IP es decente. C-bet frecuente.'),
    Fl('r03-04', 'BTN', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 76204, 'Monotone: mucho flush/draw en rangos wide. No trates como seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('r03-05', 'CO', ['Ah', 'Kd'], ['Qs', '7c', '2d'], 76205, 'Q-high seco: c-bet pequeño IP. El rango rival (BB) tiene menos Qx que tú AK backdoors.'),
    Fl('r03-06', 'BTN', ['5s', '5c'], ['Kh', '9d', '3c'], 76206, 'K-high seco con underpair: mix c-bet pequeño. El board no “conectó” tu 55; niegas equity.'),
    Fl('r03-07', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 76207, 'JT9 conectado: alto % de straight/dos pares en el caller. Pot control, no hinchar.', { trapTag: 'fancy_play' }),
    Fl('r03-08', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 76208, 'A-high seco con backdoors: c-bet ligero. Poco conectó el caller; tú tienes draws traseros.'),
    Fl('r03-09', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 76209, 'Top pair A-high seco: c-bet value. Tu rango conectó; el suyo menos two-pair.'),
    Fl('r03-10', 'CO', ['Jh', 'Td'], ['9s', '8s', '2h'], 76210, 'Semi-wet: más % de draws. No autocbet grande.', { trapTag: 'fancy_play' }),
    Fl('r03-11', 'BTN', ['Ah', 'Kd'], ['2c', '2s', '7d'], 76211, 'Paired bajo: menos two-pair en el caller wide. C-bet frecuente IP.'),
    Fl('r03-12', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 76212, 'K-high seco air + backdoors: c-bet ligero OK. Estima % aire vs % par del rival.')
  ];

  PACKS['R-04'] = [
    V('r04-01', 'BB_vs_BTN', ['Ah', '4h'], 76301, 'A4s vs BTN: 3-bet polar. El as bloquea AA/AK del rival — menos combos premium que te pagan mal.', cash({ scenario: '3bet' })),
    V('r04-02', 'BB_vs_BTN', ['Kd', 'Tc'], 76302, 'KTo: mal blocker (no bloquea AA/AK igual) y mano dominada. Fold, no farol.', cash({ scenario: '3bet' }), 'fancy_play'),
    V('r04-03', 'BB_vs_BTN', ['Qs', 'Qd'], 76303, 'QQ: 3-bet value. Tus ases también “bloquean” AA rival — sobra value.', cash({ scenario: '3bet' })),
    V('r04-04', 'BB_vs_CO', ['Qh', '6d'], 76304, 'Q6o: 0 blockers útiles. Fold.', cash({ scenario: '3bet' }), 'dominated'),
    F3('r04-05', 'BTN_vs_BB', ['As', '3s'], 76305, 'A3s vs 3-bet: 4-bet farol mixto. El as quita combos de AA/AK del 3-bettor.', cash({ scenario: 'face3bet' })),
    F3('r04-06', 'BTN_vs_BB', ['Qd', 'Jh'], 76306, 'QJo vs 3-bet: fold. No bloqueas premium; te dominan. Combos de QJ no son farol.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-07', 'BB_vs_BTN', ['Ah', '4h'], 76307, 'A4s: 3-bet polar frecuente. Mismo blocker de as que A5s.', cash({ scenario: '3bet' })),
    V('r04-08', 'BB_vs_BTN', ['Kh', '8d'], 76308, 'K8o: fold. Blocker de K débil vs BTN wide; dominada.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r04-09', 'BTN_vs_BB', ['Ts', 'Tc'], 76309, 'TT vs 3-bet: 4-bet value. Blockers + nuts.', cash({ scenario: 'face3bet' })),
    V('r04-10', 'BB_vs_CO', ['Jc', 'Js'], 76310, 'JJ: 3-bet value. Par fuerte — quieres aislar y construir bote.', cash({ scenario: '3bet' })),
    F3('r04-11', 'CO_vs_BB', ['7s', '4d'], 76311, '74o vs 3-bet: fold. Cero eliminación de combos fuertes.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-12', 'BB_vs_BTN', ['Kd', '2d'], 76312, 'K2s: a veces 3-bet farol con blocker de K. No es KTo. Mix/presión, no spew offsuit.', cash({ scenario: '3bet' }))
  ];

  PACKS['R-05'] = (function () {
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
    return [
      LQ('r05-01', 'BB', ['Ah', 'Kd'], ['As', '7c', '2d', '9h', '3c'], 76401, {
        villainPos: 'BTN', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'As 7c 2d — BB check → BTN c-bet 33% pot → BB call' },
          { street: 'Turn', text: '9h — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: '3c — BB check → BTN bet 66% pot (tú decides)' }
        ],
        teachBack: 'Triple barrel en A-high seco: densifica Ax value (y algún farol). Manos que abren pero pot-controlan turn (TT) o aire sin plan (QJs) caen en calles posteriores.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Ac', 'Qc'],
          teachBack: 'AQo: open + triple barrel value en A-high. TT suele pot-controlar turn; QJs sin as abandona la presión antes del river.',
          options: [
            { id: 'a', cards: ['Ac', 'Qc'], label: 'AQo', correct: true },
            { id: 'b', cards: ['Ts', 'Th'], label: 'TT', correct: false,
              eliminated: 'Abre BTN y puede c-bet flop, pero en A-high seco suele pot-controlar turn: no triple-barrela por valor. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' },
            { id: 'c', cards: ['Qh', 'Js'], label: 'QJs', correct: false,
              eliminated: 'Open OK y c-bet posible, pero sin as ni pareja fuerte: en turn 9h suele dejar de meter presión. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' }
          ]
        }
      }),
      LQ('r05-02', 'BB', ['Kh', 'Qs'], ['Kd', '8c', '3h', '2s', '7d'], 76402, {
        villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Kd 8c 3h — check-check' },
          { street: 'Turn', text: '2s — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: '7d — BB check → BTN bet 66% pot' }
        ],
        teachBack: 'Check-check flop + delayed barrel: Kx value o farol. AA casi nunca checkea ese flop; QJo sin K rara vez barrela turn y river.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Kc', 'Jh'],
          teachBack: 'KJo cuadra el delayed value. AA betearía flop; QJo sin rey no construye turn+river bet con esta historia.',
          options: [
            { id: 'a', cards: ['As', 'Ad'], label: 'AA', correct: false,
              eliminated: 'Abre y en K-high seco casi siempre c-betea flop: el check-check la elimina. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'b', cards: ['Kc', 'Jh'], label: 'KJo', correct: true },
            { id: 'c', cards: ['Qc', 'Jd'], label: 'QJo', correct: false,
              eliminated: 'Open late OK, pero sin K: delayed barrel turn+river es raro; suele checkear river o fold. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' }
          ]
        }
      }),
      LQ('r05-03', 'BTN', ['Ah', 'Qd'], ['Jc', '7d', '2s', '9h', '3c'], 76403, {
        villainPos: 'BB', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Jc 7d 2s — BB check → BTN c-bet 33% pot → BB check-raise 3× → BTN call' },
          { street: 'Turn', text: '9h — BB bet 66% pot → BTN call' },
          { street: 'River', text: '3c — BB bet 66% pot (tú decides)' }
        ],
        teachBack: 'Check-raise flop + barrels: polar (sets/dos pares + faroles). AKo y TT defienden BB, pero no raisean ese flop por value.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Jh', 'Js'],
          teachBack: 'JJ (set) es value clásico del check-raise. AKo sin pareja no raisea flop; TT underpair tampoco polariza así.',
          options: [
            { id: 'a', cards: ['As', 'Kh'], label: 'AKo', correct: false,
              eliminated: 'Defiende BB, pero sin pareja/draw en J72: hace call o fold, no check-raise por value. El raise 3× exige equity fuerte; este combo no justifica ese sizing.' },
            { id: 'b', cards: ['Tc', 'Td'], label: 'TT', correct: false,
              eliminated: 'Underpair jugable en call: no check-raisea flop polar sin set ni equity clara. El raise 3× exige equity fuerte; este combo no justifica ese sizing.' },
            { id: 'c', cards: ['Jh', 'Js'], label: 'JJ', correct: true }
          ]
        }
      }),
      LQ('r05-04', 'BB', ['Td', 'Th'], ['Ah', '9c', '4d', '2s', '7h'], 76404, {
        villainPos: 'CO', facingBet: true, trapTag: 'dominated',
        lineStory: [
          { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Ah 9c 4d — BB check → CO c-bet 33% pot → BB call' },
          { street: 'Turn', text: '2s — check-check' },
          { street: 'River', text: '7h — BB check → CO bet 66% pot' }
        ],
        teachBack: 'C-bet flop + check turn + bet river: típico Ax thin. KK suele seguir metiendo turn; QJo sin as no cobra river así.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Ad', 'Js'],
          teachBack: 'AJo: c-bet A-high y river thin tras check turn. KK betearía turn a menudo; QJo sin as no es cobro natural en river.',
          options: [
            { id: 'a', cards: ['Ad', 'Js'], label: 'AJo', correct: true },
            { id: 'b', cards: ['Kc', 'Kh'], label: 'KK', correct: false,
              eliminated: 'Open + c-bet OK, pero en A-high suele betear turn también (o checkear river): check-turn + bet-river encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'c', cards: ['Qs', 'Jd'], label: 'QJo', correct: false,
              eliminated: 'Puede abrir CO y c-bet aire, pero sin as: tras check turn el river bet no es value creíble. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' }
          ]
        }
      }),
      LQ('r05-05', 'BB', ['9h', '9c'], ['Qd', 'Jc', '2h', '5s', '8c'], 76405, {
        villainPos: 'BTN', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Qd Jc 2h — check-check' },
          { street: 'Turn', text: '5s — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: '8c — BB check → BTN bet 66% pot' }
        ],
        teachBack: 'Delayed barrel en Q-high: Qx value. AA betearía flop; JTs con segunda pareja suele elegir otra línea (bet flop o check river).',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Qs', 'Td'],
          teachBack: 'QTo: delayed value limpio. AA no checkea flop Q-high; JTs no encaja tan bien en turn+river bet tras check-check.',
          options: [
            { id: 'a', cards: ['Ac', 'Ah'], label: 'AA', correct: false,
              eliminated: 'Premium: en Q-high casi siempre c-betea flop. El check-check la saca del rango. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'b', cards: ['Qs', 'Td'], label: 'QTo', correct: true },
            { id: 'c', cards: ['Jh', 'Ts'], label: 'JTs', correct: false,
              eliminated: 'Open OK; con Jx a menudo betea flop o checkea river — delayed double barrel no es su historia limpia. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' }
          ]
        }
      }),
      LQ('r05-06', 'BTN', ['Kd', 'Jh'], ['As', 'Kh', '7c', '4h', '2d'], 76406, {
        villainPos: 'BB', facingBet: true, trapTag: 'fancy_play',
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'As Kh 7c — BB check → BTN c-bet 33% pot → BB call' },
          { street: 'Turn', text: '4h — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: '2d — BB overbet 125% pot (tú decides)' }
        ],
        teachBack: 'Float dos calles + bet grande river: polar (dos pares/fuertes). QQ con overpair suele raisear antes; QJs sin showdown fuerte no mete river grande.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Ah', '7s'],
          teachBack: 'A7s (dos pares) explica el float y la presión river. QQ raisearía más pronto; QJs no apuesta river grande sin equity.',
          options: [
            { id: 'a', cards: ['Qc', 'Qd'], label: 'QQ', correct: false,
              eliminated: 'Defiende y puede call flop, pero con overpair suele raisear flop/turn: float pasivo + bet grande river es raro. El overbet river (125% pot) pide polarización: nuts o farol, no value medio.' },
            { id: 'b', cards: ['Qs', 'Js'], label: 'QJs', correct: false,
              eliminated: 'Call BB OK; float flop posible, pero en AsKh7 sin draw fuerte no mete bet grande de river. El overbet river (125% pot) pide polarización: nuts o farol, no value medio.' },
            { id: 'c', cards: ['Ah', '7s'], label: 'A7s', correct: true }
          ]
        }
      }),
      LQ('r05-07', 'BB', ['Qc', 'Jd'], ['Th', '9c', '2d', '3s', 'Kd'], 76407, {
        villainPos: 'HJ', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'HJ open 2,2 bb → BB call' },
          { street: 'Flop', text: 'Th 9c 2d — BB check → HJ c-bet 33% pot → BB call' },
          { street: 'Turn', text: '3s — check-check' },
          { street: 'River', text: 'Kd — BB check → HJ bet 66% pot' }
        ],
        teachBack: 'C-bet flop + check turn + bet river tras K: Ax/scare card. QQ suele betear turn; 88 underpair no cobra river así.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Ad', 'Ts'],
          teachBack: 'ATo: c-bet + river cuando llega K. QQ betearía turn a menudo; 88 no es value de river en esa línea.',
          options: [
            { id: 'a', cards: ['Ad', 'Ts'], label: 'ATo', correct: true },
            { id: 'b', cards: ['Qs', 'Qh'], label: 'QQ', correct: false,
              eliminated: 'Overpair: tras c-bet flop suele seguir en turn. Check-turn + bet-river al K encaja peor. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'c', cards: ['8h', '8s'], label: '88', correct: false,
              eliminated: 'Abre HJ y puede c-bet, pero underpair tras check turn no apuesta river por valor en K-high. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' }
          ]
        }
      }),
      LQ('r05-08', 'BB', ['As', 'Js'], ['8h', '7d', '2c', 'Jh', '9s'], 76408, {
        villainPos: 'BTN', facingBet: true, trapTag: 'dominated',
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: '8h 7d 2c — BB check → BTN c-bet 33% pot → BB call' },
          { street: 'Turn', text: 'Jh — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: '9s — BB check → BTN bet 66% pot' }
        ],
        teachBack: 'Triple barrel en board drawy: overpairs. 66 pot-controla turn; AKo aire no barrela J y 9 por valor.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Qh', 'Qs'],
          teachBack: 'QQ overpair: triple barrel limpio. 66 se queda atrás en turn; AKo sin pareja no es value de tres calles.',
          options: [
            { id: 'a', cards: ['6c', '6d'], label: '66', correct: false,
              eliminated: 'Open + c-bet flop posible, pero underpair en board drawy: pot-control turn, no triple barrel.' },
            { id: 'b', cards: ['Ac', 'Kd'], label: 'AKo', correct: false,
              eliminated: 'Open OK y c-bet aire, pero barrel turn J y river 9 sin pareja no es value: suele checkear river. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' },
            { id: 'c', cards: ['Qh', 'Qs'], label: 'QQ', correct: true }
          ]
        }
      }),
      LQ('r05-09', 'BTN', ['Th', 'Td'], ['9s', '8c', '2h', 'Ad', '4c'], 76409, {
        villainPos: 'BB', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: '9s 8c 2h — BB donk 50% pot → BTN call' },
          { street: 'Turn', text: 'Ad — BB bet 66% pot → BTN call' },
          { street: 'River', text: '4c — BB bet 66% pot' }
        ],
        teachBack: 'Donk flop + presión: 9x/sets. KQo y ATs defienden BB, pero no donkean 982 sin conexión.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['9h', '9d'],
          teachBack: '99 (set) explica el donk. KQo y ATs check-callearian; no lideran ese flop.',
          options: [
            { id: 'a', cards: ['Kh', 'Qd'], label: 'KQo', correct: false,
              eliminated: 'Defiende BB, pero sin 9/8/draw en 982: check-call, no donk flop por value. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' },
            { id: 'b', cards: ['9h', '9d'], label: '99', correct: true },
            { id: 'c', cards: ['Ac', 'Ts'], label: 'ATs', correct: false,
              eliminated: 'Call BB estándar; en 982 sin pareja suele checkear flop, no donkear y meter tres calles. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' }
          ]
        }
      }),
      LQ('r05-10', 'BB', ['Kh', 'Td'], ['Kc', '6s', '3d', '2h', 'Qd'], 76410, {
        villainPos: 'CO', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'CO open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Kc 6s 3d — check-check' },
          { street: 'Turn', text: '2h — BB check → CO bet 66% pot → BB call' },
          { street: 'River', text: 'Qd — BB check → CO bet 66% pot' }
        ],
        teachBack: 'Check flop + delayed barrel: Kx. AA betearía flop; AJo sin K suele no doblar barrel tras check-check.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Kd', 'Js'],
          teachBack: 'KJo: delayed value. AA no checkea flop K-high; AJo sin rey no encaja en turn+river bet.',
          options: [
            { id: 'a', cards: ['Ah', 'Ac'], label: 'AA', correct: false,
              eliminated: 'En K-high seco casi siempre c-betea flop: el check-check elimina el premium. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'b', cards: ['As', 'Jd'], label: 'AJo', correct: false,
              eliminated: 'Open CO OK; sin K, tras check-check flop el delayed barrel turn+river es farol poco natural. Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.' },
            { id: 'c', cards: ['Kd', 'Js'], label: 'KJo', correct: true }
          ]
        }
      }),
      LQ('r05-11', 'BB', ['Ad', '8d'], ['7h', '6c', '2s', 'Td', 'Kc'], 76411, {
        villainPos: 'BTN', facingBet: true, trapTag: 'fancy_play',
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: '7h 6c 2s — BB check → BTN c-bet 33% pot → BB call' },
          { street: 'Turn', text: 'Td — BB check → BTN bet 66% pot → BB call' },
          { street: 'River', text: 'Kc — BB check → BTN bet 66% pot' }
        ],
        teachBack: 'Triple barrel en board bajo: overpairs. 55 pot-controla; KQo aire suele parar en turn.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Ah', 'Ac'],
          teachBack: 'AA: presión limpia. 55 no barrela tres calles; KQo abandona antes del river.',
          options: [
            { id: 'a', cards: ['Ah', 'Ac'], label: 'AA', correct: true },
            { id: 'b', cards: ['5s', '5c'], label: '55', correct: false,
              eliminated: 'Open + c-bet flop posible, pero underpair: pot-control turn — no triple barrel value.' },
            { id: 'c', cards: ['Kh', 'Qh'], label: 'KQo', correct: false,
              eliminated: 'Open late y c-bet aire OK, pero barrel turn T y seguir river es farol largo: suele checkear turn. El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.' }
          ]
        }
      }),
      LQ('r05-12', 'BTN', ['Qh', 'Qs'], ['Jd', 'Tc', '3h', '2s', '8d'], 76412, {
        villainPos: 'BB', facingBet: true,
        lineStory: [
          { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
          { street: 'Flop', text: 'Jd Tc 3h — BB check → BTN c-bet 33% pot → BB raise 3× → BTN call' },
          { street: 'Turn', text: '2s — BB bet 66% pot → BTN call' },
          { street: 'River', text: '8d — BB bet 66% pot' }
        ],
        teachBack: 'Raise flop JT3 + barrels: polar (dos pares/straight). AKo y 88 defienden, pero no raisean ese flop por value.',
        quiz: {
          prompt: '¿Qué crees que tiene el villano?',
          answerCards: ['Jh', 'Th'],
          teachBack: 'JTs (dos pares) es value del raise. AKo sin conexión raisea poco; 88 underpair tampoco polariza flop.',
          options: [
            { id: 'a', cards: ['Ac', 'Kd'], label: 'AKo', correct: false,
              eliminated: 'Call BB frecuente, pero en JT3 sin pareja/draw fuerte: call o fold, no raise polar de flop. El raise 3× exige equity fuerte; este combo no justifica ese sizing.' },
            { id: 'b', cards: ['8h', '8c'], label: '88', correct: false,
              eliminated: 'Underpair defendible en call: rara vez raisea flop sin set ni draw claro. El raise 3× exige equity fuerte; este combo no justifica ese sizing.' },
            { id: 'c', cards: ['Jh', 'Th'], label: 'JTs', correct: true }
          ]
        }
      })
    ];
  })();

  PACKS['R-06'] = [
    Fl('r06-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 76501, 'Nodo c-bet flop IP seco: mix alto de bet (~70 %). Hoy apuestas — es una muestra del mix, no “siempre”.'),
    Fl('r06-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 76502, 'Nodo wet: más check. Elegir check no es indecisión; es la frecuencia del nodo.', { trapTag: 'fancy_play' }),
    Fl('r06-03', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 76503, 'OOP A-high paired: c-bet frecuente posible. Frecuencia ≠ 100 %.'),
    Fl('r06-04', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 76504, 'OOP wet: más check. El chart a veces checkea — no tiltees.', { trapTag: 'fancy_play' }),
    Fl('r06-05', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 76505, 'Top pair seco IP: bet value frecuente. Nodo “cobrar”.'),
    Fl('r06-06', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 76506, 'Underpair A-high: más check. Mix, no autocbet spew.', { trapTag: 'fancy_play' }),
    Fl('r06-07', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 76507, 'J-high seco IP: c-bet pequeño frecuente. Frecuencia alta ≠ sizing grande.'),
    Fl('r06-08', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 76508, 'Conectado: más check/pot control. Nodo distinto al seco.', { trapTag: 'fancy_play' }),
    Fl('r06-09', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 76509, 'Air + backdoors seco: c-bet ligero mix. A veces check — válido.'),
    Fl('r06-10', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 76510, 'Muy conectado: no lo trates como nodo seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('r06-11', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 76511, 'K-high seco IP: c-bet pequeño frecuente. Ejecuta una acción del mix.'),
    Fl('r06-12', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 76512, 'Fallaste flop OOP: check frecuente. “Siempre c-bet porque abrí” ignora el nodo.')
  ];

  /* —— Pro Cash —— */
  PACKS['C-26'] = [
    F3('c26-01', 'BTN_vs_BB', ['Jh', 'Jd'], 77001, 'JJ vs 3-bet: 4-bet value. Capa siguiente al 3-bet — quieres bote o stack.', cash({ scenario: 'face3bet' })),
    F3('c26-02', 'BTN_vs_BB', ['9h', '4c'], 77002, '94o vs 3-bet: fold. No hay 4-bet farol con basura.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-03', 'BTN_vs_BB', ['Ac', '9c'], 77003, 'A9s vs 3-bet: 4-bet farol mixto. Blocker de as; no es value como AA.', cash({ scenario: 'face3bet' })),
    F3('c26-04', 'UTG_vs_BB', ['Ah', 'Td'], 77004, 'ATo UTG vs 3-bet: fold. Cold/OOP: más tight. No hero-call.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-05', 'BTN_vs_BB', ['Ad', 'Kd'], 77005, 'AKs: 4-bet value. Premium.', cash({ scenario: 'face3bet' })),
    F3('c26-06', 'CO_vs_BB', ['Qd', 'Jh'], 77006, 'QJo vs 3-bet: fold frecuente. Offsuit sin blocker claro ≠ 4-bet.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-07', 'BTN_vs_SB', ['Ts', 'Td'], 77007, 'TT BTN vs 3-bet: 4-bet o call value. Premium en posición.', cash({ scenario: 'face3bet' })),
    F3('c26-08', 'HJ_vs_BB', ['6s', '6c'], 77008, '66 HJ vs 3-bet: call frecuente, no 4-bet auto. Par media ≠ KK.', cash({ scenario: 'face3bet' })),
    F3('c26-09', 'BTN_vs_BB', ['Ah', '4h'], 77009, 'A4s: 4-bet polar/farol mixto. Misma familia que A5s.', cash({ scenario: 'face3bet' })),
    F3('c26-10', 'CO_vs_BB', ['6d', '5d'], 77010, '65s CO vs 3-bet: call frecuente IP. No 4-bet spew ni hero-fold.', cash({ scenario: 'face3bet' })),
    F3('c26-11', 'BTN_vs_BB', ['Js', '9h'], 77011, 'J9o vs 3-bet: fold. Cold 4-bet pide aún más tightness — esto ni entra.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-12', 'BTN_vs_BB', ['Kc', 'Ks'], 77012, 'KK vs 3-bet: 4-bet value frecuente. Par fuerte — bote grande.', cash({ scenario: 'face3bet' }))
  ];

  /* C-27: SRP OOP deep. Se juega flop→river; la decisión clave es check-call vs check-raise. */
  function xcCfg() {
    return cash({ scenario: 'rfi', practiceStreet: 'flop', schoolDecisionEnd: false, stackDepth: 'bb100' });
  }
  function xcScript(heroPos, villainPos) {
    return {
      heroPos: heroPos,
      villainPos: villainPos,
      actions: [
        { pos: heroPos, street: 'flop', action: 'call' },
        { pos: heroPos, street: 'turn', action: 'check' },
        { pos: villainPos, street: 'turn', action: 'bet' },
        { pos: heroPos, street: 'turn', action: 'call' },
        { pos: heroPos, street: 'river', action: 'check' },
        { pos: villainPos, street: 'river', action: 'bet' }
      ]
    };
  }
  function XC(id, cards, board, seed, tb, extra) {
    extra = extra || {};
    var heroPos = extra.heroPos || 'BB';
    var villainPos = extra.villainPos || 'BTN';
    var spot = flop(id, heroPos, cards, board, seed, {
      street: 'flop',
      facingBet: true,
      villainPos: villainPos,
      villainCards: extra.villainCards || null,
      teachBack: tb,
      trapTag: extra.trapTag || 'none',
      playConfig: Object.assign({}, xcCfg(), extra.playConfig || {})
    });
    spot.forceScript = extra.forceScript !== undefined ? extra.forceScript : xcScript(heroPos, villainPos);
    return spot;
  }

  PACKS['C-27'] = [
    XC('c27-01', ['9s', '9c'], ['Kh', '7d', '2c', '3s', '5h'], 77101,
      '99 OOP en K-high: check-call, no check-raise. Controlas el bote deep y reevalúas turn y river.',
      { villainCards: ['As', 'Kd'] }),
    XC('c27-02', ['Qs', 'Qd'], ['Kh', '9c', '3d', '2s', '6h'], 77102,
      'QQ OOP en K-high: check-call. No hinches deep sin plan; el raise pide value polar o farol con historia.',
      { villainCards: ['Ac', 'Ks'] }),
    XC('c27-03', ['7h', '7s'], ['Kd', '7c', '2d', '3h', '8c'], 77103,
      'Set de sietes: check-raise polar de value. Quieres stack o que el agresor se defienda mal.',
      { villainCards: ['Ah', 'Kc'] }),
    XC('c27-04', ['Qh', 'Jd'], ['Ks', '7d', '2h', '3c', '5s'], 77104,
      'QJo sin pareja: no es check-raise. Fold o check-call mixto; raise sin historia es spew.',
      { trapTag: 'fancy_play', villainCards: ['Ad', 'Kh'] }),
    XC('c27-05', ['Ah', 'Qd'], ['As', '8h', '3c', '2d', '6s'], 77105,
      'Top pair A-high: check-call / pot control. Value sin hinchar; reevalúa barrels en turn y river.',
      { villainCards: ['Kd', 'Td'] }),
    XC('c27-06', ['2s', '2c'], ['Ah', '7d', '2h', '3c', '5d'], 77106,
      'Set de doses: check-raise de value. Polariza: fuerte vs faroles elegidos, no medias.',
      { villainCards: ['Ac', 'Ks'] }),
    XC('c27-07', ['Td', 'Tc'], ['Ad', '7h', '2c', '3s', '5h'], 77107,
      'TT underpair OOP A-high: check-call o check-fold. No bluff-raise deep.',
      { villainCards: ['As', 'Kh'] }),
    XC('c27-08', ['As', '5s'], ['9s', '8s', '2h', '3c', '7d'], 77108,
      'Draw de color nuez: check-call frecuente; check-raise solo como semi-farol selectivo. Si continúan, tienes plan de turn y river.',
      { villainCards: ['Kd', 'Qd'] }),
    XC('c27-09', ['Jc', 'Tc'], ['Ah', '7h', '2h', '3d', '5s'], 77109,
      'Monotone sin color: check-call/fold frecuente. No check-raiseas sin flush ni historia.',
      { trapTag: 'fancy_play', villainCards: ['As', 'Kd'] }),
    XC('c27-10', ['8h', '7h'], ['Qd', 'Jc', '2s', '3d', '5c'], 77110,
      'Air OOP en QJ: check-fold, no check-raise. Check-call se construye con showdown, no con aire.',
      { trapTag: 'fancy_play', villainCards: ['Ah', 'Kd'] }),
    XC('c27-11', ['Ad', '5d'], ['Ks', '4c', '4h', '2s', '8c'], 77111,
      'A-high en paired: check-call mixto. Plan: pot control; no conviertas medias en raise polar.',
      { villainCards: ['Kh', 'Qh'] }),
    XC('c27-12', ['5s', '5c'], ['5d', '2h', '2s', '9c', '7h'], 77112,
      'Full house en paired bajo: check-raise value. Rango polar — quieres que paguen o se equivoquen.',
      { villainCards: ['Ah', 'Kd'] })
  ];

  PACKS['C-28'] = [
    Fl('c28-01', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77201, 'Vs fish: top pair A-high — c-bet value. Cobra más fino; el fish paga de más.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-02', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 77202, 'Vs reg en K-high air: no farol loco. Check más; el reg defiende. Población > GTO ciego.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    Fl('c28-03', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77203, 'Vs fish K72: c-bet. El recreacional foldea mal y paga peor — value/continuación.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-04', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77204, 'Vs reg en wet: no autocbet grande. El reg castiga líneas flojas.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-05', 'BB_vs_BTN', ['Ks', 'Qs'], 77205, 'Vs fish steal: 3-bet value KQs. Cobra; el fish paga 3-bets de más.', cash({ scenario: '3bet', villainLevel: 'fish' })),
    V('c28-06', 'BB_vs_BTN', ['Td', '6s'], 77206, 'Vs reg T6o: fold. No hero-defend vs quien defiende bien.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    Fl('c28-07', 'BTN', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 77207, 'QQ vs fish en K-high: bet/value. Thin vs recreacional OK; vs reg más check-call.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c28-08', 'BB_vs_BTN', ['7d', '5c'], 77208, '75o vs cualquiera: fold. Explotar no es spew.', cash({ scenario: '3bet', villainLevel: 'fish' }), 'dominated'),
    Fl('c28-09', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77209, 'Vs fish A-high: c-bet ligero. El fish se tira de más a c-bets pequeños.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    F3('c28-10', 'BTN_vs_BB', ['Ah', 'Td'], 77210, 'ATo vs 3-bet de reg: fold OOP/borde. Vs fish a veces call; vs reg suelta el thin.', cash({ scenario: 'face3bet', villainLevel: 'pro' }), 'dominated'),
    Fl('c28-11', 'CO', ['Kd', 'Kh'], ['Qc', 'Jd', 'Ts'], 77211, 'KK vs reg en board wet: pot control. No thin loco vs quien defiende.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-12', 'BB_vs_BTN', ['As', 'Kd'], 77212, 'AKo vs fish steal: 3-bet value. Cobra al que paga de más.', cash({ scenario: '3bet', villainLevel: 'fish' }))
  ];

  PACKS['C-29'] = [
    Fl('c29-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77301, 'Quiz: BB caller en K72r. Bandas: poco Kx, mucho aire, alguna pareja baja. C-bet — ventaja de rango.'),
    Fl('c29-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77302, 'Quiz: 987 two-tone. Bandas: más pares, más draws, menos aire. No autocbet.', { trapTag: 'fancy_play' }),
    V('c29-03', 'BB_vs_BTN', ['Ad', 'Kd'], 77303, 'Quiz: rango BTN open = wide. AKs es value vs esa banda, no vs “tiene 72”. 3-bet.', cash({ scenario: '3bet' })),
    V('c29-04', 'BB_vs_UTG', ['Kh', 'Jd'], 77304, 'Quiz: UTG = tight. KJo no entra vs esa banda. Fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('c29-05', 'BTN_vs_BB', ['As', 'Ad'], 77305, 'Quiz: 3-bet polariza (value + farol). AA 4-bet vs la banda de value.', cash({ scenario: 'face3bet' })),
    F3('c29-06', 'BTN_vs_BB', ['Jd', '3h'], 77306, 'Quiz: J3o no está en ninguna banda post-3-bet. Fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c29-07', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77307, 'Quiz: A-high seco. Tu value (Ax) vs su aire/pares débiles. C-bet value.'),
    Fl('c29-08', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77308, 'Quiz: JT9. Bandas del caller: muchos two-pair/straight. Pot control.', { trapTag: 'fancy_play' }),
    V('c29-09', 'BB_vs_BTN', ['Ad', '5d'], 77309, 'Quiz: polar vs BTN = value (QQ+) + faroles (Axs). A5s es la banda farol.', cash({ scenario: '3bet' })),
    R('c29-10', 'UTG', ['As', '9d'], 77310, 'Quiz: RFI UTG no contiene A9o. Fold — escribe la banda tight.', cash(), 'dominated'),
    Fl('c29-11', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77311, 'Quiz: A-high seco. Caller: Ax limitado, mucho aire. C-bet ligero OK.'),
    V('c29-12', 'BB_vs_BTN', ['Td', 'Th'], 77312, 'Quiz: TT es banda value vs open late. 3-bet. No “una mano contra la suya”.', cash({ scenario: '3bet' }))
  ];

  PACKS['C-30'] = [
    Fl('c30-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77401, 'Node lock mental: flop seco IP → c-bet frecuente (~70 %). Hoy bet. No tiltees si el chart a veces checkea.'),
    Fl('c30-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77402, 'Nodo wet: más check. Ejecutar check es el mix, no cobardía.', { trapTag: 'fancy_play' }),
    Fl('c30-03', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77403, 'OOP A-paired: c-bet mix alto. Una muestra del nodo.'),
    Fl('c30-04', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77404, 'OOP wet: nodo de check. Llévalo a mesa: “aquí cedo más”.', { trapTag: 'fancy_play' }),
    Fl('c30-05', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77405, 'Nodo value c-bet IP. Bet. Frecuencia alta de cobro.'),
    Fl('c30-06', 'BTN', ['3h', '3c'], ['As', 'Td', '6c'], 77406, 'Nodo underpair A-high: más check. No “siempre c-bet porque abrí”.', { trapTag: 'fancy_play' }),
    Fl('c30-07', 'CO', ['Kd', 'Qd'], ['Jh', '7c', '2s'], 77407, 'J-high seco: c-bet pequeño frecuente. Lock: sizing pequeño, no 75 % siempre.'),
    Fl('c30-08', 'BTN', ['Jc', '9c'], ['Ts', '8h', '7d'], 77408, 'Nodo conectado ≠ nodo seco. Selectivo.', { trapTag: 'fancy_play' }),
    Fl('c30-09', 'BTN', ['Ah', 'Jd'], ['Kd', '8c', '3h'], 77409, 'K-high seco IP: bet frecuente. Habitúa la frase “~70 % bet”.'),
    Fl('c30-10', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 77410, 'Air OOP: check. Nodo de cesión.'),
    Fl('c30-11', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77411, 'Air + backdoors seco: c-bet ligero mix. A veces check — válido.'),
    Fl('c30-12', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77412, 'Conectado OOP-ish: pot control. Node lock: no copies el mix del seco.', { trapTag: 'fancy_play' })
  ];

  PACKS['C-31'] = [
    F3('c31-01', 'BTN_vs_BB', ['Qs', 'Qd'], 77501, 'Examen Pro: QQ vs 3-bet — 4-bet value.', cash({ scenario: 'face3bet' })),
    F3('c31-02', 'BTN_vs_BB', ['Tc', '4d'], 77502, 'T4o vs 3-bet: fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c31-03', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77503, 'SRP OOP wet: check. Pot control deep.', { trapTag: 'fancy_play' }),
    Fl('c31-04', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77504, 'Vs fish: c-bet value top pair.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c31-05', 'BB_vs_UTG', ['Kh', 'Jd'], 77505, 'Range quiz: KJo vs UTG fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    Fl('c31-06', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77506, 'Node lock: seco IP c-bet frecuente.'),
    F3('c31-07', 'BTN_vs_BB', ['Ad', '5d'], 77507, 'A5s 4-bet polar mixto.', cash({ scenario: 'face3bet' })),
    Fl('c31-08', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77508, 'OOP A-paired: c-bet razonable.'),
    V('c31-09', 'BB_vs_BTN', ['8h', '5d'], 77509, 'Vs reg 85o: fold. Explotación.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    V('c31-10', 'BB_vs_BTN', ['Jh', 'Jd'], 77510, 'JJ vs BTN: 3-bet value. Bandas de rango.', cash({ scenario: '3bet' })),
    Fl('c31-11', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77511, 'Wet: no autocbet. Frecuencias.', { trapTag: 'fancy_play' }),
    F3('c31-12', 'BTN_vs_BB', ['Ah', 'Kd'], 77512, 'AKo 4-bet value. Checklist Pro cerrado.', cash({ scenario: 'face3bet' }))
  ];

  /* —— Rangos: Range Advantage (R-30…R-33) —— */
  function raSpot(id, seed, line, board, options, correctId, teach, trap) {
    return {
      id: id,
      kind: 'rangeAdvQuiz',
      seed: seed,
      heroPos: (line.split(/\s+/)[0]) || 'BTN',
      teachBack: teach || '',
      trapTag: trap || undefined,
      quiz: {
        prompt: '¿Quién tiene range advantage en este flop?',
        line: line,
        board: board,
        options: options,
        correctId: correctId
      }
    };
  }
  function raOpts(a, b, c) {
    var opts = [
      { id: 'a', label: a },
      { id: 'b', label: b }
    ];
    if (c) opts.push({ id: 'c', label: c });
    return opts;
  }

  PACKS['R-30'] = [
    raSpot('r30-01', 83001, 'UTG open → BB call', ['As', 'Kd', 'Qc'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'UTG vs BB en AKQ rainbow: UTG tiene muchísimo range advantage (AA/KK/QQ/AK/AQ/KQ). Más c-bet, sizing pequeño.'),
    raSpot('r30-02', 83002, 'UTG open → BB call', ['Ah', '8d', '3c'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'A-high seco: el rango UTG concentra Ax y premiums; el BB falla a menudo. Ventaja clara del agresor.'),
    raSpot('r30-03', 83003, 'BTN open → BB call', ['Ks', '7d', '2c'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'a',
      'K72 rainbow: el BB wide conecta poco Kx; el BTN mantiene Ax/Kx/overpairs. Ventaja del opener.'),
    raSpot('r30-04', 83004, 'CO open → BB call', ['As', 'Kh', '2d'],
      raOpts('CO', 'BB', 'Ninguno claro'), 'a',
      'AK seco: el open CO/UTG-like tiene muchos Ax/Kx fuertes. BB defiende wide y falla mucho.'),
    raSpot('r30-05', 83005, 'HJ open → BB call', ['Qs', 'Qd', '3c'],
      raOpts('HJ', 'BB', 'Ninguno claro'), 'a',
      'Q paired seco: el agresor early-ish tiene más QQ+/AQ. Ventaja del opener.'),
    raSpot('r30-06', 83006, 'UTG open → BB call', ['Kd', 'Jh', '2s'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'KJ seco: UTG llega con KQ/KJ/AJ+/overpairs; BB wide no. Ventaja UTG.'),
    raSpot('r30-07', 83007, 'BTN open → BB call', ['Ad', '6c', '2s'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'a',
      'A-high seco IP: patrón clásico de ventaja del agresor → c-bet pequeño frecuente.'),
    raSpot('r30-08', 83008, 'UTG open → BB call', ['As', 'Kc', 'Td'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'AKT rainbow: casi tan favorable a UTG como AKQ. Premiums y broadway densos en el open early.'),
    raSpot('r30-09', 83009, 'CO open → BB call', ['Kh', '9c', '3d'],
      raOpts('CO', 'BB', 'Ninguno claro'), 'a',
      'K-high seco: el caller falla; el CO mantiene ventaja de rango.'),
    raSpot('r30-10', 83010, 'UTG open → BB call', ['Ah', 'Qd', '4c'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'AQ seco: misma lógica que AKQ a menor escala. UTG gana el board.'),
    raSpot('r30-11', 83011, 'BTN open → BB call', ['Kc', '4h', '4d'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'a',
      'K-high paired seco: sigue favoreciendo al opener (Kx/overpairs) vs BB wide.'),
    raSpot('r30-12', 83012, 'HJ open → BB call', ['As', 'Jd', '3h'],
      raOpts('HJ', 'BB', 'Ninguno claro'), 'a',
      'AJ seco: el open HJ/UTG-like concentra Ax fuertes. Ventaja del agresor.')
  ];

  PACKS['R-31'] = [
    raSpot('r31-01', 83101, 'BTN open → BB call', ['9s', '8s', '7h'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'c',
      '987 two-tone: el BB conecta pares, draws y dos pares. La ventaja del BTN se reduce o se invierte — no autocbet.',
      'fancy_play'),
    raSpot('r31-02', 83102, 'BTN open → BB call', ['6d', '5c', '4h'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'c',
      'Bajos conectados: el rango de defensa (SC, pares bajos) encaja mucho mejor que el open wide.',
      'fancy_play'),
    raSpot('r31-03', 83103, 'BTN open → BB call', ['As', '8d', '3c'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'a',
      'Contraste: A-high seco en el mismo spot — el agresor recupera ventaja clara.'),
    raSpot('r31-04', 83104, 'CO open → BB call', ['Jh', 'Ts', '9d'],
      raOpts('CO', 'BB', 'Ninguno claro / BB recupera'), 'c',
      'JT9: broadway media y connectors del BB conectan fuerte. Ventaja del opener se diluye.',
      'fancy_play'),
    raSpot('r31-05', 83105, 'BTN open → BB call', ['8s', '7s', '6h'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'b',
      '876 two-tone: el BB wide suele tener más equity hecha/draws que el BTN. Caller favorece.',
      'fancy_play'),
    raSpot('r31-06', 83106, 'HJ open → BB call', ['Kd', '7c', '2s'],
      raOpts('HJ', 'BB', 'Ninguno claro / BB recupera'), 'a',
      'K72 seco: aunque el HJ no es UTG, el board seco alto sigue favoreciendo al agresor.'),
    raSpot('r31-07', 83107, 'BTN open → BB call', ['5h', '4h', '3d'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'b',
      '543 two-tone bajo: típico board de defensa. El BB recupera — reduce c-bet.',
      'fancy_play'),
    raSpot('r31-08', 83108, 'CO open → BB call', ['Qc', 'Jd', 'Ts'],
      raOpts('CO', 'BB', 'Ninguno claro / BB recupera'), 'c',
      'QJT: ambos conectan, pero el BB wide gana mucho con connectors/broadway. Ventaja poco clara o del caller.',
      'fancy_play'),
    raSpot('r31-09', 83109, 'BTN open → BB call', ['Ah', 'Kd', '2c'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'a',
      'AK seco: vuelve la ventaja del opener. Misma línea, textura distinta → respuesta distinta.'),
    raSpot('r31-10', 83110, 'UTG open → BB call', ['9c', '8h', '7d'],
      raOpts('UTG', 'BB', 'Ninguno claro / BB recupera'), 'c',
      'Incluso UTG pierde brillo en 987: el BB aún conecta más relative. No es AKQ.',
      'fancy_play'),
    raSpot('r31-11', 83111, 'BTN open → BB call', ['Th', '7s', '2d'],
      raOpts('BTN', 'BB', 'Ninguno claro / BB recupera'), 'a',
      'T-high seco: el BB falla bastante; el BTN mantiene ventaja moderada.'),
    raSpot('r31-12', 83112, 'CO open → BB call', ['7s', '6s', '5h'],
      raOpts('CO', 'BB', 'Ninguno claro / BB recupera'), 'b',
      '765 two-tone: board de caller. Cede frecuencia; no “abrí → bet”.',
      'fancy_play')
  ];

  PACKS['R-32'] = [
    raSpot('r32-01', 83201, 'BTN open → BB 3-bet → BTN call', ['As', '7d', '2c'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'a',
      '3BP A-high seco: el 3-bettor tiene AA/AK/AQ densos; el caller está capped. Range + nut advantage del BB.'),
    raSpot('r32-02', 83202, 'BTN open → BB 3-bet → BTN call', ['8s', '7s', '6h'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'b',
      '3BP 876: el caller conecta más sets/two-pair/draws. La ventaja del 3-bettor se invierte o se esfuma.',
      'fancy_play'),
    raSpot('r32-03', 83203, 'CO open → BTN 3-bet → CO call', ['Ah', 'Kd', '3c'],
      raOpts('BTN (3-bettor)', 'CO (caller)', 'Ninguno claro'), 'a',
      'AK seco en 3BP: el 3-bettor IP concentra premiums. Ventaja clara del agresor postflop.'),
    raSpot('r32-04', 83204, 'BTN open → BB call (SRP)', ['Qs', '8s', '3s'],
      raOpts('BTN (más nuts de color)', 'BB (más flushes medios)', 'Empate total'), 'a',
      'Monotone: nut advantage suele ir al opener (más Axs/Kxs del palo). El BB tiene más flushes medios — no es lo mismo.',
      'fancy_play'),
    raSpot('r32-05', 83205, 'UTG open → BB call', ['As', 'Kh', 'Qc'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'SRP AKQ: repaso — UTG sigue con ventaja enorme aunque ya sepas 3BP. Roles importan.'),
    raSpot('r32-06', 83206, 'SB open → BB call', ['9h', '8d', '7c'],
      raOpts('SB (opener)', 'BB (caller)', 'Ninguno claro'), 'b',
      'SRP OOP en conectados: el BB caller favorece el board; el SB no autocbetea solo por iniciativa.',
      'fancy_play'),
    raSpot('r32-07', 83207, 'BTN open → BB 3-bet → BTN call', ['Kd', '7c', '2s'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'a',
      '3BP K-high seco: el 3-bettor gana (más KQ+/KK/AA). Caller capped.'),
    raSpot('r32-08', 83208, 'HJ open → BB 3-bet → HJ call', ['6c', '5h', '4d'],
      raOpts('BB (3-bettor)', 'HJ (caller)', 'Ninguno claro'), 'b',
      '3BP bajos: el caller relativa captura mejor. Check más del 3-bettor OOP.',
      'fancy_play'),
    raSpot('r32-09', 83209, 'BTN open → BB 3-bet → BTN call', ['Ah', 'Ad', '6c'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'a',
      'A paired en 3BP: nut/range advantage fuerte del 3-bettor (más Ax/AA).'),
    raSpot('r32-10', 83210, 'CO open → BTN call (SRP)', ['Jh', 'Ts', '9d'],
      raOpts('CO', 'BTN', 'Ninguno claro / BTN recupera'), 'c',
      'JT9 SRP: el caller BTN (más wide que CO) recupera mucho. Ventaja poco clara.',
      'fancy_play'),
    raSpot('r32-11', 83211, 'BB 3-bet vs BTN → flop', ['Qs', 'Jd', '2h'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'a',
      'QJ seco 3BP: el 3-bettor sigue adelante (AQ+/QQ+/KJ+ densos vs rango capped).'),
    raSpot('r32-12', 83212, 'BTN open → BB 3-bet → BTN call', ['7s', '6s', '2s'],
      raOpts('BB (más nuts posibles)', 'BTN (más flushes/medios)', 'Solo el caller'), 'a',
      'Monotone bajo en 3BP: el 3-bettor guarda más nuts (Axs); el caller tiene densidad de flushes medios. Nut ≠ range medio.',
      'fancy_play')
  ];

  PACKS['R-33'] = [
    raSpot('r33-01', 83301, 'CO open → BB call', ['Td', '9c', '8h'],
      raOpts('CO', 'BB', 'Ninguno claro'), 'c',
      'T98: value repartido. Forzar “siempre el agresor” es sesgo — respuesta honesta: ninguno claro.',
      'fancy_play'),
    raSpot('r33-02', 83302, 'UTG open → BB call', ['Ah', 'Ac', '4d'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'A paired: no es empate. UTG concentra más Ax/premiums — sigue con ventaja fuerte.'),
    raSpot('r33-03', 83303, 'BTN open → BB call', ['7s', '7h', '2d'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'c',
      '77xx bajo paired: ambos pueden tener trips vía 7x; overpairs del BTN ayudan pero el spot es ambiguo.',
      'fancy_play'),
    raSpot('r33-04', 83304, 'BTN open → BB 3-bet → BTN call', ['Qc', '8c', '3c'],
      raOpts('BB (nut advantage de color)', 'BTN (más flushes medios)', 'Empate exacto'), 'a',
      'Monotone en 3BP: nut advantage al 3-bettor (Axs/Kxs). No confundas con “el caller tiene más colores”.'),
    raSpot('r33-05', 83305, 'HJ open → BB call', ['Js', 'Tc', '9h'],
      raOpts('HJ', 'BB', 'Ninguno claro'), 'c',
      'JT9 rainbow: casi empatado. Baja frecuencia de c-bet automático.',
      'fancy_play'),
    raSpot('r33-06', 83306, 'UTG open → BB call', ['Ks', 'Kd', 'Qh'],
      raOpts('UTG', 'BB', 'Ninguno claro'), 'a',
      'KKQ: UTG destroza (KK/AA/AK/KQ). Paired alto ≠ empate.'),
    raSpot('r33-07', 83307, 'SB open → BB call', ['Jh', '8d', '8c'],
      raOpts('SB', 'BB', 'Ninguno claro'), 'c',
      'J88 OOP: trips posibles en ambos; ventaja leve o nula del opener. Pot control frecuente.',
      'fancy_play'),
    raSpot('r33-08', 83308, 'CO open → BTN 3-bet → CO call', ['9s', '8h', '7d'],
      raOpts('BTN (3-bettor)', 'CO (caller)', 'Ninguno claro'), 'b',
      '3BP conectados: el caller relativo gana el board. El 3-bettor IP aún puede betear selectivo, pero no “ventaja clara”.',
      'fancy_play'),
    raSpot('r33-09', 83309, 'BTN open → BB call', ['As', '5h', '2d'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'a',
      'A-high seco clásico: ventaja del agresor — contraste con los empates de esta lección.'),
    raSpot('r33-10', 83310, 'HJ open → CO call (SRP)', ['Qd', 'Jc', 'Th'],
      raOpts('HJ', 'CO', 'Ninguno claro'), 'c',
      'QJT entre dos rangos relativamente tight: value repartido. Ninguno claro.',
      'fancy_play'),
    raSpot('r33-11', 83311, 'BB 3-bet vs BTN', ['2s', '2h', '2d'],
      raOpts('BB (3-bettor)', 'BTN (caller)', 'Ninguno claro'), 'a',
      'Trips en mesa (quads board): rangos enteros empatan en la mesa; el 3-bettor aún gana con más Ax kickers/premiums en showdown paths — ventaja leve al polar.'),
    raSpot('r33-12', 83312, 'BTN open → BB call', ['6h', '6d', '5s'],
      raOpts('BTN', 'BB', 'Ninguno claro'), 'c',
      '66xx bajo: el BB wide tiene más 5x/6x/SC. Spot ambiguo — no autocbet al 90 %.',
      'fancy_play')
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
