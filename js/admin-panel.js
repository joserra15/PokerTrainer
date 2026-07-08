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

  var PLAN_AI_LIMITS = { free: 0, pro: 5, premium: 35 };
  var DEMO_USER_ID = 'pt_demo_user';

  var loaded = false;
  var adminTabBtn = null;
  var inviteModalBound = false;
  var syncRunning = false;
  var adminUsersCache = [];
  var adminMessageMode = 'single';
  var adminMessageRecipients = [];
  var adminMessageFilter = '';
  var adminMessageSubject = '';
  var adminMessageBody = '';
  var adminMessageStatus = '';

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

  function recipientUsers() {
    var me = currentUser();
    return adminUsersCache.filter(function (u) {
      return u && u.user_id && u.user_id !== DEMO_USER_ID && (!me || u.user_id !== me.sub);
    });
  }

  function selectedRecipientCount() {
    if (adminMessageMode === 'all') return recipientUsers().length;
    return adminMessageRecipients.length;
  }

  function normalizeRecipientSelection() {
    var valid = {};
    recipientUsers().forEach(function (u) { valid[u.user_id] = true; });
    adminMessageRecipients = adminMessageRecipients.filter(function (id) { return !!valid[id]; });
    if (adminMessageMode === 'single' && adminMessageRecipients.length > 1) {
      adminMessageRecipients = adminMessageRecipients.slice(0, 1);
    }
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

  function usageBar(used, limit, isAdmin) {
    if (limit == null) {
      return '<div class="admin-usage"><span class="admin-usage-text">' + used + ' / ∞</span></div>';
    }
    if (limit === 0) {
      var zeroNote = isAdmin ? ' <span class="admin-usage-note" title="Admin: sin límite en la app">(∞)</span>' : '';
      return '<div class="admin-usage"><span class="admin-usage-text muted-text">' + used + ' / 0' + zeroNote + '</span></div>';
    }
    var pct = Math.min(100, Math.round((used / limit) * 100));
    var cls = pct >= 90 ? 'admin-usage-high' : pct >= 70 ? 'admin-usage-mid' : '';
    var adminNote = isAdmin ? ' <span class="admin-usage-note" title="Admin: sin límite en la app">(∞)</span>' : '';
    return (
      '<div class="admin-usage">' +
      '<div class="admin-usage-bar ' + cls + '" style="width:' + pct + '%"></div>' +
      '<span class="admin-usage-text">' + used + ' / ' + limit + adminNote + '</span>' +
      '</div>'
    );
  }

  function formatPayment(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function addInterval(iso, interval) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    if (interval === 'year') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }

  function effectivePeriodEnd(u) {
    if (!u) return null;
    if (u.subscription_period_end) return u.subscription_period_end;
    if (!u.stripe_last_payment_at || (u.plan || 'free') === 'free') return null;
    return addInterval(u.stripe_last_payment_at, u.billing_interval || 'month');
  }

  function toDateInputValue(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatPeriodLabel(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    if (d.getTime() < Date.now()) label += ' (caducado)';
    return label;
  }

  function formatPeriodEnd(u) {
    if (!u) return '—';
    var plan = u.plan || 'free';
    var status = u.subscription_status || 'none';
    if (plan === 'free' && status !== 'active' && status !== 'trialing') return '—';
    var iso = effectivePeriodEnd(u);
    if (!iso) return '—';
    return formatPeriodLabel(iso);
  }

  function formatRenewal(u) {
    if (!u) return '—';
    var status = u.subscription_status || 'none';
    var iso = effectivePeriodEnd(u);
    var canceled = !!u.subscription_cancel_at_period_end
      || status === 'canceled'
      || status === 'canceling';

    if (canceled) {
      if (!iso) return 'Cancelada';
      return formatPeriodLabel(iso).replace(' (caducado)', '') + ' · cancelada';
    }

    if (status !== 'active' && status !== 'trialing') return '—';
    if (!iso) return '—';
    var label = formatPeriodLabel(iso);
    if (u.stripe_subscription_id) label += ' · auto';
    return label;
  }

  function setAdminLoading(show, message) {
    var el = $('#admin-loading');
    var wrap = document.querySelector('.admin-table-wrap');
    if (!el) return;
    el.classList.toggle('hidden', !show);
    if (wrap) wrap.classList.toggle('admin-table-loading', !!show);
    if (message) {
      var msg = el.querySelector('.admin-loading-msg');
      if (msg) msg.textContent = message;
    }
  }

  function periodEndCell(u) {
    var plan = u.plan || 'free';
    if (plan === 'free' && !u.stripe_last_payment_at) {
      return '<span class="admin-period-muted">—</span>';
    }
    var val = toDateInputValue(u.subscription_period_end || effectivePeriodEnd(u));
    return (
      '<input type="date" class="admin-period-input" data-user-id="' + escapeHtml(u.user_id) + '"' +
      ' value="' + escapeHtml(val) + '" title="Fin del plan actual (editable)" />'
    );
  }

  function siteUrl() {
    var origin = location.origin;
    var path = location.pathname || '/';
    if (/index\.html$/i.test(path)) path = path.replace(/index\.html$/i, '');
    if (path.slice(-1) !== '/') path += '/';
    return origin + path;
  }

  function invitePlanMeta(planId) {
    var plans = (global.PT_BILLING && global.PT_BILLING.plans) || {};
    if (planId === 'premium') {
      return { label: 'Coach', price: (plans.premium && plans.premium.monthly) ? plans.premium.monthly + ' €/mes' : '34,99 €/mes' };
    }
    if (planId === 'pro') {
      return { label: 'Study', price: (plans.pro && plans.pro.monthly) ? plans.pro.monthly + ' €/mes' : '14,99 €/mes' };
    }
    return { label: 'Gratis', price: '0 €' };
  }

  function defaultInviteBody(planId) {
    var meta = invitePlanMeta(planId);
    var url = siteUrl();
    return (
      'Hola,\n\n' +
      'Te invito a probar PokerForgeAI, el entrenador GTO de póker NLHE (entrenador interactivo, importación de sesiones e IA Coach).\n\n' +
      'Plan recomendado: ' + meta.label + ' (' + meta.price + ').\n' +
      'Accede aquí: ' + url + '\n\n' +
      'Regístrate con Google y, si quieres el plan de pago, entra en la pestaña Planes dentro de la app.\n\n' +
      'Un saludo'
    );
  }

  function aiLimitForRow(u) {
    if (u.ai_limit != null && u.ai_limit !== '') return Number(u.ai_limit);
    return PLAN_AI_LIMITS[u.plan || 'free'] != null ? PLAN_AI_LIMITS[u.plan || 'free'] : 0;
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
    setAdminLoading(true, 'Cargando usuarios…');
    if (status) status.textContent = '';
    var res = await c.rpc('pt_admin_user_list');
    if (res.error) {
      tbody.innerHTML = '';
      setAdminLoading(false);
      if (status) status.textContent = '';
      var err = $('#admin-users-error');
      if (err) err.textContent = res.error.message;
      return;
    }
    var errEl = $('#admin-users-error');
    if (errEl) errEl.textContent = '';
    var me = currentUser();
    var rows = res.data || [];
    adminUsersCache = rows.slice();
    normalizeRecipientSelection();
    if (status) status.textContent = rows.length + ' usuario' + (rows.length === 1 ? '' : 's');
    tbody.innerHTML = rows.map(function (u) {
      var online = isOnline(u.last_seen_at);
      var isSelf = me && me.sub === u.user_id;
      var isDemo = u.user_id === DEMO_USER_ID;
      var rowCls = isDemo ? ' class="admin-row-demo"' : '';
      return (
        '<tr data-user-id="' + escapeHtml(u.user_id) + '"' + rowCls + '>' +
        '<td class="admin-user-cell" data-col="user">' +
        '<span class="admin-user-name">' + escapeHtml(u.name || '—') + (isDemo ? ' <span class="admin-demo-badge">DEMO</span>' : '') + '</span>' +
        '<span class="admin-user-email">' + escapeHtml(u.email) + '</span>' +
        '</td>' +
        '<td data-col="plan">' + planSelect(u.user_id, u.plan || 'free', false) + '</td>' +
        '<td class="admin-period" data-col="period">' + periodEndCell(u) + '</td>' +
        '<td class="admin-renewal" data-col="renewal">' + escapeHtml(formatRenewal(u)) + '</td>' +
        '<td data-col="ai">' + usageBar(Number(u.ai_today) || 0, aiLimitForRow(u), u.is_admin) + '</td>' +
        '<td class="admin-payment" data-col="payment">' + escapeHtml(formatPayment(u.stripe_last_payment_at)) + '</td>' +
        '<td data-col="seen"><span class="admin-status' + (online ? ' admin-status-online' : '') + '">' +
        (online ? '● ' : '') + escapeHtml(formatRelative(u.last_seen_at)) + '</span></td>' +
        '<td class="admin-center" data-col="admin">' +
        '<label class="admin-toggle" title="' + (isDemo ? 'Usuario demo' : (isSelf ? 'No puedes quitarte admin a ti mismo' : 'Administrador')) + '">' +
        '<input type="checkbox" class="admin-check" data-field="is_admin"' +
        (u.is_admin ? ' checked' : '') +
        (isSelf || isDemo ? ' disabled' : '') + ' />' +
        '</label></td>' +
        '</tr>'
      );
    }).join('');
    bindUserActions();
    renderAdminComposer();
    setAdminLoading(false);
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
    tbody.querySelectorAll('.admin-period-input').forEach(function (inp) {
      inp.onchange = function () {
        var uid = inp.dataset.userId;
        if (!uid || !inp.value) return;
        var endIso = new Date(inp.value + 'T23:59:59').toISOString();
        updateUser(uid, { subscription_period_end: endIso });
      };
    });
  }

  async function updateUser(userId, patch) {
    var c = client();
    if (!c) return;
    var args = { p_user_id: userId };
    if (patch.plan !== undefined) args.p_plan = patch.plan;
    if (patch.is_admin !== undefined) args.p_is_admin = patch.is_admin;
    if (patch.subscription_period_end !== undefined) args.p_subscription_period_end = patch.subscription_period_end;
    var res = await c.rpc('pt_admin_update_user', args);
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
    if (patch.plan !== undefined) {
      var mePlan = currentUser();
      if (mePlan && mePlan.sub === userId) {
        if (global.PTProfile && res.data) global.PTProfile.applyProfileToUser(mePlan, res.data);
        if (global.PTEntitlements && global.PTEntitlements.refresh) {
          await global.PTEntitlements.refresh();
        }
        if (global.PTAuth && global.PTAuth.renderAccountMenu) {
          global.PTAuth.renderAccountMenu(mePlan);
        }
        global.dispatchEvent(new CustomEvent('pt-plan-changed', { detail: { userId: userId, plan: res.data.plan } }));
      }
      if (userId === DEMO_USER_ID && global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive()) {
        if (global.PTEntitlements && global.PTEntitlements.refresh) {
          await global.PTEntitlements.refresh();
        }
        if (global.PTAuth && global.PTAuth.renderAccountMenu && mePlan) {
          global.PTAuth.renderAccountMenu(mePlan);
        }
        global.dispatchEvent(new CustomEvent('pt-plan-changed'));
      }
    }
    await refresh();
  }

  function openInviteModal() {
    var modal = $('#admin-invite-modal');
    var emailEl = $('#admin-invite-email');
    var planEl = $('#admin-invite-plan');
    var bodyEl = $('#admin-invite-body');
    if (!modal || !planEl || !bodyEl) return;
    if (emailEl && !emailEl.value) emailEl.value = '';
    bodyEl.value = defaultInviteBody(planEl.value || 'pro');
    modal.classList.remove('hidden');
    document.body.classList.add('admin-invite-open');
    if (emailEl) emailEl.focus();
  }

  function closeInviteModal() {
    var modal = $('#admin-invite-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('admin-invite-open');
  }

  function bindInviteModal() {
    if (inviteModalBound) return;
    inviteModalBound = true;
    var openBtn = $('#admin-invite-open');
    var closeBtn = $('#admin-invite-close');
    var modal = $('#admin-invite-modal');
    var planEl = $('#admin-invite-plan');
    var bodyEl = $('#admin-invite-body');
    var mailBtn = $('#admin-invite-mailto');
    var copyBtn = $('#admin-invite-copy');

    if (openBtn) openBtn.addEventListener('click', openInviteModal);
    if (closeBtn) closeBtn.addEventListener('click', closeInviteModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target.id === 'admin-invite-modal' || e.target.closest('[data-close-admin-invite]')) {
          closeInviteModal();
        }
      });
    }
    if (planEl && bodyEl) {
      planEl.addEventListener('change', function () {
        bodyEl.value = defaultInviteBody(planEl.value);
      });
    }
    if (mailBtn) {
      mailBtn.addEventListener('click', function () {
        var email = ($('#admin-invite-email') && $('#admin-invite-email').value || '').trim();
        var body = bodyEl ? bodyEl.value.trim() : '';
        if (!email) {
          alert('Indica el correo del invitado.');
          return;
        }
        if (!body) {
          alert('El mensaje está vacío.');
          return;
        }
        var subject = encodeURIComponent('Invitación a PokerForgeAI');
        var mailBody = encodeURIComponent(body);
        window.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + mailBody;
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var body = bodyEl ? bodyEl.value.trim() : '';
        if (!body) {
          alert('El mensaje está vacío.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(body).then(function () {
            alert('Mensaje copiado al portapapeles.');
          }).catch(function () {
            alert(body);
          });
        } else {
          alert(body);
        }
      });
    }
  }

  async function refresh() {
    setAdminLoading(true, 'Actualizando usuarios…');
    await Promise.all([loadStats(), loadUsers()]);
    loaded = true;
  }

  function render() {
    var user = currentUser();
    if (!user || !user.isAdmin) return;
    setAdminLoading(true, 'Sincronizando con Stripe…');
    loadAdminMessagesBadge();
    loadStats().then(function () {
      return syncStripePayments({ auto: true });
    }).then(function () {
      loaded = true;
    });
  }

  function initForUser(user) {
    if (!user || !user.isAdmin) {
      setAdminVisible(false);
      return;
    }
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    setAdminVisible(!demoOn);
  }

  async function syncStripePayments(opts) {
    opts = opts || {};
    var auto = !!opts.auto;
    var btn = $('#admin-sync-payments');
    var status = $('#admin-sync-status');
    var billing = global.PTBilling;
    if (!billing || !billing.syncPayments || !billing.enabled || !billing.enabled()) {
      if (!auto) alert('Sincronización Stripe no disponible.');
      else await loadUsers();
      return;
    }
    if (syncRunning) return;
    syncRunning = true;
    if (btn) btn.disabled = true;
    if (status) status.textContent = auto ? 'Sincronizando pagos…' : 'Consultando Stripe…';
    if (auto) setAdminLoading(true, 'Sincronizando con Stripe…');
    try {
      var data = await billing.syncPayments();
      if (status) {
        status.textContent = billing.formatSyncMessage
          ? billing.formatSyncMessage(data)
          : ('Actualizados: ' + (data.updated || 0));
      }
      if (auto) await loadUsers();
      else {
        setAdminLoading(true, 'Actualizando usuarios…');
        await refresh();
      }
    } catch (e) {
      if (status) status.textContent = auto ? 'Pagos: sin sincronizar' : '';
      setAdminLoading(false);
      if (!auto) alert(e.message || 'No se pudo sincronizar con Stripe.');
    } finally {
      syncRunning = false;
      if (btn) btn.disabled = false;
    }
  }

  async function loadAdminMessagesBadge() {
    var c = client();
    var badge = $('#admin-messages-badge');
    if (!c || !badge) return;
    var res = await c.rpc('pt_admin_contact_unread_count');
    var n = res.error ? 0 : (Number(res.data) || 0);
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('hidden', n <= 0);
  }

  function renderRecipientList() {
    var users = recipientUsers();
    var filtered = users.filter(function (u) {
      if (!adminMessageFilter) return true;
      var text = ((u.name || '') + ' ' + (u.email || '')).toLowerCase();
      return text.indexOf(adminMessageFilter) >= 0;
    });
    if (!filtered.length) {
      return '<div class="admin-recipient-list-empty">No hay usuarios que coincidan.</div>';
    }
    return filtered.map(function (u) {
      var checked = adminMessageMode === 'all' || adminMessageRecipients.indexOf(u.user_id) >= 0;
      return (
        '<label class="admin-recipient-item">' +
        '<input type="checkbox" data-admin-recipient="' + escapeHtml(u.user_id) + '"' +
        (checked ? ' checked' : '') +
        (adminMessageMode === 'all' ? ' disabled' : '') + ' />' +
        '<span>' +
        '<span class="admin-recipient-name">' + escapeHtml(u.name || 'Usuario') + '</span>' +
        '<span class="admin-recipient-email">' + escapeHtml(u.email || u.user_id) + '</span>' +
        '</span>' +
        '</label>'
      );
    }).join('');
  }

  function renderAdminComposer() {
    var host = $('#admin-message-compose');
    if (!host) return;
    var totalUsers = recipientUsers().length;
    normalizeRecipientSelection();
    host.innerHTML =
      '<h4>Nuevo mensaje</h4>' +
      '<form id="admin-message-compose-form">' +
      '<div class="admin-message-modes">' +
      '<label class="admin-message-mode"><input type="radio" name="targetMode" value="single"' + (adminMessageMode === 'single' ? ' checked' : '') + '> Un usuario</label>' +
      '<label class="admin-message-mode"><input type="radio" name="targetMode" value="multiple"' + (adminMessageMode === 'multiple' ? ' checked' : '') + '> Varios usuarios</label>' +
      '<label class="admin-message-mode"><input type="radio" name="targetMode" value="all"' + (adminMessageMode === 'all' ? ' checked' : '') + '> Todos</label>' +
      '</div>' +
      '<label for="admin-message-subject">Asunto</label>' +
      '<input type="text" id="admin-message-subject" name="subject" maxlength="200" placeholder="Ej.: Aviso sobre mantenimiento" required value="' + escapeHtml(adminMessageSubject) + '" />' +
      '<label for="admin-message-body">Mensaje</label>' +
      '<textarea id="admin-message-body" name="body" rows="5" maxlength="3000" placeholder="Escribe el mensaje para los usuarios..." required>' + escapeHtml(adminMessageBody) + '</textarea>' +
      '<label for="admin-message-filter">Destinatarios</label>' +
      '<div class="admin-recipient-picker">' +
      '<input type="search" id="admin-message-filter" placeholder="Buscar por nombre o correo" value="' + escapeHtml(adminMessageFilter) + '"' +
      (adminMessageMode === 'all' ? ' disabled' : '') + ' />' +
      '<div class="admin-recipient-list">' + renderRecipientList() + '</div>' +
      '<div class="admin-recipient-summary">' +
      (adminMessageMode === 'all'
        ? ('Se enviará a todos los usuarios seleccionables (' + totalUsers + ').')
        : ('Seleccionados: ' + selectedRecipientCount() + ' de ' + totalUsers + '.')) +
      '</div>' +
      '</div>' +
      '<div class="admin-message-compose-actions">' +
      '<button type="submit" class="btn btn-primary">Enviar mensaje</button>' +
      '<span id="admin-message-compose-status" class="admin-message-compose-status">' + escapeHtml(adminMessageStatus) + '</span>' +
      '</div>' +
      '</form>';
    bindAdminComposer();
  }

  function setAdminComposeStatus(message) {
    adminMessageStatus = message || '';
    var status = $('#admin-message-compose-status');
    if (status) status.textContent = adminMessageStatus;
  }

  async function sendAdminMessage(subject, body) {
    var c = client();
    if (!c) return;
    var payload = {
      p_subject: subject,
      p_body: body,
      p_target_mode: adminMessageMode,
      p_user_ids: adminMessageMode === 'all' ? null : adminMessageRecipients
    };
    return c.rpc('pt_admin_contact_send', payload);
  }

  function bindAdminComposer() {
    var form = $('#admin-message-compose-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.querySelectorAll('input[name="targetMode"]').forEach(function (input) {
      input.addEventListener('change', function () {
        adminMessageMode = input.value;
        if (adminMessageMode === 'single' && adminMessageRecipients.length > 1) {
          adminMessageRecipients = adminMessageRecipients.slice(0, 1);
        }
        renderAdminComposer();
      });
    });
    var filter = $('#admin-message-filter');
    var subjectEl = $('#admin-message-subject');
    var bodyEl = $('#admin-message-body');
    if (subjectEl) subjectEl.addEventListener('input', function () { adminMessageSubject = subjectEl.value || ''; });
    if (bodyEl) bodyEl.addEventListener('input', function () { adminMessageBody = bodyEl.value || ''; });
    if (filter) {
      filter.addEventListener('input', function () {
        adminMessageFilter = String(filter.value || '').trim().toLowerCase();
        renderAdminComposer();
      });
    }
    form.querySelectorAll('[data-admin-recipient]').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var id = chk.getAttribute('data-admin-recipient');
        if (!id) return;
        if (adminMessageMode === 'single') {
          adminMessageRecipients = chk.checked ? [id] : [];
        } else {
          var next = adminMessageRecipients.filter(function (x) { return x !== id; });
          if (chk.checked) next.push(id);
          adminMessageRecipients = next;
        }
        renderAdminComposer();
      });
    });
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var subject = (form.subject.value || '').trim();
      var body = (form.body.value || '').trim();
      adminMessageSubject = form.subject.value || '';
      adminMessageBody = form.body.value || '';
      if (subject.length < 3 || body.length < 5) {
        alert('Completa un asunto y un mensaje válidos.');
        return;
      }
      if (adminMessageMode !== 'all' && !adminMessageRecipients.length) {
        alert(adminMessageMode === 'single'
          ? 'Selecciona un usuario destinatario.'
          : 'Selecciona al menos un usuario destinatario.');
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      setAdminComposeStatus('Enviando…');
      var res = await sendAdminMessage(subject, body);
      if (btn) btn.disabled = false;
      if (res.error) {
        setAdminComposeStatus('');
        alert('Error: ' + (res.error.message || 'no enviado'));
        return;
      }
      form.reset();
      adminMessageSubject = '';
      adminMessageBody = '';
      adminMessageFilter = '';
      if (adminMessageMode !== 'all') adminMessageRecipients = [];
      setAdminComposeStatus('Mensaje enviado a ' + ((res.data && res.data.sent_count) || 0) + ' usuario(s).');
      renderAdminComposer();
      await loadAdminInbox();
    });
  }

  function renderAdminMessageList(threads, activeId) {
    var el = $('#admin-contact-list');
    if (!el) return;
    if (!threads.length) {
      el.innerHTML = '<p class="muted-text">No hay mensajes.</p>';
      return;
    }
    el.innerHTML = threads.map(function (t) {
      var active = t.id === activeId ? ' contact-thread-active' : '';
      var unread = t.admin_unread_count > 0 ? ' contact-thread-unread' : '';
      var who = t.user_name || t.user_email || t.user_id;
      return '<button type="button" class="contact-thread-item' + active + unread + '" data-admin-thread="' + escapeHtml(t.id) + '">' +
        '<span class="contact-thread-subject">' + escapeHtml(t.subject) + '</span>' +
        '<span class="contact-thread-meta muted-text">' + escapeHtml(who) + ' · ' + escapeHtml(formatRelative(t.last_message_at)) +
        (t.admin_unread_count > 0 ? ' · <strong>Sin leer</strong>' : '') + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-admin-thread]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAdminThread(btn.getAttribute('data-admin-thread'));
      });
    });
  }

  function renderAdminMessages(messages) {
    if (!messages || !messages.length) return '<p class="muted-text">Sin mensajes.</p>';
    return messages.map(function (m) {
      var cls = m.sender_role === 'admin' ? 'contact-msg admin' : 'contact-msg user';
      var who = m.sender_role === 'admin' ? 'Soporte (tú)' : 'Usuario';
      return '<div class="' + cls + '">' +
        '<div class="contact-msg-head"><strong>' + escapeHtml(who) + '</strong>' +
        '<span class="muted-text">' + escapeHtml(formatDateTime(m.created_at)) + '</span></div>' +
        '<div class="contact-msg-body">' + escapeHtml(m.body).replace(/\n/g, '<br>') + '</div></div>';
    }).join('');
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  async function openAdminThread(threadId) {
    var c = client();
    var detail = $('#admin-contact-detail');
    if (!c || !detail || !threadId) return;
    detail.innerHTML = '<div class="contact-loading"><div class="play-boot-spinner"></div></div>';
    var res = await c.rpc('pt_admin_contact_get_thread', { p_thread_id: threadId });
    if (res.error) {
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    var th = (res.data && res.data.thread) || {};
    var msgs = (res.data && res.data.messages) || [];
    detail.innerHTML =
      '<h3>' + escapeHtml(th.subject) + '</h3>' +
      '<p class="muted-text contact-thread-user">' + escapeHtml(th.user_name || th.user_email || th.user_id) +
      (th.user_email ? ' · ' + escapeHtml(th.user_email) : '') + '</p>' +
      '<div class="contact-messages">' + renderAdminMessages(msgs) + '</div>' +
      '<form class="contact-reply-form" data-admin-reply="' + escapeHtml(th.id) + '">' +
      '<label>Respuesta<textarea name="body" rows="4" maxlength="3000" required placeholder="Escribe tu respuesta al usuario…"></textarea></label>' +
      '<button type="submit" class="btn btn-primary">Enviar respuesta</button></form>';

    var form = detail.querySelector('[data-admin-reply]');
    if (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var body = (form.body.value || '').trim();
        if (!body) return;
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        var reply = await c.rpc('pt_admin_contact_reply', { p_thread_id: th.id, p_body: body });
        if (btn) btn.disabled = false;
        if (reply.error) {
          alert('Error: ' + (reply.error.message || 'no enviado'));
          return;
        }
        await openAdminThread(threadId);
        await loadAdminInbox(threadId);
      });
    }
    await loadAdminMessagesBadge();
  }

  async function loadAdminInbox(activeId) {
    var c = client();
    if (!c) return;
    renderAdminComposer();
    var res = await c.rpc('pt_admin_contact_threads');
    if (res.error) {
      $('#admin-contact-list').innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    renderAdminMessageList(res.data || [], activeId);
    await loadAdminMessagesBadge();
  }

  function showAdminMessages(show) {
    var msgPanel = $('#admin-messages-panel');
    var usersPanel = $('#admin-users-panel');
    if (msgPanel) msgPanel.classList.toggle('hidden', !show);
    if (usersPanel) usersPanel.classList.toggle('hidden', show);
    if (show) {
      renderAdminComposer();
      loadAdminInbox();
    }
  }

  function bindAdminMessages() {
    var btn = $('#admin-messages-btn');
    var back = $('#admin-messages-back');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () { showAdminMessages(true); });
    }
    if (back && !back.dataset.bound) {
      back.dataset.bound = '1';
      back.addEventListener('click', function () { showAdminMessages(false); });
    }
  }

  function bindUi() {
    var refreshBtn = $('#admin-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { refresh(); });

    bindInviteModal();
    bindAdminMessages();

    var syncBtn = $('#admin-sync-payments');
    if (syncBtn && !syncBtn.dataset.bound) {
      syncBtn.dataset.bound = '1';
      syncBtn.addEventListener('click', function () { syncStripePayments({ auto: false }); });
    }

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
