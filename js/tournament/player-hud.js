/*
 * tournament/player-hud.js — HUD en vivo por jugador (héroe + villanos).
 * Jugado≈VPIP, Subido≈PFR, Resubido≈3-bet; fold-to-3bet interno para exploit.
 * Solo torneos in-app; no se pinta en el felt.
 */
(function (global) {
  'use strict';

  var PARTIAL_SAMPLE = 4;
  var MIN_SAMPLE = 7;

  function emptyHud() {
    return {
      hands: 0,
      vpipHands: 0,
      pfrHands: 0,
      threeBetHands: 0,
      threeBetOpps: 0,
      foldTo3BetHands: 0,
      foldTo3BetOpps: 0
    };
  }

  function ensure(state) {
    if (!state) return null;
    if (!state.playerHud || typeof state.playerHud !== 'object') state.playerHud = {};
    return state.playerHud;
  }

  function getOrCreate(state, playerId) {
    var map = ensure(state);
    if (!map || !playerId) return null;
    if (!map[playerId]) map[playerId] = emptyHud();
    return map[playerId];
  }

  function pct(num, den) {
    if (!den) return null;
    return Math.round((num / den) * 1000) / 10;
  }

  function putChipsBeyondBlinds(hand, seat) {
    if (!seat || !hand) return false;
    var blindShare = 0;
    if (seat.pos === 'SB' || (hand.seats && hand.seats.length === 2 && seat.pos === 'BTN')) {
      blindShare = Number(hand.sb) || 0;
    } else if (seat.pos === 'BB') {
      blindShare = Number(hand.bb) || 0;
    }
    if (hand.ante > 0) blindShare += Number(hand.ante) || 0;
    return (Number(seat.invested) || 0) > blindShare + 0.001;
  }

  function isRaiseAction(action) {
    return action === 'raise' || action === 'bet' || action === 'allin';
  }

  /**
   * Analiza el log preflop de una mano y devuelve por jugador:
   * { pfr, threeBet, threeBetOpp, foldTo3Bet, foldTo3BetOpp }.
   */
  function analyzePreflop(hand) {
    var out = {};
    var seats = (hand && hand.seats) || [];
    seats.forEach(function (s) {
      if (!s || !s.id) return;
      out[s.id] = {
        pfr: false,
        threeBet: false,
        threeBetOpp: false,
        foldTo3Bet: false,
        foldTo3BetOpp: false
      };
    });

    var log = (hand && hand.log) || [];
    var raiseCount = 0;
    var lastRaiserId = null;
    var openerId = null;

    for (var i = 0; i < log.length; i++) {
      var a = log[i];
      if (!a || a.street !== 'preflop') continue;
      var pid = a.id;
      if (!pid) continue;
      if (!out[pid]) {
        out[pid] = {
          pfr: false,
          threeBet: false,
          threeBetOpp: false,
          foldTo3Bet: false,
          foldTo3BetOpp: false
        };
      }
      var row = out[pid];
      var act = a.action;

      /* Spot vs open (exactamente 1 raise previa): oportunidad de 3-bet. */
      if (raiseCount === 1 && lastRaiserId && lastRaiserId !== pid) {
        if (act === 'fold' || act === 'call' || isRaiseAction(act)) {
          row.threeBetOpp = true;
        }
      }

      /* Spot enfrentando 3-bet: el opener responde a un resubido (raiseCount===2). */
      if (raiseCount === 2 && openerId === pid && lastRaiserId && lastRaiserId !== pid) {
        if (act === 'fold' || act === 'call' || isRaiseAction(act)) {
          row.foldTo3BetOpp = true;
          if (act === 'fold') row.foldTo3Bet = true;
        }
      }

      if (isRaiseAction(act)) {
        /* allin corto ya se loguea como call en live-hand; aquí allin/raise/bet cuentan. */
        if (raiseCount === 0) {
          row.pfr = true;
          openerId = pid;
          raiseCount = 1;
          lastRaiserId = pid;
        } else if (raiseCount === 1 && lastRaiserId !== pid) {
          row.pfr = true;
          row.threeBet = true;
          row.threeBetOpp = true;
          raiseCount = 2;
          lastRaiserId = pid;
        } else if (raiseCount >= 2 && lastRaiserId !== pid) {
          row.pfr = true;
          raiseCount += 1;
          lastRaiserId = pid;
        } else if (raiseCount >= 1 && lastRaiserId === pid) {
          /* Re-open / 4-bet own line — sigue contando PFR. */
          row.pfr = true;
          raiseCount += 1;
          lastRaiserId = pid;
        }
      }
    }
    return out;
  }

  function onHandComplete(state, hand) {
    if (!state || !hand || !hand.seats || !hand.seats.length) return ensure(state);
    var map = ensure(state);
    var pf = analyzePreflop(hand);

    hand.seats.forEach(function (seat) {
      if (!seat || !seat.id) return;
      var hud = getOrCreate(state, seat.id);
      if (!hud) return;
      hud.hands = (Number(hud.hands) || 0) + 1;
      if (putChipsBeyondBlinds(hand, seat)) {
        hud.vpipHands = (Number(hud.vpipHands) || 0) + 1;
      }
      var row = pf[seat.id] || {};
      if (row.pfr) hud.pfrHands = (Number(hud.pfrHands) || 0) + 1;
      if (row.threeBetOpp) hud.threeBetOpps = (Number(hud.threeBetOpps) || 0) + 1;
      if (row.threeBet) hud.threeBetHands = (Number(hud.threeBetHands) || 0) + 1;
      if (row.foldTo3BetOpp) hud.foldTo3BetOpps = (Number(hud.foldTo3BetOpps) || 0) + 1;
      if (row.foldTo3Bet) hud.foldTo3BetHands = (Number(hud.foldTo3BetHands) || 0) + 1;
    });
    return map;
  }

  function snapshot(state, playerId) {
    var map = ensure(state);
    var hud = (map && playerId && map[playerId]) || emptyHud();
    var hands = Number(hud.hands) || 0;
    var threeBetOpps = Number(hud.threeBetOpps) || 0;
    var foldOpps = Number(hud.foldTo3BetOpps) || 0;
    return {
      hands: hands,
      vpipHands: Number(hud.vpipHands) || 0,
      pfrHands: Number(hud.pfrHands) || 0,
      threeBetHands: Number(hud.threeBetHands) || 0,
      threeBetOpps: threeBetOpps,
      foldTo3BetHands: Number(hud.foldTo3BetHands) || 0,
      foldTo3BetOpps: foldOpps,
      vpipPct: pct(hud.vpipHands, hands),
      pfrPct: pct(hud.pfrHands, hands),
      threeBetPct: pct(hud.threeBetHands, threeBetOpps),
      foldTo3BetPct: pct(hud.foldTo3BetHands, foldOpps),
      /* Alias compatibles con profileFromStats / heroSessionStats */
      handsPlayed: hands,
      nHands: hands,
      vpip: pct(hud.vpipHands, hands),
      pfr: pct(hud.pfrHands, hands)
    };
  }

  function sampleConfidence(hands) {
    hands = Number(hands) || 0;
    var Ex = global.GTOVillainProExploit;
    if (Ex && typeof Ex.sampleConfidence === 'function') {
      return Ex.sampleConfidence(hands);
    }
    if (hands >= MIN_SAMPLE) return 1;
    if (hands >= PARTIAL_SAMPLE) {
      return 0.55 + 0.45 * ((hands - PARTIAL_SAMPLE) / Math.max(1, MIN_SAMPLE - PARTIAL_SAMPLE));
    }
    return 0;
  }

  /**
   * Clasifica estilo MTT con umbrales fase-aware.
   * @returns {{ archetype: string|null, exploitTag: string|null, confidence: number, label: string|null }}
   */
  function classify(snap, phase) {
    snap = snap || {};
    var hands = Number(snap.hands != null ? snap.hands : snap.handsPlayed) || 0;
    var conf = sampleConfidence(hands);
    var empty = { archetype: null, exploitTag: null, confidence: conf, label: null };
    if (conf <= 0) return empty;

    var vpip = snap.vpipPct != null ? Number(snap.vpipPct) : Number(snap.vpip);
    var pfr = snap.pfrPct != null ? Number(snap.pfrPct) : Number(snap.pfr);
    if (!isFinite(vpip)) return empty;
    if (!isFinite(pfr)) pfr = vpip * 0.55;
    var gap = vpip - pfr;
    var threeBet = snap.threeBetPct != null ? Number(snap.threeBetPct) : null;

    var ph = String(phase || 'early').toLowerCase();
    var looseShift = 0;
    if (ph === 'mid' || ph === 'bubble') looseShift = 4;
    else if (ph === 'short' || ph === 'push' || ph === 'late' || ph === 'hu') looseShift = 6;

    var nitVpip = 16 + looseShift;
    var nitPfr = 12 + looseShift * 0.75;
    var lagVpip = 30 + looseShift;
    var lagPfr = 24 + looseShift;
    var maniacVpip = 40 + looseShift;
    var fishVpip = 34 + looseShift;

    var archetype = 'tag';
    if (vpip <= nitVpip && pfr <= nitPfr) archetype = 'nit';
    else if (vpip >= maniacVpip && pfr >= lagPfr) archetype = 'maniac';
    else if (vpip >= lagVpip && pfr >= lagPfr && gap <= 10) archetype = 'lag';
    else if (vpip >= fishVpip && gap >= 12) archetype = 'fish';
    else if (vpip >= lagVpip && gap > 10) archetype = 'fish';

    var exploitTag = null;
    var Ex = global.GTOVillainProExploit;
    if (Ex && typeof Ex.profileFromStats === 'function') {
      try {
        exploitTag = Ex.profileFromStats({
          handsPlayed: hands,
          vpipPct: vpip,
          pfrPct: pfr,
          foldTo3BetPct: snap.foldTo3BetPct
        });
      } catch (ePf) { exploitTag = null; }
    }
    if (!exploitTag) {
      if (archetype === 'nit') exploitTag = 'nit';
      else if (archetype === 'lag' || archetype === 'maniac') exploitTag = 'laggy';
      else if (archetype === 'fish') exploitTag = 'callingStation';
    }
    /* 3-bet muy light refuerza laggy aunque VPIP sea medio. */
    if (threeBet != null && isFinite(threeBet) && threeBet >= 12 && hands >= PARTIAL_SAMPLE) {
      if (exploitTag !== 'callingStation') exploitTag = 'laggy';
      if (archetype === 'tag') archetype = 'lag';
    }

    return {
      archetype: archetype,
      exploitTag: exploitTag,
      confidence: conf,
      label: archetype
    };
  }

  /** HTML de la franja Jugado / Subido / Resubido / Manos. */
  function renderStripHtml(snap, opts) {
    opts = opts || {};
    snap = snap || snapshot(null, null);
    function fmtPct(v) {
      if (v == null || !isFinite(v)) return '—';
      return String(v).replace('.', ',') + '%';
    }
    var cells = [
      { cls: 'jugado', val: fmtPct(snap.vpipPct), lab: 'Jugado', tone: 'red' },
      { cls: 'subido', val: fmtPct(snap.pfrPct), lab: 'Subido', tone: 'orange' },
      { cls: 'resubido', val: fmtPct(snap.threeBetPct), lab: 'Resubido', tone: 'green' },
      { cls: 'manos', val: snap.hands != null ? String(snap.hands) : '0', lab: 'Manos', tone: 'white' }
    ];
    var html = '<div class="trn-live-hud-strip"' +
      (opts.compact ? ' data-compact="1"' : '') + ' role="group" aria-label="Estadísticas en vivo">';
    cells.forEach(function (c) {
      html += '<div class="trn-live-hud-cell trn-live-hud-' + c.cls + '" data-tone="' + c.tone + '">' +
        '<div class="trn-live-hud-icon" aria-hidden="true"></div>' +
        '<div class="trn-live-hud-val">' + c.val + '</div>' +
        '<div class="trn-live-hud-lab">' + c.lab + '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  global.PTTournamentPlayerHud = {
    PARTIAL_SAMPLE: PARTIAL_SAMPLE,
    MIN_SAMPLE: MIN_SAMPLE,
    ensure: ensure,
    emptyHud: emptyHud,
    getOrCreate: getOrCreate,
    analyzePreflop: analyzePreflop,
    onHandComplete: onHandComplete,
    snapshot: snapshot,
    sampleConfidence: sampleConfidence,
    classify: classify,
    renderStripHtml: renderStripHtml
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
