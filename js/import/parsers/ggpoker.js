/*
 * parsers/ggpoker.js — Parser GGPoker / Natural8 Cash NL (historial PokerCraft .txt).
 * Formato cercano a PokerStars EN, pero cabecera "Poker Hand #" (sin "PokerStars")
 * y secciones "*** HOLE CARDS ***" / "*** SHOWDOWN ***".
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const assignPositions = U.assignPositions;

  const BLOCK_SPLIT = /(?=^Poker Hand #)/m;
  const BLOCK_TEST = /^Poker Hand #/;
  /** Evita colisión con PokerStars EN ("PokerStars Hand #"). */
  const GG_HAND_RE = /^Poker Hand #([A-Z]{0,2}\d+)/gm;
  const PS_HAND_RE = /^PokerStars (?:Zoom )?Hand #/gm;

  function countHandBlocks(text) {
    if (!text) return 0;
    const gg = (text.match(GG_HAND_RE) || []).length;
    if (!gg) return 0;
    const ps = (text.match(PS_HAND_RE) || []).length;
    // Si el fichero es PokerStars, no puntuar como GG.
    if (ps > 0 && /PokerStars/i.test(text.slice(0, 400))) return 0;
    return gg;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?): folds/))) return { player: m[1].trim(), type: 'fold' };
    if ((m = ln.match(/^(.+?): checks/))) return { player: m[1].trim(), type: 'check' };
    if ((m = ln.match(/^(.+?): calls ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'call', amount: num(m[3]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): bets ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return { player: m[1].trim(), type: 'bet', amount: num(m[3]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): raises ((?:[€$£]|â‚¬)?)([\d.,]+) to ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
      return {
        player: m[1].trim(), type: 'raise', amount: num(m[3]), to: num(m[5]),
        allin: /all-in/i.test(ln)
      };
    }
    return null;
  }

  function parseHand(block) {
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '$',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'ggpoker', locale: 'en'
    };

    let street = 'preheader';

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;

      // Cash: Poker Hand #HD123: Hold'em No Limit ($0.05/$0.10) - 2024/...
      // MTT:  Poker Hand #TM123: Tournament #..., Hold'em No Limit - Level2 (60/120) - ...
      if ((m = ln.match(/^Poker Hand #([A-Z]{0,2}\d+):\s*(.+)$/))) {
        hand.id = m[1];
        const rest = m[2];
        hand.isTournament = /Tournament\s*#/i.test(rest) || /^TM/i.test(m[1]);
        hand.isCash = !hand.isTournament;

        const cashStakes = rest.match(/Hold'?em\s+No\s+Limit\s+\(((?:[€$£]|â‚¬)?)([\d.,]+)\/((?:[€$£]|â‚¬)?)([\d.,]+)\)/i);
        if (cashStakes) {
          hand.currency = cashStakes[1] === '€' || cashStakes[1] === 'â‚¬' ? '€'
            : (cashStakes[1] === '£' ? '£' : '$');
          hand.sb = num(cashStakes[2]);
          hand.bb = num(cashStakes[4]);
          hand.isCash = true;
          hand.isTournament = false;
        }

        const dt = rest.match(/-\s+(\d{4}\/\d{2}\/\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?)/);
        if (dt) hand.datetime = dt[1].trim();
        continue;
      }

      if ((m = ln.match(/^Table\s+'[^']*'\s+(?:\d+-max\s+)?Seat\s+#(\d+)\s+is the button/i))) {
        hand.buttonSeat = +m[1];
        continue;
      }
      if ((m = ln.match(/^Table\s+.+\s+Seat\s+#(\d+)\s+is the button/i))) {
        hand.buttonSeat = +m[1];
        continue;
      }

      if ((m = ln.match(/^Seat\s+(\d+):\s*(.+?)\s*\(((?:[€$£]|â‚¬)?)([\d.,]+)\s+in chips/i))) {
        const cur = m[3];
        if (cur === '€' || cur === 'â‚¬') hand.currency = '€';
        else if (cur === '£') hand.currency = '£';
        else if (cur === '$') hand.currency = '$';
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[4]) });
        continue;
      }

      if ((m = ln.match(/^(.+?): posts small blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        hand.blinds.sb = m[1].trim();
        hand.posts[m[1].trim()] = (hand.posts[m[1].trim()] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): posts big blind ((?:[€$£]|â‚¬)?)([\d.,]+)/))) {
        hand.blinds.bb = m[1].trim();
        hand.posts[m[1].trim()] = (hand.posts[m[1].trim()] || 0) + num(m[3]);
        continue;
      }
      if (/^(.+?): posts the ante /i.test(ln) || /^(.+?): straddle /i.test(ln)) continue;

      if (/^\*\*\* HOLE CARDS \*\*\*/i.test(ln) || /^\*\*\* PRE-FLOP \*\*\*/i.test(ln)) {
        street = 'preflop';
        continue;
      }
      if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
        // Solo la primera "Dealt to X [cards]" con cartas cuenta como héroe.
        if (!hand.hero && m[2] && m[2].trim()) {
          hand.hero = m[1].trim();
          hand.heroCards = cardsFrom(m[2]);
        }
        continue;
      }
      // Líneas "Dealt to Opp" sin cartas (GG a menudo las incluye vacías)
      if (/^Dealt to /i.test(ln)) continue;

      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/i))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[2]);
        if (!hand.board.flop.length) hand.board.flop = cardsFrom(m[1]).slice(0, 3);
        continue;
      }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\]\s*\[(.+?)\]/i))) {
        street = 'river';
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

      if ((m = ln.match(/^Uncalled bet \(((?:[€$£]|â‚¬)?)([\d.,]+)\) returned to (.+)$/i))) {
        hand.uncalledTo[m[3].trim()] = (hand.uncalledTo[m[3].trim()] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) collected ((?:[€$£]|â‚¬)?)([\d.,]+) from (?:main )?pot/i))) {
        const who = m[1].trim();
        hand.collected[who] = (hand.collected[who] || 0) + num(m[3]);
        continue;
      }
      if ((m = ln.match(/^(.+?): shows \[(.+?)\]/))) {
        hand.shows[m[1].trim()] = cardsFrom(m[2]);
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^Total pot ((?:[€$£]|â‚¬)?)([\d.,]+)(?:\s*\|\s*Rake ((?:[€$£]|â‚¬)?)([\d.,]+))?/i))) {
          hand.potTotal = num(m[2]);
          if (m[4] != null) hand.rake = num(m[4]);
          continue;
        }
        if ((m = ln.match(/^Board\s*\[(.+?)\]/i))) {
          const b = cardsFrom(m[1]);
          if (b.length >= 3 && !hand.board.flop.length) hand.board.flop = b.slice(0, 3);
          if (b.length >= 4 && !hand.board.turn.length) hand.board.turn = [b[3]];
          if (b.length >= 5 && !hand.board.river.length) hand.board.river = [b[4]];
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?showed \[([^\]]+)\](?: and (?:won|collected) \(((?:[€$£]|â‚¬)?)([\d.,]+)\))?/i))) {
          const who = m[1].trim();
          hand.shows[who] = hand.shows[who] || cardsFrom(m[2]);
          if (m[4] != null) hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[4]));
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\([^)]*\) )?(?:won|collected) \(((?:[€$£]|â‚¬)?)([\d.,]+)\)/i))) {
          const who = m[1].trim();
          hand.collected[who] = Math.max(hand.collected[who] || 0, num(m[3]));
          continue;
        }
        continue;
      }

      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    if (hand.isCash && hand.buttonSeat != null && hand.seats.length) assignPositions(hand);
    return hand;
  }

  function parseSession(text, fileName) {
    const blocks = text.split(BLOCK_SPLIT).filter((b) => BLOCK_TEST.test(b.trim()));
    const hands = [];
    const heroCount = {};
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i]);
        if (!h || !h.isCash) continue;
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { /* mano malformada */ }
    }
    let hero = null;
    let best = -1;
    for (const n in heroCount) {
      if (heroCount[n] > best) { best = heroCount[n]; hero = n; }
    }
    return {
      fileName: fileName || 'ggpoker.txt',
      hero,
      hands,
      format: {
        platform: 'ggpoker',
        platformLabel: 'GGPoker',
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
      platform: 'ggpoker',
      platformLabel: 'GGPoker',
      locale: 'en',
      localeLabel: 'English',
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'ggpoker',
    name: 'GGPoker',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand
  });

  global.PTGGPokerParser = { parseSession, parseHand, describe };
})(window);
