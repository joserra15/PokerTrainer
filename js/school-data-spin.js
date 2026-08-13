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
    var rfi = D.rfiSpot, vs = D.vsRfiSpot, iso = D.isoSpot, bb = D.bbVsSbLimpSpot;
    if (kind === 'SPIN_RFI_STEAL') return [
      rfi('s01-01', 'BTN', ['Ah', 'Td'], 40101, { teachBack: 'ATo BTN ~20 bb: shove (all-in) por valor. A esta profundidad no min-raisees premium offsuit — shove o fold.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-02', 'BTN', ['7c', '2d'], 40102, { trapTag: 'dominated', teachBack: '72o: fold. No stealees basura total: si te pagan o te re-suben, la mano casi nunca aguanta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-03', 'SB', ['Ks', 'Js'], 40103, { teachBack: 'KJs SB ~20 bb: open steal a ~2,5–3 bb (no shove). Mano media del rango — roba ciegas con sizing normal; shove reservado a premiums.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-04', 'SB', ['Qd', '8c'], 40104, { trapTag: 'fancy_play', teachBack: 'Q8o SB: fold. No estás en BTN: aquí el steal es más arriesgado porque quedarás OOP si te igualan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-05', 'BTN', ['9s', '9c'], 40105, { teachBack: '99 BTN ~20 bb: shove claro. Par medio fuerte en zona steal — quieres fold equity o ir all-in, no open min.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-06', 'BTN', ['8h', '7h'], 40106, { teachBack: '87s BTN ~20 bb: open steal a ~2,5 bb. Mano media con jugabilidad — roba ciegas sin commitear todo el stack.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-07', 'BTN', ['As', 'Kd'], 40107, { teachBack: 'AKo BTN ~20 bb: shove por valor. Premium claro — maximizas fold equity o vas all-in con equity alta.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-08', 'SB', ['7c', '2h'], 40108, { trapTag: 'dominated', teachBack: '72o SB: fold. Desde SB no stealees basura: quedarás OOP si te pagan.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-09', 'BTN', ['Kh', 'Qs'], 40109, { teachBack: 'KQs BTN ~20 bb: open min o shove mixto; aquí open steal ~2,5 bb es sólido con broadway suited.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-10', 'SB', ['As', '5s'], 40110, { teachBack: 'A5s SB ~20 bb: open steal razonable. As suited con jugabilidad; no es auto-shove como AA.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-11', 'BTN', ['Jc', 'Td'], 40111, { teachBack: 'JTo BTN: open steal frecuente a 20 bb. Broadway offsuit en botón — roba ciegas sin shove.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) }),
      rfi('s01-12', 'BTN', ['2c', '2d'], 40112, { trapTag: 'fancy_play', teachBack: '22 BTN ~20 bb: open min preferible a shove panic. Pareja baja quiere flop barato o robo; no commitees todo sin necesidad.', playConfig: spinCfg({ scenario: 'steal', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_VS_STEAL') return [
      vs('s02-01', 'BB_vs_BTN', ['As', 'Kd'], 40201, { teachBack: 'AKo vs steal BTN ~20 bb: 3-bet shove (all-in). Mano premium — no 3-bet pequeño que te deja en calle sin salida.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-02', 'BB_vs_BTN', ['7c', '2d'], 40202, { trapTag: 'dominated', teachBack: '72o BB: fold. No overdefiendas las ciegas con basura — en torneo corto un error elimina.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-03', 'BB_vs_SB', ['Qh', 'Js'], 40203, { teachBack: 'QJs vs steal SB ~20 bb: call o 3-bet shove según mezcla; no es auto-shove pero sí defiende. Fold sería demasiado tight.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-04', 'BB_vs_BTN', ['Ad', '5d'], 40204, { teachBack: 'A5s vs steal BTN: 3-bet shove de presión/farol frecuente. Blocker de as — castiga opens wide sin min-3bet.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-05', 'BB_vs_BTN', ['Td', '8c'], 40205, { trapTag: 'fancy_play', teachBack: 'T8o: fold típico vs steal. Dominada, OOP y stack corto — no hero-call.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-06', 'BB_vs_SB', ['9s', '9c'], 40206, { teachBack: '99 vs steal SB ~20 bb: 3-bet shove por valor. Par medio fuerte — shove, no 3-bet pequeño.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-07', 'BB_vs_BTN', ['Qs', 'Qd'], 40207, { teachBack: 'QQ vs steal BTN: 3-bet shove value claro. Par fuerte a 20 bb — quieres all-in o fold equity.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-08', 'BB_vs_BTN', ['Kh', '9c'], 40208, { trapTag: 'dominated', teachBack: 'K9o vs steal BTN: fold frecuente. Dominada y OOP — no overdefend.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-09', 'BB_vs_SB', ['Ah', 'Js'], 40209, { teachBack: 'AJs vs steal SB: 3-bet shove o continue sólido. Ax fuerte en spot corto.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-10', 'BB_vs_BTN', ['8h', '7h'], 40210, { teachBack: '87s vs steal BTN: call selectivo posible; no es auto-shove. Jugabilidad si el precio es bueno.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-11', 'BB_vs_BTN', ['As', 'Ah'], 40211, { teachBack: 'AA vs steal: 3-bet shove value. Quieres máximo valor o stack-off favorable.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) }),
      vs('s02-12', 'BB_vs_SB', ['Jd', '8c'], 40212, { trapTag: 'fancy_play', teachBack: 'J8o vs steal SB: fold. No hero-defiendas basura en Spin.', playConfig: spinCfg({ scenario: '3bet', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_EXAM_M0') return packSpots('SPIN_RFI_STEAL', D).slice(0, 7).concat(packSpots('SPIN_VS_STEAL', D).slice(0, 7));
    /* Spins 3-max: BTN actúa primero. No existe «SB limpea, hero BTN».
     * Iso válido: BB vs limp SB (BTN fold), o SB vs limp BTN. */
    if (kind === 'SPIN_ISO') return [
      bb('s04-01', ['Ah', 'Js'], 40401, { teachBack: 'AJs en BB vs limp de SB: iso (aislar). En Spin 3-max el BTN actúa primero; si ya foldó y el SB limpea, tú en BB aíslas con manos fuertes. Quieres heads-up con iniciativa, no check eterno con value.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-02', ['7c', '2d'], 40402, { trapTag: 'dominated', teachBack: '72o vs limp SB: check (opción gratis). No overiso con basura: ya estás en el bote. A stack corto aislar trash duele entero el torneo.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQs en SB vs limp de BTN: iso por valor. En 3-max el BTN puede limpear primero; desde SB castigas el limp con manos fuertes — heads-up con iniciativa, no limpear detrás.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-04', ['Qd', '8c'], 40404, { trapTag: 'fancy_play', teachBack: 'Q8o vs limp SB: check frecuente. No aísles manos frágiles que no mejoran bien postflop. Si no merecería open sin limp, tampoco merece iso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-05', ['9s', '9c'], 40405, { teachBack: '99 BB vs limp SB: iso claro. Par medio fuerte — aísla y cobra a limps wide.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-06', ['Jh', 'Td'], 40406, { teachBack: 'JTo vs limp SB: a menudo check. Offsuit marginal — no overiso desde BB.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-07', 'SB', 'BTN', ['As', 'Kd'], 40407, { teachBack: 'AKo en SB vs limp BTN: iso value. Premium — quieres heads-up con iniciativa.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-08', ['5c', '4d'], 40408, { trapTag: 'dominated', teachBack: '54o vs limp SB: check. No aísles conectores offsuit basura a stack corto.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-09', ['Ah', '5h'], 40409, { teachBack: 'A5s BB vs limp SB: iso razonable. Ax suited castiga limps y juega bien postflop.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      bb('s04-10', ['Kc', '9d'], 40410, { trapTag: 'fancy_play', teachBack: 'K9o vs limp SB: check frecuente. Frágil offsuit — no mereces iso automático.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) }),
      iso('s04-11', 'SB', 'BTN', ['Ts', 'Ts'], 40411, { teachBack: 'TT en SB vs limp BTN: iso value. Par fuerte — aísla y construye bote.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      bb('s04-12', ['8h', '7h'], 40412, { teachBack: '87s BB vs limp SB: iso selectivo OK. Conectores suited con plan; sizing ~3–4 bb, no shove.', playConfig: spinCfg({ scenario: 'bbvsb', stackDepth: 'bb20' }) })
    ];
    if (kind === 'SPIN_SHOVE' || kind === 'SPIN_PUSH') return [
      rfi('sp-01', 'BTN', ['As', 'Ts'], 40501, { teachBack: 'ATs con ~12 bb en BTN: shove (all-in) candidato. A esta profundidad un open pequeño suele ser peor que ir all-in o fold: ganas fold equity o vas a doblar con equity decente si te pagan.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-02', 'BTN', ['7c', '2d'], 40502, { trapTag: 'dominated', teachBack: '72o a ~12 bb: fold. No hagas panic shove (all-in por desesperación): no tienes fold equity real ni equity cuando te pagan. Espera un spot con historia.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-03', 'SB', ['Kh', 'Js'], 40503, { teachBack: 'KJs SB ~10 bb: shove frecuente. Stack corto + ciegas ya en juego = zona push/fold. No abras min «como cash»; o all-in o fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-04', 'BTN', ['9s', '9c'], 40504, { teachBack: '99 a 10–12 bb: shove por valor claro. Par medio fuerte en push/fold — quieres doblar o robar ciegas, no open min que te deja mal stacked ante un 3-bet.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-05', 'BTN', ['Ah', 'Kd'], 40505, { teachBack: 'AKo ~12 bb: shove value. Premium — no min-raise en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-06', 'SB', ['Qd', '8c'], 40506, { trapTag: 'fancy_play', teachBack: 'Q8o SB ~10 bb: fold. No panic shove con basura OOP.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-07', 'BTN', ['As', '5s'], 40507, { teachBack: 'A5s BTN ~10–12 bb: shove frecuente. Ax suited con fold equity en push/fold.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-08', 'BTN', ['Jh', 'Td'], 40508, { teachBack: 'JTo BTN ~12 bb: shove o fold según chart; a menudo shove desde botón corto.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-09', 'SB', ['7c', '2h'], 40509, { trapTag: 'dominated', teachBack: '72o SB corto: fold. Sin equity ni fold equity real.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-10', 'BTN', ['Qs', 'Qd'], 40510, { teachBack: 'QQ ~10 bb: shove value claro. Par fuerte — all-in, no open min.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-11', 'SB', ['Kh', 'Ts'], 40511, { teachBack: 'KTs SB ~10 bb: shove frecuente. Broadway suited en zona push.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-12', 'BTN', ['8c', '7c'], 40512, { teachBack: '87s BTN ~12 bb: shove candidato wide desde botón. Conector suited con fold equity.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb12' }) }),
      rfi('sp-13', 'BTN', ['2h', '2d'], 40513, { teachBack: '22 BTN ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas desde botón.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) }),
      rfi('sp-14', 'SB', ['Ad', '9c'], 40514, { teachBack: 'A9o SB ~10 bb: shove frecuente. Ax offsuit entra en muchos charts SB cortos.', playConfig: spinCfg({ scenario: 'push', stackDepth: 'bb10' }) })
    ];
    if (kind === 'SPIN_EXAM_M1') return packSpots('SPIN_ISO', D).slice(0, 6).concat(packSpots('SPIN_SHOVE', D).slice(0, 8));
    if (kind === 'MTT_EARLY') return [
      rfi('t01-01', 'BTN', ['Ah', 'Td'], 50101, { teachBack: 'ATo en BTN early (~40 bb): open cash-like claro. Estás en late con una broadway fuerte; quieres robar o jugar un pot manejable, no limpear ni ir all-in sin necesidad.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-02', 'UTG', ['Qd', '8c'], 50102, { trapTag: 'dominated', teachBack: 'Q8o UTG early: fold. Hay mucha gente detrás y la mano se domina fácil; early pide paciencia, no forzar basura desde early position.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-03', 'CO', ['Ks', 'Js'], 50103, { teachBack: 'KJs CO early: open estándar. Buena broadway suited en late-ish; construyes stack con iniciativa sin spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-04', 'UTG', ['7h', '2d'], 50104, { trapTag: 'dominated', teachBack: '72o: fold siempre aquí. Sin equity real ni jugabilidad; abrirlo early es spew puro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-05', 'BTN', ['9s', '9c'], 50105, { teachBack: '99 BTN early: open claro. Par medio fuerte en posición — quieres robar ciegas o ver flop barato con iniciativa, no limpear.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-06', 'HJ', ['Ah', '5d'], 50106, { trapTag: 'fancy_play', teachBack: 'A5o HJ early: a menudo fold — no spew. Ax offsuit bajo en middle early no merece open automático.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-07', 'CO', ['As', 'Kd'], 50107, { teachBack: 'AKo CO early: open claro. Premium — construyes stack con valor e iniciativa.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-08', 'UTG', ['Jh', 'Td'], 50108, { trapTag: 'dominated', teachBack: 'JTo UTG early: fold típico. Demasiada gente detrás para esta broadway offsuit.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-09', 'BTN', ['8h', '7h'], 50109, { teachBack: '87s BTN early: open razonable. Conectores suited en posición — cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-10', 'HJ', ['Qs', 'Qd'], 50110, { teachBack: 'QQ HJ early: open value. Par fuerte — no limpees ni juegues raro.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-11', 'CO', ['Kd', '9c'], 50111, { trapTag: 'fancy_play', teachBack: 'K9o CO early: a menudo fold. Offsuit frágil mid-late early — no spew.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) }),
      rfi('t01-12', 'BTN', ['Ah', '5s'], 50112, { teachBack: 'A5s BTN early: open claro. Ax suited en botón — open cash-like.', playConfig: mttCfg({ mttPhase: 'early', stackDepth: 'bb40' }) })
    ];
    if (kind === 'MTT_EXAM_M0') return packSpots('MTT_EARLY', D).slice(0, 12);
    if (kind === 'MTT_STEAL') return [
      rfi('t04-01', 'BTN', ['Kh', '9s'], 50401, { teachBack: 'K9o BTN mid (~25 bb): steal razonable. Late position + ante: open para robar ciegas sin shove aún.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-02', 'BTN', ['7c', '2d'], 50402, { trapTag: 'dominated', teachBack: '72o: fold. Ni en mid stealees basura total — si te 3-betean estás perdido.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-03', 'CO', ['As', '5s'], 50403, { teachBack: 'A5s CO mid: steal/open OK. Ax suited con plan si te 3-betean.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-04', 'SB', ['Qd', 'Td'], 50404, { teachBack: 'QTs SB mid: open/steal frecuente. Tight-er que BTN pero esta mano entra.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-05', 'CO', ['Jd', '8c'], 50405, { trapTag: 'fancy_play', teachBack: 'J8o CO: fold típico. No stealees basura mid desde CO.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-06', 'BTN', ['8h', '7h'], 50406, { teachBack: '87s BTN mid: steal con jugabilidad. Conectores suited — open, no shove aún a 25 bb.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-07', 'BTN', ['As', 'Jd'], 50407, { teachBack: 'AJo BTN mid: steal claro. Broadway en botón con ante — open estándar.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-08', 'SB', ['7c', '2h'], 50408, { trapTag: 'dominated', teachBack: '72o SB mid: fold. OOP y basura — no robés.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-09', 'CO', ['9s', '9c'], 50409, { teachBack: '99 CO mid: open/steal value. Par medio — quieres iniciativa.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-10', 'BTN', ['Qd', '9c'], 50410, { teachBack: 'Q9o BTN mid: steal frecuente. En botón mid se abre más wide.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-11', 'SB', ['Kh', 'Js'], 50411, { teachBack: 'KJs SB mid: open steal razonable. Broadway suited; plan si BB 3-betea.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      rfi('t04-12', 'CO', ['5h', '4d'], 50412, { trapTag: 'fancy_play', teachBack: '54o CO: fold. No stealees conectores offsuit basura mid.', playConfig: mttCfg({ scenario: 'steal', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_3BET' || kind === 'MTT_RESTEAL') return [
      vs('t05-01', 'BB_vs_BTN', ['As', 'Kd'], 50501, { teachBack: 'AKo: 3-bet value vs steal mid. Premium — presión o valor claro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-02', 'BB_vs_BTN', ['Ad', '4d'], 50502, { teachBack: 'A4s: 3-bet polar/farol frecuente vs steal BTN. Blocker de as.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-03', 'BB_vs_CO', ['7c', '2d'], 50503, { trapTag: 'dominated', teachBack: '72o: fold. No overdefend ni 3-bet spew.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-04', 'BB_vs_BTN', ['Qh', '9c'], 50504, { trapTag: 'fancy_play', teachBack: 'Q9o: no 3-bet spew. Fold vs steal a menos que el chart diga call mixto raro.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-05', 'BB_vs_BTN', ['Qs', 'Qd'], 50505, { teachBack: 'QQ vs steal: 3-bet value. Par fuerte mid — construye bote o aísla.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-06', 'BB_vs_SB', ['Kh', 'Js'], 50506, { teachBack: 'KJs vs SB steal: defensa/3-bet razonable. Broadway suited.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-07', 'BB_vs_BTN', ['Td', '8c'], 50507, { trapTag: 'dominated', teachBack: 'T8o vs steal: fold. Dominada y OOP.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-08', 'BB_vs_CO', ['Ah', '5s'], 50508, { teachBack: 'A5s vs CO: 3-bet polar frecuente. Castiga opens mid con blockers.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-09', 'BB_vs_BTN', ['9s', '9c'], 50509, { teachBack: '99 vs steal BTN: 3-bet o call sólido. Par medio — no fold automático.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-10', 'BB_vs_BTN', ['Jc', 'Tc'], 50510, { teachBack: 'JTs vs steal: call o 3-bet ligero. Conectores altos suited se defienden bien.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-11', 'BB_vs_SB', ['As', 'Ah'], 50511, { teachBack: 'AA vs steal SB: 3-bet value. Quieres máximo valor.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) }),
      vs('t05-12', 'BB_vs_CO', ['Kd', '9c'], 50512, { trapTag: 'fancy_play', teachBack: 'K9o vs CO: fold típico. No 3-bet spew mid con offsuit frágil.', playConfig: mttCfg({ scenario: '3bet', mttPhase: 'mid', stackDepth: 'bb25' }) })
    ];
    if (kind === 'MTT_EXAM_M1') return packSpots('MTT_STEAL', D).slice(0, 7).concat(packSpots('MTT_3BET', D).slice(0, 7));
    if (kind === 'MTT_SHORT' || kind === 'MTT_PUSH') return [
      rfi('t09-01', 'BTN', ['Ah', '5s'], 50901, { teachBack: 'A5o BTN a ~10–12 bb: shove candidato. Zona push/fold — no open min.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-02', 'BTN', ['7c', '2d'], 50902, { trapTag: 'dominated', teachBack: '72o: fold. No panic shove sin equity ni fold equity.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-03', 'SB', ['Ks', 'Ts'], 50903, { teachBack: 'KTs SB corto: shove frecuente. Push/fold limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-04', 'CO', ['9s', '9c'], 50904, { teachBack: '99: shove value. Par medio fuerte en short/push.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-05', 'BTN', ['As', 'Kd'], 50905, { teachBack: 'AKo ~12 bb: shove value. Premium — all-in, no min-raise.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) }),
      rfi('t09-06', 'SB', ['Qd', '8c'], 50906, { trapTag: 'fancy_play', teachBack: 'Q8o SB corto: fold. No shove basura OOP.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-07', 'BTN', ['Jh', 'Td'], 50907, { teachBack: 'JTo BTN ~10–12 bb: shove frecuente desde botón.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-08', 'CO', ['7c', '2h'], 50908, { trapTag: 'dominated', teachBack: '72o CO: fold. Early-ish short tampoco justifica basura.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-09', 'SB', ['As', '5s'], 50909, { teachBack: 'A5s SB ~10 bb: shove frecuente. Ax suited en push/fold.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-10', 'BTN', ['Qs', 'Qd'], 50910, { teachBack: 'QQ ~10 bb: shove value. Par fuerte — stack-off limpio.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-11', 'CO', ['Kh', 'Js'], 50911, { teachBack: 'KJs CO ~12 bb: shove candidato. Broadway suited short.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'short', stackDepth: 'bb12' }) }),
      rfi('t09-12', 'BTN', ['8h', '7h'], 50912, { teachBack: '87s BTN ~10 bb: shove wide desde botón. Fold equity + jugabilidad.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-13', 'SB', ['2c', '2d'], 50913, { teachBack: '22 SB ~10 bb: shove o fold según chart; muchas líneas shovean pares bajas SB.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb10' }) }),
      rfi('t09-14', 'BTN', ['Ad', '9c'], 50914, { teachBack: 'A9o BTN ~12 bb: shove frecuente. Ax offsuit en botón corto entra en charts.', playConfig: mttCfg({ scenario: 'push', mttPhase: 'push', stackDepth: 'bb12' }) })
    ];
    return [];
  }
  function resolveSpots(lesson, D) {
    if (typeof lesson.spots === 'string') lesson.spots = packSpots(lesson.spots, D);
    if (Array.isArray(lesson.spots) && lesson.spots.length) lesson.hands = lesson.spots.length;
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
      "concept": "Con 20–25 bb (ciegas grandes), desde BTN o SB robas ciegas (steal) con dos tamaños: shove (all-in) con manos fuertes y open ~2,5 bb con manos medias del rango GTO — no todo es min-raise.",
      "theory": [
        "Steal (robo de ciegas): open-raise esperando que todos folden. A 20–25 bb las ciegas son un % grande del stack; fold equity vale mucho.",
        "Dos tamaños a ~20 bb: premium y pares medios fuertes (99+, ATo+, KQs) suelen ir shove; suited connectors y broadways medias van open ~2,5 bb (3 bb desde SB).",
        "BTN vs SB: desde BTN robas más wide porque solo quedan SB y BB detrás. Desde SB abres más tight y con menos shoves marginales — si te pagan, juegas OOP.",
        "Trampa clásica: min-open con AK/99 a 20 bb o pagar un 3-bet shove con basura — en Spin perder el stack suele ser perder el torneo."
      ],
      "examples": [
        {
          "title": "Steal desde BTN",
          "body": "BTN con 22 bb y 99: shove all-in (fold equity + valor). Con 87s: open a ~2,5 bb — roba ciegas sin commitear todo el stack."
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
      "plan": "free",
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
      "plan": "free",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Repaso M0 sin vocabulario nuevo: anatomía del Spin (fichas ≠ euros), steal desde BTN/SB a ~20 bb y defensa desde BB. Aplica el checklist con calma antes de cada clic.",
      "theory": [
        {
          "title": "Identifica el spot",
          "body": "El examen mezcla dos trabajos mentales que ya viste. O estás robando ciegas (steal: abres tú para que SB y BB se tiren) o estás defendiendo la ciega grande cuando te abren. Antes de actuar, nombra en voz baja qué spot es: no uses el mismo rango mental para ambos."
        },
        {
          "title": "Stack en bb, no en cash",
          "body": "Mide el stack en ciegas grandes (bb). A ~20 bb los opens y los 3-bets son más agresivos que en cash a 100 bb: hay más fold equity (probabilidad de que el rival se tire) y menos margen para jugar postflop cómodo. Si piensas «como en cash», te vas a quedar corto de plan."
        },
        {
          "title": "Acción limpia",
          "body": "Las respuestas típicas son fold, open (subir primero) o 3-bet — a menudo shove (all-in). Recuerda: en un Spin perder el stack suele ser perder el torneo. No inventes min-raises raros ni hero-calls «porque puedo ganar»."
        },
        {
          "title": "Checklist rápido",
          "body": "Orden mental: posición → stack en bb → ¿busco fold equity o valor? → ejecuta sin spew (tirar fichas sin plan). Si dudas entre una jugada fancy y la jugada simple del chart, elige la simple."
        }
      ],
      "examples": [
        {
          "title": "Antes de clicar",
          "body": "Lee posición y stack antes de la mano. «BTN 22 bb, folds a ti» pide un rango de steal; «BB 20 bb vs steal BTN» pide defensa selectiva. Misma profundidad, distinto trabajo."
        },
        {
          "title": "Error típico del examen",
          "body": "Min-open con 99 o AKo a 20 bb «como en cash», o hacer call light desde BB con basura dominada. En M0 Spins, premium corto suele ir shove; basura se tira."
        },
        {
          "title": "Una frase para aprobar",
          "body": "Si eres el primero en entrar a ~20 bb, piensa steal (shove o open ~2,5 bb). Si te abren en BB, piensa fold / hacer call / 3-bet shove — no overdefiendas."
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
      "concept": "En Spin 3-max el BTN actúa primero: el limp llega desde BTN (y a veces SB detrás) o desde SB si el BTN ya foldó. Aíslas desde SB o BB con un iso-raise: heads-up con manos fuertes. A stack corto no overiso con basura ni limpeas tú sin plan.",
      "theory": [
        {
          "title": "Qué es limpear e iso",
          "body": "Limpear es igualar la BB para ver flop barato, sin iniciativa. Iso (aislar) es subir por encima del limp para que, idealmente, solo el limper pague y tú lleves la iniciativa heads-up. Castigas el limp recreativo y evitas el pot multiway (varios jugadores) fuera de posición."
        },
        {
          "title": "Orden en Spin 3-max",
          "body": "BTN → SB → BB. El SB no puede limpear «antes» del BTN. Spots reales: BTN limpea y tú iso desde SB; o BTN folda, SB limpea y tú en BB eliges check o iso. No inventes un limp del SB con héroe en BTN: ese spot no existe."
        },
        {
          "title": "Sizing y profundidad",
          "body": "El iso debe ser lo bastante grande para aislar, pero a 15–20 bb no metas el stack entero «sin querer». Buscas un pot manejable con una mano que domina rangos de limp wide (Ax suited, broadways, pares medios+). Si el sizing te deja committed con basura, el plan ya falló preflop."
        },
        {
          "title": "Qué manos iso (y cuáles no)",
          "body": "Iso con manos que quieres heads-up con ventaja: AJs, KQs, 99+, broadways fuertes. Desde BB con basura (72o, Q8o): check, no aísles «porque limpearon». Overiso trash te deja multiway dominado o pagando un shove sin equity real."
        },
        {
          "title": "Trampa: limpear tú detrás",
          "body": "Limpear detrás de un limp a stack corto suele regalar ciegas o meterte multiway OOP (fuera de posición). Si la mano no merece iso, fold (desde SB) o check (desde BB). Open/iso o tirar — no «ver barato» sin plan en un Spin."
        }
      ],
      "examples": [
        {
          "title": "Iso clásico desde BB",
          "body": "BTN folda, SB limpea, tú BB con AJs a ~20 bb: iso a ~3–4 bb. Quieres heads-up contra un rango de limp débil, con iniciativa y una mano que domina muchas de sus combinaciones."
        },
        {
          "title": "Check correcto vs limp",
          "body": "BB con 72o vs limp SB: check. No hay valor en aislar: no dominas nada y ya estás en el bote con opción gratis."
        },
        {
          "title": "KQs desde SB vs limp BTN",
          "body": "BTN limpea corto y tú SB con KQs: iso por valor. Mano fuerte, quieres bote heads-up con iniciativa — no hacer call flat detrás del limp."
        }
      ],
      "aiQuestions": [
        "¿Qué manos iso desde BB vs limp de SB en Spin?",
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
      "concept": "Con stacks cortos (~10–15 bb), el 3-bet correcto suele ser shove (all-in), no una resubida pequeña que te deja en calle sin stack útil. Flat (hacer call al open) casi no existe aquí.",
      "theory": [
        {
          "title": "Umbral de stack-off",
          "body": "Por debajo de ~15–20 bb (según el spot), un 3-bet pequeño te deja con poquísimas bb detrás y decisiones imposibles en turn/river. El 3-bet shove es más limpio: o doblas, o el rival se tira, o vas all-in con un plan cerrado preflop."
        },
        {
          "title": "Shove value y farol",
          "body": "Shove por valor con Ax fuerte, pares medios+ y premiums. Algunos Ax suited (con blockers: cartas que restan combinaciones fuertes al rival) entran como shove de presión. Flat — hacer call al open para ver flop barato — solo tiene sentido con manos que realmente quieren flop barato; a esta profundidad casi no las hay."
        },
        {
          "title": "Open shove y push/fold",
          "body": "Desde BTN/SB a ~10 bb entras en zona push/fold (lo profundizamos en S-09): no min-raisees «como en cash». Un open min a 10 bb suele ser leak: poco fold equity y mal committed si te 3-betean."
        },
        {
          "title": "Trampas a evitar",
          "body": "3-bet pequeño spew (fichas sin plan) o flat dominado vs open short: te quedas con 5 bb OOP y sin fold equity. Si no es shove claro ni fold claro, no inventes el medio."
        }
      ],
      "examples": [
        {
          "title": "3-bet shove vs open",
          "body": "Alguien abre a 12 bb y tú BTN con 99: shove suele ser mejor que 3-bet a 3 bb. Quieres doblar limpio o que folden; no quieres un pot extraño con stack residual inútil."
        },
        {
          "title": "No flat dominado",
          "body": "Steal a 14 bb, tú BB con K9o: fold o, como mucho, shove muy selectivo según el rival. Hacer call OOP con mano dominada rara vez es correcto a esta profundidad."
        },
        {
          "title": "Premium = all-in",
          "body": "BB vs steal SB con AKo a 15 bb: 3-bet shove. Un 3-bet pequeño deja al rival hacer call wide y a ti jugando un stack corto sin salida clara."
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
      "concept": "Chip lead (más fichas que los rivales): puedes presionar ciegas y opens flojos, pero no pagues shoves light solo porque «tengo más fichas». Recuerda fichas ≠ euros (ICM).",
      "theory": [
        {
          "title": "Cover vs short",
          "body": "Si eres el stack más grande (cover), aplicas presión: steals, iso, 3-bets. Quieres robar ciegas o poner al short en decisiones difíciles. El lead te da fold equity extra porque el rival arriesga su torneo al pegarte."
        },
        {
          "title": "No suicides el lead",
          "body": "Hacer call shove light vs short «porque soy favorito en equity» puede ser ICM suicide: pierdes el torneo y el 2.º puesto no paga igual que el 1.º. Chip EV (valor solo en fichas) no es lo mismo que € esperados según el payout."
        },
        {
          "title": "Objetivo con cover",
          "body": "Acumula fichas sin regalar dobles fáciles. Presiona spots donde el short folda mucho; foldea cuando su shove representa value claro. El lead se usa para robar, no para hero-call por orgullo."
        },
        {
          "title": "Trampa mental",
          "body": "Confundir «tengo más fichas» con «debo pagar todo» es el leak clásico del chip leader en Spins. El payout manda: a veces fold con cover es la jugada profesional."
        }
      ],
      "examples": [
        {
          "title": "Presión con cover",
          "body": "Short tiene 8 bb, tú 25 bb en BTN: steal wide. El short no puede defenderte todas las manos; muchas veces te regala las ciegas sin showdown."
        },
        {
          "title": "Fold con cover",
          "body": "Short shove 10 bb desde SB, tú BB cover con A9o cerca del dinero: a menudo fold es correcto. Eliminarlo es bonito en fichas, pero bustarte a ti mismo cuesta el premio."
        },
        {
          "title": "Cuándo sí pagas",
          "body": "Short shove 7 bb y tú BB con 99 o AKo: ahí sí haces call — equity alta y eliminar rival acerca al 1.º. No es light; es value claro."
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
      "concept": "Short stack (pocas bb): necesitas fichas para llegar al payout, pero no cualquier all-in. Elige double-up (doblar) claros con fold equity o equity decente; evita panic shove.",
      "theory": [
        {
          "title": "Short vs cover",
          "body": "El rival tiene más fichas y puede eliminarte. Tu shove debe ser selectivo: manos que foldan a menudo (fold equity) o que van razonablemente bien cuando te pagan. No eres un cash game a 100 bb — cada all-in decide el torneo."
        },
        {
          "title": "Sobrevive y elige spots",
          "body": "A veces fold es correcto aunque «necesites fichas». Perder todo en un flip malo = 0 €. Survive + pick spots: esperas un shove con historia (posición, fold equity, mano decent) en lugar de tirarte con basura por ansiedad."
        },
        {
          "title": "Fold equity del short",
          "body": "Si shoveas y todos folden, ganas el bote sin showdown — vital cuando eres short. Por eso BTN/SB a 8–12 bb shovean más wide que en early: las ciegas ya están en juego y el fold equity paga."
        },
        {
          "title": "Trampa: panic shove",
          "body": "Panic shove con basura vs un cover que paga wide te elimina sin EV real. Si la mano no tiene fold equity ni equity, fold y espera el siguiente spot — aunque duela el reloj de ciegas."
        }
      ],
      "examples": [
        {
          "title": "Shove con fold equity",
          "body": "10 bb en BTN, folds hasta ti: shove A5s. Si folden, ganas ciegas; si te pagan, aún tienes equity y blockers. Es un double-up candidato, no desesperación."
        },
        {
          "title": "Fold para sobrevivir",
          "body": "8 bb en BB, cover shove desde SB: fold 65o aunque «necesites fichas». Estás dominado, sin fold equity (él ya está all-in) y el call es solo orgullo."
        },
        {
          "title": "No min-raise short",
          "body": "Con 9 bb en SB no abras a 2 bb «por ver». Push/fold: shove manos del chart o fold. El open min te deja sin plan si hacen call o te resuben."
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
      "concept": "Repaso M1: iso vs limp, 3-bet shove, chip lead y short vs cover. Examen = mezcla de esos spots sin teoría nueva. Más decisiones binarias (shove/fold) que en M0.",
      "theory": [
        {
          "title": "¿Hay limp en mesa?",
          "body": "Si alguien limpea, iso con manos fuertes y fold basura. No regales pot multiway ni overiso trash. La pregunta útil es si quieres heads-up con esa mano, no si «puedes ver flop» barato."
        },
        {
          "title": "¿Te abren en zona corta?",
          "body": "A ~10–15 bb responde con 3-bet shove o fold. Evita el 3-bet pequeño que te deja sin stack útil. Flat (hacer call) dominado OOP es trampa de examen."
        },
        {
          "title": "¿Eres cover o short?",
          "body": "Cover: presiona steals e iso; no hero-call shoves light. Short: elige shoves con fold equity o equity, no panic. El rol (quién tiene más fichas) cambia el plan aunque la mano sea la misma."
        },
        {
          "title": "Antes de actuar",
          "body": "Anota mentalmente: stack en bb + posición + rol (steal / defensa / iso / push) + ¿cover o short? Luego ejecuta. Si no puedes nombrar el rol en una frase, párate un segundo."
        }
      ],
      "examples": [
        {
          "title": "Checklist del examen",
          "body": "Lee stack y si hay limp u open antes de clicar. M1 Spins premia acciones binarias claras: iso o fold, shove o fold — menos «inventar» que en cash profundo."
        },
        {
          "title": "Misma mano, distinto rol",
          "body": "A9o: como cover vs short shove cerca del dinero a menudo fold; como short en BTN a 10 bb a menudo shove. El examen mira si leíste el contexto, no solo las cartas."
        },
        {
          "title": "Error M1 típico",
          "body": "Iso con Q8o «porque limp», o 3-bet a 2,5× con 99 a 12 bb. Ambos son leaks que M1 castiga: basura no se aísla; corto se shovea o se tira."
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
      "concept": "Entre 12 y 8 bb entras en push/fold: casi no hay open pequeño. Decides shove (all-in) o fold según charts de stack corto — el min-raise estilo cash es leak.",
      "theory": [
        {
          "title": "Qué es push/fold",
          "body": "Con stack muy corto, un min-raise deja poco fold equity y te commitea mal si te resuben. La regla práctica es binaria: all-in o fold. Shove = poner todas las fichas de una vez; no confundas con open a 2 bb."
        },
        {
          "title": "Posición en 3-max",
          "body": "BTN shovea más wide que las posiciones «tempranas» del Spin (quien habla primero). Desde BTN vs blinds el steal es el más loose; desde SB aún shoveas wide pero el BB defiende mejor. Usa el menú Rangos / charts push-fold como referencia."
        },
        {
          "title": "Por qué no min-raise a 10 bb",
          "body": "Open min a 10 bb «como cash» y fold al 3-bet: pierdes ciegas e iniciativa. Si la mano merece entrar, suele merecer shove; si no, fold. El medio te deja con 7–8 bb y sin plan."
        },
        {
          "title": "Trampa de zona gris",
          "body": "Manos medias offsuit en primera voz (equivalente UTG/HJ en 3-max) a menudo son fold aunque en BTN serían shove. Peor fold equity y peor precio cuando te pagan. No copies el chart de BTN a todas las sillas."
        }
      ],
      "examples": [
        {
          "title": "Push desde BTN",
          "body": "10 bb BTN, folds a ti: shove KTs. O robas las ciegas, o vas all-in con equity decente si hacen call. Open a 2 bb aquí suele ser peor."
        },
        {
          "title": "Fold en zona gris",
          "body": "9 bb first-in (no BTN): Q9o often fold. Tienes peor fold equity que en botón y muchas manos te dominan cuando te pagan."
        },
        {
          "title": "Par medio = shove value",
          "body": "99 a 10–12 bb en BTN: shove por valor claro. Quieres doblar o robar; no «ver flop barato» con un open min que te deja mal stacked."
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
      "concept": "Cuando te shovean, el call correcto suele ser más tight que el «chip EV» (valor solo en fichas): el ICM castiga arriesgar tu torneo por un flip. Overfold vs shove suele ser correcto en Spins.",
      "theory": [
        {
          "title": "Chip EV vs ICM",
          "body": "Chip EV mira solo fichas ganadas o perdidas a largo plazo. ICM (Independent Chip Model) traduce stacks y payout (primero, segundo, tercero) a euros esperados. En Spins, un call que gana fichas en promedio puede perder € porque el bust te deja a cero."
        },
        {
          "title": "Qué manos hacen call",
          "body": "Haces call shove con manos fuertes: pares altos, Ax fuerte. Fold muchas manos medias que en cash a 100 bb pagarías (A9o, KQo marginal). Hero-call — pagar «porque puedo ganar» sin mirar el payout — es la trampa ICM."
        },
        {
          "title": "Short vs cover al shove",
          "body": "Vs shove del short a veces pagas un poco más wide: eliminarlo te da € y arriesgas menos de tu stack relativo. Vs shove del cover, más tight: te juegas el torneo entero contra un stack que te elimina."
        },
        {
          "title": "Regla práctica",
          "body": "Si dudas entre hacer call y fold cerca del dinero, inclínate a fold salvo que la mano sea claramente fuerte. En Spins el overfold vs shove no es «debilidad»: es disciplina de payout."
        }
      ],
      "examples": [
        {
          "title": "Fold ICM correcto",
          "body": "Cover te shovea, tú con 22 bb y AJo: a veces fold es mejor que flip. Quedarte vivo hacia el 2.º paga algo; bust = 0 € aunque fueras favorito en fichas."
        },
        {
          "title": "Call vs short",
          "body": "Short shove 7 bb, tú BB con 99: hacer call claro. Equity alta y eliminar rival acerca al 1.º — aquí chip EV e ICM apuntan al mismo lado."
        },
        {
          "title": "No hero-call",
          "body": "Shove desde BTN a 12 bb, tú BB con KTo: fold típico. Dominada, sin odds de payout claras — «puedo ganar» no es argumento ICM."
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
      "concept": "A veces un call gana fichas en promedio (+EV chips) pero pierde dinero de torneo (−EV $). Aprende a oler esos spots antes de pagar: el pay jump decide.",
      "theory": [
        {
          "title": "+EV chips / −EV $",
          "body": "Ganas fichas a largo plazo pero reduces tu premio esperado en euros porque arriesgas eliminación cerca del dinero. El spot se ve «correcto» en equity de cartas y es incorrecto en payout. Spins viven de detectar esa trampa."
        },
        {
          "title": "Pay jump",
          "body": "Pay jump es el salto de premio entre puestos (segundo vs primero, o cobrar vs bust). Cuanto mayor el salto, más caro es flippear. En 3-max cada eliminación mueve € de verdad, no solo fichas de vanity."
        },
        {
          "title": "Prioriza supervivencia cuando pesa",
          "body": "Cuando el payout aprieta, fold manos que «van bien en fichas» pero no justifican el bust. No necesitas ser el favorito al 55 % si perder te saca del dinero grande."
        },
        {
          "title": "ICM suicide",
          "body": "ICM suicide: hacer call shove light porque «soy 55 % favorito» ignorando que bust = perder la entrada entera. No preguntes solo si ganas el flip; pregunta cuánto € arriesgas frente a cuánto ganas."
        }
      ],
      "examples": [
        {
          "title": "Spot +EV chips / −EV $",
          "body": "3-max, el 2.º ya tiene sentido de premio, tú mid-stack con 18 bb haces call al shove de cover con A8s: puede ser +chips y −€ si el bust te cuesta el segundo premio grande."
        },
        {
          "title": "Oler el mal spot",
          "body": "Si tu argumento para pagar es solo «tengo outs / soy ligero favorito» y no has mirado stacks ni multiplicador, párate. Ese olor suele ser −EV $ disfrazado de valentía."
        },
        {
          "title": "Cuándo sí está alineado",
          "body": "Short shove tiny, tú con TT+ o AK: chip EV e ICM suelen coincidir. El problema son los calls marginales (A9o, KQo, pares bajos) cerca del pay jump."
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
      "concept": "Payout 5× (premio total cinco veces las entradas) aprieta más que 2×/3×: juegas más tight — el 1.º pesa mucho y perder el 2.º duele más. Misma mano, distinto multiplicador.",
      "theory": [
        {
          "title": "Multiplicador y € en juego",
          "body": "La ruleta del Spin (2× / 3× / 5×) cambia cuánto dinero hay en el prize pool. En 5× el 1.º se lleva una parte mayor: el ICM es más fuerte. Guarda ese dato mental desde la mano 1; no es decoración de lobby."
        },
        {
          "title": "Cómo ajustar",
          "body": "En 5×: menos steals locos, más tight vs shove, menos flips marginales. En 2×: algo más de chip EV permitido — aún no es cash, pero el castigo ICM es menor. El error caro es jugar igual el spin de 2× que el de 5×."
        },
        {
          "title": "Misma mano, distinto payout",
          "body": "AJo haciendo call a un shove puede ser razonable en 2× y fold en 5×. No cambian tus cartas: cambia el precio en euros de equivocarte. Entrena esa pregunta: «¿qué multiplicador salió?»."
        },
        {
          "title": "Trampa de lobby",
          "body": "Ignorar el multiplicador y repetir el mismo chart mental en todos los Spins es leak muy caro en lobbies reales. Mira la ruleta; luego elige tightness."
        }
      ],
      "examples": [
        {
          "title": "5× más tight",
          "body": "La ruleta mostró 5× antes de empezar: si dudas entre shove marginal y fold, inclínate a fold. Si dudas entre hacer call marginal y fold vs shove, fold otra vez."
        },
        {
          "title": "2× un poco más flexible",
          "body": "En 2× puedes robar y pagar un poco más wide que en 5×, pero sigue sin ser cash: bust = 0 €. Flexibilidad no es spew."
        },
        {
          "title": "Checklist pre-mano",
          "body": "Antes del primer steal del torneo: ¿2×, 3× o 5×? Ese número fija cuánto aprietas calls y shoves grises el resto de la mesa."
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
      "concept": "Examen ICM Spins: push/fold, call shove, spots +EV chips vs −EV $ y ajuste por payout 2×/3×/5×. Sin teoría nueva — solo aplicar el checklist de M2.",
      "theory": [
        {
          "title": "Fichas o euros",
          "body": "Pregunta clave en cada spot: ¿decido mirando solo fichas (chip EV) o el premio en euros (ICM)? Si no puedes responder en una frase, no hagas call todavía."
        },
        {
          "title": "¿Stack ≤12 bb?",
          "body": "Entra push/fold: shove (all-in) o fold. No min-raise estilo cash. El examen castiga el open pequeño que te deja sin plan ante un 3-bet."
        },
        {
          "title": "¿Multiplicador?",
          "body": "2×/3× vs 5× cambia tightness en calls y steals marginales. En 5×, ante la duda, fold. El multiplicador no es opcional: es parte del spot."
        },
        {
          "title": "Checklist del examen",
          "body": "Stack en bb → rol cover/short → payout → fold / shove / hacer call. Nombra el rango rival en una frase antes de pagar un shove. Cero vocabulario nuevo: solo disciplina."
        }
      ],
      "examples": [
        {
          "title": "Antes del examen",
          "body": "Repasa S-09…S-12: push/fold limpio, overfold vs shove, oler −EV $, 5× más tight. Si esos cuatro bloques están claros, el examen es aplicación."
        },
        {
          "title": "Spot trampa del examen",
          "body": "Te shovean, tienes A9o, eres mid-stack, payout 5×: muchas veces fold aunque «en fichas» el call se vea decente. El examen mira si leíste ICM, no solo equity."
        },
        {
          "title": "Spot limpio",
          "body": "10 bb BTN first-in con ATs o 99: shove. No hay drama ICM que justifique min-raise. Binario y limpio."
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
      "concept": "Bubble factor (presión de «burbuja»): mide cuánto duele arriesgar fichas cerca de un salto de pago. En Spin 3-max el heads-up (HU) ya es un pay jump decisivo — no flippees barato el 2.º.",
      "theory": [
        {
          "title": "Qué es bubble en 3-max",
          "body": "Bubble es la zona donde un bust te deja sin € (o te baja de premio) mientras otro jugador cobra. En Spin 3-max, pasar de tercero a segundo o de segundo a primero ya es bubble mental: no hace falta mesa de 100 runners para sentir la presión."
        },
        {
          "title": "Pay jump heads-up",
          "body": "En heads-up (dos jugadores) el premio del primero frente al segundo puede repartir cerca de 70/30 según multiplicador. No es indiferente flippear: un 50/50 en fichas puede ser un mal negocio en euros si el salto de premio es grande."
        },
        {
          "title": "Bubble factor alto",
          "body": "Cuando el bubble factor es alto → fold más, shove más selectivo. No regales el second place barato por «ganar el flip». Presiona spots baratos; evita all-ins que deciden el torneo sin edge claro."
        },
        {
          "title": "Trampa final",
          "body": "Ignorar el payout en el all-in que decide el torneo. Un flip puede costarte € aunque sea 50/50 en fichas. Antes de shove o hacer call HU, nombra el pay jump en voz baja."
        }
      ],
      "examples": [
        {
          "title": "HU pay jump",
          "body": "Heads-up: el 1.º gana mucho más que el 2.º. Un flip innecesario con A9o vs shove wide puede costarte la diferencia en € aunque ganes fichas a coin-flip."
        },
        {
          "title": "Presión correcta en bubble",
          "body": "Eres cover en 3-max cerca de eliminar al short: roba ciegas y fuerza decisiones. No hace falta hero-call su shove con manos medias — la presión ya trabaja por ti."
        },
        {
          "title": "Fold que duele y paga",
          "body": "HU, rival shove, tú con KJo en payout alto: a menudo fold. Duele, pero preservar el 2.º (o forzar mejor spot) vale más que el ego del call."
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
      "concept": "Range vs range: antes de shove o hacer call, piensa en bandas de manos (rangos), no solo «mi carta es bonita». Tu AK se mide contra el rango de shove rival, no contra «creo que tiene QQ».",
      "theory": [
        {
          "title": "Qué es un rango",
          "body": "Rango es el conjunto de manos que el rival puede tener en ese spot. Ejemplo: «BTN shove 10 bb» suele ser más wide (más manos) que «BB hace call vs ese shove». Nombrar el rango evita pelear contra una mano concreta imaginaria."
        },
        {
          "title": "Tu shove vs su call",
          "body": "Antes de shovear pregunta: ¿qué manos peores me pagan? ¿qué manos mejores me tienen? Si estás dominado a menudo cuando te hacen call, el shove era vanity. Fold equity + equity vs rango de call = la cuenta real."
        },
        {
          "title": "Call vs rango de shove",
          "body": "Range vs range en call shove: tu A5o desde BB no se mide vs «tal vez tenga 72o»; se mide vs el rango real de shove BTN (muchas Ax, pares, conectadas). A5o often fold — dominada por Ax mejores y por pares."
        },
        {
          "title": "Trampa de sensación",
          "body": "Decidir solo por «me gusta mi mano» sin nombrar el rango rival. En Spins cortos esa sensación te hace hero-call y panic shove. Oblígate a una frase: «él shovea X; yo contra X hago Y»."
        }
      ],
      "examples": [
        {
          "title": "Nombrar rangos",
          "body": "BTN shove 10 bb: muchas Ax, pares, suited connectors. BB call: más tight — pares medios+, Ax fuerte. Por eso A5o BB vs shove BTN often fold, y 99 hace call."
        },
        {
          "title": "AK vs rango, no vs QQ",
          "body": "Rival shove desde SB a 12 bb. Tu AKo no pregunta «¿y si tiene QQ?»; pregunta equity vs su rango de shove SB (que incluye muchas peores Ax y Kx). Suele ser call/shove value, no terror a una mano concreta."
        },
        {
          "title": "Shove con blockers",
          "body": "A5s shove desde BTN bloquea AA/AK del rival: ganas fold equity y algo de equity cuando te pagan. Ese razonamiento es range-based, no «me gusta el as»."
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
      "concept": "Explotación: vs nit (folda mucho) stealeas más; vs maniac (juega muchas manos agresivo) defiendes tighter y value-shoveas más limpio. Ajusta al rival real, no solo al chart ciego.",
      "theory": [
        {
          "title": "Vs nit",
          "body": "Nit: se tira demasiado vs steals y abre tight. Puedes abrir/steal más wide — cada fold suyo es fichas gratis hacia el payout. No necesitas GTO perfecto si el rival tira el 80 % de las ciegas."
        },
        {
          "title": "Vs maniac",
          "body": "Maniac: paga y shovea wide. Reduce faroles, value-shove más grueso (TT+, Ax fuerte) y no hagas bluffcatch light (pagar faroles con manos medias). Contra alguien que nunca folda, el bluff pierde sentido."
        },
        {
          "title": "Ajuste > chart ciego",
          "body": "Observa 10–20 manos del rival en lobby si puedes: ¿folda BTN steal? ¿paga light? ¿shovea cualquier Ax? El chart GTO es base; la explotación es el € extra cuando el leak es obvio."
        },
        {
          "title": "Trampa de libro",
          "body": "Jugar GTO de manual vs nit o maniac obvios deja dinero en la mesa. Si ves el leak y no ajustas, estás regalando EV por «parecer equilibrado» en un Spin de tres manos decisivas."
        }
      ],
      "examples": [
        {
          "title": "Vs nit",
          "body": "SB folda ~80 % vs steal BTN: abre wider. Cualquier fold es fichas hacia el payout sin showdown — castiga la pasividad."
        },
        {
          "title": "Vs maniac",
          "body": "BB paga y 3-betea light: aprieta opens marginales, shove value (TT+, AQo+) más often y deja de farolear thin. Que él spewee; tú cobra value."
        },
        {
          "title": "Lectura rápida",
          "body": "Tras dos steals: si ambos foldan, marca nit-leaning. Si te pagan o te shovean light, marca maniac-leaning. Ajusta la tercera mano — en Spins no hay 200 manos para confirmar."
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
      "concept": "Certificación Spin Pro: integra anatomía (fichas ≠ €), steal/defensa, iso, push/fold, ICM, payout y explotación. Sin vocabulario nuevo — plan completo en una mesa corta.",
      "theory": [
        {
          "title": "Mapa del spot",
          "body": "Repaso mental: ¿cuántas bb tengo? ¿Es steal, defensa BB, iso vs limp o push/fold? Si no puedes etiquetar el spot, no actúes todavía. El Pro nombra el trabajo antes de clicar."
        },
        {
          "title": "Cover, short y multiplicador",
          "body": "¿Soy cover (más fichas) o short? ¿El multiplicador fue 2×/3× o 5×? Eso cambia tightness de steals, shoves y calls. El mismo A9o no se juega igual en todos esos mundos."
        },
        {
          "title": "Fichas vs euros + rangos",
          "body": "¿Decido en fichas (chip EV) o en euros (ICM)? ¿Nombré el rango rival antes de hacer call o shove? Range vs range + payout > sensación de «carta bonita»."
        },
        {
          "title": "Checklist final",
          "body": "Posición → stack bb → payout → cover/short → acción sin spew ni hero-call. Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele."
        }
      ],
      "examples": [
        {
          "title": "Plan Pro en una frase",
          "body": "Sobrevive al payout correcto, presiona con cover, shove/fold limpio de short, overfold ICM cuando el pay jump duele, y explota nit/maniac cuando el leak es obvio."
        },
        {
          "title": "Pregunta de certificación",
          "body": "Te shovean en 5× con KQo mid-stack: ¿chip EV o ICM? Si respondes ICM y fold (salvo reads maniac extremos), estás pensando Pro. Si solo dices «puedo ganar», aún no."
        },
        {
          "title": "Spot de cierre",
          "body": "10 bb BTN, payout 3×, ATs: shove. No es examen de filosofía — es push/fold limpio. El Pro también sabe cuándo el spot es simple."
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
