/*
 * legendary-hands.js — Manos legendarias: hub, juego ciego, historia, timeline, otro rol.
 * Pestaña propia en el menú principal (solo administradores, no demo).
 */
(function (global) {
  'use strict';

  var VIEW = { hub: 'hub', story: 'story', after: 'after', timeline: 'timeline', roles: 'roles' };

  var state = {
    view: VIEW.hub,
    handId: null,
    heroId: null,
    lastResult: null
  };

  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function Cards() { return global.Cards; }

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  function hasAdminAccess() {
    if (typeof global.isLegendaryAdminUser === 'function') {
      return !!global.isLegendaryAdminUser();
    }
    if (isDemoActive()) return false;
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (u && u.isAdmin) return true;
    var ent = global.PTEntitlements && global.PTEntitlements.get ? global.PTEntitlements.get() : null;
    return !!(ent && ent.is_admin);
  }

  function legendaryMenuVisible() {
    return hasAdminAccess();
  }

  function refreshTabVisibility() {
    if (typeof global.refreshLegendaryTabVisibility === 'function') {
      global.refreshLegendaryTabVisibility();
      return;
    }
    var tab = document.querySelector('.tab[data-tab="legendary"]');
    if (tab) tab.classList.toggle('hidden', !legendaryMenuVisible());
  }

  function Catalog() { return global.PTLegendaryCatalog; }
  function Force() { return global.PTLegendaryForce; }
  function Store() { return global.Store; }

  function defaultLegendaryStats() {
    return { played: {}, revealed: [], favorites: [], updatedAt: 0 };
  }

  function readLegendaryStats() {
    var st = Store && Store.getStats ? Store.getStats() : null;
    if (!st) return defaultLegendaryStats();
    if (!st.legendaryHands || typeof st.legendaryHands !== 'object') {
      st.legendaryHands = defaultLegendaryStats();
    }
    return st.legendaryHands;
  }

  function saveLegendaryProgress(handId, heroId) {
    if (!Store || !Store.getStats || !Store.saveStats) return;
    var st = Store.getStats();
    if (!st.legendaryHands) st.legendaryHands = defaultLegendaryStats();
    var lh = st.legendaryHands;
    var rec = lh.played[handId] || { count: 0, roles: [], lastAt: 0 };
    rec.count += 1;
    rec.lastAt = Date.now();
    if (rec.roles.indexOf(heroId) < 0) rec.roles.push(heroId);
    lh.played[handId] = rec;
    if (lh.revealed.indexOf(handId) < 0) lh.revealed.push(handId);
    lh.updatedAt = Date.now();
    Store.saveStats(st);
  }

  function playedCount() {
    var lh = readLegendaryStats();
    return Object.keys(lh.played || {}).length;
  }

  function rolePlayed(handId, heroId) {
    var rec = readLegendaryStats().played[handId];
    return rec && rec.roles && rec.roles.indexOf(heroId) >= 0;
  }

  function formatEvent(h) {
    var ev = h.event || {};
    var parts = [ev.name || ''];
    if (ev.stage) parts.push(ev.stage);
    if (h.year) parts.push(String(h.year));
    return parts.filter(Boolean).join(' · ');
  }

  function formatDate(h) {
    if (h.date) {
      try {
        return new Date(h.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) { return h.date; }
    }
    return h.year ? String(h.year) : '';
  }

  function castFlags(h) {
    var seen = {};
    var out = [];
    (h.cast || []).forEach(function (m) {
      if (seen[m.countryLabel]) return;
      seen[m.countryLabel] = true;
      out.push(m.countryLabel);
    });
    return out.join(' · ');
  }

  function cardHtml(cards) {
    if (!cards || !cards.length || !Cards()) return '';
    return cards.map(function (c) { return Cards().cardToHTML(c); }).join('');
  }

  function openVideo(handDef) {
    var url = handDef.media && handDef.media.videoUrl;
    if (!url) return;
    global.open(url, '_blank', 'noopener,noreferrer');
  }

  function ensureLegendaryScene() {
    var playActive = $('#play-active');
    if (!playActive) return null;
    var stage = playActive.querySelector('.play-stage');
    if (!stage) return null;
    var wrap = stage.querySelector('.legendary-scene-wrap');
    if (!wrap) {
      var tableWrap = stage.querySelector('.table-wrap');
      if (!tableWrap) return null;
      wrap = document.createElement('div');
      wrap.className = 'legendary-scene-wrap';
      tableWrap.parentNode.insertBefore(wrap, tableWrap);
      wrap.appendChild(tableWrap);
    }
    return wrap;
  }

  function applyLegendaryChrome(handDef) {
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    document.body.classList.add('legendary-play-active');
    var wrap = ensureLegendaryScene();
    if (wrap) {
      wrap.setAttribute('data-legendary-theme', theme);
      var badge = wrap.querySelector('.legendary-event-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'legendary-event-badge';
        wrap.appendChild(badge);
      }
      badge.textContent = (handDef.event && handDef.event.series) || 'Legendary';
    }
  }

  function clearLegendaryChrome() {
    document.body.classList.remove('legendary-play-active');
    var badge = document.querySelector('.legendary-event-badge');
    if (badge) badge.remove();
    var playActive = $('#play-active');
    if (playActive) playActive.classList.remove('is-legendary-session');
  }

  function pickRandomHero(handDef) {
    var cands = handDef.heroCandidates || [];
    if (!cands.length) return (handDef.cast[0] && handDef.cast[0].playerId) || null;
    return cands[Math.floor(Math.random() * cands.length)];
  }

  function playHand(handId, opts) {
    opts = opts || {};
    var handDef = Catalog() && Catalog().get(handId);
    var ForceMod = Force();
    if (!handDef || !ForceMod) return false;
    var heroId = opts.heroId || pickRandomHero(handDef);
    if (!heroId || !handDef.play.roles[heroId]) return false;

    state.handId = handId;
    state.heroId = heroId;
    state.lastResult = null;

    var force = ForceMod.toForce(handDef, heroId);
    var pc = ForceMod.playConfig(handDef, heroId, { blind: opts.blind !== false });
    if (!force || !global.playAnalysisHand) return false;

    applyLegendaryChrome(handDef);
    global.playAnalysisHand(force, pc);
    return true;
  }

  function afterHandFinished(engineHand) {
    var pc = (engineHand && engineHand.playConfig) || {};
    if (!pc.legendaryMode || !pc.legendaryHandId) return false;

    var handDef = Catalog() && Catalog().get(pc.legendaryHandId);
    if (!handDef) return false;

    state.handId = pc.legendaryHandId;
    state.heroId = pc.legendaryHeroId;
    state.lastResult = engineHand && engineHand.result ? engineHand.result : null;
    state.view = VIEW.story;

    clearLegendaryChrome();
    saveLegendaryProgress(pc.legendaryHandId, pc.legendaryHeroId);

    if (global.goToTab) global.goToTab('legendary');
    render($('#legendary-content'));
    return true;
  }

  function renderHub(root) {
    var cat = Catalog();
    if (!cat) {
      root.innerHTML = '<p class="muted-text">Cargando catálogo…</p>';
      return;
    }
    var hands = cat.list();
    var nPlayed = playedCount();
    var html = '<div class="legendary-panel legendary-hub">';
    html += '<div class="legendary-hub-head">';
    html += '<h2>Manos legendarias</h2>';
    html += '<p class="muted-text">Juega manos reales de pros en mesa broadcast. No sabrás quién eres hasta el final.</p>';
    html += '<p class="legendary-progress">' + nPlayed + ' / ' + hands.length + ' manos jugadas</p>';
    html += '<div class="legendary-hub-actions">';
    html += '<button type="button" class="btn btn-primary" id="legendary-random">Jugar al azar</button>';
    html += '</div></div>';
    html += '<div class="legendary-grid">';
    hands.forEach(function (h) {
      var feat = h.featured ? ' legendary-card-featured' : '';
      html += '<button type="button" class="legendary-card' + feat + '" data-hand-id="' + esc(h.id) + '">';
      html += '<div class="legendary-card-year">' + esc(String(h.year)) + ' · ' + esc((h.event && h.event.series) || '') + '</div>';
      html += '<div class="legendary-card-title">' + esc(h.titleBlind) + '</div>';
      html += '<div class="legendary-card-meta">' + esc(formatEvent(h)) + '</div>';
      html += '<div class="legendary-card-flags">' + esc(castFlags(h)) + '</div>';
      if (h.tags && h.tags.length) {
        html += '<div class="legendary-card-tags">';
        h.tags.slice(0, 3).forEach(function (t) {
          html += '<span class="legendary-tag">' + esc(t) + '</span>';
        });
        html += '</div>';
      }
      html += '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;

    var randomBtn = $('#legendary-random');
    if (randomBtn) {
      randomBtn.addEventListener('click', function () {
        var h = cat.random();
        if (h) playHand(h.id, { blind: true });
      });
    }
    root.querySelectorAll('[data-hand-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        playHand(btn.getAttribute('data-hand-id'), { blind: true });
      });
    });
  }

  function renderStory(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var heroMember = Force() && Force().castMember(handDef, state.heroId);
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    var story = handDef.story || {};

    var html = '<div class="legendary-panel legendary-story">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-hub">&laquo; Biblioteca</button>';
    html += '<div class="legendary-story-head" data-theme="' + esc(theme) + '">';
    html += '<p class="legendary-story-kicker">La mano revelada</p>';
    html += '<h2 class="legendary-story-title">' + esc(handDef.title) + '</h2>';
    html += '<p class="legendary-story-event">' + esc(formatEvent(handDef)) + ' · ' + esc(formatDate(handDef)) + '</p>';
    html += '</div>';
    html += '<p class="legendary-story-body">' + esc(story.es || '') + '</p>';
    if (story.highlights && story.highlights.length) {
      html += '<ul class="legendary-story-highlights">';
      story.highlights.forEach(function (b) { html += '<li>' + esc(b) + '</li>'; });
      html += '</ul>';
    }
    if (heroMember) {
      html += '<p class="muted-text"><strong>Jugaste como:</strong> ' + esc(heroMember.displayName) +
        ' (' + esc(heroMember.countryLabel) + ' · ' + esc(heroMember.pos) + ')</p>';
    }
    html += '<div class="legendary-cast-grid">';
    (handDef.cast || []).forEach(function (m) {
      var you = m.playerId === state.heroId ? ' is-you' : '';
      html += '<div class="legendary-cast-card' + you + '">';
      html += '<div class="legendary-cast-name">' + esc(m.displayName) + '</div>';
      html += '<div class="legendary-cast-country">' + esc(m.countryLabel) + '</div>';
      html += '<div class="legendary-cast-pos">' + esc(m.pos) + '</div>';
      if (m.cards) html += '<div class="legendary-cast-cards">' + cardHtml(m.cards) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    if (handDef.media && handDef.media.videoUrl) {
      html += '<button type="button" class="legendary-video-btn" id="legendary-open-video">&#9654; ' +
        esc(handDef.media.videoLabel || 'Ver la mano original') + '</button>';
    }
    html += '<button type="button" class="btn btn-primary" id="legendary-continue">Continuar &raquo;</button>';
    html += '</div>';
    root.innerHTML = html;

    $('#legendary-back-hub').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
    $('#legendary-continue').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    var vid = $('#legendary-open-video');
    if (vid) vid.addEventListener('click', function () { openVideo(handDef); });
  }

  function renderAfter(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var html = '<div class="legendary-panel legendary-story">';
    html += '<h2>¿Qué quieres hacer ahora?</h2>';
    html += '<p class="muted-text">' + esc(handDef.titleBlind) + '</p>';
    html += '<div class="legendary-after-actions">';
    html += '<button type="button" class="btn btn-primary" id="legendary-show-timeline">Ver qué pasó en realidad</button>';
    html += '<button type="button" class="btn btn-ghost" id="legendary-other-role">Jugar con otro rol</button>';
    html += '<button type="button" class="btn btn-ghost" id="legendary-back-hub2">Volver al hub</button>';
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-show-timeline').addEventListener('click', function () {
      state.view = VIEW.timeline;
      render(root);
    });
    $('#legendary-other-role').addEventListener('click', function () {
      state.view = VIEW.roles;
      render(root);
    });
    $('#legendary-back-hub2').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
  }

  function renderTimeline(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef || !handDef.timeline) {
      state.view = VIEW.after;
      renderAfter(root);
      return;
    }
    var heroMember = Force() && Force().castMember(handDef, state.heroId);
    var heroName = heroMember ? heroMember.displayName : '';
    var html = '<div class="legendary-panel legendary-timeline">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-after">&laquo; Volver</button>';
    html += '<h2>Línea original</h2>';
    html += '<p class="muted-text">Nombres reales · ' + esc(handDef.title) + '</p>';
    handDef.timeline.forEach(function (item) {
      if (item.kind === 'street') {
        html += '<div class="legendary-tl-street">' + esc(item.street);
        if (item.board && item.board.length) {
          html += '<span class="legendary-tl-board">' + cardHtml(item.board) + '</span>';
        }
        html += '</div>';
      } else if (item.kind === 'show') {
        html += '<div class="legendary-tl-action">';
        html += '<span class="legendary-tl-player">' + esc(item.player) + '</span>';
        html += ' muestra <span class="legendary-tl-show">' + cardHtml(item.cards) + '</span>';
        html += '</div>';
      } else {
        var isHero = item.player === heroName;
        html += '<div class="legendary-tl-action' + (isHero ? ' is-hero' : '') + '">';
        html += '<span class="legendary-tl-player">' + esc(item.player) +
          (item.pos ? ' (' + esc(item.pos) + ')' : '') + '</span>';
        html += '<span class="legendary-tl-move">' + esc(item.type) + '</span>';
        html += '</div>';
      }
    });
    html += '<div class="legendary-after-actions" style="margin-top:20px">';
    html += '<button type="button" class="btn btn-primary" id="legendary-other-role2">Jugar con otro rol</button>';
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-back-after').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    $('#legendary-other-role2').addEventListener('click', function () {
      state.view = VIEW.roles;
      render(root);
    });
  }

  function renderRolePicker(root) {
    var handDef = Catalog() && Catalog().get(state.handId);
    if (!handDef) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var html = '<div class="legendary-panel legendary-story">';
    html += '<button type="button" class="btn btn-ghost btn-small" id="legendary-back-after2">&laquo; Volver</button>';
    html += '<h2>Elige tu rol</h2>';
    html += '<p class="muted-text">Misma mano, otra perspectiva · modo ciego</p>';
    html += '<div class="legendary-role-list">';
    (handDef.heroCandidates || []).forEach(function (pid) {
      var m = Force() && Force().castMember(handDef, pid);
      if (!m) return;
      var played = rolePlayed(handDef.id, pid) ? ' played' : '';
      html += '<button type="button" class="legendary-role-btn' + played + '" data-hero-id="' + esc(pid) + '">';
      html += '<span>' + esc(m.displayName) + ' · ' + esc(m.countryLabel) + ' · ' + esc(m.pos) + '</span>';
      html += '<span class="muted-text">' + (played ? '✓' : '') + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;

    $('#legendary-back-after2').addEventListener('click', function () {
      state.view = VIEW.after;
      render(root);
    });
    root.querySelectorAll('[data-hero-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        playHand(state.handId, { heroId: btn.getAttribute('data-hero-id'), blind: true });
      });
    });
  }

  function render(container) {
    var root = container || document.getElementById('legendary-content');
    if (!root) return;
    if (!legendaryMenuVisible()) {
      root.innerHTML = '<div class="legendary-panel"><p class="muted-text">Manos legendarias — solo administración.</p></div>';
      return;
    }
    if (state.view === VIEW.story) renderStory(root);
    else if (state.view === VIEW.after) renderAfter(root);
    else if (state.view === VIEW.timeline) renderTimeline(root);
    else if (state.view === VIEW.roles) renderRolePicker(root);
    else renderHub(root);
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pt-auth-ready', refreshTabVisibility);
    global.addEventListener('pt-guest-ready', refreshTabVisibility);
    global.addEventListener('DOMContentLoaded', refreshTabVisibility);
  }

  global.PTLegendary = {
    render: render,
    playHand: playHand,
    afterHandFinished: afterHandFinished,
    legendaryMenuVisible: legendaryMenuVisible,
    refreshTabVisibility: refreshTabVisibility,
    applyLegendaryChrome: applyLegendaryChrome,
    clearLegendaryChrome: clearLegendaryChrome,
    getAnonymizeLabel: function (playConfig, pos) {
      var map = playConfig && playConfig.legendaryAnonymize;
      if (!map || !map.byPos || !pos) return null;
      return map.byPos[pos] || null;
    }
  };
})(typeof window !== 'undefined' ? window : global);
