/*
 * contact.js — Formulario de contacto y conversación con administración.
 */
(function (global) {
  'use strict';

  var TITLE_MAX = 200;
  var BODY_MAX = 3000;
  var pollTimer = null;

  function $(sel) { return document.querySelector(sel); }

  function escapeHtml(s) {
    return String(s || '')
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

  function isLoggedIn() {
    return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function updateTabBadge(n) {
    var tab = document.querySelector('.tab[data-tab="contact"]');
    if (!tab) return;
    var badge = tab.querySelector('.tab-badge');
    if (!n || n <= 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      tab.appendChild(badge);
    }
    badge.textContent = n > 99 ? '99+' : String(n);
  }

  async function fetchUnreadCount() {
    var c = client();
    if (!c || !isLoggedIn()) {
      updateTabBadge(0);
      return 0;
    }
    var res = await c.rpc('pt_contact_unread_count');
    if (res.error) return 0;
    var n = Number(res.data) || 0;
    updateTabBadge(n);
    return n;
  }

  function renderMessageList(messages) {
    if (!messages || !messages.length) {
      return '<p class="muted-text">Sin mensajes.</p>';
    }
    return messages.map(function (m) {
      var cls = m.sender_role === 'admin' ? 'contact-msg admin' : 'contact-msg user';
      var who = m.sender_role === 'admin' ? 'Soporte' : 'Tú';
      return '<div class="' + cls + '">' +
        '<div class="contact-msg-head"><strong>' + escapeHtml(who) + '</strong>' +
        '<span class="muted-text">' + escapeHtml(formatDate(m.created_at)) + '</span></div>' +
        '<div class="contact-msg-body">' + escapeHtml(m.body).replace(/\n/g, '<br>') + '</div></div>';
    }).join('');
  }

  function renderThreadList(threads, activeId) {
    if (!threads.length) {
      return '<p class="muted-text">Aún no has enviado mensajes. Usa el formulario para abrir una consulta.</p>';
    }
    return threads.map(function (t) {
      var active = t.id === activeId ? ' contact-thread-active' : '';
      var unread = t.user_unread_count > 0 ? ' contact-thread-unread' : '';
      return '<button type="button" class="contact-thread-item' + active + unread + '" data-thread-id="' + escapeHtml(t.id) + '">' +
        '<span class="contact-thread-subject">' + escapeHtml(t.subject) + '</span>' +
        '<span class="contact-thread-meta muted-text">' + escapeHtml(formatDate(t.last_message_at)) +
        (t.user_unread_count > 0 ? ' · <strong>Nueva respuesta</strong>' : '') +
        '</span></button>';
    }).join('');
  }

  async function loadThread(threadId) {
    var c = client();
    if (!c) return null;
    var res = await c.rpc('pt_contact_get_thread', { p_thread_id: threadId });
    if (res.error) throw new Error(res.error.message || 'Error al cargar');
    return res.data;
  }

  async function renderContactView(activeThreadId) {
    var host = $('#contact-content');
    if (!host) return;

    if (!isLoggedIn()) {
      host.innerHTML = '<div class="card-box"><p>Inicia sesión para enviarnos un mensaje o ver tus conversaciones con soporte.</p></div>';
      return;
    }

    host.innerHTML = '<div class="contact-loading"><div class="play-boot-spinner"></div><p class="muted-text">Cargando…</p></div>';
    var c = client();
    if (!c) {
      host.innerHTML = '<p class="admin-error">Contacto no disponible (Supabase no configurado).</p>';
      return;
    }

    var listRes = await c.rpc('pt_contact_my_threads');
    if (listRes.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(listRes.error.message) + '</p>';
      return;
    }
    var threads = listRes.data || [];
    await fetchUnreadCount();

    var detailHtml = '';
    var currentId = activeThreadId;
    if (!currentId && threads.length) currentId = threads[0].id;

    if (currentId) {
      try {
        var data = await loadThread(currentId);
        var th = data.thread || {};
        var msgs = data.messages || [];
        detailHtml = '<div class="contact-detail card-box">' +
          '<h3>' + escapeHtml(th.subject) + '</h3>' +
          '<div class="contact-messages">' + renderMessageList(msgs) + '</div>' +
          (th.status === 'open'
            ? '<form class="contact-reply-form" data-thread-id="' + escapeHtml(th.id) + '">' +
              '<label>Tu respuesta<textarea name="body" rows="4" maxlength="' + BODY_MAX + '" required placeholder="Escribe tu mensaje…"></textarea></label>' +
              '<p class="muted-text contact-char-hint">Máx. ' + BODY_MAX + ' caracteres</p>' +
              '<button type="submit" class="btn btn-primary">Enviar respuesta</button></form>'
            : '<p class="muted-text">Esta conversación está cerrada.</p>') +
          '</div>';
      } catch (e) {
        detailHtml = '<p class="admin-error">' + escapeHtml(e.message) + '</p>';
      }
    }

    host.innerHTML =
      '<div class="contact-layout">' +
      '<div class="contact-sidebar card-box">' +
      '<h3>Tus conversaciones</h3>' +
      '<div class="contact-thread-list">' + renderThreadList(threads, currentId) + '</div>' +
      '</div>' +
      '<div class="contact-main">' +
      detailHtml +
      '<div class="contact-new card-box">' +
      '<h3>Nueva consulta</h3>' +
      '<form id="contact-new-form">' +
      '<label>Título<input type="text" name="subject" maxlength="' + TITLE_MAX + '" required placeholder="Ej.: Problema al importar sesión Winamax"></label>' +
      '<label>Mensaje<textarea name="body" rows="6" maxlength="' + BODY_MAX + '" required placeholder="Describe tu consulta con el máximo detalle posible…"></textarea></label>' +
      '<p class="muted-text contact-char-hint">Título máx. ' + TITLE_MAX + ' · Mensaje máx. ' + BODY_MAX + ' caracteres</p>' +
      '<button type="submit" class="btn btn-primary">Enviar mensaje</button>' +
      '</form></div></div></div>';

    host.querySelectorAll('.contact-thread-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderContactView(btn.getAttribute('data-thread-id'));
      });
    });

    var newForm = $('#contact-new-form');
    if (newForm) {
      newForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var subj = (newForm.subject.value || '').trim();
        var body = (newForm.body.value || '').trim();
        if (subj.length < 3 || body.length < 5) {
          alert('Completa título y mensaje.');
          return;
        }
        var btn = newForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        var res = await c.rpc('pt_contact_create_thread', { p_subject: subj, p_body: body });
        if (btn) btn.disabled = false;
        if (res.error) {
          alert('No se pudo enviar: ' + (res.error.message || 'error'));
          return;
        }
        var tid = res.data && res.data.thread_id;
        renderContactView(tid);
      });
    }

    host.querySelectorAll('.contact-reply-form').forEach(function (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var tid = form.getAttribute('data-thread-id');
        var body = (form.body.value || '').trim();
        if (!body) return;
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        var res = await c.rpc('pt_contact_user_reply', { p_thread_id: tid, p_body: body });
        if (btn) btn.disabled = false;
        if (res.error) {
          alert('No se pudo enviar: ' + (res.error.message || 'error'));
          return;
        }
        renderContactView(tid);
      });
    });
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      if (isLoggedIn()) fetchUnreadCount();
    }, 60000);
  }

  function init() {
    fetchUnreadCount();
    startPolling();
    global.addEventListener('pt-auth-ready', function () {
      fetchUnreadCount();
    });
  }

  global.PTContact = {
    init: init,
    render: renderContactView,
    refreshBadge: fetchUnreadCount
  };

  init();
})(window);
