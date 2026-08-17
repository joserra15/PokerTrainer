/* Regresión del módulo de estadísticas: pestañas, métricas y leaks. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const leaksJs = fs.readFileSync(path.join(root, 'js', 'leaks.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');
const payloadJs = fs.readFileSync(path.join(root, 'js', 'ai-hand-payload.js'), 'utf8');

function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'función ' + name + ' presente');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('no se pudo extraer ' + name);
}

const renderStatsSrc = extractFn(appJs, 'renderStats');
const renderHomeSrc = extractFn(appJs, 'renderHome');

assert(/id="home-gamification"/.test(indexHtml), 'host home-gamification conservado');
assert(/id="stats-gamification"/.test(indexHtml), 'host stats-gamification conservado');
assert(/id="home-gamification"[^>]*hidden|hidden[^>]*id="home-gamification"/.test(indexHtml),
  'gamificación de home oculta');
assert(/id="stats-gamification"[^>]*hidden|hidden[^>]*id="stats-gamification"/.test(indexHtml),
  'gamificación de stats oculta');
assert(!/PTGamification\.renderHome/.test(appJs), 'home no pinta racha/rating');
assert(!/PTGamification\.renderStats/.test(appJs), 'stats no pinta racha/rating');
assert(!/Manos entrenadas/.test(renderHomeSrc), 'home ya no muestra volumen de manos');
assert(!/En histórico/.test(renderHomeSrc), 'home ya no muestra histórico');
assert(/Acierto global/.test(renderHomeSrc), 'home muestra acierto global');
assert(/Errores a repasar/.test(renderHomeSrc), 'home muestra errores a repasar');

assert(/data-stats-tab="trainer"/.test(renderStatsSrc), 'pestaña Entrenador');
assert(/data-stats-tab="sessions"/.test(renderStatsSrc), 'pestaña Sesiones');
assert(/__ptStatsTab/.test(appJs), 'tab activa persistida');
assert(!/renderStatsCarousel\(/.test(renderStatsSrc), 'carousels fuera de renderStats');
assert(!/Leak detector/.test(renderStatsSrc), 'leak detector global fuera de stats');
assert(!/Top 5 · Sesiones importadas/.test(appJs + leaksJs), 'título de sesiones no parece Escuela');
assert(/Fugas en sesiones importadas|Top 5 fugas/.test(renderStatsSrc + leaksJs),
  'fugas de sesiones etiquetadas como importadas');

const trainerSlice = renderStatsSrc.slice(
  renderStatsSrc.indexOf('data-stats-panel="trainer"'),
  renderStatsSrc.indexOf('data-stats-panel="sessions"')
);
const sessionsSlice = renderStatsSrc.slice(renderStatsSrc.indexOf('data-stats-panel="sessions"'));
assert(trainerSlice.indexOf('Acierto por calle') < trainerSlice.indexOf('Acierto semanal'),
  'entrenador: calle antes que semanal');
assert(trainerSlice.indexOf('Acierto semanal') < trainerSlice.indexOf('Top 5 fugas'),
  'entrenador: semanal antes que top 5');
assert(sessionsSlice.indexOf('Acierto por calle') < sessionsSlice.indexOf('Acierto semanal'),
  'sesiones: calle antes que semanal');
assert(/stats-format-filter/.test(sessionsSlice), 'filtro de formato solo en sesiones');
assert(!/stats-format-filter/.test(trainerSlice), 'entrenador sin filtro de formato');
assert(/Drill adaptativo/.test(trainerSlice), 'drill en pestaña entrenador');
assert(!/Drill adaptativo/.test(sessionsSlice), 'sesiones sin drill adaptativo');
assert(!/EV perdido/.test(trainerSlice), 'entrenador no muestra EV perdido');
assert(!/Manos por semana|Volumen/.test(trainerSlice), 'entrenador no muestra volumen semanal');
assert(/Detalle avanzado/.test(sessionsSlice), 'sesiones tienen detalle colapsable');
assert(/EV perdido/.test(sessionsSlice), 'EV de sesiones queda en detalle avanzado');

assert(/feat\.stats\.title/.test(indexHtml), 'landing incluye tile de estadísticas');
assert(/Acierto por calle y por semana/.test(i18n), 'copy de stats sin EV en landing ES');
assert(!/EV perdido, leaks/.test(i18n), 'copy i18n de stats ya no lidera con EV');

assert(/\.stats-tabs/.test(css), 'CSS de pestañas');
assert(/\.stats-street-hero/.test(css), 'CSS hero acierto por calle');
assert(/\.stats-leak-action/.test(css), 'CSS acciones de leak discretas');
assert(/\.leak-bar-row/.test(css), 'CSS barras horizontales de leaks');
assert(/home-stats-strip \{[\s\S]*repeat\(2/.test(css), 'home stats en 2 columnas');

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Number,
  String,
  Object,
  Array
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(leaksJs, sandbox, { filename: 'leaks.js' });
const PTLeaks = sandbox.window.PTLeaks;
assert.ok(PTLeaks && PTLeaks.renderLeakList, 'PTLeaks.renderLeakList');
assert.ok(PTLeaks.parseLeakKey, 'PTLeaks.parseLeakKey');
assert.ok(PTLeaks.aggregateLeaksMap, 'PTLeaks.aggregateLeaksMap');

const trainerKey = PTLeaks.parseLeakKey('RFI|UTG2|preflop');
assert.strictEqual(trainerKey.type, 'RFI');
assert.strictEqual(trainerKey.street, 'preflop');
const sessionKey = PTLeaks.parseLeakKey('mtt|postflop|BTN|river');
assert.strictEqual(sessionKey.type, 'postflop');
assert.strictEqual(sessionKey.street, 'river');
assert.strictEqual(sessionKey.pos, 'BTN');

const mixed = PTLeaks.aggregateLeaksMap({
  'mtt|postflop|BTN|river': { count: 10, evLoss: 40 },
  'cash6|RFI|UTG|preflop': { count: 4, evLoss: 8 },
  'cash6|flop|BTN|flop': { count: 2, evLoss: 3 }
});
assert.ok(mixed.byStreet.every((r) => /preflop|flop|turn|river|postflop/.test(r.street)),
  'agregado de sesiones no mezcla posiciones como calles');
assert.ok(!mixed.byStreet.some((r) => r.street === 'BTN' || r.label === 'BTN'),
  'BTN no aparece como calle');

const bars = PTLeaks.renderBreakdownBars('Test', [
  { street: 'flop', label: 'Flop', count: 6, evLoss: 12.4 }
], '--red', 'street');
assert.ok(bars.indexOf('data-leak-filter-street="flop"') >= 0, 'barras clicables por calle');
assert.ok(bars.indexOf('leak-bar-row') >= 0, 'barras horizontales');
assert.ok(!/\d+\.\d+ bb/.test(bars), 'barras de leak sin EV en bb');

const trainerRows = PTLeaks.renderLeakList([
  { key: 'RFI|UTG2|preflop', label: 'RFI · UTG2 · Preflop', count: 3, evLoss: 16.13 }
], { mode: 'trainer' });
assert.ok(trainerRows.indexOf('RFI · UTG2 · Preflop') >= 0, 'título de leak visible');
assert.ok(trainerRows.indexOf('3 errores') >= 0, 'conteo de errores');
assert.ok(trainerRows.indexOf('EV perdido') < 0, 'top 5 entrenador sin EV');
assert.ok(trainerRows.indexOf('data-stats-train-leak') >= 0, 'acción Repetir');
assert.ok(trainerRows.indexOf('btn-primary') < 0, 'Repetir no es botón primario');

const sessionRows = PTLeaks.renderLeakList([
  { key: 'cash6|postflop|BB|flop', label: 'Flop · Carta alta', count: 13, evLoss: 618.52, sessionId: 's1' }
], { mode: 'sessions' });
assert.ok(sessionRows.indexOf('Flop · Carta alta') >= 0, 'label de sesión importada');
assert.ok(sessionRows.indexOf('Ir a la sesión') >= 0, 'CTA de sesión, no lección');
assert.ok(sessionRows.indexOf('Ver lección') < 0, 'sesiones no muestran Ver lección');
assert.ok(sessionRows.indexOf('EV perdido') < 0, 'top 5 sesiones sin EV');

vm.runInContext(payloadJs, sandbox, { filename: 'ai-hand-payload.js' });
const payload = sandbox.window.PTAIHandPayload.build('statsGlobal', {
  stats: {
    handsPlayed: 8,
    decisions: 20,
    optima: 12,
    aceptable: 4,
    imprecisa: 2,
    error: 2,
    totalEvLoss: 4,
    totalNet: 1,
    byStreet: {
      preflop: { n: 10, good: 8 },
      flop: { n: 6, good: 3 },
      turn: { n: 3, good: 2 },
      river: { n: 1, good: 1 }
    }
  },
  weekly: [{ label: 'W1', hands: 4, accuracy: 80, evLoss: 1 }],
  sessionStreet: { preflop: 70, flop: 55, turn: 60, river: 40 },
  focus: 'trainer'
});
assert.strictEqual(payload.src, 'statsGlobal');
assert.ok(payload.st && payload.st.accSt && payload.st.accSt.pf === 80, 'payload prioriza acierto por calle');
assert.ok(payload.sessAccSt && payload.sessAccSt.fl === 55, 'payload incluye acierto por calle de sesiones');
assert.strictEqual(payload.focus, 'trainer', 'payload conoce la pestaña activa');

console.log('test-stats-redesign: OK');
