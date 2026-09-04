#!/usr/bin/env node
/**
 * Regresión: explorador de Rangos con stacks short (20/10bb) + fase Spin/MTT,
 * y chrome de mesa (badge + HUD en una sola franja).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const ok = (cond, msg) => { assert.ok(cond, msg); console.log('OK:', msg); };

const html = read('index.html');
const css = read('css/styles.css');
const shareCss = read('css/share.css');
const app = read('js/app.js');
const version = read('js/version.js');

ok(/id="ranges-stack-depth"/.test(html) && /data-val="bb20"/.test(html) && /data-val="bb10"/.test(html),
  'Rangos: chips 20bb y 10bb');
ok(/id="ranges-mtt-phase"/.test(html) && /id="ranges-phase-group"/.test(html),
  'Rangos: selector de fase');
ok(/id="ranges-icm-group"/.test(html) && /data-ranges-hub="mtt"/.test(html),
  'Rangos: bloque ICM marcado solo MTT');
ok(/icmGroup\) icmGroup\.hidden = hub !== 'mtt'/.test(app),
  'Rangos: sync oculta ICM fuera de MTT');
ok(/\.ranges-filter-row\[hidden\][\s\S]*display:\s*none/.test(css),
  'CSS respeta hidden en filas de filtros Rangos');
ok(/\.setup-mtt-structure-fields\[hidden\][\s\S]*display:\s*none/.test(css),
  'CSS respeta hidden en campos ICM');
ok(!/No es un solver de field completo/.test(html),
  'Rangos ICM hint sin copy «solver de field completo»');
ok(/id="ranges-icm-hint"[^>]*>Con ICM activo la matriz/.test(html),
  'Rangos ICM hint presente');
ok(/hint\) hint\.hidden = !on/.test(app),
  'Rangos: hint ICM visible solo con checkbox en MTT');
ok(/id="table-train-chrome"/.test(html)
  && /table-train-chrome[\s\S]{0,120}table-format-badge[\s\S]{0,120}table-train-hud/.test(html),
  'mesa: badge + HUD dentro de table-train-chrome');
ok(/function syncRangesStackPhaseUI/.test(app) && /mttPhase/.test(app),
  'app.js sincroniza stack/fase del explorador');
ok(/\.table-train-chrome/.test(css) && /\.table-train-chrome/.test(shareCss),
  'CSS chrome en styles + share');
ok(/table-train-chrome[\s\S]{0,220}flex-wrap:\s*nowrap/.test(css),
  'chrome en una sola línea (nowrap)');
ok(/PT_BUILD\s*=\s*'3.1.5'/.test(version), 'PT_BUILD 3.1.5');

const sandbox = { window: {}, console, Math, Date, Object, Array, Number, String, JSON, parseInt, isFinite };
vm.createContext(sandbox);
function load(rel) {
  vm.runInContext(read(rel), sandbox, { filename: rel });
}
[
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/weights.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/phase3-layers-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/registry.js'
].forEach((rel) => {
  try { load(rel); } catch (e) { /* optional */ }
});

const Reg = sandbox.window.GTORangesRegistry;
const Tax = sandbox.window.PTFormatTaxonomy;
ok(!!Reg && !!Tax, 'registry + taxonomy cargados');

(function spinShortLayers() {
  const c10 = Reg.normalize({ gameType: 'spin3', stackDepth: 'bb10', mttPhase: 'auto' });
  ok(c10.stackBB === 10, 'spin bb10 → stackBB 10');
  ok(c10.effectivePhase === 'push' || c10.effectivePhase === 'short',
    'spin 10bb resuelve fase push/short, got ' + c10.effectivePhase);
  const open10 = Reg.getOpenRaiseTable({ gameType: 'spin3', stackDepth: 'bb10' });
  const open25 = Reg.getOpenRaiseTable({ gameType: 'spin3', stackDepth: 'bb25' });
  ok(open10 && open10.BTN && open25 && open25.BTN, 'spin open tables 10/25');
  const lbl = Reg.contextLabel({ gameType: 'spin3', stackDepth: 'bb20', mttPhase: 'auto' });
  ok(/20bb/.test(lbl) && /Spin/.test(lbl), 'contextLabel spin 20bb: ' + lbl);
})();

(function mttPhaseTables() {
  const early = Reg.getOpenRaiseTable({ gameType: 'mtt', stackDepth: 'bb50', mttPhase: 'early' });
  const short = Reg.getOpenRaiseTable({ gameType: 'mtt', stackDepth: 'bb20', mttPhase: 'short' });
  ok(early && early.LJ && short && short.LJ, 'mtt open early/short');
  const vsEarly = Reg.getVs3betRow
    ? Reg.getVs3betRow('HJ', 'SB', { gameType: 'mtt', stackDepth: 'bb25', mttPhase: 'early' })
    : null;
  const vsShort = Reg.getVs3betRow
    ? Reg.getVs3betRow('HJ', 'SB', { gameType: 'mtt', stackDepth: 'bb10', mttPhase: 'short' })
    : null;
  ok(vsEarly && vsShort, 'mtt vs3bet early/short rows');
  const lbl = Reg.contextLabel({ gameType: 'mtt', stackDepth: 'bb20', mttPhase: 'short' });
  ok(/20bb/.test(lbl) && /Short/.test(lbl), 'contextLabel mtt short: ' + lbl);
})();

console.log('\n*** test-ranges-stack-phase OK ***');
