/*
 * school-data-mtt.js — Fase H: MTT T-00…T-22
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
    if (kind === 'SPIN_ISO') return [
      iso('s04-01', 'BTN', 'SB', ['Ah', 'Js'], 40401, { teachBack: 'AJs en BTN vs limp de SB: iso (aislar). Subes para jugar heads-up contra el limper con una mano fuerte que domina muchos limps wide. No hagas call flat detrás — quieres iniciativa, no multiway.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-02', 'BTN', 'SB', ['7c', '2d'], 40402, { trapTag: 'dominated', teachBack: '72o vs limp: fold. No overiso (aislar de más) con basura: o te dejan en pot multiway o te pagan dominado. A stack corto ese error duele entero el torneo.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-03', 'SB', 'BTN', ['Kd', 'Qs'], 40403, { teachBack: 'KQs vs limp corto: iso por valor. Mano fuerte — quieres bote heads-up con iniciativa, no limpear detrás ni hacer call pasivo. Castiga el limp y juega con ventaja.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      iso('s04-04', 'BTN', 'SB', ['Qd', '8c'], 40404, { trapTag: 'fancy_play', teachBack: 'Q8o vs limp: fold frecuente. No aísles manos frágiles que no mejoran bien postflop y se dominan fácil. Si no merecería open sin limp, tampoco merece iso.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-05', 'BTN', 'SB', ['9s', '9c'], 40405, { teachBack: '99 BTN vs limp: iso claro. Par medio fuerte — aísla y cobra a limps wide.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-06', 'BTN', 'SB', ['Jh', 'Td'], 40406, { teachBack: 'JTo vs limp: a menudo fold o iso muy selectivo. Offsuit marginal — no overiso.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-07', 'SB', 'BTN', ['As', 'Kd'], 40407, { teachBack: 'AKo vs limp: iso value. Premium — quieres heads-up con iniciativa.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      iso('s04-08', 'BTN', 'SB', ['5c', '4d'], 40408, { trapTag: 'dominated', teachBack: '54o vs limp: fold. No aísles conectores offsuit basura a stack corto.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-09', 'BTN', 'SB', ['Ah', '5h'], 40409, { teachBack: 'A5s vs limp: iso razonable. Ax suited castiga limps y juega bien postflop.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-10', 'BTN', 'SB', ['Kc', '9d'], 40410, { trapTag: 'fancy_play', teachBack: 'K9o vs limp: fold frecuente. Frágil offsuit — no mereces iso automático.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) }),
      iso('s04-11', 'SB', 'BTN', ['Ts', 'Ts'], 40411, { teachBack: 'TT vs limp: iso value. Par fuerte — aísla y construye bote.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb15' }) }),
      iso('s04-12', 'BTN', 'SB', ['8h', '7h'], 40412, { teachBack: '87s vs limp: iso selectivo OK. Conectores suited con plan; sizing ~3–4 bb, no shove.', playConfig: spinCfg({ scenario: 'iso', stackDepth: 'bb20' }) })
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
    D.setRouteStatus('mtt', 'active');
  }
  var RAW = [
    {
      "route": "mtt",
      "module": "M0",
      "order": 0,
      "plan": "free",
      "xp": 40,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Un MTT (torneo multi-mesa) se juega por fases: early, mid, short, push y burbuja. El ante (pago extra obligatorio cada mano) y tu stack en bb (ciegas grandes) cambian el plan mucho antes de mirar las cartas.",
      "theory": [
        {
          "title": "Mapa de fases",
          "body": "Early suele ser 40–60+ bb: juego parecido al cash, con paciencia. Mid baja hacia 25–35 bb y empiezas a robar más. Short (aprox. 20–12 bb) fuerza opens o shoves; push (aprox. 12–8 bb) es casi solo shove o fold. Bubble (burbuja) es cuando faltan pocos para cobrar: el ICM (valor en dinero real de tus fichas según el payout) manda."
        },
        {
          "title": "Ante y bote muerto",
          "body": "El ante engorda el bote sin que nadie haya abierto. Eso sube la recompensa de un steal (robar ciegas) exitoso y hace que pasar de largo cueste más a largo plazo. No juegues \"sin ante\" cuando la mesa ya paga ante cada mano."
        },
        {
          "title": "Cuenta en bb, no en fichas absolutas",
          "body": "\"Tengo 12.000 fichas\" no decide nada hasta que divides por la ciega grande. Diez bb a ciegas altas es un short stack; cuarenta bb es early profundo. Antes de cada nivel, ancla: fase + stack en bb + quién es big/mid/short en tu mesa."
        },
        {
          "title": "Honestidad del curso",
          "body": "Aquí entrenamos principios de fases e ICM, no un solver de field de cientos de jugadores. Si entiendes el mapa mental, luego afinamos números; si no, las charts no te salvan."
        }
      ],
      "examples": [
        {
          "title": "Misma mano, distinta fase",
          "body": "K9o en BTN a 50 bb early: open estándar cash-like. La misma K9o a 11 bb en push: a menudo shove (ir all-in) o fold según chart — ya no es un open de 2,5 bb \"para ver flop\"."
        },
        {
          "title": "Ante que empuja el robo",
          "body": "Sin ante, robar SB+BB vale poco relativo a tu stack profundo. Con ante, el dead money (fichas ya en el bote) justifica steals más wide desde CO/BTN antes de entrar en zona corta."
        },
        {
          "title": "Lectura rápida de mesa",
          "body": "Antes de la mano: \"Estoy mid a 22 bb, hay un short a 9 bb y un cover a 55 bb\". Ese mapa decide si presionas, sobrevives o buscas doble — no solo si \"te gusta\" la mano."
        }
      ],
      "aiQuestions": [
        "¿Cómo sé si estoy en early, mid, short o push solo mirando bb?",
        "¿Por qué el ante cambia mi plan de robos?",
        "¿Qué es ICM en una frase y cuándo empieza a importar?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-00",
      "title": "Stages del torneo y ante"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 1,
      "plan": "free",
      "xp": 100,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "En early (stacks profundos, a menudo 40–60+ bb) juegas spots claros y con paciencia: construyes stack sin coin flips inútiles ni spew (regalar fichas en spots −EV). El objetivo es llegar a mid con un stack jugable, no \"hacer acción\" en la primera ciega.",
      "theory": [
        {
          "title": "Cash-like, no cash idéntico",
          "body": "Con muchas bb el preflop se parece al cash: open o fold desde early, rangos más wide en late, sin limpear (igualar la ciega grande para entrar sin subir) en mesas modernas. Aun así el objetivo es supervivencia y stack usable más adelante, no maximizar cada pot como si pudieras cash-out."
        },
        {
          "title": "Evita spew early",
          "body": "Spew típico: 3-bet wars sin necesidad, faroles sin plan postflop, hero-calls \"porque estoy deep\". Las fichas early se defienden mejor: un error grande aquí te deja short mucho antes de la burbuja."
        },
        {
          "title": "Trampa de mentalidad",
          "body": "Jugar \"como final table\" en la primera órbita es un leak: no hay ICM de FT ni presión de burbuja. Sé selectivo, acumula sin drama y guarda energía mental para mid y short."
        }
      ],
      "examples": [
        {
          "title": "Open claro BTN",
          "body": "ATo o 99 en BTN a ~40 bb: open estándar. Quieres pot manejable o robar ciegas; no necesitas all-in ni inventar líneas raras."
        },
        {
          "title": "Fold UTG con paciencia",
          "body": "Q8o UTG early: fold. Hay mucha gente detrás y la mano no juega bien multiway. Early no se \"fuerza\" basura solo porque te aburres."
        },
        {
          "title": "HJ marginal",
          "body": "A5o HJ early: a menudo fold. El as offsuit bajo se domina mucho y no tiene la jugabilidad de A5s; no es spot para spew buscando acción."
        }
      ],
      "aiQuestions": [
        "¿Qué cambia en early respecto al cash 100 bb?",
        "¿Por qué no debo forzar manos mediocres UTG early?",
        "Dame un ejemplo de spew típico en early MTT"
      ],
      "spots": "MTT_EARLY",
      "exam": false,
      "id": "T-01",
      "title": "Early: cash-like con paciencia"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 2,
      "plan": "study",
      "xp": 80,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Antes de mirar solo tu mano, lee antenas de stack: quién es big stack, mid o short. Eso decide quién puede aplicar presión, quién necesita doble y a quién no conviene chocar. Piensa en bb efectivas (y en M si te ayuda), no en fichas absolutas.",
      "theory": [
        {
          "title": "M y bb efectivas",
          "body": "M (o M-ratio) resume cuántas órbitas te quedan pagando ciegas y antes. En la práctica del día a día, contar bb efectivas suele bastar: stack ÷ ciega grande (ajustando si el rival tiene menos). Lo importante es clasificar roles, no memorizar fórmulas."
        },
        {
          "title": "Roles en la mesa",
          "body": "Big stacks pueden abrir más y forzar folds. Short stacks buscan spots de doble o shove. Mid stacks a menudo sobreviven: no quieren coin flips grandes vs covers. No trates a todos igual solo porque \"tienes la misma mano\"."
        },
        {
          "title": "Trampa: ceguera de stack",
          "body": "Jugar solo tu combo e ignorar covers/shorts es un leak clásico. Un open wide vs un short desperate o un call light vs un big que te puede eliminar cambian el EV aunque la equity de la mano sea similar."
        }
      ],
      "examples": [
        {
          "title": "Cover vs short",
          "body": "Tú 45 bb, short 11 bb en BTN: su shove es más wide por desesperación. Tú no pagas light \"porque soy cover\"; primero preguntas si el call mejora tu prize o solo tus fichas."
        },
        {
          "title": "Mid entre dos fuegos",
          "body": "Tú 22 bb, big 60 bb a tu izquierda y short 8 bb: opens flojos vs el big te meten en spots feos. Mejor spots claros o dejar que el short se juegue la vida."
        },
        {
          "title": "Misma mano, distinto rival",
          "body": "99 vs open de un mid a 28 bb no es lo mismo que 99 vs shove de un short a 9 bb. El stack relativo cambia fold equity, rangos y riesgo de eliminación."
        }
      ],
      "aiQuestions": [
        "¿Cómo clasifico big, mid y short en mi mesa?",
        "¿Para qué sirve pensar en M o en bb efectivas?",
        "¿Por qué no juego igual vs un cover que vs un short?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-02",
      "title": "Antenas de stack (M / big stacks)"
    },
    {
      "route": "mtt",
      "module": "M0",
      "order": 3,
      "plan": "study",
      "xp": 110,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Examen M0: repasas fases del torneo y early con paciencia. Sin teoría nueva — solo checklist de cómo revisar cada decisión antes de clicar.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Identifica la fase: ¿early profundo, mid, o ya cerca de short? Mira tu stack en bb y el de los rivales relevantes. Si estás early, prioriza spots claros y evita spew."
        },
        {
          "title": "Paso 2",
          "body": "Lee posición y antenas: UTG no es BTN. Pregunta quién puede castigarte detrás y si tu mano tiene plan si te 3-betean. Early: open o fold; no limpees ni forces basura."
        },
        {
          "title": "Paso 3",
          "body": "Ejecuta sin inventar drama de final table. Si la mano es clara (99 BTN open, 72o fold), hazlo. Si es marginal early desde early position, fold suele ser disciplina, no cobardía."
        }
      ],
      "examples": [
        {
          "title": "Antes de la sesión",
          "body": "Repasa en voz alta: fase → stack bb → posición → ¿open claro o fold? El examen mezcla spots early; no busques \"jugadas de burbuja\" aquí."
        },
        {
          "title": "Señal de alarma",
          "body": "Si te pillas pensando \"voy all-in porque me aburro\" a 45 bb, párate. Eso es spew early, no estrategia de torneo."
        },
        {
          "title": "Checklist de 5 segundos",
          "body": "¿Estoy early? ¿Hay mucha gente detrás? ¿La mano juega bien si me pagan? Si dos respuestas son no, fold y siguiente mano."
        }
      ],
      "aiQuestions": [
        "Repásame el checklist de early antes del examen",
        "¿Qué errores típicos de M0 debo evitar?"
      ],
      "spots": "MTT_EXAM_M0",
      "exam": true,
      "id": "T-03",
      "title": "Examen M0 · MTT"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 4,
      "plan": "study",
      "xp": 110,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "Antes de entrar en zona corta, en mid (a menudo ~25–35 bb) robás ciegas con steals (opens desde late) desde CO, BTN y SB. El ante engorda el premio del robo; no llegues a 12 bb sin haber intentado acumular fichas baratas.",
      "theory": [
        {
          "title": "Steal mid-late",
          "body": "Steal: open-raise esperando que folden ciegas y antes. Aún no estás obligado a shove: abres a sizing estándar y eliges manos con plan si te 3-betean (fold, call o 4-bet según stack y rival)."
        },
        {
          "title": "Manos con plan",
          "body": "Buenas candidatas: broadways, Ax suited, suited connectors y pares. Basura total (72o) no se convierte en steal solo por estar en BTN. Si te 3-betean, sabes si te tiras o continúas — no abras \"y ya veremos\"."
        },
        {
          "title": "Trampa de pasividad",
          "body": "Pasar de largo todas las órbitas hasta 12 bb te deja short sin fichas robadas. Mid es la ventana para engordar el stack con fold equity antes del push/fold."
        }
      ],
      "examples": [
        {
          "title": "K9o BTN mid",
          "body": "BTN ~25 bb, K9o: steal razonable. Si las ciegas foldean mucho, ganas dead money; si te 3-betean fuerte, foldas sin drama."
        },
        {
          "title": "A5s CO",
          "body": "A5s CO mid: open/steal OK. Tiene blockers de as y jugabilidad; no es basura, pero tampoco es shove obligatorio a estas bb."
        },
        {
          "title": "J8o CO fold",
          "body": "J8o CO: fold típico. Domina poco, te castigan detrás y postflop duele. Steal no significa \"cualquier dos cartas en late\"."
        }
      ],
      "aiQuestions": [
        "¿Desde qué posiciones stealeo en mid y con qué manos?",
        "¿Qué hago si me 3-betean tras un steal a 25 bb?",
        "¿Por qué no debo esperar pasivo hasta 12 bb?"
      ],
      "spots": "MTT_STEAL",
      "exam": false,
      "id": "T-04",
      "title": "Steal antes de zona corta"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 5,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "A mid stacks, el 3-bet polar (mezcla de manos fuertes por valor y faroles elegidos) aplica presión frente a opens late. No es solo QQ+: también usas blockers y fold equity, sin spew (3-betear basura sin plan).",
      "theory": [
        {
          "title": "Qué significa polar",
          "body": "Polar: tu rango de 3-bet se concentra en value (manos que quieren acción o stack-off) y en faroles con blockers (cartas que quitan al rival combinaciones fuertes), no en manos medias \"ni fu ni fa\". El stack decide si cabe un 3-bet non-all-in o si el spot pide shove."
        },
        {
          "title": "Vs late vs early",
          "body": "Vs open late (CO/BTN) puedes 3-betear más light: su rango es wide y fold equity sube. Vs open early (UTG/HJ) priorizas value: ellos abren tight y pagan o 4-betean más a menudo."
        },
        {
          "title": "Trampa spew",
          "body": "3-betear Q9o \"porque sí\" mid sin fold equity ni blockers útiles es spew. Si no tienes historia clara postflop o plan vs 4-bet, fold o hacer call selectivo — no inventes polaridad falsa."
        }
      ],
      "examples": [
        {
          "title": "AKo value",
          "body": "BTN stealea, tú BB con AKo: 3-bet por valor. Quieres aislar o ir hacia stack-off favorable; no es un farol."
        },
        {
          "title": "A4s polar/farol",
          "body": "Misma situación con A4s: 3-bet polar frecuente. Blocker de as + equity si te pagan; si te 4-betean, a menudo te tiras según stack y rival."
        },
        {
          "title": "Q9o no spew",
          "body": "Q9o vs steal: fold o a veces defensa pasiva — no 3-bet spew. Es mano media, dominada, sin blockers limpios de premium."
        }
      ],
      "aiQuestions": [
        "¿Qué es un 3-bet polar en mid stacks?",
        "¿Cuándo 3-beteo light vs open late?",
        "Dame un ejemplo de 3-bet spew que debo evitar"
      ],
      "spots": "MTT_3BET",
      "exam": false,
      "id": "T-05",
      "title": "3-bet polar mid stacks"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 6,
      "plan": "study",
      "xp": 120,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Resteal: 3-betear (a veces shove) al steal del late para ganar el bote muerto o aislar. Defense: desde ciegas no overfoldeas todo vs robos, pero tampoco overdefiendes basura — eliges fold, hacer call o 3-bet según stack y rival.",
      "theory": [
        {
          "title": "Resteal con intención",
          "body": "Cuando BTN o CO stealea wide, SB/BB pueden restealear: value claro (AK, pares fuertes) y faroles elegidos con blockers. A mid stacks aún cabe 3-bet non-all-in; si el stack se acorta, el resteal se acerca a shove."
        },
        {
          "title": "Defense equilibrada",
          "body": "Defense no es \"pagar todo\". Haces call con manos que juegan bien postflop o tienen odds; 3-beteas polar; foldeas dominadas. Vs UTG open tight, resteal loco es leak — no es un steal wide."
        },
        {
          "title": "Trampas de extremos",
          "body": "Never-defend (tirar casi todo) regala ciegas+ante gratis. Resteal maníaco vs opens early te elimina mid sin necesidad. Busca el medio: castiga steals, respeta ranges tight."
        }
      ],
      "examples": [
        {
          "title": "Resteal vs BTN",
          "body": "BTN open steal a 25 bb, tú BB con A4s o TT: 3-bet (resteal) tiene sentido. Castigas el rango wide y tomas la iniciativa."
        },
        {
          "title": "Fold correcto",
          "body": "CO open, tú BB con 72o: fold. No hay defense heroica con basura; overdefend mid también es spew."
        },
        {
          "title": "No resteal vs UTG",
          "body": "UTG open tight, tú SB con K9o: fold frecuente. Aquí no hay el mismo fold equity que vs un steal de BTN."
        }
      ],
      "aiQuestions": [
        "¿Qué es un resteal y cuándo lo uso?",
        "¿Cómo defiendo ciegas sin overdefender?",
        "¿Por qué no restealeo igual vs UTG que vs BTN?"
      ],
      "spots": "MTT_RESTEAL",
      "exam": false,
      "id": "T-06",
      "title": "Resteal y defense"
    },
    {
      "route": "mtt",
      "module": "M1",
      "order": 7,
      "plan": "study",
      "xp": 130,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Examen Mid: repasas steal, 3-bet polar y resteal/defense. Sin vocabulario nuevo — checklist de cómo leer el spot mid antes de actuar.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "¿Eres el que abre (steal) o el que responde (defense/resteal)? Mira posición: CO/BTN/SB no son lo mismo, y BB vs steal no es BB vs UTG."
        },
        {
          "title": "Paso 2",
          "body": "Stack en bb mid: ¿cabe open estándar o el spot pide 3-bet/shove? Elige manos con plan si te resuben. Basura: fold. Value y polar limpio: presión."
        },
        {
          "title": "Paso 3",
          "body": "Evita los extremos del examen: passivity total (nunca robar) y spew (3-betear medias sin blockers). Roba late, castiga steals, foldea lo dominado."
        }
      ],
      "examples": [
        {
          "title": "Antes de clicar",
          "body": "Di en una frase el job: \"Steal BTN\", \"3-bet polar BB vs BTN\" o \"fold basura\". Si no puedes nombrarlo, no inventes acción."
        },
        {
          "title": "Señal polar vs spew",
          "body": "A4s vs steal puede ser 3-bet polar. Q9o vs steal casi nunca. El examen premia esa distinción, no la agresión ciega."
        },
        {
          "title": "Checklist rápido",
          "body": "Posición → stack bb → ¿steal o defense? → ¿value, farol limpio o fold? Ejecuta y pasa a la siguiente."
        }
      ],
      "aiQuestions": [
        "Repásame steal vs resteal en mid",
        "¿Qué errores de mid debo vigilar en el examen?"
      ],
      "spots": "MTT_EXAM_M1",
      "exam": true,
      "id": "T-07",
      "title": "Examen Mid · MTT"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 8,
      "plan": "study",
      "xp": 130,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 4,
      "concept": "Entre ~20 y 12 bb ya no eres deep: eliges open-raise o shove (ir all-in) según mano, posición y quién queda detrás. Min-raisear manos que deberían ir shove te mete en spots peores.",
      "theory": [
        {
          "title": "Zona de umbrales",
          "body": "En short (aprox. 20–12 bb) aparecen thresholds: algunas manos open a sizing reducido, otras shove directo, el resto fold. Depende de bb exactas, posición y stacks detrás — no de \"me gusta el flop imaginario\"."
        },
        {
          "title": "Por qué no open/fold roto",
          "body": "Abrir flojo y foldear siempre al shove rival es un leak: regalas fold equity y te dejan sin stack. Si la mano no aguanta presión, a menudo era fold pre; si es fuerte, considera shove limpio."
        },
        {
          "title": "Trampa del miedo",
          "body": "Min-raisear AK/99 \"por miedo a ir all-in\" a 14 bb suele ser peor: te comprometes sin maximizar fold equity. En esta zona, commit consciente > open tímido."
        }
      ],
      "examples": [
        {
          "title": "Shove candidato",
          "body": "A5o BTN a ~12 bb: shove candidato frecuente. Open pequeño te deja mal vs 3-bet; shove toma el dead money o vas a equity."
        },
        {
          "title": "Open aún viable",
          "body": "Algunas manos medias a ~18–20 bb desde BTN aún abren sin shove. La clave es saber qué harás si te resuben — no open automático sin plan."
        },
        {
          "title": "Fold basura",
          "body": "72o a 15 bb: fold. Zona corta no justifica panic open; sin equity ni fold equity real, solo spew."
        }
      ],
      "aiQuestions": [
        "¿Cuándo open y cuándo shove entre 20 y 12 bb?",
        "¿Por qué es malo open flojo y fold al shove?",
        "¿Qué miró además de mi mano en esta zona?"
      ],
      "spots": "MTT_SHORT",
      "exam": false,
      "id": "T-08",
      "title": "Zona 20–12 bb: open/shove"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 9,
      "plan": "study",
      "xp": 140,
      "passThreshold": 0.7,
      "goldThreshold": 0.9,
      "decisionEnd": true,
      "hands": 6,
      "concept": "A ~12–8 bb el plan base es push/fold: shove (all-in) o fold según chart y posición. Como en Spins cortos, el open min suele ser un error; quieres fold equity inmediata o ir a equity vs call.",
      "theory": [
        {
          "title": "Push/fold simplifica",
          "body": "Push/fold: o vas all-in o te tiras. Usa charts (menú Rangos / push-fold) como referencia, no como religión ciega: ajusta a rivals que overfolden o overcallen, pero no reinventes opens de cash a 10 bb."
        },
        {
          "title": "Posición ensancha el rango",
          "body": "BTN shoves más wide que CO; SB vs BB tiene dinámica propia. Early positions quedan más tight: hay más gente detrás que puede despertar con value."
        },
        {
          "title": "Trampa open small",
          "body": "Open a 2 bb con 10 bb de stack te deja en tierra de nadie: poco fold equity y commitment accidental. Si el chart dice shove, shove; si dice fold, fold."
        }
      ],
      "examples": [
        {
          "title": "A5o BTN shove",
          "body": "A5o BTN ~10–12 bb: shove candidato. As + fold equity; open min aquí suele ser peor que push/fold limpio."
        },
        {
          "title": "KTs SB",
          "body": "KTs SB corto: shove frecuente. Estás obligado a actuar; el dead money de ciegas/antes justifica presión."
        },
        {
          "title": "99 value shove",
          "body": "99 a 10–12 bb: shove por valor claro. Quieres que paguen peor o que folden; no min-raise \"para ver flop barato\"."
        }
      ],
      "aiQuestions": [
        "¿Cómo uso un chart de push/fold sin robotizarme?",
        "¿Por qué BTN shoves más wide que UTG a 10 bb?",
        "¿Qué error es abrir pequeño a 10 bb?"
      ],
      "spots": "MTT_PUSH",
      "exam": false,
      "id": "T-09",
      "title": "Push/fold 12–8 bb"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 10,
      "plan": "study",
      "xp": 120,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Antes del ICM fino, aprendes a hacer call vs shove mirando chip EV: ¿tienes equity suficiente contra el rango de all-in para que el call gane fichas a largo plazo? Es la base; luego apretamos con dinero real.",
      "theory": [
        {
          "title": "Chip EV primero",
          "body": "Chip EV (valor esperado en fichas): comparas la equity de tu mano vs el rango de shove con el precio que pagas. Si el call es +EV en fichas, en un mundo sin premios sería automático; en MTT es el suelo sobre el que luego aplicas ICM."
        },
        {
          "title": "Manos y precios",
          "body": "Manos fuertes (TT+, AQ+) suelen pagar shoves cortos. Manos medias dependen de posición, sizing (aquí all-in) y de lo wide que sea el shove. No \"ves flop\": vs shove ya estás en showdown equity."
        },
        {
          "title": "Trampas de extremos",
          "body": "Call light \"para ver\" con basura es spew. Fold panic con AQ vs shove corto también: a veces el chip EV es claramente positivo y el miedo te roba fichas."
        }
      ],
      "examples": [
        {
          "title": "Call claro chip EV",
          "body": "Short shove 10 bb desde BTN, tú BB con AQo: hacer call suele ser +chip EV vs un rango wide. No necesitas ICM aún para ver que es fuerte."
        },
        {
          "title": "Fold chip EV",
          "body": "Mismo shove, tú con J9o: fold. Equity insuficiente vs el rango; \"quiero ver\" no es argumento."
        },
        {
          "title": "Zona gris",
          "body": "AJo vs shove CO a 12 bb puede ser call o fold según lo wide del rival. Entrena el hábito: estima rango → equity → precio, antes de inventar narrativa."
        }
      ],
      "aiQuestions": [
        "¿Qué es chip EV al hacer call vs un shove?",
        "¿Por qué no debo hacer call light \"para ver\"?",
        "¿Cuándo AQ es call claro vs shove corto?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-10",
      "title": "Calling ranges vs shove (chip EV)"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 11,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Con ICM (el valor en dinero real de tus fichas según el payout), hacer call vs shove es más tight que en chip EV puro: el $EV castiga arriesgar tu stack cerca de premios. Overfold (foldear de más vs chip EV) es a menudo correcto.",
      "theory": [
        {
          "title": "De fichas a dinero",
          "body": "$EV (valor esperado en dinero de torneo) no es lo mismo que chip EV. Doblar fichas no duplica tu prize esperado; quedarte fuera cerca de la burbuja o de un pay jump duele más que \"perder un pot\" en cash."
        },
        {
          "title": "Calls más tight",
          "body": "Manos que eran call claros en fichas pueden ser fold en $EV si hay muchos shorts que pueden eliminarse o si tú eres mid vs cover. Pregunta: ¿este call mejora mi dinero esperado o solo mi ego de equity?"
        },
        {
          "title": "Honestidad",
          "body": "Usamos principios ICM, no un cálculo exacto de field completo. Si internalizas \"cerca de premios, paga menos light\", ya evitas el leak más caro del módulo."
        }
      ],
      "examples": [
        {
          "title": "Overfold correcto",
          "body": "Burbuja, tú mid 18 bb, big shove 22 bb con cobertura: AJo que era call chip EV puede ser fold $EV. Dejas que otros se eliminen."
        },
        {
          "title": "Aún pagas value",
          "body": "ICM no significa fold forever. QQ vs shove corto sigue siendo call en casi todos los spots razonables: el value es demasiado fuerte."
        },
        {
          "title": "Contraste mental",
          "body": "Entrena la frase: \"+EV chips, −EV dinero → fold\". Si no puedes decir por qué el ICM aprieta, no uses ICM como excusa para foldear premiums."
        }
      ],
      "aiQuestions": [
        "¿Por qué el ICM hace los calls más tight?",
        "¿Cuándo overfoldear vs shove es correcto?",
        "¿Chip EV y $EV pueden discrepar en el mismo spot?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-11",
      "title": "Calling ranges con ICM"
    },
    {
      "route": "mtt",
      "module": "M2",
      "order": 12,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Short: repasas zona 20–12, push/fold y calls vs shove (chip EV e ICM básico). Sin teoría nueva — checklist de cómo revisar cada decisión short.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Cuenta bb: ¿20–12 (open/shove thresholds) o 12–8 (push/fold)? La herramienta cambia. No juegues 10 bb como si tuvieras 40."
        },
        {
          "title": "Paso 2",
          "body": "Si abres: ¿open, shove o fold? Si te shovena: ¿call por chip EV o ya aprieta el ICM? Nombra el criterio antes de clicar."
        },
        {
          "title": "Paso 3",
          "body": "Evita open small basura, panic shove 72o y call light \"porque equity\". En short, la disciplina de umbrales vale más que la creatividad."
        }
      ],
      "examples": [
        {
          "title": "Pregunta ancla",
          "body": "Antes de cada mano del examen: \"¿Qué zona de bb estoy?\" Si no lo sabes, no elijas sizing de cash."
        },
        {
          "title": "Vs shove",
          "body": "Primero chip EV mental; luego, si hay olor a burbuja o pay jump, aprieta el call. El examen premia ese orden, no adivinar."
        },
        {
          "title": "Señal de leak",
          "body": "Si min-raiseas a 9 bb \"para ver\", corrige en caliente: push/fold o fold — no tierra de nadie."
        }
      ],
      "aiQuestions": [
        "Repásame open/shove vs push/fold",
        "¿Cómo decido call vs shove en el examen short?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-12",
      "title": "Examen Short · MTT"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 13,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En burbuja (bubble) cada rol tiene un plan distinto: el big stack presiona, el mid sobrevive y el short busca spots de ladder (subir peldaños de payout). Identificar tu rol vale más que enamorar una mano concreta.",
      "theory": [
        {
          "title": "Tres roles, tres jobs",
          "body": "Big: aplica presión y fuerza folds ICM. Mid: evita coin flips grandes vs covers; deja que los shorts se eliminen. Short: necesita doble o robos selectivos, no min-raise suicida."
        },
        {
          "title": "ICM en burbuja",
          "body": "El ICM (valor en dinero real según payout) está en máximo dramático: un call malo te saca sin cobrar mientras otros entran ITM (in the money). Por eso los mids overfoldean vs bigs más que en chip EV."
        },
        {
          "title": "Trampa de rol confuso",
          "body": "Mid que hero-callea al big \"porque tengo equity\" es el leak clásico de burbuja. Juega tu job, no el del short desesperado ni el del cover rico en fichas."
        }
      ],
      "examples": [
        {
          "title": "Big presiona",
          "body": "Cover 50 bb abre wide vs mids a 20 bb: ellos no pueden defender todo. La presión es open/shove selectivo, no call light a shorts."
        },
        {
          "title": "Mid sobrevive",
          "body": "Mid 18 bb foldea A9o vs shove del big en burbuja. Doloroso en fichas, a menudo correcto en $EV."
        },
        {
          "title": "Short pick spot",
          "body": "Short 9 bb espera BTN/SB o un fold equity claro; no shoves UTG basura solo por pánico."
        }
      ],
      "aiQuestions": [
        "¿Cómo sé si soy short, mid o big en burbuja?",
        "¿Qué debe hacer cada rol?",
        "¿Por qué el mid overfoldea vs el big?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-13",
      "title": "Roles en burbuja (short/mid/big)"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 14,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Como big stack en burbuja, abres y shoves más para aplicar presión ICM: haces que los mids se tiren. Presión no significa hacer call light a los shorts — no regalas dobles fáciles sin fold equity.",
      "theory": [
        {
          "title": "Presión ≠ pagar todo",
          "body": "Tu arma es el fold equity: opens wide, 3-bets y shoves que ponen a los mids en dilemas $EV. Si el short ya está all-in, tú decides con rango; \"porque puedo\" no es razón para pagar basura."
        },
        {
          "title": "Aislar y castigar",
          "body": "Busca spots donde el mid no puede defenderse: late position, stacks que temen eliminarse. Castiga overfolds; no te suicides en flips innecesarios vs otro cover."
        },
        {
          "title": "Trampa del cover generoso",
          "body": "Pagar shove light del short \"para eliminarlo\" puede ser −$EV si tu call es flojo: le das vida barata o te expones sin necesidad. Eliminar con buena mano, no con ego."
        }
      ],
      "examples": [
        {
          "title": "Steal de cover",
          "body": "Tú 55 bb BTN, mids 20 bb en ciegas: steal wide. Ellos foldean de más; tú recoges antes y ciegas sin showdown."
        },
        {
          "title": "Fold con cover",
          "body": "Short shove 11 bb, tú BB con KTo: a menudo fold. No necesitas ese flip; tu presión futura vale más."
        },
        {
          "title": "Value cuando toca",
          "body": "Mismo shove, tú con JJ: call/shove claro. Big stack tampoco foldea la joyería — solo deja de spew calls medios."
        }
      ],
      "aiQuestions": [
        "¿Cómo presiono siendo big stack sin spew?",
        "¿Por qué no pago light al short solo por eliminarlo?",
        "¿Qué spots de mid son más explotables?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-14",
      "title": "Big stack pressure"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 15,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Mid stack en burbuja: prioridad no chocarte con el big stack. Sobrevives dejando que los shorts se eliminen; evitas spots −$EV aunque sean +chip EV. Pick spots claros, no open spew vs covers.",
      "theory": [
        {
          "title": "Fold equity baja vs big",
          "body": "Vs un cover, tus robos se respetan menos y tus calls duelen más: él puede eliminarte y tú no le haces el mismo daño ICM. Por eso mid survival = menos guerras vs el chip leader."
        },
        {
          "title": "Deja que el short se juegue",
          "body": "Si hay shorts por debajo, cada órbita que sobreviven sin chocarte mejora tu ladder esperado. No hace falta ser el héroe que elimina a todos a la fuerza."
        },
        {
          "title": "Trampa open spew",
          "body": "Open flojo mid vs big a tu izquierda es invitar al resteal ICM. Preferible folds o manos con plan claro; la paciencia aquí es skill, no pasividad ciega vs todos."
        }
      ],
      "examples": [
        {
          "title": "Fold $EV",
          "body": "Big shove 25 bb, tú mid 20 bb con AJo: fold frecuente en burbuja. Chip EV puede gustar; $EV a menudo no."
        },
        {
          "title": "Spot vs short",
          "body": "Short 8 bb shove a tu BB, tú mid con AQo: más dispuesto a pagar — el ICM vs short duele menos que vs cover."
        },
        {
          "title": "No spew open",
          "body": "CO mid, big en BTN: K9o a menudo fold. Abrir para que el cover te meta presión es regalarte un dilema."
        }
      ],
      "aiQuestions": [
        "¿Por qué el mid sobrevive en burbuja?",
        "¿Cuándo sí hago call siendo mid?",
        "¿Qué opens evito vs el big stack?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-15",
      "title": "Mid stack survival"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 16,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Short stack en burbuja: necesitas ladder (subir un peldaño de payout) con shoves selectivos y timing. No min-raise suicida ni panic shove UTG con basura — elige spots con fold equity o equity decente.",
      "theory": [
        {
          "title": "Doble con criterio",
          "body": "Sí, necesitas fichas; no, no cualquier mano en cualquier asiento. Prioriza late position, folds delante y rivales mid que overfoldean por ICM. UTG basura es el antitexto."
        },
        {
          "title": "Ladder mental",
          "body": "Cada eliminación ajena te acerca a cobrar o a un salto. A veces fold + esperar un mejor spot sube más tu $EV que un flip feo ahora. Equilibra urgencia de ciegas con calidad del spot."
        },
        {
          "title": "Trampa panic",
          "body": "Shove panic porque \"me comen las ciegas\" con 72o UTG suele ser −EV en ambos mundos. Si estás muerto de fichas, al menos elige manos con blockers o equity real."
        }
      ],
      "examples": [
        {
          "title": "Shove late",
          "body": "9 bb BTN, folds delante, A5o: shove selectivo típico. Fold equity vs mids + equity si te pagan."
        },
        {
          "title": "Fold UTG",
          "body": "9 bb UTG, J8o: fold. Aunque estés short, este spot no laddera — solo spew."
        },
        {
          "title": "Timing vs cover",
          "body": "Big en BB que paga light: aprieta tu rango de shove. Mid en BB que overfoldea: puedes ir más wide. Lee el rol, no solo el chart estático."
        }
      ],
      "aiQuestions": [
        "¿Cómo elijo spots de shove siendo short en burbuja?",
        "¿Qué es el ladder en payout?",
        "¿Por qué no panic shove desde UTG?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-16",
      "title": "Short stack ladder"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 17,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Tras el ITM (ya cobras algo), los pay jumps (saltos de premio entre puestos) siguen importando: no \"ya estoy pagado, all-in light\". El ICM continúa; cada eliminación puede subir tu prize.",
      "theory": [
        {
          "title": "ITM no apaga el ICM",
          "body": "Cobrar el mínimo no iguala tu $EV al chip EV. Entre el min-cash y la mesa final hay escalones: arriesgar stack light regala jumps a otros. Sigue pensando roles y covers."
        },
        {
          "title": "Ajusta la agresión",
          "body": "Puedes abrir más que en burbuja extrema, pero no spew post-bubble. Los jumps grandes (cerca de FT o de pagos altos) aprietan otra vez los calls y los flips innecesarios."
        },
        {
          "title": "Trampa \"ya cobré\"",
          "body": "Mentalidad de spew tras el min-cash es leak caro: conviertes un buen resultado en mediocre. Celebra el ITM fuera de la mesa; dentro, sigue el plan de saltos."
        }
      ],
      "examples": [
        {
          "title": "Jump cerca",
          "body": "Quedan 12, pagan fuerte de 9 en adelante: mid vs big shove con AJo puede ser fold otra vez. El jump importa más que el min-cash ya asegurado."
        },
        {
          "title": "Presión razonable",
          "body": "Cover post-ITM puede robar a mids que aún temen saltos. Misma lógica de burbuja, algo menos extrema."
        },
        {
          "title": "No flip gratis",
          "body": "Dos mids con stacks similares cerca de un salto grande: evita coin flip marginal. Espera un mejor edge o un short que se elimine."
        }
      ],
      "aiQuestions": [
        "¿Por qué el ICM sigue tras el ITM?",
        "¿Qué es un pay jump y cómo cambia mis calls?",
        "¿Qué leak evita la mentalidad \"ya estoy pagado\"?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-17",
      "title": "Pay jumps post-ITM"
    },
    {
      "route": "mtt",
      "module": "M3",
      "order": 18,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Bubble: repasas roles short/mid/big, presión, supervivencia y ladder. Sin teoría nueva — checklist de cómo revisar cada spot de burbuja.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "¿Soy short, mid o big? Clasifica stacks en bb relativos a la mesa. Si no sabes tu rol, no elijas línea: el job cambia la respuesta correcta."
        },
        {
          "title": "Paso 2",
          "body": "¿Presiono o sobrevivo? Big → presión con fold equity. Mid → evita covers, pick spots. Short → shove selectivo, no panic. Nombra el job en una frase."
        },
        {
          "title": "Paso 3",
          "body": "Separar chip EV de $EV: si el spot es +fichas y −dinero, fold suele ganar el examen. No hero-call de mid vs big \"por equity\"."
        }
      ],
      "examples": [
        {
          "title": "Ancla de rol",
          "body": "Antes de cada mano: \"Soy mid, big a la izquierda, short debajo\". Esa frase evita el 50 % de leaks de burbuja."
        },
        {
          "title": "Señal de spew",
          "body": "Si siendo mid pagas shove del cover con mano media, párate. El examen castiga ese heroísmo."
        },
        {
          "title": "Checklist rápido",
          "body": "Rol → presión/supervivencia/ladder → ¿ICM aprieta? → actúa. Sin vocabulario nuevo, solo aplicación."
        }
      ],
      "aiQuestions": [
        "Repásame los tres roles de burbuja",
        "¿Qué errores ICM debo evitar en el examen?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-18",
      "title": "Examen Bubble"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 19,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En final table (FT) el ICM se intensifica: pay jumps grandes, covers que aplastan y shorts extremos. Los principios de burbuja escalan — no prometemos un solver completo de FT, sí un mapa mental usable.",
      "theory": [
        {
          "title": "FT = ICM a máximo volumen",
          "body": "Los saltos entre puestos de FT suelen ser enormes. Covers presionan; mids cuidan stacks; shorts pick spots. Un flip mal elegido destroza horas de torneo en un click."
        },
        {
          "title": "Covers y malas estructuras",
          "body": "Si un chip leader tiene covers sobre varios, puede abrir muy wide. Si tú eres mid con otro mid similar, a menudo preferís que el short se elimine antes de chocaros."
        },
        {
          "title": "Límite honesto",
          "body": "No calculamos ICM de 9-handed exacto en cada mano. Si aplicas roles + jumps + \"no spew vs cover\", ya juegas FT por encima del recreativo medio."
        }
      ],
      "examples": [
        {
          "title": "Cover FT",
          "body": "Chip leader 80 bb vs mesa de 15–25 bb: steal y presión constantes. Los mids no pueden despertar con medias."
        },
        {
          "title": "Dos mids",
          "body": "Dos stacks 22 bb, short 6 bb: ambos evitan all-in mutuo hasta que el short se juegue. Ladder compartido."
        },
        {
          "title": "Short FT",
          "body": "Short 7 bb espera fold equity en late; no open min. Misma lección de ladder, con jumps más caros."
        }
      ],
      "aiQuestions": [
        "¿Qué cambia el ICM en final table vs burbuja?",
        "¿Cómo deben actuar cover, mid y short en FT?",
        "¿Por qué dos mids evitan chocarse con un short vivo?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-19",
      "title": "Final table ICM intro"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 20,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Entrenas a separar \"gano fichas\" (chip EV) de \"gano dinero de torneo\" ($EV). Si el spot es +EV en chips y −EV en dinero — típico en burbuja/FT — fold es a menudo correcto; no idolatres solo la equity.",
      "theory": [
        {
          "title": "Dos respuestas posibles",
          "body": "Ante un shove, puedes tener call chip EV y fold $EV. El drill es verbalizar ambas: \"En fichas pago; en dinero me tiro porque…\" Sin esa frase, confundes valentía con spew."
        },
        {
          "title": "Cuándo coinciden",
          "body": "Premiums fuertes y spots vs shorts desesperados suelen alinear chip EV y $EV: pagas. La discrepancia aparece en medias vs covers cerca de jumps."
        },
        {
          "title": "Trampa equity-only",
          "body": "\"Tengo 35 % y el precio es 30 %\" no cierra el caso en MTT. El prize risk puede hacer que ese 5 % de edge en fichas sea −$EV. Equity es input, no veredicto."
        }
      ],
      "examples": [
        {
          "title": "Discrepancia clásica",
          "body": "Burbuja, mid vs big shove, AJo: call chip EV / fold $EV. El drill correcto nombra las dos lecturas y elige dinero."
        },
        {
          "title": "Alineación",
          "body": "QQ vs shove short 10 bb en FT: call en ambos marcos. No uses ICM para foldear la joyería."
        },
        {
          "title": "Frase de entrenamiento",
          "body": "Di en voz alta: \"+chips −$ → fold; +ambos → call; −ambos → fold\". Si no encaja, reestima rango y rol."
        }
      ],
      "aiQuestions": [
        "¿Cómo separo chip EV de $EV en un call vs shove?",
        "¿Cuándo coinciden y cuándo discrepan?",
        "Dame un ejemplo +chip EV y −$EV"
      ],
      "spots": [],
      "exam": false,
      "id": "T-20",
      "title": "Chip EV vs $EV drills"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 21,
      "plan": "coach",
      "xp": 100,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "En burbuja/FT asignas rangos de shove y de call según rol y stack, no solo según \"tu mano te gusta\". Range reading: qué shoves este short, qué paga este mid, qué foldea este big — luego encajas tu combo.",
      "theory": [
        {
          "title": "Preguntas de rango",
          "body": "Antes de actuar: ¿qué % shoves este short desde BTN? ¿Este mid overfoldea vs cover? ¿El big paga light por ego? Esas respuestas definen si tu mano es value, bluff-catcher malo o fold automático."
        },
        {
          "title": "No leas como cash deep",
          "body": "Hand-reading de cash a 100 bb (líneas multi-street, sizes raros) no es el job aquí. En burbuja priorizas stack, rol e ICM: rangos de push/call polarizados, no pot control fancy."
        },
        {
          "title": "Trampa combo-centrismo",
          "body": "Enamorarte de KJo sin preguntar el rango rival es leak. La misma KJo es call vs short wide y fold vs cover tight en burbuja. El combo es el último paso, no el primero."
        }
      ],
      "examples": [
        {
          "title": "Short wide",
          "body": "Short 8 bb BTN shove: rango amplio (Ax, broadways, suited). Tu A9o en BB mid gana más peso de call que vs un shove UTG desesperado pero más tight."
        },
        {
          "title": "Mid overfold",
          "body": "Estimás que el mid foldea todo menos QQ+ vs tu shove de cover: puedes ir más wide. Si paga ATo+, aprietas value."
        },
        {
          "title": "Big ego-call",
          "body": "Cover que odia foldear: no bluff-shoves light contra él; value más limpio. Lee tendencias de rol + player type."
        }
      ],
      "aiQuestions": [
        "¿Qué preguntas hago para leer rangos en burbuja?",
        "¿Por qué no sirvo el hand-reading de cash deep aquí?",
        "¿Cómo cambia KJo vs short wide o vs cover?"
      ],
      "spots": [],
      "exam": false,
      "id": "T-21",
      "title": "Range reading en burbuja"
    },
    {
      "route": "mtt",
      "module": "M4",
      "order": 22,
      "plan": "coach",
      "xp": 150,
      "passThreshold": 1,
      "goldThreshold": 1,
      "decisionEnd": true,
      "hands": 0,
      "concept": "Examen Pro MTT: certificación de fases, short/push, burbuja e ICM de FT. Sin teoría nueva — checklist de cómo revisar spots de torneo de punta a punta.",
      "theory": [
        {
          "title": "Paso 1",
          "body": "Fase y bb: early/mid/short/push/bubble/FT. Si fallas la fase, fallas el sizing y el rol. Ancla stack en bb antes de la mano."
        },
        {
          "title": "Paso 2",
          "body": "Rol y job: ¿robo, presión de cover, supervivencia mid, ladder short? Resume bubble roles en una frase y aplícalos también en FT con jumps mayores."
        },
        {
          "title": "Paso 3",
          "body": "Chip EV vs $EV en una frase: si discrepan cerca de premios, prioriza dinero. No spew calls medios vs covers; no foldees premiums claros vs shorts."
        }
      ],
      "examples": [
        {
          "title": "Certificación mental",
          "body": "Antes del pack: \"Fase → rol → ¿chips o dinero?\". Esa tríada es la rúbrica del examen Pro."
        },
        {
          "title": "Resume roles",
          "body": "Big presiona, mid sobrevive, short ladder. Si tu línea contradice el rol sin motivo, corrige."
        },
        {
          "title": "Frase $EV",
          "body": "Practica: \"Call chip EV, fold $EV → me tiro\". Si no puedes decirlo, no uses ICM como muletilla."
        }
      ],
      "aiQuestions": [
        "Repásame el checklist Pro: fase, rol y $EV",
        "¿Cómo resumo bubble roles en una frase?",
        "¿Qué errores matan una certificación MTT?"
      ],
      "spots": [],
      "exam": true,
      "id": "T-22",
      "title": "Examen Pro · MTT"
    }
  ];
  var lessons = RAW.map(function (lesson) { return resolveSpots(lesson, D); });
  D.registerLessons(lessons);
})(typeof window !== 'undefined' ? window : globalThis);
