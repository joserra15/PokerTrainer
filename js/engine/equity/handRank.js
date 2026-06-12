/*
 * handRank.js — Percentil de fuerza de mano dentro del rango del héroe vs rango villano.
 * Sustituye tiers discretos por bandas basadas en distribución de equity.
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const Eq = global.GTOEquity;
  const C = global.Cards;
  const Cache = global.GTOCache;
  const D = global.GTORangesData;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

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

  function sampleCombosFromRange(rangeStr, dead, maxSamples, rnd) {
    const r = rnd || Math.random;
    const codes = N.expand(rangeStr || '');
    const pool = [];
    codes.forEach((code) => {
      concreteCombos(code, dead).forEach((vh) => pool.push(vh));
    });
    if (!pool.length) return [];
    if (pool.length <= maxSamples) return pool;
    const picked = [];
    const used = new Set();
    let guard = 0;
    while (picked.length < maxSamples && guard < maxSamples * 4) {
      const vh = pool[Math.floor(r() * pool.length)];
      const key = vh.join('');
      if (!used.has(key)) { used.add(key); picked.push(vh); }
      guard++;
    }
    return picked;
  }

  /** Infiere rango activo del héroe según initiative y posición. */
  function inferHeroRange(input) {
    if (input.heroRange) return input.heroRange;
    if (!D) return '22+, A2s+, K9s+, Q9s+, T9s, 98s, 87s, 76s, A9o+, KTo+, QTo+';
    if (input.initiative === 'aggressor') {
      const open = D.OPEN_RAISE && D.OPEN_RAISE[input.position];
      if (open) return [open.raise, open.mix].filter(Boolean).join(', ');
      return D.BROAD_CONTINUE;
    }
    return D.RANGE_FACING_CALL_LINE || D.BROAD_CONTINUE;
  }

  /**
   * Percentil 0..1 de la mano del héroe dentro de su rango (equity vs villano).
   * @returns {{ percentile: number, band: string, heroEquity: number, tier: string }}
   */
  function computeHandRank(input) {
    const heroCards = input.heroCards;
    const board = input.board || [];
    if (!heroCards || heroCards.length !== 2 || board.length < 3 || !Eq) {
      return { percentile: 0.5, band: 'merge', heroEquity: input.heroEquity || 0.5, tier: 'medium' };
    }

    const villainRange = input.villainRange || D.BROAD_CONTINUE;
    const heroRange = inferHeroRange(input);
    const facingBet = (input.toCallBB || 0) > 0;
    const eqOpts = { street: input.street, facingBet: facingBet };
    const cacheKey = [
      heroCards.join(''), board.join(''), input.street,
      facingBet ? 'fb' : '', heroRange.slice(0, 40), villainRange.slice(0, 80)
    ].join('|');

    return Cache.memo('handRank', cacheKey, () => {
      const heroEquity = input.heroEquity != null
        ? input.heroEquity
        : Eq.equityVsRange(heroCards, board, villainRange, 350, eqOpts);

      const dead = heroCards.concat(board);
      const samples = sampleCombosFromRange(heroRange, dead, 18);
      if (samples.length < 4) {
        const band = bandFromEquity(heroEquity);
        return { percentile: heroEquity, band, heroEquity, tier: bandToTier(band) };
      }

      const equities = [];
      samples.forEach((vh) => {
        if (vh.join('') === heroCards.join('')) return;
        equities.push(Eq.equityVsRange(vh, board, villainRange, 80, eqOpts));
      });
      equities.push(heroEquity);
      equities.sort((a, b) => a - b);

      let idx = 0;
      while (idx < equities.length && equities[idx] < heroEquity - 1e-9) idx++;
      const percentile = equities.length > 1 ? idx / (equities.length - 1) : 0.5;
      const band = bandFromPercentile(percentile, heroEquity, input.madeHandInfo);
      return {
        percentile: clamp(percentile, 0, 1),
        band,
        heroEquity,
        tier: bandToTier(band)
      };
    });
  }

  function bandFromPercentile(pct, eq, madeInfo) {
    if (madeInfo && madeInfo.isNutFlush === false && eq < 0.15) return 'air';
    if (pct >= 0.82 || eq >= 0.72) return 'nuts';
    if (pct >= 0.62 || eq >= 0.58) return 'value';
    if (pct >= 0.42 || eq >= 0.42) return 'merge';
    if (pct >= 0.22 || eq >= 0.28) return 'bluffcatch';
    return 'air';
  }

  function bandFromEquity(eq) {
    if (eq >= 0.72) return 'nuts';
    if (eq >= 0.58) return 'value';
    if (eq >= 0.42) return 'merge';
    if (eq >= 0.28) return 'bluffcatch';
    return 'air';
  }

  function bandToTier(band) {
    if (band === 'nuts' || band === 'value') return 'strong';
    if (band === 'merge') return 'medium';
    if (band === 'bluffcatch') return 'weak';
    return 'air';
  }

  global.GTOHandRank = {
    computeHandRank, inferHeroRange, bandFromPercentile, bandToTier, bandFromEquity
  };
})(window);
