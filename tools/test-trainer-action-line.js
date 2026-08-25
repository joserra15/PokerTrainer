#!/usr/bin/env node
/**
 * Regresión — línea de acción previa del entrenador.
 *
 * Cuando se entrena flop/turn/river, el motor debe dejar en `hand.actionLine`
 * cómo se llegó al board que se está viendo, y `PTActionLine` debe convertirlo
 * en filas legibles con posiciones y tamaños de apuesta (héroe y villano),
 * al estilo de la "línea completa" de la Escuela de Póker.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const ROOT = path.join(__dirname, '..');
const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig, PTActionLine } = sandbox.window;

assert.ok(Engine, 'Engine loaded');
assert.ok(PTActionLine, 'PTActionLine loaded');

const STREETS = ['preflop', 'flop', 'turn', 'river'];

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'playable',
    villainLevel: 'intermediate',
    practiceStreet: 'random'
  }, extra || {}));
}

/** Manos del entrenador que arrancan ya en `street`. */
function handsAtStreet(street, count, seed0) {
  const out = [];
  for (let i = 0; i < 900 && out.length < count; i++) {
    const hand = Engine.newHand({ seed: (seed0 || 0) + i }, cfg({ practiceStreet: street }));
    Engine.fastForwardToStreet(hand, street);
    if (hand.result || !hand.current || hand.stage !== street) continue;
    out.push(hand);
  }
  return out;
}

console.log('1) API pública de PTActionLine');
{
  ['build', 'html', 'text', 'previousStreet'].forEach(function (fn) {
    assert.strictEqual(typeof PTActionLine[fn], 'function', 'PTActionLine.' + fn);
  });
  assert.strictEqual(PTActionLine.previousStreet('flop'), 'preflop');
  assert.strictEqual(PTActionLine.previousStreet('turn'), 'flop');
  assert.strictEqual(PTActionLine.previousStreet('river'), 'turn');
  assert.strictEqual(PTActionLine.previousStreet('preflop'), null, 'preflop no tiene calle previa');
  assert.strictEqual(PTActionLine.build({ actionLine: [] }).length, 0, 'mano sin historial → sin filas');
}

console.log('2) Cada spot flop/turn/river trae línea previa completa');
{
  ['flop', 'turn', 'river'].forEach(function (street) {
    const hands = handsAtStreet(street, 25, street.length * 1000 + 17);
    assert.ok(hands.length >= 20, 'suficientes manos en ' + street + ': ' + hands.length);
    const expected = STREETS.indexOf(street); // preflop + calles intermedias
    hands.forEach(function (hand) {
      const rows = PTActionLine.build(hand, { throughStreet: PTActionLine.previousStreet(street) });
      assert.strictEqual(rows.length, expected,
        street + ': se describen las ' + expected + ' calles previas, no ' + rows.length +
        ' (' + PTActionLine.text(rows) + ')');
      assert.strictEqual(rows[0].street, 'preflop', 'la línea empieza en preflop');
      rows.forEach(function (row, idx) {
        assert.strictEqual(row.street, STREETS[idx], 'calles en orden: ' + row.street);
        assert.ok(row.actions.length > 0, 'calle ' + row.street + ' con acciones');
        row.actions.forEach(function (act) {
          assert.ok(act.pos, 'acción con posición');
          assert.ok(act.text, 'acción con texto');
        });
      });
    });
  });
}

console.log('3) La línea es coherente con el board que se está viendo');
{
  ['turn', 'river'].forEach(function (street) {
    handsAtStreet(street, 20, 42000 + street.length).forEach(function (hand) {
      const rows = PTActionLine.build(hand, { throughStreet: PTActionLine.previousStreet(street) });
      const flop = rows.find(function (r) { return r.street === 'flop'; });
      assert.ok(flop, 'fila de flop');
      assert.deepStrictEqual(flop.cards, hand.board.slice(0, 3),
        'el flop de la línea es el del board: ' + flop.cards.join(' ') + ' vs ' + hand.board.slice(0, 3).join(' '));
      if (street === 'river') {
        const turn = rows.find(function (r) { return r.street === 'turn'; });
        assert.deepStrictEqual(turn.cards, hand.board.slice(3, 4), 'la carta de turn es la del board');
      }
    });
  });
}

console.log('4) Héroe y villano aparecen etiquetados en la línea');
{
  let heroSeen = 0;
  let villainSeen = 0;
  handsAtStreet('river', 25, 7700).forEach(function (hand) {
    const heroSeat = hand.displayHeroPos || hand.hero.pos;
    const rows = PTActionLine.build(hand, { throughStreet: 'turn' });
    const actions = rows.reduce(function (acc, r) { return acc.concat(r.actions); }, []);
    assert.ok(actions.some(function (a) { return a.pos === heroSeat; }),
      'el héroe (' + heroSeat + ') aparece en la línea: ' + PTActionLine.text(rows));
    assert.ok(actions.some(function (a) { return a.pos === hand.villain.pos; }),
      'el villano (' + hand.villain.pos + ') aparece en la línea: ' + PTActionLine.text(rows));
    actions.forEach(function (a) {
      if (a.pos === heroSeat) {
        assert.strictEqual(a.isHero, true, 'las acciones del héroe se marcan como suyas');
        heroSeen++;
      } else if (a.pos === hand.villain.pos) {
        villainSeen++;
      }
    });
  });
  assert.ok(heroSeen > 0 && villainSeen > 0, 'acciones de ambos lados ejercidas');
}

console.log('5) Tamaños de apuesta: bb en preflop, % de bote en la primera apuesta postflop');
{
  let preflopSized = 0;
  let postflopSized = 0;
  ['turn', 'river'].forEach(function (street) {
    handsAtStreet(street, 20, 31000 + street.length).forEach(function (hand) {
      const rows = PTActionLine.build(hand, { throughStreet: PTActionLine.previousStreet(street) });
      rows.forEach(function (row) {
        row.actions.forEach(function (act) {
          if (row.street === 'preflop' && /open|3-bet|4-bet|5-bet/.test(act.text)) {
            assert.ok(/\d+(\.\d+)? bb/.test(act.text), 'subida preflop con tamaño en bb: ' + act.text);
            preflopSized++;
          }
          if (row.street !== 'preflop' && /^(bet|c-bet)/.test(act.text)) {
            assert.ok(/\d+(\.\d+)? bb \(\d+% bote\)/.test(act.text),
              'apuesta postflop con bb y % de bote: ' + act.text);
            const pct = Number(act.text.match(/\((\d+)% bote\)/)[1]);
            assert.ok(pct > 0 && pct <= 400, '% de bote razonable: ' + act.text);
            postflopSized++;
          }
        });
      });
    });
  });
  assert.ok(preflopSized >= 20, 'subidas preflop con tamaño: ' + preflopSized);
  assert.ok(postflopSized >= 5, 'apuestas postflop con tamaño: ' + postflopSized);
}

console.log('6) Nunca adelanta la calle en curso');
{
  handsAtStreet('turn', 20, 8800).forEach(function (hand) {
    const rows = PTActionLine.build(hand, { throughStreet: 'flop' });
        assert.ok(!rows.some(function (r) { return r.street === 'turn' || r.street === 'river'; }),
      'sin filas de la calle en curso ni posteriores');
  });
}

console.log('6b) El preflop no lista folds (el motor solo conoce los del héroe en adelante)');
{
  handsAtStreet('flop', 30, 51000).forEach(function (hand) {
    const preflop = PTActionLine.build(hand, { throughStreet: 'preflop' })[0];
    assert.ok(preflop, 'fila de preflop');
    assert.ok(!preflop.actions.some(function (a) { return a.text === 'fold'; }),
      'sin folds preflop: ' + PTActionLine.text([preflop]));
  });
  // Postflop sí importan: cambian quién sigue en el bote.
  const multiway = {
    actionLine: [
      { kind: 'act', street: 'preflop', pos: 'CO', type: 'open', amount: 2.5 },
      { kind: 'act', street: 'preflop', pos: 'BTN', type: 'fold' },
      { kind: 'act', street: 'preflop', pos: 'BB', type: 'call', amount: 2.5 },
      { kind: 'street', street: 'flop', board: ['As', '7c', '2d'], potBB: 6 },
      { kind: 'act', street: 'flop', pos: 'BB', type: 'bet', amount: 2 },
      { kind: 'act', street: 'flop', pos: 'CO', type: 'fold' }
    ]
  };
  const rows = PTActionLine.build(multiway);
  assert.strictEqual(rows[0].actions.length, 2, 'el fold preflop desaparece');
  assert.ok(rows[1].actions.some(function (a) { return a.text === 'fold'; }), 'el fold del flop se mantiene');
  assert.strictEqual(rows[1].actions[0].text, 'bet 2 bb (33% bote)', '% de bote sobre el bote inicial de la calle');
}

console.log('7) Escenarios resubidos describen la escalada completa');
{
  const seen = {};
  for (let i = 0; i < 900 && (!seen.face3bet || !seen.face4bet || !seen.squeeze); i++) {
    const hand = Engine.newHand({ seed: 60000 + i }, cfg({ practiceStreet: 'flop' }));
    Engine.fastForwardToStreet(hand, 'flop');
    if (hand.result || !hand.current || hand.stage !== 'flop') continue;
    const type = hand.scenario.type;
    if (seen[type]) continue;
    const rows = PTActionLine.build(hand, { throughStreet: 'preflop' });
    const line = PTActionLine.text(rows);
    if (type === 'face3bet' || type === 'face4bet') {
      assert.ok(/open .* bb/.test(line) && /3-bet .* bb/.test(line), type + ' con open y 3-bet: ' + line);
    }
    if (type === 'face4bet') {
      assert.ok(/4-bet .* bb/.test(line), 'face4bet con 4-bet: ' + line);
    }
    if (type === 'squeeze') {
      assert.ok((line.match(/call/g) || []).length >= 2, 'squeeze con opener + pagador: ' + line);
    }
    seen[type] = true;
  }
  assert.ok(seen.face3bet || seen.face4bet, 'algún bote resubido ejercido');
}

console.log('8) HTML: posiciones, cartas y tamaños marcados para la mesa');
{
  const hand = handsAtStreet('river', 1, 99000)[0];
  assert.ok(hand, 'mano de river disponible');
  const html = PTActionLine.html(hand, { throughStreet: 'turn' });
  assert.ok(html.indexOf('action-line-rows') >= 0, 'lista de filas');
  assert.ok(html.indexOf('action-line-street') >= 0, 'etiqueta de calle');
  assert.ok(html.indexOf('action-line-card') >= 0, 'cartas del board');
  assert.ok(html.indexOf('action-line-pos') >= 0, 'posiciones');
  assert.ok(html.indexOf('action-line-size') >= 0, 'tamaños resaltados');
  assert.ok(html.indexOf('is-hero') >= 0, 'el héroe se distingue');
  assert.ok(html.indexOf('<script') < 0, 'sin HTML inyectado');

  const evil = { actionLine: [{ kind: 'act', street: 'preflop', pos: '<img src=x>', type: 'open', amount: 2.5 }] };
  assert.ok(PTActionLine.html(evil).indexOf('<img') < 0, 'posiciones escapadas');
}

console.log('9) Cableado en UI y bundles');
{
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('id="action-line"'), 'contenedor en index.html');

  const app = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  assert.ok(/function renderActionLine\(/.test(app), 'renderActionLine en app.js');
  assert.ok(/renderActionLine\(\);/.test(app), 'renderTable pinta la línea');
  assert.ok(/schoolMode/.test(app.slice(app.indexOf('function renderActionLine('), app.indexOf('function renderActionLine(') + 1200)),
    'la Escuela conserva su propio banner');

  const chunks = fs.readFileSync(path.join(ROOT, 'js', 'bundle-chunks.js'), 'utf8');
  assert.ok(chunks.includes('js/action-line.js'), 'action-line.js en el bundle core');

  const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  ['.action-line', '.action-line-street', '.action-line-size', '.action-line-pos'].forEach(function (sel) {
    assert.ok(css.includes(sel), 'CSS ' + sel);
  });

  const i18n = fs.readFileSync(path.join(ROOT, 'js', 'i18n.js'), 'utf8');
  assert.ok(i18n.includes("'play.actionLine': 'Línea de acción previa'"), 'i18n ES');
  assert.ok(i18n.includes("'play.actionLine': 'Previous action line'"), 'i18n EN');
}

console.log('\n*** test-trainer-action-line OK ***');
