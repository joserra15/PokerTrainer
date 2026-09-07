/* PokerForgeAI bundle: pt-analysis.js — do not edit */
/*
 * school-coach-quiz.js — Quiz heurístico desde mano importada / analizada (Fase 4).
 * Sin IA: el peor spot GTO de la mano → MCQ estilo Escuela.
 */
(function (global) {
  'use strict';

  var CLASS_RANK = { optima: 1, aceptable: 2, imprecisa: 3, error: 4 };

  var ACTION_LABELS = {
    fold: 'Fold',
    call: 'Call',
    raise: 'Raise',
    check: 'Check',
    bet: 'Bet',
    bet_33: 'Bet 33%',
    bet_66: 'Bet 66%',
    bet_100: 'Bet pot'
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function boardAtStreet(hand, street) {
    var all = (hand && hand.boardAll) || (hand && hand.board) || [];
    if (street === 'preflop') return [];
    if (street === 'flop') return all.slice(0, 3);
    if (street === 'turn') return all.slice(0, 4);
    return all.slice(0, 5);
  }

  function labelForAction(id) {
    return ACTION_LABELS[id] || String(id || '').replace(/_/g, ' ');
  }

  function worstDecision(hand) {
    if (!hand || !hand.decisions || !hand.decisions.length) return null;
    var worst = null;
    hand.decisions.forEach(function (d) {
      var rank = CLASS_RANK[d.class] || 0;
      if (rank < 3) return;
      if (!worst) {
        worst = d;
        return;
      }
      var wr = CLASS_RANK[worst.class] || 0;
      if (rank > wr || (rank === wr && (Number(d.evLoss) || 0) > (Number(worst.evLoss) || 0))) {
        worst = d;
      }
    });
    return worst;
  }

  function optionsFromDecision(d) {
    var ids = (d && d.options) || ['fold', 'call', 'raise'];
    return ids.map(function (id) {
      return { id: id, label: labelForAction(id) };
    });
  }

  function buildSpotFromHand(hand) {
    var d = worstDecision(hand);
    if (!d) return null;
    var correct = d.best || d.chosen;
    return {
      id: 'coach-' + String(hand.id || 'hand') + '-' + d.street,
      kind: 'decisionQuiz',
      heroPos: hand.heroPos || hand.displayHeroPos || '',
      teachBack: (d.explanation && (d.explanation.summary || d.explanation.title)) ||
        'Repasa la línea GTO de este spot antes de repetir la mano.',
      quiz: {
        prompt: '¿Qué harías en ' + d.street + '?',
        line: d.spot || d.context || '',
        board: boardAtStreet(hand, d.street),
        heroCards: (hand.heroCards || []).slice(),
        options: optionsFromDecision(d),
        correctId: correct,
        teachBack: (d.explanation && d.explanation.body) ||
          ('La línea óptima era «' + labelForAction(correct) + '». Tu elección: «' +
            labelForAction(d.chosen) + '».')
      },
      sourceHandId: hand.id,
      sourceStreet: d.street
    };
  }

  function canBuildQuiz(hand) {
    return !!buildSpotFromHand(hand);
  }

  function renderPanelHtml(hand) {
    var spot = buildSpotFromHand(hand);
    if (!spot) return '';
    var q = spot.quiz || {};
    return (
      '<section class="school-coach-quiz card-box" data-school-coach-quiz="' + esc(hand.id) + '">' +
      '<p class="school-eyebrow">Quiz Escuela · desde tu mano</p>' +
      '<h4 class="school-coach-quiz-title">' + esc(q.prompt || 'Spot clave') + '</h4>' +
      '<p class="muted-text school-coach-quiz-lead">' + esc(q.line || '') + '</p>' +
      '<div class="school-coach-quiz-mount" data-school-coach-quiz-mount="' + esc(hand.id) + '"></div>' +
      '</section>'
    );
  }

  function mountPanel(root, hand, onDone) {
    if (!root || !hand) return false;
    var spot = buildSpotFromHand(hand);
    if (!spot) return false;
    var mount = root.querySelector('[data-school-coach-quiz-mount="' + CSS.escape(hand.id) + '"]') || root;
    var MX = global.PTSchoolMatrixDrills;
    if (!MX || !MX.mountDrill) return false;
    MX.mountDrill(mount, spot, {
      index: 0,
      total: 1,
      lessonId: '__coach__',
      lessonTitle: 'Quiz desde mano',
      onAbort: function () {
        if (typeof onDone === 'function') onDone(null);
      },
      onResult: function (result) {
        if (typeof onDone === 'function') onDone(result);
      }
    });
    return true;
  }

  global.PTSchoolCoachQuiz = {
    worstDecision: worstDecision,
    buildSpotFromHand: buildSpotFromHand,
    canBuildQuiz: canBuildQuiz,
    renderPanelHtml: renderPanelHtml,
    mountPanel: mountPanel
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * hand-analysis.js — Menú "Análisis de manos".
 * - Entrada manual de una mano (posiciones, cartas, comunitarias y acciones).
 * - Entrada por texto libre con ForgeCoach (consume consulta): la IA genera la
 *   estructura de la mano + un análisis.
 * - Guarda las manos (límite por plan: 5 / 20 / 100), permite revisarlas paso a
 *   paso (reutiliza la revisión de sesiones) y jugarlas en el entrenador con las
 *   mismas cartas; el villano sigue la línea real hasta que el héroe se desvíe.
 * Expuesto como `PTHandAnalysis`.
 */
(function (global) {
  'use strict';

  var RING_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var RING_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];
  var STREET_LABELS = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
  var ACTION_LABELS = {
    fold: 'Fold', check: 'Pasar', call: 'Igualar', bet: 'Apostar', raise: 'Subir'
  };
  var VILLAIN_LEVELS = [
    { val: 'pro', label: 'GTO Pro' },
    { val: 'intermediate', label: 'Intermedio' },
    { val: 'fish', label: 'Fish' }
  ];
  var THEMES = [
    { val: 'emerald', label: 'Esmeralda' },
    { val: 'midnight', label: 'Medianoche' },
    { val: 'crimson', label: 'Burdeos' }
  ];

  var S = {
    view: 'list',
    container: null,
    format: '6max',
    draft: null,
    editId: null,
    editMeta: null,
    picker: null
  };

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function round2(x) { return Math.round(x * 100) / 100; }
  /** Precisión interna de importes en € (evita 0.025 → 0.03). */
  function roundEuro(x) { return Math.round(Number(x) * 1e4) / 1e4; }
  function ringFor(fmt, playersSeated) {
    var TC = global.PTTournamentContext;
    var n = playersSeated != null ? Number(playersSeated) : null;
    // Con capacidad 6/9-max y ≥5 jugadores, usar el anillo completo del formato
    // para no perder posiciones (UTG…) al editar manos multiway.
    if (n != null && isFinite(n) && n >= 2) {
      if (n <= 4 && TC && TC.ringForSeated) return TC.ringForSeated(n);
      return fmt === '9max' ? RING_9.slice() : RING_6.slice();
    }
    return fmt === '9max' ? RING_9.slice() : RING_6.slice();
  }
  function draftRing(draft) {
    return ringFor(draft && draft.format, draft && draft.playersSeated);
  }
  function posIndex(fmt, pos, playersSeated) {
    var ring = ringFor(fmt, playersSeated);
    var i = ring.indexOf(pos);
    return i < 0 ? 999 : i;
  }
  function sortByRing(fmt, positions, playersSeated) {
    return positions.slice().sort(function (a, b) {
      return posIndex(fmt, a, playersSeated) - posIndex(fmt, b, playersSeated);
    });
  }

  /** Orden de habla: preflop UTG→BB; postflop SB→BTN. */
  function speakingOrderRing(fmt, street, playersSeated) {
    var ring = ringFor(fmt, playersSeated);
    if (street === 'preflop') return ring.slice();
    // HU: BTN actúa primero postflop (es el SB efectivo).
    if (ring.length === 2 && ring[0] === 'BTN') {
      return ring.slice();
    }
    var sb = ring.indexOf('SB');
    if (sb < 0) return ring.slice();
    return ring.slice(sb).concat(ring.slice(0, sb));
  }

  function sortBySpeakingOrder(fmt, street, positions, playersSeated) {
    var order = speakingOrderRing(fmt, street, playersSeated);
    return positions.slice().sort(function (a, b) {
      var ia = order.indexOf(a);
      var ib = order.indexOf(b);
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      return ia - ib;
    });
  }

  function speaksBefore(fmt, street, posA, posB, playersSeated) {
    var order = speakingOrderRing(fmt, street, playersSeated);
    var ia = order.indexOf(posA);
    var ib = order.indexOf(posB);
    if (ia < 0) ia = 999;
    if (ib < 0) ib = 999;
    return ia < ib;
  }

  function defaultStackBB(hub) {
    if (hub === 'spin') return 25;
    if (hub === 'mtt') return 40;
    return 100;
  }

  function normalizeStackBB(raw, fallback) {
    var n = Number(raw);
    if (!isFinite(n) || n <= 0) return fallback != null ? fallback : 100;
    if (n > 500) n = 500;
    return Math.round(n * 10) / 10;
  }

  function maxPlayersForFormat(fmt, hub) {
    if (hub === 'spin') return 3;
    return fmt === '9max' ? 9 : 6;
  }

  function syncVillainCount(draft) {
    if (!draft) return;
    var maxP = maxPlayersForFormat(draft.format, draft.formatHub);
    var seated = Number(draft.playersSeated);
    if (!isFinite(seated) || seated < 2) seated = 2;
    if (seated > maxP) seated = maxP;
    draft.playersSeated = seated;
    var need = seated - 1;
    if (!Array.isArray(draft.villains)) draft.villains = [];
    while (draft.villains.length < need) {
      draft.villains.push({
        pos: '',
        cards: [],
        stackBB: draft.heroStackBB != null ? draft.heroStackBB : defaultStackBB(draft.formatHub)
      });
    }
    if (draft.villains.length > need) draft.villains = draft.villains.slice(0, need);
    var ring = draftRing(draft);
    // Si héroe/villanos ya tienen posiciones fuera del anillo corto (HU/3/4),
    // ampliar a la capacidad del formato para no remapear el héroe (p.ej. SB).
    var used = [];
    if (draft.heroPos) used.push(draft.heroPos);
    (draft.villains || []).forEach(function (v) { if (v && v.pos) used.push(v.pos); });
    if (used.some(function (p) { return ring.indexOf(p) < 0; })) {
      draft.playersSeated = Math.max(draft.playersSeated, maxP);
      draft.tableMax = maxP;
      need = draft.playersSeated - 1;
      while (draft.villains.length < need) {
        draft.villains.push({
          pos: '',
          cards: [],
          stackBB: draft.heroStackBB != null ? draft.heroStackBB : defaultStackBB(draft.formatHub)
        });
      }
      ring = draftRing(draft);
    }
    if (ring.indexOf(draft.heroPos) < 0) draft.heroPos = ring[0];
    (draft.villains || []).forEach(function (v) {
      if (v.pos && ring.indexOf(v.pos) < 0) v.pos = '';
      if (v.stackBB == null) v.stackBB = draft.heroStackBB != null ? draft.heroStackBB : defaultStackBB(draft.formatHub);
    });
  }

  function contextFromDraft(draft) {
    var TC = global.PTTournamentContext;
    var seatStacksBB = {};
    if (draft.heroPos) seatStacksBB[draft.heroPos] = normalizeStackBB(draft.heroStackBB, defaultStackBB(draft.formatHub));
    (draft.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      seatStacksBB[v.pos] = normalizeStackBB(v.stackBB, defaultStackBB(draft.formatHub));
    });
    var raw = {
      formatHub: draft.formatHub || 'cash',
      gameKind: draft.formatHub === 'spin' ? 'spin' : (draft.formatHub === 'mtt' ? 'mtt' : 'cash'),
      tournamentType: draft.tournamentType || 'unknown',
      tableMax: maxPlayersForFormat(draft.format, draft.formatHub),
      playersSeated: draft.playersSeated,
      mttPhase: draft.mttPhase || 'auto',
      anteBB: draft.anteBB,
      heroStackBB: draft.heroStackBB,
      heroPos: draft.heroPos,
      seatStacksBB: seatStacksBB,
      playersLeft: draft.playersLeft,
      placesPaid: draft.placesPaid,
      entries: draft.entries,
      buyIn: draft.buyIn,
      mttStructureSituation: draft.mttStructureSituation,
      spinPayout: draft.spinPayout
    };
    return TC && TC.normalize ? TC.normalize(raw) : raw;
  }

  function streetCommittedInit(street) {
    return street === 'preflop' ? { SB: 0.5, BB: 1 } : {};
  }

  function defaultBetAmountBB() { return 1; }
  function defaultRaiseAmountBB(toMatch, cur) {
    return round2(Math.max(toMatch + 2, cur + 2));
  }

  /**
   * Normaliza un raise a total "hasta X bb".
   * Si el valor es ≤ la apuesta a igualar, se interpreta como tamaño de la
   * resubida (incremento), no como total — error frecuente al meter varias subidas.
   */
  function resolveRaiseToAmountBB(amountBB, toMatch, cur) {
    var facing = Math.max(0, Number(toMatch) || 0);
    var invested = Math.max(0, Number(cur) || 0);
    if (amountBB == null || !isFinite(amountBB) || amountBB <= 0) {
      return defaultRaiseAmountBB(facing, invested);
    }
    var amt = round2(amountBB);
    if (amt <= facing) return round2(facing + amt);
    return amt;
  }

  function normalizeAnteBB(raw) {
    var n = Number(raw);
    if (!isFinite(n) || n < 0) return 0;
    if (n > 50) n = 50;
    return round2(n);
  }

  /**
   * Recalcula importes mostrados por calle.
   * - call: derivedAmountBB = lo que falta para igualar (toMatch - committed).
   * - raise amountBB = total "hasta" en bb; bet amountBB = tamaño de la apuesta.
   * opts.fillDefaults: rellena bet/raise vacíos (guardar / blur), no durante la escritura.
   */
  function computeStreetDisplayActions(street, actions, opts) {
    var fillDefaults = !!(opts && opts.fillDefaults);
    var committed = streetCommittedInit(street);
    var toMatch = street === 'preflop' ? 1 : 0;
    return (actions || []).map(function (a) {
      var rawAmt = a && a.amountBB;
      var parsedAmt = (rawAmt == null || rawAmt === '') ? null : Number(rawAmt);
      var out = {
        pos: a && a.pos ? a.pos : '',
        action: a && a.action ? a.action : 'fold',
        amountBB: (parsedAmt != null && isFinite(parsedAmt)) ? round2(parsedAmt) : null,
        derivedAmountBB: null,
        amountLocked: false
      };
      var pos = out.pos;
      var action = out.action;
      var cur = pos ? (committed[pos] || 0) : 0;
      if (action === 'call') {
        // Siempre editable: el auto es sugerencia, no candado.
        out.derivedAmountBB = round2(Math.max(0, toMatch - cur));
        out.amountLocked = false;
        // Tras igualar, para el hilo de la calle queda emparejado al toMatch
        // (el importe manual solo afecta al histórico/pote al guardar).
        if (pos) committed[pos] = toMatch;
      } else if (action === 'check' || action === 'fold') {
        out.derivedAmountBB = null;
        out.amountLocked = true;
      } else if (action === 'bet') {
        var betEmpty = out.amountBB == null || out.amountBB <= 0;
        var betAmt = betEmpty ? defaultBetAmountBB() : out.amountBB;
        if (betEmpty) out.amountBB = fillDefaults ? betAmt : null;
        // amountBB vacío: no se escribe en el input, pero sí cuenta para calls siguientes.
        out.derivedAmountBB = (out.amountBB != null && out.amountBB > 0) ? out.amountBB : null;
        if (pos) committed[pos] = betAmt;
        toMatch = Math.max(toMatch, betAmt);
      } else if (action === 'raise') {
        var raiseEmpty = out.amountBB == null || out.amountBB <= 0;
        var raiseAmt = raiseEmpty
          ? defaultRaiseAmountBB(toMatch, cur)
          : resolveRaiseToAmountBB(out.amountBB, toMatch, cur);
        if (raiseEmpty) {
          out.amountBB = fillDefaults ? raiseAmt : null;
        } else if (fillDefaults && out.amountBB !== raiseAmt) {
          // Persistimos el total resuelto (p. ej. incremento → hasta X).
          out.amountBB = raiseAmt;
        }
        out.derivedAmountBB = (out.amountBB != null && out.amountBB > 0) ? out.amountBB : null;
        if (pos) committed[pos] = raiseAmt;
        toMatch = Math.max(toMatch, raiseAmt);
      }
      return out;
    });
  }

  /** Rellena calls vacíos con el auto y bet/raise vacíos con el mínimo lógico.
   *  Postflop: "raise" sin apuesta previa se normaliza a "bet".
   *  Raises cortos (≤ toMatch) se guardan ya resueltos a total "hasta X". */
  function fillActionAmounts(street, actions) {
    var normalized = (actions || []).map(cloneAct);
    if (street !== 'preflop') {
      var facing = 0;
      normalized = normalized.map(function (out) {
        if (out.action === 'raise' && facing <= 0) out.action = 'bet';
        if (out.action === 'bet' || out.action === 'raise') {
          facing = Math.max(facing, out.amountBB != null && out.amountBB > 0 ? out.amountBB : 1);
        }
        return out;
      });
    }
    var computed = computeStreetDisplayActions(street, normalized, { fillDefaults: true });
    return normalized.map(function (a, i) {
      var c = computed[i] || {};
      var out = cloneAct(a || {});
      if (out.action === 'check' || out.action === 'fold') {
        out.amountBB = null;
      } else if (out.action === 'call') {
        if (out.amountBB == null || out.amountBB < 0) {
          out.amountBB = c.derivedAmountBB != null ? c.derivedAmountBB : 0;
        }
      } else if (out.action === 'bet' || out.action === 'raise') {
        if (out.amountBB == null || out.amountBB <= 0) {
          out.amountBB = c.amountBB != null ? c.amountBB : (out.action === 'bet' ? 1 : 2);
        } else if (out.action === 'raise' && c.amountBB != null && c.amountBB > 0) {
          // Persistir total resuelto si el usuario escribió un incremento.
          out.amountBB = c.amountBB;
        }
      }
      return out;
    });
  }

  function normalizeCard(raw) {
    if (!raw) return null;
    var s = String(raw).trim().replace(/\s+/g, '');
    if (!s) return null;
    s = s.replace(/10/g, 'T');
    if (s.length !== 2) return null;
    var rank = s[0].toUpperCase();
    var suit = s[1].toLowerCase();
    if ('23456789TJQKA'.indexOf(rank) < 0) return null;
    if ('shdc'.indexOf(suit) < 0) return null;
    return rank + suit;
  }

  function parseCardList(str) {
    if (!str) return [];
    var out = [];
    var tokens = String(str).replace(/,/g, ' ').match(/(?:10|[2-9TJQKAtjqka])[shdcSHDC]/g) || [];
    tokens.forEach(function (t) {
      var c = normalizeCard(t);
      if (c && out.indexOf(c) < 0) out.push(c);
    });
    return out;
  }

  function cardHTML(c) {
    if (global.Cards && global.Cards.cardToHTML) return global.Cards.cardToHTML(c);
    return '<span class="rec-card">' + esc(c) + '</span>';
  }
  function cardsHTML(list) { return (list || []).map(cardHTML).join(''); }

  // ---------- construir mano cruda a partir de un "spec" ----------
  function normalizeBbEuro(raw) {
    var n = Number(raw);
    if (!isFinite(n) || n <= 0) return 0.05;
    if (n > 100) n = 100;
    return round2(n);
  }

  function specToRawHand(spec) {
    var bbVal = normalizeBbEuro(spec.bbEuro != null ? spec.bbEuro : 0.05);
    var sbVal = roundEuro(bbVal / 2);
    var anteBB = normalizeAnteBB(spec.anteBB);
    var anteVal = roundEuro(anteBB * bbVal);
    var formatHub = spec.formatHub || (anteBB > 0 ? 'mtt' : 'cash');
    var isTourney = formatHub === 'mtt' || formatHub === 'spin' || anteBB > 0;
    var gameKind = formatHub === 'spin' ? 'spin'
      : (formatHub === 'mtt' ? (spec.gameKind === 'sng' ? 'sng' : 'mtt') : 'cash');
    var fmt = spec.format === '9max' ? '9max' : '6max';
    var hero = spec.heroPos;
    var seatedPos = [];
    if (hero) seatedPos.push(hero);
    (spec.villains || []).forEach(function (v) {
      if (v && v.pos && seatedPos.indexOf(v.pos) < 0) seatedPos.push(v.pos);
    });
    // Incluir asientos que aparecen en acciones (p.ej. folds early en mesa completa).
    STREET_ORDER.forEach(function (st) {
      ((spec.actions && spec.actions[st]) || []).forEach(function (a) {
        if (a && a.pos && seatedPos.indexOf(a.pos) < 0) seatedPos.push(a.pos);
      });
    });
    var playersSeated = seatedPos.length >= 2
      ? seatedPos.length
      : (spec.playersSeated != null ? Number(spec.playersSeated) : seatedPos.length);
    if (playersSeated < 2) playersSeated = Math.max(2, seatedPos.length);
    // Si el usuario fijó playersSeated mayor (mesa con folds implícitos), respetarlo con ring.
    if (spec.playersSeated != null && Number(spec.playersSeated) > playersSeated) {
      playersSeated = Number(spec.playersSeated);
    }
    var ring = ringFor(fmt, playersSeated);
    // Solo asientos sentados (héroe + villanos + actores).
    var activePos = seatedPos.length ? sortByRing(fmt, seatedPos, playersSeated) : ring.slice(0, playersSeated);
    // Si playersSeated > activePos, completar con asientos del ring aún libres.
    if (activePos.length < playersSeated) {
      ring.forEach(function (p) {
        if (activePos.length >= playersSeated) return;
        if (activePos.indexOf(p) < 0) activePos.push(p);
      });
    }
    var positions = {};
    activePos.forEach(function (p) { positions[p] = p; });

    var heroCards = (spec.heroCards || []).slice(0, 2);
    var defaultStack = defaultStackBB(formatHub);
    var heroStackBB = normalizeStackBB(spec.heroStackBB, defaultStack);

    var shows = {};
    var villainStacks = {};
    (spec.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      if (v.cards && v.cards.length === 2) shows[v.pos] = v.cards.slice();
      villainStacks[v.pos] = normalizeStackBB(v.stackBB, heroStackBB);
    });

    // Posts: ciegas + ante solo de asientos sentados.
    var posts = {};
    if (anteVal > 0) {
      activePos.forEach(function (p) { posts[p] = anteVal; });
    }
    if (activePos.indexOf('SB') >= 0) {
      posts.SB = roundEuro((posts.SB || 0) + sbVal);
    } else if (activePos.indexOf('BTN') >= 0 && activePos.length === 2) {
      // HU: BTN posta SB
      posts.BTN = roundEuro((posts.BTN || 0) + sbVal);
    }
    if (activePos.indexOf('BB') >= 0) {
      posts.BB = roundEuro((posts.BB || 0) + bbVal);
    }

    var seats = activePos.map(function (p, i) {
      var stackBB = p === hero ? heroStackBB : (villainStacks[p] != null ? villainStacks[p] : heroStackBB);
      return { seat: i + 1, name: p, stack: roundEuro(stackBB * bbVal) };
    });

    var streets = { preflop: [], flop: [], turn: [], river: [] };
    STREET_ORDER.forEach(function (st) {
      var committed = {};
      var toMatch = 0;
      // Ciegas sí cuentan para toMatch; el ante es dead money en posts, no apuesta a igualar.
      if (st === 'preflop') {
        if (activePos.indexOf('SB') >= 0) committed.SB = sbVal;
        else if (activePos.indexOf('BTN') >= 0 && activePos.length === 2) committed.BTN = sbVal;
        if (activePos.indexOf('BB') >= 0) committed.BB = bbVal;
        toMatch = bbVal;
      }
      var acts = (spec.actions && spec.actions[st]) || [];
      acts.forEach(function (a) {
        if (!a || !a.pos || !a.action) return;
        var player = a.pos;
        var type = a.action;
        var amtBB = Number(a.amountBB);
        // Postflop: "raise" sin apuesta previa = bet de apertura
        if (st !== 'preflop' && type === 'raise' && toMatch <= 0) type = 'bet';
        if (type === 'raise') {
          var toMatchBB = bbVal > 0 ? toMatch / bbVal : 0;
          var curBB = bbVal > 0 ? (committed[player] || 0) / bbVal : 0;
          var toBB = resolveRaiseToAmountBB(
            (isFinite(amtBB) && amtBB > 0) ? amtBB : null,
            toMatchBB,
            curBB
          );
          var to = roundEuro(toBB * bbVal);
          var inc = roundEuro(to - (committed[player] || 0));
          if (inc < 0) inc = roundEuro(to);
          streets[st].push({ player: player, type: 'raise', amount: inc, to: to, allin: false });
          committed[player] = to; toMatch = to;
        } else if (type === 'bet') {
          var amt = roundEuro((isFinite(amtBB) && amtBB > 0 ? amtBB : 1) * bbVal);
          streets[st].push({ player: player, type: 'bet', amount: amt, allin: false });
          committed[player] = amt; toMatch = Math.max(toMatch, amt);
        } else if (type === 'call') {
          var needCall = roundEuro((toMatch || bbVal) - (committed[player] || 0));
          if (needCall < 0) needCall = 0;
          // Si el usuario escribió un importe, se respeta; si no, se usa el auto.
          var callAmt = (isFinite(amtBB) && amtBB >= 0)
            ? roundEuro(amtBB * bbVal)
            : needCall;
          streets[st].push({ player: player, type: 'call', amount: callAmt, allin: false });
          committed[player] = roundEuro((committed[player] || 0) + callAmt);
          if (committed[player] > toMatch) toMatch = committed[player];
        } else if (type === 'check') {
          streets[st].push({ player: player, type: 'check' });
        } else if (type === 'fold') {
          streets[st].push({ player: player, type: 'fold' });
        }
      });
    });

    var board = (spec.board || []).filter(Boolean).slice(0, 5);
    var TC = global.PTTournamentContext;
    var ctx = TC && TC.normalize ? TC.normalize({
      formatHub: formatHub,
      gameKind: gameKind,
      tournamentType: spec.tournamentType || 'unknown',
      tableMax: spec.tableMax != null ? spec.tableMax : maxPlayersForFormat(fmt, formatHub),
      playersSeated: activePos.length,
      mttPhase: spec.mttPhase || 'auto',
      anteBB: anteBB,
      heroStackBB: heroStackBB,
      heroPos: hero,
      seatStacksBB: (function () {
        var m = {};
        activePos.forEach(function (p) {
          m[p] = p === hero ? heroStackBB : (villainStacks[p] != null ? villainStacks[p] : heroStackBB);
        });
        return m;
      })(),
      playersLeft: spec.playersLeft,
      placesPaid: spec.placesPaid,
      entries: spec.entries,
      buyIn: spec.buyIn,
      mttStructureSituation: spec.mttStructureSituation,
      spinPayout: spec.spinPayout
    }) : null;

    var raw = {
      id: spec._id || ('ah_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      datetime: new Date().toISOString(),
      sb: sbVal, bb: bbVal, currency: 'EUR',
      hero: hero, heroCards: heroCards,
      heroPos: hero,
      positions: positions,
      blinds: { sb: activePos.length === 2 && activePos.indexOf('SB') < 0 ? 'BTN' : 'SB', bb: 'BB' },
      posts: posts,
      seats: seats,
      ante: anteVal,
      streets: streets,
      board: { flop: board.slice(0, 3), turn: board.slice(3, 4), river: board.slice(4, 5) },
      boardAll: board,
      shows: shows,
      collected: {}, uncalledTo: {}, rake: 0, potTotal: 0,
      isCash: !isTourney,
      isTournament: isTourney,
      gameKind: gameKind,
      platform: 'manual',
      tableMax: ctx ? ctx.tableMax : maxPlayersForFormat(fmt, formatHub),
      playersSeated: activePos.length,
      mttPhase: ctx ? (ctx.mttPhase === 'auto' ? ctx.resolvedPhase : ctx.mttPhase) : (spec.mttPhase || null),
      tournamentType: ctx ? ctx.tournamentType : (spec.tournamentType || 'unknown'),
      stackDepthBB: heroStackBB,
      avgStackBB: ctx ? ctx.avgStackBB : heroStackBB,
      effStackBB: ctx ? ctx.effStackBB : heroStackBB,
      seatStacksBB: ctx ? ctx.seatStacksBB : null,
      formatKey: ctx ? ctx.formatKey : null,
      playersLeft: spec.playersLeft != null ? spec.playersLeft : null,
      placesPaid: spec.placesPaid != null ? spec.placesPaid : null,
      entries: spec.entries != null ? spec.entries : null,
      buyIn: spec.buyIn != null ? spec.buyIn : null,
      mttStructureSituation: spec.mttStructureSituation || null,
      anteBB: anteBB,
      tournamentContext: ctx
    };
    if (TC && TC.applyToHand) TC.applyToHand(raw, ctx || {});
    return raw;
  }

  function ensureImporter() {
    if (global.Importer && global.Importer.analyzeHand) return Promise.resolve();
    if (!global.PTLoader) {
      return Promise.reject(new Error('Módulo de análisis no cargado.'));
    }
    return global.PTLoader.ensure('sessions').then(function () {
      if (!global.Importer || !global.Importer.analyzeHand) {
        throw new Error('Módulo de análisis no cargado.');
      }
    });
  }

  function buildAnalyzedHand(spec, source) {
    if (!global.Importer || !global.Importer.analyzeHand) {
      throw new Error('Módulo de análisis no cargado.');
    }
    ensureVillainsFromActions(spec);
    var raw = specToRawHand(spec);
    var analyzed = global.Importer.analyzeHand(raw);
    var bbEuro = normalizeBbEuro(spec.bbEuro != null ? spec.bbEuro : raw.bb);
    var anteBB = normalizeAnteBB(spec.anteBB);
    var formatHub = spec.formatHub || (anteBB > 0 ? 'mtt' : 'cash');
    var heroStackBB = normalizeStackBB(spec.heroStackBB, defaultStackBB(formatHub));
    analyzed.spec = {
      format: spec.format === '9max' ? '9max' : '6max',
      formatHub: formatHub,
      tournamentType: spec.tournamentType || 'unknown',
      mttPhase: spec.mttPhase || 'auto',
      playersSeated: raw.playersSeated,
      tableMax: raw.tableMax,
      heroPos: spec.heroPos,
      heroCards: (spec.heroCards || []).slice(),
      heroStackBB: heroStackBB,
      villains: (spec.villains || []).map(function (v) {
        return {
          pos: v.pos,
          cards: (v.cards || []).slice(),
          stackBB: normalizeStackBB(v.stackBB, heroStackBB)
        };
      }),
      board: (spec.board || []).slice(),
      bbEuro: bbEuro,
      anteBB: anteBB,
      playersLeft: spec.playersLeft != null ? spec.playersLeft : null,
      placesPaid: spec.placesPaid != null ? spec.placesPaid : null,
      entries: spec.entries != null ? spec.entries : null,
      buyIn: spec.buyIn != null ? spec.buyIn : null,
      mttStructureSituation: spec.mttStructureSituation || null,
      spinPayout: spec.spinPayout || null,
      actions: {
        preflop: ((spec.actions && spec.actions.preflop) || []).slice(),
        flop: ((spec.actions && spec.actions.flop) || []).slice(),
        turn: ((spec.actions && spec.actions.turn) || []).slice(),
        river: ((spec.actions && spec.actions.river) || []).slice()
      },
      _source: source || spec._source || 'manual'
    };
    analyzed.bbEuro = bbEuro;
    analyzed.anteBB = anteBB;
    analyzed.formatHub = formatHub;
    analyzed.tournamentType = raw.tournamentType;
    analyzed.mttPhase = raw.mttPhase;
    analyzed.playersSeated = raw.playersSeated;
    analyzed.tableMax = raw.tableMax;
    analyzed.stackDepthBB = raw.stackDepthBB;
    analyzed.effStackBB = raw.effStackBB;
    analyzed.avgStackBB = raw.avgStackBB;
    analyzed.seatStacksBB = raw.seatStacksBB;
    analyzed.tournamentContext = raw.tournamentContext;
    analyzed.playersLeft = raw.playersLeft;
    analyzed.placesPaid = raw.placesPaid;
    analyzed.entries = raw.entries;
    analyzed.buyIn = raw.buyIn;
    analyzed.mttStructureSituation = raw.mttStructureSituation;
    analyzed.boardAll = (raw.boardAll || analyzed.board || []).slice();
    analyzed.source = source || spec._source || 'manual';
    analyzed.createdAt = spec._createdAt || new Date().toISOString();
    analyzed.savedName = spec._name || null;
    if (spec._id) analyzed.id = spec._id;
    return analyzed;
  }

  // ---------- validación de spec ----------
  function validateSpec(spec) {
    var errs = [];
    if (!spec.heroPos) errs.push('Elige la posición del héroe.');
    if (!spec.heroCards || spec.heroCards.length !== 2) errs.push('Elige las 2 cartas del héroe.');
    if (spec.bbEuro != null && (!isFinite(Number(spec.bbEuro)) || Number(spec.bbEuro) <= 0)) {
      errs.push('El valor de la BB en € debe ser mayor que 0.');
    }
    if (spec.anteBB != null && (!isFinite(Number(spec.anteBB)) || Number(spec.anteBB) < 0)) {
      errs.push('El ante en bb no puede ser negativo.');
    }
    var hub = spec.formatHub || 'cash';
    if (hub !== 'cash') {
      if (!(Number(spec.heroStackBB) > 0)) errs.push('Indica el stack del héroe en bb.');
      var villainCount = (spec.villains || []).filter(function (v) { return v && v.pos; }).length;
      if (villainCount < 1) errs.push('Añade al menos un villano (o elige HU / 3+ jugadores).');
      (spec.villains || []).forEach(function (v, i) {
        if (!v || !v.pos) return;
        if (!(Number(v.stackBB) > 0)) errs.push('Indica el stack del villano en ' + v.pos + ' (bb).');
      });
    }
    var seenPos = {};
    seenPos[spec.heroPos] = 'héroe';
    (spec.villains || []).forEach(function (v, i) {
      if (!v || !v.pos) return;
      if (seenPos[v.pos]) {
        errs.push('El asiento ' + v.pos + ' no puede repetirse (' + seenPos[v.pos] + ' y villano).');
      } else {
        seenPos[v.pos] = 'villano ' + (i + 1);
      }
    });
    var all = [].concat(spec.heroCards || []);
    (spec.villains || []).forEach(function (v) { if (v.cards) all = all.concat(v.cards); });
    all = all.concat(spec.board || []);
    var seen = {};
    for (var i = 0; i < all.length; i++) {
      if (seen[all[i]]) { errs.push('Carta repetida: ' + all[i] + '. Cada carta debe ser única.'); break; }
      seen[all[i]] = true;
    }
    var pf = (spec.actions && spec.actions.preflop) || [];
    var heroPf = pf.some(function (a) { return a.pos === spec.heroPos; });
    if (!heroPf) errs.push('Añade al menos una acción del héroe en preflop.');
    return errs;
  }

  // ---------- escenario para "jugar en el entrenador" ----------
  function rfiCallerPos(hand, heroPos) {
    var pf = ((hand.spec && hand.spec.actions && hand.spec.actions.preflop) || []);
    var heroRaised = false;
    for (var i = 0; i < pf.length; i++) {
      var a = pf[i];
      if (!a) continue;
      if (a.pos === heroPos && (a.action === 'raise' || a.action === 'bet')) {
        heroRaised = true;
        continue;
      }
      if (heroRaised && a.pos !== heroPos && a.action && a.action !== 'fold') return a.pos;
    }
    return 'BB';
  }

  function deriveScenario(hand, fmt) {
    var heroPos = hand.heroPos;
    var firstPf = (hand.decisions || []).filter(function (d) { return d.street === 'preflop'; })[0];
    var out = { type: 'RFI', heroPos: heroPos, _villainPos: heroPos === 'BB' ? 'SB' : 'BB' };
    if (!firstPf) return out;
    var kind = firstPf.spotKind;
    var vs = firstPf.vsPosition;
    if (kind === 'RFI') {
      out = { type: 'RFI', heroPos: heroPos, _villainPos: rfiCallerPos(hand, heroPos) };
    } else if (kind === 'vsRFI' && vs) {
      out = { type: 'vsRFI', key: heroPos + '_vs_' + vs, _villainPos: vs };
    } else if (kind === 'isoLimp' && vs) {
      out = { type: 'isoLimp', heroPos: heroPos, limperPos: vs, _villainPos: vs };
    } else if (vs) {
      out = { type: 'vsRFI', key: heroPos + '_vs_' + vs, _villainPos: vs };
    }
    return out;
  }

  function flattenScriptActions(actions) {
    var out = [];
    STREET_ORDER.forEach(function (st) {
      ((actions && actions[st]) || []).forEach(function (a) {
        if (!a || !a.pos || !a.action) return;
        out.push({
          street: st,
          pos: a.pos,
          action: a.action,
          amountBB: a.amountBB != null ? a.amountBB : null
        });
      });
    });
    return out;
  }

  function toTrainerConfig(hand, villainLevel, tableTheme) {
    var spec = hand.spec || {};
    var fmt = spec.format === '9max' ? '9max' : '6max';
    var scenario = deriveScenario(hand, fmt);
    var villainPos = scenario._villainPos;
    var villainCards = null;
    (spec.villains || []).forEach(function (v) {
      if (v && v.pos === villainPos && v.cards && v.cards.length === 2) villainCards = v.cards.slice();
    });
    if (!villainCards) {
      (spec.villains || []).forEach(function (v) {
        if (!villainCards && v && v.cards && v.cards.length === 2) {
          villainCards = v.cards.slice();
          if (!villainPos) villainPos = v.pos;
        }
      });
    }
    var force = {
      type: scenario.type,
      forceDeal: {
        heroCards: (hand.heroCards || []).slice(0, 2),
        villainCards: villainCards,
        board: (hand.boardAll || hand.board || []).slice(0, 5),
        villainPos: villainPos || null
      },
      forceScript: {
        heroPos: hand.heroPos || spec.heroPos || scenario.heroPos,
        villainPos: villainPos || null,
        actions: flattenScriptActions(spec.actions || actionsSpecFromHand(hand))
      }
    };
    if (scenario.heroPos) force.heroPos = scenario.heroPos;
    if (scenario.key) force.key = scenario.key;
    if (scenario.limperPos) force.limperPos = scenario.limperPos;

    var TC = global.PTTournamentContext;
    var ctx = hand.tournamentContext
      || (TC && TC.fromHand ? TC.fromHand(hand) : null)
      || {
        formatHub: spec.formatHub || (hand.gameKind === 'spin' ? 'spin'
          : ((hand.gameKind === 'mtt' || hand.gameKind === 'sng' || hand.isTournament) ? 'mtt' : 'cash')),
        gameKind: hand.gameKind,
        tournamentType: hand.tournamentType || spec.tournamentType,
        tableMax: hand.tableMax || spec.tableMax,
        playersSeated: hand.playersSeated || spec.playersSeated,
        mttPhase: hand.mttPhase || spec.mttPhase || 'auto',
        anteBB: spec.anteBB != null ? spec.anteBB : hand.anteBB,
        heroStackBB: spec.heroStackBB != null ? spec.heroStackBB : hand.stackDepthBB,
        seatStacksBB: hand.seatStacksBB || spec.seatStacksBB,
        playersLeft: hand.playersLeft != null ? hand.playersLeft : spec.playersLeft,
        placesPaid: hand.placesPaid != null ? hand.placesPaid : spec.placesPaid,
        entries: hand.entries != null ? hand.entries : spec.entries,
        buyIn: hand.buyIn != null ? hand.buyIn : spec.buyIn,
        mttStructureSituation: hand.mttStructureSituation || spec.mttStructureSituation,
        spinPayout: hand.spinPayout || spec.spinPayout
      };

    var playConfig;
    if (TC && TC.toPlayConfig) {
      playConfig = TC.toPlayConfig(ctx, {
        villainLevel: villainLevel || 'pro',
        tableTheme: tableTheme || 'emerald',
        handRange: 'all',
        practiceStreet: 'preflop',
        allowMultiway: (hand.playersSeated || spec.playersSeated || 2) >= 3
      });
    } else {
      playConfig = {
        gameType: fmt === '9max' ? 'cash9' : 'cash6',
        villainLevel: villainLevel || 'pro',
        tableTheme: tableTheme || 'emerald',
        handRange: 'all',
        practiceStreet: 'preflop'
      };
      if (global.PTPlayConfig && global.PTPlayConfig.normalize) {
        playConfig = global.PTPlayConfig.normalize(playConfig);
      }
    }
    playConfig.villainLevel = villainLevel || 'pro';
    playConfig.tableTheme = tableTheme || 'emerald';
    // Escenario multiway si ≥3 jugadores sentados y pot multiway potencial
    if ((hand.playersSeated || spec.playersSeated || 0) >= 3 && playConfig.scenario === 'random') {
      playConfig.allowMultiway = true;
    }
    return { force: force, playConfig: playConfig };
  }

  /** Villanos con cartas conocidas con los que se puede intercambiar el POV. */
  function listSwappableVillains(hand) {
    var out = [];
    var spec = hand && hand.spec;
    if (spec && Array.isArray(spec.villains)) {
      spec.villains.forEach(function (v) {
        if (v && v.pos && v.pos !== spec.heroPos && v.cards && v.cards.length === 2) {
          out.push({ pos: v.pos, cards: v.cards.slice(0, 2) });
        }
      });
      return out;
    }
    var shows = (hand && hand.villainShows) || {};
    var heroName = hand && hand.hero;
    Object.keys(shows).forEach(function (name) {
      if (name === heroName) return;
      if (!shows[name] || shows[name].length < 2) return;
      var pos = (hand.positions && hand.positions[name]) || '';
      if (!pos) return;
      if (pos === hand.heroPos) return;
      out.push({ pos: pos, cards: shows[name].slice(0, 2), player: name });
    });
    return out;
  }

  function actionsSpecFromHand(hand) {
    var bb = (hand && hand.bb) || 1;
    if (!(bb > 0)) bb = 1;
    var actions = emptyActions();
    STREET_ORDER.forEach(function (st) {
      (((hand && hand.streets) || {})[st] || []).forEach(function (a) {
        if (!a) return;
        var pos = (hand.positions && hand.positions[a.player]) || a.player;
        if (!pos) return;
        var row = { pos: pos, action: a.type, amountBB: null };
        if (a.type === 'bet' && a.amount != null) row.amountBB = round2(a.amount / bb);
        else if (a.type === 'raise' && a.to != null) row.amountBB = round2(a.to / bb);
        actions[st].push(row);
      });
    });
    return actions;
  }

  /**
   * Completa villanos a partir de las acciones: si la IA (u otra fuente) guardó
   * acciones de HJ/BTN/BB/… pero dejó villains vacío o incompleto, al editar
   * syncActionsFromSeats borraría esas filas. Aquí se recuperan los asientos.
   */
  function ensureVillainsFromActions(spec) {
    if (!spec) return spec;
    var heroPos = spec.heroPos;
    var fmt = spec.format === '9max' ? '9max' : '6max';
    var byPos = {};
    (spec.villains || []).forEach(function (v) {
      if (!v || !v.pos || v.pos === heroPos) return;
      if (!byPos[v.pos]) {
        byPos[v.pos] = {
          pos: v.pos,
          cards: (v.cards || []).slice(0, 2),
          stackBB: v.stackBB
        };
      } else {
        if ((!byPos[v.pos].cards || !byPos[v.pos].cards.length) && v.cards && v.cards.length) {
          byPos[v.pos].cards = v.cards.slice(0, 2);
        }
        if (byPos[v.pos].stackBB == null && v.stackBB != null) byPos[v.pos].stackBB = v.stackBB;
      }
    });
    STREET_ORDER.forEach(function (st) {
      ((spec.actions && spec.actions[st]) || []).forEach(function (a) {
        if (!a || !a.pos || a.pos === heroPos || byPos[a.pos]) return;
        byPos[a.pos] = { pos: a.pos, cards: [], stackBB: spec.heroStackBB };
      });
    });
    var seatedHint = spec.playersSeated != null
      ? Number(spec.playersSeated)
      : (1 + Object.keys(byPos).length);
    var ordered = sortByRing(fmt, Object.keys(byPos), seatedHint).map(function (pos) {
      return byPos[pos];
    });
    spec.villains = ordered.length ? ordered : [{ pos: '', cards: [], stackBB: spec.heroStackBB }];
    if (spec.playersSeated == null) {
      spec.playersSeated = Math.max(2, 1 + ordered.length);
    }
    return spec;
  }

  function ensureHandSpec(hand) {
    function stacksFromHandSeats(h) {
      var map = {};
      if (!h || !h.seats || !h.bb) return map;
      var bb = Number(h.bb) || 0;
      if (!(bb > 0)) return map;
      (h.seats || []).forEach(function (s) {
        if (!s) return;
        var pos = (h.positions && h.positions[s.name]) || s.name;
        if (!pos) return;
        map[pos] = Math.round(((Number(s.stack) || 0) / bb) * 10) / 10;
      });
      return map;
    }
    var seatStacks = hand.seatStacksBB || stacksFromHandSeats(hand);
    var hub = hand.formatHub
      || (hand.gameKind === 'spin' ? 'spin'
        : ((hand.gameKind === 'mtt' || hand.gameKind === 'sng' || hand.isTournament) ? 'mtt' : 'cash'));
    var defaultSt = defaultStackBB(hub);

    if (hand && hand.spec && hand.spec.heroPos && hand.spec.heroCards) {
      var s = hand.spec;
      var heroStack = normalizeStackBB(
        s.heroStackBB != null ? s.heroStackBB
          : (hand.stackDepthBB != null ? hand.stackDepthBB
            : (hand.heroPos && seatStacks[hand.heroPos])),
        defaultSt
      );
      var out = ensureVillainsFromActions({
        format: s.format === '9max' ? '9max' : '6max',
        formatHub: s.formatHub || hub,
        tournamentType: s.tournamentType || hand.tournamentType || 'unknown',
        mttPhase: s.mttPhase || hand.mttPhase || 'auto',
        playersSeated: s.playersSeated != null ? s.playersSeated : hand.playersSeated,
        tableMax: s.tableMax != null ? s.tableMax : hand.tableMax,
        heroPos: s.heroPos,
        heroCards: (s.heroCards || []).slice(0, 2),
        heroStackBB: heroStack,
        villains: (s.villains || []).map(function (v) {
          return {
            pos: v.pos,
            cards: (v.cards || []).slice(0, 2),
            stackBB: normalizeStackBB(
              v.stackBB != null ? v.stackBB : (v.pos && seatStacks[v.pos]),
              heroStack
            )
          };
        }),
        board: (s.board || hand.boardAll || hand.board || []).slice(0, 5),
        bbEuro: normalizeBbEuro(s.bbEuro != null ? s.bbEuro : (hand.bbEuro != null ? hand.bbEuro : hand.bb)),
        anteBB: normalizeAnteBB(
          s.anteBB != null ? s.anteBB
            : (hand.anteBB != null ? hand.anteBB
              : (hand.ante && hand.bb ? hand.ante / hand.bb : 0))
        ),
        playersLeft: s.playersLeft != null ? s.playersLeft : hand.playersLeft,
        placesPaid: s.placesPaid != null ? s.placesPaid : hand.placesPaid,
        entries: s.entries != null ? s.entries : hand.entries,
        buyIn: s.buyIn != null ? s.buyIn : hand.buyIn,
        mttStructureSituation: s.mttStructureSituation || hand.mttStructureSituation || null,
        spinPayout: s.spinPayout || hand.spinPayout || null,
        actions: {
          preflop: ((s.actions && s.actions.preflop) || []).map(cloneAct),
          flop: ((s.actions && s.actions.flop) || []).map(cloneAct),
          turn: ((s.actions && s.actions.turn) || []).map(cloneAct),
          river: ((s.actions && s.actions.river) || []).map(cloneAct)
        }
      });
      // Si el spec perdió acciones pero la mano analizada aún tiene streets,
      // reconstruir acciones y villanos desde ahí (paso a paso sí las muestra).
      var hasActs = STREET_ORDER.some(function (st) {
        return out.actions[st] && out.actions[st].length;
      });
      if (!hasActs) {
        out.actions = actionsSpecFromHand(hand);
        ensureVillainsFromActions(out);
      } else {
        // Asientos que actúan en streets pero faltan en villains/acciones del spec
        var seen = {};
        if (out.heroPos) seen[out.heroPos] = true;
        (out.villains || []).forEach(function (v) { if (v && v.pos) seen[v.pos] = true; });
        STREET_ORDER.forEach(function (st) {
          (((hand.streets || {})[st]) || []).forEach(function (a) {
            var pos = (hand.positions && hand.positions[a.player]) || a.player;
            if (!pos || seen[pos]) return;
            seen[pos] = true;
            out.villains.push({
              pos: pos,
              cards: [],
              stackBB: normalizeStackBB(seatStacks[pos], heroStack)
            });
          });
        });
        if (out.villains.length > 1 || (out.villains[0] && out.villains[0].pos)) {
          out.villains = out.villains.filter(function (v) { return v && v.pos; });
        }
        ensureVillainsFromActions(out);
      }
      if (out.playersSeated == null) {
        out.playersSeated = 1 + (out.villains || []).filter(function (v) { return v && v.pos; }).length;
      }
      return out;
    }
    var villains = listSwappableVillains(hand).map(function (v) {
      return {
        pos: v.pos,
        cards: v.cards.slice(0, 2),
        stackBB: normalizeStackBB(seatStacks[v.pos], defaultSt)
      };
    });
    // Incluir villanos sin cartas que hayan actuado
    var seen2 = {};
    villains.forEach(function (v) { seen2[v.pos] = true; });
    if (hand.heroPos) seen2[hand.heroPos] = true;
    STREET_ORDER.forEach(function (st) {
      (((hand.streets || {})[st]) || []).forEach(function (a) {
        var pos = (hand.positions && hand.positions[a.player]) || a.player;
        if (!pos || seen2[pos]) return;
        seen2[pos] = true;
        villains.push({
          pos: pos,
          cards: [],
          stackBB: normalizeStackBB(seatStacks[pos], defaultSt)
        });
      });
    });
    var seatedN = hand.playersSeated != null
      ? hand.playersSeated
      : (1 + villains.length);
    return ensureVillainsFromActions({
      format: hand.format === '9max' || hand.formatKey === 'cash9' || hand.formatKey === 'mtt9' ? '9max' : '6max',
      formatHub: hub,
      tournamentType: hand.tournamentType || 'unknown',
      mttPhase: hand.mttPhase || 'auto',
      playersSeated: seatedN,
      tableMax: hand.tableMax,
      heroPos: hand.heroPos,
      heroCards: (hand.heroCards || []).slice(0, 2),
      heroStackBB: normalizeStackBB(hand.stackDepthBB != null ? hand.stackDepthBB : seatStacks[hand.heroPos], defaultSt),
      villains: villains,
      board: (hand.boardAll || hand.board || []).slice(0, 5),
      bbEuro: normalizeBbEuro(hand.bbEuro != null ? hand.bbEuro : hand.bb),
      anteBB: normalizeAnteBB(
        hand.anteBB != null ? hand.anteBB
          : (hand.ante && hand.bb ? hand.ante / hand.bb : 0)
      ),
      playersLeft: hand.playersLeft,
      placesPaid: hand.placesPaid,
      entries: hand.entries,
      buyIn: hand.buyIn,
      mttStructureSituation: hand.mttStructureSituation || null,
      spinPayout: hand.spinPayout || null,
      actions: actionsSpecFromHand(hand)
    });
  }

  /**
   * Genera una nueva mano de análisis con el POV de un villano (cartas conocidas).
   * El héroe original pasa a ser villano con sus cartas.
   */
  function swapHeroWithVillain(hand, villainPos) {
    if (!hand || !villainPos) return { ok: false, error: 'missing' };
    var base = ensureHandSpec(hand);
    var target = null;
    (base.villains || []).forEach(function (v) {
      if (v && v.pos === villainPos && v.cards && v.cards.length === 2) target = v;
    });
    if (!target) return { ok: false, error: 'no_cards' };
    if (villainPos === base.heroPos) return { ok: false, error: 'same_seat' };

    var oldHeroPos = base.heroPos;
    var oldHeroCards = (base.heroCards || []).slice(0, 2);
    var newVillains = (base.villains || [])
      .filter(function (v) { return v && v.pos && v.pos !== villainPos; })
      .map(function (v) {
        return { pos: v.pos, cards: (v.cards || []).slice(0, 2) };
      });
    newVillains.push({ pos: oldHeroPos, cards: oldHeroCards });

    var baseName = hand.savedName || ((hand.heroCode || '') + ' · ' + (hand.heroPos || ''));
    var newSpec = {
      format: base.format,
      heroPos: villainPos,
      heroCards: target.cards.slice(0, 2),
      villains: newVillains,
      board: (base.board || []).slice(0, 5),
      bbEuro: base.bbEuro,
      anteBB: normalizeAnteBB(base.anteBB),
      actions: {
        preflop: (base.actions.preflop || []).map(cloneAct),
        flop: (base.actions.flop || []).map(cloneAct),
        turn: (base.actions.turn || []).map(cloneAct),
        river: (base.actions.river || []).map(cloneAct)
      },
      _source: 'manual-swap',
      _name: String(baseName).replace(/\s*\(como [A-Z0-9]+\)$/, '') + ' (como ' + villainPos + ')'
    };

    var errs = validateSpec(newSpec);
    if (errs.length) return { ok: false, error: 'invalid', details: errs };

    var check = canSave();
    if (!check.ok) return { ok: false, error: 'analysis_limit', limit: check.limit };

    var analyzed;
    try {
      analyzed = buildAnalyzedHand(newSpec, 'manual-swap');
    } catch (e) {
      return { ok: false, error: 'analyze', message: (e && e.message) || String(e) };
    }
    var res = saveHand(analyzed);
    if (!res.ok) return res;
    return { ok: true, hand: res.hand || analyzed };
  }

  // ---------- persistencia / límites ----------
  function getHands() {
    return (global.Store && global.Store.getAnalysisHands) ? global.Store.getAnalysisHands() : [];
  }
  function handsMax() {
    if (global.PTEntitlements && global.PTEntitlements.analysisHandsMax) {
      return global.PTEntitlements.analysisHandsMax();
    }
    return 5;
  }
  function canSave() {
    var count = getHands().length;
    if (global.PTEntitlements && global.PTEntitlements.canSaveAnalysisHand) {
      return global.PTEntitlements.canSaveAnalysisHand(count);
    }
    return { ok: count < 5, used: count, limit: 5 };
  }

  function saveHand(analyzed) {
    var check = canSave();
    if (!check.ok) {
      return { ok: false, error: 'analysis_limit', limit: check.limit };
    }
    if (global.Store && global.Store.saveAnalysisHand) {
      return global.Store.saveAnalysisHand(analyzed);
    }
    return { ok: false, error: 'no_store' };
  }

  function updateHand(analyzed) {
    if (global.Store && global.Store.updateAnalysisHand) {
      return global.Store.updateAnalysisHand(analyzed);
    }
    return { ok: false, error: 'no_store' };
  }

  // ---------- draft / asientos / acciones ----------
  function emptyActions() {
    return { preflop: [], flop: [], turn: [], river: [] };
  }

  function emptyDraft(fmt) {
    var f = fmt === '9max' ? '9max' : '6max';
    var hub = 'cash';
    var seated = f === '9max' ? 9 : 6;
    var ring = ringFor(f, seated);
    var stack = defaultStackBB(hub);
    var d = {
      format: f,
      formatHub: hub,
      tournamentType: 'unknown',
      mttPhase: 'auto',
      playersSeated: seated,
      tableMax: seated,
      heroPos: ring[0],
      heroCards: [],
      heroStackBB: stack,
      villains: [],
      boardFlop: [],
      boardTurn: [],
      boardRiver: [],
      bbEuro: 0.05,
      anteBB: 0,
      playersLeft: null,
      placesPaid: null,
      entries: null,
      buyIn: null,
      mttStructureSituation: null,
      spinPayout: null,
      actions: emptyActions()
    };
    syncVillainCount(d);
    return d;
  }

  function draftFromSpec(spec) {
    var board = (spec.board || []).slice();
    var hub = spec.formatHub
      || (spec.anteBB > 0 || spec.gameKind === 'mtt' || spec.gameKind === 'sng' ? 'mtt'
        : (spec.gameKind === 'spin' ? 'spin' : 'cash'));
    var f = spec.format === '9max' ? '9max' : '6max';
    if (hub === 'spin') f = '6max';
    var d = emptyDraft(f);
    d.formatHub = hub;
    d.tournamentType = spec.tournamentType || 'unknown';
    d.mttPhase = spec.mttPhase || 'auto';
    d.heroPos = spec.heroPos || d.heroPos;
    d.heroCards = (spec.heroCards || []).slice(0, 2);
    d.bbEuro = normalizeBbEuro(spec.bbEuro != null ? spec.bbEuro : 0.05);
    d.anteBB = normalizeAnteBB(spec.anteBB != null ? spec.anteBB : 0);
    d.heroStackBB = normalizeStackBB(spec.heroStackBB, defaultStackBB(hub));
    d.playersLeft = spec.playersLeft != null ? spec.playersLeft : null;
    d.placesPaid = spec.placesPaid != null ? spec.placesPaid : null;
    d.entries = spec.entries != null ? spec.entries : null;
    d.buyIn = spec.buyIn != null ? spec.buyIn : null;
    d.mttStructureSituation = spec.mttStructureSituation || null;
    d.spinPayout = spec.spinPayout || null;
    var villains = (spec.villains && spec.villains.length)
      ? spec.villains.map(function (v) {
          return {
            pos: v.pos || '',
            cards: (v.cards || []).slice(0, 2),
            stackBB: normalizeStackBB(v.stackBB, d.heroStackBB)
          };
        })
      : [];
    var seated = spec.playersSeated != null
      ? Number(spec.playersSeated)
      : (1 + villains.filter(function (v) { return v.pos; }).length);
    if (!(seated >= 2)) seated = Math.max(2, 1 + villains.length);
    d.playersSeated = seated;
    d.tableMax = spec.tableMax != null ? spec.tableMax : maxPlayersForFormat(f, hub);
    d.villains = villains;
    syncVillainCount(d);
    d.boardFlop = board.slice(0, 3);
    d.boardTurn = board.slice(3, 4);
    d.boardRiver = board.slice(4, 5);
    d.actions = {
      preflop: ((spec.actions && spec.actions.preflop) || []).map(cloneAct),
      flop: ((spec.actions && spec.actions.flop) || []).map(cloneAct),
      turn: ((spec.actions && spec.actions.turn) || []).map(cloneAct),
      river: ((spec.actions && spec.actions.river) || []).map(cloneAct)
    };
    return d;
  }

  function cloneAct(a) {
    return {
      pos: a.pos,
      action: a.action || 'check',
      amountBB: a.amountBB != null && isFinite(Number(a.amountBB)) ? Number(a.amountBB) : null
    };
  }

  function takenSeats(draft, excludeVillainIdx) {
    var taken = {};
    if (draft.heroPos) taken[draft.heroPos] = 'hero';
    (draft.villains || []).forEach(function (v, i) {
      if (excludeVillainIdx != null && i === excludeVillainIdx) return;
      if (v && v.pos) taken[v.pos] = 'villain';
    });
    return taken;
  }

  function selectedPlayers(draft) {
    var list = [];
    if (draft.heroPos) list.push(draft.heroPos);
    (draft.villains || []).forEach(function (v) {
      if (v && v.pos && list.indexOf(v.pos) < 0) list.push(v.pos);
    });
    return sortByRing(draft.format, list, draft.playersSeated);
  }

  function foldStreetOf(draft, pos) {
    for (var i = 0; i < STREET_ORDER.length; i++) {
      var st = STREET_ORDER[i];
      var acts = (draft.actions && draft.actions[st]) || [];
      for (var j = 0; j < acts.length; j++) {
        if (acts[j].pos === pos && acts[j].action === 'fold') return st;
      }
    }
    return null;
  }

  function streetIndex(st) {
    var i = STREET_ORDER.indexOf(st);
    return i < 0 ? 0 : i;
  }

  /** Jugadores activos en una calle (sin fold en calles anteriores). */
  function activePlayersForStreet(draft, street) {
    var si = streetIndex(street);
    return selectedPlayers(draft).filter(function (pos) {
      var fs = foldStreetOf(draft, pos);
      if (!fs) return true;
      return streetIndex(fs) >= si;
    });
  }

  function defaultActionForStreet(street) {
    // No usar fold por defecto: un fold elimina automáticamente
    // las acciones de esa posición en calles posteriores.
    return street === 'preflop' ? 'call' : 'check';
  }

  function usedCardsExcept(draft, exceptKey, exceptVIdx) {
    var used = {};
    function mark(list) {
      (list || []).forEach(function (c) { if (c) used[c] = true; });
    }
    if (exceptKey !== 'hero') mark(draft.heroCards);
    (draft.villains || []).forEach(function (v, i) {
      if (exceptKey === 'villain' && i === exceptVIdx) return;
      mark(v.cards);
    });
    if (exceptKey !== 'flop') mark(draft.boardFlop);
    if (exceptKey !== 'turn') mark(draft.boardTurn);
    if (exceptKey !== 'river') mark(draft.boardRiver);
    return used;
  }

  function allUsedCards(draft) {
    return usedCardsExcept(draft, null, null);
  }

  function draftToSpec(draft) {
    var hub = draft.formatHub || 'cash';
    var heroStackBB = normalizeStackBB(draft.heroStackBB, defaultStackBB(hub));
    return {
      format: draft.format,
      formatHub: hub,
      tournamentType: draft.tournamentType || 'unknown',
      mttPhase: draft.mttPhase || 'auto',
      playersSeated: draft.playersSeated,
      tableMax: draft.tableMax != null ? draft.tableMax : maxPlayersForFormat(draft.format, hub),
      heroPos: draft.heroPos,
      heroCards: (draft.heroCards || []).slice(0, 2),
      heroStackBB: heroStackBB,
      bbEuro: normalizeBbEuro(draft.bbEuro),
      anteBB: normalizeAnteBB(draft.anteBB),
      playersLeft: draft.playersLeft != null && draft.playersLeft !== '' ? Number(draft.playersLeft) : null,
      placesPaid: draft.placesPaid != null && draft.placesPaid !== '' ? Number(draft.placesPaid) : null,
      entries: draft.entries != null && draft.entries !== '' ? Number(draft.entries) : null,
      buyIn: draft.buyIn != null && draft.buyIn !== '' ? Number(draft.buyIn) : null,
      mttStructureSituation: draft.mttStructureSituation || null,
      spinPayout: draft.spinPayout || null,
      villains: (draft.villains || [])
        .filter(function (v) { return v && v.pos; })
        .map(function (v) {
          return {
            pos: v.pos,
            cards: (v.cards || []).slice(0, 2),
            stackBB: normalizeStackBB(v.stackBB, heroStackBB)
          };
        }),
      board: [].concat(draft.boardFlop || [], draft.boardTurn || [], draft.boardRiver || []),
      actions: {
        preflop: (draft.actions.preflop || []).map(cloneAct),
        flop: (draft.actions.flop || []).map(cloneAct),
        turn: (draft.actions.turn || []).map(cloneAct),
        river: (draft.actions.river || []).map(cloneAct)
      },
      _source: 'manual',
      _id: S.editId || null,
      _createdAt: (S.editMeta && S.editMeta.createdAt) || null,
      _name: (S.editMeta && S.editMeta.savedName) || null
    };
  }

  // ---------- render: lista ----------
  function render(container) {
    if (container) S.container = container;
    if (!S.container) return;
    if (S.view === 'manual') return renderManual();
    if (S.view === 'text') return renderText();
    return renderList();
  }

  function aiAccessSnapshot() {
    if (!global.PTEntitlements || !global.PTEntitlements.canUseAI) {
      return { ok: false, reason: 'ai_plan' };
    }
    return global.PTEntitlements.canUseAI(global.PTEntitlements.get ? global.PTEntitlements.get() : null);
  }

  function requireAiAccess() {
    if (!global.PTEntitlements) {
      if (global.PTBilling && global.PTBilling.showPaywall) global.PTBilling.showPaywall('ai_plan');
      return Promise.resolve(false);
    }
    var load = global.PTEntitlements.refresh
      ? global.PTEntitlements.refresh()
      : (global.PTEntitlements.ensureLoaded
        ? global.PTEntitlements.ensureLoaded()
        : Promise.resolve(global.PTEntitlements.get && global.PTEntitlements.get()));
    return load.then(function (ent) {
      var check = global.PTEntitlements.canUseAI(ent);
      if (check.ok) return true;
      if (global.PTBilling && global.PTBilling.showPaywall) {
        global.PTBilling.showPaywall(check.reason || 'ai_plan');
      } else {
        alert('Añadir manos con IA requiere consultas IA de tu plan o un bono.');
      }
      return false;
    }).catch(function () {
      if (global.PTBilling && global.PTBilling.showPaywall) global.PTBilling.showPaywall('ai_plan');
      return false;
    });
  }

  function renderList() {
    var root = S.container;
    var hands = getHands();
    var max = handsMax();
    var used = hands.length;
    var aiOk = aiAccessSnapshot().ok;
    var html = '';
    html += '<div class="ha-intro">';
    html += '<h2 class="ha-title">Análisis de manos</h2>';
    html += '<p class="muted-text">Introduce una mano a mano (gratis, según el cupo de tu plan) o descríbela en texto con ForgeCoach (consume 1 consulta). Revísala paso a paso con GTO y vuelve a jugarla en el entrenador.</p>';
    html += '<div class="ha-actions-top">';
    html += '<button class="btn btn-primary" data-ha-new="manual">+ Añadir mano (manual)</button>';
    html += '<button class="btn btn-secondary" data-ha-new="text"' + (aiOk ? '' : ' title="Requiere consulta IA disponible"') + '>Añadir con IA (texto)</button>';
    html += '</div>';
    if (!aiOk) {
      html += '<p class="muted-text ha-ai-gate">Añadir con IA no está disponible en tu plan actual sin consultas. El plan Gratis no incluye IA; Study incluye 40/mes y Coach 150/mes, o usa un bono.</p>';
    }
    html += '<div class="ha-limit muted-text">Manos guardadas: <strong>' + used + ' / ' + max + '</strong>' +
      ' (Gratis 5 · Study 20 · Coach 100)' +
      (used >= max ? ' — límite del plan alcanzado. Borra alguna o mejora tu plan.' : '') + '</div>';
    html += '</div>';

    if (!hands.length) {
      html += '<div class="ha-empty"><p class="muted-text">Todavía no has guardado ninguna mano. Empieza añadiendo una.</p></div>';
    } else {
      html += '<div class="ha-list">';
      hands.forEach(function (h) {
        html += renderHandCard(h);
      });
      html += '</div>';
    }
    root.innerHTML = html;
    bindList();
  }

  function handTitle(h) {
    if (h.savedName) return esc(h.savedName);
    return esc((h.heroCode || '') + ' · ' + (h.heroPos || ''));
  }

  function renderHandCard(h) {
    var boardStr = (h.boardAll && h.boardAll.length) ? cardsHTML(h.boardAll) : '<span class="muted-text">Preflop</span>';
    var acc = (typeof h.accuracy === 'number') ? (h.accuracy + '% acierto') : '';
    var scoreTxt = '';
    if (h.handScore == null && window.GTOScoring && GTOScoring.ensureHandScore) {
      try { GTOScoring.ensureHandScore(h); } catch (e) { /* ignore */ }
    }
    if (typeof h.handScore === 'number') {
      scoreTxt = 'Nota ' + (Math.round(h.handScore * 10) / 10).toFixed(1).replace(/\.0$/, '') + '/10';
    }
    var src = h.source === 'text' ? 'IA' : 'Manual';
    var when = '';
    try { when = new Date(h.createdAt).toLocaleDateString('es-ES'); } catch (e) { when = ''; }
    var html = '<div class="ha-card" data-ha-id="' + esc(h.id) + '">';
    html += '<div class="ha-card-head">';
    html += '<div class="ha-card-cards">' + cardsHTML(h.heroCards || []) + '</div>';
    html += '<div class="ha-card-info"><div class="ha-card-title">' + handTitle(h) + '</div>';
    html += '<div class="ha-card-sub muted-text">' + esc(src) + (when ? ' · ' + esc(when) : '') +
      (acc ? ' · ' + esc(acc) : '') + (scoreTxt ? ' · ' + esc(scoreTxt) : '') + '</div></div>';
    html += '</div>';
    html += '<div class="ha-card-board">' + boardStr + '</div>';
    html += '<div class="ha-card-actions">';
    html += '<button class="btn btn-small btn-secondary" data-ha-review="' + esc(h.id) + '">Ver paso a paso</button>';
    if (global.PTSchoolCoachQuiz && global.PTSchoolCoachQuiz.canBuildQuiz(h)) {
      html += '<button class="btn btn-small btn-secondary" data-ha-quiz="' + esc(h.id) + '">Quiz Escuela</button>';
    }
    html += '<button class="btn btn-small btn-secondary" data-ha-edit="' + esc(h.id) + '">Editar</button>';
    html += '<button class="btn btn-small btn-primary" data-ha-play="' + esc(h.id) + '">Jugar en entrenador</button>';
    html += '<button class="btn btn-small btn-ghost" data-ha-del="' + esc(h.id) + '">Borrar</button>';
    html += '</div>';
    html += '<div class="ha-play-panel hidden" data-ha-play-panel="' + esc(h.id) + '"></div>';
    html += '<div class="ha-quiz-panel hidden" data-ha-quiz-panel="' + esc(h.id) + '"></div>';
    html += '</div>';
    return html;
  }

  function bindList() {
    var root = S.container;
    root.querySelectorAll('[data-ha-new]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.dataset.haNew;
        if (v === 'manual') {
          S.editId = null;
          S.editMeta = null;
          S.picker = null;
          closeCardPickerModal();
          S.draft = emptyDraft(S.format);
          syncActionsFromSeats(S.draft);
          S.view = 'manual';
          render();
          return;
        }
        requireAiAccess().then(function (ok) {
          if (!ok) return;
          S.view = 'text';
          render();
        });
      });
    });
    root.querySelectorAll('[data-ha-review]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var h = global.Store.getAnalysisHand(btn.dataset.haReview);
        if (h && global.openAnalysisHandReview) global.openAnalysisHandReview(h, 'review');
      });
    });
    root.querySelectorAll('[data-ha-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { startEditHand(btn.dataset.haEdit); });
    });
    root.querySelectorAll('[data-ha-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('¿Borrar esta mano guardada?')) return;
        global.Store.removeAnalysisHand(btn.dataset.haDel);
        render();
      });
    });
    root.querySelectorAll('[data-ha-play]').forEach(function (btn) {
      btn.addEventListener('click', function () { togglePlayPanel(btn.dataset.haPlay); });
    });
    root.querySelectorAll('[data-ha-quiz]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleQuizPanel(btn.dataset.haQuiz); });
    });
  }

  function toggleQuizPanel(id) {
    var panel = S.container.querySelector('[data-ha-quiz-panel="' + CSS.escape(id) + '"]');
    if (!panel) return;
    if (!panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }
    var hand = global.Store.getAnalysisHand(id);
    var CQ = global.PTSchoolCoachQuiz;
    if (!hand || !CQ || !CQ.renderPanelHtml) return;
    panel.innerHTML = CQ.renderPanelHtml(hand);
    panel.classList.remove('hidden');
    CQ.mountPanel(panel, hand, function () {
      panel.classList.add('hidden');
    });
  }

  function startEditHand(id) {
    var h = global.Store.getAnalysisHand(id);
    if (!h) return;
    // ensureHandSpec completa villanos desde acciones (manos IA a menudo
    // guardan acciones de todos los asientos pero villains vacío).
    var spec = ensureHandSpec(h);
    if (!spec.villains || !spec.villains.length) spec.villains = [{ pos: '', cards: [] }];
    S.editId = h.id;
    S.editMeta = {
      createdAt: h.createdAt,
      savedName: h.savedName,
      coachThread: h.coachThread,
      aiAnalysis: h.aiAnalysis,
      source: h.source
    };
    S.picker = null;
    closeCardPickerModal();
    S.format = spec.format === '9max' ? '9max' : '6max';
    S.draft = draftFromSpec(spec);
    ensureUniqueSeats(S.draft);
    syncActionsFromSeats(S.draft);
    S.view = 'manual';
    render();
  }

  function ensureUniqueSeats(draft) {
    var seen = {};
    if (draft.heroPos) seen[draft.heroPos] = true;
    (draft.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      if (seen[v.pos]) v.pos = '';
      else seen[v.pos] = true;
    });
  }

  function togglePlayPanel(id) {
    var panel = S.container.querySelector('[data-ha-play-panel="' + CSS.escape(id) + '"]');
    if (!panel) return;
    if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
    panel.innerHTML = renderPlayPanel(id);
    panel.classList.remove('hidden');
    bindPlayPanel(panel, id);
  }

  function renderPlayPanel(id) {
    var html = '<div class="ha-play-opts">';
    html += '<div class="ha-opt-group"><span class="ha-opt-label">Tipo de villano</span><div class="ha-chips" data-ha-villain>';
    VILLAIN_LEVELS.forEach(function (v, i) {
      html += '<button class="ha-chip' + (i === 0 ? ' active' : '') + '" data-val="' + v.val + '">' + esc(v.label) + '</button>';
    });
    html += '</div></div>';
    html += '<div class="ha-opt-group"><span class="ha-opt-label">Mesa</span><div class="ha-chips" data-ha-theme>';
    THEMES.forEach(function (t, i) {
      html += '<button class="ha-chip' + (i === 0 ? ' active' : '') + '" data-val="' + t.val + '">' + esc(t.label) + '</button>';
    });
    html += '</div></div>';
    html += '<button class="btn btn-primary btn-small" data-ha-play-go="' + esc(id) + '">Jugar esta mano &raquo;</button>';
    html += '</div>';
    return html;
  }

  function bindPlayPanel(panel, id) {
    panel.querySelectorAll('.ha-chips').forEach(function (group) {
      group.querySelectorAll('.ha-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          group.querySelectorAll('.ha-chip').forEach(function (c) { c.classList.remove('active'); });
          chip.classList.add('active');
        });
      });
    });
    var go = panel.querySelector('[data-ha-play-go]');
    if (go) go.addEventListener('click', function () {
      var vl = (panel.querySelector('[data-ha-villain] .ha-chip.active') || {}).dataset;
      var th = (panel.querySelector('[data-ha-theme] .ha-chip.active') || {}).dataset;
      var hand = global.Store.getAnalysisHand(id);
      if (!hand) return;
      var cfg = toTrainerConfig(hand, vl ? vl.val : 'pro', th ? th.val : 'emerald');
      if (global.playAnalysisHand) global.playAnalysisHand(cfg.force, cfg.playConfig);
    });
  }

  // ---------- card picker (imágenes) ----------
  function cardSlotHTML(cards, max, key, vIdx) {
    var html = '<div class="ha-card-slots" data-ha-pick="' + esc(key) + '"' +
      (vIdx != null ? ' data-vidx="' + vIdx + '"' : '') + ' data-max="' + max + '">';
    for (var i = 0; i < max; i++) {
      if (cards[i]) {
        html += '<button type="button" class="ha-card-slot filled" data-slot="' + i + '" aria-label="Carta ' + esc(cards[i]) + '">' +
          cardHTML(cards[i]) + '</button>';
      } else {
        html += '<button type="button" class="ha-card-slot empty" data-slot="' + i + '" aria-label="Elegir carta">+</button>';
      }
    }
    if (cards.length) {
      html += '<button type="button" class="ha-card-clear" data-ha-clear-cards="' + esc(key) + '"' +
        (vIdx != null ? ' data-vidx="' + vIdx + '"' : '') + '>Limpiar</button>';
    }
    html += '</div>';
    return html;
  }

  function pickerTitleForKey(key) {
    return {
      hero: 'Cartas del héroe',
      villain: 'Cartas del villano',
      flop: 'Flop (3 cartas)',
      turn: 'Turn (1 carta)',
      river: 'River (1 carta)'
    }[key] || 'Elegir cartas';
  }

  function openCardPickerModal(draft, key, max, vIdx) {
    if (!global.PTCardPicker || typeof global.PTCardPicker.open !== 'function') return;
    global.PTCardPicker.open({
      title: pickerTitleForKey(key),
      max: max,
      selected: getPickTargetCards(draft, key, vIdx).slice(),
      blocked: usedCardsExcept(draft, key, vIdx),
      onDone: function (cards) {
        setPickTargetCards(draft, key, vIdx, cards || []);
        refreshManualKeepScroll();
      }
    });
  }

  function closeCardPickerModal() {
    if (global.PTCardPicker && typeof global.PTCardPicker.close === 'function' && global.PTCardPicker.isOpen()) {
      global.PTCardPicker.close(false);
    }
  }

  function getPickTargetCards(draft, key, vIdx) {
    if (key === 'hero') return draft.heroCards || [];
    if (key === 'villain') {
      var v = draft.villains[vIdx];
      return (v && v.cards) || [];
    }
    if (key === 'flop') return draft.boardFlop || [];
    if (key === 'turn') return draft.boardTurn || [];
    if (key === 'river') return draft.boardRiver || [];
    return [];
  }

  function setPickTargetCards(draft, key, vIdx, cards) {
    if (key === 'hero') draft.heroCards = cards.slice(0, 2);
    else if (key === 'villain' && draft.villains[vIdx]) draft.villains[vIdx].cards = cards.slice(0, 2);
    else if (key === 'flop') draft.boardFlop = cards.slice(0, 3);
    else if (key === 'turn') draft.boardTurn = cards.slice(0, 1);
    else if (key === 'river') draft.boardRiver = cards.slice(0, 1);
  }

  // ---------- render: formulario manual ----------
  function posOptions(draftOrFmt, selected, taken) {
    var fmt = typeof draftOrFmt === 'string' ? draftOrFmt : draftOrFmt.format;
    var seated = typeof draftOrFmt === 'string' ? null : draftOrFmt.playersSeated;
    return ringFor(fmt, seated).map(function (p) {
      if (taken && taken[p] && p !== selected) return '';
      return '<option value="' + p + '"' + (p === selected ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
  }

  function actionPosOptions(players, selected) {
    return (players || []).map(function (p) {
      return '<option value="' + p + '"' + (p === selected ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
  }

  function parseAmountInput(raw) {
    if (raw == null) return null;
    var s = String(raw).trim().replace(',', '.');
    if (!s) return null;
    var amt = parseFloat(s);
    return isFinite(amt) ? amt : null;
  }

  function actionRowHTML(st, act, players) {
    var html = '<div class="ha-action-row" data-street="' + st + '" data-pos="' + esc(act.pos) + '">';
    html += '<select class="ha-apos" data-ha-apos data-street="' + st + '">';
    html += actionPosOptions(players, act.pos);
    html += '</select>';
    html += '<select class="ha-aact" data-ha-act data-street="' + st + '">';
    Object.keys(ACTION_LABELS).forEach(function (k) {
      html += '<option value="' + k + '"' + (k === act.action ? ' selected' : '') + '>' + esc(ACTION_LABELS[k]) + '</option>';
    });
    html += '</select>';
    var ph = act.action === 'raise' ? 'hasta bb' : (act.action === 'call' ? 'auto' : 'bb');
    html += '<input class="ha-aamt" type="number" min="0" step="any" inputmode="decimal" placeholder="' + ph +
      '" data-ha-amt data-street="' + st + '"' +
      (act.amountBB != null ? ' value="' + esc(String(act.amountBB)) + '"' : '') + ' />';
    html += '<button type="button" class="ha-row-del" data-ha-del-row aria-label="Quitar">&times;</button>';
    html += '</div>';
    return html;
  }

  function readStreetRows(listEl) {
    var rows = [];
    if (!listEl) return rows;
    listEl.querySelectorAll('.ha-action-row').forEach(function (row) {
      var posEl = row.querySelector('[data-ha-apos]');
      var actEl = row.querySelector('[data-ha-act]');
      var amtEl = row.querySelector('[data-ha-amt]');
      rows.push({
        pos: posEl ? posEl.value : '',
        action: actEl ? actEl.value : 'fold',
        amountBB: amtEl ? parseAmountInput(amtEl.value) : null
      });
    });
    return rows;
  }

  function syncStreetInputs(listEl, street, opts) {
    if (!listEl) return;
    opts = opts || {};
    var fillDefaults = !!opts.fillDefaults;
    // forceCalls se acepta por compatibilidad; los calls manuales ya no se pisan.
    var active = global.document && global.document.activeElement;
    var computed = computeStreetDisplayActions(street, readStreetRows(listEl), { fillDefaults: fillDefaults });
    listEl.querySelectorAll('.ha-action-row').forEach(function (row, idx) {
      var data = computed[idx] || { action: 'fold', amountBB: null, derivedAmountBB: null, amountLocked: false };
      var amtEl = row.querySelector('[data-ha-amt]');
      if (!amtEl) return;
      var focused = active === amtEl;
      var locked = data.action === 'check' || data.action === 'fold';
      amtEl.disabled = locked;
      if (data.action === 'call') amtEl.placeholder = 'auto';
      else if (data.action === 'raise') amtEl.placeholder = 'hasta bb';
      else amtEl.placeholder = 'bb';

      if (locked) {
        amtEl.value = '';
        return;
      }
      // Nunca pisar el campo mientras se edita: permite borrar y escribir de cero.
      if (focused && !forceCalls) return;

      if (data.action === 'call') {
        var callShown = data.derivedAmountBB;
        var curCall = parseAmountInput(amtEl.value);
        // Actualiza el auto si está vacío, o si el valor actual era el auto previo
        // (atributo) y cambió el bet/raise anterior. Nunca pisar un importe manual
        // (forceCalls/fillDefaults no deben borrar lo que el usuario escribió).
        var prevAuto = amtEl.dataset.haAuto;
        var wasAuto = prevAuto != null && curCall != null && String(curCall) === String(Number(prevAuto));
        if (callShown == null) {
          amtEl.value = '';
          delete amtEl.dataset.haAuto;
        } else if (curCall == null || wasAuto) {
          amtEl.value = String(callShown);
          amtEl.dataset.haAuto = String(callShown);
        } else {
          amtEl.dataset.haAuto = String(callShown);
        }
        return;
      }

      var shown = data.amountBB;
      if (shown == null || shown === '') {
        // Vacío a propósito mientras se escribe; no forzar default aquí.
        if (fillDefaults) {
          // no-op: fillDefaults ya se aplicó en compute → amountBB
        }
        return;
      }
      if (String(parseAmountInput(amtEl.value)) !== String(shown)) {
        amtEl.value = String(shown);
      }
    });
  }

  function syncAllStreetInputs(root, opts) {
    STREET_ORDER.forEach(function (st) {
      syncStreetInputs(root.querySelector('[data-street-list="' + st + '"]'), st, opts);
    });
  }

  function commitDraftActionsFromDom(root, draft) {
    STREET_ORDER.forEach(function (st) {
      var list = root.querySelector('[data-street-list="' + st + '"]');
      draft.actions[st] = readStreetRows(list);
    });
  }

  function finalizeDraftAmounts(draft) {
    STREET_ORDER.forEach(function (st) {
      draft.actions[st] = fillActionAmounts(st, draft.actions[st] || []);
    });
  }

  function defaultSeatForStreet(draft, street) {
    var players = sortBySpeakingOrder(draft.format, street, activePlayersForStreet(draft, street));
    if (!players.length) return draft.heroPos || '';
    var acts = draft.actions[street] || [];
    if (!acts.length) return players[0];
    var last = acts[acts.length - 1] && acts[acts.length - 1].pos;
    var idx = players.indexOf(last);
    if (idx < 0) return players[0];
    return players[(idx + 1) % players.length];
  }

  function addActionRowToDraft(draft, street, preset) {
    var row = Object.assign({
      pos: defaultSeatForStreet(draft, street),
      action: street === 'preflop' ? 'call' : 'check',
      amountBB: null
    }, preset || {});
    if (!draft.actions[street]) draft.actions[street] = [];
    draft.actions[street].push(row);
  }

  function ensureVisibleActionRows(draft) {
    STREET_ORDER.forEach(function (st) {
      var players = sortBySpeakingOrder(draft.format, st, activePlayersForStreet(draft, st));
      if (!players.length) {
        draft.actions[st] = [];
        return;
      }
      var acts = (draft.actions[st] || []).slice();
      if (!acts.length) {
        // Solo al crear filas nuevas: orden de habla. Si ya hay acciones
        // (p. ej. mano IA), se conserva el orden cronológico.
        draft.actions[st] = players.map(function (pos) {
          return { pos: pos, action: defaultActionForStreet(st), amountBB: null };
        });
        return;
      }
      var present = {};
      acts.forEach(function (a) { if (a && a.pos) present[a.pos] = true; });
      var missing = players.filter(function (pos) { return !present[pos]; });
      if (!missing.length) return;
      missing.forEach(function (pos) {
        var insertAt = acts.length;
        for (var i = 0; i < acts.length; i++) {
          if (acts[i] && acts[i].pos && speaksBefore(draft.format, st, pos, acts[i].pos)) {
            insertAt = i;
            break;
          }
        }
        acts.splice(insertAt, 0, { pos: pos, action: defaultActionForStreet(st), amountBB: null });
      });
      draft.actions[st] = acts;
    });
  }

  /** Renombra una posición en todas las acciones (al cambiar héroe/villano de asiento). */
  function remapActionPositions(draft, fromPos, toPos) {
    if (!fromPos || !toPos || fromPos === toPos) return;
    STREET_ORDER.forEach(function (st) {
      (draft.actions[st] || []).forEach(function (a) {
        if (a && a.pos === fromPos) a.pos = toPos;
      });
    });
  }

  function syncActionsFromSeats(draft) {
    var selected = {};
    selectedPlayers(draft).forEach(function (pos) { selected[pos] = true; });
    var foldedEarlier = {};
    STREET_ORDER.forEach(function (st) {
      var acts = (draft.actions[st] || []).filter(function (a) {
        return a && a.pos && selected[a.pos] && !foldedEarlier[a.pos];
      }).map(cloneAct);
      draft.actions[st] = acts;
      acts.forEach(function (a) {
        if (a.action === 'fold') foldedEarlier[a.pos] = true;
      });
    });
    ensureVisibleActionRows(draft);
  }

  function villainRowHTML(draft, v, idx) {
    var taken = takenSeats(draft, idx);
    var html = '<div class="ha-villain-row" data-vidx="' + idx + '">';
    html += '<select class="ha-vpos" data-ha-vpos="' + idx + '">';
    html += '<option value="">— asiento —</option>';
    html += posOptions(draft, v.pos, taken);
    html += '</select>';
    html += '<label class="ha-vstack-label muted-text">Stack';
    html += '<input class="ha-vstack" type="number" min="1" max="500" step="any" inputmode="decimal" data-ha-vstack="' + idx + '" value="' +
      esc(String(v.stackBB != null ? v.stackBB : (draft.heroStackBB != null ? draft.heroStackBB : 100))) + '" />';
    html += '<span class="muted-text">bb</span></label>';
    html += cardSlotHTML(v.cards || [], 2, 'villain', idx);
    html += '<button type="button" class="ha-row-del" data-ha-del-vrow="' + idx + '" aria-label="Quitar">&times;</button>';
    html += '</div>';
    return html;
  }

  function heroPosChipsHTML(draft) {
    var taken = takenSeats(draft, null);
    var html = '';
    draftRing(draft).forEach(function (p) {
      if (taken[p] === 'villain' && p !== draft.heroPos) return;
      html += '<button type="button" class="ha-chip' + (p === draft.heroPos ? ' active' : '') +
        '" data-ha-hero-pos="' + p + '">' + p + '</button>';
    });
    return html;
  }

  function playersSeatedChipsHTML(draft) {
    var maxP = maxPlayersForFormat(draft.format, draft.formatHub);
    var html = '';
    for (var n = 2; n <= maxP; n++) {
      var label = n === 2 ? 'HU' : String(n);
      html += '<button type="button" class="ha-chip' + (n === draft.playersSeated ? ' active' : '') +
        '" data-ha-seated="' + n + '">' + label + '</button>';
    }
    return html;
  }

  function renderManual() {
    var root = S.container;
    if (!S.draft) {
      S.draft = emptyDraft(S.format);
      syncActionsFromSeats(S.draft);
    }
    var draft = S.draft;
    syncVillainCount(draft);
    var editing = !!S.editId;
    var hub = draft.formatHub || 'cash';
    var isTourney = hub === 'mtt' || hub === 'spin';
    var Tax = global.PTFormatTaxonomy;
    var TC = global.PTTournamentContext;
    var typeLabels = (Tax && Tax.TOURNAMENT_TYPE_LABELS)
      || (TC && TC.TOURNAMENT_TYPE_LABELS)
      || { vanilla: 'Vanilla', pko: 'PKO', mystery: 'Mystery', unknown: 'No sé' };
    var phaseLabels = (Tax && Tax.PHASE_LABELS) || {
      auto: 'Auto', early: 'Early', mid: 'Mid', short: 'Short', push: 'Push/fold', bubble: 'Burbuja'
    };
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver</button>';
    html += '<h2 class="ha-title">' + (editing ? 'Editar mano' : 'Añadir mano manualmente') + '</h2>';
    html += '<p class="muted-text">El análisis manual está incluido gratis. Configura mesa, stacks y acciones; en torneo se usan fase y stacks reales para evaluar.</p>';

    html += '<div class="ha-form">';

    html += '<div class="ha-field"><label>Modo de juego</label><div class="ha-chips ha-hub">';
    [['cash', 'Cash'], ['spin', 'Spins'], ['mtt', 'Torneos']].forEach(function (h) {
      html += '<button type="button" class="ha-chip' + (h[0] === hub ? ' active' : '') + '" data-ha-hub="' + h[0] + '">' + h[1] + '</button>';
    });
    html += '</div></div>';

    html += '<div class="ha-field"><label>Capacidad de mesa</label><div class="ha-chips ha-format">';
    if (hub === 'spin') {
      html += '<button type="button" class="ha-chip active" data-ha-format="6max">3-max</button>';
    } else {
      [['6max', '6-max'], ['9max', '9-max']].forEach(function (f) {
        html += '<button type="button" class="ha-chip' + (f[0] === draft.format ? ' active' : '') + '" data-ha-format="' + f[0] + '">' + f[1] + '</button>';
      });
    }
    html += '</div></div>';

    html += '<div class="ha-field"><label>Jugadores en mesa</label><div class="ha-chips ha-seated">';
    html += playersSeatedChipsHTML(draft);
    html += '</div>';
    html += '<span class="muted-text ha-bb-hint">HU = 2 jugadores. Define cuántos villanos hay (N−1) y qué posiciones están disponibles.</span>';
    html += '</div>';

    html += '<div class="ha-field ha-bb-field"><label for="ha-bb-euro">Valor de la BB (€)</label>';
    html += '<div class="ha-bb-row">';
    html += '<input id="ha-bb-euro" class="ha-bb-euro" type="number" min="0.01" max="100" step="0.01" data-ha-bb-euro value="' +
      esc(String(draft.bbEuro != null ? draft.bbEuro : 0.05)) + '" />';
    html += '<span class="muted-text ha-bb-hint">SB = mitad. Las acciones siguen en bb.</span>';
    html += '</div></div>';

    if (isTourney) {
      html += '<div class="ha-field ha-tourney-block"><label>Contexto de torneo</label>';
      html += '<div class="ha-chips ha-tourney-type">';
      ['vanilla', 'pko', 'mystery', 'unknown'].forEach(function (t) {
        html += '<button type="button" class="ha-chip' + (t === (draft.tournamentType || 'unknown') ? ' active' : '') +
          '" data-ha-ttype="' + t + '">' + esc(typeLabels[t] || t) + '</button>';
      });
      html += '</div>';
      html += '<div class="ha-chips ha-phase" style="margin-top:0.5rem">';
      ['auto', 'early', 'mid', 'short', 'push', 'bubble'].forEach(function (p) {
        html += '<button type="button" class="ha-chip' + (p === (draft.mttPhase || 'auto') ? ' active' : '') +
          '" data-ha-phase="' + p + '">' + esc(phaseLabels[p] || p) + '</button>';
      });
      html += '</div>';
      html += '<div class="ha-bb-row" style="margin-top:0.5rem">';
      html += '<label class="muted-text" for="ha-ante-bb">Ante (bb)</label>';
      html += '<input id="ha-ante-bb" class="ha-ante-bb" type="number" min="0" max="50" step="any" inputmode="decimal" data-ha-ante-bb value="' +
        esc(String(draft.anteBB != null ? draft.anteBB : 0)) + '" />';
      html += '</div>';
      html += '<div class="ha-bb-row" style="margin-top:0.5rem">';
      html += '<label class="muted-text" for="ha-mtt-sit">Situación ICM</label>';
      html += '<select id="ha-mtt-sit" data-ha-mtt-sit>';
      [['', '—'], ['auto', 'Según fase'], ['bubble', 'Burbuja'], ['mincash', 'Min-cash'], ['ft9', 'FT 9'], ['custom', 'Personalizado']].forEach(function (o) {
        html += '<option value="' + o[0] + '"' + ((draft.mttStructureSituation || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      });
      html += '</select></div>';
      if (draft.mttStructureSituation === 'custom' || draft.mttStructureSituation === 'bubble'
        || draft.mttStructureSituation === 'mincash' || draft.mttStructureSituation === 'ft9') {
        html += '<div class="ha-bb-row" style="margin-top:0.5rem">';
        html += '<input type="number" min="2" max="500" step="1" placeholder="Left" data-ha-players-left value="' +
          esc(draft.playersLeft != null ? String(draft.playersLeft) : '') + '" />';
        html += '<input type="number" min="1" max="500" step="1" placeholder="Paid" data-ha-places-paid value="' +
          esc(draft.placesPaid != null ? String(draft.placesPaid) : '') + '" />';
        html += '<input type="number" min="0" step="0.01" placeholder="Buy-in €" data-ha-buyin value="' +
          esc(draft.buyIn != null ? String(draft.buyIn) : '') + '" />';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<div class="ha-field ha-ante-field"><label for="ha-ante-bb">Ante (bb)</label>';
      html += '<div class="ha-bb-row">';
      html += '<input id="ha-ante-bb" class="ha-ante-bb" type="number" min="0" max="50" step="any" inputmode="decimal" data-ha-ante-bb value="' +
        esc(String(draft.anteBB != null ? draft.anteBB : 0)) + '" />';
      html += '<span class="muted-text ha-bb-hint">Normalmente 0 en cash.</span>';
      html += '</div></div>';
    }

    html += '<div class="ha-field"><label>Posición del héroe</label><div class="ha-chips ha-hero-pos">';
    html += heroPosChipsHTML(draft);
    html += '</div></div>';

    html += '<div class="ha-field"><label>Cartas del héroe</label>';
    html += cardSlotHTML(draft.heroCards, 2, 'hero', null);
    html += '<div class="ha-bb-row" style="margin-top:0.4rem">';
    html += '<label class="muted-text" for="ha-hero-stack">Stack héroe (bb)</label>';
    html += '<input id="ha-hero-stack" type="number" min="1" max="500" step="any" inputmode="decimal" data-ha-hero-stack value="' +
      esc(String(draft.heroStackBB != null ? draft.heroStackBB : defaultStackBB(hub))) + '" />';
    html += '</div></div>';

    html += '<div class="ha-field"><label>Villanos (asiento, stack y cartas si se conocen)</label>';
    html += '<div class="ha-villains">';
    (draft.villains || []).forEach(function (v, i) {
      html += villainRowHTML(draft, v, i);
    });
    html += '</div>';
    html += '<button type="button" class="btn btn-small btn-ghost" data-ha-add-villain>+ Añadir villano</button></div>';

    html += '<div class="ha-field ha-board-field"><label>Cartas comunitarias</label>';
    html += '<div class="ha-board-pickers">';
    html += '<div class="ha-board-group"><span class="ha-board-label">Flop</span>' + cardSlotHTML(draft.boardFlop, 3, 'flop', null) + '</div>';
    html += '<div class="ha-board-group"><span class="ha-board-label">Turn</span>' + cardSlotHTML(draft.boardTurn, 1, 'turn', null) + '</div>';
    html += '<div class="ha-board-group"><span class="ha-board-label">River</span>' + cardSlotHTML(draft.boardRiver, 1, 'river', null) + '</div>';
    html += '</div></div>';

    STREET_ORDER.forEach(function (st) {
      var acts = (draft.actions && draft.actions[st]) || [];
      var players = activePlayersForStreet(draft, st);
      html += '<div class="ha-field ha-street-field" data-street-field="' + st + '"><label>Acciones · ' + STREET_LABELS[st] + '</label>';
      html += '<p class="muted-text ha-street-hint">Cada fila es una acción en orden temporal. En subir, el valor es el total (hasta X bb).</p>';
      html += '<div class="ha-actions-list" data-street-list="' + st + '">';
      if (!acts.length) {
        html += '<p class="muted-text ha-street-empty">Selecciona héroe y villanos para cargar sus acciones.</p>';
      } else {
        acts.forEach(function (a) { html += actionRowHTML(st, a, players); });
      }
      html += '</div>';
      if (players.length) html += '<button type="button" class="btn btn-small btn-ghost" data-ha-add-action="' + st + '">+ Acción</button>';
      html += '</div>';
    });

    html += '<div class="ha-form-errors" data-ha-errors></div>';
    html += '<div class="ha-form-buttons">';
    html += '<button type="button" class="btn btn-primary" data-ha-manual-save>' +
      (editing ? 'Reanalizar y guardar' : 'Analizar y guardar') + '</button>';
    html += '</div>';

    html += '</div>';
    root.innerHTML = html;
    bindManual();
  }

  function refreshManualKeepScroll() {
    var y = window.scrollY || 0;
    renderManual();
    if (window.scrollTo) window.scrollTo(0, y);
  }

  function bindManual() {
    var root = S.container;
    var draft = S.draft;

    root.querySelector('[data-ha-back]').addEventListener('click', function () {
      closeCardPickerModal();
      S.view = 'list';
      S.draft = null;
      S.editId = null;
      S.editMeta = null;
      S.picker = null;
      render();
    });

    var bbInp = root.querySelector('[data-ha-bb-euro]');
    if (bbInp) {
      var syncBb = function () {
        draft.bbEuro = normalizeBbEuro(bbInp.value);
        bbInp.value = String(draft.bbEuro);
      };
      bbInp.addEventListener('change', syncBb);
      bbInp.addEventListener('blur', syncBb);
    }

    var anteInp = root.querySelector('[data-ha-ante-bb]');
    if (anteInp) {
      var syncAnte = function () {
        draft.anteBB = normalizeAnteBB(anteInp.value);
        anteInp.value = String(draft.anteBB);
      };
      anteInp.addEventListener('change', syncAnte);
      anteInp.addEventListener('blur', syncAnte);
    }

    var heroStackInp = root.querySelector('[data-ha-hero-stack]');
    if (heroStackInp) {
      var syncHeroStack = function () {
        draft.heroStackBB = normalizeStackBB(heroStackInp.value, defaultStackBB(draft.formatHub));
        heroStackInp.value = String(draft.heroStackBB);
      };
      heroStackInp.addEventListener('change', syncHeroStack);
      heroStackInp.addEventListener('blur', syncHeroStack);
    }

    root.querySelectorAll('[data-ha-vstack]').forEach(function (inp) {
      var syncV = function () {
        var idx = parseInt(inp.dataset.haVstack, 10);
        if (!draft.villains[idx]) return;
        draft.villains[idx].stackBB = normalizeStackBB(inp.value, draft.heroStackBB);
        inp.value = String(draft.villains[idx].stackBB);
      };
      inp.addEventListener('change', syncV);
      inp.addEventListener('blur', syncV);
    });

    root.querySelectorAll('[data-ha-hub]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hub = btn.dataset.haHub;
        if (hub === draft.formatHub) return;
        draft.formatHub = hub;
        if (hub === 'spin') {
          draft.format = '6max';
          draft.playersSeated = Math.min(draft.playersSeated || 3, 3);
          draft.tableMax = 3;
        } else {
          draft.tableMax = maxPlayersForFormat(draft.format, hub);
          if (draft.playersSeated > draft.tableMax) draft.playersSeated = draft.tableMax;
        }
        if (hub === 'cash') {
          draft.tournamentType = 'unknown';
          draft.mttPhase = 'auto';
          draft.anteBB = 0;
        } else if (draft.anteBB === 0) {
          var Tax = global.PTFormatTaxonomy;
          draft.anteBB = Tax && Tax.defaultAnteBB
            ? Tax.defaultAnteBB({ formatHub: hub, mttPhase: draft.mttPhase || 'auto', stackBB: draft.heroStackBB })
            : (hub === 'mtt' ? 0.125 : 0);
        }
        if (!(draft.heroStackBB > 0) || draft.heroStackBB === 100 || draft.heroStackBB === 40 || draft.heroStackBB === 25) {
          draft.heroStackBB = defaultStackBB(hub);
        }
        syncVillainCount(draft);
        ensureUniqueSeats(draft);
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-seated]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = parseInt(btn.dataset.haSeated, 10);
        if (n === draft.playersSeated) return;
        draft.playersSeated = n;
        syncVillainCount(draft);
        ensureUniqueSeats(draft);
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-ttype]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        draft.tournamentType = btn.dataset.haTtype || 'unknown';
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-phase]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        draft.mttPhase = btn.dataset.haPhase || 'auto';
        refreshManualKeepScroll();
      });
    });

    var sitSel = root.querySelector('[data-ha-mtt-sit]');
    if (sitSel) {
      sitSel.addEventListener('change', function () {
        draft.mttStructureSituation = sitSel.value || null;
        var Tax = global.PTFormatTaxonomy;
        if (draft.mttStructureSituation && Tax && Tax.structureFromSituation) {
          var fromSit = Tax.structureFromSituation(draft.mttStructureSituation, draft.buyIn);
          if (fromSit) {
            if (fromSit.playersLeft != null) draft.playersLeft = fromSit.playersLeft;
            if (fromSit.placesPaid != null) draft.placesPaid = fromSit.placesPaid;
            if (fromSit.entries != null) draft.entries = fromSit.entries;
            if (fromSit.buyIn != null && draft.buyIn == null) draft.buyIn = fromSit.buyIn;
          }
        }
        refreshManualKeepScroll();
      });
    }
    var leftInp = root.querySelector('[data-ha-players-left]');
    if (leftInp) leftInp.addEventListener('change', function () {
      draft.playersLeft = leftInp.value === '' ? null : Number(leftInp.value);
    });
    var paidInp = root.querySelector('[data-ha-places-paid]');
    if (paidInp) paidInp.addEventListener('change', function () {
      draft.placesPaid = paidInp.value === '' ? null : Number(paidInp.value);
    });
    var buyInp = root.querySelector('[data-ha-buyin]');
    if (buyInp) buyInp.addEventListener('change', function () {
      draft.buyIn = buyInp.value === '' ? null : Number(buyInp.value);
    });

    root.querySelectorAll('[data-ha-format]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.dataset.haFormat;
        if (fmt === draft.format) return;
        draft.format = fmt;
        S.format = fmt;
        draft.tableMax = maxPlayersForFormat(fmt, draft.formatHub);
        if (draft.playersSeated > draft.tableMax) draft.playersSeated = draft.tableMax;
        syncVillainCount(draft);
        var ring = draftRing(draft);
        if (ring.indexOf(draft.heroPos) < 0) draft.heroPos = ring[0];
        (draft.villains || []).forEach(function (v) {
          if (v.pos && ring.indexOf(v.pos) < 0) v.pos = '';
        });
        ensureUniqueSeats(draft);
        syncActionsFromSeats(draft);
        S.picker = null;
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-hero-pos]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pos = btn.dataset.haHeroPos;
        if (pos === draft.heroPos) return;
        var oldHero = draft.heroPos;
        // Liberar ese asiento de villanos
        (draft.villains || []).forEach(function (v) {
          if (v.pos === pos) v.pos = '';
        });
        draft.heroPos = pos;
        remapActionPositions(draft, oldHero, pos);
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    var addV = root.querySelector('[data-ha-add-villain]');
    if (addV) addV.addEventListener('click', function () {
      var maxP = maxPlayersForFormat(draft.format, draft.formatHub);
      if ((draft.playersSeated || 2) >= maxP) return;
      draft.playersSeated = (draft.playersSeated || 2) + 1;
      syncVillainCount(draft);
      refreshManualKeepScroll();
    });

    root.querySelectorAll('[data-ha-vpos]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var idx = parseInt(sel.dataset.haVpos, 10);
        var pos = sel.value;
        var taken = takenSeats(draft, idx);
        if (pos && taken[pos]) {
          sel.value = draft.villains[idx].pos || '';
          showErrors(['El asiento ' + pos + ' ya está ocupado.']);
          return;
        }
        var oldPos = draft.villains[idx].pos || '';
        draft.villains[idx].pos = pos;
        // Si el héroe tenía ese asiento, mover héroe al primer libre y remapear sus acciones
        if (pos && draft.heroPos === pos) {
          var ring = draftRing(draft);
          var takenAfter = {};
          draft.villains.forEach(function (v) {
            if (v.pos) takenAfter[v.pos] = true;
          });
          var newHero = ring.find(function (p) { return !takenAfter[p]; }) || ring[0];
          var prevHero = draft.heroPos;
          draft.heroPos = newHero;
          remapActionPositions(draft, prevHero, newHero);
        }
        if (oldPos && pos) remapActionPositions(draft, oldPos, pos);
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-del-vrow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.haDelVrow, 10);
        draft.villains.splice(idx, 1);
        draft.playersSeated = Math.max(2, 1 + draft.villains.length);
        syncVillainCount(draft);
        syncActionsFromSeats(draft);
        refreshManualKeepScroll();
      });
    });

    // Abrir picker en ventana emergente (2 héroe/villano, 3 flop, 1 turn/river)
    root.querySelectorAll('[data-ha-pick]').forEach(function (slotWrap) {
      slotWrap.addEventListener('click', function (e) {
        if (e.target.closest('[data-ha-clear-cards]')) return;
        var key = slotWrap.dataset.haPick;
        var max = parseInt(slotWrap.dataset.max, 10) || 2;
        var vIdx = slotWrap.dataset.vidx != null ? parseInt(slotWrap.dataset.vidx, 10) : null;
        openCardPickerModal(draft, key, max, isNaN(vIdx) ? null : vIdx);
      });
    });

    root.querySelectorAll('[data-ha-clear-cards]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var key = btn.dataset.haClearCards;
        var vIdx = btn.dataset.vidx != null ? parseInt(btn.dataset.vidx, 10) : null;
        setPickTargetCards(draft, key, isNaN(vIdx) ? null : vIdx, []);
        refreshManualKeepScroll();
      });
    });

    root.querySelectorAll('[data-ha-add-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var st = btn.dataset.haAddAction;
        commitDraftActionsFromDom(root, draft);
        addActionRowToDraft(draft, st);
        refreshManualKeepScroll();
      });
    });

    // Listeners delegados una sola vez: re-render no debe apilar handlers.
    if (!S._manualDelegated) {
      S._manualDelegated = true;
      root.addEventListener('change', function (e) {
        if (!S.draft || S.view !== 'manual') return;
        var row = e.target.closest('.ha-action-row');
        if (!row) return;
        var st = row.dataset.street;
        var list = row.parentNode;
        if (e.target.matches('[data-ha-act]')) {
          // Al cambiar el tipo, sugerir importe (call auto / bet-raise mínimo).
          var amtEl = row.querySelector('[data-ha-amt]');
          if (amtEl) {
            amtEl.value = '';
            delete amtEl.dataset.haAuto;
          }
          syncStreetInputs(list, st, { fillDefaults: true, forceCalls: true });
        } else {
          syncStreetInputs(list, st, { forceCalls: true });
        }
        commitDraftActionsFromDom(root, S.draft);
        if (e.target.matches('[data-ha-act]') && e.target.value === 'fold') {
          syncActionsFromSeats(S.draft);
          refreshManualKeepScroll();
        }
      });
      root.addEventListener('input', function (e) {
        if (!S.draft || S.view !== 'manual') return;
        if (!e.target.matches('[data-ha-amt]')) return;
        var row = e.target.closest('.ha-action-row');
        if (!row) return;
        // Recalcula calls siguientes sin pisar el campo enfocado ni rellenar defaults.
        syncStreetInputs(row.parentNode, row.dataset.street);
        commitDraftActionsFromDom(root, S.draft);
      });
      root.addEventListener('focusout', function (e) {
        if (!S.draft || S.view !== 'manual') return;
        if (!e.target.matches('[data-ha-amt]')) return;
        var row = e.target.closest('.ha-action-row');
        if (!row) return;
        var st = row.dataset.street;
        var list = row.parentNode;
        var actEl = row.querySelector('[data-ha-act]');
        var action = actEl ? actEl.value : '';
        // Si dejó bet/raise vacío, aplicar mínimo; si call vacío, restaurar auto.
        if (action === 'bet' || action === 'raise' || action === 'call') {
          if (parseAmountInput(e.target.value) == null) {
            syncStreetInputs(list, st, { fillDefaults: true, forceCalls: true });
          } else {
            syncStreetInputs(list, st, { forceCalls: true });
          }
        } else {
          syncStreetInputs(list, st, { forceCalls: true });
        }
        commitDraftActionsFromDom(root, S.draft);
      });
      root.addEventListener('click', function (e) {
        if (!S.draft || S.view !== 'manual') return;
        var delRow = e.target.closest('[data-ha-del-row]');
        if (!delRow) return;
        var rowDel = delRow.closest('.ha-action-row');
        if (!rowDel) return;
        var stDel = rowDel.dataset.street;
        var rowsDel = Array.prototype.slice.call(rowDel.parentNode.querySelectorAll('.ha-action-row'));
        var idxDel = rowsDel.indexOf(rowDel);
        if (idxDel >= 0) {
          commitDraftActionsFromDom(root, S.draft);
          S.draft.actions[stDel].splice(idxDel, 1);
          refreshManualKeepScroll();
        }
      });
    }

    var saveBtn = root.querySelector('[data-ha-manual-save]');
    if (saveBtn) saveBtn.addEventListener('click', onManualSave);
    syncAllStreetInputs(root, { fillDefaults: false, forceCalls: true });
  }

  function showErrors(errs) {
    var box = S.container.querySelector('[data-ha-errors]');
    if (!box) return;
    if (!errs.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<ul>' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
  }

  function onManualSave() {
    var draft = S.draft;
    var bbEl = S.container && S.container.querySelector('[data-ha-bb-euro]');
    if (bbEl) draft.bbEuro = normalizeBbEuro(bbEl.value);
    var anteEl = S.container && S.container.querySelector('[data-ha-ante-bb]');
    if (anteEl) draft.anteBB = normalizeAnteBB(anteEl.value);
    var heroStackEl = S.container && S.container.querySelector('[data-ha-hero-stack]');
    if (heroStackEl) draft.heroStackBB = normalizeStackBB(heroStackEl.value, defaultStackBB(draft.formatHub));
    if (S.container) {
      S.container.querySelectorAll('[data-ha-vstack]').forEach(function (inp) {
        var idx = parseInt(inp.dataset.haVstack, 10);
        if (draft.villains[idx]) {
          draft.villains[idx].stackBB = normalizeStackBB(inp.value, draft.heroStackBB);
        }
      });
      var leftEl = S.container.querySelector('[data-ha-players-left]');
      if (leftEl) draft.playersLeft = leftEl.value === '' ? null : Number(leftEl.value);
      var paidEl = S.container.querySelector('[data-ha-places-paid]');
      if (paidEl) draft.placesPaid = paidEl.value === '' ? null : Number(paidEl.value);
      var buyEl = S.container.querySelector('[data-ha-buyin]');
      if (buyEl) draft.buyIn = buyEl.value === '' ? null : Number(buyEl.value);
      // Volcar DOM → draft (incl. calls editados) y completar vacíos con auto/mínimo.
      syncAllStreetInputs(S.container, { fillDefaults: true, forceCalls: true });
      commitDraftActionsFromDom(S.container, draft);
    }
    syncVillainCount(draft);
    syncActionsFromSeats(draft);
    finalizeDraftAmounts(draft);
    var spec = draftToSpec(draft);
    var errs = validateSpec(spec);
    if (errs.length) { showErrors(errs); return; }
    showErrors([]);

    var editing = !!S.editId;
    if (!editing) {
      var check = canSave();
      if (!check.ok) {
        showErrors(['Has alcanzado el límite de manos guardadas de tu plan (' + check.limit + '). Borra alguna o mejora tu plan.']);
        return;
      }
    }

    var analyzed;
    var source = (S.editMeta && S.editMeta.source) || 'manual';
    ensureImporter().then(function () {
      analyzed = buildAnalyzedHand(spec, source);
      if (editing && S.editMeta) {
        if (S.editMeta.coachThread) analyzed.coachThread = S.editMeta.coachThread;
        if (S.editMeta.aiAnalysis) analyzed.aiAnalysis = S.editMeta.aiAnalysis;
        if (S.editMeta.createdAt) analyzed.createdAt = S.editMeta.createdAt;
      }

      var res = editing ? updateHand(analyzed) : saveHand(analyzed);
      if (!res.ok) {
        showErrors(['No se pudo guardar: ' + (res.error === 'analysis_limit' ? 'límite del plan alcanzado.' : (res.error || ''))]);
        return;
      }
      closeCardPickerModal();
      S.view = 'list';
      S.draft = null;
      S.editId = null;
      S.editMeta = null;
      S.picker = null;
      render();
      if (global.openAnalysisHandReview) global.openAnalysisHandReview(res.hand || analyzed, 'review');
    }).catch(function (e) {
      showErrors(['No se pudo analizar la mano: ' + ((e && e.message) || e)]);
    });
  }

  function looksLikeHandHistory(text) {
    if (!text) return false;
    return /^Winamax Poker -/m.test(text) ||
      /^PokerStars Hand #/m.test(text) ||
      /^PokerStars Zoom Hand #/m.test(text) ||
      /^CoinPoker Hand #/m.test(text) ||
      /^Mano n/m.test(text) ||
      /HandId:\s*#/i.test(text);
  }

  /** Importa HH PokerStars/Winamax/GG/888/CoinPoker localmente (sin IA) con collected/net correctos. */
  function tryImportHandHistory(text) {
    if (!looksLikeHandHistory(text) || !global.Importer || !global.Importer.parseHand) return null;
    var parsed = null;
    try {
      var multiWm = (text.match(/^Winamax Poker -/gm) || []).length > 1;
      var multiPs = (text.match(/^PokerStars (?:Zoom )?Hand #/gm) || []).length > 1 ||
        (text.match(/^Mano n/gm) || []).length > 1;
      if ((multiWm || multiPs) && global.Importer.parseSession) {
        var sess = global.Importer.parseSession(text, 'paste.txt');
        var hero = sess && sess.hero;
        parsed = (sess.hands || []).find(function (h) {
          return h && h.hero === hero && h.heroCards && h.heroCards.length >= 2;
        }) || null;
      } else {
        parsed = global.Importer.parseHand(text);
      }
    } catch (e) {
      return null;
    }
    if (!parsed || !parsed.hero || !parsed.heroCards || parsed.heroCards.length < 2) return null;
    var analyzed = global.Importer.analyzeHand(parsed);
    analyzed.spec = ensureHandSpec(analyzed);
    analyzed.source = 'handhistory';
    analyzed.createdAt = new Date().toISOString();
    analyzed.savedName = (analyzed.heroCode || '') + ' · ' + (analyzed.heroPos || '');
    return analyzed;
  }

  // ---------- render: texto / IA ----------
  function renderText() {
    var root = S.container;
    var html = '';
    html += '<button class="btn btn-ghost back-btn" data-ha-back>&laquo; Volver</button>';
    html += '<h2 class="ha-title">Añadir mano (texto / historial)</h2>';
    html += '<p class="muted-text">Pega un historial PokerStars, Winamax, GGPoker, 888poker o CoinPoker (se analiza <strong>sin consumir IA</strong>) o describe la mano en lenguaje natural. La descripción libre usa el ForgeCoach y <strong>consume una consulta</strong>.</p>';
    html += '<p class="muted-text ha-text-autofill-note">Incluye si puedes el formato (cash / spin / MTT), tipo (vanilla / PKO / mystery), jugadores en mesa, stacks en bb y fase. '
      + '<strong>Si falta algún dato</strong> necesario para que la mano sea coherente, se <strong>completará automáticamente</strong> '
      + '(stacks, fase, asientos, tipo…). Podrás <strong>editarlo a mano después</strong> en el editor.</p>';
    html += '<div class="ha-form">';
    html += '<textarea class="ha-text-input" rows="10"></textarea>';
    html += '<div class="ha-form-errors" data-ha-errors></div>';
    html += '<div class="ha-form-buttons">';
    html += '<button class="btn btn-primary" data-ha-text-go>Analizar y guardar</button>';
    html += '</div>';
    html += '<div class="ha-text-status" data-ha-text-status></div>';
    html += '</div>';
    root.innerHTML = html;
    var ta = root.querySelector('.ha-text-input');
    if (ta) {
      ta.placeholder = 'Ejemplo MTT PKO mid · 4-max · héroe CO 35bb, BTN 40bb, SB 12bb, BB 28bb, ante 0.1bb:\n'
        + 'Hero CO AhKh open 2.5bb, BTN fold, SB call, BB call.\n'
        + 'Flop Qc 8h 2d — SB check, BB check, Hero bet 4bb, SB fold, BB call.\n'
        + 'Turn 5s — BB check, Hero bet 9bb, BB fold.\n\n'
        + 'O pega un Hand History completo…';
    }
    root.querySelector('[data-ha-back]').addEventListener('click', function () { S.view = 'list'; render(); });
    root.querySelector('[data-ha-text-go]').addEventListener('click', onTextAnalyze);
  }

  /**
   * Completa stacks / mesa / fase / tipo ausentes para que la mano sea coherente.
   * Marca campos en `_autoFilled` para que el usuario pueda editarlos después.
   */
  function fillMissingSpecDefaults(spec, sourceText) {
    if (!spec) return spec;
    var filled = [];
    var hub = spec.formatHub || 'cash';
    var text = String(sourceText || '');
    var TC = global.PTTournamentContext;
    var Tax = global.PTFormatTaxonomy;

    if (!spec.formatHub) {
      if (/\bspin|hyperspin|spin\s*&\s*go/i.test(text)) hub = 'spin';
      else if (/\bmtt|torneo|tournament|sng|sit\s*&\s*go|pko|mystery/i.test(text)) hub = 'mtt';
      else if (/\bcash|nl\d+|zoom/i.test(text)) hub = 'cash';
      else if (Number(spec.anteBB) > 0) hub = 'mtt';
      spec.formatHub = hub;
      filled.push('formatHub');
    } else {
      hub = spec.formatHub;
    }

    if (hub !== 'cash') {
      var tType = spec.tournamentType;
      if (!tType || tType === 'unknown') {
        var detected = TC && TC.detectTournamentTypeFromText
          ? TC.detectTournamentTypeFromText(text)
          : 'unknown';
        if (detected !== 'unknown') {
          spec.tournamentType = detected;
          filled.push('tournamentType');
        } else if (!tType) {
          spec.tournamentType = hub === 'spin' ? 'vanilla' : 'unknown';
          filled.push('tournamentType');
        }
      }
    } else {
      spec.tournamentType = 'unknown';
    }

    var defaultSt = defaultStackBB(hub);
    if (!(Number(spec.heroStackBB) > 0)) {
      if (/\bpush|jam|all-?in\s*phase|\b10\s*bb|\b12\s*bb/i.test(text) && hub !== 'cash') {
        defaultSt = hub === 'spin' ? 10 : 12;
      } else if (/\bearly|deep|100\s*bb/i.test(text) && hub === 'mtt') {
        defaultSt = 40;
      } else if (/\bmid|middle/i.test(text) && hub === 'mtt') {
        defaultSt = 30;
      }
      spec.heroStackBB = defaultSt;
      filled.push('heroStackBB');
    }

    var villainN = (spec.villains || []).filter(function (v) { return v && v.pos; }).length;
    if (spec.playersSeated == null || !(Number(spec.playersSeated) >= 2)) {
      var seatedGuess = Math.max(2, 1 + villainN);
      if (/\bheads?-?up|\bhu\b|heads\s*up/i.test(text)) seatedGuess = 2;
      else if (/\b3-?max|tres\s*jugadores|3\s*jugadores/i.test(text)) seatedGuess = 3;
      else if (/\b4-?max|cuatro\s*jugadores|4\s*jugadores/i.test(text)) seatedGuess = 4;
      else if (hub === 'spin') seatedGuess = Math.min(3, Math.max(2, seatedGuess));
      spec.playersSeated = seatedGuess;
      filled.push('playersSeated');
    }

    (spec.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      if (!(Number(v.stackBB) > 0)) {
        var base = Number(spec.heroStackBB) || defaultSt;
        var jitter = (String(v.pos).charCodeAt(0) % 7) - 3;
        v.stackBB = Math.max(2, Math.round((base + jitter) * 10) / 10);
        filled.push('stack:' + v.pos);
      }
    });

    if (!spec.mttPhase || spec.mttPhase === 'auto') {
      var phase = 'auto';
      if (/\bbubble|burbuja/i.test(text)) phase = 'bubble';
      else if (/\bpush|jam\s*or\s*fold/i.test(text)) phase = 'push';
      else if (/\bshort\s*stack|fase\s*corta/i.test(text)) phase = 'short';
      else if (/\bearly|profunda|deep/i.test(text)) phase = 'early';
      else if (/\bmid|middle/i.test(text)) phase = 'mid';
      else if (TC && TC.phaseFromStackBB) {
        phase = TC.phaseFromStackBB(spec.heroStackBB, hub);
      } else if (Tax && Tax.phaseFromStackBB) {
        phase = Tax.phaseFromStackBB(spec.heroStackBB, hub);
      }
      if (phase && phase !== 'auto') {
        spec.mttPhase = phase;
        filled.push('mttPhase');
      } else if (!spec.mttPhase) {
        spec.mttPhase = 'auto';
      }
    }

    if (spec.anteBB == null || !isFinite(Number(spec.anteBB))) {
      if (hub === 'mtt') {
        spec.anteBB = 0.1;
        filled.push('anteBB');
      } else {
        spec.anteBB = 0;
      }
    }

    if (hub === 'spin' && Number(spec.playersSeated) > 3) {
      spec.playersSeated = 3;
      filled.push('playersSeated');
    }

    spec._autoFilled = filled;
    return spec;
  }

  function normalizeAiSpec(aiHand) {
    var hub = aiHand.formatHub
      || (aiHand.gameKind === 'spin' ? 'spin'
        : ((aiHand.gameKind === 'mtt' || aiHand.gameKind === 'sng' || aiHand.isTournament) ? 'mtt' : 'cash'));
    if (aiHand.anteBB > 0 && hub === 'cash') hub = 'mtt';
    var rawHeroStack = aiHand.heroStackBB;
    var heroStackMissing = !(Number(rawHeroStack) > 0);
    var heroStackBB = normalizeStackBB(rawHeroStack, defaultStackBB(hub));
    var spec = {
      format: aiHand.format === '9max' ? '9max' : '6max',
      formatHub: hub,
      tournamentType: aiHand.tournamentType || 'unknown',
      mttPhase: aiHand.mttPhase || 'auto',
      playersSeated: aiHand.playersSeated != null ? Number(aiHand.playersSeated) : null,
      tableMax: aiHand.tableMax != null ? Number(aiHand.tableMax) : null,
      heroPos: aiHand.heroPos,
      heroCards: parseCardList((aiHand.heroCards || []).join(' ')),
      heroStackBB: heroStackMissing ? null : heroStackBB,
      anteBB: aiHand.anteBB != null ? normalizeAnteBB(aiHand.anteBB) : null,
      bbEuro: aiHand.bbEuro != null ? normalizeBbEuro(aiHand.bbEuro) : 0.05,
      playersLeft: aiHand.playersLeft != null ? aiHand.playersLeft : null,
      placesPaid: aiHand.placesPaid != null ? aiHand.placesPaid : null,
      entries: aiHand.entries != null ? aiHand.entries : null,
      buyIn: aiHand.buyIn != null ? aiHand.buyIn : null,
      mttStructureSituation: aiHand.mttStructureSituation || null,
      villains: [],
      board: parseCardList((aiHand.board || []).join(' ')),
      actions: { preflop: [], flop: [], turn: [], river: [] },
      _source: 'text'
    };
    (aiHand.villains || []).forEach(function (v) {
      if (!v || !v.pos) return;
      var cards = parseCardList((v.cards || []).join(' '));
      var vStackMissing = !(Number(v.stackBB) > 0);
      spec.villains.push({
        pos: v.pos,
        cards: cards.length === 2 ? cards : [],
        stackBB: vStackMissing ? null : normalizeStackBB(v.stackBB, heroStackBB)
      });
    });
    if (spec.playersSeated == null) {
      spec.playersSeated = Math.max(2, 1 + spec.villains.length);
    }
    var acts = aiHand.actions || {};
    STREET_ORDER.forEach(function (st) {
      (acts[st] || []).forEach(function (a) {
        if (!a || !a.pos || !a.action) return;
        var action = String(a.action).toLowerCase();
        if (!ACTION_LABELS[action]) return;
        var amt = Number(a.amountBB);
        spec.actions[st].push({ pos: a.pos, action: action, amountBB: isFinite(amt) ? amt : null });
      });
    });
    // La IA a menudo omite villanos sin cartas conocidas; sin ellos el editor
    // pierde las acciones al sincronizar asientos.
    return ensureVillainsFromActions(spec);
  }

  function onTextAnalyze() {
    var root = S.container;
    var text = root.querySelector('.ha-text-input').value.trim();
    showErrors([]);
    var status = root.querySelector('[data-ha-text-status]');
    if (!text) { showErrors(['Escribe la descripción de la mano o pega un historial.']); return; }
    var check = canSave();
    if (!check.ok) {
      showErrors(['Has alcanzado el límite de manos guardadas de tu plan (' + check.limit + '). Borra alguna o mejora tu plan.']);
      return;
    }
    var btn = root.querySelector('[data-ha-text-go]');
    btn.disabled = true;

    function finishSaved(analyzed) {
      var res = saveHand(analyzed);
      if (!res.ok) throw new Error(res.error === 'analysis_limit' ? 'límite del plan alcanzado.' : (res.error || 'no se pudo guardar.'));
      btn.disabled = false;
      S.view = 'list';
      render();
      if (global.openAnalysisHandReview) global.openAnalysisHandReview(res.hand || analyzed, 'review');
    }

    status.innerHTML = '<div class="ha-loading">Analizando…</div>';
    ensureImporter().then(function () {
      var local = tryImportHandHistory(text);
      if (local) {
        status.innerHTML = '<div class="ha-loading">Historial detectado · guardando…</div>';
        finishSaved(local);
        return null;
      }
      if (!global.PTAIReport || !global.PTAIReport.parseHand) {
        throw new Error('No es un historial reconocido y el ForgeCoach no está disponible.');
      }
      status.innerHTML = '<div class="ha-loading">Comprobando consultas IA…</div>';
      return requireAiAccess().then(function (ok) {
        if (!ok) {
          btn.disabled = false;
          status.innerHTML = '';
          return null;
        }
        status.innerHTML = '<div class="ha-loading">La IA está leyendo la mano…</div>';
        return global.PTAIReport.parseHand(text);
      });
    }).then(function (data) {
      if (!data) return;
      if (!data.hand) throw new Error('La IA no devolvió una mano válida.');
      var spec = normalizeAiSpec(data.hand);
      fillMissingSpecDefaults(spec, text);
      var errs = validateSpec(spec);
      if (errs.length) {
        throw new Error('La IA no pudo estructurar bien la mano (' + errs[0] + '). Revisa la descripción o usa la entrada manual.');
      }
      var analyzed = buildAnalyzedHand(spec, 'text');
      if (spec._autoFilled && spec._autoFilled.length) {
        analyzed.autoFilledFields = spec._autoFilled.slice();
        analyzed.autoFillNote = 'Se completaron automáticamente algunos datos (stacks, fase, mesa o tipo) para que la mano sea coherente. Puedes editarlos a mano en Editar.';
      }
      if (data.analysisMarkdown) {
        analyzed.coachThread = [{
          mode: 'report',
          reportMarkdown: data.analysisMarkdown,
          model: 'gemini',
          createdAt: new Date().toISOString(),
          truncated: false
        }];
        analyzed.aiAnalysis = data.analysisMarkdown;
      }
      finishSaved(analyzed);
    }).catch(function (e) {
      btn.disabled = false;
      status.innerHTML = '';
      if (e && e.paywall && global.PTBilling && global.PTBilling.showPaywall) {
        global.PTBilling.showPaywall(e.paywall);
        return;
      }
      showErrors([(e && e.message) ? e.message : 'No se pudo analizar la mano.']);
    });
  }

  global.PTHandAnalysis = {
    render: render,
    specToRawHand: specToRawHand,
    buildAnalyzedHand: buildAnalyzedHand,
    toTrainerConfig: toTrainerConfig,
    syncActionsFromSeats: syncActionsFromSeats,
    remapActionPositions: remapActionPositions,
    activePlayersForStreet: activePlayersForStreet,
    takenSeats: takenSeats,
    emptyDraft: emptyDraft,
    draftFromSpec: draftFromSpec,
    computeStreetDisplayActions: computeStreetDisplayActions,
    resolveRaiseToAmountBB: resolveRaiseToAmountBB,
    listSwappableVillains: listSwappableVillains,
    swapHeroWithVillain: swapHeroWithVillain,
    ensureHandSpec: ensureHandSpec,
    ensureVillainsFromActions: ensureVillainsFromActions,
    fillMissingSpecDefaults: fillMissingSpecDefaults,
    normalizeAiSpec: normalizeAiSpec,
    normalizeBbEuro: normalizeBbEuro,
    normalizeAnteBB: normalizeAnteBB,
    sortBySpeakingOrder: sortBySpeakingOrder,
    speakingOrderRing: speakingOrderRing,
    looksLikeHandHistory: looksLikeHandHistory,
    tryImportHandHistory: tryImportHandHistory
  };
})(window);
