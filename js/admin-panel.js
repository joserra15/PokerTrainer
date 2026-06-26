/*
 * admin-panel.js — Panel de administración (solo isAdmin).
 */
(function (global) {
  'use strict';

  var PLAN_OPTIONS = [
    { id: 'free', label: 'Gratis' },
    { id: 'pro', label: 'Study' },
    { id: 'premium', label: 'Coach' }
  ];

  var loaded = false;
  var adminTabBtn = null;

  function $(sel) { return document.querySelector(sel); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function currentUser() {
    return global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
  }

  function formatRelative(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var diff = Date.now() - d.getTime();
    if (diff < 60 * 1000) return 'Ahora';
    if (diff < 15 * 60 * 1000) return 'En línea';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' min';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' h';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function isOnline(iso) {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() < 15 * 60 * 1000;
  }

  function usageBar(used, limit) {
    var pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    var cls = pct >= 90 ? 'admin-usage-high' : pct >= 70 ? 'admin-usage-mid' : '';
    return (
      '<div class="admin-usage">' +
      '<div class="admin-usage-bar ' + cls + '" style="width:' + pct + '%"></div>' +
      '<span class="admin-usage-text">' + used + ' / ' + limit + '</span>' +
      '</div>'
    );
  }

  function ensureAdminTab() {
    if (adminTabBtn) return;
    var nav = document.querySelector('nav.tabs');
    if (!nav) return;
    adminTabBtn = document.createElement('button');
    adminTabBtn.className = 'tab tab-admin hidden';
    adminTabBtn.dataset.tab = 'admin';
    adminTabBtn.textContent = 'Admin';
    adminTabBtn.title = 'Panel de administración';
    adminTabBtn.addEventListener('click', function () {
      if (global.goToTab) global.goToTab('admin');
    });
    nav.appendChild(adminTabBtn);
  }

  function setAdminVisible(show) {
    ensureAdminTab();
    if (adminTabBtn) adminTabBtn.classList.toggle('hidden', !show);
    var accountBtn = $('#account-admin');
    if (accountBtn) accountBtn.classList.toggle('hidden', !show);
  }

  async function loadStats() {
    var c = client();
    var el = $('#admin-stats');
    if (!c || !el) return;
    var res = await c.rpc('pt_admin_stats');
    if (res.error) {
      el.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    var s = res.data || {};
    el.innerHTML =
      '<div class="admin-stat-card"><span class="admin-stat-value">' + (s.total_users || 0) + '</span><span class="admin-stat-label">Usuarios</span></div>' +
      '<div class="admin-stat-card"><span class="admin-stat-value">' + (s.active_today || 0) + '</span><span class="admin-stat-label">Activos hoy</span></div>' +
      '<div class="admin-stat-card admin-stat-online"><span class="admin-stat-value">' + (s.online_now || 0) + '</span><span class="admin-stat-label">En línea</span></div>' +
      '<div class="admin-stat-card"><span class="admin-stat-value">' + (s.ai_requests_today || 0) + '</span><span class="admin-stat-label">IA hoy (total)</span></div>';
  }

  function planSelect(userId, current, disabled) {
    var opts = PLAN_OPTIONS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');
    return '<select class="admin-plan-select" data-user-id="' + escapeHtml(userId) + '"' +
      (disabled ? ' disabled' : '') + '>' + opts + '</select>';
  }

  async function loadUsers() {
    var c = client();
    var tbody = $('#admin-users-body');
    var status = $('#admin-users-status');
    if (!c || !tbody) return;
    if (status) status.textContent = 'Cargando…';
    var res = await c.rpc('pt_admin_user_list');
    if (res.error) {
      tbody.innerHTML = '';
      if (status) status.textContent = '';
      var err = $('#admin-users-error');
      if (err) err.textContent = res.error.message;
      return;
    }
    var errEl = $('#admin-users-error');
    if (errEl) errEl.textContent = '';
    var me = currentUser();
    var rows = res.data || [];
    if (status) status.textContent = rows.length + ' usuario' + (rows.length === 1 ? '' : 's');
    tbody.innerHTML = rows.map(function (u) {
      var online = isOnline(u.last_seen_at);
      var isSelf = me && me.sub === u.user_id;
      return (
        '<tr data-user-id="' + escapeHtml(u.user_id) + '">' +
        '<td class="admin-user-cell">' +
        '<span class="admin-user-name">' + escapeHtml(u.name || '—') + '</span>' +
        '<span class="admin-user-email">' + escapeHtml(u.email) + '</span>' +
        '</td>' +
        '<td>' + planSelect(u.user_id, u.plan || 'free', false) + '</td>' +
        '<td>' + usageBar(Number(u.ai_today) || 0, Number(u.ai_limit) || 120) + '</td>' +
        '<td><span class="admin-status' + (online ? ' admin-status-online' : '') + '">' +
        (online ? '● ' : '') + escapeHtml(formatRelative(u.last_seen_at)) + '</span></td>' +
        '<td class="admin-center">' +
        '<label class="admin-toggle" title="' + (isSelf ? 'No puedes quitarte admin a ti mismo' : 'Administrador') + '">' +
        '<input type="checkbox" class="admin-check" data-field="is_admin"' +
        (u.is_admin ? ' checked' : '') +
        (isSelf ? ' disabled' : '') + ' />' +
        '</label></td>' +
        '</tr>'
      );
    }).join('');
    bindUserActions();
  }

  function bindUserActions() {
    var tbody = $('#admin-users-body');
    if (!tbody) return;
    tbody.querySelectorAll('.admin-plan-select').forEach(function (sel) {
      sel.onchange = function () {
        updateUser(sel.dataset.userId, { plan: sel.value });
      };
    });
    tbody.querySelectorAll('.admin-check').forEach(function (chk) {
      chk.onchange = function () {
        var row = chk.closest('tr');
        var uid = row && row.dataset.userId;
        if (!uid) return;
        updateUser(uid, { is_admin: chk.checked });
      };
    });
  }

  async function updateUser(userId, patch) {
    var c = client();
    if (!c) return;
    var res = await c.from('pt_user_profiles').update(patch).eq('user_id', userId);
    if (res.error) {
      alert('Error al guardar: ' + res.error.message);
      await refresh();
      return;
    }
    if (patch.is_admin !== undefined) {
      var me = currentUser();
      if (me && me.sub === userId) {
        me.isAdmin = patch.is_admin;
        if (global.PTProfile) global.PTProfile.applyProfileToUser(me, { is_admin: patch.is_admin });
      }
    }
  }

  async function refresh() {
    await Promise.all([loadStats(), loadUsers()]);
    loaded = true;
  }

  function render() {
    var user = currentUser();
    if (!user || !user.isAdmin) return;
    refresh();
  }

  function initForUser(user) {
    if (!user || !user.isAdmin) {
      setAdminVisible(false);
      return;
    }
    setAdminVisible(true);
  }

  function bindUi() {
    var refreshBtn = $('#admin-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { refresh(); });

    var accountAdmin = $('#account-admin');
    if (accountAdmin) {
      accountAdmin.addEventListener('click', function () {
        if (global.goToTab) global.goToTab('admin');
        var dropdown = $('#account-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
      });
    }

    global.addEventListener('pt-auth-ready', function (e) {
      initForUser(e.detail);
    });
  }

  global.PTAdmin = {
    initForUser: initForUser,
    render: render,
    refresh: refresh,
    setAdminVisible: setAdminVisible
  };

  bindUi();
})(window);
