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

  const SQUEEZE_COMBOS = [
    { heroPos: 'BB', openerPos: 'CO', callerPos: 'BTN' },
    { heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO' },
    { heroPos: 'SB', openerPos: 'UTG', callerPos: 'CO' },
    { heroPos: 'BTN', openerPos: 'UTG', callerPos: 'HJ' },
    { heroPos: 'BTN', openerPos: 'HJ', callerPos: 'CO' }
  ];

  const DEFAULT = {
    gameType: 'cash6',
    stackDepth: 'standard',
    scenario: 'random',
    heroPos: 'random',
    handRange: 'playable',
    villainLevel: 'fish'
  };

  const RR = function () { return global.GTORangesRegistry; };

  function normalize(config) {
    const c = Object.assign({}, DEFAULT, config || {});
    if (!c.gameType) c.gameType = 'cash6';
    if (!c.stackDepth) c.stackDepth = 'standard';
    if (!c.scenario) c.scenario = 'random';
    if (!c.heroPos) c.heroPos = 'random';
    if (!c.handRange) c.handRange = 'random';
    if (!c.villainLevel) c.villainLevel = 'fish';
    return c;
  }

  function is9Max(config) {
    return config.gameType === 'cash9' || config.gameType === 'mtt';
  }

  function isMtt(config) {
    return config.gameType === 'mtt';
  }

  function heroPositions(config) {
    const c = normalize(config);
    if (c.scenario === 'rfi') return is9Max(c) ? RFI_POS_9.slice() : RFI_POS_6.slice();
    return is9Max(c) ? POS_9.slice() : POS_6.slice();
  }

  function tablePositions(config) {
    return is9Max(config) ? POS_9.slice() : POS_6.slice();
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

  function dealOrder(config) {
    return is9Max(config) ? DEAL_ORDER_9.slice() : POS_6.slice();
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

  function sampleHeroWeights(scenario, config) {
    const mode = config.handRange === 'all' ? 'random' : (config.handRange || 'playable');
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
    if (scenario.type === 'squeeze') {
      const data = D.SQUEEZE;
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

  /** Pagador en squeeze: rango de call, no cartas aleatorias. */
  function sampleCallerWeights(scenario) {
    if (scenario.type !== 'squeeze' || !scenario.callerPos) return {};
    const data = D.SQUEEZE;
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
    } else if (scenario.type === 'face4bet') {
      const opener = openerDealSeat(scenario, config);
      deals.push({ pos: opener, weights: sampleFace4betVillainWeights(config), role: 'fourBettor' });
    } else if (scenario.type === 'squeeze') {
      deals.push({ pos: scenario.openerPos, weights: sampleVillainWeights(scenario, config), role: 'opener' });
      deals.push({ pos: scenario.callerPos, weights: sampleCallerWeights(scenario), role: 'caller' });
    } else if (scenario.type === 'isoLimp') {
      deals.push({ pos: scenario.limperPos, weights: sampleLimpWeights(config), role: 'limper' });
    } else if (scenario.type === 'RFI') {
      const heroEng = scenario.engineHeroPos || enginePos(scenario.heroPos);
      if (heroEng && heroEng !== 'BB') {
        deals.push({ pos: 'BB', weights: sampleRfiDefenderWeights(scenario, config), role: 'defender' });
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
    } else if (scenario.type === 'squeeze') {
      scenario.heroPos = filterPos;
      scenario.engineHeroPos = enginePos(filterPos);
    }
    return scenario;
  }

  function buildScenarioPool(config) {
    const pool = [];
    const sc = config.scenario || 'random';
    const types = sc === 'random' ? ['RFI', 'vsRFI', 'squeeze', 'face4bet'] : [mapScenarioType(sc)];
    const rfiPos = is9Max(config) ? RFI_POS_9 : RFI_POS_6;

    types.forEach((type) => {
      if (type === 'RFI') {
        rfiPos.forEach((p) => {
          pool.push({ type: 'RFI', heroPos: p, engineHeroPos: enginePos(p) });
        });
      } else if (type === 'vsRFI') {
        vsKeys().forEach((key) => pool.push({ type: 'vsRFI', key: key }));
      } else if (type === 'squeeze') {
        SQUEEZE_COMBOS.forEach((c) => pool.push(Object.assign({ type: 'squeeze' }, c)));
      } else if (type === 'face4bet') {
        vsKeys().forEach((key) => pool.push({ type: 'face4bet', key: key }));
      }
    });
    return pool;
  }

  function mapScenarioType(sc) {
    if (sc === 'rfi') return 'RFI';
    if (sc === '3bet') return 'vsRFI';
    if (sc === '4bet') return 'face4bet';
    if (sc === 'squeeze') return 'squeeze';
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

  function labelFor(config) {
    const c = normalize(config);
    const gt = { cash6: 'Cash 6-max', cash9: 'Cash 9-max', mtt: 'MTT' }[c.gameType] || c.gameType;
    const sd = { standard: '100bb', short: '40bb', deep: '150bb' }[c.stackDepth] || c.stackDepth;
    const sc = { random: 'Aleatorio', rfi: 'RFI', '3bet': '3-Bet', '4bet': '4-Bet', squeeze: 'Squeeze' }[c.scenario] || c.scenario;
    const hr = { random: 'Todas', playable: 'Jugables', borderline: 'Borderline', all: 'Todas' }[c.handRange] || c.handRange;
    const pos = c.heroPos === 'random' ? 'Pos. aleatoria' : c.heroPos;
    const vl = { fish: 'Rivales fish', intermediate: 'Rivales intermedio', pro: 'Rivales pro' }[c.villainLevel] || c.villainLevel;
    return gt + ' · ' + sd + ' · ' + sc + ' · ' + hr + ' · ' + pos + ' · ' + vl;
  }

  function stackBB(config) {
    const reg = RR();
    return reg ? reg.stackBB(normalize(config)) : 100;
  }

  global.PTPlayConfig = {
    DEFAULT, normalize, pickScenario, labelFor,
    POS_9, PREFLOP_ACTION_9, DEAL_ORDER_9,
    sampleHeroWeights, sampleVillainWeights, sampleRfiDefenderWeights,
    sampleFace4betVillainWeights, face4betVillainRangeStr, sampleLimpWeights,
    sampleCallerWeights, sampleFromWeights,
    getScenarioDeals, extra9MaxPlayerCount, tablePositions, dealOrder,
    heroDealSeat, openerDealSeat, displaySeatForEngine, villainTableSeat,
    is9Max, isMtt, heroPositions, enginePos, parseVsKey, filterWeights, stackBB,
    vsRfiTable, openRaiseTable
  };
})(window);
