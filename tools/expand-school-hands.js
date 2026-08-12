#!/usr/bin/env node
/**
 * Expande packs Spins/MTT y spots Cash M1/M2 a ≥10 manos,
 * con más volumen en módulos avanzados / exámenes.
 * Uso: node tools/expand-school-hands.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const PACKS_SNIPPET = String.raw`  function packSpots(kind, D) {
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
  }`;

function replacePackSpots(fileRel) {
  const file = path.join(root, fileRel);
  let src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('  function packSpots(kind, D)');
  const end = src.indexOf('  if (D.setRouteStatus)');
  if (start < 0 || end < 0) throw new Error('markers not found in ' + fileRel);
  // keep resolveSpots inside snippet; remove old pack+resolve
  const oldResolve = src.indexOf('  function resolveSpots(lesson, D)', start);
  const afterResolve = src.indexOf('  if (D.setRouteStatus)', oldResolve);
  src = src.slice(0, start) + PACKS_SNIPPET + '\n\n' + src.slice(afterResolve);
  fs.writeFileSync(file, src);
  console.log('packs OK', fileRel);
}

replacePackSpots('js/school-data-spin.js');
replacePackSpots('js/school-data-mtt.js');

console.log('Done pack expansion');
