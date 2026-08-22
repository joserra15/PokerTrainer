/**
 * Celdas 13×13 clicables → pop-up con detalle de porcentajes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const rmSrc = fs.readFileSync(path.join(root, 'js/range-matrix.js'), 'utf8');
const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'2.7.24'/.test(version), 'versión 2.7.24');
assert.ok(/id="range-cell-modal"/.test(html), 'modal de celda en index.html');
assert.ok(/id="range-cell-body"/.test(html), 'body del modal de celda');
assert.ok(/data-rm-detail/.test(rmSrc), 'celdas con data-rm-detail');
assert.ok(/function buildCellDetailHtml/.test(rmSrc), 'buildCellDetailHtml');
assert.ok(/function renderCellHtml/.test(rmSrc), 'renderCellHtml');
assert.ok(/raw\s*=\s*strategyForCombo/.test(rmSrc) || /raw,\s*$/m.test(rmSrc) || /freqs, raw/.test(rmSrc), 'celdas guardan raw');
assert.ok(/'allin'/.test(rmSrc) && /RAISE_KEYS/.test(rmSrc), 'allin en RAISE_KEYS');
assert.ok(/openRangeCellDetail/.test(app), 'openRangeCellDetail en app');
assert.ok(/closeRangeCellDetail/.test(app), 'closeRangeCellDetail en app');
assert.ok(/\[data-rm-detail\]/.test(app), 'click handler data-rm-detail');
assert.ok(/range-cell-modal/.test(styles), 'estilos modal celda');
assert.ok(/rm-detail-bar/.test(styles), 'estilos barras %');
assert.ok(/rm-cell-btn/.test(styles), 'estilos botón celda');
assert.ok(
  /button\.rm-cell-btn\s*\{[^}]*font-size:\s*8px/.test(styles) && !/button\.rm-cell-btn\s*\{[^}]*font:\s*inherit/.test(styles),
  'botón celda conserva font-size 8px (sin font:inherit)'
);
assert.ok(/Clic en una celda/.test(html), 'hint en explorador Rangos');
assert.ok(/range-matrix\.js/.test(chunks), 'chunk ranges incluye range-matrix');

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isNaN,
  encodeURIComponent,
  decodeURIComponent,
  Infinity,
  NaN
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(rmSrc, sandbox, { filename: 'range-matrix.js' });

const RM = sandbox.PTRangeMatrix;
assert.ok(RM, 'PTRangeMatrix cargado');
const bbvsbHeroes = RM.heroPositionsForSpot('bbvsb');
const bbvsbVillains = RM.villainPositionsForSpot('bbvsb');
assert.ok(Array.isArray(bbvsbHeroes) && bbvsbHeroes.length === 1 && bbvsbHeroes[0] === 'BB', 'bbvsb solo permite hero BB');
assert.ok(Array.isArray(bbvsbVillains) && bbvsbVillains.length === 1 && bbvsbVillains[0] === 'SB', 'bbvsb expone villano SB en el explorador');
const bbVsSbInput = RM.buildExplorerInput('bbvsb', 'BB', 'SB');
assert.ok(bbVsSbInput, 'bbvsb construye input del explorador');
assert.strictEqual(bbVsSbInput.position, 'BB', 'bbvsb fija hero BB');
assert.strictEqual(bbVsSbInput.vsPosition, 'SB', 'bbvsb fija villano SB');

const collapsed = RM.collapseStrategy({ raise: 0.5, allin: 0.2, call: 0.1, fold: 0.2 });
assert.ok(Math.abs(collapsed.raise - 0.7) < 0.02, 'allin suma a raise: ' + collapsed.raise);

const cell = {
  label: 'AKs',
  action: 'raise',
  freqs: { raise: 0.72, call: 0.08, fold: 0.2 },
  raw: { raise: 0.5, allin: 0.22, call: 0.08, fold: 0.2 }
};
const htmlCell = RM.renderCellHtml(cell, { mode: 'gto' });
assert.ok(/data-rm-detail=/.test(htmlCell), 'renderCellHtml incluye payload');
assert.ok(/button/.test(htmlCell), 'celda es button');
assert.ok(/AKs/.test(htmlCell), 'label AKs');

const encoded = RM.encodeCellDetail(cell, 'gto');
const decoded = RM.decodeCellDetail(encoded);
assert.strictEqual(decoded.label, 'AKs');
assert.ok(decoded.freqs && decoded.raw);

const detail = RM.buildCellDetailHtml(decoded);
assert.ok(/72%/.test(detail), 'muestra % raise colapsado');
assert.ok(/All-in/.test(detail), 'desglose all-in');
assert.ok(/data-close-cell-detail/.test(detail), 'botón cerrar');
assert.ok(RM.handKindLabel('AKs') === 'Suited', 'kind suited');
assert.ok(RM.handKindLabel('AA') === 'Pareja', 'kind pair');
assert.ok(RM.handKindLabel('AKo') === 'Offsuit', 'kind offsuit');

const villainHtml = RM.buildCellDetailHtml({
  label: 'QQ',
  mode: 'villain',
  action: 'value',
  title: 'Valor fuerte'
});
assert.ok(/Valor fuerte/.test(villainHtml), 'popup villano muestra título');
assert.ok(/categoría estimada/.test(villainHtml), 'popup villano aclara no-GTO');

console.log('*** test-range-cell-popup OK ***');
