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
    R('c00-01', 'BTN', ['As', 'Ah'], 70001, 'AA en el botón: open claro. En la Escuela cada mano está diseñada: aquí la respuesta es subir, no “probar suerte”.', cash()),
    R('c00-02', 'UTG', ['7c', '2d'], 70002, '72o UTG: fold. El spot te pide tirar — no hay truco. Así funciona una lección: decisión preparada, no mano aleatoria.', cash(), 'dominated'),
    R('c00-03', 'CO', ['Kd', 'Kh'], 70003, 'KK cutoff: open. Premium = subes primero el bote. Luego ves si acertaste y pasas al siguiente spot.', cash()),
    R('c00-04', 'BTN', ['9c', '2h'], 70004, '92o incluso en botón: fold. Posición no lava basura. La Escuela te evalúa solo en esta decisión.', cash(), 'dominated'),
    R('c00-05', 'UTG', ['As', 'Kd'], 70005, 'AKo UTG: open. Early también abre premiums. Lee la silla, luego las cartas, luego actúa.', cash()),
    R('c00-06', 'HJ', ['8d', '3c'], 70006, '83o hijack: fold. Si dudas, pregunta: ¿esto entra en un open de cash a 100 bb? Casi nunca.', cash(), 'fancy_play'),
    R('c00-07', 'BTN', ['Qs', 'Js'], 70007, 'QJs botón: open. Broadway suited en late es el tipo de spot “sí” que la lección quiere clavar.', cash()),
    R('c00-08', 'CO', ['Td', '4c'], 70008, 'T4o cutoff: fold. No abras “porque queda poca gente” con basura offsuit.', cash(), 'dominated'),
    R('c00-09', 'HJ', ['9s', '9c'], 70009, '99 hijack: open. Par medio fuerte — iniciativa, no limp.', cash()),
    R('c00-10', 'UTG', ['Kd', '9c'], 70010, 'K9o UTG: fold. Demasiada gente detrás. Misma mano en BTN ya sería otro debate (C-01).', cash(), 'fancy_play'),
    R('c00-11', 'CO', ['Ah', 'Qs'], 70011, 'AQs cutoff: open claro. Ax fuerte suited — construyes bote con plan.', cash()),
    R('c00-12', 'BTN', ['5h', '2d'], 70012, '52o botón: fold. El botón abre wide, no cualquier dos cartas. Apruebas al acertar el umbral; puedes repetir.', cash(), 'dominated')
  ];

  /* —— Spins —— */
  var st20 = spin({ scenario: 'steal', stackDepth: 'bb20' });
  var st25 = spin({ scenario: 'steal', stackDepth: 'bb25' });
  var pf10 = spin({ scenario: 'push', stackDepth: 'bb10' });
  var pf12 = spin({ scenario: 'push', stackDepth: 'bb12' });
  var vs20 = spin({ scenario: '3bet', stackDepth: 'bb20' });
  var vsPush = spin({ scenario: 'push', stackDepth: 'bb10' });

  PACKS['S-00'] = [
    R('s00-01', 'BTN', ['As', 'Kd'], 71001, 'AKo BTN ~20 bb: shove por valor. En Spin las fichas no son euros: un stack corto pide fold equity, no open de cash a 100 bb.', st20),
    R('s00-02', 'BTN', ['7c', '2d'], 71002, '72o: fold. Perder el stack suele ser perder la entrada. No spew “porque son solo fichas”.', st20, 'dominated'),
    R('s00-03', 'SB', ['Kh', 'Js'], 71003, 'KJs SB ~20 bb: open steal ~2,5–3 bb (no shove). 3-max: SB aún tiene al BB detrás.', st20),
    R('s00-04', 'SB', ['Qd', '8c'], 71004, 'Q8o SB: fold. En Spin 3-max no eres BTN: OOP si te pagan y el payout duele.', st20, 'fancy_play'),
    R('s00-05', 'BTN', ['9s', '9c'], 71005, '99 BTN 20 bb: shove. Par medio fuerte — quieres ciegas o doblar, no min-raise de cash.', st20),
    R('s00-06', 'BTN', ['8h', '7h'], 71006, '87s BTN: open steal ~2,5 bb. Mano media del rango: roba sin commitear todo el torneo.', st20),
    R('s00-07', 'SB', ['7c', '2h'], 71007, '72o SB: fold. Anatomía del Spin: cada error puede ser eliminación, no un pot de cash.', st20, 'dominated'),
    R('s00-08', 'BTN', ['Ah', 'Td'], 71008, 'ATo BTN ~20 bb: shove frecuente. Stack corto + fold equity; no lo trates como cash deep.', st20),
    R('s00-09', 'SB', ['As', '5s'], 71009, 'A5s SB: open steal razonable. Ax suited con plan; no es auto-shove como AA.', st20),
    R('s00-10', 'BTN', ['Jc', '3d'], 71010, 'J3o: fold. Wide de botón no es “cualquier Ax/Jx”. Fichas de torneo, no céntimos.', st20, 'fancy_play'),
    R('s00-11', 'BTN', ['Qs', 'Qd'], 71011, 'QQ ~20 bb: shove value. Premium — maximizas o fold equity o all-in con equity alta.', st20),
    R('s00-12', 'SB', ['Kh', '9c'], 71012, 'K9o SB: fold frecuente. Offsuit frágil OOP en 3-max. Recuerda: payout 2×/3×/5×, no chip EV de cash.', st20, 'dominated')
  ];

  PACKS['S-06'] = [
    R('s06-01', 'BTN', ['Kh', '9s'], 71601, 'Cover (~25 bb) BTN con K9o: steal razonable. El lead se usa para presionar ciegas, no para hero-call.', st25),
    R('s06-02', 'BTN', ['7c', '2d'], 71602, 'Aunque seas cover, 72o es fold. Presión ≠ spew: si te pagan, la mano no aguanta.', st25, 'dominated'),
    R('s06-03', 'SB', ['As', 'Ts'], 71603, 'Cover SB con ATs: open/steal. Pones al short en un spot feo; no necesitas ir all-in siempre.', st25),
    V('s06-04', 'BB_vs_BTN', ['Kc', '9d'], 71604, 'Short abre y tú eres cover con K9o: fold. No pagues light “porque tengo más fichas” — ICM suicide.', vs20, 'fancy_play'),
    V('s06-05', 'BB_vs_BTN', ['Qs', 'Qd'], 71605, 'Cover vs steal con QQ: 3-bet shove value. Aquí sí: equity alta y eliminar acerca al 1.º.', vs20),
    V('s06-06', 'BB_vs_SB', ['7c', '2h'], 71606, '72o vs steal: fold siempre. El lead no justifica basura.', vs20, 'dominated'),
    R('s06-07', 'BTN', ['8h', '7h'], 71607, 'Cover BTN 87s: steal con jugabilidad. Robas a shorts que overfoldean.', st25),
    V('s06-08', 'BB_vs_BTN', ['Ah', 'Kd'], 71608, 'AKo cover vs steal: 3-bet shove. Value claro — no es call light.', vs20),
    V('s06-09', 'BB_vs_BTN', ['Td', '8c'], 71609, 'T8o cover vs steal: fold. Chip EV dudoso y $EV peor. El lead se guarda.', vs20, 'fancy_play'),
    R('s06-10', 'SB', ['Qd', 'Td'], 71610, 'Cover SB QTs: open steal frecuente. Presión con manos que foldean mucho.', st25),
    V('s06-11', 'BB_vs_SB', ['9s', '9c'], 71611, '99 cover vs steal SB: 3-bet shove value. Par medio fuerte — no flat eterno.', vs20),
    R('s06-12', 'BTN', ['5h', '2d'], 71612, '52o cover: fold. El chip lead no convierte basura en steal.', st25, 'dominated')
  ];

  PACKS['S-07'] = [
    R('s07-01', 'BTN', ['As', 'Ts'], 71701, 'Short (~10–12 bb) BTN ATs: shove para doblarte. Vs cover elige equity + fold equity, no panic.', pf12),
    R('s07-02', 'BTN', ['7c', '2d'], 71702, 'Short con 72o: fold. Necesitas doblarte, sí; no con basura vs un cover que te elimina.', pf12, 'dominated'),
    R('s07-03', 'SB', ['Kh', 'Js'], 71703, 'Short SB KJs: shove frecuente. Broadway usable — spot para double-up, no min-raise.', pf10),
    R('s07-04', 'SB', ['Qd', '8c'], 71704, 'Q8o SB corto: fold. Panic shove OOP vs cover es el leak del short desesperado.', pf10, 'fancy_play'),
    R('s07-05', 'BTN', ['9s', '9c'], 71705, '99 short: shove value. Par medio — quieres que el cover foldee o ir a equity decente.', pf10),
    R('s07-06', 'BTN', ['As', '5s'], 71706, 'A5s BTN corto: shove frecuente. Ax suited con fold equity vs cover.', pf10),
    R('s07-07', 'SB', ['7c', '2h'], 71707, '72o SB corto: fold. Sin equity ni fold equity real.', pf10, 'dominated'),
    R('s07-08', 'BTN', ['Ah', 'Kd'], 71708, 'AKo ~12 bb: shove value. Premium vs cover — no open min.', pf12),
    R('s07-09', 'SB', ['Kh', 'Ts'], 71709, 'KTs SB corto: shove frecuente. Charts SB cortos incluyen esta broadway suited.', pf10),
    R('s07-10', 'BTN', ['Jh', 'Td'], 71710, 'JTo BTN ~12 bb: shove candidato desde botón. Late + short = fold equity.', pf12),
    R('s07-11', 'BTN', ['Qs', 'Qd'], 71711, 'QQ ~10 bb: shove. Par fuerte — all-in, no “ver flop barato”.', pf10),
    R('s07-12', 'SB', ['9d', '6c'], 71712, '96o SB corto: fold. Elige spots; no todas las manos “necesitan fichas”.', pf10, 'fancy_play')
  ];

  PACKS['S-10'] = [
    V('s10-01', 'BB_vs_BTN', ['As', 'Kd'], 72001, 'AKo vs shove/steal corto: call (o 3-bet shove). Incluso con ICM, premiums claros se pagan.', vsPush),
    V('s10-02', 'BB_vs_BTN', ['7c', '2d'], 72002, '72o vs shove: fold. Chip EV negativo e ICM peor. Overfold vs shove es el default sano en Spins.', vsPush, 'dominated'),
    V('s10-03', 'BB_vs_SB', ['Qs', 'Qd'], 72003, 'QQ vs shove SB: call. Par fuerte — chip EV y $EV suelen coincidir.', vsPush),
    V('s10-04', 'BB_vs_BTN', ['Td', '8c'], 72004, 'T8o vs shove BTN: fold. Equity insuficiente; el ICM pide aún más tightness.', vsPush, 'fancy_play'),
    V('s10-05', 'BB_vs_BTN', ['Ah', 'Ah'], 72005, 'AA vs shove: call. Nuts. ICM no convierte AA en fold.', vsPush),
    V('s10-06', 'BB_vs_SB', ['Jd', '8c'], 72006, 'J8o vs shove: fold. Dominada y OOP. Overfold, no hero-call.', vsPush, 'dominated'),
    V('s10-07', 'BB_vs_BTN', ['Kh', 'Kh'], 72007, 'KK vs shove: call. Premium — el ICM no te pide tirar reyes.', vsPush),
    V('s10-08', 'BB_vs_BTN', ['Qh', '9c'], 72008, 'Q9o vs shove BTN: fold frecuente. Flip feo + riesgo de bust = −EV $ típico.', vsPush, 'fancy_play'),
    V('s10-09', 'BB_vs_SB', ['As', 'Js'], 72009, 'AJs vs shove SB: call o 3-bet shove sólido. Ax fuerte — no overfold panic.', vsPush),
    V('s10-10', 'BB_vs_BTN', ['8h', '7d'], 72010, '87o vs shove: fold. Conectores offsuit no son precio vs all-in.', vsPush, 'dominated'),
    V('s10-11', 'BB_vs_BTN', ['9s', '9c'], 72011, '99 vs shove BTN: call frecuente. Par medio fuerte vs rango wide de botón corto.', vsPush),
    V('s10-12', 'BB_vs_SB', ['Kc', '9d'], 72012, 'K9o vs shove SB: fold frecuente. Dominada; ICM aprieta más que chip EV.', vsPush, 'fancy_play')
  ];

  PACKS['S-11'] = [
    V('s11-01', 'BB_vs_BTN', ['Td', '9c'], 72101, 'T9o vs shove: fold. Puede “verse” como precio en fichas; en $EV es un mal spot. Olor a +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-02', 'BB_vs_BTN', ['As', 'Ah'], 72102, 'AA: call. Aquí chip EV y $EV coinciden — no todos los spots son trampa.', vsPush),
    V('s11-03', 'BB_vs_SB', ['Jh', '9d'], 72103, 'J9o vs shove: fold. Pay jump: arriesgar el torneo por un flip mediocre pierde euros.', vsPush, 'dominated'),
    V('s11-04', 'BB_vs_BTN', ['Kd', 'Kh'], 72104, 'KK: call. Premium — no inventes fold ICM con reyes.', vsPush),
    V('s11-05', 'BB_vs_BTN', ['Qd', '8c'], 72105, 'Q8o vs shove: fold. El call “porque tengo outs” es el leak +EV chips / −EV $.', vsPush, 'fancy_play'),
    V('s11-06', 'BB_vs_SB', ['As', 'Kd'], 72106, 'AKo vs shove SB: call. Equity alta; este no es el mal spot.', vsPush),
    V('s11-07', 'BB_vs_BTN', ['8c', '6d'], 72107, '86o: fold. Sin historia vs shove. El pay jump manda.', vsPush, 'dominated'),
    V('s11-08', 'BB_vs_BTN', ['9s', '9c'], 72108, '99 vs shove BTN: call frecuente. Par vs rango wide — $EV suele aguantar.', vsPush),
    V('s11-09', 'BB_vs_SB', ['Kh', '8c'], 72109, 'K8o vs shove: fold. Dominada; oler −EV $ antes de pagar.', vsPush, 'fancy_play'),
    V('s11-10', 'BB_vs_BTN', ['Qs', 'Qd'], 72110, 'QQ: call. Cuando coinciden fichas y euros, paga.', vsPush),
    V('s11-11', 'BB_vs_BTN', ['7h', '2d'], 72111, '72o: fold. Ni chip EV ni $EV.', vsPush, 'dominated'),
    V('s11-12', 'BB_vs_SB', ['Ah', 'Ts'], 72112, 'ATs vs shove SB: call o continue sólido. Ax fuerte — no es el spot “malo”.', vsPush)
  ];

  var st5x = spin({ scenario: 'steal', stackDepth: 'bb20', spinPayout: '5x' });
  var vs5x = spin({ scenario: 'push', stackDepth: 'bb10', spinPayout: '5x' });
  PACKS['S-12'] = [
    R('s12-01', 'BTN', ['As', 'Kd'], 72201, 'AKo BTN 5×: shove. Premium sigue siendo shove; el 5× aprieta las manos medias, no KK/AK.', st5x),
    R('s12-02', 'BTN', ['7c', '2d'], 72202, '72o 5×: fold. Con premio gordo, spew duele más. Tight extra vs 2×/3×.', st5x, 'dominated'),
    R('s12-03', 'SB', ['Qd', '8c'], 72203, 'Q8o SB 5×: fold. En 5× el 1.º pesa: menos steals locos OOP.', st5x, 'fancy_play'),
    R('s12-04', 'BTN', ['9s', '9c'], 72204, '99 BTN 5×: shove value. Par medio fuerte sigue siendo plan shove a 20 bb.', st5x),
    V('s12-05', 'BB_vs_BTN', ['Td', '8c'], 72205, 'T8o vs shove en 5×: fold. Overfold más que en 2× — el bust te saca de un prize pool gordo.', vs5x, 'fancy_play'),
    V('s12-06', 'BB_vs_BTN', ['As', 'Ah'], 72206, 'AA 5×: call. El multiplicador no pide tirar ases.', vs5x),
    R('s12-07', 'SB', ['Kh', 'Js'], 72207, 'KJs SB 5×: open steal razonable (no shove panic). Broadway usable; 5× pide menos locura, no parálisis.', st5x),
    R('s12-08', 'BTN', ['5h', '2d'], 72208, '52o 5×: fold. En 5× el steal basura es aún peor.', st5x, 'dominated'),
    V('s12-09', 'BB_vs_SB', ['Kc', '9d'], 72209, 'K9o vs shove 5×: fold. Tight extra vs 3×.', vs5x, 'fancy_play'),
    V('s12-10', 'BB_vs_BTN', ['Kd', 'Kh'], 72210, 'KK 5×: call. Premium = paga.', vs5x),
    R('s12-11', 'BTN', ['8h', '7h'], 72211, '87s BTN 5×: open steal ~2,5 bb (no shove). Jugabilidad; 5× no elimina el steal con conectores, sí el spew.', st5x),
    R('s12-12', 'SB', ['Jd', '8c'], 72212, 'J8o SB 5×: fold. Misma mano, distinto multiplicador: aquí más tight.', st5x, 'dominated')
  ];

  PACKS['S-13'] = [
    R('s13-01', 'BTN', ['As', 'Ts'], 72301, 'Examen ICM: ATs ~12 bb BTN — shove. Zona push/fold, no min-raise.', pf12),
    R('s13-02', 'BTN', ['7c', '2d'], 72302, '72o corto: fold. Checklist: ¿fichas o euros? Aquí ni siquiera fichas.', pf12, 'dominated'),
    V('s13-03', 'BB_vs_BTN', ['As', 'Kd'], 72303, 'AKo vs shove: call. Premium — ICM no lo tira.', vsPush),
    V('s13-04', 'BB_vs_BTN', ['Td', '8c'], 72304, 'T8o vs shove: fold. Olor a −EV $.', vsPush, 'fancy_play'),
    R('s13-05', 'SB', ['Kh', 'Js'], 72305, 'KJs SB corto: shove. Push/fold limpio.', pf10),
    V('s13-06', 'BB_vs_SB', ['Qh', '9c'], 72306, 'Q9o vs shove: fold. Overfold vs shove en examen ICM.', vsPush, 'fancy_play'),
    R('s13-07', 'BTN', ['9s', '9c'], 72307, '99 ~10 bb: shove value.', pf10),
    V('s13-08', 'BB_vs_BTN', ['7c', '2h'], 72308, '72o vs shove: fold.', vsPush, 'dominated'),
    R('s13-09', 'BTN', ['Ah', 'Kd'], 72309, 'AKo 12 bb: shove. No open min en examen.', pf12),
    V('s13-10', 'BB_vs_BTN', ['Qs', 'Qd'], 72310, 'QQ vs shove: call.', vsPush),
    R('s13-11', 'SB', ['Qd', '8c'], 72311, 'Q8o SB corto: fold. No panic shove.', pf10, 'fancy_play'),
    V('s13-12', 'BB_vs_SB', ['As', 'Ah'], 72312, 'AA vs shove: call. Checklist cerrado.', vsPush)
  ];

  PACKS['S-14'] = [
    R('s14-01', 'BTN', ['As', 'Ts'], 72401, 'ATs HU/corto: shove. Bubble factor: el pay jump HU duele — elige spots con fold equity, no flips basura.', pf12),
    R('s14-02', 'BTN', ['7c', '2d'], 72402, '72o: fold. No flippees barato el 2.º por orgullo.', pf12, 'dominated'),
    V('s14-03', 'BB_vs_BTN', ['Kc', '9d'], 72403, 'K9o vs shove cerca de HU: fold. Bubble factor alto — overfold.', vsPush, 'fancy_play'),
    V('s14-04', 'BB_vs_BTN', ['As', 'Kd'], 72404, 'AKo vs shove: call. Incluso con bubble factor, premiums se pagan.', vsPush),
    R('s14-05', 'SB', ['Kh', 'Js'], 72405, 'KJs SB corto: shove. Presión de pay jump no paraliza broadway usable.', pf10),
    V('s14-06', 'BB_vs_BTN', ['Td', '8c'], 72406, 'T8o vs shove: fold. Flip mediocre + jump = mala compra.', vsPush, 'fancy_play'),
    R('s14-07', 'BTN', ['9s', '9c'], 72407, '99: shove value. Par vs rango — no es flip de basura.', pf10),
    V('s14-08', 'BB_vs_SB', ['7c', '2h'], 72408, '72o: fold.', vsPush, 'dominated'),
    R('s14-09', 'BTN', ['Ah', 'Kd'], 72409, 'AKo: shove. Bubble mental ≠ never shove premiums.', pf12),
    V('s14-10', 'BB_vs_BTN', ['Qs', 'Qd'], 72410, 'QQ: call vs shove.', vsPush),
    R('s14-11', 'SB', ['Qd', '8c'], 72411, 'Q8o SB: fold. No compres el 2.º con panic shove.', pf10, 'fancy_play'),
    V('s14-12', 'BB_vs_BTN', ['Ah', 'Ah'], 72412, 'AA: call. El bubble factor no tira ases.', vsPush)
  ];

  PACKS['S-15'] = [
    R('s15-01', 'BTN', ['As', 'Ts'], 72501, 'ATs shove 10–12 bb: mide tu rango (Ax suited, pares, broadway) vs el call del BB, no vs “tiene QQ”.', pf12),
    R('s15-02', 'BTN', ['7c', '2d'], 72502, '72o no está en el rango de shove. Range vs range empieza por no meter basura en tu banda.', pf12, 'dominated'),
    V('s15-03', 'BB_vs_BTN', ['As', 'Kd'], 72503, 'AKo vs rango de shove BTN corto: call. AK gana vs un shove wide, no vs una mano concreta.', vsPush),
    V('s15-04', 'BB_vs_BTN', ['Td', '8c'], 72504, 'T8o vs ese mismo rango: fold. Contra la banda, no contra “creo que tiene 87s”.', vsPush, 'fancy_play'),
    R('s15-05', 'SB', ['Kh', 'Js'], 72505, 'KJs SB: shove frecuente — entra en la banda SB corta.', pf10),
    V('s15-06', 'BB_vs_SB', ['Qh', '9c'], 72506, 'Q9o vs shove SB: fold. El rango de shove SB es más tight que BTN; Q9o queda fuera.', vsPush, 'fancy_play'),
    R('s15-07', 'BTN', ['9s', '9c'], 72507, '99: shove value. Par medio es banda de valor, no “una mano bonita”.', pf10),
    V('s15-08', 'BB_vs_BTN', ['7c', '2h'], 72508, '72o: fold. Fuera de cualquier banda de call.', vsPush, 'dominated'),
    R('s15-09', 'BTN', ['As', '5s'], 72509, 'A5s: shove frecuente. Ax suited = banda de presión + blocker de as.', pf10),
    V('s15-10', 'BB_vs_BTN', ['Qs', 'Qd'], 72510, 'QQ vs shove BTN: call. Tu par contra un rango, no contra AK imaginario.', vsPush),
    R('s15-11', 'SB', ['Ad', '9c'], 72511, 'A9o SB corto: shove frecuente. Entra en muchos charts SB.', pf10),
    V('s15-12', 'BB_vs_SB', ['Jh', '8d'], 72512, 'J8o vs shove: fold. No asignes “él tiene air” para justificar el call.', vsPush, 'fancy_play')
  ];

  PACKS['S-16'] = [
    R('s16-01', 'BTN', ['Kh', '9s'], 72601, 'Vs nit (folda mucho): K9o BTN steal OK. Explotas el overfold — más wide que vs GTO ciego.', st20),
    R('s16-02', 'BTN', ['7c', '2d'], 72602, 'Vs nit tampoco 72o. Explotación no es spew: el nit paga a veces y entonces estás muerto.', st20, 'dominated'),
    V('s16-03', 'BB_vs_BTN', ['As', 'Kd'], 72603, 'Vs maniac que abre/shovea wide: AKo call/3-bet value. Value más limpio, menos farol.', vs20),
    V('s16-04', 'BB_vs_BTN', ['Td', '8c'], 72604, 'Vs maniac con T8o: fold. Él paga y shovea wide — no farolees ni hero-calles basura.', vs20, 'fancy_play'),
    R('s16-05', 'SB', ['As', '5s'], 72605, 'Vs nit SB A5s: steal razonable. El nit tira ciegas; Ax suited castiga.', st20),
    V('s16-06', 'BB_vs_BTN', ['7c', '2h'], 72606, '72o vs cualquier perfil: fold.', vs20, 'dominated'),
    R('s16-07', 'BTN', ['9s', '9c'], 72607, '99 vs nit: shove/open fuerte. Value — el nit foldea de más.', st20),
    V('s16-08', 'BB_vs_BTN', ['Qs', 'Qd'], 72608, 'QQ vs maniac: 3-bet shove value. Cobra al que juega demasiadas manos.', vs20),
    R('s16-09', 'BTN', ['8h', '7h'], 72609, '87s vs nit: steal OK. Vs maniac serías más cauto; aquí el nit tira.', st20),
    V('s16-10', 'BB_vs_BTN', ['Kc', '9d'], 72610, 'K9o vs maniac: fold. Él no tira; tu farol muere. Tight vs agresión loca.', vs20, 'fancy_play'),
    R('s16-11', 'SB', ['Qd', '8c'], 72611, 'Q8o SB vs nit: a menudo fold igual — OOP. Explotar no es abrir basura OOP.', st20, 'fancy_play'),
    V('s16-12', 'BB_vs_SB', ['Ah', 'Js'], 72612, 'AJs vs steal: 3-bet/continue. Vs nit presión; vs maniac value. Ambos perfiles: no fold panic con AJ.', vs20)
  ];

  PACKS['S-17'] = [
    R('s17-01', 'BTN', ['As', 'Kd'], 72701, 'Pro Spin: AKo ~20 bb shove. Etiqueta el spot (steal corto) antes de clicar.', st20),
    R('s17-02', 'BTN', ['7c', '2d'], 72702, '72o: fold. Mapa: no es iso, no es push premium, es basura.', st20, 'dominated'),
    V('s17-03', 'BB_vs_BTN', ['As', 'Kd'], 72703, 'AKo vs steal: 3-bet shove. Defensa BB, no overdefend.', vs20),
    V('s17-04', 'BB_vs_BTN', ['Td', '8c'], 72704, 'T8o vs steal/shove: fold. ICM + rango.', vs20, 'fancy_play'),
    R('s17-05', 'BTN', ['As', 'Ts'], 72705, 'ATs 12 bb: shove. Push/fold limpio.', pf12),
    bb('s17-06', ['Ah', 'Js'], 72706, { teachBack: 'AJs BB vs limp SB: iso. En 3-max aíslas con fuertes, no check eterno.', playConfig: spin({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
    R('s17-07', 'SB', ['Qd', '8c'], 72707, 'Q8o SB corto: fold. No panic.', pf10, 'fancy_play'),
    V('s17-08', 'BB_vs_BTN', ['Qs', 'Qd'], 72708, 'QQ vs steal: 3-bet shove value.', vs20),
    R('s17-09', 'BTN', ['8h', '7h'], 72709, '87s BTN 20 bb: open steal ~2,5 bb. Mano media del rango.', st20),
    V('s17-10', 'BB_vs_BTN', ['7c', '2h'], 72710, '72o vs steal: fold.', vs20, 'dominated'),
    R('s17-11', 'BTN', ['9s', '9c'], 72711, '99 ~10 bb: shove.', pf10),
    V('s17-12', 'BB_vs_BTN', ['Ah', 'Ah'], 72712, 'AA vs shove/steal: call o 3-bet. Certificación: premium se cobra.', vsPush)
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
    R('t00-02', 'UTG', ['7h', '2d'], 73002, 'Early UTG 72o: fold. Ante o no, early no spew desde early position.', early, 'dominated'),
    R('t00-03', 'CO', ['Ks', 'Js'], 73003, 'Early KJs CO: open. Construyes stack con iniciativa; el ante aún no te obliga a locura.', early),
    R('t00-04', 'BTN', ['Kh', '9s'], 73004, 'Mid (~25 bb) K9o BTN: steal. Cambió la fase: ahora robas más que en early.', midSt),
    R('t00-05', 'BTN', ['7c', '2d'], 73005, 'Mid 72o: fold. El ante no convierte basura en steal.', midSt, 'dominated'),
    R('t00-06', 'CO', ['As', '5s'], 73006, 'Mid A5s CO: steal/open OK. Stack en bb + fase mid = más fold equity que early.', midSt),
    R('t00-07', 'BTN', ['As', 'Ts'], 73007, 'Push (~10–12 bb) ATs BTN: shove. Fase push: o all-in o fold — el open min es leak.', push12),
    R('t00-08', 'BTN', ['7c', '2h'], 73008, 'Push 72o: fold. Distinta fase, misma basura: no panic shove.', push12, 'dominated'),
    R('t00-09', 'SB', ['Kh', 'Js'], 73009, 'Push KJs SB: shove. Cuenta bb: ya no estás early.', pushM),
    R('t00-10', 'UTG', ['Qd', '8c'], 73010, 'Early Q8o UTG: fold. Identifica fase ANTES de las cartas.', early, 'fancy_play'),
    R('t00-11', 'BTN', ['9s', '9c'], 73011, 'Mid 99 BTN: open. Par medio en mid — iniciativa, no esperar a ser short.', midSt),
    R('t00-12', 'BTN', ['Qs', 'Qd'], 73012, 'Push QQ: shove. Par fuerte en zona corta — all-in.', pushM)
  ];

  PACKS['T-10'] = [
    V('t10-01', 'BB_vs_BTN', ['As', 'Kd'], 74001, 'AQo/AKo vs shove corto: call chip EV. Equity vs rango wide — base antes del ICM fino.', vsPushM),
    V('t10-02', 'BB_vs_BTN', ['7c', '2d'], 74002, '72o vs shove: fold. Ni chip EV. “Ver” no es argumento.', vsPushM, 'dominated'),
    V('t10-03', 'BB_vs_SB', ['Qs', 'Qd'], 74003, 'QQ vs shove: call. Par fuerte — chip EV claro.', vsPushM),
    V('t10-04', 'BB_vs_BTN', ['Td', '8c'], 74004, 'T8o vs shove: fold. Equity insuficiente vs el rango.', vsPushM, 'fancy_play'),
    V('t10-05', 'BB_vs_BTN', ['Ah', 'Ah'], 74005, 'AA: call. Chip EV máximo.', vsPushM),
    V('t10-06', 'BB_vs_SB', ['Jd', '8c'], 74006, 'J8o: fold. Dominada.', vsPushM, 'dominated'),
    V('t10-07', 'BB_vs_BTN', ['Kh', 'Kh'], 74007, 'KK: call.', vsPushM),
    V('t10-08', 'BB_vs_BTN', ['Qh', '9c'], 74008, 'Q9o vs shove BTN: fold frecuente. Zona gris hacia fold — no “quiero ver”.', vsPushM, 'fancy_play'),
    V('t10-09', 'BB_vs_SB', ['As', 'Js'], 74009, 'AJs vs shove SB: call sólido. Ax fuerte vs rango.', vsPushM),
    V('t10-10', 'BB_vs_BTN', ['8h', '7d'], 74010, '87o: fold. Precio vs all-in no está.', vsPushM, 'dominated'),
    V('t10-11', 'BB_vs_BTN', ['9s', '9c'], 74011, '99 vs shove BTN: call frecuente. Par vs rango wide.', vsPushM),
    V('t10-12', 'BB_vs_CO', ['Kc', '9d'], 74012, 'K9o vs shove CO: fold frecuente. CO shoves tighter que BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-11'] = [
    V('t11-01', 'BB_vs_BTN', ['As', 'Kd'], 74101, 'AKo vs shove: call. ICM aprieta, pero premiums siguen pagándose.', vsPushM),
    V('t11-02', 'BB_vs_BTN', ['Td', '8c'], 74102, 'T8o: fold. $EV pide más tightness que chip EV — este ya era fold en fichas.', vsPushM, 'fancy_play'),
    V('t11-03', 'BB_vs_SB', ['Qs', 'Qd'], 74103, 'QQ: call. ICM no tira damas.', vsPushM),
    V('t11-04', 'BB_vs_BTN', ['Qh', '9c'], 74104, 'Q9o vs shove: fold. Overfold vs chip EV: correcto cerca de premios.', vsPushM, 'fancy_play'),
    V('t11-05', 'BB_vs_BTN', ['Ah', 'Ah'], 74105, 'AA: call.', vsPushM),
    V('t11-06', 'BB_vs_SB', ['7c', '2h'], 74106, '72o: fold.', vsPushM, 'dominated'),
    V('t11-07', 'BB_vs_BTN', ['Kh', 'Kh'], 74107, 'KK: call.', vsPushM),
    V('t11-08', 'BB_vs_BTN', ['Jh', '9d'], 74108, 'J9o: fold. $EV castiga el flip mediocre.', vsPushM, 'fancy_play'),
    V('t11-09', 'BB_vs_SB', ['As', 'Js'], 74109, 'AJs: call/continue. Ax fuerte — no panic fold ICM.', vsPushM),
    V('t11-10', 'BB_vs_BTN', ['8h', '6c'], 74110, '86o: fold.', vsPushM, 'dominated'),
    V('t11-11', 'BB_vs_BTN', ['9s', '9c'], 74111, '99 vs shove BTN: call frecuente. Par vs wide — $EV suele aguantar.', vsPushM),
    V('t11-12', 'BB_vs_CO', ['Kc', 'Td'], 74112, 'KTo vs shove CO: fold frecuente. ICM más tight que vs BTN.', vsPushM, 'fancy_play')
  ];

  PACKS['T-12'] = [
    R('t12-01', 'BTN', ['Ah', '5s'], 74201, 'Examen short: A5o BTN ~12 bb shove. ¿20–12 o push? Aquí push/fold.', push12),
    R('t12-02', 'BTN', ['7c', '2d'], 74202, '72o: fold. No open min a 9 bb.', push12, 'dominated'),
    V('t12-03', 'BB_vs_BTN', ['As', 'Kd'], 74203, 'AKo vs shove: call chip EV (y suele $EV).', vsPushM),
    V('t12-04', 'BB_vs_BTN', ['Td', '8c'], 74204, 'T8o vs shove: fold. ICM + equity.', vsPushM, 'fancy_play'),
    R('t12-05', 'CO', ['9s', '9c'], 74205, '99 ~12 bb: shove value. Zona 20–12/push: par medio va all-in.', push12),
    R('t12-06', 'SB', ['Qd', '8c'], 74206, 'Q8o SB corto: fold.', pushM, 'fancy_play'),
    V('t12-07', 'BB_vs_BTN', ['Qs', 'Qd'], 74207, 'QQ: call vs shove.', vsPushM),
    R('t12-08', 'BTN', ['As', 'Ts'], 74208, 'ATs corto: shove.', push12),
    V('t12-09', 'BB_vs_BTN', ['7c', '2h'], 74209, '72o vs shove: fold.', vsPushM, 'dominated'),
    R('t12-10', 'SB', ['Ks', 'Ts'], 74210, 'KTs SB: shove frecuente.', pushM),
    V('t12-11', 'BB_vs_SB', ['Ah', 'Ah'], 74211, 'AA: call.', vsPushM),
    R('t12-12', 'BTN', ['Ah', 'Kd'], 74212, 'AKo 12 bb: shove. Checklist: bb → shove/fold → ejecuta.', push12)
  ];

  PACKS['T-13'] = [
    R('t13-01', 'BTN', ['Kh', '9s'], 74301, 'Big (~45 bb) BTN K9o: steal. Rol big = presión. Identifica rol antes de la mano.', big45),
    R('t13-02', 'BTN', ['7c', '2h'], 74302, 'Big con 72o: fold. Rol no lava basura.', big45, 'dominated'),
    R('t13-03', 'CO', ['Qd', '8c'], 74303, 'Mid (~22 bb) CO Q8o con covers detrás: fold. Rol mid = sobrevivir, no chocar.', mid22, 'fancy_play'),
    R('t13-04', 'BTN', ['As', 'Ts'], 74304, 'Short BTN ATs: shove. Rol short = ladder/doble selectivo.', push12),
    V('t13-05', 'BB_vs_BTN', ['Kc', '9d'], 74305, 'Cover/big vs open wide con K9o: fold. No pagues light “soy cover”.', vsBig, 'fancy_play'),
    V('t13-06', 'BB_vs_BTN', ['Qs', 'Qd'], 74306, 'Cover QQ vs open BTN: 3-bet value. Big también cobra premiums.', vsBig),
    R('t13-07', 'UTG', ['Ah', '5d'], 74307, 'Mid UTG A5o: fold. Early + mid + covers = disciplina.', mid25, 'dominated'),
    R('t13-08', 'BTN', ['9s', '9c'], 74308, 'Mid BTN 99: open. Spot limpio — mid no es “nunca juego”.', mid25),
    R('t13-09', 'BTN', ['7c', '2d'], 74309, 'Short 72o: fold. Ladder no es panic shove.', push12, 'dominated'),
    F3('t13-10', 'BTN_vs_BB', ['9h', '9c'], 74310, 'Mid 99 vs 3-bet del cover: fold frecuente. Evita coin flip vs quien te elimina.', f3mid, 'fancy_play'),
    R('t13-11', 'SB', ['Kh', 'Js'], 74311, 'Short SB KJs: shove. Rol short en late.', pushM),
    R('t13-12', 'BTN', ['Ah', 'Kd'], 74312, 'Big AKo BTN: open/presión. El big abre más; no spew, sí iniciativa.', big45)
  ];

  PACKS['T-14'] = [
    R('t14-01', 'BTN', ['Kh', '9s'], 74401, 'Big stack BTN K9o: steal. Presión ICM = fold equity, no call light.', big45),
    R('t14-02', 'BTN', ['7c', '2h'], 74402, '72o big: fold. Presión ≠ pagar/abrir basura.', big45, 'dominated'),
    R('t14-03', 'CO', ['As', '5s'], 74403, 'Big CO A5s: open/steal. Castigas mids que overfoldean.', big45),
    V('t14-04', 'BB_vs_BTN', ['Kc', '9d'], 74404, 'Big vs open: K9o fold. Si el short ya está committed, no regales el doble.', vsBig, 'fancy_play'),
    V('t14-05', 'BB_vs_BTN', ['Qs', 'Qd'], 74405, 'QQ big vs open: 3-bet value. Cobra; no flat eterno por “presión”.', vsBig),
    R('t14-06', 'SB', ['Qd', 'Td'], 74406, 'Big SB QTs: open frecuente. Presión desde ciegas con broadway.', big45),
    R('t14-07', 'BTN', ['8h', '7h'], 74407, '87s big BTN: steal. Jugabilidad + fold equity vs mids asustados.', big45),
    V('t14-08', 'BB_vs_BTN', ['7c', '2d'], 74408, '72o vs open: fold. El big no hero-calla.', vsBig, 'dominated'),
    R('t14-09', 'CO', ['Jd', '8c'], 74409, 'J8o CO: fold típico. Presión selectiva, no cualquier offsuit.', big45, 'fancy_play'),
    V('t14-10', 'BB_vs_BTN', ['As', 'Kd'], 74410, 'AKo big: 3-bet value. Misma lógica que QQ.', vsBig),
    R('t14-11', 'BTN', ['As', 'Jd'], 74411, 'AJo BTN big: steal claro.', big45),
    R('t14-12', 'SB', ['7c', '2h'], 74412, '72o SB: fold. Cover no stealea basura OOP.', big45, 'dominated')
  ];

  PACKS['T-15'] = [
    R('t15-01', 'CO', ['Qd', '8c'], 74501, 'Mid CO Q8o con covers: fold. Supervivencia = no opens flojos vs quien te elimina.', mid22, 'fancy_play'),
    R('t15-02', 'UTG', ['Ah', '5d'], 74502, 'Mid UTG A5o: fold. Demasiada gente (y covers) detrás.', mid25, 'dominated'),
    R('t15-03', 'BTN', ['9s', '9c'], 74503, 'Mid BTN 99: open. Supervivir no es foldear premiums/pares claros.', mid25),
    F3('t15-04', 'BTN_vs_BB', ['9h', '9c'], 74504, 'Mid 99 vs 3-bet cover: fold frecuente. Evita el coin flip de eliminación.', f3mid, 'fancy_play'),
    R('t15-05', 'BTN', ['Ah', 'Td'], 74505, 'Mid ATo BTN: open. Late + mano fuerte = spot limpio.', mid25),
    R('t15-06', 'HJ', ['Kd', '9c'], 74506, 'Mid K9o HJ: fold frecuente. Mid no spew middle.', mid25, 'fancy_play'),
    F3('t15-07', 'BTN_vs_BB', ['7c', '2d'], 74507, '72o vs 3-bet: fold. Obvio — el mid no hero-calla.', f3mid, 'dominated'),
    R('t15-08', 'CO', ['As', 'Kd'], 74508, 'AKo CO mid: open. Value — supervivencia no es parálisis.', mid25),
    F3('t15-09', 'CO_vs_BB', ['Ah', 'Td'], 74509, 'ATo CO vs 3-bet cover: fold frecuente. OOP + eliminación.', f3mid, 'fancy_play'),
    R('t15-10', 'BTN', ['8h', '7h'], 74510, '87s BTN mid: open razonable. Jugabilidad en late.', mid25),
    R('t15-11', 'UTG', ['7h', '2d'], 74511, '72o UTG: fold.', mid25, 'dominated'),
    F3('t15-12', 'BTN_vs_BB', ['As', 'Ah'], 74512, 'AA vs 3-bet: 4-bet/call value. Mid también stackea premiums.', f3mid)
  ];

  PACKS['T-16'] = [
    R('t16-01', 'BTN', ['As', 'Ts'], 74601, 'Short BTN ATs: shove. Ladder: late + folds delante. No UTG basura.', push12),
    R('t16-02', 'UTG', ['Qd', '8c'], 74602, 'Short UTG Q8o: fold. Antitexto del ladder: early + basura = bust.', push12, 'fancy_play'),
    R('t16-03', 'SB', ['Kh', 'Js'], 74603, 'Short SB KJs: shove. Late-ish + broadway.', pushM),
    R('t16-04', 'BTN', ['7c', '2d'], 74604, '72o: fold. A veces fold + esperar eliminación ajena es el ladder.', push12, 'dominated'),
    R('t16-05', 'CO', ['9s', '9c'], 74605, '99 short: shove. Par — double-up claro.', push12),
    R('t16-06', 'SB', ['Qd', '8c'], 74606, 'Q8o SB: fold. Selectivo, no panic.', pushM, 'fancy_play'),
    R('t16-07', 'BTN', ['As', '5s'], 74607, 'A5s BTN: shove frecuente. Fold equity vs mids ICM-tight.', pushM),
    R('t16-08', 'CO', ['Jh', 'Td'], 74608, 'JTo CO corto: fold frecuente. No tan late como BTN.', push12, 'fancy_play'),
    R('t16-09', 'BTN', ['Ah', 'Kd'], 74609, 'AKo: shove. Ladder también es value shove.', push12),
    R('t16-10', 'SB', ['7c', '2h'], 74610, '72o SB: fold.', pushM, 'dominated'),
    R('t16-11', 'BTN', ['8c', '7c'], 74611, '87s BTN corto: shove candidato. Conector + late.', push12),
    R('t16-12', 'UTG', ['7h', '2d'], 74612, '72o UTG: fold. Espera un asiento mejor.', push12, 'dominated')
  ];

  PACKS['T-17'] = [
    R('t17-01', 'BTN', ['Kh', '9s'], 74701, 'Post-ITM K9o BTN mid: steal OK. Ya cobras mínimo, pero el jump sigue: abre, no spew.', midSt),
    R('t17-02', 'BTN', ['7c', '2d'], 74702, '72o post-ITM: fold. “Ya estoy pagado” no es all-in light.', midSt, 'dominated'),
    V('t17-03', 'BB_vs_BTN', ['Td', '8c'], 74703, 'T8o vs shove post-ITM: fold. ICM sigue encendido.', vsPushM, 'fancy_play'),
    V('t17-04', 'BB_vs_BTN', ['As', 'Kd'], 74704, 'AKo vs shove: call. Pay jump no tira AK.', vsPushM),
    R('t17-05', 'CO', ['As', '5s'], 74705, 'A5s CO: steal. Más agresión que burbuja extrema, no locura.', midSt),
    R('t17-06', 'CO', ['Jd', '8c'], 74706, 'J8o CO: fold. Post-bubble ≠ cualquier offsuit.', midSt, 'fancy_play'),
    V('t17-07', 'BB_vs_BTN', ['Qs', 'Qd'], 74707, 'QQ: call vs shove.', vsPushM),
    R('t17-08', 'BTN', ['8h', '7h'], 74708, '87s BTN: steal. Jugabilidad post-ITM.', midSt),
    V('t17-09', 'BB_vs_BTN', ['7c', '2h'], 74709, '72o vs shove: fold.', vsPushM, 'dominated'),
    R('t17-10', 'SB', ['Qd', 'Td'], 74710, 'QTs SB: open/steal frecuente.', midSt),
    R('t17-11', 'BTN', ['As', 'Ts'], 74711, 'ATs corto: shove. ITM no apaga push/fold.', push12),
    V('t17-12', 'BB_vs_BTN', ['Ah', 'Ah'], 74712, 'AA: call. El min-cash no cambia nuts.', vsPushM)
  ];

  PACKS['T-18'] = [
    R('t18-01', 'BTN', ['Kh', '9s'], 74801, 'Examen bubble: ¿rol big? K9o steal. Presión.', big45),
    R('t18-02', 'CO', ['Qd', '8c'], 74802, '¿Rol mid? Q8o fold vs covers.', mid22, 'fancy_play'),
    R('t18-03', 'BTN', ['As', 'Ts'], 74803, '¿Rol short? ATs shove.', push12),
    V('t18-04', 'BB_vs_BTN', ['Kc', '9d'], 74804, 'Cover K9o vs open: fold. No dobles fáciles.', vsBig, 'fancy_play'),
    R('t18-05', 'BTN', ['7c', '2h'], 74805, '72o cualquier rol: fold.', big45, 'dominated'),
    F3('t18-06', 'BTN_vs_BB', ['9h', '9c'], 74806, 'Mid 99 vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t18-07', 'BB_vs_BTN', ['Qs', 'Qd'], 74807, 'QQ cover: 3-bet value.', vsBig),
    R('t18-08', 'UTG', ['Ah', '5d'], 74808, 'Mid UTG A5o: fold.', mid25, 'dominated'),
    R('t18-09', 'SB', ['Kh', 'Js'], 74809, 'Short SB KJs: shove.', pushM),
    R('t18-10', 'BTN', ['9s', '9c'], 74810, 'Mid 99 BTN: open. Supervivir ≠ parálisis.', mid25),
    V('t18-11', 'BB_vs_BTN', ['As', 'Kd'], 74811, 'AKo cover: 3-bet.', vsBig),
    R('t18-12', 'BTN', ['7c', '2d'], 74812, 'Short 72o: fold. Checklist: rol → job → acción.', push12, 'dominated')
  ];

  PACKS['T-19'] = [
    R('t19-01', 'BTN', ['Kh', '9s'], 74901, 'FT big K9o BTN: steal. ICM a máximo volumen — presión de cover.', big45),
    R('t19-02', 'CO', ['Qd', '8c'], 74902, 'FT mid Q8o: fold. Jumps enormes; no chocar vs cover.', mid22, 'fancy_play'),
    R('t19-03', 'BTN', ['As', 'Ts'], 74903, 'FT short ATs: shove selectivo. Pick spots, no UTG trash.', push12),
    V('t19-04', 'BB_vs_BTN', ['Kc', '9d'], 74904, 'FT cover K9o vs open: fold. Un flip malo destroza horas.', vsBig, 'fancy_play'),
    V('t19-05', 'BB_vs_BTN', ['Qs', 'Qd'], 74905, 'QQ FT: 3-bet value. Premium sigue siendo bote grande.', vsBig),
    R('t19-06', 'BTN', ['7c', '2h'], 74906, '72o FT: fold. Cualquier rol.', big45, 'dominated'),
    F3('t19-07', 'BTN_vs_BB', ['9h', '9c'], 74907, 'Mid 99 vs 3-bet chip leader: fold frecuente. ICM FT.', f3mid, 'fancy_play'),
    R('t19-08', 'BTN', ['9s', '9c'], 74908, 'Mid/FT 99 BTN: open si el spot es limpio.', mid25),
    R('t19-09', 'SB', ['Kh', 'Js'], 74909, 'Short FT KJs SB: shove.', pushM),
    V('t19-10', 'BB_vs_BTN', ['As', 'Kd'], 74910, 'AKo FT: 3-bet value.', vsBig),
    R('t19-11', 'UTG', ['Ah', '5d'], 74911, 'A5o UTG FT: fold. Covers detrás.', mid25, 'dominated'),
    R('t19-12', 'BTN', ['Ah', 'Kd'], 74912, 'AKo BTN FT: open/presión. Mapa usable, no solver de FT.', big45)
  ];

  PACKS['T-20'] = [
    V('t20-01', 'BB_vs_BTN', ['Td', '8c'], 75001, 'T8o vs shove: fold. Verbaliza: “en fichas dudoso; en dinero me tiro”. Drill chip EV vs $EV.', vsPushM, 'fancy_play'),
    V('t20-02', 'BB_vs_BTN', ['As', 'Kd'], 75002, 'AKo: call. Aquí coinciden chip EV y $EV — dilo en voz alta.', vsPushM),
    V('t20-03', 'BB_vs_BTN', ['Qh', '9c'], 75003, 'Q9o: fold. +EV chips dudoso / −EV $ típico de burbuja-FT.', vsPushM, 'fancy_play'),
    V('t20-04', 'BB_vs_BTN', ['Ah', 'Ah'], 75004, 'AA: call. Coinciden.', vsPushM),
    V('t20-05', 'BB_vs_SB', ['Jd', '8c'], 75005, 'J8o: fold. Ni fichas ni dinero.', vsPushM, 'dominated'),
    V('t20-06', 'BB_vs_BTN', ['Qs', 'Qd'], 75006, 'QQ: call. Premium alinea ambos EV.', vsPushM),
    V('t20-07', 'BB_vs_BTN', ['Jh', '9d'], 75007, 'J9o: fold. “En fichas a veces pago; en dinero no.”', vsPushM, 'fancy_play'),
    V('t20-08', 'BB_vs_BTN', ['Kh', 'Kh'], 75008, 'KK: call.', vsPushM),
    V('t20-09', 'BB_vs_SB', ['7c', '2h'], 75009, '72o: fold.', vsPushM, 'dominated'),
    V('t20-10', 'BB_vs_BTN', ['9s', '9c'], 75010, '99 vs shove BTN: call frecuente. Par vs wide — suelen coincidir.', vsPushM),
    V('t20-11', 'BB_vs_CO', ['Kc', '9d'], 75011, 'K9o vs shove CO: fold. $EV aprieta vs rangos menos wide.', vsPushM, 'fancy_play'),
    V('t20-12', 'BB_vs_SB', ['As', 'Js'], 75012, 'AJs: call. Ax fuerte — no idolatres solo el miedo ICM.', vsPushM)
  ];

  PACKS['T-21'] = [
    R('t21-01', 'BTN', ['As', 'Ts'], 75101, '¿Qué % shovea este short BTN? ATs entra. Asigna rango de shove, luego encaja tu combo.', push12),
    R('t21-02', 'BTN', ['7c', '2d'], 75102, '72o no está en el rango de shove. Lectura: fuera de banda.', push12, 'dominated'),
    V('t21-03', 'BB_vs_BTN', ['As', 'Kd'], 75103, '¿Qué paga este mid vs shove short? AKo sí. Rango de call, no “su mano”.', vsPushM),
    V('t21-04', 'BB_vs_BTN', ['Td', '8c'], 75104, 'T8o: el mid overfoldea vs cover/shove. Fold — tu combo no entra en su banda de call.', vsPushM, 'fancy_play'),
    R('t21-05', 'SB', ['Kh', 'Js'], 75105, 'Short SB KJs: entra en shove SB. Pregunta el % del asiento.', pushM),
    V('t21-06', 'BB_vs_BTN', ['Kc', '9d'], 75106, 'K9o vs open del BTN wide: fold. El big no paga light por ego — tú tampoco.', vsBig, 'fancy_play'),
    R('t21-07', 'BTN', ['9s', '9c'], 75107, '99 short: banda de value shove.', pushM),
    V('t21-08', 'BB_vs_BTN', ['Qs', 'Qd'], 75108, 'QQ: banda de 3-bet/call. Value vs open late.', vsBig),
    R('t21-09', 'CO', ['Qd', '8c'], 75109, 'Q8o mid CO: no entra en open vs cover. Rango recortado por rol.', mid22, 'fancy_play'),
    V('t21-10', 'BB_vs_BTN', ['7c', '2h'], 75110, '72o: fuera de todo rango de call.', vsPushM, 'dominated'),
    R('t21-11', 'BTN', ['As', '5s'], 75111, 'A5s short BTN: banda de shove con blocker. Range reading, no “me gusta el as”.', pushM),
    V('t21-12', 'BB_vs_SB', ['Ah', 'Js'], 75112, 'AJs vs shove SB: entra en call. SB shovea más tight — AJ aún gana vs esa banda.', vsPushM)
  ];

  PACKS['T-22'] = [
    R('t22-01', 'BTN', ['Ah', 'Td'], 75201, 'Pro MTT: early ATo BTN open. Paso 1: fase y bb.', early),
    R('t22-02', 'UTG', ['7h', '2d'], 75202, 'Early 72o UTG: fold.', early, 'dominated'),
    R('t22-03', 'BTN', ['Kh', '9s'], 75203, 'Mid steal K9o. Paso 2: rol y job.', midSt),
    R('t22-04', 'BTN', ['As', 'Ts'], 75204, 'Push ATs shove. Fase push.', push12),
    V('t22-05', 'BB_vs_BTN', ['Td', '8c'], 75205, 'T8o vs shove: fold $EV.', vsPushM, 'fancy_play'),
    V('t22-06', 'BB_vs_BTN', ['As', 'Kd'], 75206, 'AKo vs shove: call.', vsPushM),
    R('t22-07', 'BTN', ['Kh', '9s'], 75207, 'Bubble/FT big: K9o steal.', big45),
    R('t22-08', 'CO', ['Qd', '8c'], 75208, 'Mid bubble Q8o: fold.', mid22, 'fancy_play'),
    F3('t22-09', 'BTN_vs_BB', ['9h', '9c'], 75209, 'Mid 99 vs 3-bet cover: fold frecuente.', f3mid, 'fancy_play'),
    V('t22-10', 'BB_vs_BTN', ['Qs', 'Qd'], 75210, 'QQ cover: 3-bet.', vsBig),
    R('t22-11', 'BTN', ['7c', '2d'], 75211, '72o cualquier fase: fold.', push12, 'dominated'),
    R('t22-12', 'SB', ['Kh', 'Js'], 75212, 'Short KJs SB shove. Certificación: fase → rol → acción.', pushM)
  ];

  /* —— Rangos —— */
  PACKS['R-01'] = [
    R('r01-01', 'UTG', ['As', 'Ah'], 76001, 'AA está en la esquina de la matriz 13×13 (par, celda diagonal). Open UTG: el chart lo pinta casi 100 %.', cash()),
    R('r01-02', 'UTG', ['7c', '2d'], 76002, '72o está abajo a la derecha, offsuit. UTG: 0 % — fold. Lee palo (suited arriba) vs offsuit (abajo).', cash(), 'dominated'),
    R('r01-03', 'BTN', ['8h', '7h'], 76003, '87s: conectores suited (encima de la diagonal). BTN RFI suele pintarla. Open.', cash()),
    R('r01-04', 'UTG', ['8h', '7d'], 76004, '87o: misma celda familia, debajo de la diagonal. UTG casi 0 %. Fold. Suited ≠ offsuit.', cash(), 'fancy_play'),
    R('r01-05', 'CO', ['Kd', 'Qs'], 76005, 'KQs: broadway suited. CO/BTN la pintan fuerte. Open.', cash()),
    R('r01-06', 'UTG', ['Kd', '9c'], 76006, 'K9o UTG: celda offsuit baja frecuencia. Fold. El color de la celda te lo dice.', cash(), 'fancy_play'),
    R('r01-07', 'BTN', ['Ah', '5s'], 76007, 'A5s: Ax suited. BTN RFI típico. Open. Busca la fila A, columna 5, lado suited.', cash()),
    R('r01-08', 'HJ', ['Ah', '5d'], 76008, 'A5o HJ: offsuit, menos % que A5s. A menudo fold desde middle. Lee el % de la celda.', cash(), 'fancy_play'),
    R('r01-09', 'CO', ['9s', '9c'], 76009, '99: diagonal de pares. Casi siempre pintada en RFI late. Open.', cash()),
    R('r01-10', 'UTG', ['Qd', 'Jd'], 76010, 'QJs UTG: muchas matrices modernas la pintan. Open — no la trates como 72o.', cash()),
    R('r01-11', 'BTN', ['5h', '2d'], 76011, '52o BTN: celda casi vacía. Fold. Wide de botón no es 169/169.', cash(), 'dominated'),
    R('r01-12', 'SB', ['As', 'Kd'], 76012, 'AKo SB: celda premium, alta frecuencia. Open. Practica leer posición + celda.', cash())
  ];

  PACKS['R-02'] = [
    R('r02-01', 'BTN', ['As', 'Ah'], 76101, 'RFI BTN en 60 s: pares altos siempre. AA open. Banda 1: pares.', cash()),
    R('r02-02', 'BTN', ['7c', '2d'], 76102, '72o no entra en la banda BTN. Contrasta con el menú Rangos: 0 %.', cash(), 'dominated'),
    R('r02-03', 'BTN', ['Ah', 'Td'], 76103, 'ATo: broadway offsuit — banda 2. Open desde botón.', cash()),
    R('r02-04', 'BTN', ['8h', '7h'], 76104, '87s: suited connectors — banda 3. Open BTN.', cash()),
    R('r02-05', 'BTN', ['Kd', '9c'], 76105, 'K9o: late offsuit. BTN a menudo open; no es UTG. Aquí open razonable.', cash()),
    R('r02-06', 'BTN', ['5h', '2d'], 76106, '52o: fuera de bandas. Fold. 60 s: si no es par / broadway / sc / Ax decente → fuera.', cash(), 'dominated'),
    R('r02-07', 'BTN', ['As', '5s'], 76107, 'A5s: Ax suited. Open BTN. Banda Ax.', cash()),
    R('r02-08', 'BTN', ['Qd', '8c'], 76108, 'Q8o: borde. Muchas líneas fold o mix bajo. Fold frecuente — no fuerces el borde.', cash(), 'fancy_play'),
    R('r02-09', 'BTN', ['9s', '9c'], 76109, '99: pares medios. Open claro.', cash()),
    R('r02-10', 'BTN', ['Jc', 'Td'], 76110, 'JTo: broadway offsuit BTN. Open frecuente.', cash()),
    R('r02-11', 'BTN', ['4h', '3h'], 76111, '43s: sc bajos — mix/fold según chart. A menudo fold vs 65s+. Aquí fold frecuente.', cash(), 'fancy_play'),
    R('r02-12', 'BTN', ['Kh', 'Qs'], 76112, 'KQs: broadway suited. Open. Tras 60 s contrastas con Rangos, no memorizas píxeles.', cash())
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
    V('r04-01', 'BB_vs_BTN', ['Ad', '5d'], 76301, 'A5s vs BTN: 3-bet polar. El as bloquea AA/AK del rival — menos combos premium que te pagan mal.', cash({ scenario: '3bet' })),
    V('r04-02', 'BB_vs_BTN', ['Kd', 'Tc'], 76302, 'KTo: mal blocker (no bloquea AA/AK igual) y mano dominada. Fold, no farol.', cash({ scenario: '3bet' }), 'fancy_play'),
    V('r04-03', 'BB_vs_BTN', ['As', 'Ah'], 76303, 'AA: 3-bet value. Tus ases también “bloquean” AA rival — sobra value.', cash({ scenario: '3bet' })),
    V('r04-04', 'BB_vs_CO', ['7c', '2d'], 76304, '72o: 0 blockers útiles. Fold.', cash({ scenario: '3bet' }), 'dominated'),
    F3('r04-05', 'BTN_vs_BB', ['Ad', '5d'], 76305, 'A5s vs 3-bet: 4-bet farol mixto. El as quita combos de AA/AK del 3-bettor.', cash({ scenario: 'face3bet' })),
    F3('r04-06', 'BTN_vs_BB', ['Qd', 'Jh'], 76306, 'QJo vs 3-bet: fold. No bloqueas premium; te dominan. Combos de QJ no son farol.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-07', 'BB_vs_BTN', ['Ah', '4h'], 76307, 'A4s: 3-bet polar frecuente. Mismo blocker de as que A5s.', cash({ scenario: '3bet' })),
    V('r04-08', 'BB_vs_BTN', ['Kh', '9c'], 76308, 'K9o: fold. Blocker de K débil vs BTN wide; dominada.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r04-09', 'BTN_vs_BB', ['As', 'Ad'], 76309, 'AA vs 3-bet: 4-bet value. Blockers + nuts.', cash({ scenario: 'face3bet' })),
    V('r04-10', 'BB_vs_CO', ['As', 'Kd'], 76310, 'AKo: 3-bet value. Blockeas AA/KK y tienes equity.', cash({ scenario: '3bet' })),
    F3('r04-11', 'CO_vs_BB', ['7c', '2d'], 76311, '72o vs 3-bet: fold. Cero eliminación de combos fuertes.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r04-12', 'BB_vs_BTN', ['Kd', '2d'], 76312, 'K2s: a veces 3-bet farol con blocker de K. No es KTo. Mix/presión, no spew offsuit.', cash({ scenario: '3bet' }))
  ];

  PACKS['R-05'] = [
    R('r05-01', 'UTG', ['As', 'Ah'], 76401, 'Open UTG: el rango NO incluye 72o. AA sí. Tras RFI, asigna “value tight”, no una mano.', cash()),
    R('r05-02', 'UTG', ['7c', '2d'], 76402, '72o UTG: fold — esa línea ni existe. Cada acción elimina manos.', cash(), 'dominated'),
    V('r05-03', 'BB_vs_BTN', ['As', 'Kd'], 76403, 'Vs open BTN: rango wide. AKo 3-bet value. Historia: value + algún polar, no “tiene 72o”.', cash({ scenario: '3bet' })),
    V('r05-04', 'BB_vs_UTG', ['Kd', 'Jd'], 76404, 'Vs UTG: rango tight. KJo fold. El open early ya eliminó basura; no hero-defiendas.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r05-05', 'BTN_vs_BB', ['As', 'Ad'], 76405, 'Tras 3-bet, el rival tiene menos aire. AA 4-bet. Rango polarizado: fuertes + faroles.', cash({ scenario: 'face3bet' })),
    F3('r05-06', 'BTN_vs_BB', ['7c', '2d'], 76406, '72o vs 3-bet: fold. Esa mano no sobrevive la línea.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r05-07', 'BB_vs_BTN', ['Ad', '5d'], 76407, 'A5s 3-bet polar: banda de farol creíble tras open late.', cash({ scenario: '3bet' })),
    V('r05-08', 'BB_vs_BTN', ['Td', '8c'], 76408, 'T8o vs BTN: fold. No está en la historia de defensa sólida.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('r05-09', 'BTN_vs_BB', ['Ah', 'Ts'], 76409, 'ATs BTN vs 3-bet: call frecuente. Medias/jugables sobreviven en posición — no solo nuts.', cash({ scenario: 'face3bet' })),
    R('r05-10', 'BTN', ['8h', '7h'], 76410, 'Open BTN 87s: entra en RFI wide. Tras open, el rival debe ponerte sc + broadway + pares.', cash()),
    F3('r05-11', 'UTG_vs_BB', ['Ah', 'Td'], 76411, 'ATo UTG vs 3-bet: fold. La línea 3-bet elimina que “puedes seguir siempre”.', cash({ scenario: 'face3bet' }), 'dominated'),
    V('r05-12', 'BB_vs_BTN', ['Qs', 'Qd'], 76412, 'QQ vs BTN: 3-bet value. Escribe: value (QQ+) / medias (call) / aire (fold o polar).', cash({ scenario: '3bet' }))
  ];

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
    F3('c26-01', 'BTN_vs_BB', ['As', 'Ad'], 77001, 'AA vs 3-bet: 4-bet value. Capa siguiente al 3-bet — quieres bote o stack.', cash({ scenario: 'face3bet' })),
    F3('c26-02', 'BTN_vs_BB', ['7c', '2d'], 77002, '72o vs 3-bet: fold. No hay 4-bet farol con basura.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-03', 'BTN_vs_BB', ['Ad', '5d'], 77003, 'A5s vs 3-bet: 4-bet farol mixto. Blocker de as; no es value como AA.', cash({ scenario: 'face3bet' })),
    F3('c26-04', 'UTG_vs_BB', ['Ah', 'Td'], 77004, 'ATo UTG vs 3-bet: fold. Cold/OOP: más tight. No hero-call.', cash({ scenario: 'face3bet' }), 'dominated'),
    F3('c26-05', 'BTN_vs_BB', ['Kh', 'Kh'], 77005, 'KK: 4-bet value. Premium.', cash({ scenario: 'face3bet' })),
    F3('c26-06', 'CO_vs_BB', ['Qd', 'Jh'], 77006, 'QJo vs 3-bet: fold frecuente. Offsuit sin blocker claro ≠ 4-bet.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-07', 'BTN_vs_SB', ['As', 'Kd'], 77007, 'AKo BTN vs 3-bet: 4-bet o call value. Premium en posición.', cash({ scenario: 'face3bet' })),
    F3('c26-08', 'HJ_vs_BB', ['9s', '9c'], 77008, '99 HJ vs 3-bet: call frecuente, no 4-bet auto. Par media ≠ KK.', cash({ scenario: 'face3bet' })),
    F3('c26-09', 'BTN_vs_BB', ['Ah', '4h'], 77009, 'A4s: 4-bet polar/farol mixto. Misma familia que A5s.', cash({ scenario: 'face3bet' })),
    F3('c26-10', 'CO_vs_BB', ['8h', '7h'], 77010, '87s CO vs 3-bet: call frecuente IP. No 4-bet spew ni hero-fold.', cash({ scenario: 'face3bet' })),
    F3('c26-11', 'BTN_vs_BB', ['Kc', '9d'], 77011, 'K9o vs 3-bet: fold. Cold 4-bet pide aún más tightness — esto ni entra.', cash({ scenario: 'face3bet' }), 'fancy_play'),
    F3('c26-12', 'BTN_vs_BB', ['Qs', 'Qd'], 77012, 'QQ vs 3-bet: 4-bet value frecuente. Par fuerte — bote grande.', cash({ scenario: 'face3bet' }))
  ];

  PACKS['C-27'] = [
    Fl('c27-01', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77101, 'SRP OOP deep A-high paired: c-bet razonable. Board te favorece; aún así sizing pequeño — quedan calles.'),
    Fl('c27-02', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77102, 'Wet OOP deep: check/ceder. Pot control: un error a 100 bb+ cuesta el stack.', { trapTag: 'fancy_play' }),
    Fl('c27-03', 'BB', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 77103, 'QQ OOP en K-high: mix check-call. No hinches deep sin plan.'),
    Fl('c27-04', 'SB', ['Jc', 'Tc'], ['Ah', '7h', '2h'], 77104, 'Monotone OOP: check frecuente sin flush. SRP deep ≠ autocbet.', { trapTag: 'fancy_play' }),
    Fl('c27-05', 'BB', ['Ad', '5d'], ['Kc', '4s', '4d'], 77105, 'A-high paired OOP: c-bet mixto posible. Plan: bet pequeño o check-call.'),
    Fl('c27-06', 'SB', ['9h', '8h'], ['Qd', 'Jc', '2s'], 77106, 'Air OOP en QJ: check. Check-call se construye con showdown, no con c-bet air deep.'),
    Fl('c27-07', 'UTG', ['Ah', 'Kd'], ['Ks', '7d', '2c'], 77107, 'Top pair OOP seco: c-bet pequeño o check-call. Deep: no overbet sin necesidad.'),
    Fl('c27-08', 'SB', ['7s', '6s'], ['Kh', '9d', '2c'], 77108, 'Air OOP K-high: check frecuente. Ceder la calle es el plan.', { trapTag: 'fancy_play' }),
    Fl('c27-09', 'BB', ['Ah', 'Qd'], ['As', '8h', '3c'], 77109, 'Top pair A-high OOP: bet pequeño/check-call. Value con pot control.'),
    Fl('c27-10', 'SB', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77110, 'Conectado OOP deep: check. El caller conecta demasiado.', { trapTag: 'fancy_play' }),
    Fl('c27-11', 'BB', ['9s', '9c'], ['Ah', '7d', '2c'], 77111, 'Underpair OOP A-high: check-call/check. No bluff-raise deep.'),
    Fl('c27-12', 'SB', ['As', 'Kd'], ['2c', '2s', '7d'], 77112, 'Paired bajo OOP: c-bet frecuente posible. Rango de agresor > caller; sizing contenido.')
  ];

  PACKS['C-28'] = [
    Fl('c28-01', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77201, 'Vs fish: top pair A-high — c-bet value. Cobra más fino; el fish paga de más.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-02', 'BTN', ['7s', '6s'], ['Kh', '9d', '2c'], 77202, 'Vs reg en K-high air: no farol loco. Check más; el reg defiende. Población > GTO ciego.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    Fl('c28-03', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77203, 'Vs fish K72: c-bet. El recreacional foldea mal y paga peor — value/continuación.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    Fl('c28-04', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77204, 'Vs reg en wet: no autocbet grande. El reg castiga líneas flojas.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-05', 'BB_vs_BTN', ['As', 'Kd'], 77205, 'Vs fish steal: 3-bet value AKo. Cobra; el fish paga 3-bets de más.', cash({ scenario: '3bet', villainLevel: 'fish' })),
    V('c28-06', 'BB_vs_BTN', ['Td', '8c'], 77206, 'Vs reg T8o: fold. No hero-defend vs quien defiende bien.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    Fl('c28-07', 'BTN', ['Qs', 'Qd'], ['Kh', '9c', '3d'], 77207, 'QQ vs fish en K-high: bet/value. Thin vs recreacional OK; vs reg más check-call.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c28-08', 'BB_vs_BTN', ['7c', '2d'], 77208, '72o vs cualquiera: fold. Explotar no es spew.', cash({ scenario: '3bet', villainLevel: 'fish' }), 'dominated'),
    Fl('c28-09', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77209, 'Vs fish A-high: c-bet ligero. El fish se tira de más a c-bets pequeños.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    F3('c28-10', 'BTN_vs_BB', ['Ah', 'Td'], 77210, 'ATo vs 3-bet de reg: fold OOP/borde. Vs fish a veces call; vs reg suelta el thin.', cash({ scenario: 'face3bet', villainLevel: 'pro' }), 'dominated'),
    Fl('c28-11', 'CO', ['Kd', 'Kh'], ['Qc', 'Jd', 'Ts'], 77211, 'KK vs reg en board wet: pot control. No thin loco vs quien defiende.', { trapTag: 'fancy_play', playConfig: cash({ villainLevel: 'pro', practiceStreet: 'flop' }) }),
    V('c28-12', 'BB_vs_BTN', ['Qs', 'Qd'], 77212, 'QQ vs fish steal: 3-bet value. Cobra al que paga de más.', cash({ scenario: '3bet', villainLevel: 'fish' }))
  ];

  PACKS['C-29'] = [
    Fl('c29-01', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77301, 'Quiz: BB caller en K72r. Bandas: poco Kx, mucho aire, alguna pareja baja. C-bet — ventaja de rango.'),
    Fl('c29-02', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77302, 'Quiz: 987 two-tone. Bandas: más pares, más draws, menos aire. No autocbet.', { trapTag: 'fancy_play' }),
    V('c29-03', 'BB_vs_BTN', ['As', 'Kd'], 77303, 'Quiz: rango BTN open = wide. AKo es value vs esa banda, no vs “tiene 72”. 3-bet.', cash({ scenario: '3bet' })),
    V('c29-04', 'BB_vs_UTG', ['Kd', 'Jd'], 77304, 'Quiz: UTG = tight. KJo no entra vs esa banda. Fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    F3('c29-05', 'BTN_vs_BB', ['As', 'Ad'], 77305, 'Quiz: 3-bet polariza (value + farol). AA 4-bet vs la banda de value.', cash({ scenario: 'face3bet' })),
    F3('c29-06', 'BTN_vs_BB', ['7c', '2d'], 77306, 'Quiz: 72o no está en ninguna banda post-3-bet. Fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c29-07', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77307, 'Quiz: A-high seco. Tu value (Ax) vs su aire/pares débiles. C-bet value.'),
    Fl('c29-08', 'HJ', ['Kc', 'Qc'], ['Jh', 'Ts', '9d'], 77308, 'Quiz: JT9. Bandas del caller: muchos two-pair/straight. Pot control.', { trapTag: 'fancy_play' }),
    V('c29-09', 'BB_vs_BTN', ['Ad', '5d'], 77309, 'Quiz: polar vs BTN = value (QQ+) + faroles (Axs). A5s es la banda farol.', cash({ scenario: '3bet' })),
    R('c29-10', 'UTG', ['7c', '2d'], 77310, 'Quiz: RFI UTG no contiene 72o. Fold — escribe la banda tight.', cash(), 'dominated'),
    Fl('c29-11', 'BTN', ['9h', '8h'], ['Ad', '6c', '2s'], 77311, 'Quiz: A-high seco. Caller: Ax limitado, mucho aire. C-bet ligero OK.'),
    V('c29-12', 'BB_vs_BTN', ['Qs', 'Qd'], 77312, 'Quiz: QQ es banda value vs open late. 3-bet. No “una mano contra la suya”.', cash({ scenario: '3bet' }))
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
    F3('c31-01', 'BTN_vs_BB', ['As', 'Ad'], 77501, 'Examen Pro: AA vs 3-bet — 4-bet value.', cash({ scenario: 'face3bet' })),
    F3('c31-02', 'BTN_vs_BB', ['7c', '2d'], 77502, '72o vs 3-bet: fold.', cash({ scenario: 'face3bet' }), 'dominated'),
    Fl('c31-03', 'SB', ['Ah', 'Kd'], ['8s', '7s', '6h'], 77503, 'SRP OOP wet: check. Pot control deep.', { trapTag: 'fancy_play' }),
    Fl('c31-04', 'BTN', ['Ad', '2d'], ['As', '8h', '3c'], 77504, 'Vs fish: c-bet value top pair.', { playConfig: cash({ villainLevel: 'fish', practiceStreet: 'flop' }) }),
    V('c31-05', 'BB_vs_UTG', ['Kd', 'Jd'], 77505, 'Range quiz: KJo vs UTG fold.', cash({ scenario: '3bet' }), 'fancy_play'),
    Fl('c31-06', 'BTN', ['Ah', 'Qd'], ['Ks', '7d', '2c'], 77506, 'Node lock: seco IP c-bet frecuente.'),
    F3('c31-07', 'BTN_vs_BB', ['Ad', '5d'], 77507, 'A5s 4-bet polar mixto.', cash({ scenario: 'face3bet' })),
    Fl('c31-08', 'SB', ['Ah', 'Kd'], ['As', '2d', '2c'], 77508, 'OOP A-paired: c-bet razonable.'),
    V('c31-09', 'BB_vs_BTN', ['Td', '8c'], 77509, 'Vs reg T8o: fold. Explotación.', cash({ scenario: '3bet', villainLevel: 'pro' }), 'fancy_play'),
    V('c31-10', 'BB_vs_BTN', ['Qs', 'Qd'], 77510, 'QQ vs BTN: 3-bet value. Bandas de rango.', cash({ scenario: '3bet' })),
    Fl('c31-11', 'BTN', ['Ah', 'Qd'], ['9s', '8s', '7h'], 77511, 'Wet: no autocbet. Frecuencias.', { trapTag: 'fancy_play' }),
    F3('c31-12', 'BTN_vs_BB', ['Kh', 'Kh'], 77512, 'KK 4-bet value. Checklist Pro cerrado.', cash({ scenario: 'face3bet' }))
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
