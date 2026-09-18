/*
 * villain-assist-cache.js — L1 (sesión) + L3 (Supabase) para decisiones de assist.
 * Hits no consumen cupo. Escritura solo tras respuesta Gemini válida.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var l1 = Object.create(null);
  var l1Order = [];
  var L1_MAX = 200;

  function spotKeyString(parts) {
    if (!parts) return '';
    if (typeof parts === 'string') return parts;
    var Spot = global.GTOSpotKey;
    var base = '';
    if (Spot && Spot.spotKeyString && Spot.buildSpotKey) {
      try {
        base = Spot.spotKeyString(Spot.buildSpotKey(parts.spotInput || parts));
      } catch (e) { base = ''; }
    }
    return [
      'v' + (parts.schemaVersion != null ? parts.schemaVersion : SCHEMA_VERSION),
      base || parts.baseKey || '?',
      parts.handBand || '-',
      parts.facingSizeBucket || '-',
      parts.playersInPot || 'hu',
      parts.formatHub || 'mtt',
      parts.icmBucket || 'none',
      parts.roleBucket || 'pro'
    ].join('|');
  }

  function facingSizeBucket(toCallBB, potBB) {
    var pot = Math.max(0.5, Number(potBB) || 1);
    var tc = Math.max(0, Number(toCallBB) || 0);
    if (tc <= 0) return 'none';
    var r = tc / pot;
    if (r >= 2.5) return 'jam';
    if (r >= 1.15) return 'over';
    if (r >= 0.75) return 'pot';
    if (r >= 0.4) return 'half';
    return 'third';
  }

  function icmBucket(phase) {
    var p = String(phase || '').toLowerCase();
    if (p === 'hu') return 'hu';
    if (p === 'bubble' || p === 'mincash') return 'bubble';
    if (p === 'ft' || p === 'ft9') return 'ft';
    if (p === 'early') return 'early';
    if (p === 'late' || p === 'short' || p === 'push') return 'late';
    return 'none';
  }

  function buildKeyFromCtx(ctx) {
    ctx = ctx || {};
    return spotKeyString({
      schemaVersion: SCHEMA_VERSION,
      spotInput: {
        board: ctx.board || [],
        potBB: ctx.potBB,
        stackDepth: ctx.stackBB || ctx.effStackBB,
        effStack: ctx.effStackBB || ctx.stackBB,
        gameType: ctx.gameType || ctx.formatHub,
        street: ctx.street,
        position: ctx.position,
        vsPosition: ctx.vsPosition,
        initiative: ctx.initiative,
        spotKind: ctx.street === 'preflop' ? 'preflop' : 'postflop',
        toCallBB: ctx.toCallBB,
        inPosition: ctx.inPosition,
        priorAggressorBet: ctx.priorAggressorBet,
        rangeContext: { gameType: ctx.gameType, stackDepth: ctx.stackLabel },
        spr: ctx.spr
      },
      handBand: ctx.handBand || 'merge',
      facingSizeBucket: ctx.facingSizeBucket || facingSizeBucket(ctx.toCallBB, ctx.potBB),
      playersInPot: (ctx.playersInPot >= 3 || ctx.multiway) ? 'mw' : 'hu',
      formatHub: ctx.formatHub || 'mtt',
      icmBucket: ctx.icmBucket || icmBucket(ctx.effectivePhase || ctx.mttPhase),
      roleBucket: ctx.roleBucket || 'pro'
    });
  }

  function l1Get(key) {
    return key && l1[key] ? l1[key] : null;
  }

  function l1Set(key, entry) {
    if (!key || !entry) return;
    if (!l1[key]) {
      l1Order.push(key);
      while (l1Order.length > L1_MAX) {
        var old = l1Order.shift();
        delete l1[old];
      }
    }
    l1[key] = entry;
  }

  function clearL1() {
    l1 = Object.create(null);
    l1Order = [];
  }

  function sampleFromFreqs(freqs, rnd) {
    rnd = rnd == null ? Math.random() : rnd;
    var keys = Object.keys(freqs || {}).filter(function (k) {
      return k.charAt(0) !== '_' && (Number(freqs[k]) || 0) > 0;
    });
    if (!keys.length) return null;
    var sum = 0;
    keys.forEach(function (k) { sum += Math.max(0, Number(freqs[k]) || 0); });
    if (sum <= 0) return keys[0];
    var roll = rnd * sum;
    var acc = 0;
    for (var i = 0; i < keys.length; i++) {
      acc += Math.max(0, Number(freqs[keys[i]]) || 0);
      if (roll <= acc) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var freqs = raw.action_freqs || raw.freqs || null;
    var action = raw.action || null;
    if (!action && freqs) {
      var id = sampleFromFreqs(freqs);
      if (id) action = { id: id, amount: raw.size_bb != null ? raw.size_bb : raw.sizeBB };
    }
    if (!action || !action.id) return null;
    return {
      action: { id: String(action.id).toLowerCase(), amount: action.amount != null ? action.amount : action.sizeBB },
      freqs: freqs || null,
      samples: Number(raw.samples) || 1,
      confidence: Number(raw.confidence) || 0.5,
      source: raw.source || 'cache'
    };
  }

  async function l3Lookup(key) {
    if (!key) return null;
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (!c || !c.rpc) return null;
      var res = await c.rpc('pt_villain_assist_cache_get', {
        p_spot_key: key,
        p_schema_version: SCHEMA_VERSION
      });
      if (res.error || !res.data) return null;
      var row = Array.isArray(res.data) ? res.data[0] : res.data;
      return normalizeEntry(row);
    } catch (e) {
      return null;
    }
  }

  async function l3Write(key, payload) {
    if (!key || !payload) return false;
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (!c || !c.rpc) return false;
      var freqs = payload.freqs || {};
      if (payload.action && payload.action.id && !Object.keys(freqs).length) {
        freqs[payload.action.id] = 1;
      }
      var res = await c.rpc('pt_villain_assist_cache_put', {
        p_spot_key: key,
        p_schema_version: SCHEMA_VERSION,
        p_action_freqs: freqs,
        p_size_bb: payload.action && payload.action.amount != null ? Number(payload.action.amount) : null,
        p_confidence: payload.confidence != null ? Number(payload.confidence) : 0.5,
        p_model: payload.model || null,
        p_prompt_version: payload.promptVersion || 'v1'
      });
      return !res.error;
    } catch (e) {
      return false;
    }
  }

  async function lookup(key) {
    var hit = l1Get(key);
    if (hit) {
      hit = normalizeEntry(Object.assign({}, hit, { source: 'l1' }));
      if (hit) return hit;
    }
    var remote = await l3Lookup(key);
    if (remote) {
      l1Set(key, remote);
      remote.source = 'l3';
      return remote;
    }
    return null;
  }

  async function write(key, payload) {
    var entry = normalizeEntry(Object.assign({}, payload, { source: payload.source || 'gemini' }));
    if (!entry) return false;
    l1Set(key, entry);
    await l3Write(key, entry);
    return true;
  }

  global.PTVillainAssistCache = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    buildKeyFromCtx: buildKeyFromCtx,
    spotKeyString: spotKeyString,
    facingSizeBucket: facingSizeBucket,
    icmBucket: icmBucket,
    lookup: lookup,
    write: write,
    l1Get: l1Get,
    l1Set: l1Set,
    clearL1: clearL1,
    sampleFromFreqs: sampleFromFreqs,
    normalizeEntry: normalizeEntry
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
