/*
 * parsers/pokerstars.js — Parser PokerStars Cash NL (español e inglés).
 */
(function (global) {
  'use strict';

  const U = global.PTHHUtils;
  const Formats = global.PTHandHistoryFormats;
  if (!U || !Formats) return;

  const num = U.num;
  const cardsFrom = U.cardsFrom;
  const assignPositions = U.assignPositions;

  const LOCALES = {
    es: {
      id: 'es',
      label: 'Español',
      blockSplit: /(?=^Mano n\.º )/m,
      blockTest: /^Mano n\.º/,
      heroDealtRe: /^Repartidas a /m,
      skipActionNoise: /pone la ciega|se retira|pasa|iguala|apuesta|sube|muestra|descarta/
    },
    en: {
      id: 'en',
      label: 'English',
      blockSplit: /(?=^PokerStars (?:Zoom )?Hand #)/m,
      blockTest: /^PokerStars (?:Zoom )?Hand #/,
      heroDealtRe: /^Dealt to /m,
      skipActionNoise: /posts small blind|posts big blind|folds|checks|calls|bets|raises|shows|collected/
    }
  };

  function detectLocale(text) {
    const es = (text.match(/^Mano n\.º /gm) || []).length;
    const en = (text.match(/^PokerStars (?:Zoom )?Hand #/gm) || []).length;
    if (en > es && en >= 1) return 'en';
    if (es >= 1) return 'es';
    if (en >= 1) return 'en';
    return null;
  }

  function parseAction(ln, locale) {
    let m;
    if (locale === 'en') {
      if ((m = ln.match(/^(.+?): folds/))) return { player: m[1], type: 'fold' };
      if ((m = ln.match(/^(.+?): checks/))) return { player: m[1], type: 'check' };
      if ((m = ln.match(/^(.+?): calls ([€$£]?)([\d.,]+)/))) {
        return { player: m[1], type: 'call', amount: num(m[3]), allin: /all-in/i.test(ln) };
      }
      if ((m = ln.match(/^(.+?): bets ([€$£]?)([\d.,]+)/))) {
        return { player: m[1], type: 'bet', amount: num(m[3]), allin: /all-in/i.test(ln) };
      }
      if ((m = ln.match(/^(.+?): raises ([€$£]?)([\d.,]+) to ([€$£]?)([\d.,]+)/))) {
        return {
          player: m[1], type: 'raise', amount: num(m[3]), to: num(m[5]),
          allin: /all-in/i.test(ln)
        };
      }
      return null;
    }
    if ((m = ln.match(/^(.+?): se retira/))) return { player: m[1], type: 'fold' };
    if ((m = ln.match(/^(.+?): pasa/))) return { player: m[1], type: 'check' };
    if ((m = ln.match(/^(.+?): iguala ([\d.,]+)/))) {
      return { player: m[1], type: 'call', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): apuesta ([\d.,]+)/))) {
      return { player: m[1], type: 'bet', amount: num(m[2]), allin: /all-in/i.test(ln) };
    }
    if ((m = ln.match(/^(.+?): sube ([\d.,]+)\s*€? a ([\d.,]+)/))) {
      return { player: m[1], type: 'raise', amount: num(m[2]), to: num(m[3]), allin: /all-in/i.test(ln) };
    }
    return null;
  }

  function parseHand(block, locale) {
    locale = locale || detectLocale(block) || 'es';
    const lines = block.split(/\r?\n/);
    const hand = {
      id: null, datetime: null, sb: 0, bb: 0, currency: '€',
      buttonSeat: null, seats: [], hero: null, heroCards: [],
      blinds: { sb: null, bb: null }, posts: {},
      streets: { preflop: [], flop: [], turn: [], river: [] },
      board: { flop: [], turn: [], river: [] }, boardAll: [],
      shows: {}, collected: {}, uncalledTo: {},
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false,
      platform: 'pokerstars', locale: locale
    };

    let street = 'preheader';
    const L = LOCALES[locale] || LOCALES.es;

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      if (/^Dealer:|has timed out|disconnected|will be allowed|is sitting out|joins the table|leaves the table/i.test(ln)) continue;
      if (/^[^*].* says?:/i.test(ln) && !L.skipActionNoise.test(ln)) continue;
      if (/^Table '/i.test(ln) && !/Seat #\d+ is the button/i.test(ln)) continue;

      let m;

      if (locale === 'en') {
        if ((m = ln.match(/^PokerStars(?: Zoom)? Hand #(\d+):\s+(.+)/))) {
          hand.id = m[1];
          hand.isTournament = /Tournament #/i.test(ln);
          const bl = ln.match(/Hold'em No Limit \(([€$£]?)([\d.,]+)\/([€$£]?)([\d.,]+)\)/);
          if (bl) {
            hand.sb = num(bl[2]);
            hand.bb = num(bl[4]);
            hand.currency = bl[1] || bl[3] || '€';
            hand.isCash = !hand.isTournament;
          }
          const dt = ln.match(/-\s*(\d{4}\/\d{2}\/\d{2} \d{1,2}:\d{2}:\d{2})/);
          if (dt) hand.datetime = dt[1];
          continue;
        }
        if ((m = ln.match(/Seat #(\d+) is the button/))) { hand.buttonSeat = +m[1]; continue; }
        if ((m = ln.match(/^Seat (\d+):\s*(.+?)\s*\((?:[€$£])?([\d.,]+) in chips\)/))) {
          hand.seats.push({ seat: +m[1], name: m[2], stack: num(m[3]) });
          continue;
        }
        if ((m = ln.match(/^(.+?): posts small blind ([€$£]?)([\d.,]+)/))) {
          hand.blinds.sb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]); continue;
        }
        if ((m = ln.match(/^(.+?): posts big blind ([€$£]?)([\d.,]+)/))) {
          hand.blinds.bb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[3]); continue;
        }
        if (/^\*\*\* HOLE CARDS \*\*\*/.test(ln)) { street = 'preflop'; continue; }
        if ((m = ln.match(/^Dealt to (.+?) \[(.+?)\]/))) {
          hand.hero = m[1]; hand.heroCards = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) { street = 'flop'; hand.board.flop = cardsFrom(m[1]); continue; }
        if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'turn'; hand.board.turn = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'river'; hand.board.river = cardsFrom(m[2]); continue;
        }
        if (/^\*\*\* (SHOW DOWN|SUMMARY)/.test(ln)) {
          street = /SUMMARY/.test(ln) ? 'summary' : 'showdown'; continue;
        }
        if ((m = ln.match(/^Uncalled bet \(([€$£]?)([\d.,]+)\) returned to (.+)/))) {
          hand.uncalledTo[m[3]] = num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?) collected ([€$£]?)([\d.,]+) from pot/))) {
          hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[3])); continue;
        }
        if ((m = ln.match(/^(.+?): shows \[(.+?)\]/))) { hand.shows[m[1]] = cardsFrom(m[2]); continue; }
        if ((m = ln.match(/^Total pot ([€$£]?)([\d.,]+)\s*\|\s*Rake ([€$£]?)([\d.,]+)/))) {
          hand.potTotal = num(m[2]); hand.rake = num(m[4]); continue;
        }
        if (street === 'summary') {
          if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?showed \[(.+?)\]/))) {
            hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]); continue;
          }
          if ((m = ln.match(/^Seat \d+: (.+?) (?:\(.*?\) )?collected \(([€$£]?)([\d.,]+)/))) {
            hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[4])); continue;
          }
          continue;
        }
      } else {
        if ((m = ln.match(/^Mano n\.º\s*(\d+)\s*de (.+?):\s*(.*)/))) {
          hand.id = m[1];
          hand.isTournament = /Torneo/.test(ln);
          const bl = ln.match(/Hold'em No Limit \(([\d.,]+)\s*€\/([\d.,]+)\s*€\)/);
          if (bl) { hand.sb = num(bl[1]); hand.bb = num(bl[2]); hand.isCash = !hand.isTournament; }
          const dt = ln.match(/-\s*(\d{2}-\d{2}-\d{4} \d{1,2}:\d{2}:\d{2})/);
          if (dt) hand.datetime = dt[1];
          continue;
        }
        if ((m = ln.match(/El asiento n\.º (\d+) es el botón/))) { hand.buttonSeat = +m[1]; continue; }
        if ((m = ln.match(/^Asiento (\d+):\s*(.+?)\s*\(([\d.,]+)\s*€?\s*en fichas\)/))) {
          hand.seats.push({ seat: +m[1], name: m[2], stack: num(m[3]) }); continue;
        }
        if ((m = ln.match(/^(.+?): pone la ciega pequeña ([\d.,]+)/))) {
          hand.blinds.sb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?): pone la ciega grande ([\d.,]+)/))) {
          hand.blinds.bb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if ((m = ln.match(/^(.+?): pone las ciegas pequeña y grande ([\d.,]+)/))) {
          hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue;
        }
        if (/^\*\*\* CARTAS DE MANO \*\*\*/.test(ln)) { street = 'preflop'; continue; }
        if ((m = ln.match(/^Repartidas a (.+?) \[(.+?)\]/))) {
          hand.hero = m[1]; hand.heroCards = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) { street = 'flop'; hand.board.flop = cardsFrom(m[1]); continue; }
        if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'turn'; hand.board.turn = cardsFrom(m[2]); continue;
        }
        if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\] \[(.+?)\]/))) {
          street = 'river'; hand.board.river = cardsFrom(m[2]); continue;
        }
        if (/^\*\*\* (MOSTRAR|SHOW DOWN|REPARTO|TERCERA|SEGUNDA)/.test(ln)) {
          street = 'showdown'; continue;
        }
        if (/^\*\*\* RESUMEN \*\*\*/.test(ln)) { street = 'summary'; continue; }
        if ((m = ln.match(/^La apuesta no igualada \(([\d.,]+)\s*€?\) ha sido devuelta a (.+)/))) {
          hand.uncalledTo[m[2]] = num(m[1]); continue;
        }
        if ((m = ln.match(/^(.+?) se lleva ([\d.,]+)\s*€? del bote/))) {
          hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue;
        }
        if ((m = ln.match(/^(.+?): muestra \[(.+?)\]/))) { hand.shows[m[1]] = cardsFrom(m[2]); continue; }
        if ((m = ln.match(/^Bote total ([\d.,]+)\s*€?\s*\|\s*Comisión ([\d.,]+)/))) {
          hand.potTotal = num(m[1]); hand.rake = num(m[2]); continue;
        }
        if (street === 'summary') {
          if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?(?:mostró|muestra) \[(.+?)\] y (ganó|perdió|empató)(?:\s*\(([\d.,]+))?/))) {
            hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]);
            if (m[4]) hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[4]));
            continue;
          }
          if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?recaudó \(([\d.,]+)/))) {
            hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue;
          }
          continue;
        }
      }

      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln, locale);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    if (hand.isCash && hand.buttonSeat != null && hand.seats.length) assignPositions(hand);
    return hand;
  }

  function parseSession(text, fileName, locale) {
    locale = locale || detectLocale(text) || 'es';
    const L = LOCALES[locale] || LOCALES.es;
    const blocks = text.split(L.blockSplit).filter((b) => L.blockTest.test(b.trim()));
    const hands = [];
    const heroCount = {};
    for (let i = 0; i < blocks.length; i++) {
      try {
        const h = parseHand(blocks[i], locale);
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
      fileName: fileName || 'sesion.txt',
      hero,
      hands,
      format: {
        platform: 'pokerstars',
        platformLabel: 'PokerStars',
        locale: locale,
        localeLabel: L.label
      }
    };
  }

  function countHandBlocks(text, locale) {
    if (locale === 'en') return (text.match(/^PokerStars (?:Zoom )?Hand #/gm) || []).length;
    return (text.match(/^Mano n\.º /gm) || []).length;
  }

  function detect(text) {
    const locale = detectLocale(text);
    if (!locale) return 0;
    return countHandBlocks(text, locale);
  }

  function describe(text) {
    const locale = detectLocale(text);
    if (!locale) return null;
    const L = LOCALES[locale];
    const blocks = countHandBlocks(text, locale);
    return {
      platform: 'pokerstars',
      platformLabel: 'PokerStars',
      locale: locale,
      localeLabel: L.label,
      handBlocks: blocks
    };
  }

  Formats.register({
    id: 'pokerstars',
    name: 'PokerStars',
    detect: detect,
    describe: describe,
    parseSession: parseSession,
    parseHand: parseHand,
    detectLocale: detectLocale
  });

  global.PTPokerStarsParser = { parseSession, parseHand, detectLocale, describe };
})(window);
