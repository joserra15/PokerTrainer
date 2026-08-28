/* Regresión: build-guard no debe pedir /deploy-info.json (404 en Pages). */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const guard = fs.readFileSync(path.join(root, 'js', 'build-guard.js'), 'utf8');
const version = fs.readFileSync(path.join(root, 'js', 'version.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(!/deploy-info\.json/.test(guard), 'build-guard no debe fetchear deploy-info.json');
assert(!/\/deploy-info/.test(guard), 'build-guard no debe pedir /deploy-info');
assert(!/checkDeployInfo/.test(guard), 'checkDeployInfo eliminado');
assert(/checkFreshVersionJs/.test(guard), 'build-guard sigue contrastando version.js');
assert.ok(/PTBusy/.test(guard), 'no recarga PWA durante import');
assert(/PT_BUILD\s*=\s*'2.7.36'/.test(version), 'PT_BUILD 2.7.36 para invalidar caché');
assert(/pt-shell-v20/.test(sw), 'SW cache bump v20');
assert(!/deploy-info\.json/.test(sw), 'SW no trata deploy-info como asset de app');

console.log('*** build-guard-no-deploy-info OK ***');
