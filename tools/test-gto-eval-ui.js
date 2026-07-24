/**
 * Regresión UI evaluación GTO:
 * - Botones Matriz GTO / Matriz villano visibles sin chunk ranges precargado
 * - Si óptima == elegida → solo clase .best (verde), no .chosen (azul)
 * - Estilos de matriz más visibles; sin doble borde azul+verde
 */
const fs = require('fs');
const path = require('path');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const shareCss = fs.readFileSync(path.join(root, 'css/share.css'), 'utf8');

assert(/PT_BUILD\s*=\s*'1\.59\.3'/.test(version), 'versión 1.59.3');

assert(
  !/matrixSource\s*&&\s*window\.PTRangeMatrix/.test(app),
  'renderHandDecisionsSummary no exige PTRangeMatrix para mostrar botones'
);
assert(
  /if\s*\(\s*matrixSource\s*\)\s*\{[\s\S]*?dec-matrix-row[\s\S]*?matrixStreetBtn/.test(app),
  'botones matriz se renderizan con matrixSource'
);
assert(
  /function findStreetDecisionIndex/.test(app),
  'índice de decisión local (sin depender del chunk ranges)'
);
assert(
  !/PTRangeMatrix\s*\?\s*window\.PTRangeMatrix\.findDecisionIndex/.test(app),
  'timeline no oculta botones si PTRangeMatrix no está cargado'
);
assert(
  /class="btn btn-matrix"/.test(app) && !/btn-ghost btn-matrix/.test(app),
  'botones matriz sin btn-ghost (más visibles)'
);

function optionPillClass(isChosen, isBest) {
  if (isBest) return 'best';
  if (isChosen) return 'chosen';
  return '';
}

assert(optionPillClass(true, true) === 'best', 'coinciden → solo best (verde)');
assert(optionPillClass(true, false) === 'chosen', 'elegida no óptima → chosen (azul)');
assert(optionPillClass(false, true) === 'best', 'óptima no elegida → best (verde)');
assert(optionPillClass(false, false) === '', 'ni elegida ni óptima → sin clase');

assert(
  /isBest\s*\?\s*'best'\s*:\s*\(isChosen\s*\?\s*'chosen'\s*:\s*''\)/.test(app),
  'renderOptionGrid aplica la regla coincidencia → solo best'
);
assert(
  !/isChosen\s*\?\s*'chosen'\s*:\s*''\}\s*\$\{isBest\s*\?\s*'best'/.test(app),
  'ya no se apilan chosen + best en el mismo pill'
);

assert(/\.btn-matrix\s*\{/.test(styles), 'estilos .btn-matrix presentes');
assert(
  /\.btn-matrix[\s\S]{0,280}font-size:\s*13px/.test(styles),
  'botón matriz con tamaño visible (13px)'
);
assert(
  /\.btn-matrix[\s\S]{0,280}rgba\(47,129,247/.test(styles),
  'botón matriz con fondo accent visible'
);
assert(
  !/inset\s+0\s+0\s+0\s+1px\s+rgba\(47,129,247/.test(styles),
  'styles.css sin halo azul inset en chosen+best'
);
assert(
  !/inset\s+0\s+0\s+0\s+1px\s+rgba\(47,129,247/.test(shareCss),
  'share.css sin halo azul inset en chosen+best'
);
assert(
  /\.opt-pill\.chosen\.best\s*\{[^}]*box-shadow:\s*none/.test(styles),
  'fallback CSS chosen.best sin box-shadow azul'
);

if (failed) {
  console.error('\n*** TEST GTO-EVAL-UI FALLÓ (' + failed + ') ***');
  process.exit(1);
}
console.log('\n*** TEST GTO-EVAL-UI OK ***');
