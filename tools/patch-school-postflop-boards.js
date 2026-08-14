#!/usr/bin/env node
'use strict';
/**
 * Completa boards de spots turn/river de Escuela y alinea teachBacks
 * con la mano hecha en el board final (sin runouts aleatorios).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

/** id → { board: string[], cards?: string[], teachBack?: string } */
const PATCH = {
  /* C-18 turn: flop + brick turn */
  'c18-01': { board: ['As', '7d', '2c', '5s'], teachBack: 'Con KQ en A-high seco: en turn brick, barrel selectivo o check. No barrels eternos sin mejora.' },
  'c18-02': { cards: ['Jh', '9c'], board: ['As', '9d', '2c', '5s'], teachBack: 'Segunda pareja floja (9x) sin mejora en turn brick: no hagas sticky barrel eterno. Controla o cede.' },
  'c18-03': { board: ['Ah', '8c', '3s', '2d'], teachBack: 'Top pair top kicker en turn brick: barrel de value frecuente.' },
  'c18-04': { board: ['As', 'Kd', '2h', '3c'], teachBack: 'Fallaste: en turn brick, a menudo give up (cedes) si no hay scare card que justifique farol.' },
  'c18-05': { board: ['Jh', '9s', '4c', '2d'], teachBack: 'Overpair en turn seguro: barrel de value. Cobras a peores pares y draws.' },
  'c18-06': { board: ['As', 'Kd', 'Qc', '2h'], teachBack: 'Underpair en broadway: pot control o fold a presión. No te pegues a la pareja baja.' },
  'c18-07': { board: ['Kh', '9d', '2c', '3s'], teachBack: 'AA en seco: barrel turn value frecuente tras c-bet flop.' },
  'c18-08': { board: ['As', 'Kd', '2c', '3s'], teachBack: 'Air sin equity en turn brick: give up. No second barrel spew.' },
  'c18-09': { board: ['Jh', '8c', '3d', '2s'], teachBack: 'Overpair en turn seguro: barrel value. Cobra a peores pares y niega equity.' },
  'c18-10': { board: ['As', '9d', '4c', '2h'], teachBack: 'Top pair en turn brick: value. No check raro siempre.' },
  'c18-11': { board: ['Kh', '7s', '2c', '3d'], teachBack: 'Top pair K en turn brick: barrel frecuente. Value + protección.' },
  'c18-12': { cards: ['Ad', '2c'], board: ['Ts', '8h', '7d', '3c'], teachBack: 'Air en board wet: sé selectivo. No barrel automático solo porque abriste.' },
  'c18-13': { board: ['Ah', '6d', '2c', '3s'], teachBack: 'Pareja media en A-high: barrel selectivo o pot control.' },
  'c18-14': { board: ['Kd', '9c', '2s', '3h'], teachBack: 'Air en K-high turn brick: give up frecuente. No second barrel spew.' },

  /* C-19 river: flop + brick turn/river (salvo manos que necesitan carta concreta) */
  'c19-01': { board: ['As', '7c', '2d', '3h', '5s'], teachBack: 'TPTK en river seco: value bet frecuente. Peores manos (Ax peor, Kx, pares bajos) aún pagan.' },
  'c19-02': { board: ['As', '7c', '2d', '3h', '5s'], teachBack: 'KK en A-high river: pot control — no hinches como si tuvieras la nuez.' },
  'c19-03': { board: ['Qc', '8s', '3h', '2d', '5c'], teachBack: 'Set (trío) en river: value fat. Sizing mayor — quieres valor máximo.' },
  'c19-04': { board: ['As', 'Kd', 'Qc', '2h', '5s'], teachBack: 'Aire en broadway: no hagas bluff spew sin blockers ni historia. Better give up.' },
  'c19-05': { board: ['Ah', '9c', '4s', '2d', '7h'], teachBack: 'Top pair débil (A5) en river: thin value frecuente. No es nuts; tampoco es aire — cobra a peores que pagan.' },
  'c19-06': { board: ['9h', '6d', '2c', '5s', '3d'], teachBack: 'Escalera (5-9) en river: value fat. Cobras fuerte; pocas manos te ganan.' },
  'c19-07': { cards: ['Ah', 'Kd'], board: ['As', '7h', '2c', '3d', '5s'], teachBack: 'TPTK en river seco: value bet. Peores Ax y Kx aún pagan; no check-back por miedo.' },
  'c19-08': { board: ['As', 'Kd', '2c', '3s', '5h'], teachBack: 'Air river: fold o bluff solo con blockers. No spew.' },
  'c19-09': { board: ['Js', '8c', '3d', '2h', '5s'], teachBack: 'Overpair river seco: value bet. Cobras a Jx (top pair) y peores pares; el board no está paired.' },
  'c19-10': { board: ['As', '9c', '4h', '2d', '7s'], teachBack: 'Top pair river: value thin OK vs calling range que paga de más.' },
  'c19-11': { board: ['Kd', '7s', '2c', '3h', '5s'], teachBack: 'Top pair K river seco: value bet frecuente.' },
  'c19-12': { cards: ['Qd', '9c'], board: ['As', '8h', '3d', '2c', '5s'], teachBack: 'Facing river bet con aire/mano débil: fold si el precio no justifica call.' },
  'c19-13': { board: ['9h', '6c', '2d', '3s', '5h'], teachBack: 'Overpair river seco (board no paired): value bet. Cobras a top pair (9x) y peores; un 9x no tiene trío aquí.' },
  'c19-14': { board: ['Ah', 'Kh', '3s', '2d', '7c'], teachBack: 'Air river en A-K: no bluff spew sin blockers fuertes.' },

  /* C-20 examen */
  'c20-04': { board: ['Jh', '9s', '4c', '2d'], teachBack: 'Overpair: barrel de value en turn seguro.' },
  'c20-05': { board: ['As', '7c', '2d', '3h', '5s'], teachBack: 'TPTK: value bet de river. No undervaluees.' },
  'c20-12': { board: ['Qc', 'Jd', '2s', '3h'], teachBack: 'Examen: overpair turn → barrel value.' },
  'c20-13': { board: ['Ah', '9c', '4d', '2s', '7h'], teachBack: 'Examen: top pair river → value thin OK.' }
};

function fmtCards(arr) {
  return '[' + arr.map((c) => "'" + c + "'").join(', ') + ']';
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patchFile(rel) {
  const fp = path.join(root, rel);
  let src = fs.readFileSync(fp, 'utf8');
  let n = 0;
  Object.keys(PATCH).forEach((id) => {
    const p = PATCH[id];
    const idRe = new RegExp("(['\"])" + escapeRe(id) + "\\1");
    const found = idRe.exec(src);
    if (!found) return;
    const start = found.index;
    // Window for flop('id', pos, cards, board, ...)
    const win = src.slice(start, start + 400);
    if (p.cards) {
      const cardRe = /\[['\"][AKQJT2-9][shdc]['\"],\s*['\"][AKQJT2-9][shdc]['\"]\]/;
      const cm = cardRe.exec(win);
      if (cm) {
        const abs = start + cm.index;
        src = src.slice(0, abs) + fmtCards(p.cards) + src.slice(abs + cm[0].length);
      }
    }
    const found2 = idRe.exec(src) || new RegExp("(['\"])" + escapeRe(id) + "\\1").exec(src);
    if (!found2) return;
    const s2 = found2.index;
    const win2 = src.slice(s2, s2 + 450);
    // board is second array after cards in flop()
    const arrays = [];
    const arrRe = /\[['\"][AKQJT2-9][shdc]['\"](?:,\s*['\"][AKQJT2-9][shdc]['\"])*\]/g;
    let m;
    while ((m = arrRe.exec(win2))) arrays.push({ index: m.index, text: m[0] });
    // cards = first, board = second
    if (arrays.length >= 2 && p.board) {
      const b = arrays[1];
      const abs = s2 + b.index;
      src = src.slice(0, abs) + fmtCards(p.board) + src.slice(abs + b.text.length);
    }
    if (p.teachBack) {
      const found3 = new RegExp("(['\"])" + escapeRe(id) + "\\1").exec(src);
      if (!found3) return;
      const s3 = found3.index;
      const w3 = src.slice(s3, s3 + 700);
      const tbM = /teachBack:\s*'/.exec(w3);
      if (!tbM) return;
      const tbStart = s3 + tbM.index + tbM[0].length;
      const tbEnd = src.indexOf("'", tbStart);
      if (tbEnd < 0 || tbEnd - tbStart > 500) return;
      src = src.slice(0, tbStart) + p.teachBack + src.slice(tbEnd);
    }
    n += 1;
  });
  fs.writeFileSync(fp, src);
  return n;
}

const files = ['js/school-data-m2.js', 'js/school-extra-spots.js'];
files.forEach((f) => console.log(f, 'patched', patchFile(f)));
