/*
 * play-config.js — Configuración de sesión de entrenamiento preflop.
 */
(function (global) {
  'use strict';

  const N = global.GTORangesNotation;
  const D = global.GTORangesData;
  const W = global.GTORangesWeights;
  const Eq = global.GTOEquity;

  const POS_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const POS_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const PREFLOP_ACTION_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const DEAL_ORDER_9 = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
  const RFI_POS_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB'];
  const RFI_POS_9 = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];

  /** Posición de mesa 6-max usada por el motor para rangos y acción. */
  const POS_9_TO_ENGINE = {
    UTG: 'UTG', UTG1: 'UTG', UTG2: 'HJ', LJ: 'HJ', HJ: 'CO', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB'
  };

  const PREFLOP_ORDER_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  function preflopOrderIndex(pos) {
    return PREFLOP_ORDER_6.indexOf(pos);
  }

  /** Opener actúa antes que caller; caller antes que héroe (orden preflop 6-max). */
  function isValidSqueezeCombo(combo) {
    if (!combo || !combo.heroPos || !combo.openerPos || !combo.callerPos) return false;
    const o = preflopOrderIndex(combo.openerPos);
    const c = preflopOrderIndex(combo.callerPos);
    const h = preflopOrderIndex(combo.heroPos);
    return o >= 0 && c >= 0 && h >= 0 && o < c && c < h;
  }

  function buildValidSqueezeCombos() {
    const out = [];
    PREFLOP_ORDER_6.forEach(function (heroPos) {
      const hi = preflopOrderIndex(heroPos);
      PREFLOP_ORDER_6.forEach(function (openerPos) {
        PREFLOP_ORDER_6.forEach(function (callerPos) {
          if (preflopOrderIndex(openerPos) < preflopOrderIndex(callerPos) && preflopOrderIndex(callerPos) < hi) {
            out.push({ heroPos: heroPos, openerPos: openerPos, callerPos: callerPos });
          }
        });
      });
    });
    return out;
  }

  const SQUEEZE_COMBOS = buildValidSqueezeCombos();

  const ISO_COMBOS = [
    { heroPos: 'CO', limperPos: 'UTG' },
    { heroPos: 'CO', limperPos: 'HJ' },
    { heroPos: 'BTN', limperPos: 'UTG' },
    { heroPos: 'BTN', limperPos: 'HJ' },
    { heroPos: 'BTN', limperPos: 'CO' },
    { heroPos: 'SB', limperPos: 'CO' },
    { heroPos: 'SB', limperPos: 'BTN' },
    { heroPos: 'BB', limperPos: 'SB' },
    { heroPos: 'HJ', limperPos: 'UTG' }
  ];

  function vs3betKeys() {
    const ext = global.GTORangesExtended;
    if (ext && ext.allVs3betPairKeys) return ext.allVs3betPairKeys();
    return Object.keys(D.VS_3BET_PAIRS || {});
  }

  function parseFace3betKey(key) {
    const parts = key.split('_');
    return { opener: parts[0], threeBettor: parts[2] };
  }

  const STACK_DEPTH_BB = { bb200: 200, bb100: 100, bb50: 50, bb25: 25, bb20: 20, bb15: 15, bb10: 10, standard: 100, short: 40, deep: 150 };

  const HANDS_TARGETS = { 0: true, 10: true, 25: true, 50: true, 100: true };

  const POS_SPIN = ['BTN', 'SB', 'BB'];
  const DEAL_ORDER_SPIN = ['SB', 'BB', 'BTN'];
  const RFI_POS_SPIN = ['BTN', 'SB'];

  /** Rake orientativo cash mid-stakes (SN-53). */
  const STANDARD_RAKE = { pct: 5, capBB: 3 };

  const DEFAULT = {
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    heroPos: 'random',
    handRange: 'playable',
    villainLevel: 'fish',
    practiceStreet: 'random',
    /** mixed | bluff_make | bluff_catch */
    practiceIntent: 'mixed',
    /** auto | early | mid | short | push | bubble — spins/MTT */
    mttPhase: 'auto',
    /** ante en bb (0 en cash; auto en MTT) */
    anteBB: null,
    /** 2x | 3x | 5x — payouts spin */
    spinPayout: '2x',
    liveAdvisor: false,
    /** 'always' | 'serious' — solo relevante si liveAdvisor */
    advisorMode: 'always',
    /** Umbral de EV perdido (bb) para avisar en modo serious */
    seriousEvThreshold: 0.5,
    tableTheme: 'emerald',
    /** null/0 = sesión continua; 25/50/100 = bloque con resumen al final */
    handsTarget: 0,
    /** 'none' | 'standard' | 'custom' — rake estimado en EV/pot odds */
    rakeMode: 'none',
    rakePct: 5,
    rakeCapBB: 3
  };

  const RAKE_LS_KEY = 'pt_rake_prefs';

  function loadRakePrefs() {
    try {
      const raw = localStorage.getItem(RAKE_LS_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return null;
      return o;
    } catch (e) {
      return null;
    }
  }

  function saveRakePrefs(partial) {
    try {
      const cur = Object.assign({}, loadRakePrefs() || {}, partial || {});
      localStorage.setItem(RAKE_LS_KEY, JSON.stringify({
        rakeMode: cur.rakeMode,
        rakePct: cur.rakePct,
        rakeCapBB: cur.rakeCapBB
      }));
    } catch (e) { /* ignore */ }
  }

  function round2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  /** Rake estimado en bb sobre un bote (tope incluido). */
  function estimateRakeBB(potBB, config) {
    const c = normalize(config);
    if (!c.rakeMode || c.rakeMode === 'none') return 0;
    const pot = Math.max(Number(potBB) || 0, 0);
    if (pot <= 0) return 0;
    let rake = pot * (Number(c.rakePct) || 0) / 100;
    const cap = Number(c.rakeCapBB);
    if (cap > 0) rake = Math.min(rake, cap);
    return round2(Math.max(0, rake));
  }

  function potAfterRakeBB(potBB, config) {
    const pot = Math.max(Number(potBB) || 0, 0);
    const after = pot - estimateRakeBB(pot, config);
    return Math.max(0.1, round2(after));
  }

  const TABLE_THEMES = { emerald: true, midnight: true, crimson: true };

  const RR = function () { return global.GTORangesRegistry; };

  function normalize(config) {
    const raw = config || {};
    const c = Object.assign({}, DEFAULT, raw);
    const Tax = global.PTFormatTaxonomy;
    const hubExplicit = Object.prototype.hasOwnProperty.call(raw, 'formatHub');
    const gtExplicit = Object.prototype.hasOwnProperty.call(raw, 'gameType');
    const stackExplicit = Object.prototype.hasOwnProperty.call(raw, 'stackDepth');

    if (!c.gameType) c.gameType = 'cash6';
    if (c.gameType === 'spin') c.gameType = 'spin3';

    if (Tax) {
      if (hubExplicit && !gtExplicit) {
        c.formatHub = Tax.normalizeHub(c.formatHub);
        if (c.formatHub === 'cash' && (c.gameType === 'cash6' || c.gameType === 'cash9')) {
          /* keep table size */
        } else {
          c.gameType = Tax.defaultGameTypeForHub(c.formatHub);
        }
      } else if (hubExplicit && gtExplicit) {
        c.formatHub = Tax.normalizeHub(c.formatHub);
        if (Tax.hubFromGameType(c.gameType) !== c.formatHub) {
          c.gameType = Tax.defaultGameTypeForHub(c.formatHub);
        }
      } else {
        c.formatHub = Tax.hubFromGameType(c.gameType);
      }
    } else {
      c.formatHub = c.gameType === 'spin3' ? 'spin' : (c.gameType === 'mtt' ? 'mtt' : 'cash');
    }

    if (!c.stackDepth) c.stackDepth = 'bb100';
    if (c.stackDepth === 'standard') c.stackDepth = 'bb100';
    if (c.stackDepth === 'short') c.stackDepth = c.formatHub === 'spin' ? 'bb25' : 'bb50';
    if (c.stackDepth === 'deep') c.stackDepth = 'bb200';
    if (c.formatHub === 'spin' && !stackExplicit && (c.stackDepth === 'bb200' || c.stackDepth === 'bb100')) {
      c.stackDepth = 'bb25';
    }
    if (!c.scenario) c.scenario = 'random';
    if (!c.heroPos) c.heroPos = 'random';
    if (!c.handRange) c.handRange = 'random';
    if (!c.villainLevel) c.villainLevel = 'fish';
    if (!c.practiceStreet) c.practiceStreet = 'random';
    if (Tax) c.practiceIntent = Tax.normalizeIntent(c.practiceIntent);
    else if (c.practiceIntent !== 'bluff_make' && c.practiceIntent !== 'bluff_catch') c.practiceIntent = 'mixed';
    if (Tax) c.mttPhase = Tax.normalizePhase(c.mttPhase);
    else if (!c.mttPhase) c.mttPhase = 'auto';
    if (c.spinPayout !== '3x' && c.spinPayout !== '5x') c.spinPayout = '2x';

    c.stackBB = STACK_DEPTH_BB[c.stackDepth] != null ? STACK_DEPTH_BB[c.stackDepth] : 100;
    if (Tax) c.resolvedPhase = Tax.resolvePhase(c);

    if (c.anteBB == null || c.anteBB === '') {
      c.anteBB = (Tax && c.formatHub !== 'cash') ? Tax.defaultAnteBB(c) : 0;
    }
    var ante = Number(c.anteBB);
    if (isNaN(ante) || ante < 0) ante = 0;
    if (ante > 2) ante = 2;
    if (c.formatHub === 'cash') ante = 0;
    c.anteBB = ante;

    // Rake solo cash; torneos/spins sin rake de bote cash.
    if (c.formatHub !== 'cash') c.rakeMode = 'none';

    c.liveAdvisor = !!c.liveAdvisor;
    c.advisorMode = c.advisorMode === 'serious' ? 'serious' : 'always';
    var thr = Number(c.seriousEvThreshold);
    if (isNaN(thr) || thr < 0) thr = 0.5;
    if (thr > 20) thr = 20;
    c.seriousEvThreshold = thr;
    if (!TABLE_THEMES[c.tableTheme]) c.tableTheme = 'emerald';
    var ht = Number(c.handsTarget);
    if (!HANDS_TARGETS[ht]) ht = 0;
    c.handsTarget = ht || 0;
    if (c.rakeMode !== 'standard' && c.rakeMode !== 'custom') c.rakeMode = 'none';
    var pct = Number(c.rakePct);
    if (isNaN(pct) || pct < 0) pct = STANDARD_RAKE.pct;
    if (pct > 20) pct = 20;
    c.rakePct = pct;
    var cap = Number(c.rakeCapBB);
    if (isNaN(cap) || cap < 0) cap = STANDARD_RAKE.capBB;
    if (cap > 50) cap = 50;
    c.rakeCapBB = cap;
    if (c.rakeMode === 'standard') {
      c.rakePct = STANDARD_RAKE.pct;
      c.rakeCapBB = STANDARD_RAKE.capBB;
    }
    return c;
  }

  function is9Max(config) {
    const c = config || {};
    return c.gameType === 'cash9' || c.gameType === 'mtt';
  }

  function isMtt(config) {
    return (config && config.gameType) === 'mtt';
  }

  function isSpin(config) {
    return (config && config.gameType) === 'spin3' || (config && config.formatHub) === 'spin';
  }

  function is3Max(config) {
    return isSpin(config);
  }

  function heroPositions(config) {
    const c = normalize(config);
    if (isSpin(c)) {
      if (c.scenario === 'rfi' || c.scenario === 'push') return RFI_POS_SPIN.slice();
      return POS_SPIN.slice();
    }
    if (c.scenario === 'rfi') return is9Max(c) ? RFI_POS_9.slice() : RFI_POS_6.slice();
    return is9Max(c) ? POS_9.slice() : POS_6.slice();
  }

  function tablePositions(config) {
    if (isSpin(config)) return POS_SPIN.slice();
    return is9Max(config) ? POS_9.slice() : POS_6.slice();
  }

  function dealOrder(config) {
    if (isSpin(config)) return DEAL_ORDER_SPIN.slice();
    if (is9Max(config)) return DEAL_ORDER_9.slice();
    return ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'];
  }

  function displaySeatForEngine(enginePos, reserved) {
    const res = new Set(reserved || []);
    if (POS_9.indexOf(enginePos) >= 0 && !res.has(enginePos)) return enginePos;
    for (let i = 0; i < POS_9.length; i++) {
      const p = POS_9[i];
      if (POS_9_TO_ENGINE[p] === enginePos && !res.has(p)) return p;
    }
    return enginePos;
  }

  function heroDealSeat(scenario, config) {
    if (is9Max(config)) {
      if (scenario.heroPos) return scenario.heroPos;
      if (scenario.displayHeroPos) return scenario.displayHeroPos;
    }
    return scenario.engineHeroPos
      || (scenario.type === 'RFI' ? enginePos(scenario.heroPos) : null)
      || (scenario.type === 'face3bet' ? parseFace3betKey(scenario.key).opener : null)
      || ((scenario.type === 'vsRFI' || scenario.type === 'face4bet') ? parseVsKey(scenario.key).hero : scenario.heroPos);
  }

  function openerDealSeat(scenario, config) {
    let eng = scenario.openerPos;
    if (!eng && scenario.key) eng = parseVsKey(scenario.key).opener;
    if (!eng) return null;
    if (!is9Max(config)) return eng;
    const reserved = [heroDealSeat(scenario, config), scenario.callerPos].filter(Boolean);
    if (POS_9.indexOf(eng) >= 0 && reserved.indexOf(eng) < 0) return eng;
    return displaySeatForEngine(eng, reserved);
  }

  function villainTableSeat(hand) {
    if (!hand || !hand.villain || !hand.villain.pos) return null;
    if (!hand.playConfig || !is9Max(hand.playConfig)) return hand.villain.pos;
    const s = hand.scenario || {};
    const heroSeat = hand.displayHeroPos || s.heroPos || hand.hero.pos;
    if (s.type === 'squeeze' && s.openerPos) return s.openerPos;
    if (s.type === 'RFI') return 'BB';
    return openerDealSeat(s, hand.playConfig) || displaySeatForEngine(hand.villain.pos, [heroSeat, s.callerPos]);
  }

  function enginePos(displayPos) {
    const reg = RR();
    if (reg) return reg.toEnginePos(displayPos);
    return POS_9_TO_ENGINE[displayPos] || displayPos;
  }

  function openRaiseTable(config) {
    const reg = RR();
    if (reg) return reg.getOpenRaiseTable(config);
    return D.OPEN_RAISE;
  }

  function vsRfiTable(config) {
    const reg = RR();
    if (reg) return reg.getVsRfiTable(config);
    return D.VS_RFI;
  }

  function vsKeys() {
    return Object.keys(D.VS_RFI);
  }

  function filterWeights(weights, mode) {
    const out = {};
    const m = mode === 'all' ? 'random' : mode;
    Object.keys(weights || {}).forEach((code) => {
      const w = weights[code];
      if (m === 'random' && w > 0) out[code] = w;
      else if (m === 'playable' && w >= 1) out[code] = w;
      else if (m === 'borderline' && w > 0 && w < 1) out[code] = w;
    });
    if (!Object.keys(out).length && m === 'borderline') {
      return filterWeights(weights, 'playable');
    }
    if (!Object.keys(out).length && m === 'playable') {
      return filterWeights(weights, 'random');
    }
    return out;
  }

  function weightsToRangeStr(weights) {
    if (!W) return '';
    return W.rangeString(weights);
  }

  function sampleFromWeights(weights, dead, rnd) {
    if (!Eq || !Eq.sampleHandFromRange) return null;
    const filtered = filterWeights(weights, 'random');
    const rangeStr = weightsToRangeStr(filtered);
    if (!rangeStr) return null;
    return Eq.sampleHandFromRange(rangeStr, dead || [], rnd);
  }

  const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const RANK_VAL = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
  let _allCodes = null;

  /** Las 169 manos de partida (AA, AKs, AKo, ...). */
  function allHandCodes() {
    if (_allCodes) return _allCodes;
    const out = [];
    for (let i = 0; i < RANKS.length; i++) {
      for (let j = 0; j < RANKS.length; j++) {
        if (i === j) out.push(RANKS[i] + RANKS[i]);
        else if (i < j) out.push(RANKS[i] + RANKS[j] + 's');
        else out.push(RANKS[j] + RANKS[i] + 'o');
      }
    }
    _allCodes = out;
    return out;
  }

  /** Puntuación heurística tipo Chen para ordenar manos por fuerza preflop. */
  function handCodeScore(code) {
    const r1 = RANK_VAL[code[0]];
    const r2 = RANK_VAL[code[1]];
    if (code.length === 2) return 34 + r1;
    const hi = Math.max(r1, r2);
    const lo = Math.min(r1, r2);
    const suited = code[2] === 's';
    let s = hi + lo * 0.5 + (suited ? 2 : 0);
    const gap = hi - lo - 1;
    if (gap === 1) s -= 1;
    else if (gap === 2) s -= 2;
    else if (gap >= 3) s -= 4;
    if (gap <= 1 && hi <= 12) s += 1;
    return s;
  }

  /** Manos con w>0 del spot del héroe, ordenadas de más débil a más fuerte. */
  function heroRangeCodesByStrength(scenario, config) {
    const weights = sampleHeroWeights(scenario, config, 'random');
    const codes = Object.keys(weights).filter((c) => weights[c] > 0);
    codes.sort((a, b) => handCodeScore(a) - handCodeScore(b));
    return codes;
  }

  /** Muestrea una mano concreta de una lista de códigos evitando cartas muertas. */
  function sampleFromCodes(codes, dead, rnd) {
    if (!codes || !codes.length || !Eq || !Eq.sampleHandFromRange) return null;
    return Eq.sampleHandFromRange(codes.join(', '), dead || [], rnd);
  }

  var PLAYABLE_FOLD_PCT = 0.15;

  /**
   * Mano del héroe según el modo de rango configurado:
   *  - random: null (el motor reparte del mazo, aleatorio total).
   *  - playable: rango completo del spot + ~15% de manos fold (fuera de rango).
   *  - borderline: manos al límite del rango (frecuencia mixta o borde inferior).
   */
  function sampleHeroHand(scenario, config, dead, rnd) {
    const r = rnd || Math.random;
    const mode = config.handRange === 'all' ? 'random' : (config.handRange || 'playable');
    if (mode === 'random') return null;

    const rangeCodes = heroRangeCodesByStrength(scenario, config);
    if (!rangeCodes.length) return null;
    const inRange = {};
    rangeCodes.forEach((c) => { inRange[c] = true; });

    if (mode === 'borderline') {
      const mixWeights = sampleHeroWeights(scenario, config, 'borderline');
      let mixCodes = Object.keys(mixWeights).filter((c) => mixWeights[c] > 0 && mixWeights[c] < 1);
      if (mixCodes.length < 3) {
        const edgeCount = Math.max(3, Math.ceil(rangeCodes.length * 0.28));
        const edge = rangeCodes.slice(0, edgeCount);
        mixCodes = mixCodes.concat(edge);
      }
      return sampleFromCodes(mixCodes, dead, r) || sampleFromCodes(rangeCodes, dead, r);
    }

    // playable: rango completo + pequeño % de manos fold preflop
    if (r() < PLAYABLE_FOLD_PCT) {
      const foldCodes = allHandCodes().filter((c) => !inRange[c]);
      const foldHand = sampleFromCodes(foldCodes, dead, r);
      if (foldHand) return foldHand;
    }
    return sampleFromCodes(rangeCodes, dead, r);
  }

  function sampleHeroWeights(scenario, config, modeOverride) {
    const mode = modeOverride || (config.handRange === 'all' ? 'random' : (config.handRange || 'playable'));
    const engHero = scenario.engineHeroPos || scenario.heroPos || parseVsKey(scenario.key).hero;

    if (scenario.type === 'RFI') {
      const pos = enginePos(scenario.heroPos);
      const data = openRaiseTable(config)[scenario.heroPos] || openRaiseTable(config)[pos];
      if (!data) return {};
      return filterWeights(W.fromSets({ raise: data.raise, mix: data.mix }), mode);
    }
    if (scenario.type === 'vsRFI' || scenario.type === 'face4bet') {
      const data = vsRfiTable(config)[scenario.key];
      if (!data) return {};
      return filterWeights(W.fromSets({
        threeBet: data.threeBet,
        threeBetMix: data.threeBetMix,
        call: data.call,
        callMix: data.callMix
      }), mode);
    }
    if (scenario.type === 'face3bet') {
      const pk = parseFace3betKey(scenario.key);
      const reg = RR();
      const data = reg ? reg.getVs3betRow(pk.opener, pk.threeBettor, config) : D.VS_3BET;
      if (!data) return {};
      return filterWeights(W.fromSets({
        fourBet: data.fourBet,
        call: data.call,
        callMix: data.callMix
      }), mode);
    }
    if (scenario.type === 'isoLimp') {
      const reg = RR();
      const data = reg
        ? reg.getIsoLimpRow(scenario.heroPos, scenario.limperPos, config)
        : D.ISO_LIMP;
      if (!data) return {};
      return filterWeights(W.fromSets({
        raise: data.raise,
        callMix: data.callMix,
        fold: data.fold
      }), mode);
    }
    if (scenario.type === 'bbVsSbLimp') {
      const reg = RR();
      const data = reg ? reg.getBbVsSbLimp(config) : D.BB_VS_SB_LIMP;
      if (!data) return {};
      return filterWeights(W.fromSets({
        raise: data.raise,
        callMix: data.callMix,
        check: data.check
      }), mode);
    }
    if (scenario.type === 'sbLimp') {
      const reg = RR();
      const data = reg ? reg.getSbLimp(config) : D.SB_LIMP;
      if (!data) return {};
      return filterWeights(W.fromSets({
        raise: data.raise,
        limp: data.limp,
        limpMix: data.limpMix
      }), mode);
    }
    if (scenario.type === 'cold4bet') {
      const reg = RR();
      const data = reg ? reg.getCold4bet(config) : D.COLD_4BET;
      if (!data) return {};
      return filterWeights(W.fromSets({
        raise: data.raise,
        call: data.call,
        callMix: data.callMix,
        fold: data.fold
      }), mode);
    }
    if (scenario.type === 'cold3bet') {
      const reg = RR();
      const data = reg ? reg.getCold3bet(config) : D.COLD_3BET;
      if (!data) return {};
      return filterWeights(W.fromSets({
        raise: data.raise,
        call: data.call,
        callMix: data.callMix,
        fold: data.fold
      }), mode);
    }
    if (scenario.type === 'squeeze') {
      const reg = RR();
      const data = reg
        ? reg.getSqueezeRow(scenario.heroPos, scenario.openerPos, scenario.callerPos, config)
        : D.SQUEEZE;
      if (data) {
        return filterWeights(W.fromSets({ raise: data.raise, call: data.call, callMix: data.callMix }), mode);
      }
    }
    return {};
  }

  function sampleVillainWeights(scenario, config) {
    if (scenario.type === 'RFI' || scenario.type === 'face4bet') return {};
    let opener = scenario.openerPos;
    if (!opener && scenario.key) opener = parseVsKey(scenario.key).opener;
    if (!opener) return {};
    const data = openRaiseTable(config)[enginePos(opener)] || openRaiseTable(config)[opener];
    if (!data) return {};
    return W.fromSets({ raise: data.raise, mix: data.mix });
  }

  /** BB defiende open del héroe (call / 3-bet según VS_RFI). */
  function sampleRfiDefenderWeights(scenario, config) {
    if (scenario.type !== 'RFI') return {};
    const heroEng = scenario.engineHeroPos || enginePos(scenario.heroPos);
    if (!heroEng || heroEng === 'BB') return {};
    const key = 'BB_vs_' + heroEng;
    const d = vsRfiTable(config || { gameType: 'cash6', stackDepth: 'standard' })[key];
    if (!d) return {};
    return W.fromSets({
      threeBet: d.threeBet,
      threeBetMix: d.threeBetMix,
      call: d.call,
      callMix: d.callMix
    });
  }

  /** Abridor que 4-betea tras el 3-bet del héroe. */
  function sampleFace4betVillainWeights(config) {
    const reg = RR();
    const data = reg ? reg.getVs3bet(config) : D.VS_3BET;
    if (!data) return {};
    return W.fromSets({ fourBet: data.fourBet });
  }

  function face4betVillainRangeStr(config) {
    const reg = RR();
    const data = reg ? reg.getVs3bet(config || { gameType: 'cash6', stackDepth: 'standard' }) : D.VS_3BET;
    return data ? data.fourBet : 'QQ+, AKs, AKo';
  }

  /** Limper en spot de iso. */
  function sampleLimpWeights(config) {
    if (!D || !D.LIMP_RANGE || !W) return {};
    return W.fromSets({ call: D.LIMP_RANGE });
  }

  /** 3-bettor en cold 4-bet (HJ vs UTG open, etc.). */
  function sampleThreeBettorWeights(scenario, config) {
    if (scenario.type !== 'cold4bet') return {};
    const opener = scenario.openerPos;
    const tb = scenario.threeBettorPos;
    if (!opener || !tb) return {};
    const reg = RR();
    const vsKey = tb + '_vs_' + opener;
    const d = vsRfiTable(config || {})[vsKey] || (reg ? reg.getVsRfiRow(tb, opener, config) : null);
    if (!d) return {};
    return W.fromSets({ threeBet: d.threeBet, threeBetMix: d.threeBetMix });
  }

  /** Pagador en squeeze: rango de call, no cartas aleatorias. */
  function sampleCallerWeights(scenario, config) {
    if (scenario.type !== 'squeeze' || !scenario.callerPos) return {};
    const reg = RR();
    const data = reg
      ? reg.getSqueezeRow(scenario.heroPos, scenario.openerPos, scenario.callerPos, config || {})
      : D.SQUEEZE;
    if (!data) return {};
    return W.fromSets({ call: data.call, callMix: data.callMix });
  }

  /** Jugadores extra en 9-max/MTT no modelados en el motor 6-max. */
  function extra9MaxPlayerCount() {
    return POS_9.length - POS_6.length;
  }

  /**
   * Asientos que reciben mano del rango del spot (héroe + villanos implicados).
   * El resto de asientos del motor se rellenan al azar del mazo restante.
   */
  function getScenarioDeals(scenario, config) {
    const deals = [];
    const heroSeat = heroDealSeat(scenario, config);

    if (heroSeat) {
      deals.push({ pos: heroSeat, weights: sampleHeroWeights(scenario, config), role: 'hero' });
    }
    if (scenario.type === 'vsRFI') {
      const opener = openerDealSeat(scenario, config);
      deals.push({ pos: opener, weights: sampleVillainWeights(scenario, config), role: 'opener' });
    } else if (scenario.type === 'face3bet') {
      const pk = parseFace3betKey(scenario.key);
      const tbSeat = pk.threeBettor;
      const reg = RR();
      const vsKey = 'BB_vs_' + pk.opener;
      const d = vsRfiTable(config)[vsKey] || (reg ? reg.getVsRfiRow(pk.threeBettor, pk.opener, config) : null);
      if (d) {
        deals.push({ pos: tbSeat, weights: W.fromSets({ threeBet: d.threeBet, threeBetMix: d.threeBetMix }), role: 'threeBettor' });
      }
    } else if (scenario.type === 'face4bet') {
      const opener = openerDealSeat(scenario, config);
      deals.push({ pos: opener, weights: sampleFace4betVillainWeights(config), role: 'fourBettor' });
    } else if (scenario.type === 'squeeze') {
      deals.push({ pos: scenario.openerPos, weights: sampleVillainWeights(scenario, config), role: 'opener' });
      deals.push({ pos: scenario.callerPos, weights: sampleCallerWeights(scenario, config), role: 'caller' });
    } else if (scenario.type === 'isoLimp') {
      deals.push({ pos: scenario.limperPos, weights: sampleLimpWeights(config), role: 'limper' });
    } else if (scenario.type === 'bbVsSbLimp') {
      deals.push({ pos: 'SB', weights: sampleLimpWeights(config), role: 'limper' });
    } else if (scenario.type === 'RFI') {
      const heroEng = scenario.engineHeroPos || enginePos(scenario.heroPos);
      if (heroEng && heroEng !== 'BB') {
        deals.push({ pos: 'BB', weights: sampleRfiDefenderWeights(scenario, config), role: 'defender' });
      }
    } else if (scenario.type === 'cold4bet') {
      if (scenario.openerPos) {
        deals.push({ pos: scenario.openerPos, weights: sampleVillainWeights(scenario, config), role: 'opener' });
      }
      if (scenario.threeBettorPos) {
        deals.push({ pos: scenario.threeBettorPos, weights: sampleThreeBettorWeights(scenario, config), role: 'threeBettor' });
      }
    }
    return deals;
  }

  function parseVsKey(key) {
    const parts = key.split('_');
    return { hero: parts[0], opener: parts[2] };
  }

  function matchHeroPos(scenario, filterPos, config) {
    if (!filterPos || filterPos === 'random') return true;
    const eng = enginePos(filterPos);
    if (scenario.type === 'RFI') {
      return enginePos(scenario.heroPos) === eng || scenario.heroPos === filterPos;
    }
    if (scenario.type === 'vsRFI' || scenario.type === 'face4bet') {
      const h = parseVsKey(scenario.key).hero;
      return h === eng || h === filterPos;
    }
    if (scenario.type === 'face3bet') {
      const o = parseFace3betKey(scenario.key).opener;
      return o === eng || o === filterPos;
    }
    if (scenario.type === 'isoLimp' || scenario.type === 'bbVsSbLimp' || scenario.type === 'sbLimp') {
      return scenario.heroPos === eng || scenario.heroPos === filterPos;
    }
    if (scenario.type === 'squeeze') {
      return scenario.heroPos === eng || scenario.heroPos === filterPos;
    }
    return true;
  }

  function applyHeroPosFilter(scenario, filterPos, config) {
    if (!filterPos || filterPos === 'random') return scenario;
    if (scenario.type === 'RFI') {
      scenario.heroPos = filterPos;
      scenario.engineHeroPos = enginePos(filterPos);
    } else if (scenario.type === 'vsRFI' || scenario.type === 'face4bet') {
      const pk = parseVsKey(scenario.key);
      const eng = enginePos(filterPos);
      scenario.key = eng + '_vs_' + pk.opener;
      scenario.displayHeroPos = filterPos;
      scenario.engineHeroPos = eng;
    } else if (scenario.type === 'face3bet') {
      const pk = parseFace3betKey(scenario.key);
      const eng = enginePos(filterPos);
      scenario.key = eng + '_vs_' + pk.threeBettor;
      scenario.displayHeroPos = filterPos;
      scenario.engineHeroPos = eng;
    } else if (scenario.type === 'squeeze' || scenario.type === 'isoLimp' || scenario.type === 'bbVsSbLimp' || scenario.type === 'sbLimp' || scenario.type === 'cold4bet') {
      scenario.heroPos = filterPos;
      scenario.engineHeroPos = enginePos(filterPos);
    }
    return scenario;
  }

  function buildScenarioPool(config) {
    const pool = [];
    const sc = config.scenario || 'random';
    const spin = isSpin(config);
    const phase = config.resolvedPhase || (global.PTFormatTaxonomy
      ? global.PTFormatTaxonomy.resolvePhase(config)
      : 'early');
    const pushMode = sc === 'push' || phase === 'push' || (spin && (config.stackBB || 25) <= 12 && sc === 'random');

    let types;
    if (sc === 'random') {
      if (pushMode) types = ['RFI', 'vsRFI'];
      else if (spin) types = ['RFI', 'vsRFI', 'face3bet', 'bbVsSbLimp'];
      else if (isMtt(config) && (phase === 'short' || phase === 'bubble')) types = ['RFI', 'vsRFI', 'face3bet', 'squeeze'];
      else types = ['RFI', 'vsRFI', 'face3bet', 'squeeze', 'face4bet', 'isoLimp', 'bbVsSbLimp', 'sbLimp', 'cold4bet'];
    } else {
      types = [mapScenarioType(sc)];
    }

    const rfiPos = spin ? RFI_POS_SPIN : (is9Max(config) ? RFI_POS_9 : RFI_POS_6);

    types.forEach((type) => {
      if (type === 'RFI') {
        rfiPos.forEach((p) => {
          pool.push({
            type: 'RFI',
            heroPos: p,
            engineHeroPos: enginePos(p),
            pushFold: !!pushMode
          });
        });
      } else if (type === 'vsRFI') {
        if (spin) {
          pool.push({ type: 'vsRFI', key: 'BB_vs_BTN', pushFold: !!pushMode });
          pool.push({ type: 'vsRFI', key: 'BB_vs_SB', pushFold: !!pushMode });
          pool.push({ type: 'vsRFI', key: 'SB_vs_BTN', pushFold: !!pushMode });
        } else {
          vsKeys().forEach((key) => pool.push({ type: 'vsRFI', key: key, pushFold: !!pushMode }));
        }
      } else if (type === 'face3bet') {
        if (spin) {
          pool.push({ type: 'face3bet', key: 'BTN_vs_SB' });
          pool.push({ type: 'face3bet', key: 'BTN_vs_BB' });
          pool.push({ type: 'face3bet', key: 'SB_vs_BB' });
        } else {
          vs3betKeys().forEach((key) => pool.push({ type: 'face3bet', key: key }));
        }
      } else if (type === 'squeeze') {
        if (!spin) SQUEEZE_COMBOS.forEach((c) => pool.push(Object.assign({ type: 'squeeze' }, c)));
      } else if (type === 'face4bet') {
        if (!spin) vsKeys().forEach((key) => pool.push({ type: 'face4bet', key: key }));
      } else if (type === 'isoLimp') {
        if (!spin) ISO_COMBOS.forEach((c) => pool.push(Object.assign({ type: 'isoLimp' }, c)));
      } else if (type === 'bbVsSbLimp') {
        pool.push({ type: 'bbVsSbLimp', heroPos: 'BB' });
      } else if (type === 'sbLimp') {
        if (!spin) pool.push({ type: 'sbLimp', heroPos: 'SB' });
      } else if (type === 'cold4bet') {
        if (!spin) {
          pool.push({ type: 'cold4bet', heroPos: 'CO', openerPos: 'UTG', threeBettorPos: 'HJ' });
          pool.push({ type: 'cold4bet', heroPos: 'BTN', openerPos: 'CO', threeBettorPos: 'SB' });
          pool.push({ type: 'cold4bet', heroPos: 'BB', openerPos: 'BTN', threeBettorPos: 'SB' });
        }
      }
    });
    if (!pool.length) {
      rfiPos.forEach((p) => pool.push({ type: 'RFI', heroPos: p, engineHeroPos: enginePos(p) }));
    }
    return pool;
  }

  function mapScenarioType(sc) {
    if (sc === 'rfi' || sc === 'push' || sc === 'steal') return 'RFI';
    if (sc === '3bet') return 'vsRFI';
    if (sc === 'face3bet') return 'face3bet';
    if (sc === '4bet') return 'face4bet';
    if (sc === 'squeeze') return 'squeeze';
    if (sc === 'iso') return 'isoLimp';
    if (sc === 'bbvsb') return 'bbVsSbLimp';
    if (sc === 'sbLimp') return 'sbLimp';
    if (sc === 'cold4bet') return 'cold4bet';
    return 'RFI';
  }

  function pickScenario(config, forceKey) {
    if (forceKey && forceKey.type) return forceKey;
    const cfg = normalize(config);
    let pool = buildScenarioPool(cfg);
    if (cfg.heroPos && cfg.heroPos !== 'random') {
      pool = pool.filter((s) => matchHeroPos(s, cfg.heroPos, cfg));
    }
    if (!pool.length) pool = buildScenarioPool(cfg);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return applyHeroPosFilter(Object.assign({}, picked), cfg.heroPos, cfg);
  }

  function rakeLabel(config) {
    const c = normalize(config);
    if (c.rakeMode === 'none') return 'Sin rake';
    if (c.rakeMode === 'standard') return 'Rake ~' + STANDARD_RAKE.pct + '%/' + STANDARD_RAKE.capBB + 'bb';
    return 'Rake ' + c.rakePct + '%/' + c.rakeCapBB + 'bb';
  }

  function labelFor(config) {
    const c = normalize(config);
    const Tax = global.PTFormatTaxonomy;
    const hub = Tax && Tax.HUB_LABELS ? (Tax.HUB_LABELS[c.formatHub] || c.formatHub) : c.formatHub;
    const gt = {
      cash6: 'Cash 6-max', cash9: 'Cash 9-max', mtt: 'MTT', spin3: 'Spin 3-max'
    }[c.gameType] || c.gameType;
    const sd = {
      bb200: '200bb', bb100: '100bb', bb50: '50bb', bb25: '25bb',
      bb20: '20bb', bb15: '15bb', bb10: '10bb',
      standard: '100bb', short: '50bb', deep: '200bb'
    }[c.stackDepth] || c.stackDepth;
    const sc = {
      random: 'Aleatorio', rfi: 'RFI', '3bet': '3-Bet', face3bet: 'Vs 3-Bet',
      '4bet': '4-Bet', squeeze: 'Squeeze', iso: 'Iso limp',
      bbvsb: 'BB vs SB limp', sbLimp: 'SB limp', cold4bet: 'Cold 4-Bet',
      push: 'Push/fold', steal: 'Steal'
    }[c.scenario] || c.scenario;
    const intent = Tax && Tax.INTENT_LABELS
      ? (Tax.INTENT_LABELS[c.practiceIntent] || c.practiceIntent)
      : c.practiceIntent;
    const hr = { random: 'Todas', playable: 'Jugables', borderline: 'Borderline', all: 'Todas' }[c.handRange] || c.handRange;
    const pos = c.heroPos === 'random' ? 'Pos. aleatoria' : c.heroPos;
    const vl = { fish: 'Rivales fish', intermediate: 'Rivales intermedio', pro: 'Rivales pro' }[c.villainLevel] || c.villainLevel;
    const st = { random: 'Todas las calles', preflop: 'Solo preflop', flop: 'Desde flop', turn: 'Desde turn', river: 'Desde river' }[c.practiceStreet] || c.practiceStreet;
    const block = c.handsTarget ? (c.handsTarget + ' manos') : 'Continua';
    const phase = c.formatHub !== 'cash' ? (' · ' + (c.resolvedPhase || c.mttPhase)) : '';
    const ante = c.anteBB > 0 ? (' · ante ' + c.anteBB + 'bb') : '';
    return hub + ' · ' + gt + ' · ' + sd + phase + ante + ' · ' + sc + ' · ' + intent + ' · ' + hr + ' · ' + pos + ' · ' + vl + ' · ' + st + ' · ' + block + ' · ' + rakeLabel(c);
  }

  function stackBB(config) {
    const c = normalize(config);
    if (STACK_DEPTH_BB[c.stackDepth] != null) return STACK_DEPTH_BB[c.stackDepth];
    const reg = RR();
    return reg ? reg.stackBB(c) : 100;
  }

  global.PTPlayConfig = {
    DEFAULT, normalize, pickScenario, labelFor, rakeLabel,
    STANDARD_RAKE, estimateRakeBB, potAfterRakeBB, loadRakePrefs, saveRakePrefs,
    PREFLOP_ORDER_6, isValidSqueezeCombo, buildValidSqueezeCombos, STACK_DEPTH_BB,
    POS_9, PREFLOP_ACTION_9, DEAL_ORDER_9, POS_SPIN, DEAL_ORDER_SPIN, RFI_POS_SPIN,
    sampleHeroWeights, sampleHeroHand, sampleVillainWeights, sampleRfiDefenderWeights,
    sampleFace4betVillainWeights, face4betVillainRangeStr, sampleLimpWeights,
    sampleCallerWeights, sampleThreeBettorWeights, sampleFromWeights,
    getScenarioDeals, extra9MaxPlayerCount, tablePositions, dealOrder,
    heroDealSeat, openerDealSeat, displaySeatForEngine, villainTableSeat,
    is9Max, isMtt, isSpin, is3Max, heroPositions, enginePos, parseVsKey, parseFace3betKey, filterWeights, stackBB,
    vsRfiTable, openRaiseTable, vs3betKeys, SQUEEZE_COMBOS, ISO_COMBOS, buildScenarioPool
  };
})(window);
