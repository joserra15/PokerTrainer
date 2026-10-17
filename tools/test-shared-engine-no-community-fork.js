#!/usr/bin/env node
/**
 * Guardrail: el motor GTO / villanos / evaluación de sesiones y torneos
 * no debe ramificar por comunidad. PokerForgeAI y MTTlab comparten criterios;
 * solo shell, Koins y ranking son independientes.
 *
 * Allowlist: pasar communityId al body de ForgeCoach (cupo IA), sin alterar
 * la decisión de estrategia.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

const FORBIDDEN = /\bmttlab\b|PTCommunity|communityDataSuffix|community_id|aiCommunityId|p_community_id/i;

/** Archivos del motor compartido (criterios de juego / análisis). */
const SCAN_PATHS = [
  'js/engine',
  'js/import.js',
  'js/import',
  'js/tournament/gto-eval.js',
  'js/tournament/villain-decide.js',
  'js/tournament/session-bridge.js',
  'js/hand-end-view.js'
];

/**
 * Líneas permitidas solo en assist IA (billing de cupo, no estrategia).
 * Cualquier otra coincidencia en estos ficheros falla.
 */
const ALLOWLIST = {
  'js/tournament/villain-ai-assist.js': [
    /PTCommunity\.aiCommunityId/,
    /body\.communityId\s*=\s*cid/
  ]
};

function walk(rel) {
  const abs = path.join(ROOT, rel);
  const st = fs.statSync(abs);
  if (st.isFile()) return [rel];
  const out = [];
  fs.readdirSync(abs).forEach((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return;
    const child = path.join(rel, name);
    const cst = fs.statSync(path.join(ROOT, child));
    if (cst.isDirectory()) out.push.apply(out, walk(child));
    else if (/\.js$/.test(name)) out.push(child);
  });
  return out;
}

function isAllowlisted(rel, line) {
  const rules = ALLOWLIST[rel];
  if (!rules) return false;
  return rules.some((re) => re.test(line));
}

let files = [];
SCAN_PATHS.forEach((p) => {
  const abs = path.join(ROOT, p);
  assert.ok(fs.existsSync(abs), 'existe ' + p);
  files = files.concat(walk(p));
});

/* Incluir assist con allowlist explícita */
files.push('js/tournament/villain-ai-assist.js');

const offenders = [];
files.forEach((rel) => {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (!FORBIDDEN.test(line)) return;
    if (isAllowlisted(rel, line)) return;
    /* Comentarios de documentación que mencionan el contrato están OK si no ejecutan */
    const trimmed = line.trim();
    if (trimmed.indexOf('/*') === 0 || trimmed.indexOf('*') === 0 || trimmed.indexOf('//') === 0) {
      /* Solo permitir comentarios que NO implementan rama (sin if/return) */
      if (!/\bif\s*\(|return\s+|=\s*['"]mttlab/.test(line)) return;
    }
    offenders.push(rel + ':' + (idx + 1) + ': ' + trimmed.slice(0, 120));
  });
});

assert.strictEqual(
  offenders.length,
  0,
  'Bifurcación por comunidad en motor compartido:\n' + offenders.join('\n')
);

/* Contrato menús MTTlab: Sesiones sí, Análisis no */
const cfg = fs.readFileSync(path.join(ROOT, 'js/community-config-mttlab.js'), 'utf8');
assert.ok(/show:\s*\[[^\]]*['"]sessions['"]/.test(cfg), 'config mttlab incluye sessions en show');
assert.ok(/hide:\s*\[[^\]]*['"]analysis['"]/.test(cfg), 'config mttlab oculta analysis');
assert.ok(/Motor GTO|mismo código|No bifurcar/.test(cfg), 'config documenta contrato motor compartido');

console.log('*** shared-engine-no-community-fork OK (' + files.length + ' files) ***');
