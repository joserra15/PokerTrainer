/**
 * Genera data/ranges/phase3-layers.json y nash-push-fold.json
 * a partir de las tablas MTT/Spin actuales (fuente de verdad embebida).
 * Uso: node tools/generate-phase3-layers.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console };
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

[
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/extended.js'
].forEach(load);

const V = sandbox.window.GTORangesVariants;
const Ext = sandbox.window.GTORangesExtended;
const D = sandbox.window.GTORangesData;

function cloneTable(t) {
  const out = {};
  Object.keys(t || {}).forEach((k) => {
    out[k] = Object.assign({}, t[k]);
  });
  return out;
}

function pickSpin(table) {
  const out = {};
  ['BTN', 'SB'].forEach((p) => {
    if (table[p]) out[p] = Object.assign({}, table[p]);
  });
  // Spin 3-max: BB no abre RFI clásico; dejar vacío
  return out;
}

/** Ensancha un poco el mix (Spin más loose que MTT 9-max). */
function widenMix(row, extra) {
  if (!row) return row;
  const mix = [row.mix || '', extra || ''].filter(Boolean).join(', ');
  return { raise: row.raise || '', mix: mix };
}

function tightenRaise(row, dropFromRaiseToMix) {
  if (!row) return row;
  // Representación simple: no parseamos notation; solo anexamos nota en mix si hace falta
  return Object.assign({}, row);
}

const mttEarly = cloneTable(V.OPEN_RAISE_MTT);
const mttMid = cloneTable(V.OPEN_RAISE_MTT_SHORT);
// Mid un poco más wide en LP: reutilizar SHORT pero con extras en BTN/CO
mttMid.BTN = widenMix(mttMid.BTN, '65s, 54s, K9o, Q9o');
mttMid.CO = widenMix(mttMid.CO, '76s, A8o, KTo');
const mttShort = cloneTable(V.OPEN_RAISE_MTT_SHORT);
// Short más tight EP
mttShort.UTG = { raise: 'TT+, AQs+, AKo', mix: '99, 88, AJs, KQs, AQo' };
mttShort.UTG1 = { raise: 'TT+, AQs+, AKo', mix: '99, 88, AJs, KQs, AQo' };
mttShort.LJ = { raise: '99+, AJs+, KQs, AQo+, KQo', mix: '88, 77, ATs, KJs, QJs, AJo, KJo' };

const mttPush = cloneTable(Ext.OPEN_RAISE_MTT_PUSH);

const spin25 = pickSpin(mttEarly);
spin25.BTN = widenMix(spin25.BTN, '54s, 43s, K8o, Q8o, J8o');
spin25.SB = widenMix(spin25.SB, '76s, 65s, A7o, K9o');

const spin20 = pickSpin(mttMid);
spin20.BTN = widenMix(spin20.BTN, '54s, K8o, Q8o');
spin20.SB = widenMix(spin20.SB, '76s, A7o');

const spin15 = pickSpin(mttShort);
spin15.BTN = widenMix(spin15.BTN, '65s, A7o, K9o');
spin15.SB = { raise: '77+, A9s+, KTs+, QJs, JTs, ATo+, KJo+', mix: '66, 55, A5s-A8s, 98s, K9s, QTo' };

const spin10 = pickSpin(mttPush);
spin10.BTN = widenMix(spin10.BTN, '55, 44, 87s, 76s, A8o, K9o');
spin10.SB = { raise: '99+, ATs+, KJs+, QJs, AJo+, KQo', mix: '88, 77, A9s, KTs, T9s, ATo, KJo' };

const vsMtt = V.getVsRfiMtt ? cloneTable(V.getVsRfiMtt()) : {};
function trimVs(row, drop3bm, dropCm) {
  if (!row) return row;
  const out = Object.assign({}, row);
  if (drop3bm) {
    const drop = new Set(drop3bm.split(',').map((s) => s.trim()).filter(Boolean));
    out.threeBetMix = (out.threeBetMix || '').split(',').map((s) => s.trim()).filter((c) => c && !drop.has(c)).join(', ');
  }
  if (dropCm) {
    const drop = new Set(dropCm.split(',').map((s) => s.trim()).filter(Boolean));
    out.callMix = (out.callMix || '').split(',').map((s) => s.trim()).filter((c) => c && !drop.has(c)).join(', ');
  }
  return out;
}

function mapVs(fn) {
  const out = {};
  Object.keys(vsMtt).forEach((k) => { out[k] = fn(vsMtt[k]); });
  return out;
}

const vsEarly = mapVs((r) => Object.assign({}, r));
const vsMid = mapVs((r) => trimVs(r, 'A2o,A3o,T9o', ''));
const vsShort = mapVs((r) => trimVs(r, 'A5o-A2o, QJo, T9o', 'KJo, QJo, JTo, T9o'));
const vsBubble = mapVs((r) => trimVs(r, 'A9o-A2o, KJo, QJo, T9o, 98o, 22, 33, 44', 'KJo, QJo, JTo, T9o, 98o'));

function spinVsFrom(table) {
  const out = {};
  Object.keys(table).forEach((k) => {
    if (/^(BTN|SB|BB)_vs_(BTN|SB|BB)$/.test(k)) out[k] = Object.assign({}, table[k]);
  });
  return out;
}

const layers = {
  meta: {
    source: 'generate-phase3-layers.js',
    updated: new Date().toISOString().slice(0, 10),
    note: 'Capas Spin/MTT Fase 3 — charts de estudio (no solver tree)'
  },
  spinOpen: {
    '25': { meta: { format: 'spin3', stackBB: 25 }, positions: spin25 },
    '20': { meta: { format: 'spin3', stackBB: 20 }, positions: spin20 },
    '15': { meta: { format: 'spin3', stackBB: 15 }, positions: spin15 },
    '10': { meta: { format: 'spin3', stackBB: 10 }, positions: spin10 }
  },
  mttOpen: {
    early: { meta: { format: 'mtt', phase: 'early' }, positions: mttEarly },
    mid: { meta: { format: 'mtt', phase: 'mid' }, positions: mttMid },
    short: { meta: { format: 'mtt', phase: 'short' }, positions: mttShort },
    push: { meta: { format: 'mtt', phase: 'push' }, positions: mttPush }
  },
  spinVsRfi: {
    '25': { meta: { format: 'spin3', stackBB: 25 }, pairs: spinVsFrom(vsEarly) },
    '20': { meta: { format: 'spin3', stackBB: 20 }, pairs: spinVsFrom(vsMid) },
    '15': { meta: { format: 'spin3', stackBB: 15 }, pairs: spinVsFrom(vsShort) },
    '10': { meta: { format: 'spin3', stackBB: 10 }, pairs: spinVsFrom(vsBubble) }
  },
  mttVsRfi: {
    early: { meta: { format: 'mtt', phase: 'early' }, pairs: vsEarly },
    mid: { meta: { format: 'mtt', phase: 'mid' }, pairs: vsMid },
    short: { meta: { format: 'mtt', phase: 'short' }, pairs: vsShort },
    bubble: { meta: { format: 'mtt', phase: 'bubble' }, pairs: vsBubble }
  }
};

const nash = {
  meta: {
    source: 'generate-phase3-layers.js',
    updated: new Date().toISOString().slice(0, 10),
    note: 'Nash-approx push/fold por profundidad (frecuencias 0–1)'
  },
  shoveByDepth: {
    '8': {
      BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1, '66': 1, '55': 1, '44': 1, '33': 0.85, '22': 0.8,
        AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 1, A9s: 1, A9o: 0.9, A8s: 1, A8o: 0.85, A7s: 0.9, A6s: 0.85, A5s: 1, A4s: 1, A3s: 0.95, A2s: 0.95,
        KQs: 1, KQo: 1, KJs: 1, KJo: 0.9, KTs: 1, KTo: 0.75, K9s: 0.85, QJs: 1, QJo: 0.7, QTs: 0.9, JTs: 0.95, T9s: 0.9, '98s': 0.85, '87s': 0.8, '76s': 0.75, '65s': 0.7 },
      SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1, '66': 0.95, '55': 0.9,
        AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 0.9, A9s: 1, A9o: 0.8, A8s: 0.95, A5s: 0.95, A4s: 0.9, A3s: 0.85, A2s: 0.85,
        KQs: 1, KQo: 0.95, KJs: 1, KJo: 0.8, KTs: 0.95, QJs: 0.95, JTs: 0.9, T9s: 0.85, '98s': 0.8, '87s': 0.75 },
      CO: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 0.95, AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 0.95, ATs: 1, ATo: 0.85, KQs: 1, KQo: 0.9, KJs: 0.95, QJs: 0.9, JTs: 0.85 }
    },
    '10': {
      BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 1, '66': 0.95, '55': 0.9, '44': 0.8, '33': 0.7, '22': 0.65,
        AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 1, ATs: 1, ATo: 0.95, A9s: 1, A9o: 0.85, A8s: 0.95, A8o: 0.7, A7s: 0.85, A6s: 0.8, A5s: 0.95, A4s: 0.9, A3s: 0.85, A2s: 0.85,
        KQs: 1, KQo: 0.95, KJs: 1, KJo: 0.8, KTs: 0.95, KTo: 0.65, K9s: 0.8, QJs: 0.95, QJo: 0.6, QTs: 0.85, JTs: 0.9, T9s: 0.85, '98s': 0.8, '87s': 0.75, '76s': 0.7, '65s': 0.65 },
      SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 1, '77': 0.95, '66': 0.9, '55': 0.8,
        AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 0.95, ATs: 1, ATo: 0.85, A9s: 0.95, A9o: 0.7, A8s: 0.9, A5s: 0.9, A4s: 0.85, A3s: 0.8, A2s: 0.8,
        KQs: 1, KQo: 0.9, KJs: 0.95, KJo: 0.7, KTs: 0.9, QJs: 0.9, JTs: 0.85, T9s: 0.8, '98s': 0.75, '87s': 0.7 },
      CO: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 0.95, '77': 0.9, AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 0.9, ATs: 0.95, ATo: 0.75, KQs: 1, KQo: 0.85, KJs: 0.9, QJs: 0.85, JTs: 0.8 },
      HJ: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.8, ATs: 0.9, KQs: 0.95, KQo: 0.75, KJs: 0.85, QJs: 0.8 }
    },
    '12': {
      BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 1, '88': 0.95, '77': 0.9, '66': 0.85, '55': 0.75, '44': 0.65,
        AKs: 1, AKo: 1, AQs: 1, AQo: 1, AJs: 1, AJo: 0.95, ATs: 1, ATo: 0.85, A9s: 0.95, A9o: 0.7, A8s: 0.9, A7s: 0.75, A5s: 0.9, A4s: 0.85, A3s: 0.8, A2s: 0.8,
        KQs: 1, KQo: 0.9, KJs: 0.95, KJo: 0.7, KTs: 0.9, K9s: 0.7, QJs: 0.9, QTs: 0.8, JTs: 0.85, T9s: 0.8, '98s': 0.75, '87s': 0.7, '76s': 0.65 },
      SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, '77': 0.85, '66': 0.75,
        AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.85, ATs: 0.95, ATo: 0.75, A9s: 0.9, A8s: 0.85, A5s: 0.85, A4s: 0.8, A3s: 0.75, A2s: 0.75,
        KQs: 0.95, KQo: 0.85, KJs: 0.9, KJo: 0.6, KTs: 0.85, QJs: 0.85, JTs: 0.8, T9s: 0.75, '98s': 0.7 },
      CO: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, '77': 0.8, AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.8, ATs: 0.9, ATo: 0.65, KQs: 0.95, KQo: 0.75, KJs: 0.85, QJs: 0.8, JTs: 0.75 },
      HJ: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.9, '88': 0.8, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.7, ATs: 0.85, KQs: 0.9, KQo: 0.65, KJs: 0.8, QJs: 0.75 },
      UTG: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.85, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.85, AJs: 0.85, ATs: 0.75, KQs: 0.85, KJs: 0.7 }
    },
    '14': {
      BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, '77': 0.8, '66': 0.7,
        AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.85, ATs: 0.95, ATo: 0.75, A9s: 0.85, A8s: 0.8, A5s: 0.85, A4s: 0.8, A3s: 0.75, A2s: 0.75,
        KQs: 0.95, KQo: 0.85, KJs: 0.9, KJo: 0.55, KTs: 0.85, QJs: 0.85, JTs: 0.8, T9s: 0.7, '98s': 0.65 },
      SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.9, '88': 0.85, '77': 0.75,
        AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.75, ATs: 0.9, ATo: 0.65, A9s: 0.8, A5s: 0.8, A4s: 0.75,
        KQs: 0.9, KQo: 0.75, KJs: 0.85, KTs: 0.8, QJs: 0.8, JTs: 0.75 },
      CO: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.85, '88': 0.75, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.7, ATs: 0.85, KQs: 0.9, KQo: 0.65, KJs: 0.8 },
      HJ: { AA: 1, KK: 1, QQ: 1, JJ: 0.95, TT: 0.9, '99': 0.8, AKs: 1, AKo: 0.95, AQs: 0.9, AQo: 0.8, AJs: 0.85, ATs: 0.75, KQs: 0.85 },
      UTG: { AA: 1, KK: 1, QQ: 1, JJ: 0.95, TT: 0.85, AKs: 1, AKo: 0.95, AQs: 0.9, AQo: 0.75, AJs: 0.8, KQs: 0.8 }
    }
  },
  callByDepth: {
    '10': {
      BB: {
        BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, '77': 0.8, AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.85, ATs: 0.9, ATo: 0.7, A9s: 0.75, A5s: 0.7, KQs: 0.95, KQo: 0.8, KJs: 0.85, KTs: 0.75, QJs: 0.8, JTs: 0.7 },
        SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 1, '99': 0.95, '88': 0.9, '77': 0.85, '66': 0.75, AKs: 1, AKo: 1, AQs: 1, AQo: 0.95, AJs: 0.95, AJo: 0.9, ATs: 0.95, ATo: 0.8, A9s: 0.85, A8s: 0.75, A5s: 0.8, KQs: 0.95, KQo: 0.85, KJs: 0.9, KTs: 0.8, QJs: 0.85, JTs: 0.75 }
      },
      SB: {
        BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.9, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.75, ATs: 0.85, KQs: 0.9, KQo: 0.7, KJs: 0.8 }
      }
    },
    '12': {
      BB: {
        BTN: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.9, '88': 0.8, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.75, ATs: 0.85, A9s: 0.65, KQs: 0.9, KQo: 0.7, KJs: 0.8, QJs: 0.75 },
        SB: { AA: 1, KK: 1, QQ: 1, JJ: 1, TT: 0.95, '99': 0.9, '88': 0.85, '77': 0.75, AKs: 1, AKo: 1, AQs: 0.95, AQo: 0.9, AJs: 0.9, AJo: 0.8, ATs: 0.9, ATo: 0.7, A9s: 0.75, A5s: 0.7, KQs: 0.9, KQo: 0.75, KJs: 0.85, QJs: 0.8 }
      }
    },
    '14': {
      BB: {
        BTN: { AA: 1, KK: 1, QQ: 1, JJ: 0.95, TT: 0.9, '99': 0.8, AKs: 1, AKo: 0.95, AQs: 0.9, AQo: 0.85, AJs: 0.85, AJo: 0.65, ATs: 0.8, KQs: 0.85, KJs: 0.7 },
        SB: { AA: 1, KK: 1, QQ: 1, JJ: 0.95, TT: 0.9, '99': 0.85, '88': 0.75, AKs: 1, AKo: 0.95, AQs: 0.9, AQo: 0.85, AJs: 0.85, AJo: 0.7, ATs: 0.85, KQs: 0.85, KQo: 0.65, KJs: 0.75 }
      }
    }
  }
};

const outDir = path.join(root, 'data', 'ranges');
fs.writeFileSync(path.join(outDir, 'phase3-layers.json'), JSON.stringify(layers, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'nash-push-fold.json'), JSON.stringify(nash, null, 2) + '\n');
console.log('Wrote phase3-layers.json and nash-push-fold.json');
console.log('spinOpen keys', Object.keys(layers.spinOpen));
console.log('mttOpen keys', Object.keys(layers.mttOpen));
