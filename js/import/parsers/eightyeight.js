/*
 * parsers/eightyeight.js — Parser 888poker / Pacific (NLHE cash + torneos).
 * Formato típico: "***** 888poker Hand History for Game … *****"
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;

  const BLOCK_SPLIT = /(?=^\*{3,}\s*888poker Hand History for Game\s+\d+|\n?#Game No\s*:\s*\d+)/im;
  const BLOCK_TEST = /888poker Hand History for Game|^\s*#Game No\s*:/i;

  function countHandBlocks(text) {
    const a = (text.match(/\*{3,}\s*888poker Hand History for Game\s+\d+/gi) || []).length;
    const b = (text.match(/^\s*#Game No\s*:\s*\d+/gim) || []).length;
    return Math.max(a, b);
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?) folds$/i))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?) checks$/i))) return { player: m[1].trim(), type: 'check' };
    if ((m = ln.match(/^(.+?) calls?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'call', amount: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?) bets?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'bet', amount: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?) raises?\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
      return { player: m[1].trim(), type: 'raise', amount: num(m[3]), to: num(m[3]), allin: /all[\s-]?in/i.test(ln) };
    }
    return null;
  }

  function parseHand(block) {
    const lines = String(block || '').split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '$',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: '888poker', locale: 'en',
      gameKind: 'unknown', tableMax: null, variant: 'unknown', isZoom: false
    };

    let street = 'preheader';
    let headerText = '';

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;
      if ((m = ln.match(/#Game No\s*:\s*(\d+)/i)) || (m = ln.match(/Hand History for Game\s+(\d+)/i))) {
        hand.id = m[1];
        headerText += ' ' + ln;
        continue;
      }

      // Blinds line: $0.05/$0.10 Blinds No Limit Holdem
      if ((m = ln.match(/((?:[€$£]|â‚¬)?)([\d.,]+)\s*\/\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*Blinds/i))) {
        headerText += ' ' + ln;
        hand.sb = num(m[2]);
        hand.bb = num(m[4]);
        hand.currency = (m[1] === '€' || m[1] === 'â‚¬') ? '€' : (m[1] === '£' ? '£' : '$');
        hand.isTournament = /Tournament/i.test(ln) || /Tournament/i.test(headerText);
        hand.isCash = !hand.isTournament;
        const det = U.detectVariant(ln);
        hand.variant = (det && det !== 'unknown') ? det : 'nlhe';
        continue;
      }

      // Tournament blinds without $ in blinds line
      if (/Tournament\s*#/i.test(ln) || /\bTournament\b/i.test(ln)) {
        headerText += ' ' + ln;
        hand.isTournament = true;
        hand.isCash = false;
        continue;
      }

      if ((m = ln.match(/Table\s+(.+?)\s+(\d+)\s*Max/i))) {
        hand.tableMax = +m[2];
        headerText += ' ' + ln;
        continue;
      }
      if ((m = ln.match(/Seat\s+(\d+)\s+is the button/i))) {
        hand.buttonSeat = +m[1];
        continue;
      }
      if ((m = ln.match(/^Seat\s+(\d+):\s*(.+?)\s*\(\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\)/i))) {
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[4]) });
        continue;
      }

      if ((m = ln.match(/^(.+?)\s+posts ante\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        const who = m[1].trim();
        hand.posts[who] = (hand.posts[who] || 0) + num(m[3]);
        hand.ante = hand.ante || num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?)\s+posts small blind\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        hand.blinds.sb = m[1].trim();
        hand.posts[hand.blinds.sb] = (hand.posts[hand.blinds.sb] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?)\s+posts big blind\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
        hand.blinds.bb = m[1].trim();
        hand.posts[hand.blinds.bb] = (hand.posts[hand.blinds.bb] || 0) + num(m[3]);
        continue;
      }

      if (/\*\*\s*Dealing down cards\s*\*\*/i.test(ln)) {
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/^Dealt to\s+(.+?)\s*\[\s*(.+?)\s*\]/i))) {
        hand.hero = m[1].trim();
        hand.heroCards = cardsFrom(m[2]);
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing flop\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing turn\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/\*\*\s*Dealing river\s*\*\*\s*\[\s*(.+?)\s*\]/i))) {
        street = 'river';
        hand.board.river = cardsFrom(m[1]);
        continue;
      }
      if (/\*\*\s*Summary\s*\*\*/i.test(ln)) {
        street = 'summary';
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^(.+?)\s+shows?\s*\[\s*(.+?)\s*\]/i))) {
          hand.shows[m[1].trim()] = cardsFrom(m[2]);
          continue;
        }
        if ((m = ln.match(/^(.+?)\s+collected\s*\[?\s*((?:[€$£]|â‚¬)?)([\d.,]+)\s*\]?/i))) {
          const who = m[1].trim();
          hand.collected[who] = (hand.collected[who] || 0) + num(m[3]);
          continue;
        }
        continue;
      }

      if (street === 'preflop' || street === 'flop' || street === 'turn' || street === 'river') {
        const act = parseAction(ln);
        if (act) {
          hand.streets[street].push(act);
          continue;
        }
      }
    }

    hand.boardAll = [].concat(hand.board.flop || [], hand.board.turn || [], hand.board.river || []);
    if (!hand.bb && hand.blinds.bb && hand.posts[hand.blinds.bb]) hand.bb = hand.posts[hand.blinds.bb];
    if (!hand.sb && hand.blinds.sb && hand.posts[hand.blinds.sb]) hand.sb = hand.posts[hand.blinds.sb];
    finalizeHandMeta(hand, headerText);
    return hand;
  }

  function parseSession(text, fileName) {
    const blocks = String(text || '').split(BLOCK_SPLIT).filter((b) => BLOCK_TEST.test(b.trim()));
    const hands = [];
    const heroCount = {};
    const discardedByReason = emptyDiscardCounts();
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i]);
        const keep = isKeepableHand(h);
        if (!keep.ok) {
          if (keep.reason && discardedByReason[keep.reason] != null) discardedByReason[keep.reason]++;
          else discardedByReason.badParse++;
          continue;
        }
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { discardedByReason.badParse++; }
    }
    let hero = null;
    let best = -1;
    const heroCandidates = Object.keys(heroCount).map((n) => ({ name: n, hands: heroCount[n] }))
      .sort((a, b) => b.hands - a.hands);
    for (let i = 0; i < heroCandidates.length; i++) {
      if (heroCandidates[i].hands > best) { best = heroCandidates[i].hands; hero = heroCandidates[i].name; }
    }
    return {
      fileName: fileName || '888poker.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: '888poker',
        platformLabel: '888poker',
        locale: 'en',
        localeLabel: 'English'
      }
    };
  }

  function detect(text) {
    return countHandBlocks(text);
  }

  Formats.register({
    id: '888poker',
    name: '888poker',
    detect: detect,
    parseSession: parseSession,
    parseHand: parseHand,
    describe: function () {
      return {
        platform: '888poker',
        platformLabel: '888poker',
        locale: 'en',
        localeLabel: 'English'
      };
    }
  });
})(window);
