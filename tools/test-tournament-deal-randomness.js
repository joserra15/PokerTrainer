#!/usr/bin/env node
/**
 * Reparto torneos: ruta real Cards.shuffleSecure, unicidad, uniformidad e independencia de seed.
 * Run: node tools/test-tournament-deal-randomness.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Set,
    Map,
    setTimeout,
    clearTimeout,
    crypto
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
load(g, 'js/cards.js');

assert.ok(g.Cards && typeof g.Cards.shuffleSecure === 'function', 'Cards.shuffleSecure exportado');
assert.ok(typeof g.Cards.secureRandomInt === 'function', 'Cards.secureRandomInt exportado');

load(g, 'js/tournament/config.js');
load(g, 'js/tournament/blinds.js');
load(g, 'js/tournament/names.js');
load(g, 'js/tournament/seating.js');
load(g, 'js/tournament/state.js');
load(g, 'js/tournament/live-hand.js');
load(g, 'js/tournament/other-tables.js');
load(g, 'js/tournament/runner.js');

const Live = g.PTTournamentLiveHand;
const Runner = g.PTTournamentRunner;
const Seat = g.PTTournamentSeating;

assert.ok(Live && Runner, 'Live + Runner cargados');

function assertHandDeck(hand, label) {
  assert.ok(hand, label + ': hand');
  hand.seats.forEach(function (s) {
    assert.strictEqual((s.cards || []).length, 2, label + ': two holes ' + s.name);
  });
  assert.strictEqual(hand.boardDeck.length, 5, label + ': board 5');
  const all = Live.allDealtCards(hand);
  assert.strictEqual(new Set(all).size, all.length, label + ': no dupes');
  assert.ok(!Live.hasDuplicateCards(hand), label + ': hasDuplicateCards false');
  all.forEach(function (c) {
    assert.ok(/^[2-9TJQKA][cdhs]$/.test(c), label + ': valid ' + c);
  });
}

function makeOrderedSeats(n) {
  var players = [];
  var i;
  for (i = 0; i < n; i++) {
    players.push({
      id: 'p' + i,
      name: 'P' + i,
      stack: 10000,
      alive: true,
      tableId: 'T1',
      seat: i,
      roleId: 'tag'
    });
  }
  return Seat.seatOrderWithButton(players, players[0].id);
}

// --- shuffleSecure: 52 únicas ---
{
  for (var t = 0; t < 200; t++) {
    var deck = g.Cards.shuffleSecure(g.Cards.fullDeck());
    assert.strictEqual(deck.length, 52, 'deck len');
    assert.strictEqual(new Set(deck).size, 52, 'deck unique');
  }
  console.log('OK shuffleSecure-52-unique');
}

// --- HU a 9-max vía createHand ---
{
  var counts = [2, 3, 6, 9];
  counts.forEach(function (n) {
    for (var h = 0; h < 30; h++) {
      var hand = Live.simulateTable(makeOrderedSeats(n), { sb: 50, bb: 100, ante: 0 }, null);
      assertHandDeck(hand, 'n' + n + '-h' + h);
    }
  });
  console.log('OK player-counts-2-to-9');
}

// --- ruta runner + mesa satélite ---
{
  var state = Runner.create('mttPro', { seed: 7777 });
  assert.ok(state.tables && state.tables.length > 1, 'multi-table mtt');
  var heroHand = Runner.beginHand(state);
  assertHandDeck(heroHand, 'hero-table');

  var satId = state.tables.find(function (tb) {
    return tb.id !== (state.players.find(function (p) { return p.isHero; }) || {}).tableId;
  });
  if (satId) {
    var onSat = Seat.playersOnTable(state, satId.id);
    if (onSat.length >= 2) {
      var btn = Seat.assignButton(state, satId.id);
      var ord = Seat.seatOrderWithButton(onSat, btn);
      var satHand = Live.simulateTable(ord, { sb: 50, bb: 100, ante: 0 }, state);
      assertHandDeck(satHand, 'satellite-table');
    }
  }
  console.log('OK runner-and-satellite');
}

// --- uniformidad ligera (asiento 0, 5000 manos) ---
{
  var freq = {};
  g.Cards.fullDeck().forEach(function (c) { freq[c] = 0; });
  var ITERS = 5000;
  var i;
  for (i = 0; i < ITERS; i++) {
    var ordered = makeOrderedSeats(6);
    var hand = Live.simulateTable(ordered, { sb: 25, bb: 50, ante: 0 }, null);
    var heroSeat = hand.seats[0];
    (heroSeat.cards || []).forEach(function (c) {
      var code = typeof c === 'string' ? c : (c.code || String(c));
      freq[code] = (freq[code] || 0) + 1;
    });
  }
  var total = ITERS * 2;
  var expected = total / 52;
  var chi2 = 0;
  Object.keys(freq).forEach(function (c) {
    var obs = freq[c];
    chi2 += ((obs - expected) * (obs - expected)) / expected;
  });
  /* χ²(51 df) crítico ~76.2 al 1%; margen generoso para CI. */
  assert.ok(chi2 < 95, 'chi2 uniformidad seat0: ' + chi2.toFixed(2));
  console.log('OK uniformity-seat0 chi2=' + chi2.toFixed(2));
}

// --- independencia de state.seed (cartas no acopladas al seed de torneo) ---
{
  var holesA = [];
  var holesB = [];
  var r;
  for (r = 0; r < 5; r++) {
    var stA = Runner.create('sng6', { seed: 424242 });
    var stB = Runner.create('sng6', { seed: 424242 });
    var hA = Runner.beginHand(stA);
    var hB = Runner.beginHand(stB);
    var heroA = hA.seats.find(function (s) { return s.isHero; });
    var heroB = hB.seats.find(function (s) { return s.isHero; });
    holesA.push((heroA.cards || []).join(','));
    holesB.push((heroB.cards || []).join(','));
  }
  var allSame = holesA.every(function (h, idx) { return h === holesB[idx]; });
  assert.ok(!allSame, 'misma seed torneo no debe fijar holes idénticos en 5 pares de runs');
  console.log('OK seed-independence');
}

// --- Cards.rng del entrenador no se pisa al repartir torneo ---
{
  g.Cards.rng.setSeed(12345);
  var before = g.Cards.rng.getSeed();
  Live.simulateTable(makeOrderedSeats(6), { sb: 10, bb: 20, ante: 0 }, null);
  var after = g.Cards.rng.getSeed();
  assert.strictEqual(after, before, 'torneo no debe reseedear Cards.rng');
  console.log('OK no-trainer-rng-clobber');
}

console.log('OK test-tournament-deal-randomness');
