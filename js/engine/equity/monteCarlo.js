/*
 * monteCarlo.js — Equity vs rango con muestreo, caché y conciencia de calle.
 *
 * En turn solo se reparte 1 carta (46 desconocidas); en flop 2 cartas.
 * En river (board completo) usa enumeración exacta de combos.
 * Amplía el rango del villano en boards de color cuando el héroe no tiene las nuts.
 *
 * Rango de apuesta polarizado: las tablas RANGE_FACING_* son rangos de VALOR
 * («con qué continúa/apuesta fuerte»), no rangos de apuesta completos. Usarlas
 * tal cual dejaba bluff-catchers legítimos con 0 % de equity (imposible: un
 * rango de apuesta equilibrado siempre contiene faroles). Antes de calcular la
 * equity se completa el rango con la cuota de faroles que exige el sizing.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const N = global.GTORangesNotation;
  const Cache = global.GTOCache;
  const W = global.GTORangesWeights;

  const DEFAULT_BLUFF_BASE = '22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A8o+, KTo+, QTo+, JTo';
  /** Sizing desconocido: se asume ~2/3 de bote (cuota GTO de faroles ≈ 0.29). */
  const UNKNOWN_SIZING_BLUFF_SHARE = 0.22;
  const MIN_BLUFF_SHARE = 0.05;
  const MAX_BLUFF_SHARE = 0.40;
  /** Peso relativo de un proyecto fallado frente a aire sin historia de proyecto. */
  const MISSED_DRAW_WEIGHT = 3;

  function streetFromBoard(board) {
    const n = (board || []).length;
    if (n >= 5) return 'river';
    if (n === 4) return 'turn';
    if (n === 3) return 'flop';
    return 'preflop';
  }

  function cardsToRun(street, board) {
    const n = (board || []).length;
    const need = Math.max(0, 5 - n);
    return { need, street: street || streetFromBoard(board), unknownDeck: 52 - n - 2 };
  }

  function boardSuitCounts(board) {
    const counts = { s: 0, h: 0, d: 0, c: 0 };
    (board || []).forEach((c) => { counts[c[1]] = (counts[c[1]] || 0) + 1; });
    return counts;
  }

  /**
   * ¿El color del héroe es el máximo posible dado el board?
   * El As del palo puede estar en mano O en mesa; lo que importa es que no exista
   * un color mejor con las cartas restantes del palo.
   */
  function isNutFlushHolding(heroCards, board, flushSuit, heroScore) {
    const dead = new Set(heroCards.concat(board));
    const remaining = [];
    for (let i = C.RANKS.length - 1; i >= 0; i--) {
      const code = C.RANKS[i] + flushSuit;
      if (!dead.has(code)) remaining.push(code);
    }
    const boardFlushCount = board.filter((c) => c[1] === flushSuit).length;
    const need = Math.max(0, 5 - boardFlushCount);
    if (remaining.length < need) return true;
    const villainHole = remaining.slice(0, Math.min(2, remaining.length));
    if (boardFlushCount + villainHole.length < 5) return true;
    return C.compare(heroScore, C.evaluate(villainHole.concat(board))) >= 0;
  }

  /** ¿El héroe tiene color hecho y le falta el As del palo dominante? */
  function heroNonNutFlushContext(heroCards, board) {
    if (!board || board.length < 3) return null;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 5) return null;

    const suitCounts = boardSuitCounts(board);
    let flushSuit = null;
    for (const s of C.SUITS) {
      if (suitCounts[s] >= 3) flushSuit = s;
    }
    if (!flushSuit) return null;

    const heroHasAce = heroCards.some((c) => c[0] === 'A' && c[1] === flushSuit);
    const heroFlushHigh = heroScore.rank[1];
    const isNut = isNutFlushHolding(heroCards, board, flushSuit, heroScore);
    return { flushSuit, heroHasAce, heroFlushHigh, isNut };
  }

  /**
   * Incluye combos del villano que pueden superar un color no-nut del héroe.
   * Crítico cuando el board bloquea KQ del palo pero el villano puede tener Ax del palo.
   */
  function isFlushBoard(board) {
    const counts = boardSuitCounts(board);
    return C.SUITS.some((s) => counts[s] >= 3);
  }

  /**
   * River: héroe sin color aunque haya 3–4 cartas del palo (p. ej. A♣ + 3♣ en mesa = 4♣, no color).
   * El villano con dos cartas del palo o full house gana.
   */
  function missedFlushThreat(board, heroCards) {
    if (!board || board.length < 5 || !heroCards || heroCards.length < 2) return null;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category >= 5) return null;
    const counts = boardSuitCounts(board);
    for (const s of C.SUITS) {
      if (counts[s] < 3) continue;
      const heroSuit = heroCards.filter((c) => c[1] === s).length;
      if (counts[s] + heroSuit >= 5) continue;
      return { flushSuit: s, heroScore };
    }
    return null;
  }

  function filterCombosMissedFlushRiver(combos, board, heroCards, opts) {
    if (!opts || (!opts.facingBet && !opts.riverShove && !opts.shoveNode)) return combos;
    const threat = missedFlushThreat(board, heroCards);
    if (!threat || !combos.length) return combos;

    const counts = boardSuitCounts(board);
    const boardFlush = counts[threat.flushSuit] || 0;
    const heroSuit = heroCards.filter((c) => c[1] === threat.flushSuit).length;

    // 4 en mesa sin carta del palo: el shove es casi siempre color hecho.
    if (boardFlush >= 4 && heroSuit === 0) {
      const beating = combos.filter((vh) => C.compare(C.evaluate(vh.concat(board)), threat.heroScore) > 0);
      if (opts.riverShove || opts.shoveNode) {
        const flushes = combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 5);
        return flushes.length ? flushes : (beating.length ? beating : combos);
      }
      const made = combos.filter((vh) => {
        const vs = C.evaluate(vh.concat(board));
        return vs.category >= 5 || C.compare(vs, threat.heroScore) > 0;
      });
      return made.length ? made : combos;
    }

    // 3 en mesa (+ 0–1 en mano): rango de shove polarizado (QQ, AK, Kx, bluffs) — no filtrar a «solo ganadores».
    return combos;
  }

  /**
   * Ante apuesta en board de color: no inflar un color débil vs overpairs.
   * NUNCA colapsar a un subconjunto donde el héroe tiene 0 wins: eso mostraba
   * equity 0 % con color hecho (p. ej. Q♣J♣ vs TT+/88 boats) y marcaba fold.
   */
  function filterCombosFacingBet(combos, board, facingBet, heroCards) {
    if (!facingBet || !isFlushBoard(board) || !combos.length) return combos;
    if (!heroCards || heroCards.length < 2) return combos;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 5) return combos;
    const ctx = heroNonNutFlushContext(heroCards, board);
    if (!ctx || ctx.isNut || ctx.heroFlushHigh >= 13) return combos;
    const made = combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 5);
    if (!made.length) return combos;
    let heroWins = 0;
    for (let i = 0; i < made.length; i++) {
      if (C.compare(heroScore, C.evaluate(made[i].concat(board))) >= 0) heroWins++;
    }
    if (heroWins === 0) return combos;
    return made;
  }

  /**
   * River shove/overbet: estrechar rango solo si el héroe tiene color vulnerable
   * en mesa doblada (full houses del villano). No filtrar «solo combos que ganan»
   * con manos fuertes hechas (trío+): eso forzaba equity 0 % erróneamente.
   * Color máximo: no colapsar a solo fulls (también daba equity 0 %); la devaluación
   * (capEquity) ya modela el riesgo en mesa doblada.
   */
  function filterCombosFacingShove(combos, heroCards, board, opts) {
    if (!opts || (!opts.riverShove && !opts.shoveNode)) return combos;
    if (!combos.length || !heroCards || !board || board.length < 5) return combos;

    const RS = global.GTORiverShoveNode;
    if (!RS) return combos;

    const deval = RS.pairedBoardFlushDevaluation(heroCards, board);
    if (!deval.vulnerable) return combos;

    const ctx = heroNonNutFlushContext(heroCards, board);
    if (ctx && ctx.isNut) return combos;

    const heroScore = C.evaluate(heroCards.concat(board));
    // Color hecho: no colapsar a solo fulls (equity 0 %). capEquity ya devalúa.
    if (heroScore.category === 5) return combos;

    const beating = combos.filter((vh) => C.compare(C.evaluate(vh.concat(board)), heroScore) > 0);
    if (beating.length >= 1) return beating;

    const strong = combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 6);
    return strong.length ? strong : combos.filter((vh) => C.evaluate(vh.concat(board)).category >= 5);
  }

  function augmentVillainRange(heroCards, board, rangeStr) {
    const ctx = heroNonNutFlushContext(heroCards, board);
    if (!ctx || ctx.isNut) return rangeStr || '';
    const parts = [rangeStr || ''];
    if (!ctx.heroHasAce) parts.push('A2s-AKs');
    if (ctx.heroFlushHigh < 13) parts.push('KTs, KJs');
    if (ctx.heroFlushHigh < 12) parts.push('QJs, QTs');
    if (ctx.heroFlushHigh < 11) parts.push('JTs');
    return parts.filter(Boolean).join(', ');
  }

  function concreteCombos(code, excluded) {
    const ex = new Set(excluded || []);
    const out = [];
    const suits = C.SUITS;
    if (code.length === 2) {
      const r = code[0];
      for (let i = 0; i < suits.length; i++)
        for (let j = i + 1; j < suits.length; j++) {
          const c1 = r + suits[i], c2 = r + suits[j];
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
    } else {
      const r1 = code[0], r2 = code[1], suited = code[2] === 's';
      if (suited) {
        for (const s of suits) {
          const c1 = r1 + s, c2 = r2 + s;
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
      } else {
        for (const s1 of suits) for (const s2 of suits) {
          if (s1 === s2) continue;
          const c1 = r1 + s1, c2 = r2 + s2;
          if (!ex.has(c1) && !ex.has(c2)) out.push([c1, c2]);
        }
      }
    }
    return out;
  }

  function allVillainCombos(rangeStr, excluded) {
    const combos = [];
    const seen = new Set();
    N.expand(rangeStr || '').forEach((code) => {
      concreteCombos(code, excluded).forEach((vh) => {
        const key = vh.join('');
        if (!seen.has(key)) { seen.add(key); combos.push(vh); }
      });
    });
    return combos;
  }

  function sampleHandFromRange(rangeStr, excluded, rnd) {
    const r = rnd || C.rng.random;
    const codes = N.expand(rangeStr);
    const weighted = [];
    let total = 0;
    for (const code of codes) {
      const combos = concreteCombos(code, excluded);
      if (combos.length) { weighted.push({ combos }); total += combos.length; }
    }
    if (!weighted.length) return null;
    let pick = Math.floor(r() * total);
    for (const w of weighted) {
      if (pick < w.combos.length) return w.combos[pick];
      pick -= w.combos.length;
    }
    return weighted[0].combos[0];
  }

  /* -------------------------------------------------------------------------
   * Rango de apuesta polarizado: valor (tablas) + faroles (calculados)
   * ---------------------------------------------------------------------- */

  /** Fuerza de las cartas comunitarias por sí solas (la «mano del board»). */
  function boardOnlyScore(board) {
    if (!board || board.length < 5) return null;
    return Cache.memo('board', 'bscore:' + board.join(''), function () {
      return C.evaluate(board);
    });
  }

  /**
   * ¿El combo tiene valor de showdown, o solo juega el board?
   * Board seco → pareja+; board pareado → trío/full+; board con 4 del mismo palo → color.
   * Un kicker mejor no es valor de showdown: esos combos son los candidatos a farol.
   */
  function hasShowdownValue(vh, board) {
    const base = boardOnlyScore(board);
    if (!base) return true;
    const score = C.evaluate(vh.concat(board));
    if (score.category > base.category) return true;
    // Si el propio board hace escalera o color, mejorarla sí es valor real.
    if (base.category >= 4) return C.compare(score, base) > 0;
    return false;
  }

  /** ¿Llegaba al river con proyecto (color u escalera) que se falló? Es el farol natural. */
  function hadDrawBeforeRiver(vh, board) {
    const turnBoard = board.slice(0, 4);
    const all = vh.concat(turnBoard);
    const suits = {};
    all.forEach(function (c) { suits[c[1]] = (suits[c[1]] || 0) + 1; });
    for (const s in suits) {
      if (suits[s] === 4) return true;
    }
    const MH = global.GTOEquityMadeHand;
    if (MH && MH.straightDraws) {
      const d = MH.straightDraws(all);
      if (d.oesd || d.gutshot) return true;
    }
    return false;
  }

  /**
   * Combos sin valor de showdown que un rango de apuesta usaría como farol,
   * ponderando los proyectos fallados por encima del aire puro.
   */
  function bluffPool(board, dead, opts) {
    if (!board || board.length < 5) return [];
    const D = global.GTORangesData;
    const base = (opts && opts.bluffBaseRange)
      || (D && D.BROAD_CONTINUE)
      || DEFAULT_BLUFF_BASE;
    const key = 'bluffpool:' + board.join('') + '|' + dead.slice().sort().join('') + '|' + base.slice(0, 60);
    return Cache.memo('range', key, function () {
      const out = [];
      allVillainCombos(base, dead).forEach(function (vh) {
        if (hasShowdownValue(vh, board)) return;
        out.push({ hand: vh, weight: hadDrawBeforeRiver(vh, board) ? MISSED_DRAW_WEIGHT : 1 });
      });
      return out;
    });
  }

  /** Cuota de faroles de un rango de apuesta equilibrado: bet / (pot + 2×bet). */
  function gtoBluffShare(betBB, potBeforeBB) {
    const pot = Math.max(potBeforeBB || 0, 0.01);
    const bet = Math.max(betBB || 0, 0);
    if (bet <= 0) return 0;
    return bet / (pot + 2 * bet);
  }

  /**
   * Los pools de microlímites farolean por debajo de GTO, y tanto menos cuanto
   * mayor es el sizing (overbets y resubidas son casi puro valor).
   */
  function poolBluffFactor(betBB, potBeforeBB, opts) {
    const ratio = Math.max(betBB || 0, 0) / Math.max(potBeforeBB || 0.01, 0.01);
    let f = ratio <= 0.5 ? 0.9 : (ratio <= 0.85 ? 0.8 : (ratio <= 1.25 ? 0.7 : 0.6));
    if (opts && opts.villainLastAction === 'raise') f *= 0.75;
    return f;
  }

  /**
   * Texturas donde el rango de apuesta es casi puro valor: con 4 cartas del
   * mismo palo en mesa, la mayoría del rango del villano liga color y el héroe
   * sin ese palo no bloquea nada, así que apenas hay faroles que batir.
   */
  function textureBluffFactor(board, heroCards) {
    if (!board || board.length < 5 || !heroCards || heroCards.length < 2) return 1;
    const counts = boardSuitCounts(board);
    for (const s of C.SUITS) {
      if ((counts[s] || 0) < 4) continue;
      if (heroCards.some(function (c) { return c[1] === s; })) continue;
      return 0.25;
    }
    return 1;
  }

  /** Cuota de faroles objetivo del rango de apuesta del villano. */
  function targetBluffShare(opts, board, heroCards) {
    if (!opts) return 0;
    if (!opts.facingBet && !opts.riverShove && !opts.shoveNode) return 0;
    if (opts.bluffShare != null) {
      return Math.max(0, Math.min(MAX_BLUFF_SHARE, opts.bluffShare));
    }
    const bet = opts.betBB || 0;
    const pot = opts.potBeforeBB || 0;
    const sizing = (bet > 0 && pot > 0)
      ? gtoBluffShare(bet, pot) * poolBluffFactor(bet, pot, opts)
      : UNKNOWN_SIZING_BLUFF_SHARE;
    const raw = sizing * textureBluffFactor(board, heroCards);
    return Math.max(MIN_BLUFF_SHARE, Math.min(MAX_BLUFF_SHARE, raw));
  }

  /**
   * Completa un rango de valor con faroles hasta la cuota que exige el sizing.
   * Devuelve combos ponderados: [{ hand, weight }]. Idempotente: si el rango ya
   * contiene suficientes faroles no añade nada.
   */
  function polarizedCombos(heroCards, board, combos, opts) {
    const weighted = combos.map(function (vh) { return { hand: vh, weight: 1 }; });
    if (!board || board.length < 5 || !combos.length) return weighted;
    const target = targetBluffShare(opts, board, heroCards);
    if (target <= 0) return weighted;

    let air = 0;
    combos.forEach(function (vh) { if (!hasShowdownValue(vh, board)) air++; });
    const total = combos.length;
    if (air / total >= target) return weighted;

    const extra = (target * total - air) / (1 - target);
    if (!(extra > 0)) return weighted;

    const inRange = new Set(combos.map(function (vh) { return vh.join(''); }));
    const pool = bluffPool(board, heroCards.concat(board), opts)
      .filter(function (e) { return !inRange.has(e.hand.join('')); });
    if (!pool.length) return weighted;

    let poolWeight = 0;
    pool.forEach(function (e) { poolWeight += e.weight; });
    if (poolWeight <= 0) return weighted;
    const k = extra / poolWeight;
    pool.forEach(function (e) { weighted.push({ hand: e.hand, weight: e.weight * k }); });
    return weighted;
  }

  function equityFromWeighted(heroScore, board, weighted) {
    let win = 0, tie = 0, total = 0;
    for (let i = 0; i < weighted.length; i++) {
      const w = weighted[i].weight;
      if (!(w > 0)) continue;
      const cmp = C.compare(heroScore, C.evaluate(weighted[i].hand.concat(board)));
      if (cmp > 0) win += w;
      else if (cmp === 0) tie += w;
      total += w;
    }
    return total > 0 ? (win + tie / 2) / total : 0.5;
  }

  /* -------------------------------------------------------------------------
   * Cotas de cordura: reparto del héroe frente a TODAS las manos posibles
   * ---------------------------------------------------------------------- */

  /** Cuántas de las manos posibles del rival gana / empata / pierde el héroe. */
  function riverSpread(heroCards, board) {
    const key = 'spread:' + heroCards.slice().sort().join('') + '|' + board.join('');
    return Cache.memo('equity', key, function () {
      const heroScore = C.evaluate(heroCards.concat(board));
      const dead = new Set(heroCards.concat(board));
      const deck = C.fullDeck().filter(function (c) { return !dead.has(c); });
      let beat = 0, tie = 0, lose = 0;
      for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
          const cmp = C.compare(heroScore, C.evaluate([deck[i], deck[j]].concat(board)));
          if (cmp > 0) beat++;
          else if (cmp === 0) tie++;
          else lose++;
        }
      }
      return { beat: beat, tie: tie, lose: lose, total: beat + tie + lose };
    });
  }

  /**
   * Ninguna equity de river puede ser 0 % si el héroe gana a alguna mano posible,
   * ni 100 % si alguna mano posible le gana. Red de seguridad para cualquier
   * ruta (filtros, rangos degenerados, multiway) además del rango polarizado.
   */
  function clampRiverEquity(eq, heroCards, board) {
    if (!board || board.length < 5 || !heroCards || heroCards.length < 2) return eq;
    if (eq > 0 && eq < 1) return eq;
    const spread = riverSpread(heroCards, board);
    if (!spread.total) return eq;
    if (eq <= 0) {
      if (spread.beat + spread.tie === 0) return 0;
      const residual = (spread.beat + spread.tie / 2) / spread.total;
      return Math.min(0.05, residual);
    }
    if (spread.lose === 0) return 1;
    return Math.min(eq, 0.995);
  }

  function equityExact(heroCards, boardArr, rangeStr, opts) {
    opts = opts || {};
    const dead = heroCards.concat(boardArr);
    const heroScore = C.evaluate(dead);
    let combos = allVillainCombos(rangeStr, dead);
    combos = filterCombosFacingShove(combos, heroCards, boardArr, opts);
    combos = filterCombosFacingBet(combos, boardArr, opts.facingBet && !opts.riverShove, heroCards);
    combos = filterCombosMissedFlushRiver(combos, boardArr, heroCards, opts);
    if (!combos.length) return 0.5;

    const weighted = polarizedCombos(heroCards, boardArr, combos, opts);
    return clampRiverEquity(equityFromWeighted(heroScore, boardArr, weighted), heroCards, boardArr);
  }

  /** Enumeración exacta con runout restante (turn/flop) para rangos filtrados pequeños. */
  function equityExactRunout(heroCards, boardArr, villainCombos, cardsNeeded) {
    if (!cardsNeeded || !villainCombos.length) return 0.5;
    let win = 0, tie = 0, n = 0;
    for (const vh of villainCombos) {
      const used = new Set(heroCards.concat(boardArr, vh));
      const deck = C.fullDeck().filter((c) => !used.has(c));
      if (cardsNeeded === 1) {
        for (const river of deck) {
          const full = boardArr.concat([river]);
          const cmp = C.compare(
            C.evaluate(heroCards.concat(full)),
            C.evaluate(vh.concat(full))
          );
          if (cmp > 0) win++;
          else if (cmp === 0) tie++;
          n++;
        }
      } else if (cardsNeeded === 2) {
        for (let i = 0; i < deck.length; i++) {
          for (let j = i + 1; j < deck.length; j++) {
            const full = boardArr.concat([deck[i], deck[j]]);
            const cmp = C.compare(
              C.evaluate(heroCards.concat(full)),
              C.evaluate(vh.concat(full))
            );
            if (cmp > 0) win++;
            else if (cmp === 0) tie++;
            n++;
          }
        }
      }
    }
    return n ? (win + tie / 2) / n : 0.5;
  }

  /**
   * Equity Monte Carlo (flop/turn) o exacta (river) vs rango del villano.
   */
  function equityVsRange(heroCards, board, villainRangeStr, iters, opts) {
    opts = opts || {};
    iters = iters || 500;
    const boardArr = board || [];
    const street = opts.street || streetFromBoard(boardArr);
    const run = cardsToRun(street, boardArr);
    const rangeStr = augmentVillainRange(heroCards, boardArr, villainRangeStr);

    const key = [
      heroCards.join(''), boardArr.join(''), street, run.need,
      opts.facingBet ? 'fb' : '',
      opts.riverShove ? 'sh' : '',
      opts.shoveNode ? 'sn' : '',
      // El sizing cambia la cuota de faroles del rango: no puede compartir caché.
      opts.betBB != null ? 'b' + Math.round(opts.betBB * 100) : '',
      opts.potBeforeBB != null ? 'p' + Math.round(opts.potBeforeBB * 100) : '',
      opts.villainLastAction || '',
      (rangeStr || '').slice(0, 120), iters
    ].join('|');
    const cached = Cache.get('equity', key);
    if (cached !== undefined) return cached;

    const dead = heroCards.concat(boardArr);
    let combos = allVillainCombos(rangeStr, dead);
    combos = filterCombosFacingShove(combos, heroCards, boardArr, opts);
    const filtered = filterCombosFacingBet(combos, boardArr, opts.facingBet && !opts.riverShove, heroCards);
    const filtered4 = filterCombosMissedFlushRiver(filtered.length ? filtered : combos, boardArr, heroCards, opts);

    if (run.need === 0) {
      const eq = equityExact(heroCards, boardArr, rangeStr, opts);
      Cache.set('equity', key, eq);
      return eq;
    }

    if (opts.facingBet && filtered4.length && filtered4.length < combos.length) {
      const eq = equityExactRunout(heroCards, boardArr, filtered4, run.need);
      Cache.set('equity', key, eq);
      return eq;
    }

    if (opts.facingBet && filtered.length && filtered.length < combos.length) {
      const eq = equityExactRunout(heroCards, boardArr, filtered, run.need);
      Cache.set('equity', key, eq);
      return eq;
    }

    let win = 0, tie = 0, n = 0;
    const mc = (C && C.rng && C.rng.random) ? C.rng.random.bind(C.rng) : Math.random;
    const samplePool = filtered4.length ? filtered4 : (filtered.length ? filtered : null);

    for (let k = 0; k < iters; k++) {
      const vh = samplePool
        ? samplePool[Math.floor(mc() * samplePool.length)]
        : sampleHandFromRange(rangeStr, dead, mc);
      if (!vh) break;
      const used = dead.concat(vh);
      const deck = C.shuffledDeckExcluding(used, mc);
      const runout = deck.slice(0, run.need);
      const full = boardArr.concat(runout);
      const hScore = C.evaluate(heroCards.concat(full));
      const vScore = C.evaluate(vh.concat(full));
      const cmp = C.compare(hScore, vScore);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
      n++;
    }

    const eq = n ? (win + tie / 2) / n : 0.5;
    Cache.set('equity', key, eq);
    return eq;
  }

  function equityOneCardByOuts(outs, unknownCards) {
    const deck = unknownCards || 46;
    return Math.min(1, Math.max(0, outs / deck));
  }

  /** Equity vs N oponentes (delega a GTOMultiway si está cargado). */
  function equityVsN(heroCards, board, opponents, iters, opts) {
    const MW = global.GTOMultiway;
    if (MW && MW.equityVsN) return MW.equityVsN(heroCards, board, opponents, iters, opts);
    if (opponents && opponents.length === 1) {
      const o = opponents[0];
      return equityVsRange(heroCards, board, (o && o.rangeStr) || '22+,A2s+,K9s+,AJo+', iters, opts);
    }
    return 0.5;
  }

  global.GTOEquity = {
    equityVsRange, equityVsN, equityExact, equityExactRunout, sampleHandFromRange, concreteCombos, allVillainCombos,
    augmentVillainRange, heroNonNutFlushContext, isFlushBoard, filterCombosFacingBet,
    combosOf: W ? W.combosOf : function () { return 1; },
    streetFromBoard, cardsToRun, equityOneCardByOuts,
    hasShowdownValue, hadDrawBeforeRiver, bluffPool, gtoBluffShare, poolBluffFactor,
    textureBluffFactor, targetBluffShare, polarizedCombos, equityFromWeighted,
    riverSpread, clampRiverEquity
  };
})(window);
