/*
 * parsers/coinpoker.js — Parser CoinPoker NLHE (cash / MTT / SNG).
 * Formato típico: "CoinPoker Hand #3580620001: NLH (250/500/63) …"
 * Importante: cantidades en formato US (1,752 / 13,459.82); ALLIN X = chips restantes.
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const cardsFrom = U.cardsFrom;
  const finalizeHandMeta = U.finalizeHandMeta;
  const isKeepableHand = U.isKeepableHand;
  const emptyDiscardCounts = U.emptyDiscardCounts;

  const BLOCK_SPLIT = /(?=^CoinPoker Hand #)/m;
  const BLOCK_TEST = /^CoinPoker Hand #/;
  const HAND_RE = /^CoinPoker Hand #(\d+)/gm;
  const CUR = '(?:[€$£₮]|USDT)?';

  /** CoinPoker usa miles con coma y decimales con punto (1,752 / 13,459.82). */
  function numCp(s) {
    if (s == null) return 0;
    let t = String(s).trim().replace(/\s|[€$£₮]/g, '').replace(/^USDT/i, '');
    if (t.indexOf(',') >= 0 && t.indexOf('.') >= 0) t = t.replace(/,/g, '');
    else if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
    else if (t.indexOf(',') >= 0) t = t.replace(',', '.');
    const v = parseFloat(t);
    return isNaN(v) ? 0 : v;
  }

  function countHandBlocks(text) {
    if (!text) return 0;
    return (String(text).match(HAND_RE) || []).length;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?): folds$/i))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?): checks$/i))) return { player: m[1].trim(), type: 'check' };
    if ((m = ln.match(new RegExp('^(.+?): calls ' + CUR + '([\\d.,]+)', 'i')))) {
      return { player: m[1].trim(), type: 'call', amount: numCp(m[2]), allin: /all-?in/i.test(ln) };
    }
    if ((m = ln.match(new RegExp('^(.+?): bets ' + CUR + '([\\d.,]+)', 'i')))) {
      return { player: m[1].trim(), type: 'bet', amount: numCp(m[2]), allin: /all-?in/i.test(ln) };
    }
    if ((m = ln.match(new RegExp('^(.+?): raises ' + CUR + '([\\d.,]+) to ' + CUR + '([\\d.,]+)', 'i')))) {
      return {
        player: m[1].trim(), type: 'raise', amount: numCp(m[2]), to: numCp(m[3]),
        allin: /all-?in/i.test(ln)
      };
    }
    if ((m = ln.match(new RegExp('^(.+?): ALLIN ' + CUR + '([\\d.,]+)', 'i')))) {
      return { player: m[1].trim(), type: 'allin', amount: numCp(m[2]), allin: true };
    }
    return null;
  }

  function convertAllin(player, amount, streetPut, toMatch) {
    const cur = streetPut[player] || 0;
    const need = Math.max(0, toMatch - cur);
    if (need > 0.001 && amount <= need + 0.01) {
      return { player: player, type: 'call', amount: amount, allin: true };
    }
    if (toMatch <= 0.001) {
      return { player: player, type: 'bet', amount: amount, allin: true };
    }
    return { player: player, type: 'raise', amount: amount, to: cur + amount, allin: true };
  }

  function applyStreetAct(act, streetPut) {
    if (!act) return;
    if (act.type === 'bet') streetPut[act.player] = act.amount;
    else if (act.type === 'raise') streetPut[act.player] = act.to;
    else if (act.type === 'call') {
      streetPut[act.player] = (streetPut[act.player] || 0) + act.amount;
    }
  }

  function parseHand(block) {
    const lines = String(block || '').split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '₮',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'coinpoker', locale: 'en',
      gameKind: 'unknown', tableMax: null, variant: 'unknown', isZoom: false
    };

    let street = 'preheader';
    let headerText = '';
    let toMatch = 0;
    let streetPut = {};

    function resetStreet() {
      toMatch = 0;
      streetPut = {};
    }

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;

      if ((m = ln.match(/^CoinPoker Hand #(\d+):\s*(.+)$/i))) {
        hand.id = m[1];
        const rest = m[2];
        headerText += ' ' + ln;
        const det = U.detectVariant(rest + ' ' + ln);
        if (det && det !== 'unknown') hand.variant = det;
        if (/\bNLH\b|\bNLHE\b|Hold'?em|Holdem/i.test(rest)) hand.variant = 'nlhe';

        const stakes = rest.match(new RegExp('\\(\\s*' + CUR + '([\\d.,]+)\\s*/\\s*' + CUR + '([\\d.,]+)(?:\\s*/\\s*' + CUR + '([\\d.,]+))?\\s*\\)'));
        if (stakes) {
          hand.sb = numCp(stakes[1]);
          hand.bb = numCp(stakes[2]);
          if (stakes[3] != null) hand.ante = numCp(stakes[3]);
        }
        if (/[€]/.test(rest) || /[€]/.test(ln)) hand.currency = '€';
        else if (/£/.test(rest)) hand.currency = '£';
        else if (/\$/.test(rest)) hand.currency = '$';
        else if (/₮|USDT/i.test(rest)) hand.currency = '₮';

        const dt = rest.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/);
        if (dt) hand.datetime = dt[1].trim();
        continue;
      }

      // Nombre puede llevar apóstrofe (Champion's); el id es el último '12345'
      if (/^Tournament\s+/i.test(ln)) {
        headerText += ' ' + ln;
        hand.isTournament = true;
        hand.isCash = false;
        const tm = ln.match(/^Tournament\s+'(.+)'\s+'(\d+)'(.*)$/i);
        if (tm) {
          hand.tournamentName = tm[1];
          hand.tournamentId = tm[2];
          const rest = tm[3] || '';
          const tmax = U.detectTableMaxFromText(ln) || U.detectTableMaxFromText(rest);
          if (tmax) hand.tableMax = tmax;
          const bi = String(hand.tournamentName).match(/[₮€$£]\s*([\d.,]+)/);
          if (bi) {
            hand.buyIn = numCp(bi[1]);
            hand.buyInFee = hand.buyInFee || 0;
            if (/₮/.test(hand.tournamentName)) hand.currency = '₮';
            else if (/€/.test(hand.tournamentName)) hand.currency = '€';
            else if (/\$/.test(hand.tournamentName)) hand.currency = '$';
          }
        } else {
          const tmax = U.detectTableMaxFromText(ln);
          if (tmax) hand.tableMax = tmax;
        }
        if ((m = ln.match(/Seat\s+#(\d+)\s+is the button/i))) hand.buttonSeat = +m[1];
        continue;
      }

      if (/^Table\s+/i.test(ln)) {
        headerText += ' ' + ln;
        const tmax = U.detectTableMaxFromText(ln);
        if (tmax) hand.tableMax = tmax;
        if ((m = ln.match(/Seat\s+#(\d+)\s+is the button/i))) hand.buttonSeat = +m[1];
        continue;
      }

      if ((m = ln.match(/^Seat\s+(\d+):\s*(.+?)\s*\(\s*([\d.,]+)\s+in chips/i))) {
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: numCp(m[3]) });
        continue;
      }

      if ((m = ln.match(new RegExp('^(.+?): posts ante\\s+' + CUR + '([\\d.,]+)', 'i')))) {
        const who = m[1].trim();
        hand.posts[who] = (hand.posts[who] || 0) + numCp(m[2]);
        hand.ante = hand.ante || numCp(m[2]);
        continue;
      }
      if ((m = ln.match(new RegExp('^(.+?): posts small blind\\s+' + CUR + '([\\d.,]+)', 'i')))) {
        const who = m[1].trim();
        const amt = numCp(m[2]);
        hand.blinds.sb = who;
        hand.posts[who] = (hand.posts[who] || 0) + amt;
        streetPut[who] = (streetPut[who] || 0) + amt;
        toMatch = Math.max(toMatch, streetPut[who]);
        continue;
      }
      if ((m = ln.match(new RegExp('^(.+?): posts big blind\\s+' + CUR + '([\\d.,]+)', 'i')))) {
        const who = m[1].trim();
        const amt = numCp(m[2]);
        hand.blinds.bb = who;
        hand.posts[who] = (hand.posts[who] || 0) + amt;
        streetPut[who] = (streetPut[who] || 0) + amt;
        toMatch = Math.max(toMatch, streetPut[who]);
        if (!hand.bb) hand.bb = amt;
        continue;
      }

      if (/^\*\*\* HOLE CARDS \*\*\*/i.test(ln) || /^\*\*\* PRE-FLOP \*\*\*/i.test(ln)) {
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
        if (!hand.hero && m[2] && m[2].trim()) {
          hand.hero = m[1].trim();
          hand.heroCards = cardsFrom(m[2]);
        }
        continue;
      }
      if (/^Dealt to /i.test(ln)) continue;

      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/i))) {
        street = 'flop';
        resetStreet();
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'turn';
        resetStreet();
        hand.board.turn = cardsFrom(m[2]);
        if (!hand.board.flop.length) hand.board.flop = cardsFrom(m[1]).slice(0, 3);
        continue;
      }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'river';
        resetStreet();
        hand.board.river = cardsFrom(m[2]);
        continue;
      }
      if (/^\*\*\* SHOWDOWN \*\*\*/i.test(ln) || /^\*\*\* SHOW DOWN \*\*\*/i.test(ln)) {
        street = 'showdown';
        continue;
      }
      if (/^\*\*\* SUMMARY \*\*\*/i.test(ln)) {
        street = 'summary';
        continue;
      }

      if ((m = ln.match(new RegExp('^(.+?): RETURN\\s+' + CUR + '([\\d.,]+)', 'i')))) {
        const who = m[1].trim();
        hand.uncalledTo[who] = (hand.uncalledTo[who] || 0) + numCp(m[2]);
        continue;
      }
      if ((m = ln.match(new RegExp('^Uncalled bet \\(' + CUR + '([\\d.,]+)\\) returned to (.+)$', 'i')))) {
        hand.uncalledTo[m[2].trim()] = (hand.uncalledTo[m[2].trim()] || 0) + numCp(m[1]);
        continue;
      }
      if ((m = ln.match(new RegExp('^(.+?) collected\\s+' + CUR + '([\\d.,]+) from (?:(?:main|side)\\s+)?pot', 'i')))) {
        const who = m[1].trim();
        hand.collected[who] = (hand.collected[who] || 0) + numCp(m[2]);
        continue;
      }
      if (/^(.+?): (?:mucks|doesn't show)/i.test(ln)) continue;
      if ((m = ln.match(/^(.+?): shows \[(.+?)\]/i))) {
        hand.shows[m[1].trim()] = cardsFrom(m[2]);
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(new RegExp('^Total pot\\s+' + CUR + '([\\d.,]+)(?:\\s*\\|\\s*Rake\\s+' + CUR + '([\\d.,]+))?', 'i')))) {
          hand.potTotal = numCp(m[1]);
          if (m[2] != null) hand.rake = numCp(m[2]);
          continue;
        }
        if ((m = ln.match(/^Board\s*\[(.+?)\]/i))) {
          const b = cardsFrom(m[1]);
          if (b.length >= 3 && !hand.board.flop.length) hand.board.flop = b.slice(0, 3);
          if (b.length >= 4 && !hand.board.turn.length) hand.board.turn = [b[3]];
          if (b.length >= 5 && !hand.board.river.length) hand.board.river = [b[4]];
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) showed \[([^\]]+)\](?: and (?:won|collected) \(((?:[€$£₮])?)([\d.,]+)\))?/i))) {
          const who = m[1].trim();
          hand.shows[who] = hand.shows[who] || cardsFrom(m[2]);
          if (m[4] != null) hand.collected[who] = Math.max(hand.collected[who] || 0, numCp(m[4]));
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:won|collected) \(((?:[€$£₮])?)([\d.,]+)\)/i))) {
          const who = m[1].trim();
          hand.collected[who] = Math.max(hand.collected[who] || 0, numCp(m[3]));
          continue;
        }
        continue;
      }

      if (street === 'preflop' || street === 'flop' || street === 'turn' || street === 'river') {
        let act = parseAction(ln);
        if (act && act.type === 'allin') {
          act = convertAllin(act.player, act.amount, streetPut, toMatch);
        }
        if (act) {
          applyStreetAct(act, streetPut);
          if (act.type === 'bet') toMatch = act.amount;
          else if (act.type === 'raise') toMatch = act.to;
          hand.streets[street].push(act);
        }
      }
    }

    if (!hand.isTournament && !/Tournament/i.test(headerText)) {
      hand.isCash = true;
      hand.isTournament = false;
      if (hand.currency === '₮' && !/[₮]/.test(headerText)) hand.currency = '$';
    }

    hand.boardAll = [].concat(hand.board.flop || [], hand.board.turn || [], hand.board.river || []);
    if (!hand.bb && hand.blinds.bb && hand.posts[hand.blinds.bb]) {
      const ante = hand.ante || 0;
      hand.bb = Math.max(0, (hand.posts[hand.blinds.bb] || 0) - ante);
    }
    if (!hand.sb && hand.blinds.sb && hand.posts[hand.blinds.sb]) {
      const ante = hand.ante || 0;
      hand.sb = Math.max(0, (hand.posts[hand.blinds.sb] || 0) - ante);
    }
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
      fileName: fileName || 'coinpoker.txt',
      hero,
      heroCandidates,
      hands,
      discardedByReason,
      format: {
        platform: 'coinpoker',
        platformLabel: 'CoinPoker',
        locale: 'en',
        localeLabel: 'English'
      }
    };
  }

  function detect(text) {
    return countHandBlocks(text);
  }

  function describe(text) {
    const blocks = countHandBlocks(text);
    if (!blocks) return null;
    return {
      platform: 'coinpoker',
      platformLabel: 'CoinPoker',
      locale: 'en',
      localeLabel: 'English',
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'coinpoker',
    name: 'CoinPoker',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand
  });

  global.PTCoinPokerParser = { parseSession, parseHand, describe, num: numCp };
})(window);
