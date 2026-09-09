/*
 * tournament/leaderboard.js — Clasificación de Koins de la comunidad (usuarios reales).
 * Top 10 por Koins; si Hero no está entre ellos, aparece debajo con su posición real.
 * Incluye a todos los usuarios de la comunidad con sus puntos actuales.
 * Koins / ranking independientes por community_id.
 */
(function (global) {
  'use strict';

  var KEY = 'pt_tournament_leaderboard_v1';
  var TOP_N = 10;
  var _fetchInFlight = null;
  var _lastFetchAt = 0;

  function communityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return global.PTCommunity.id() || 'pokerforge';
      }
      if (global.PTCommunity && typeof global.PTCommunity.activeId === 'function') {
        return global.PTCommunity.activeId() || 'pokerforge';
      }
      if (global.PTCommunity && global.PTCommunity.getActive) {
        var a = global.PTCommunity.getActive();
        return (a && (a.id || a)) || 'pokerforge';
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  function storageKey() {
    return KEY + '_' + communityId();
  }

  function readBoard() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeBoard(list) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      return true;
    } catch (e) {
      return false;
    }
  }

  function isFakeSeed(row) {
    if (!row || !row.id) return true;
    var id = String(row.id);
    if (id.indexOf('c_seed_') === 0 || id.indexOf('seed_') === 0) return true;
    if (row.seed || row.fake) return true;
    return false;
  }

  function heroIdentity() {
    var name = 'Hero';
    var id = 'local-hero';
    try {
      if (global.Store && global.Store.getUserId) {
        var uid = global.Store.getUserId();
        if (uid) id = String(uid);
      }
    } catch (e0) { /* */ }
    try {
      if (global.PTProfile && PTProfile.getTournamentDisplayName) {
        name = PTProfile.getTournamentDisplayName({ fallback: 'Hero' });
      } else {
        var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
        if (u) {
          name = u.displayName || u.name || u.email || name;
          if (u.id || u.sub) id = String(u.id || u.sub);
        }
      }
      var u2 = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u2 && (u2.id || u2.sub)) id = String(u2.id || u2.sub);
    } catch (e1) { /* */ }
    return { id: id, name: String(name).slice(0, 40) };
  }

  function supabaseClient() {
    try {
      if (global.PTSupabase && typeof global.PTSupabase.getClient === 'function') {
        return global.PTSupabase.getClient();
      }
    } catch (e) { /* */ }
    return null;
  }

  function mergeRows(base, incoming) {
    var map = {};
    (base || []).forEach(function (r) {
      if (!r || isFakeSeed(r)) return;
      map[String(r.id)] = r;
    });
    (incoming || []).forEach(function (r) {
      if (!r || isFakeSeed(r) || !r.id) return;
      var id = String(r.id);
      var prev = map[id];
      if (!prev) {
        map[id] = r;
        return;
      }
      var prevTs = Date.parse(prev.updatedAt || 0) || 0;
      var nextTs = Date.parse(r.updatedAt || 0) || 0;
      var merged = nextTs >= prevTs ? Object.assign({}, prev, r) : Object.assign({}, r, prev);
      merged.tournamentsPlayed = Math.max(
        Number(prev.tournamentsPlayed) || 0,
        Number(r.tournamentsPlayed) || 0
      );
      map[id] = merged;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /**
   * Publica el saldo del Hero en el board local y sincroniza cloud.
   */
  function publishHero(opts) {
    opts = opts || {};
    var hero = heroIdentity();
    var bal = 0;
    var played = 0;
    try {
      if (global.PTTournamentWallet && PTTournamentWallet.getBalance) {
        bal = Number(PTTournamentWallet.getBalance()) || 0;
      }
      if (global.PTTournamentWallet && PTTournamentWallet.getTournamentsPlayed) {
        played = Number(PTTournamentWallet.getTournamentsPlayed()) || 0;
      }
    } catch (e) { /* */ }
    var row = {
      id: hero.id,
      name: hero.name,
      koins: bal,
      tournamentsPlayed: played,
      updatedAt: new Date().toISOString(),
      isHero: true,
      communityId: communityId()
    };
    /* Sustituir fila del héroe (no max con valor viejo del board). */
    var others = readBoard().filter(function (x) {
      return !isFakeSeed(x) && String(x.id) !== String(hero.id);
    });
    var list = mergeRows(others, [row]);
    writeBoard(list);
    if (!opts.skipCloud) {
      try {
        var c = supabaseClient();
        if (c && c.rpc) {
          Promise.resolve(c.rpc('pt_upsert_my_tournament_koins', {
            p_community_id: communityId(),
            p_koins: bal,
            p_display_name: hero.name,
            p_tournaments_played: played
          })).catch(function () { /* */ });
        }
      } catch (eRpc) { /* */ }
    }
    return list;
  }

  function applyRemoteMembers(members) {
    var rows = (members || []).map(function (m) {
      if (!m) return null;
      var id = m.user_id || m.id;
      if (!id) return null;
      var played = Number(m.tournaments_played != null ? m.tournaments_played : m.tournamentsPlayed) || 0;
      return {
        id: String(id),
        name: String(m.display_name || m.name || m.email || 'Jugador').slice(0, 40),
        koins: Math.round((Number(m.koins != null ? m.koins : m.balance) || 0) * 100) / 100,
        tournamentsPlayed: played,
        updatedAt: m.updated_at || m.updatedAt || null,
        isHero: false
      };
    }).filter(Boolean);
    var list = mergeRows(publishHero({ skipCloud: true }), rows);
    writeBoard(list);
    return list;
  }

  function refreshFromCloud() {
    var now = Date.now();
    if (_fetchInFlight) return _fetchInFlight;
    if (now - _lastFetchAt < 15000) return Promise.resolve(readBoard());
    var c = supabaseClient();
    if (!c || !c.rpc) return Promise.resolve(publishHero());
    _lastFetchAt = now;
    _fetchInFlight = Promise.resolve(c.rpc('pt_list_community_tournament_koins', {
      p_community_id: communityId()
    })).then(function (res) {
      _fetchInFlight = null;
      if (res && !res.error && res.data) {
        var members = res.data.members || res.data.rows || res.data;
        if (Array.isArray(members)) applyRemoteMembers(members);
      }
      return readBoard();
    }).catch(function () {
      _fetchInFlight = null;
      return readBoard();
    });
    return _fetchInFlight;
  }

  function sortedBoard() {
    var hero = heroIdentity();
    var list = publishHero({ skipCloud: true }).slice().filter(function (x) {
      return !isFakeSeed(x);
    });
    list.sort(function (a, b) {
      if ((b.koins || 0) !== (a.koins || 0)) return (b.koins || 0) - (a.koins || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return list.map(function (row, i) {
      return {
        rank: i + 1,
        id: row.id,
        name: row.name,
        koins: Math.round((Number(row.koins) || 0) * 100) / 100,
        tournamentsPlayed: Number(row.tournamentsPlayed) || 0,
        isHero: String(row.id) === String(hero.id) || !!row.isHero,
        medal: i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : null))
      };
    });
  }

  function rankings(limit) {
    limit = limit == null ? TOP_N : limit;
    return sortedBoard().slice(0, limit);
  }

  function heroStanding() {
    var all = sortedBoard();
    for (var i = 0; i < all.length; i++) {
      if (all[i].isHero) return all[i];
    }
    return null;
  }

  function medalGlyph(medal) {
    if (medal === 'gold') return '🥇';
    if (medal === 'silver') return '🥈';
    if (medal === 'bronze') return '🥉';
    return '';
  }

  function rowHtml(r) {
    var medal = r.medal ? ('<span class="trn-lb-medal trn-lb-medal-' + r.medal + '" title="' + r.medal + '">' +
      medalGlyph(r.medal) + '</span>') : ('<span class="trn-lb-medal">' + r.rank + '</span>');
    return '<tr class="' + (r.isHero ? 'is-hero' : '') + '">' +
      '<td>' + medal + '</td>' +
      '<td>' + (r.isHero ? ('<strong>' + escapeHtml(r.name) + '</strong> <span class="trn-lb-you">(Hero)</span>') : escapeHtml(r.name)) + '</td>' +
      '<td>' + escapeHtml(String(r.koins)) + '</td></tr>';
  }

  function renderHtml() {
    try { refreshFromCloud(); } catch (e) { /* */ }
    var rows = rankings(TOP_N);
    var hero = heroStanding();
    var heroInTop = rows.some(function (r) { return r.isHero; });
    var body;
    if (!rows.length) {
      body = '<tr><td colspan="3" class="muted">Aún no hay jugadores en esta comunidad.</td></tr>';
    } else {
      body = rows.map(rowHtml).join('');
      if (hero && !heroInTop) {
        body += '<tr class="trn-lb-separator" aria-hidden="true"><td colspan="3"></td></tr>';
        body += rowHtml(hero);
      }
    }
    return '<section class="trn-leaderboard" aria-label="Clasificación de Koins">' +
      '<h3>Clasificación de la comunidad</h3>' +
      '<table class="trn-leaderboard-table"><thead><tr><th>#</th><th>Jugador</th><th>Koins</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></section>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function legendHtml() {
    return '<aside class="trn-koins-legend">' +
      '<h3>Cómo ganar Koins</h3>' +
      '<ul>' +
      '<li>Partes de <strong>0</strong> Koins; se ganan con actividad</li>' +
      '<li><strong>+1</strong> por cada lección de Escuela aprobada</li>' +
      '<li><strong>+1</strong> cada 25 manos en el Entrenador</li>' +
      '<li><strong>+2</strong> por cada rol de rival acertado al terminar un torneo</li>' +
      '<li>Premios de torneo según el puesto (se suman a tu saldo)</li>' +
      '<li>Necesitas Koins suficientes para pagar el buy-in</li>' +
      '</ul></aside>';
  }

  global.PTTournamentLeaderboard = {
    publishHero: publishHero,
    rankings: rankings,
    heroStanding: heroStanding,
    sortedBoard: sortedBoard,
    renderHtml: renderHtml,
    legendHtml: legendHtml,
    communityId: communityId,
    refreshFromCloud: refreshFromCloud,
    TOP_N: TOP_N
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
