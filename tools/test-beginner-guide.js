/* RG-G04 — beginner-guide: secciones y drills no bloquean trainer. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/beginner-guide.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(/PTBeginnerGuide|render/.test(src), 'PTBeginnerGuide');
assert.ok(/learn-basics|learn-hands|learn-positions|data-learn-drill/.test(src + html), 'secciones/drills');
assert.ok(/tab-learn|data-tab="learn"/.test(html), 'tab learn');
assert.ok(!/throw new Error\(['"]block/.test(src), 'no bloquea con throw');

console.log('*** beginner-guide OK ***');
