#!/usr/bin/env node
'use strict';

/**
 * Regresión: el saludo ForgeCoach se regenera como máximo cada 8 horas
 * (localStorage con TTL), no en cada recarga de la home.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const aiSrc = fs.readFileSync(path.join(__dirname, '..', 'js/ai-report.js'), 'utf8');

assert.ok(/GREETING_CACHE_KEY\s*=\s*'pt_home_greeting_v2'/.test(aiSrc), 'clave localStorage v2 del saludo');
assert.ok(/GREETING_TTL_MS\s*=\s*8\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(aiSrc), 'TTL 8 horas');
assert.ok(/function readGreetingCache\(/.test(aiSrc) && /function writeGreetingCache\(/.test(aiSrc),
  'helpers de caché del saludo');
assert.ok(/localStorage\.getItem\(greetingCacheStorageKey\(\)\)/.test(aiSrc), 'lee de localStorage');
assert.ok(/localStorage\.setItem\(greetingCacheStorageKey\(\)/.test(aiSrc), 'escribe en localStorage');
assert.ok(!/sessionStorage\.getItem\(cacheKey\)/.test(aiSrc), 'ya no usa sessionStorage para el saludo');
assert.ok(/homeGreetingInFlight/.test(aiSrc), 'dedupe de peticiones concurrentes');

const GREETING_TTL_MS = 8 * 60 * 60 * 1000;
assert.strictEqual(GREETING_TTL_MS, 28800000, '8h = 28800000 ms');

/** Réplica mínima de la lógica de caducidad (misma condición que readGreetingCache). */
function isGreetingCacheFresh(at, now) {
  const t = Number(at);
  if (!Number.isFinite(t) || t <= 0) return false;
  return (now - t) < GREETING_TTL_MS;
}

const now = Date.parse('2026-08-23T12:00:00.000Z');
assert.ok(isGreetingCacheFresh(now - 1000, now), 'caché reciente es válida');
assert.ok(isGreetingCacheFresh(now - (GREETING_TTL_MS - 1), now), 'casi 8h sigue válida');
assert.ok(!isGreetingCacheFresh(now - GREETING_TTL_MS, now), 'exactamente 8h caduca');
assert.ok(!isGreetingCacheFresh(now - GREETING_TTL_MS - 1, now), 'más de 8h caduca');
assert.ok(!isGreetingCacheFresh(0, now), 'timestamp inválido no sirve');

console.log('ok — home greeting cache 8h');
