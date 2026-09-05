/*
 * tournament/villain-decide.js — Villanos de torneo con motor Pro+ del entrenador.
 * Estilos fish/nit/tag/lag/maniac/pro sobre dificultad pro (keepArchetype).
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function mapRoleId(roleId) {
    var id = String(roleId || 'tag').toLowerCase();
    if (id === 'maniac') return 'maniac';
    var ok = { fish: 1, nit: 1, tag: 1, lag: 1, maniac: 1, pro: 1 };
    return ok[id] ? id : 'tag';
  }

  function profileForSeat(seat) {
    var VP = global.GTOVillainProfiles;
    var role = mapRoleId(seat && seat.roleId);
    if (!VP || typeof VP.applyDifficulty !== 'function') {
      return { id: role, preflopStrict: 0.92 };
    }
    var base = typeof VP.getProfile === 'function' ? VP.getProfile(role) : role;
    var prof = VP.applyDifficulty(base, 'pro', { forced: true, keepArchetype: true });
    if (seat && seat.proStyle) {
      prof = Object.assign({}, prof, { proStyle: seat.proStyle });
    }
    return prof;
  }

  function strength01(hole, board) {
    var C = global.Cards;
    board = board || [];
    if (!hole || hole.length < 2) return 0.1;
    if (C && C.evaluate && board.length >= 3) {
      try {
        var ev = C.evaluate(hole.concat(board));
        if (ev && ev.rank != null) {
          return Math.max(0.05, Math.min(0.98, 1 - (Number(ev.rank) / 7462)));
        }
      } catch (e) { /* */ }
    }
    var ranks = '23456789TJQKA';
    function rv(c) {
      return Math.max(0, ranks.indexOf(cardCode(c).charAt(0)));
    }
    var a = rv(hole[0]);
    var b = rv(hole[1]);
    var pair = cardCode(hole[0]).charAt(0) === cardCode(hole[1]).charAt(0);
    var suited = cardCode(hole[0]).charAt(1) === cardCode(hole[1]).charAt(1);
    return Math.max(0.05, Math.min(0.95,
      (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 +
      (pair ? 0.25 : 0) + (suited ? 0.08 : 0)
    ));
  }

  function rangeCtx(hand, seat) {
    var bb = Math.max(1, Number(hand.bb) || 1);
    return {
      formatHub: 'mtt',
      stackBB: (Number(seat.stack) || 0) / bb,
      street: hand.street || 'preflop'
    };
  }

  function raiseCount(hand) {
    var n = 0;
    (hand.log || []).forEach(function (e) {
      if (e.street !== 'preflop') return;
      if (e.action === 'raise' || e.action === 'bet') n += 1;
    });
    return n;
  }

  function openSizeBb(seat, profile) {
    var base = 2.5;
    if (profile && profile.id === 'nit') base = 2.2;
    else if (profile && (profile.id === 'lag' || profile.id === 'maniac')) base = 3;
    if (seat.pos === 'SB') base = Math.min(3.5, base + 0.5);
    return base;
  }

  function sampleBetFrac(profile, street, strength) {
    var VS = global.GTOVillainSizing;
    var rnd = Math.random();
    if (VS && typeof VS.sampleLeadFromStrategy === 'function') {
      try {
        var sample = VS.sampleLeadFromStrategy(
          { check: 0, bet_33: 0.22, bet_66: 0.42, bet_100: 0.26, bet_125: 0.1 },
          10,
          { street: street, strength: strength },
          rnd
        );
        if (sample && sample.action === 'bet' && sample.frac > 0) return sample.frac;
      } catch (e) { /* */ }
    }
    var VP = global.GTOVillainProfiles;
    if (VP && typeof VP.betSizeBB === 'function') {
      var amt = VP.betSizeBB(10, profile, rnd, { street: street, strength: strength });
      if (amt > 0) return amt / 10;
    }
    if (strength > 0.75) return 0.85;
    if (strength < 0.35) return 0.4;
    return 0.66;
  }

  function capRaiseTo(hand, seat, toAmt) {
    var maxTo = seat.streetInvested + seat.stack;
    var minTo = Math.min(maxTo, Math.max(hand.currentBet + hand.minRaise, hand.bb));
    var t = Math.max(minTo, Number(toAmt) || minTo);
    return Math.min(maxTo, r2(t));
  }

  function decidePreflop(hand, seat) {
    var VPF = global.GTOVillainPreflop;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var code = handCode(seat.cards);
    var ctx = rangeCtx(hand, seat);
    var raises = raiseCount(hand);

    if (!hand.openerId) {
      if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };
      var open = false;
      if (VPF && typeof VPF.isInOpenRange === 'function' && code) {
        try { open = !!VPF.isInOpenRange(code, seat.pos, ctx); } catch (e) { open = false; }
      } else {
        open = strength01(seat.cards, []) > 0.58;
      }
      if (open) {
        return {
          id: 'raise',
          amount: Math.min(
            seat.streetInvested + seat.stack,
            r2(hand.bb * openSizeBb(seat, profile))
          )
        };
      }
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }

    var action = 'fold';
    if (VPF && code) {
      try {
        if (raises >= 3 && typeof VPF.villainVs4BetAction === 'function') {
          action = VPF.villainVs4BetAction(code, profile, Math.random()) || 'fold';
        } else if (raises >= 2 && hand.openerId === seat.id &&
            typeof VPF.openerVs3BetAction === 'function') {
          action = VPF.openerVs3BetAction(code, profile, Math.random(), ctx) || 'fold';
        } else if (typeof VPF.defendVsOpen === 'function') {
          action = VPF.defendVsOpen(
            code, profile, Math.random(), seat.pos, hand.openerPos || 'CO', ctx
          ) || 'fold';
        }
      } catch (e2) {
        action = 'fold';
      }
    } else {
      var s0 = strength01(seat.cards, []);
      if (s0 > 0.8) action = '3bet';
      else if (s0 > 0.55) action = 'call';
    }

    if (action === '3bet' || action === 'raise' || action === '4bet') {
      var mult = raises >= 2 ? 2.3 : (seat.pos === 'SB' || seat.pos === 'BB' ? 3.6 : 3.2);
      return { id: 'raise', amount: capRaiseTo(hand, seat, hand.currentBet * mult) };
    }
    if (action === 'call' || action === 'limp') {
      return tc <= 0 ? { id: 'check' } : { id: 'call' };
    }
    return tc <= 0 ? { id: 'check' } : { id: 'fold' };
  }

  function decidePostflop(hand, seat) {
    var VP = global.GTOVillainProfiles;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var strength = strength01(seat.cards, hand.board || []);
    var pot = Math.max(hand.pot || 1, 1);
    var potOdds = tc > 0 ? tc / (pot + tc) : 0;
    var street = hand.street || 'flop';
    var rnd = Math.random();
    var opts = {
      street: street,
      tier: strength > 0.7 ? 'strong' : (strength < 0.35 ? 'weak' : 'medium')
    };

    if (tc > 0) {
      var face = 'fold';
      if (VP && typeof VP.postflopFacingBet === 'function') {
        try {
          face = VP.postflopFacingBet(strength, potOdds, profile, rnd, opts) || 'fold';
        } catch (e) { face = 'fold'; }
      } else if (strength > potOdds + 0.12) {
        face = 'call';
      } else if (strength > 0.78) {
        face = 'raise';
      }
      /* No overfold a apuestas mínimas (queja: fold a la apuesta más pequeña). */
      if (face === 'fold' && potOdds < 0.22 && strength > 0.28) {
        face = rnd < 0.55 ? 'call' : 'fold';
      }
      if (face === 'raise') {
        return {
          id: 'raise',
          amount: capRaiseTo(hand, seat, Math.max(
            hand.currentBet + hand.minRaise,
            hand.currentBet * 2.4,
            hand.currentBet + pot * 0.55
          ))
        };
      }
      if (face === 'call') return { id: 'call' };
      return { id: 'fold' };
    }

    var wasAgg = !!(hand.openerId && hand.openerId === seat.id);
    var lead = 'check';
    if (VP && typeof VP.postflopLead === 'function') {
      try {
        lead = VP.postflopLead(strength, profile, wasAgg, rnd, opts) || 'check';
      } catch (e2) { lead = 'check'; }
    } else if (strength > 0.62 || (strength > 0.4 && rnd < 0.35)) {
      lead = 'bet';
    }

    if (lead === 'bet') {
      var frac = sampleBetFrac(profile, street, strength);
      return {
        id: 'bet',
        amount: Math.min(
          seat.streetInvested + seat.stack,
          Math.max(hand.bb, r2(pot * frac))
        )
      };
    }
    return { id: 'check' };
  }

  function decide(hand, seat) {
    if (!hand || !seat) return { id: 'check' };
    if (hand.street === 'preflop') return decidePreflop(hand, seat);
    return decidePostflop(hand, seat);
  }

  global.PTTournamentVillainDecide = {
    decide: decide,
    profileForSeat: profileForSeat,
    strength01: strength01,
    handCode: handCode,
    mapRoleId: mapRoleId
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
