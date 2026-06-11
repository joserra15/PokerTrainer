/*
 * cards.js
 * Utilidades de cartas: representación, baraja, y evaluador de manos de 5-7 cartas.
 * Todo expuesto en el espacio de nombres global `Cards`.
 */
(function (global) {
  'use strict';

  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const SUITS = ['s', 'h', 'd', 'c'];
  const SUIT_SYMBOL = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
  const RANK_VALUE = {};
  RANKS.forEach((r, i) => { RANK_VALUE[r] = i + 2; }); // 2..14

  const HAND_CATEGORIES = [
    'Carta alta',          // 0
    'Pareja',              // 1
    'Doble pareja',        // 2
    'Trío',                // 3
    'Escalera',            // 4
    'Color',               // 5
    'Full',                // 6
    'Póker',               // 7
    'Escalera de color'    // 8
  ];

  // ---- RNG con semilla (mulberry32) para repartos reproducibles ----
  let _seed = (Date.now() >>> 0) || 1;
  const rng = {
    setSeed(s) { _seed = (s >>> 0) || 1; },
    getSeed() { return _seed; },
    random() {
      _seed = (_seed + 0x6D2B79F5) | 0;
      let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };

  /** Crea una carta a partir de un código como "As", "Td", "9c". */
  function makeCard(code) {
    return { rank: code[0], suit: code[1], value: RANK_VALUE[code[0]], code };
  }

  /** Devuelve la baraja completa de 52 cartas (códigos). */
  function fullDeck() {
    const deck = [];
    for (const r of RANKS) {
      for (const s of SUITS) deck.push(r + s);
    }
    return deck;
  }

  /** Baraja Fisher-Yates in-place. `rnd` opcional (por defecto el RNG con semilla). */
  function shuffle(arr, rnd) {
    const r = rnd || rng.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Crea una baraja barajada excluyendo las cartas dadas (códigos). */
  function shuffledDeckExcluding(excluded, rnd) {
    const ex = new Set(excluded || []);
    const deck = fullDeck().filter((c) => !ex.has(c));
    return shuffle(deck, rnd);
  }

  /** Convierte un código de carta a HTML legible (símbolo + color). */
  function cardToHTML(code) {
    const suit = code[1];
    const red = suit === 'h' || suit === 'd';
    const rank = code[0] === 'T' ? '10' : code[0];
    return `<span class="card ${red ? 'red' : 'black'}">${rank}${SUIT_SYMBOL[suit]}</span>`;
  }

  /**
   * Evalúa la mejor mano de 5 cartas dentro de un conjunto de 5-7 cartas.
   * Devuelve { category, rank, name } donde `rank` es un array comparable
   * lexicográficamente (mayor es mejor).
   */
  function evaluate(cardCodes) {
    const cards = cardCodes.map((c) => (typeof c === 'string' ? makeCard(c) : c));
    const values = cards.map((c) => c.value);

    // Conteo por valor
    const countByValue = {};
    for (const v of values) countByValue[v] = (countByValue[v] || 0) + 1;

    // Conteo por palo (para color)
    const bySuit = { s: [], h: [], d: [], c: [] };
    for (const c of cards) bySuit[c.suit].push(c.value);

    // ¿Color?
    let flushSuit = null;
    for (const s of SUITS) if (bySuit[s].length >= 5) flushSuit = s;

    // ¿Escalera de color?
    if (flushSuit) {
      const sf = straightHigh(bySuit[flushSuit]);
      if (sf) return result(8, [sf]);
    }

    // Agrupar por multiplicidad
    const groups = Object.keys(countByValue)
      .map((v) => ({ value: +v, count: countByValue[v] }))
      .sort((a, b) => (b.count - a.count) || (b.value - a.value));

    const counts = groups.map((g) => g.count);

    // Póker
    if (counts[0] === 4) {
      const kicker = groups.filter((g) => g.value !== groups[0].value)
        .map((g) => g.value).sort((a, b) => b - a)[0];
      return result(7, [groups[0].value, kicker]);
    }

    // Full (trío + pareja)
    if (counts[0] === 3 && counts[1] >= 2) {
      return result(6, [groups[0].value, groups[1].value]);
    }

    // Color
    if (flushSuit) {
      const top5 = bySuit[flushSuit].sort((a, b) => b - a).slice(0, 5);
      return result(5, top5);
    }

    // Escalera
    const sh = straightHigh(values);
    if (sh) return result(4, [sh]);

    // Trío
    if (counts[0] === 3) {
      const kickers = groups.filter((g) => g.value !== groups[0].value)
        .map((g) => g.value).sort((a, b) => b - a).slice(0, 2);
      return result(3, [groups[0].value, ...kickers]);
    }

    // Doble pareja
    if (counts[0] === 2 && counts[1] === 2) {
      const pairValues = groups.filter((g) => g.count === 2)
        .map((g) => g.value).sort((a, b) => b - a);
      const high = pairValues[0], low = pairValues[1];
      const kicker = groups.filter((g) => g.value !== high && g.value !== low)
        .map((g) => g.value).sort((a, b) => b - a)[0];
      return result(2, [high, low, kicker]);
    }

    // Pareja
    if (counts[0] === 2) {
      const kickers = groups.filter((g) => g.value !== groups[0].value)
        .map((g) => g.value).sort((a, b) => b - a).slice(0, 3);
      return result(1, [groups[0].value, ...kickers]);
    }

    // Carta alta
    const top5 = values.slice().sort((a, b) => b - a).slice(0, 5);
    return result(0, top5);

    function result(category, kickers) {
      return {
        category,
        name: HAND_CATEGORIES[category],
        rank: [category, ...kickers]
      };
    }
  }

  /** Devuelve la carta más alta de una escalera dentro de los valores dados, o null. */
  function straightHigh(values) {
    const set = new Set(values);
    if (set.has(14)) set.add(1); // As bajo para la rueda A-2-3-4-5
    const distinct = Array.from(set).sort((a, b) => b - a);
    let run = 1;
    for (let i = 0; i < distinct.length - 1; i++) {
      if (distinct[i] - 1 === distinct[i + 1]) {
        run++;
        if (run >= 5) return distinct[i - 3];
      } else {
        run = 1;
      }
    }
    return null;
  }

  /** Compara dos resultados de evaluate(): >0 si a gana, <0 si b gana, 0 empate. */
  function compare(a, b) {
    const ra = a.rank, rb = b.rank;
    const len = Math.max(ra.length, rb.length);
    for (let i = 0; i < len; i++) {
      const x = ra[i] || 0, y = rb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  }

  global.Cards = {
    RANKS, SUITS, RANK_VALUE, SUIT_SYMBOL, HAND_CATEGORIES,
    makeCard, fullDeck, shuffle, shuffledDeckExcluding, cardToHTML,
    evaluate, compare, rng
  };
})(window);
