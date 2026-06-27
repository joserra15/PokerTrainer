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

  var PLAN_AI_LIMITS = { free: 0, pro: 3, premium: 30 };
  var DEMO_USER_ID = 'pt_demo_user';

  var loaded = false;
  var adminTabBtn = null;
  var inviteModalBound = false;
  var syncRunning = false;

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

  function formatPeriodEnd(u) {
    if (!u) return '—';
    var plan = u.plan || 'free';
    var status = u.subscription_status || 'none';
    var iso = u.subscription_period_end;
    if (!iso || plan === 'free' || status === 'none' || status === 'expired') return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    if (d.getTime() < Date.now()) label += ' (caducado)';
    return label;
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
      'Te invito a probar PokerTrainer, el entrenador GTO de póker NLHE (entrenador interactivo, importación de sesiones e IA Coach).\n\n' +
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
      var isDemo = u.user_id === DEMO_USER_ID;
      var rowCls = isDemo ? ' class="admin-row-demo"' : '';
      return (
        '<tr data-user-id="' + escapeHtml(u.user_id) + '"' + rowCls + '>' +
        '<td class="admin-user-cell" data-col="user">' +
        '<span class="admin-user-name">' + escapeHtml(u.name || '—') + (isDemo ? ' <span class="admin-demo-badge">DEMO</span>' : '') + '</span>' +
        '<span class="admin-user-email">' + escapeHtml(u.email) + '</span>' +
        '</td>' +
        '<td data-col="plan">' + planSelect(u.user_id, u.plan || 'free', false) + '</td>' +
        '<td class="admin-period" data-col="period">' + escapeHtml(formatPeriodEnd(u)) + '</td>' +
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
    var args = { p_user_id: userId };
    if (patch.plan !== undefined) args.p_plan = patch.plan;
    if (patch.is_admin !== undefined) args.p_is_admin = patch.is_admin;
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
        var subject = encodeURIComponent('Invitación a PokerTrainer');
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
    await Promise.all([loadStats(), loadUsers()]);
    loaded = true;
  }

  function render() {
    var user = currentUser();
    if (!user || !user.isAdmin) return;
    refresh().then(function () {
      syncStripePayments({ auto: true });
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
      return;
    }
    if (syncRunning) return;
    syncRunning = true;
    if (btn) btn.disabled = true;
    if (status) status.textContent = auto ? 'Sincronizando pagos…' : 'Consultando Stripe…';
    try {
      var data = await billing.syncPayments();
      if (status) {
        status.textContent = billing.formatSyncMessage
          ? billing.formatSyncMessage(data)
          : ('Actualizados: ' + (data.updated || 0));
      }
      if (auto) await loadUsers();
      else await refresh();
    } catch (e) {
      if (status) status.textContent = auto ? 'Pagos: sin sincronizar' : '';
      if (!auto) alert(e.message || 'No se pudo sincronizar con Stripe.');
    } finally {
      syncRunning = false;
      if (btn) btn.disabled = false;
    }
  }

  function bindUi() {
    var refreshBtn = $('#admin-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { refresh(); });

    bindInviteModal();

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
