/* Test: HTML compartido (envoltorio CTA + pie de caducidad, sin botones interactivos). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  document: {
    createElement: function () {
      return {
        style: {},
        classList: { add: function () {}, remove: function () {} },
        addEventListener: function () {},
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        appendChild: function () {}
      };
    },
    getElementById: function () { return null; },
    body: { appendChild: function () {} },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  },
  navigator: {},
  localStorage: { getItem: function () { return null; }, setItem: function () {} },
  fetch: async function () {
    return { ok: true, text: async function () { return 'body{color:red}'; }, json: async function () { return {}; } };
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

sandbox.window.PT_SITE = { appUrl: 'https://www.pokerforgeai.com/' };
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/share-hand.js'), 'utf8'), sandbox);

const PTShareHand = sandbox.PTShareHand;
assert(!!PTShareHand, 'PTShareHand expuesto');
assert(PTShareHand.ttlDays === 14, 'TTL 14 días');

const expiresAt = '2026-07-30T12:00:00.000Z';
const html = PTShareHand.wrapDocument({
  title: 'AsKd · CO',
  css: 'body{color:red}',
  bodyHtml: '<div class="review-head"><h2>AsKd · CO</h2></div><div class="timeline">paso a paso</div><div class="card-box"><h3>Evaluación GTO de la mano</h3></div>',
  expiresAt: expiresAt
});

assert(/<!DOCTYPE html>/i.test(html), 'documento HTML completo');
assert(html.indexOf('PokerForgeAI') >= 0, 'marca PokerForgeAI');
assert(html.indexOf('>Entrar<') >= 0, 'botón Entrar');
assert(html.indexOf('https://www.pokerforgeai.com/') >= 0, 'enlace a la web');
assert(html.indexOf('Disponible hasta') >= 0, 'pie con disponibilidad');
assert(html.indexOf(PTShareHand.formatExpiryDate(expiresAt)) >= 0, 'fecha de caducidad en pie');
assert(html.indexOf('Evaluación GTO de la mano') >= 0, 'incluye análisis GTO');
assert(html.indexOf('paso a paso') >= 0, 'incluye paso a paso');
assert(html.indexOf('Volver a jugar') < 0, 'sin botón de replay');
assert(html.indexOf('Matriz GTO') < 0, 'sin botones de matriz');
assert(html.indexOf('ai-report') < 0, 'sin IA Coach');
assert(html.indexOf('<style>') >= 0 && html.indexOf('body{color:red}') >= 0, 'CSS embebido');

const mig = fs.readFileSync(path.join(__dirname, '../supabase/migrations/027_shared_hands.sql'), 'utf8');
assert(mig.indexOf('pt_shared_hands') >= 0, 'migración crea pt_shared_hands');
assert(mig.indexOf('pt_purge_expired_shared_hands') >= 0, 'función de purga');
assert(mig.indexOf('pt-purge-shared-hands') >= 0, 'cron de purga');

const edge = fs.readFileSync(path.join(__dirname, '../supabase/functions/share-hand/index.ts'), 'utf8');
assert(edge.indexOf("TTL_DAYS = 14") >= 0, 'edge TTL 14');
assert(edge.indexOf("req.method === 'GET'") >= 0, 'edge GET público');
assert(edge.indexOf("req.method === 'POST'") >= 0, 'edge POST autenticado');

const sharePage = fs.readFileSync(path.join(__dirname, '../share.html'), 'utf8');
assert(sharePage.indexOf('share.html') >= 0 || sharePage.indexOf('id=') >= 0, 'página pública con id');
assert(sharePage.indexOf('ya no está disponible') >= 0, 'mensaje de caducidad');
assert(sharePage.indexOf('iguales o mejores') >= 0, 'invitación a entrenar');

if (failed) {
  console.error('\n*** TEST SHARE-HAND FALLÓ ***');
  process.exit(1);
}
console.log('\n*** TEST SHARE-HAND OK ***');
