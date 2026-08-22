/*
 * Regresión del deploy que dejó la landing sin CSS.
 *
 * El service worker sirve /js/, /css/ y /dist/ cache-first por ?v=. Si un
 * deploy cambia esos ficheros sin cambiar el token, el navegador se queda con
 * los assets viejos; y si un asset se pierde durante el deploy, el SW devolvía
 * una respuesta vacía que el documento aplica como hoja de estilos válida y
 * deja la app en crudo. Este test fija los tres invariantes que lo evitan:
 *
 *   1. dist/ está reconstruido a partir de las fuentes actuales.
 *   2. PT_ASSET_REV es la huella real del contenido de los assets.
 *   3. SW y documento tienen red de seguridad ante un asset que no carga.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const AssetRev = require('./asset-rev');
const { CHUNKS } = require('./bundle-manifest');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/* 1) dist/ reconstruido: si falla, `npm run build` y commitear dist/. */
console.log('1) bundles de dist/ al día');
Object.keys(CHUNKS).forEach(function (name) {
  const rel = 'dist/pt-' + name + '.js';
  const banner = '/* PokerForgeAI bundle: pt-' + name + '.js — do not edit */\n';
  const expected = banner + CHUNKS[name].map(function (f) { return read(f); }).join('\n');
  assert.strictEqual(
    read(rel), expected,
    rel + ' desfasado respecto a sus fuentes — ejecuta: npm run build'
  );
});

const manifest = JSON.parse(read('dist/bundles.json'));
const build = AssetRev.readBuild();
assert.strictEqual(manifest.build, build, 'dist/bundles.json.build == PT_BUILD');

/* 2) El token de ?v= deriva del contenido, no de un bump manual. */
console.log('2) PT_ASSET_REV es la huella del contenido');
const expectedRev = AssetRev.computeAssetRev(build);
assert.strictEqual(
  AssetRev.readAssetRev(), expectedRev,
  'PT_ASSET_REV desfasado — ejecuta: npm run build'
);
assert.strictEqual(manifest.rev, expectedRev, 'dist/bundles.json.rev == PT_ASSET_REV');
assert.ok(expectedRev.indexOf(build + '-') === 0, 'la huella va prefijada por PT_BUILD');

// Cambiar cualquier asset tiene que mover la huella (si no, la caché sobrevive).
const probe = path.join(root, 'css/styles.css');
const original = fs.readFileSync(probe);
try {
  fs.writeFileSync(probe, Buffer.concat([original, Buffer.from('\n/* probe */\n')]));
  assert.notStrictEqual(
    AssetRev.computeAssetRev(build), expectedRev,
    'tocar css/styles.css debe cambiar la huella'
  );
} finally {
  fs.writeFileSync(probe, original);
}
assert.strictEqual(AssetRev.computeAssetRev(build), expectedRev, 'huella estable y reproducible');

// version.js queda fuera de la huella o no habría punto fijo al escribirla.
const hashed = AssetRev.assetFiles();
assert.ok(hashed.indexOf(path.join('js', 'version.js')) < 0, 'js/version.js fuera de la huella');
assert.ok(hashed.indexOf(path.join('dist', 'bundles.json')) < 0, 'bundles.json fuera de la huella');
assert.ok(hashed.indexOf(path.join('css', 'styles.css')) >= 0, 'css/styles.css dentro de la huella');
assert.ok(hashed.indexOf(path.join('dist', 'pt-core.js')) >= 0, 'dist/pt-core.js dentro de la huella');

/* 3) Los consumidores usan el token de contenido, no PT_BUILD. */
console.log('3) los cargadores usan PT_REV()');
const index = read('index.html');
['index.html', 'share.html', 'promo.html'].forEach(function (page) {
  const html = read(page);
  assert.ok(!/\?v=' \+ encodeURIComponent\(window\.PT_BUILD/.test(html),
    page + ' no debe versionar assets con PT_BUILD');
  assert.ok(/PT_REV/.test(html), page + ' versiona assets con PT_REV()');
});

const loader = read('js/pt-loader.js');
assert.ok(/PT_REV/.test(loader), 'pt-loader usa PT_REV()');

const guard = read('js/build-guard.js');
assert.ok(/PT_REV/.test(guard), 'build-guard compara la revisión de assets');
assert.ok(/PT_ASSET_REV/.test(guard), 'build-guard lee PT_ASSET_REV del version.js fresco');

const pwa = read('js/pwa.js');
assert.ok(/PT_REV/.test(pwa), 'pwa registra sw.js con la revisión de assets');

/* 4) El SW nunca entrega una respuesta vacía si hay copia servible. */
console.log('4) el service worker no sirve respuestas vacías');
const sw = read('sw.js');
assert.ok(/function anyCachedCopy/.test(sw), 'SW busca cualquier copia en caché');
assert.ok(/ignoreSearch:\s*true/.test(sw), 'el fallback ignora la query de versión');
assert.ok(/if \(res && res\.ok\) return res;/.test(sw),
  'un 404/500 no se entrega al documento sin intentar la caché');
assert.ok(/isBypassRequest/.test(sw), 'SW soporta ptsw=bypass para reintentos');
assert.ok(/ptsw'\)\s*===\s*'bypass'/.test(sw), 'ptsw=bypass va directo a red');

/* 5) El documento se recupera solo si una hoja no llega a aplicarse. */
console.log('5) watchdog de hojas de estilo en index.html');
assert.ok(/document\.styleSheets/.test(index), 'index comprueba que el CSS se aplicó');
assert.ok(/ptsw=bypass/.test(index), 'el reintento de CSS salta el service worker');
assert.ok(/cssRules/.test(index), 'una hoja vacía cuenta como no aplicada');
assert.ok(/pt-css-legendary/.test(index), 'ambas hojas vigiladas');
assert.ok(/getRegistrations/.test(index), 'último recurso: desregistrar el SW');

// El <link> no puede traer href estático: pedía la hoja dos veces (una sin ?v=)
// y ese primer intento se comía el fallo que el watchdog debe ver.
assert.ok(/<link rel="stylesheet" id="pt-css" \/>/.test(index),
  '#pt-css sin href estático');
assert.ok(/<link rel="stylesheet" id="pt-css-legendary" \/>/.test(index),
  '#pt-css-legendary sin href estático');
assert.ok(/<noscript>[\s\S]*css\/styles\.css[\s\S]*<\/noscript>/.test(index),
  'fallback de estilos sin JS en <noscript>');

console.log('\n*** test-asset-cache-invalidation OK (' + hashed.length + ' assets, rev ' + expectedRev + ') ***');
