/*
 * parsers/winamax.js — Parser Winamax Cash NL (historial .txt exportado).
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const assignPositions = U.assignPositions;

  const BLOCK_SPLIT = /(?=^Winamax Poker - )/m;
  const BLOCK_TEST = /^Winamax Poker - /;

  function countHandBlocks(text) {
    return (text.match(/^Winamax Poker - /gm) || []).length;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?): folds/))) return { player: m[1], type: 'fold' };
    if ((m = ln.match(/^(.+?): checks/))) return { player: m[1], type: 'check' };
    if ((m = ln.match(/^(.+?): calls ([\d.,]+)€?/))) {
      return { player: m[1], type: 'call', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): bets ([\d.,]+)€?/))) {
      return { player: m[1], type: 'bet', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): raises ([\d.,]+)€? to ([\d.,]+)€?/))) {
      return {
        player: m[1], type: 'raise', amount: num(m[2]), to: num(m[3]),
        allin: /all-in/i.test(ln)
      };
    }
    return null;
  }

  function parseHand(block) {
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '€',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'winamax', locale: 'en'
    };

    let street = 'preheader';

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;

      if ((m = ln.match(/^Winamax Poker - .+ - HandId: #([\d-]+) - Holdem no limit \(([\d.,]+)€\/([\d.,]+)€\) - (.+)/i))) {
        hand.id = (m[1].split('-').pop() || m[1]);
        hand.sb = num(m[2]);
        hand.bb = num(m[3]);
        hand.datetime = m[4].replace(' UTC', '').trim();
        hand.isTournament = /tournament/i.test(ln);
        hand.isCash = !hand.isTournament;
        continue;
      }

      if ((m = ln.match(/^Table: .+ Seat #(\d+) is the button/))) {
        hand.buttonSeat = +m[1];
        if (/real money/i.test(ln)) hand.isCash = true;
        continue;
      }

      if ((m = ln.match(/^Seat (\d+):\s*(.+?)\s*\(([\d.,]+)€\)/))) {
        hand.seats.push({ seat: +m[1], name: m[2].trim(), stack: num(m[3]) });
        continue;
      }

      if (/^\*\*\* ANTE\/BLINDS \*\*\*/.test(ln)) { street = 'preflop'; continue; }

      if ((m = ln.match(/^(.+?) posts small blind ([\d.,]+)€?/))) {
        hand.blinds.sb = m[1];
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        continue;
      }
      if ((m = ln.match(/^(.+?) posts big blind ([\d.,]+)€?/))) {
        hand.blinds.bb = m[1];
        hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]);
        continue;
      }

      if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
        hand.hero = m[1];
        hand.heroCards = cardsFrom(m[2]);
        continue;
      }

      if (/^\*\*\* PRE-FLOP \*\*\*/.test(ln)) { street = 'preflop'; continue; }
      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) {
        street = 'flop';
        hand.board.flop = cardsFrom(m[1]);
        continue;
      }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\]\[(.+?)\]/))) {
        street = 'turn';
        hand.board.turn = cardsFrom(m[2]);
        if (!hand.board.flop.length) hand.board.flop = cardsFrom(m[1]).slice(0, 3);
        continue;
      }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\]\[(.+?)\]/))) {
        street = 'river';
        hand.board.river = cardsFrom(m[2]);
        continue;
      }
      if (/^\*\*\* SHOW DOWN \*\*\*/.test(ln)) { street = 'showdown'; continue; }
      if (/^\*\*\* SUMMARY \*\*\*/.test(ln)) { street = 'summary'; continue; }

      if ((m = ln.match(/^(.+?) collected ([\d.,]+)€? from pot/))) {
        hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2]));
        continue;
      }
      if ((m = ln.match(/^(.+?): shows \[(.+?)\]/))) {
        hand.shows[m[1]] = cardsFrom(m[2]);
        continue;
      }

      if (street === 'summary') {
        if ((m = ln.match(/^Total pot ([\d.,]+)€?(?:\s*\|\s*(?:Rake ([\d.,]+)€?|No rake))?/))) {
          hand.potTotal = num(m[1]);
          if (m[2]) hand.rake = num(m[2]);
          continue;
        }
        if ((m = ln.match(/^Board: \[(.+?)\]/))) {
          const b = cardsFrom(m[1]);
          if (b.length >= 3 && !hand.board.flop.length) hand.board.flop = b.slice(0, 3);
          if (b.length >= 4 && !hand.board.turn.length) hand.board.turn = [b[3]];
          if (b.length >= 5 && !hand.board.river.length) hand.board.river = [b[4]];
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?showed \[(.+?)\]/))) {
          hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]);
          continue;
        }
        if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?won ([\d.,]+)€?/))) {
          hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2]));
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
      fileName: fileName || 'winamax.txt',
      hero,
      hands,
      format: {
        platform: 'winamax',
        platformLabel: 'Winamax',
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
      platform: 'winamax',
      platformLabel: 'Winamax',
      locale: 'en',
      localeLabel: 'English',
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'winamax',
    name: 'Winamax',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand
  });

  global.PTWinamaxParser = { parseSession, parseHand, describe };
})(window);
