#!/usr/bin/env node
'use strict';
/**
 * Añade tamaños de apuesta a lineStory y refuerza eliminated con pistas de sizing.
 * Uso: node tools/migrate-villain-quiz-sizing.js
 */
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var targets = [
  path.join(root, 'js/school-data-ranges-line.js'),
  path.join(root, 'js/school-data-practice.js')
];

function riverBetSize(text) {
  if (/overbet|grande/i.test(text)) return '125% pot';
  if (/check-check/i.test(text)) return '33% pot';
  return '66% pot';
}

function turnBetSize(text) {
  if (/check-check/i.test(text)) return '55% pot';
  return '66% pot';
}

function addSizingToLineText(text, street) {
  if (!text) return text;
  var t = text;

  if (!/\bopen \d/.test(t)) {
    t = t.replace(/\bBTN open →/g, 'BTN open 2,5 bb →');
    t = t.replace(/\bCO open →/g, 'CO open 2,5 bb →');
    t = t.replace(/\bHJ open →/g, 'HJ open 2,2 bb →');
    t = t.replace(/\bSB open →/g, 'SB open 3 bb →');
  }

  t = t.replace(/\bbet pequeño\b/g, 'bet 33% pot');
  t = t.replace(/\bbet medio\b/g, 'bet 66% pot');
  t = t.replace(/\bbet grande\b/g, 'overbet 125% pot');
  t = t.replace(/\bc-bet pequeño\b/g, 'c-bet 33% pot');
  t = t.replace(/\bc-bet medio\b/g, 'c-bet 55% pot');
  t = t.replace(/\bc-bet grande\b/g, 'c-bet 75% pot');
  t = t.replace(/\bdonk pequeño\b/g, 'donk 33% pot');
  t = t.replace(/\bdonk medio\b/g, 'donk 50% pot');
  t = t.replace(/\bdonk turn →/g, 'donk 50% pot →');
  t = t.replace(/\bdonk flop →/g, 'donk 50% pot →');
  t = t.replace(/\bdonk river →/g, 'donk 66% pot →');
  t = t.replace(/donk bet →/g, 'donk 50% pot →');
  t = t.replace(/donk →/g, 'donk 50% pot →');
  t = t.replace(/\bbet grande\b/g, 'overbet 125% pot');
  t = t.replace(/\boverbet\b(?!\s+\d)/g, 'overbet 125% pot');

  t = t.replace(/check-raise grande →/g, 'check-raise 3× →');
  t = t.replace(/check-raise pequeño →/g, 'check-raise 2,5× →');
  t = t.replace(/check-raise →/g, 'check-raise 3× →');
  t = t.replace(/raise grande →/g, 'raise 3× →');
  t = t.replace(/raise pequeño →/g, 'raise 2,5× →');
  t = t.replace(/→ ([A-Z0-9]{2,3}) raise →/g, '→ $1 raise 3× →');
  t = t.replace(/— ([A-Z0-9]{2,3}) raise →/g, '— $1 raise 3× →');

  t = t.replace(/c-bet →/g, 'c-bet 33% pot →');

  var betSz = /river/i.test(street || '') ? riverBetSize(t) : turnBetSize(t);

  t = t.replace(/→ (BTN|CO|BB|HJ|SB) bet →/g, '→ $1 bet ' + betSz + ' →');
  t = t.replace(/→ (BTN|CO|BB|HJ|SB) bet$/g, '→ $1 bet ' + betSz);
  t = t.replace(/→ (BTN|CO|BB|HJ|SB) bet (?=\()/g, '→ $1 bet ' + betSz + ' ');
  t = t.replace(/— (BTN|CO|BB|HJ|SB) bet (?=\()/g, '— $1 bet ' + betSz + ' ');
  t = t.replace(/overbet 125% pot (?=\()/g, 'overbet 125% pot ');
  t = t.replace(/— (BTN|CO|BB|HJ|SB) bet$/g, '— $1 bet ' + betSz);
  t = t.replace(/— (BTN|CO|BB|HJ|SB) bet →/g, '— $1 bet ' + betSz + ' →');

  return t;
}

function augmentEliminated(eliminated, lineStory) {
  if (!eliminated || eliminated.length <= 10) return eliminated;
  if (/% pot|overbet|sizing|2,5 bb|33%|66%|125%|3×|pot-control turn|thin/i.test(eliminated)) {
    return eliminated;
  }
  var river = (lineStory || []).filter(function (r) { return /river/i.test(r.street || ''); })[0];
  var riverText = river && river.text ? river.text : '';
  var suffix = '';

  if (/overbet|125%/.test(riverText)) {
    suffix = ' El overbet river (125% pot) pide polarización: nuts o farol, no value medio.';
  } else if (/33% pot/.test(riverText)) {
    suffix = ' El bet fino river (33% pot) es thin value o block-bet, no overpair pot-controlado.';
  } else if (/75% pot/.test(riverText) || /donk 75%/.test(riverText)) {
    suffix = ' El sizing grande (75% pot) no encaja con pot-control de underpair/overpair.';
  } else if (/check-check/.test((lineStory || []).map(function (r) { return r.text; }).join(' '))) {
    suffix = ' Tras check turn, el sizing river debe ser coherente con thin value o farol, no triple barrel de overpair.';
  } else if (/3×/.test((lineStory || []).map(function (r) { return r.text; }).join(' '))) {
    suffix = ' El raise 3× exige equity fuerte; este combo no justifica ese sizing.';
  } else if (/66% pot/.test(riverText)) {
    suffix = ' El bet river 66% pot pide value claro; este rango suele checkear o usar sizing menor.';
  } else {
    suffix = ' La secuencia de sizings no encaja con value de este combo.';
  }

  var out = eliminated.replace(/\.\s*$/, '') + '.' + suffix;
  return out.length > 10 ? out : eliminated;
}

function parseLineStory(block) {
  var rows = [];
  var re = /\{\s*street:\s*(['"])([^'"]+)\1\s*,\s*text:\s*\1((?:\\.|(?!\1)[^\\])*)\1\s*\}(?:\s*,)?/g;
  var m;
  while ((m = re.exec(block)) !== null) {
    rows.push({
      street: m[2],
      text: m[3].replace(/\\'/g, "'").replace(/\\"/g, '"'),
      index: m.index,
      length: m[0].length,
      quote: m[1]
    });
  }
  return rows;
}

function encodeText(text, quote) {
  if (quote === "'") return text.replace(/'/g, "\\'");
  return text.replace(/"/g, '\\"');
}

function rebuildRow(row, trailingComma) {
  var enc = encodeText(row.text, row.quote);
  var q = row.quote;
  return '{ street: ' + q + row.street + q + ', text: ' + q + enc + q + ' }' + (trailingComma ? ',' : '');
}

function migrateLineStoryBlock(block) {
  var rows = parseLineStory(block);
  if (!rows.length) return block;
  var out = block;
  var offset = 0;
  rows.forEach(function (row) {
    var sized = addSizingToLineText(row.text, row.street);
    if (sized === row.text) return;
    row.text = sized;
    var original = block.slice(row.index, row.index + row.length);
    var trailingComma = /,\s*$/.test(original);
    var replacement = rebuildRow(row, trailingComma);
    var start = row.index + offset;
    out = out.slice(0, start) + replacement + out.slice(start + row.length);
    offset += replacement.length - row.length;
  });
  return out;
}

function migrateEliminatedInSpot(spotBlock) {
  var lineMatch = spotBlock.match(/lineStory:\s*(\[[\s\S]*?\])/);
  if (!lineMatch) return spotBlock;
  var lineStory = parseLineStory(lineMatch[1]).map(function (r) {
    return { street: r.street, text: r.text };
  });
  var re = /eliminated:\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
  return spotBlock.replace(re, function (full, q, elim) {
    var decoded = elim.replace(/\\'/g, "'").replace(/\\"/g, '"');
    var augmented = augmentEliminated(decoded, lineStory);
    if (augmented === decoded) return full;
    var encoded = encodeText(augmented, q);
    return 'eliminated: ' + q + encoded + q;
  });
}

function migrateFile(filePath) {
  var src = fs.readFileSync(filePath, 'utf8');
  var original = src;

  src = src.replace(/lineStory:\s*\[[\s\S]*?\]/g, function (block) {
    return migrateLineStoryBlock(block);
  });

  src = src.replace(/LQ\([\s\S]*?\}\)\s*,/g, function (spot) {
    if (!spot.includes('eliminated:')) return spot;
    return migrateEliminatedInSpot(spot);
  });

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log('Updated', path.relative(root, filePath));
    return true;
  }
  console.log('No changes', path.relative(root, filePath));
  return false;
}

targets.forEach(migrateFile);

// Validación rápida de sintaxis
targets.forEach(function (filePath) {
  var src = fs.readFileSync(filePath, 'utf8');
  if (/street:\s*"[^"]*\\"/.test(src) || /street:\s*'[^']*\\'/.test(src)) {
    console.error('WARN: posible corrupción de comillas en', filePath);
    process.exit(1);
  }
});
