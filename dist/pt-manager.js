/* PokerForgeAI bundle: pt-manager.js — do not edit */
/*
 * manager-panel.js — Panel Manager de comunidad (usuarios, IA, escuela, mensajes, bienvenida).
 * Sin pagos ni datos de PokerForgeAI / otras comunidades. Responsive PC + móvil.
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

  function normalizeMembers(raw) {
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  }

  var selectedUserId = null;
  var membersCache = [];
  var threadsCache = [];
  var settingsCache = null;
  var listMeta = { online_count: 0, ai_limit: 40 };

  async function ensureAccess() {
    if (!global.PTCommunity) return false;
    var res = await global.PTCommunity.assertFeature('manager');
    return !!(res && res.allowed);
  }

  async function loadSettings() {
    var c = client();
    var host = $('#manager-settings');
    if (!c || !host) return;
    host.innerHTML = '<p class="muted-text">Cargando ajustes…</p>';
    var res = await c.rpc('pt_manager_get_settings', { p_community_id: communityId() });
    if (res.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    settingsCache = res.data || {};
    var url = settingsCache.login_url || '';
    host.innerHTML =
      '<div class="manager-settings-card">' +
      '<p class="muted-text manager-settings-line"><span>URL de login</span> ' +
      '<a class="manager-login-url" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
      escapeHtml(url) + '</a></p>' +
      '<p class="muted-text">Código de acceso (solo lectura; lo cambia Admin): <code>' +
      escapeHtml(settingsCache.join_code || '—') + '</code></p>' +
      '<p class="muted-text">Cupo IA por miembro: <strong>' +
      escapeHtml(String(settingsCache.ai_limit || 40)) + '</strong> consultas/mes (independiente de PokerForgeAI).</p>' +
      '<form id="manager-welcome-form">' +
      '<label for="manager-welcome-input">Mensaje de bienvenida en Inicio</label>' +
      '<textarea id="manager-welcome-input" rows="3" maxlength="800" placeholder="Texto que verán los miembros en lugar del saludo de la IA">' +
      escapeHtml(settingsCache.welcome_message || '') + '</textarea>' +
      '<div class="admin-messages-head-actions" style="margin-top:8px">' +
      '<button type="submit" class="btn btn-primary btn-sm">Guardar bienvenida</button>' +
      '<span id="manager-welcome-status" class="muted-text"></span></div></form></div>';
    var form = $('#manager-welcome-form');
    if (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var status = $('#manager-welcome-status');
        if (status) status.textContent = 'Guardando…';
        var body = ($('#manager-welcome-input') || {}).value || '';
        var save = await c.rpc('pt_manager_set_welcome', {
          p_community_id: communityId(),
          p_welcome_message: body
        });
        if (save.error) {
          if (status) status.textContent = '';
          alert(save.error.message || 'Error');
          return;
        }
        if (status) status.textContent = 'Guardado';
        settingsCache.welcome_message = (save.data && save.data.welcome_message) || body;
        if (global.PTCommunity && global.PTCommunity.invalidateWelcomeCache) {
          global.PTCommunity.invalidateWelcomeCache();
        }
      });
    }
  }

  function memberCardHtml(m, idx) {
    return '<article class="manager-member-card">' +
      '<div class="manager-member-card-main">' +
      '<div><strong>' + escapeHtml(m.name || '—') + '</strong>' +
      (m.is_online ? ' <span class="admin-online-dot" title="En línea">●</span>' : '') +
      '<br><span class="muted-text">' + escapeHtml(m.email || '') + '</span></div>' +
      '<span class="manager-role-pill">' + escapeHtml(m.role || 'member') + '</span></div>' +
      '<dl class="manager-member-meta">' +
      '<div><dt>IA mes</dt><dd>' + escapeHtml(String(m.ai_used_month != null ? m.ai_used_month : 0)) +
      '/' + escapeHtml(String(m.ai_limit || listMeta.ai_limit || 40)) + '</dd></div>' +
      '<div><dt>Escuela</dt><dd>' + escapeHtml(String(m.school_passed != null ? m.school_passed : 0)) +
      ' lecc. · XP ' + escapeHtml(String(m.school_xp != null ? m.school_xp : 0)) + '</dd></div>' +
      '<div><dt>Última conexión</dt><dd>' + escapeHtml(formatDate(m.last_seen_at)) + '</dd></div>' +
      '</dl>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-manager-idx="' + idx + '">Detalle</button>' +
      '</article>';
  }

  async function loadMembers() {
    var c = client();
    var cid = communityId();
    var host = $('#manager-members');
    var summary = $('#manager-members-summary');
    if (!c || !host) return;
    host.innerHTML = '<p class="muted-text">Cargando miembros…</p>';
    var res = await c.rpc('pt_manager_list_members', { p_community_id: cid });
    if (res.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    membersCache = normalizeMembers(res.data && res.data.members);
    listMeta.online_count = (res.data && res.data.online_count) || 0;
    listMeta.ai_limit = (res.data && res.data.ai_limit) || 40;
    if (summary) {
      summary.innerHTML = 'Miembros: <strong>' + membersCache.length + '</strong> · Activos ahora: <strong>' +
        escapeHtml(String(listMeta.online_count)) + '</strong>';
    }
    if (!membersCache.length) {
      host.innerHTML = '<p class="muted-text">No hay miembros en esta comunidad.</p>';
      return;
    }
    host.innerHTML =
      '<div class="manager-member-cards">' +
      membersCache.map(memberCardHtml).join('') +
      '</div>' +
      '<div class="admin-table-wrap manager-table-wrap">' +
      '<table class="admin-table manager-table"><thead><tr>' +
      '<th>Usuario</th><th>Rol</th><th>IA mes</th><th>Escuela</th><th>Última conexión</th><th></th>' +
      '</tr></thead><tbody>' +
      membersCache.map(function (m, idx) {
        return '<tr>' +
          '<td><strong>' + escapeHtml(m.name || '—') + '</strong><br><span class="muted-text">' +
          escapeHtml(m.email || '') + '</span>' +
          (m.is_online ? ' <span class="admin-online-dot" title="En línea">●</span>' : '') +
          '</td>' +
          '<td>' + escapeHtml(m.role || 'member') + '</td>' +
          '<td>' + escapeHtml(String(m.ai_used_month != null ? m.ai_used_month : 0)) + '/' +
          escapeHtml(String(m.ai_limit || listMeta.ai_limit || 40)) + '</td>' +
          '<td>' + escapeHtml(String(m.school_passed != null ? m.school_passed : 0)) +
          ' lecc. · XP ' + escapeHtml(String(m.school_xp != null ? m.school_xp : 0)) + '</td>' +
          '<td>' + escapeHtml(formatDate(m.last_seen_at)) + '</td>' +
          '<td><button type="button" class="btn btn-ghost btn-sm" data-manager-idx="' +
          idx + '">Detalle</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
    host.querySelectorAll('[data-manager-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-manager-idx'));
        var mem = membersCache[idx];
        if (mem) showMemberUsage(mem);
      });
    });
  }

  function memberLookupId(mem) {
    if (!mem) return '';
    if (mem.user_id) return String(mem.user_id);
    if (mem.id) return String(mem.id);
    if (mem.email) return String(mem.email);
    return '';
  }

  function formatMemberError(err) {
    var code = String(err || 'error');
    if (/not_a_member/i.test(code)) {
      return 'No se pudo cargar el detalle de este miembro en la comunidad. Prueba Actualizar; si sigue fallando, revisa que el usuario siga activo.';
    }
    if (/forbidden/i.test(code)) return 'No tienes permiso de manager en esta comunidad.';
    if (/missing_user|invalid_community/i.test(code)) return 'Faltan datos del miembro o de la comunidad.';
    return code;
  }

  async function showMemberUsage(memOrId) {
    var memIn = (memOrId && typeof memOrId === 'object') ? memOrId : null;
    var userId = memIn ? memberLookupId(memIn) : String(memOrId || '');
    selectedUserId = userId;
    var c = client();
    var detail = $('#manager-member-detail');
    if (!c || !detail) return;
    detail.classList.remove('hidden');
    detail.innerHTML = '<p class="muted-text">Cargando avance…</p>';
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var cid = communityId();
    if (!userId) {
      detail.innerHTML = '<p class="admin-error">No se encontró el identificador del miembro.</p>';
      return;
    }
    var res = await c.rpc('pt_manager_member_usage', {
      p_community_id: cid,
      p_user_id: userId
    });
    /* Reintento por email si el id falla (compat. datos legacy / attrs HTML) */
    if (
      memIn && memIn.email &&
      (
        (res.error && /not_a_member/i.test(res.error.message || '')) ||
        (res.data && res.data.ok === false && res.data.error === 'not_a_member')
      ) &&
      String(memIn.email).toLowerCase() !== String(userId).toLowerCase()
    ) {
      res = await c.rpc('pt_manager_member_usage', {
        p_community_id: cid,
        p_user_id: String(memIn.email)
      });
    }
    if (res.error) {
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(formatMemberError(res.error.message)) + '</p>';
      return;
    }
    if (res.data && res.data.ok === false) {
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(formatMemberError(res.data.error)) + '</p>';
      return;
    }
    var mem = (res.data && res.data.member) || {};
    var school = (res.data && res.data.school) || {};
    var ai = (res.data && res.data.ai) || {};
    var lessons = (school && school.lessons) || {};
    var lessonIds = Object.keys(lessons);
    var passed = lessonIds.filter(function (id) { return lessons[id] && lessons[id].passed; }).length;
    detail.innerHTML =
      '<div class="manager-detail-card">' +
      '<div class="admin-section-head"><h3>' + escapeHtml(mem.name || mem.email || 'Miembro') + '</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-detail-close">Cerrar</button></div>' +
      '<p class="muted-text">' + escapeHtml(mem.email || '') + ' · Rol: ' + escapeHtml(mem.role || '') +
      (mem.is_online ? ' · <span class="admin-online-dot">●</span> en línea' : '') + '</p>' +
      '<p>Última conexión: <strong>' + escapeHtml(formatDate(mem.last_seen_at)) + '</strong></p>' +
      '<p>Consultas IA (comunidad): <strong>' + escapeHtml(String(ai.used != null ? ai.used : 0)) +
      '/' + escapeHtml(String(ai.limit || 40)) + '</strong></p>' +
      '<p>XP escuela (esta comunidad): <strong>' + escapeHtml(school.xp != null ? school.xp : 0) + '</strong></p>' +
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
        : '<p class="muted-text">Sin progreso de escuela de esta comunidad sincronizado aún.</p>') +
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
      '<p class="muted-text">Miembros, IA, avance de escuela y mensajes. Sin datos de pago ni de otras apps.</p></div></div>' +
      '<div class="manager-sections">' +
      '<section class="admin-section"><div class="admin-section-head"><h3>Ajustes de comunidad</h3></div>' +
      '<div id="manager-settings"></div></section>' +
      '<section class="admin-section"><div class="admin-section-head"><h3>Miembros</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-refresh-members">Actualizar</button></div>' +
      '<p id="manager-members-summary" class="muted-text"></p>' +
      '<div id="manager-members"></div><div id="manager-member-detail" class="hidden"></div></section>' +
      '<section class="admin-section"><div class="admin-section-head"><h3>Mensajes</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="manager-refresh-messages">Actualizar</button></div>' +
      '<div id="manager-messages"></div></section></div>';
    var rm = $('#manager-refresh-members');
    var rmsg = $('#manager-refresh-messages');
    if (rm) rm.addEventListener('click', loadMembers);
    if (rmsg) rmsg.addEventListener('click', loadThreads);
    await loadSettings();
    await loadMembers();
    await loadThreads();
  }

  global.PTManagerPanel = {
    render: render,
    loadMembers: loadMembers,
    loadThreads: loadThreads,
    loadSettings: loadSettings
  };
})(typeof window !== 'undefined' ? window : this);
