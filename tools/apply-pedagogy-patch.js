#!/usr/bin/env node
/**
 * Aplica reescrituras pedagógicas a school-data-*.js
 * Uso: node tools/apply-pedagogy-patch.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mtt = require('./pedagogy-content/mtt.js');
const ranges = require('./pedagogy-content/ranges.js');
const pro = require('./pedagogy-content/pro.js');
const spin = require('./pedagogy-content/spin.js');

function theoryBlob(theory) {
  return (theory || []).map(function (t) {
    if (t && typeof t === 'object') return (t.title || '') + ' ' + (t.body || t.text || '');
    return String(t || '');
  }).join(' ');
}

function patchRawArray(src, lessonsMap) {
  // Evalúa el RAW entre "var RAW = [" y "];\n  var lessons"
  const start = src.indexOf('var RAW = [');
  if (start < 0) throw new Error('RAW no encontrado');
  const arrStart = src.indexOf('[', start);
  const endMarker = '\n];\n  var lessons';
  const end = src.indexOf(endMarker, arrStart);
  if (end < 0) throw new Error('fin RAW no encontrado');
  const rawJson = src.slice(arrStart, end + 2); // include ];
  let lessons;
  try {
    lessons = Function('"use strict"; return (' + rawJson.replace(/;\s*$/, '') + ')')();
  } catch (e) {
    throw new Error('parse RAW: ' + e.message);
  }
  let patched = 0;
  lessons.forEach(function (lesson) {
    const id = lesson.id;
    const neu = lessonsMap[id];
    if (!neu) return;
    if (neu.concept) lesson.concept = neu.concept;
    if (neu.theory) lesson.theory = neu.theory;
    if (neu.examples) lesson.examples = neu.examples;
    if (neu.aiQuestions) lesson.aiQuestions = neu.aiQuestions;
    patched++;
  });
  const newRaw = JSON.stringify(lessons, null, 2)
    .split('\n')
    .map(function (line, i) {
      return i === 0 ? line : '  ' + line;
    })
    .join('\n');
  const out = src.slice(0, arrStart) + newRaw + src.slice(end + 2);
  return { out: out, patched: patched, lessons: lessons };
}

function patchTeachBacks(src, teachMap) {
  if (!teachMap) return { out: src, count: 0 };
  let count = 0;
  let out = src;
  Object.keys(teachMap).forEach(function (sid) {
    const tb = teachMap[sid];
    // Match teachBack: '...' after the spot id appears nearby — replace first teachBack after id string
    const idRe = new RegExp("(rfi|vs|iso)\\('" + sid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'[\\s\\S]*?teachBack:\\s*'([^']*)'");
    const m = out.match(idRe);
    if (!m) {
      // try double quotes in stringify packs — packs use single quotes
      console.warn('teachBack spot no hallado:', sid);
      return;
    }
    const escaped = tb.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    out = out.replace(idRe, function (full) {
      count++;
      return full.replace(/teachBack:\s*'[^']*'/, "teachBack: '" + escaped + "'");
    });
  });
  return { out: out, count: count };
}

function applyFile(rel, lessonsMap, teachMap) {
  const file = path.join(root, rel);
  let src = fs.readFileSync(file, 'utf8');
  const r1 = patchRawArray(src, lessonsMap);
  src = r1.out;
  const r2 = patchTeachBacks(src, teachMap);
  src = r2.out;
  fs.writeFileSync(file, src);
  console.log(rel + ': lessons ' + r1.patched + ', teachBacks ' + r2.count);
  // sanity: theory blob lengths for patched
  r1.lessons.forEach(function (l) {
    if (!lessonsMap[l.id]) return;
    const blob = theoryBlob(l.theory);
    if ((l.concept || '').length < 60) console.warn('  WARN concept short', l.id);
    if (blob.length < 200) console.warn('  WARN theory thin', l.id, blob.length);
  });
}

applyFile('js/school-data-mtt.js', mtt.lessons, mtt.teachBacks);
applyFile('js/school-data-ranges.js', ranges.lessons, null);
applyFile('js/school-data-pro.js', pro.lessons, null);
applyFile('js/school-data-spin.js', spin.lessons, spin.teachBacks);

console.log('OK apply-pedagogy-patch');
