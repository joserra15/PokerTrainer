/**
 * Fase 3 entrenador: capas Spin/MTT, Nash push, blinds HUD, escuela.
 * Uso: node tools/test-trainer-fase3.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let failed = 0;
function check(cond, msg) {
  if (!cond) { failed++; console.error('FAIL:', msg); }
  else console.log('OK:', msg);
}

const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
check(/PT_BUILD\s*=\s*'2.7.36'/.test(version), 'PT_BUILD 2.7.36');

check(fs.existsSync(path.join(root, 'data/ranges/phase3-layers.json')), 'phase3-layers.json existe');
check(fs.existsSync(path.join(root, 'data/ranges/nash-push-fold.json')), 'nash-push-fold.json existe');
check(fs.existsSync(path.join(root, 'js/engine/ranges/phase3-layers-data.js')), 'phase3-layers-data.js embebido');
check(fs.existsSync(path.join(root, 'js/engine/ranges/nash-push-data.js')), 'nash-push-data.js embebido');

const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');
check(/phase3-layers-data\.js/.test(chunks) && /nash-push-data\.js/.test(chunks), 'bundle incluye capas Fase 3');

const layers = JSON.parse(fs.readFileSync(path.join(root, 'data/ranges/phase3-layers.json'), 'utf8'));
check(layers.spinOpen && layers.spinOpen['25'] && layers.spinOpen['10'], 'capas spinOpen 25 y 10');
check(layers.mttOpen && layers.mttOpen.early && layers.mttOpen.short, 'capas mttOpen early/short');
check(layers.mttVsRfi && layers.mttVsRfi.bubble, 'capa mttVsRfi bubble');

const nash = JSON.parse(fs.readFileSync(path.join(root, 'data/ranges/nash-push-fold.json'), 'utf8'));
check(nash.shoveByDepth && nash.shoveByDepth['10'] && nash.shoveByDepth['10'].BTN.AA === 1, 'nash shove 10bb BTN AA');

const sandbox = { window: {}, console, Math, Date, Object, Array, Number, String, Boolean, JSON, parseInt, isNaN };
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

const ENGINE = [
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/extended.js',
  'js/engine/ranges/rfi-solver-data.js',
  'js/engine/ranges/vs-rfi-solver-data.js',
  'js/engine/ranges/vs-3bet-solver-data.js',
  'js/engine/ranges/variants.js',
  'js/engine/ranges/phase3-layers-data.js',
  'js/engine/ranges/nash-push-data.js',
  'js/engine/ranges/jsonLoader.js',
  'js/engine/ranges/pushFold.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/weights.js',
  'js/engine/handStrength.js',
  'js/play-config.js'
];
ENGINE.forEach(load);

const w = sandbox.window;
const Reg = w.GTORangesRegistry;
const Tax = w.PTFormatTaxonomy;
const PC = w.PTPlayConfig;
const PF = w.GTOPushFold;

check(!!(w.GTORangesVariants && w.GTORangesVariants.PHASE_LAYERS), 'PHASE_LAYERS instaladas');
check(!!w.PT_NASH_PUSH, 'PT_NASH_PUSH instalado');

const spin25 = Reg.getOpenRaiseRow('BTN', { formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb25', stackBB: 25 });
const spin10 = Reg.getOpenRaiseRow('BTN', { formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb10', stackBB: 10 });
check(!!spin25 && !!spin10, 'spin open BTN 25 y 10 existen');
check(spin25.raise !== spin10.raise || spin25.mix !== spin10.mix, 'spin 25bb ≠ 10bb charts');

const mttEarly = Reg.getOpenRaiseRow('LJ', { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'early', stackDepth: 'bb100', stackBB: 100 });
const mttShort = Reg.getOpenRaiseRow('LJ', { formatHub: 'mtt', gameType: 'mtt', mttPhase: 'short', stackDepth: 'bb20', stackBB: 20 });
check(!!mttEarly && !!mttShort, 'mtt LJ early/short existen');
check(mttEarly.raise !== mttShort.raise || mttEarly.mix !== mttShort.mix, 'mtt early ≠ short LJ');

const blinds = Tax.blindStructureFor({ formatHub: 'mtt', stackBB: 20, mttPhase: 'short', anteBB: 0.15 });
check(!!blinds && blinds.level > 0 && /Nv\./.test(blinds.label), 'blindStructureFor MTT short');
check(blinds.anteLabel && /Ante/.test(blinds.anteLabel), 'ante % en estructura');

const cfg = PC.normalize({ formatHub: 'spin', gameType: 'spin3', stackDepth: 'bb15' });
check(!!cfg.blindStructure && cfg.blindLevel != null, 'play-config adjunta blindStructure');

const shoveAA = PF.pushFoldStrategy({ handCode: 'AA', position: 'BTN', effStack: 10, toCallBB: 0 });
check(shoveAA.allin >= 0.8, 'Nash AA BTN 10bb shove alto');
const foldJunk = PF.pushFoldStrategy({ handCode: '72o', position: 'UTG', effStack: 10, toCallBB: 0 });
check(foldJunk.fold >= 0.8, 'Nash 72o UTG 10bb fold alto');
const callKK = PF.pushFoldStrategy({ handCode: 'KK', position: 'BB', effStack: 10, toCallBB: 10, vsPosition: 'BTN' });
check(callKK.allin + callKK.call >= 0.7, 'Nash KK BB call/shove vs BTN');

const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
check(/blindStructure|is-blinds|Ante %/.test(app) || /blinds\.label/.test(app), 'HUD usa estructura de blinds');

const schoolMtt = fs.readFileSync(path.join(root, 'js/school-data-mtt.js'), 'utf8');
check(/kind === 'MTT_SHORT'/.test(schoolMtt) && /kind === 'MTT_PUSH'/.test(schoolMtt), 'MTT_SHORT separado de MTT_PUSH');
check(/MTT_BUBBLE/.test(schoolMtt) && /spots": "MTT_BUBBLE"/.test(schoolMtt), 'T-13 con drills bubble');

const decision = fs.readFileSync(path.join(root, 'docs/DECISION_ENTRENADOR_MTT_SPIN.md'), 'utf8');
check(/Fase 3.*completa|P3a.*hecho|Estado Fase 3/i.test(decision) || /Implementado/.test(decision), 'doc decisión actualizado');

if (failed) {
  console.error('\n*** test-trainer-fase3: ' + failed + ' fallos ***');
  process.exit(1);
}
console.log('\n*** test-trainer-fase3 OK ***');
