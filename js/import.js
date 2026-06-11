/*
 * import.js
 * Importa y analiza historiales de manos exportados de PokerStars (español).
 * - Parsea cada mano (asientos, posiciones, acciones, board, resultado).
 * - Filtra cash NL Hold'em (descarta torneos).
 * - Descarta manos donde el héroe foldea preflop sin acción voluntaria.
 * - Clasifica cada decisión del héroe contra GTO (aprox.) y estima EV perdido.
 * - Calcula estadísticas de sesión y una nota final.
 * Expuesto como `Importer`.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const R = global.Ranges;
  const E = global.Engine;
  const GTO = global.GTO;
  const D = global.GTORangesData;

  // ---------- utilidades numéricas ----------
  function num(s) {
    if (s == null) return 0;
    s = String(s).trim().replace(/\s|€/g, '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  function cardsFrom(str) { // "[2s 2d]" o "2s 2d" -> ['2s','2d']
    const m = str.match(/[2-9TJQKA AKQJT][shdc]/g) || str.match(/(?:10|[2-9TJQKA])[shdc]/g);
    if (!m) return [];
    return m.map((c) => c.replace('10', 'T'));
  }

  // ---------- PARSER ----------
  function parseSession(text, fileName) {
    const blocks = text.split(/(?=^Mano n\.º )/m).filter((b) => /^Mano n\.º/.test(b.trim()));
    const hands = [];
    const heroCount = {};
    for (const block of blocks) {
      try {
        const h = parseHand(block);
        if (!h || !h.isCash) continue;
        if (h.hero) heroCount[h.hero] = (heroCount[h.hero] || 0) + 1;
        hands.push(h);
      } catch (e) { /* mano malformada: ignorar */ }
    }
    // héroe = nombre más frecuente en "Repartidas a"
    let hero = null, best = -1;
    for (const n in heroCount) if (heroCount[n] > best) { best = heroCount[n]; hero = n; }
    return { fileName: fileName || 'sesion.txt', hero, hands };
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
      rake: 0, potTotal: 0, positions: {}, isCash: false, isTournament: false
    };

    let street = 'preheader';
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;

      let m;
      if ((m = ln.match(/^Mano n\.º\s*(\d+)\s*de (.+?):\s*(.*)/))) {
        hand.id = m[1];
        const rest = m[3] || m[2];
        hand.isTournament = /Torneo/.test(ln);
        const bl = ln.match(/Hold'em No Limit \(([\d.,]+)\s*€\/([\d.,]+)\s*€\)/);
        if (bl) { hand.sb = num(bl[1]); hand.bb = num(bl[2]); hand.isCash = !hand.isTournament; }
        const dt = ln.match(/-\s*(\d{2}-\d{2}-\d{4} \d{1,2}:\d{2}:\d{2})/);
        if (dt) hand.datetime = dt[1];
        continue;
      }
      if ((m = ln.match(/El asiento n\.º (\d+) es el botón/))) { hand.buttonSeat = +m[1]; continue; }
      if ((m = ln.match(/^Asiento (\d+):\s*(.+?)\s*\(([\d.,]+)\s*€?\s*en fichas\)/))) {
        hand.seats.push({ seat: +m[1], name: m[2], stack: num(m[3]) });
        continue;
      }
      if ((m = ln.match(/^(.+?): pone la ciega pequeña ([\d.,]+)/))) { hand.blinds.sb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue; }
      if ((m = ln.match(/^(.+?): pone la ciega grande ([\d.,]+)/))) { hand.blinds.bb = m[1]; hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue; }
      if ((m = ln.match(/^(.+?): pone las ciegas pequeña y grande ([\d.,]+)/))) { hand.posts[m[1]] = (hand.posts[m[1]] || 0) + num(m[2]); continue; }
      if (/^\*\*\* CARTAS DE MANO \*\*\*/.test(ln)) { street = 'preflop'; continue; }
      if ((m = ln.match(/^Repartidas a (.+?) \[(.+?)\]/))) { hand.hero = m[1]; hand.heroCards = cardsFrom(m[2]); continue; }

      if ((m = ln.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/))) { street = 'flop'; hand.board.flop = cardsFrom(m[1]); continue; }
      if ((m = ln.match(/^\*\*\* TURN \*\*\* \[(.+?)\] \[(.+?)\]/))) { street = 'turn'; hand.board.turn = cardsFrom(m[2]); continue; }
      if ((m = ln.match(/^\*\*\* RIVER \*\*\* \[(.+?)\] \[(.+?)\]/))) { street = 'river'; hand.board.river = cardsFrom(m[2]); continue; }
      if (/^\*\*\* (MOSTRAR|SHOW DOWN|REPARTO|TERCERA|SEGUNDA)/.test(ln)) { street = 'showdown'; continue; }
      if (/^\*\*\* RESUMEN \*\*\*/.test(ln)) { street = 'summary'; continue; }

      // resultado / showdown
      if ((m = ln.match(/^La apuesta no igualada \(([\d.,]+)\s*€?\) ha sido devuelta a (.+)/))) { hand.uncalledTo[m[2]] = num(m[1]); continue; }
      if ((m = ln.match(/^(.+?) se lleva ([\d.,]+)\s*€? del bote/))) { hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue; }
      if ((m = ln.match(/^(.+?): muestra \[(.+?)\]/))) { hand.shows[m[1]] = cardsFrom(m[2]); continue; }
      if ((m = ln.match(/^Bote total ([\d.,]+)\s*€?\s*\|\s*Comisión ([\d.,]+)/))) { hand.potTotal = num(m[1]); hand.rake = num(m[2]); continue; }

      if (street === 'summary') {
        if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?(?:mostró|muestra) \[(.+?)\] y (ganó|perdió|empató)(?:\s*\(([\d.,]+))?/))) {
          hand.shows[m[1]] = hand.shows[m[1]] || cardsFrom(m[2]);
          if (m[4]) hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[4]));
          continue;
        }
        if ((m = ln.match(/^Asiento \d+: (.+?) (?:\(.*?\) )?recaudó \(([\d.,]+)/))) { hand.collected[m[1]] = Math.max(hand.collected[m[1]] || 0, num(m[2])); continue; }
        continue;
      }

      // acciones en una calle
      if (['preflop', 'flop', 'turn', 'river'].includes(street)) {
        const act = parseAction(ln);
        if (act) hand.streets[street].push(act);
      }
    }

    hand.boardAll = hand.board.flop.concat(hand.board.turn, hand.board.river);
    if (hand.isCash && hand.buttonSeat != null && hand.seats.length) assignPositions(hand);
    return hand;
  }

  function parseAction(ln) {
    let m;
    if ((m = ln.match(/^(.+?): se retira/))) return { player: m[1], type: 'fold' };
    if ((m = ln.match(/^(.+?): pasa/))) return { player: m[1], type: 'check' };
    if ((m = ln.match(/^(.+?): iguala ([\d.,]+)/))) return { player: m[1], type: 'call', amount: num(m[2]), allin: /all-in/.test(ln) };
    if ((m = ln.match(/^(.+?): apuesta ([\d.,]+)/))) return { player: m[1], type: 'bet', amount: num(m[2]), allin: /all-in/.test(ln) };
    if ((m = ln.match(/^(.+?): sube ([\d.,]+)\s*€? a ([\d.,]+)/))) return { player: m[1], type: 'raise', amount: num(m[2]), to: num(m[3]), allin: /all-in/.test(ln) };
    return null;
  }

  const LABELS_FROM_MID = ['CO', 'HJ', 'UTG', 'UTG1', 'UTG2'];
  function assignPositions(hand) {
    const sorted = hand.seats.slice().sort((a, b) => a.seat - b.seat);
    const n = sorted.length;
    const btnIdx = sorted.findIndex((s) => s.seat === hand.buttonSeat);
    if (btnIdx < 0) return;
    // orden de asientos en sentido horario empezando por el botón
    const order = [];
    for (let i = 0; i < n; i++) order.push(sorted[(btnIdx + i) % n]);
    const pos = hand.positions;
    if (n === 2) { pos[order[0].name] = 'SB'; pos[order[1].name] = 'BB'; return; }
    pos[order[0].name] = 'BTN';
    pos[order[1].name] = 'SB';
    pos[order[2].name] = 'BB';
    const middle = order.slice(3); // entre BB y BTN (UTG..CO)
    for (let i = 0; i < middle.length; i++) {
      pos[middle[middle.length - 1 - i].name] = LABELS_FROM_MID[i] || ('EP' + i);
    }
    // anclar con ciegas reales por si acaso
    if (hand.blinds.sb) pos[hand.blinds.sb] = 'SB';
    if (hand.blinds.bb) pos[hand.blinds.bb] = 'BB';
  }

  // ---------- ¿el héroe jugó la mano? ----------
  function heroPlayed(hand) {
    const hero = hand.hero;
    if (!hero) return false;
    let voluntary = false, sawFlop = hand.board.flop.length > 0 && !heroFoldedPreflop(hand);
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      hand.streets[st].forEach((a) => {
        if (a.player === hero && (a.type === 'call' || a.type === 'raise' || a.type === 'bet')) voluntary = true;
      });
    });
    return voluntary || sawFlop;
  }
  function heroFoldedPreflop(hand) {
    return hand.streets.preflop.some((a) => a.player === hand.hero && a.type === 'fold');
  }

  // ---------- ANALIZADOR GTO (vía evaluateSpot) ----------
  const BROAD_CONTINUE = D.BROAD_CONTINUE;

  function analyzeHand(hand) {
    const hero = hand.hero;
    const heroPos = hand.positions[hero] || '??';
    const heroCards = hand.heroCards;
    const code = heroCards.length === 2 ? R.handCode(heroCards[0], heroCards[1]) : null;
    const bb = hand.bb || 0.05;

    const decisions = [];
    // --- PREFLOP ---
    evalPreflop(hand, hero, heroPos, code, decisions);
    // --- POSTFLOP ---
    ['flop', 'turn', 'river'].forEach((st) => evalStreet(hand, st, hero, heroCards, bb, decisions));

    // EV y acierto
    let totalEvLoss = 0;
    const byStreet = {};
    decisions.forEach((d) => {
      totalEvLoss += d.evLoss;
      byStreet[d.street] = byStreet[d.street] || { n: 0, good: 0 };
      byStreet[d.street].n++;
      if (d.class === 'optima' || d.class === 'aceptable') byStreet[d.street].good++;
    });
    const nGood = decisions.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
    const accuracy = decisions.length ? Math.round((nGood / decisions.length) * 100) : 100;

    const heroNetEuro = heroNet(hand);
    const heroNetBB = bb ? r2(heroNetEuro / bb) : 0;

    let worst = 'optima';
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    decisions.forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });

    return {
      id: hand.id, datetime: hand.datetime,
      heroPos, heroCards, heroCode: code,
      board: hand.boardAll, sb: hand.sb, bb: hand.bb,
      villainShows: hand.shows,
      decisions, totalEvLoss: r2(totalEvLoss),
      accuracy, accuracyByStreet: byStreet,
      heroNetBB, worstClass: worst,
      nDecisions: decisions.length,
      summary: buildHandTimeline(hand)
    };
  }

  function heroNet(hand) {
    const hero = hand.hero;
    let invested = (hand.posts[hero] || 0);
    // suma del último compromiso del héroe en cada calle
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      let committed = (st === 'preflop') ? (hand.posts[hero] || 0) : 0;
      hand.streets[st].forEach((a) => {
        if (a.player !== hero) return;
        if (a.type === 'raise') committed = a.to;
        else if (a.type === 'bet') committed = a.amount;
        else if (a.type === 'call') committed += a.amount;
      });
      if (st !== 'preflop') invested += committed;
      else invested = committed; // preflop ya incluye blinds
    });
    const won = (hand.collected[hero] || 0) + (hand.uncalledTo[hero] || 0);
    return r2(won - invested);
  }

  // Recorre el preflop y evalúa cada decisión voluntaria del héroe.
  // Detecta el tipo de spot: RFI, iso vs limpers, vs open, squeeze,
  // vs 3-bet / vs 4-bet (como abridor) y cold 3-bet+.
  function evalPreflop(hand, hero, heroPos, code, decisions) {
    if (!code) return;
    let raiseCount = 0, lastRaiser = null, potBB = 0, toMatch = hand.bb;
    let limpers = 0, callersAfterRaise = 0, heroHasRaised = false, openRaiser = null;
    const committed = {};
    if (hand.blinds.sb) committed[hand.blinds.sb] = hand.sb;
    if (hand.blinds.bb) committed[hand.blinds.bb] = hand.bb;
    potBB = (hand.sb + hand.bb) / hand.bb;

    for (const a of hand.streets.preflop) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (isHero && (a.type === 'fold' || a.type === 'call' || a.type === 'raise')) {
        let facing;
        if (raiseCount === 0) facing = limpers > 0 ? 'vsLimp' : 'RFI';
        else if (raiseCount === 1) facing = callersAfterRaise > 0 ? 'squeeze' : 'vsRFI';
        else if (heroHasRaised && raiseCount === 2) facing = 'vs3bet';
        else if (heroHasRaised && raiseCount >= 3) facing = 'vs4bet';
        else facing = 'cold3bet';

        const openerPos = (openRaiser ? hand.positions[openRaiser] : (lastRaiser ? hand.positions[lastRaiser] : null));
        const toCallBB = Math.max(0, (toMatch - cur) / hand.bb);
        if (!(facing === 'RFI' && heroPos === 'BB' && a.type === 'fold')) {
          const chosen = a.type === 'raise' ? 'raise' : (a.type === 'call' ? 'call' : 'fold');
          const spotKind = mapFacingToKind(facing);
          const opts = facing === 'RFI' ? ['fold', 'raise'] : ['fold', 'call', 'raise'];
          const vsRfiKey = facing === 'vsRFI' ? heroPos + '_vs_' + openerPos : undefined;
          const evalResult = GTO.evaluateSpot({
            spotKind, position: heroPos, vsPosition: openerPos,
            stackDepth: 100, street: 'preflop', board: [], heroCards: hand.heroCards,
            handCode: code, potBB, toCallBB, chosenAction: chosen,
            vsRfiKey,
            initiative: facing === 'RFI' ? 'none' : 'caller',
            availableActions: opts
          });
          const ev = evalResult.evaluation;
          decisions.push({
            street: 'preflop', spot: spotLabel(facing, heroPos, openerPos),
            spotKind, facing, vsPosition: openerPos, vsRfiKey,
            actionType: a.type, chosen, class: ev.class, best: ev.best,
            gto: evalResult.strategy, evLoss: ev.evLoss, evLossTier: ev.evLossTier,
            actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
            confidence: ev.confidence, score: ev.score, explanation: evalResult.explanation,
            optionBreakdown: evalResult.optionBreakdown,
            potBB: r2(potBB), toCallBB: r2(toCallBB),
            options: opts,
            context: preflopContext(facing, heroPos, openerPos, toCallBB)
          });
        }
      }

      // actualizar estado
      if (a.type === 'raise') {
        raiseCount++; lastRaiser = a.player; if (raiseCount === 1) openRaiser = a.player;
        if (isHero) heroHasRaised = true;
        callersAfterRaise = 0; toMatch = a.to; committed[a.player] = a.to;
      } else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') {
        if (raiseCount === 0) limpers++; else callersAfterRaise++;
        committed[a.player] = toMatch;
      }
      potBB = Object.values(committed).reduce((s, v) => s + v, 0) / hand.bb;
    }
  }

  function mapFacingToKind(facing) {
    const map = { RFI: 'RFI', vsLimp: 'isoLimp', vsRFI: 'vsRFI', squeeze: 'squeeze', vs3bet: 'face3bet', vs4bet: 'face4bet', cold3bet: 'cold3bet' };
    return map[facing] || 'vsRFI';
  }

  function spotLabel(facing, heroPos, openerPos) {
    switch (facing) {
      case 'RFI': return `RFI ${heroPos}`;
      case 'vsLimp': return `${heroPos} iso vs limp`;
      case 'vsRFI': return `${heroPos} vs ${openerPos}`;
      case 'squeeze': return `${heroPos} squeeze vs ${openerPos}`;
      case 'vs3bet': return `${heroPos} abre y afronta 3-bet`;
      case 'vs4bet': return `${heroPos} afronta 4-bet`;
      default: return `${heroPos} vs 3bet+`;
    }
  }

  function preflopContext(facing, heroPos, openerPos, toCallBB) {
    switch (facing) {
      case 'RFI': return `Preflop: eres ${heroPos} y la acción te llega sin subir (RFI).`;
      case 'vsLimp': return `Preflop: eres ${heroPos} con limpers por delante. ¿Aislar (iso-raise), foldear o pagar?`;
      case 'vsRFI': return `Preflop: eres ${heroPos} y ${openerPos} ha abierto. Pagar ${r2(toCallBB)}bb.`;
      case 'squeeze': return `Preflop: eres ${heroPos}, ${openerPos} abre y hay pagador(es). Spot de squeeze. Pagar ${r2(toCallBB)}bb.`;
      case 'vs3bet': return `Preflop: abriste desde ${heroPos} y te hacen 3-bet. ¿Fold, call o 4-bet? Pagar ${r2(toCallBB)}bb.`;
      case 'vs4bet': return `Preflop: te hacen 4-bet. ¿Fold, call o all-in? Pagar ${r2(toCallBB)}bb.`;
      default: return `Preflop: spot de 3-bet en frío o más. Pagar ${r2(toCallBB)}bb.`;
    }
  }

  // Recorre una calle postflop y evalúa cada decisión del héroe
  function evalStreet(hand, st, hero, heroCards, bb, decisions) {
    const acts = hand.streets[st];
    if (!acts.length) return;
    const boardSoFar = boardUpTo(hand, st);
    if (boardSoFar.length < 3 || heroCards.length < 2) return;

    let potBB = priorPotBB(hand, st);
    let toMatch = 0; // apuesta actual de la calle (€)
    const committed = {};

    let heroEquity = null;
    for (const a of acts) {
      const isHero = a.player === hero;
      const cur = committed[a.player] || 0;

      if (isHero && a.type !== 'show') {
        const toCallBB = Math.max(0, (toMatch - cur) / bb);
        const chosen = mapPostflopAction(a.type, toCallBB);
        const opts = toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'];
        const evalResult = GTO.evaluateSpot({
          spotKind: 'postflop', position: hand.positions[hero] || '??',
          stackDepth: 100, street: st, board: boardSoFar, heroCards,
          handCode: R.handCode(heroCards[0], heroCards[1]),
          potBB, toCallBB, chosenAction: chosen === 'bet' ? 'bet_66' : chosen,
          villainRange: BROAD_CONTINUE, initiative: 'caller', inPosition: true,
          availableActions: opts,
          betSizeBB: a.type === 'bet' ? (a.amount / bb) : (a.type === 'raise' ? (a.to / bb) : 0)
        });
        const ev = evalResult.evaluation;
        const info = GTO.Equity.classifyMadeHand(heroCards, boardSoFar);
        if (heroEquity == null) heroEquity = GTO.Equity.equityVsRange(heroCards, boardSoFar, BROAD_CONTINUE, 400);
        decisions.push({
          street: st, spot: `${cap(st)} · ${info.ev.name}`,
          spotKind: 'postflop', facing: 'postflop',
          actionType: a.type, chosen, class: ev.class, best: ev.best,
          gto: evalResult.strategy, evLoss: ev.evLoss, evLossTier: ev.evLossTier,
          actionEV: ev.actionEV, bestEV: ev.bestEV, frequency: ev.frequency,
          confidence: ev.confidence, score: ev.score, explanation: evalResult.explanation,
          optionBreakdown: evalResult.optionBreakdown,
          potBB: r2(potBB), toCallBB: r2(toCallBB),
          options: toCallBB > 0 ? ['fold', 'call', 'raise'] : ['check', 'bet_33', 'bet_66', 'bet_100'],
          heroEquity: Math.round(heroEquity * 100),
          context: `${cap(st)} [${boardSoFar.join(' ')}]: tienes ${info.ev.name}. Bote ${r2(potBB)}bb${toCallBB > 0 ? `, pagar ${r2(toCallBB)}bb` : ''}.`
        });
      }

      if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
      potBB = (priorPotBB(hand, st) * bb + Object.values(committed).reduce((s, v) => s + v, 0)) / bb;
    }
  }

  function mapPostflopAction(type, toCallBB) {
    if (type === 'fold') return 'fold';
    if (type === 'check') return 'check';
    if (type === 'bet') return 'bet';
    if (type === 'raise') return 'raise';
    if (type === 'call') return 'call';
    return type;
  }

  function boardUpTo(hand, st) {
    if (st === 'flop') return hand.board.flop.slice();
    if (st === 'turn') return hand.board.flop.concat(hand.board.turn);
    return hand.board.flop.concat(hand.board.turn, hand.board.river);
  }
  // pot (en bb) acumulado ANTES de empezar la calle st
  function priorPotBB(hand, st) {
    const bb = hand.bb;
    const order = ['preflop', 'flop', 'turn', 'river'];
    const upto = order.slice(0, order.indexOf(st));
    let euro = 0;
    upto.forEach((s) => { euro += streetMoney(hand, s); });
    return euro / bb;
  }
  function streetMoney(hand, st) {
    const committed = {};
    if (st === 'preflop') { Object.keys(hand.posts).forEach((p) => committed[p] = hand.posts[p]); }
    let toMatch = st === 'preflop' ? hand.bb : 0;
    hand.streets[st].forEach((a) => {
      if (a.type === 'raise') { toMatch = a.to; committed[a.player] = a.to; }
      else if (a.type === 'bet') { toMatch = a.amount; committed[a.player] = a.amount; }
      else if (a.type === 'call') { committed[a.player] = toMatch; }
    });
    return Object.values(committed).reduce((s, v) => s + v, 0);
  }

  // Timeline legible de la mano real (para revisión paso a paso)
  function buildHandTimeline(hand) {
    const tl = [];
    const streetBoard = { preflop: [], flop: hand.board.flop, turn: hand.board.flop.concat(hand.board.turn), river: hand.boardAll };
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      if (!hand.streets[st].length && st !== 'preflop') return;
      tl.push({ kind: 'street', street: st, board: streetBoard[st].slice() });
      hand.streets[st].forEach((a) => {
        tl.push({ kind: 'action', street: st, player: a.player, pos: hand.positions[a.player] || '', type: a.type, amount: a.amount, to: a.to, allin: a.allin });
      });
    });
    return tl;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- ESTADÍSTICAS DE SESIÓN ----------
  function buildSession(parsed, fileName) {
    const hero = parsed.hero;
    const kept = [];
    let discarded = 0;
    for (const h of parsed.hands) {
      if (h.hero !== hero) { /* mano de otra mesa/heroe */ }
      if (!heroPlayed(h)) { discarded++; continue; }
      const a = analyzeHand(h);
      kept.push(a);
    }
    const stats = computeStats(kept);
    return {
      id: 's' + Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      fileName: fileName || parsed.fileName,
      hero,
      nTotal: parsed.hands.length,
      nDiscarded: discarded,
      hands: kept,
      stats,
      hasTxt: true,
      rawText: null // se rellena fuera si se quiere conservar
    };
  }

  function computeStats(hands) {
    const n = hands.length;
    let decN = 0, decGood = 0, evLoss = 0, netBB = 0;
    const street = { preflop: { n: 0, good: 0 }, flop: { n: 0, good: 0 }, turn: { n: 0, good: 0 }, river: { n: 0, good: 0 } };
    const dist = { optima: 0, aceptable: 0, imprecisa: 0, error: 0 };
    hands.forEach((h) => {
      netBB += h.heroNetBB; evLoss += h.totalEvLoss;
      h.decisions.forEach((d) => {
        decN++;
        if (d.class === 'optima' || d.class === 'aceptable') decGood++;
        dist[d.class] = (dist[d.class] || 0) + 1;
        const s = street[d.street]; if (s) { s.n++; if (d.class === 'optima' || d.class === 'aceptable') s.good++; }
      });
    });
    const accuracy = decN ? Math.round((decGood / decN) * 100) : 100;
    const accByStreet = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => {
      accByStreet[st] = street[st].n ? Math.round((street[st].good / street[st].n) * 100) : null;
    });

    const byNet = hands.slice().sort((a, b) => b.heroNetBB - a.heroNetBB);
    const best5 = byNet.slice(0, 5);
    const worst5 = byNet.slice(-5).reverse();

    // EV perdido por decisiones vs varianza
    const evDecision = r2(evLoss);                 // bb perdidos por decisiones subóptimas
    const varianceAdj = r2(netBB + evLoss);        // desviación del resultado real respecto a tu EV de decisiones
    const mag = Math.abs(evDecision) + Math.abs(varianceAdj) || 1;
    const pctDecision = Math.round((Math.abs(evDecision) / mag) * 100);
    const pctVariance = 100 - pctDecision;

    const grade = sessionGrade(accuracy, evLoss, decN, netBB);

    return {
      nHands: n, nDecisions: decN, accuracy, accByStreet, dist,
      netBB: r2(netBB), evLossBB: r2(evLoss),
      evPerHand: n ? r2(evLoss / n) : 0,
      best5: best5.map(slim), worst5: worst5.map(slim),
      evDecision, varianceAdj, pctDecision, pctVariance,
      grade
    };
  }
  function slim(h) {
    return { id: h.id, heroCode: h.heroCode, heroCards: h.heroCards, heroPos: h.heroPos, board: h.board, heroNetBB: h.heroNetBB, totalEvLoss: h.totalEvLoss, accuracy: h.accuracy, worstClass: h.worstClass };
  }

  function sessionGrade(accuracy, evLoss, decN, netBB) {
    const evPer100 = decN ? (evLoss / decN) * 100 : 0; // bb perdidos cada 100 decisiones
    // puntuación 0..10: acierto pesa, penaliza EV perdido por decisión
    let score = (accuracy / 10) * 0.6 + Math.max(0, 10 - evPer100 / 3) * 0.4;
    score = Math.max(0, Math.min(10, score));
    let letter;
    if (score >= 9) letter = 'A+';
    else if (score >= 8) letter = 'A';
    else if (score >= 7) letter = 'B';
    else if (score >= 6) letter = 'C';
    else if (score >= 4.5) letter = 'D';
    else letter = 'E';
    let verdict;
    if (score >= 8) verdict = 'Sesión muy sólida, decisiones cercanas a GTO.';
    else if (score >= 6.5) verdict = 'Buena sesión con margen de mejora puntual.';
    else if (score >= 5) verdict = 'Sesión regular: revisa los spots con más EV perdido.';
    else verdict = 'Sesión con fugas importantes; repasa los errores marcados.';
    return { score: r2(score), letter, verdict };
  }

  global.Importer = {
    parseSession, parseHand, analyzeHand, buildSession, heroPlayed, computeStats, num, cardsFrom
  };
})(window);
