/*
 * manager-panel.js — Panel Manager de comunidad (usuarios, uso, mensajes).
 * Sin pagos ni datos de PokerForgeAI / otras comunidades.
 */
(function (global) {
  'use strict';

  function $(sel) {
    return typeof sel === 'string' ? document.querySelector(sel) : sel;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
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

  function communityId() {
    return (global.PTCommunity && global.PTCommunity.id) ? global.PTCommunity.id() : 'pokerforge';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      return String(iso);
    }
  }

  var selectedUserId = null;
  var membersCache = [];
  var threadsCache = [];

  async function ensureAccess() {
    if (!global.PTCommunity) return false;
    var res = await global.PTCommunity.assertFeature('manager');
    return !!(res && res.allowed);
  }

  async function loadMembers() {
    var c = client();
    var cid = communityId();
    var host = $('#manager-members');
    if (!c || !host) return;
    host.innerHTML = '<p class="muted-text">Cargando miembros…</p>';
    var res = await c.rpc('pt_manager_list_members', { p_community_id: cid });
    if (res.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    membersCache = (res.data && res.data.members) || [];
    if (!membersCache.length) {
      host.innerHTML = '<p class="muted-text">No hay miembros en esta comunidad.</p>';
      return;
    }
    host.innerHTML =
      '<table class="admin-table manager-table"><thead><tr>' +
      '<th>Usuario</th><th>Rol</th><th>Alta</th><th>Última conexión</th><th></th>' +
      '</tr></thead><tbody>' +
      membersCache.map(function (m) {
        return '<tr>' +
          '<td><strong>' + escapeHtml(m.name || '—') + '</strong><br><span class="muted-text">' +
          escapeHtml(m.email || '') + '</span></td>' +
          '<td>' + escapeHtml(m.role || 'member') + '</td>' +
          '<td>' + escapeHtml(formatDate(m.granted_at)) + '</td>' +
          '<td>' + escapeHtml(formatDate(m.last_seen_at)) + '</td>' +
          '<td><button type="button" class="btn btn-ghost btn-sm" data-manager-user="' +
          escapeHtml(m.user_id) + '">Detalle</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';
    host.querySelectorAll('[data-manager-user]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showMemberUsage(btn.getAttribute('data-manager-user'));
      });
    });
  }

  async function showMemberUsage(userId) {
    selectedUserId = userId;
    var c = client();
    var detail = $('#manager-member-detail');
    if (!c || !detail) return;
    detail.classList.remove('hidden');
    detail.innerHTML = '<p class="muted-text">Cargando avance…</p>';
    var res = await c.rpc('pt_manager_member_usage', {
      p_community_id: communityId(),
      p_user_id: userId
    });
    if (res.error) {
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    var mem = (res.data && res.data.member) || {};
    var school = (res.data && res.data.school) || {};
    var lessons = (school && school.lessons) || {};
    var lessonIds = Object.keys(lessons);
    var passed = lessonIds.filter(function (id) { return lessons[id] && lessons[id].passed; }).length;
    detail.innerHTML =
      '<div class="manager-detail-card">' +
      '<div class="admin-section-head"><h3>' + escapeHtml(mem.name || mem.email || 'Miembro') + '</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-detail-close">Cerrar</button></div>' +
      '<p class="muted-text">' + escapeHtml(mem.email || '') + ' · Rol: ' + escapeHtml(mem.role || '') + '</p>' +
      '<p>XP escuela: <strong>' + escapeHtml(school.xp != null ? school.xp : 0) + '</strong></p>' +
      '<p>Lecciones con progreso: <strong>' + lessonIds.length + '</strong> · Aprobadas: <strong>' +
      passed + '</strong></p>' +
      (lessonIds.length
        ? '<ul class="manager-lesson-list">' + lessonIds.slice(0, 40).map(function (id) {
          var L = lessons[id] || {};
          return '<li><code>' + escapeHtml(id) + '</code> — ' +
            (L.passed ? 'aprobada' : 'en curso') +
            (L.bestPct != null ? ' (' + escapeHtml(L.bestPct) + '%)' : '') +
            '</li>';
        }).join('') + '</ul>'
        : '<p class="muted-text">Sin progreso de escuela sincronizado aún.</p>') +
      '</div>';
    var close = $('#manager-detail-close');
    if (close) close.addEventListener('click', function () {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    });
  }

  function renderMessageList(messages) {
    if (!messages || !messages.length) return '<p class="muted-text">Sin mensajes.</p>';
    return messages.map(function (m) {
      var role = m.sender_role === 'user' ? 'user' : 'admin';
      var who = m.sender_role === 'user' ? 'Usuario' : (m.sender_role === 'manager' ? 'Manager' : 'Soporte');
      return '<div class="contact-msg ' + role + '"><div class="contact-msg-meta">' +
        escapeHtml(who) + ' · ' + escapeHtml(formatDate(m.created_at)) +
        '</div><div class="contact-msg-body">' + escapeHtml(m.body) + '</div></div>';
    }).join('');
  }

  async function loadThreads() {
    var c = client();
    var host = $('#manager-messages');
    if (!c || !host) return;
    host.innerHTML = '<p class="muted-text">Cargando mensajes…</p>';
    var res = await c.rpc('pt_manager_contact_threads', { p_community_id: communityId() });
    if (res.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    threadsCache = (res.data && res.data.threads) || [];
    if (!threadsCache.length) {
      host.innerHTML = '<p class="muted-text">No hay mensajes de esta comunidad.</p>';
      return;
    }
    host.innerHTML =
      '<div class="manager-threads">' +
      '<div class="manager-thread-list">' +
      threadsCache.map(function (t) {
        return '<button type="button" class="contact-thread-item" data-thread="' +
          escapeHtml(t.id) + '"><strong>' + escapeHtml(t.subject) + '</strong>' +
          '<span class="muted-text">' + escapeHtml(t.user_name || t.user_email || '') +
          ' · ' + escapeHtml(formatDate(t.last_message_at)) + '</span></button>';
      }).join('') +
      '</div><div id="manager-thread-detail" class="manager-thread-detail"></div></div>';
    host.querySelectorAll('[data-thread]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openThread(btn.getAttribute('data-thread'));
      });
    });
  }

  async function openThread(threadId) {
    var c = client();
    var detail = $('#manager-thread-detail');
    if (!c || !detail) return;
    detail.innerHTML = '<p class="muted-text">Cargando…</p>';
    var res = await c.rpc('pt_manager_contact_get_thread', {
      p_community_id: communityId(),
      p_thread_id: threadId
    });
    if (res.error) {
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    var th = (res.data && res.data.thread) || {};
    var msgs = (res.data && res.data.messages) || [];
    detail.innerHTML =
      '<h4>' + escapeHtml(th.subject || 'Hilo') + '</h4>' +
      '<p class="muted-text">' + escapeHtml(th.user_name || '') + ' · ' + escapeHtml(th.user_email || '') + '</p>' +
      '<div class="contact-messages">' + renderMessageList(msgs) + '</div>' +
      '<form class="contact-reply-form" id="manager-reply-form">' +
      '<textarea id="manager-reply-body" rows="3" placeholder="Respuesta…"></textarea>' +
      '<button type="submit" class="btn btn-primary btn-sm">Enviar</button></form>';
    var form = $('#manager-reply-form');
    if (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var body = ($('#manager-reply-body') || {}).value || '';
        var reply = await c.rpc('pt_manager_contact_reply', {
          p_community_id: communityId(),
          p_thread_id: threadId,
          p_body: body
        });
        if (reply.error) {
          alert(reply.error.message || 'Error');
          return;
        }
        openThread(threadId);
        loadThreads();
      });
    }
  }

  async function render() {
    var panel = $('#tab-manager');
    if (!panel) return;
    var ok = await ensureAccess();
    if (!ok) {
      panel.innerHTML = '<div class="panel-head"><h2>Manager</h2></div>' +
        '<p class="admin-error">No tienes permiso de manager en esta comunidad.</p>';
      return;
    }
    var cfg = global.PTCommunity && global.PTCommunity.config ? global.PTCommunity.config() : {};
    panel.innerHTML =
      '<div class="panel-head"><div><h2>Manager · ' + escapeHtml(cfg.siteName || communityId()) + '</h2>' +
      '<p class="muted-text">Miembros, avance y mensajes de esta comunidad. Sin datos de pago ni de otras apps.</p></div></div>' +
      '<div class="manager-sections">' +
      '<section class="admin-section"><div class="admin-section-head"><h3>Miembros</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-refresh-members">Actualizar</button></div>' +
      '<div id="manager-members"></div><div id="manager-member-detail" class="hidden"></div></section>' +
      '<section class="admin-section"><div class="admin-section-head"><h3>Mensajes</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-refresh-messages">Actualizar</button></div>' +
      '<div id="manager-messages"></div></section></div>';
    var rm = $('#manager-refresh-members');
    var rmsg = $('#manager-refresh-messages');
    if (rm) rm.addEventListener('click', loadMembers);
    if (rmsg) rmsg.addEventListener('click', loadThreads);
    await loadMembers();
    await loadThreads();
  }

  global.PTManagerPanel = {
    render: render,
    loadMembers: loadMembers,
    loadThreads: loadThreads
  };
})(typeof window !== 'undefined' ? window : this);
