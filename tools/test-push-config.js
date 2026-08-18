/* Contrato: config Web Push sin clave privada en el repo. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const examplePath = path.join(root, 'js/push-config.example.js');
const configPath = path.join(root, 'js/push-config.js');

assert.ok(fs.existsSync(examplePath), 'push-config.example.js');
assert.ok(fs.existsSync(configPath), 'push-config.js');

const example = fs.readFileSync(examplePath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');

assert.ok(/PT_PUSH/.test(example), 'PT_PUSH en example');
assert.ok(/vapidPublicKey/.test(example), 'vapidPublicKey en example');
assert.ok(/enabled/.test(example), 'enabled en example');
assert.ok(!/BEGIN EC PRIVATE|-----BEGIN/.test(example), 'example sin PEM privado');
assert.ok(!/BEGIN EC PRIVATE|-----BEGIN/.test(config), 'config sin PEM privado');
assert.ok(!/\bd:\s*['"][A-Za-z0-9_-]{20,}/.test(example + config), 'sin JWK d privado');

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(/push-config\.js/.test(index), 'index carga push-config.js');

const chunks = fs.readFileSync(path.join(root, 'js/bundle-chunks.js'), 'utf8');
assert.ok(/js\/push\.js/.test(chunks), 'push.js en chunk core');

console.log('*** push-config OK ***');
