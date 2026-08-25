/**
 * Carga el ENGINE (+ play-config/engine opcionales) en un sandbox vm
 * usando el orden canónico de js/bundle-chunks.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const chunks = require('../js/bundle-chunks.js');

function createSandbox(extras) {
  const sandbox = Object.assign({
    window: {},
    console,
    Math,
    Date,
    Set,
    Map,
    JSON,
    parseFloat,
    parseInt,
    isNaN,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp
  }, extras || {});
  sandbox.global = sandbox;
  sandbox.window = sandbox.window || {};
  vm.createContext(sandbox);
  return sandbox;
}

function runFiles(sandbox, relPaths) {
  relPaths.forEach((f) => {
    const abs = path.isAbsolute(f) ? f : path.join(ROOT, f);
    const code = fs.readFileSync(abs, 'utf8');
    vm.runInContext(code, sandbox, { filename: path.basename(f) });
  });
}

/** Carga ENGINE completo del bundle. */
function loadEngine(sandbox) {
  runFiles(sandbox, chunks.ENGINE);
  return sandbox;
}

/** ENGINE + play-config + engine.js (trainer). */
function loadTrainer(sandbox) {
  loadEngine(sandbox);
  runFiles(sandbox, ['js/ranges.js', 'js/play-config.js', 'js/action-line.js', 'js/engine.js']);
  return sandbox;
}

module.exports = {
  ROOT,
  chunks,
  createSandbox,
  runFiles,
  loadEngine,
  loadTrainer
};
