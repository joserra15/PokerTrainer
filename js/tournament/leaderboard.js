/*
 * tournament/leaderboard.js — Clasificación de Koins de la comunidad (local + sync ligera).
 */
(function (global) {
  'use strict';

  var KEY = 'pt_tournament_leaderboard_v1';

  function communityId() {
    try {
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
      var u = global.PTAuth && PTAuth.getUser ? PTAuth.getUser() : (global.PT_AUTH_USER || null);
      if (u) {
        name = u.displayName || u.name || u.email || name;
        if (u.id || u.sub) id = String(u.id || u.sub);
      }
    } catch (e1) { /* */ }
    return { id: id, name: String(name).slice(0, 40) };
  }

  function seedPeers(heroId) {
    var seeds = [
      { id: 'c_seed_1', name: 'MesaNorte', koins: 186 },
      { id: 'c_seed_2', name: 'RangeLab', koins: 154 },
      { id: 'c_seed_3', name: 'ICMPulse', koins: 132 },
      { id: 'c_seed_4', name: 'FeltWalker', koins: 118 },
      { id: 'c_seed_5', name: 'OrbitalBB', koins: 97 },
      { id: 'c_seed_6', name: 'SoftClock', koins: 81 },
      { id: 'c_seed_7', name: 'Gridlock', koins: 64 },
      { id: 'c_seed_8', name: 'TinCup', koins: 49 }
    ];
    return seeds.filter(function (s) { return s.id !== heroId; });
  }

  /** Publica el saldo actual del Hero en la tabla de su comunidad. */
  function publishHero() {
    var hero = heroIdentity();
    var bal = 100;
    try {
      if (global.PTTournamentWallet && PTTournamentWallet.getBalance) {
        bal = Number(PTTournamentWallet.getBalance()) || 0;
      }
    } catch (e) { /* */ }
    var list = readBoard().filter(function (x) {
      return x && x.id && String(x.id).indexOf('c_seed_') !== 0;
    });
    var found = false;
    list = list.map(function (x) {
      if (String(x.id) === String(hero.id)) {
        found = true;
        return { id: hero.id, name: hero.name, koins: bal, updatedAt: new Date().toISOString(), isHero: true };
      }
      return x;
    });
    if (!found) {
      list.push({ id: hero.id, name: hero.name, koins: bal, updatedAt: new Date().toISOString(), isHero: true });
    }
    /* Mantener seeds de comunidad para rellenar la tabla si hay pocos usuarios reales. */
    seedPeers(hero.id).forEach(function (s) {
      if (!list.some(function (x) { return x.id === s.id; })) {
        list.push({ id: s.id, name: s.name, koins: s.koins, updatedAt: null, isHero: false, seed: true });
      }
    });
    writeBoard(list);
    return list;
  }

  function rankings(limit) {
    limit = limit || 20;
    var hero = heroIdentity();
    var list = publishHero().slice();
    list.sort(function (a, b) {
      if ((b.koins || 0) !== (a.koins || 0)) return (b.koins || 0) - (a.koins || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return list.slice(0, limit).map(function (row, i) {
      return {
        rank: i + 1,
        id: row.id,
        name: row.name,
        koins: Math.round((Number(row.koins) || 0) * 100) / 100,
        isHero: String(row.id) === String(hero.id) || !!row.isHero,
        medal: i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : null))
      };
    });
  }

  function medalGlyph(medal) {
    if (medal === 'gold') return '🥇';
    if (medal === 'silver') return '🥈';
    if (medal === 'bronze') return '🥉';
    return '';
  }

  function renderHtml() {
    var rows = rankings(15);
    var body = rows.map(function (r) {
      var medal = r.medal ? ('<span class="trn-lb-medal trn-lb-medal-' + r.medal + '" title="' + r.medal + '">' +
        medalGlyph(r.medal) + '</span>') : ('<span class="trn-lb-medal">' + r.rank + '</span>');
      return '<tr class="' + (r.isHero ? 'is-hero' : '') + '">' +
        '<td>' + medal + '</td>' +
        '<td>' + (r.isHero ? ('<strong>' + escapeHtml(r.name) + '</strong> <span class="trn-lb-you">(Hero)</span>') : escapeHtml(r.name)) + '</td>' +
        '<td>' + escapeHtml(String(r.koins)) + '</td></tr>';
    }).join('');
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
      '<li><strong>+1</strong> por cada lección de Escuela aprobada</li>' +
      '<li><strong>+1</strong> cada 25 manos en el Entrenador</li>' +
      '<li><strong>+2</strong> por cada rol de rival acertado al terminar un torneo</li>' +
      '<li>Premios de torneo según el puesto (se suman a tu saldo)</li>' +
      '<li>Si llegas a <strong>0</strong> Koins no puedes pagar buy-ins</li>' +
      '</ul></aside>';
  }

  global.PTTournamentLeaderboard = {
    publishHero: publishHero,
    rankings: rankings,
    renderHtml: renderHtml,
    legendHtml: legendHtml,
    communityId: communityId
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
