/* RG-G07 — Analytics/Sentry configs; E2E no rompe con stub. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'js/analytics-config.example.js')), 'analytics example');
assert.ok(fs.existsSync(path.join(root, 'js/sentry-config.example.js')), 'sentry example');

const analEx = fs.readFileSync(path.join(root, 'js/analytics-config.example.js'), 'utf8');
assert.ok(/PT_ANALYTICS/.test(analEx), 'PT_ANALYTICS');

const sentEx = fs.readFileSync(path.join(root, 'js/sentry-config.example.js'), 'utf8');
assert.ok(/PT_SENTRY/.test(sentEx) && /dsn|enabled/.test(sentEx), 'PT_SENTRY shape');

const anal = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
assert.ok(/PT_ANALYTICS|plausible|track/.test(anal), 'analytics.js tolera config');

const sentry = fs.readFileSync(path.join(root, 'js/sentry.js'), 'utf8');
assert.ok(/PT_SENTRY|enabled|dsn/.test(sentry), 'sentry.js');

// En E2E, ausencia de DSN no debe romper: patrón de early-return
assert.ok(/if\s*\(!|enabled|return/.test(sentry), 'sentry early exit si disabled');

console.log('*** analytics-sentry OK ***');
