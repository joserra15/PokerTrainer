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

  /* Alineado con pt_plan_limits / copy comercial: free 3, Study 40, Coach 150. */
  var PLAN_AI_LIMITS = { free: 3, pro: 40, premium: 150 };
  var DEMO_USER_ID = 'pt_demo_user';


  function userCommunities(u) {
    var raw = u && u.communities;
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  }

  function communityBadges(u) {
    return userCommunities(u).map(function (c) {
      var label = c.community_id || c.id || '';
      var role = c.role === 'manager' ? 'Mgr' : 'Mem';
      return ' <span class="admin-community-badge" title="' + escapeHtml(label) + '">' +
        escapeHtml(label) + '·' + role + '</span>';
    }).join('');
  }

  var loaded = false;
  var adminTabBtn = null;
  var inviteModalBound = false;
  var syncRunning = false;
  var autoStripeSyncTimer = null;
  var adminUsersCache = [];
  var adminUsersSort = { key: 'seen', dir: 'desc' };
  var adminUsersFilters = {
    user: '',
    plan: '',
    founder: '',
    push: '',
    community: '',
    status: '',
    periodFrom: '',
    periodTo: '',
    renewalFrom: '',
    renewalTo: '',
    seenFrom: '',
    seenTo: ''
  };
  var adminUsersFiltersBound = false;
  var adminUsersPage = 1;
  var adminUsersPageSize = 25;
  var adminServerStats = null;
  var adminMessageMode = 'single';
  var adminMessageRecipients = [];
  var adminMessageFilter = '';
  var adminMessageSubject = '';
  var adminMessageBody = '';
  var adminMessageStatus = '';
  var adminDetailUserId = null;
  var adminMessagesThreads = [];
  var adminMsgSelectedUserId = null;
  var adminMsgSelectedThreadId = null;
  var adminMsgUserFilter = '';
  var adminComposeModalBound = false;
  var adminUsageCache = null;
  var adminFunnelCache = null;
  var adminFunnelError = null;
  var adminUsageDays = 30;
  var AUTO_STRIPE_SYNC_KEY = 'pt-admin-last-stripe-sync-at';
  var AUTO_STRIPE_SYNC_COOLDOWN_MS = 10 * 60 * 1000;

  var FEATURE_EVENT_LABELS = {
    tab_view: 'Visitas a pestañas',
    hand_start: 'Manos entrenador',
    play_hand: 'Jugar mano',
    ai_coach_used: 'Consultas ForgeCoach',
    ai_coach_greeting: 'Saludo ForgeCoach (sin cupo)',
    ai_coach_impression: 'Impresiones ForgeCoach',
    ai_coach_cta_click: 'Clics CTA ForgeCoach',
    ai_consent_accept: 'Consentimiento IA aceptado',
    ai_consent_deny: 'Consentimiento IA rechazado',
    ai_paywall_shown: 'Paywall ForgeCoach',
    lesson_start: 'Escuela: inicio lección',
    lesson_complete: 'Escuela: lección aprobada',
    lesson_fail: 'Escuela: lección fallida',
    lesson_blocked_plan: 'Escuela: bloqueada por plan',
    lesson_share_panel: 'Escuela: compartir',
    import_session: 'Importar sesión',
    checkout_start: 'Checkout',
    register: 'Registro',
    login: 'Login',
    logout: 'Logout'
  };

  var TAB_LABELS = {
    home: 'Inicio',
    play: 'Entrenador',
    trainer: 'Entrenador',
    sessions: 'Sesiones',
    ranges: 'Rangos',
    school: 'Escuela',
    learn: 'Aprende',
    stats: 'Estadísticas',
    analysis: 'Analizar',
    contact: 'Contacto',
    account: 'Cuenta',
    admin: 'Admin',
    leaks: 'Leaks',
    tournaments: 'Torneos'
  };

  function aggregateUsersFromThreads(threads) {
    var map = {};
    (threads || []).forEach(function (t) {
      if (!t || !t.user_id) return;
      if (!map[t.user_id]) {
        map[t.user_id] = {
          user_id: t.user_id,
          user_name: t.user_name,
          user_email: t.user_email,
          last_message_at: t.last_message_at,
          admin_unread_count: 0,
          user_unread_count: 0,
          thread_count: 0
        };
      }
      var u = map[t.user_id];
      u.thread_count += 1;
      u.admin_unread_count += Number(t.admin_unread_count) || 0;
      u.user_unread_count += Number(t.user_unread_count) || 0;
      if (!u.user_name && t.user_name) u.user_name = t.user_name;
      if (!u.user_email && t.user_email) u.user_email = t.user_email;
      if (t.last_message_at && (!u.last_message_at || new Date(t.last_message_at) > new Date(u.last_message_at))) {
        u.last_message_at = t.last_message_at;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      var ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      var tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (a.user_name || a.user_email || '').localeCompare(b.user_name || b.user_email || '', 'es');
    });
  }

  function filteredAdminMsgUsers() {
    var users = aggregateUsersFromThreads(adminMessagesThreads);
    if (!adminMsgUserFilter) return users;
    var q = adminMsgUserFilter.toLowerCase();
    return users.filter(function (u) {
      var text = ((u.user_name || '') + ' ' + (u.user_email || '') + ' ' + (u.user_id || '')).toLowerCase();
      return text.indexOf(q) >= 0;
    });
  }

  function threadsForSelectedUser() {
    if (!adminMsgSelectedUserId) return [];
    return adminMessagesThreads
      .filter(function (t) { return t.user_id === adminMsgSelectedUserId; })
      .sort(function (a, b) {
        var ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        var tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      });
  }

  function userLabelFromThread(t) {
    return t.user_name || t.user_email || t.user_id || 'Usuario';
  }

  function renderAdminUserList() {
    var el = $('#admin-msg-user-list');
    if (!el) return;
    var users = filteredAdminMsgUsers();
    if (!users.length) {
      el.innerHTML = '<p class="muted-text admin-msg-empty">No hay usuarios con mensajes' +
        (adminMsgUserFilter ? ' que coincidan con la búsqueda' : '') + '.</p>';
      return;
    }
    el.innerHTML = users.map(function (u) {
      var active = u.user_id === adminMsgSelectedUserId ? ' admin-msg-user-active' : '';
      var unread = u.admin_unread_count > 0 ? ' admin-msg-user-unread' : '';
      var who = escapeHtml(u.user_name || 'Usuario');
      var email = u.user_email ? '<span class="admin-msg-user-email">' + escapeHtml(u.user_email) + '</span>' : '';
      var meta = escapeHtml(formatRelative(u.last_message_at)) +
        ' · ' + u.thread_count + ' conv.' +
        (u.admin_unread_count > 0 ? ' · <strong>' + u.admin_unread_count + ' sin leer</strong>' : '') +
        (u.user_unread_count > 0 ? ' · <strong class="admin-msg-pending-read">pendiente usuario</strong>' : '');
      return '<button type="button" class="admin-msg-user-item' + active + unread + '" data-admin-msg-user="' +
        escapeHtml(u.user_id) + '" role="option" aria-selected="' + (active ? 'true' : 'false') + '">' +
        '<span class="admin-msg-user-name">' + who + '</span>' + email +
        '<span class="admin-msg-user-meta muted-text">' + meta + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-admin-msg-user]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectAdminMsgUser(btn.getAttribute('data-admin-msg-user'));
      });
    });
  }

  function renderAdminThreadsHeader() {
    var head = $('#admin-msg-threads-head');
    if (!head) return;
    if (!adminMsgSelectedUserId) {
      head.innerHTML = '<h4>Conversaciones</h4><p class="muted-text admin-msg-threads-hint">Selecciona un usuario para ver sus hilos.</p>';
      return;
    }
    var threads = threadsForSelectedUser();
    var sample = threads[0] || {};
    var who = escapeHtml(sample.user_name || sample.user_email || adminMsgSelectedUserId);
    var email = sample.user_email ? ' · ' + escapeHtml(sample.user_email) : '';
    head.innerHTML = '<h4>' + who + '</h4>' +
      '<p class="muted-text admin-msg-threads-hint">' + email + ' · ' + threads.length + ' conversación' +
      (threads.length === 1 ? '' : 'es') + '</p>';
  }

  function selectAdminMsgUser(userId, threadId) {
    adminMsgSelectedUserId = userId || null;
    if (threadId) adminMsgSelectedThreadId = threadId;
    else adminMsgSelectedThreadId = null;
    renderAdminUserList();
    renderAdminThreadsHeader();
    renderAdminMessageList(threadsForSelectedUser(), adminMsgSelectedThreadId);
    if (!adminMsgSelectedUserId) {
      var detail = $('#admin-contact-detail');
      if (detail) detail.innerHTML = '<p class="muted-text">Selecciona una conversación para ver el detalle y responder.</p>';
      return;
    }
    if (adminMsgSelectedThreadId) {
      openAdminThread(adminMsgSelectedThreadId, { skipInboxReload: true });
    } else {
      var threads = threadsForSelectedUser();
      if (threads.length === 1) {
        openAdminThread(threads[0].id);
      } else {
        var detailEl = $('#admin-contact-detail');
        if (detailEl) detailEl.innerHTML = '<p class="muted-text">Selecciona una conversación de la lista para leer y responder.</p>';
      }
    }
  }

  function openAdminComposeModal() {
    if (!requireAdminAccess()) return;
    var modal = $('#admin-compose-modal');
    if (!modal) return;
    renderAdminComposer();
    modal.classList.remove('hidden');
    document.body.classList.add('admin-compose-open');
  }

  function closeAdminComposeModal() {
    var modal = $('#admin-compose-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('admin-compose-open');
  }

  function bindAdminComposeModal() {
    if (adminComposeModalBound) return;
    adminComposeModalBound = true;
    var openBtn = $('#admin-compose-open');
    var modal = $('#admin-compose-modal');
    if (openBtn) openBtn.addEventListener('click', openAdminComposeModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-close-admin-compose]')) closeAdminComposeModal();
      });
    }
  }

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

  function demoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  /** Acceso Admin en cliente: rol admin y fuera de modo demo. */
  function hasAdminAccess() {
    if (demoActive()) return false;
    var u = currentUser();
    return !!(u && u.isAdmin);
  }

  function isForbiddenError(err) {
    if (!err) return false;
    var msg = String(err.message || err.code || err || '').toLowerCase();
    return msg.indexOf('forbidden') >= 0
      || msg.indexOf('not authorized') >= 0
      || msg.indexOf('permission') >= 0
      || err.code === '42501';
  }

  function clearAdminDataUi() {
    loaded = false;
    adminUsersCache = [];
    adminMessagesThreads = [];
    adminMessageRecipients = [];
    adminDetailUserId = null;
    adminMsgSelectedUserId = null;
    adminMsgSelectedThreadId = null;
    adminMessageSubject = '';
    adminMessageBody = '';
    adminMessageStatus = '';
    adminMessageFilter = '';
    adminMsgUserFilter = '';

    var stats = $('#admin-stats');
    if (stats) stats.innerHTML = '';
    var tbody = $('#admin-users-body');
    if (tbody) tbody.innerHTML = '';
    var status = $('#admin-users-status');
    if (status) status.textContent = '';
    var err = $('#admin-users-error');
    if (err) err.textContent = '';
    var detail = $('#admin-user-detail');
    if (detail) {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    }
    var badge = $('#admin-messages-badge');
    if (badge) {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
    var msgList = $('#admin-contact-list');
    if (msgList) msgList.innerHTML = '';
    var msgDetail = $('#admin-contact-detail');
    if (msgDetail) msgDetail.innerHTML = '';
    var userList = $('#admin-msg-user-list');
    if (userList) userList.innerHTML = '';
    var threadsHead = $('#admin-msg-threads-head');
    if (threadsHead) threadsHead.innerHTML = '';
    var syncStatus = $('#admin-sync-status');
    if (syncStatus) syncStatus.textContent = '';
    var loading = $('#admin-loading');
    if (loading) loading.classList.add('hidden');
    closeInviteModal();
    closeAdminComposeModal();
    var msgPanel = $('#admin-messages-panel');
    var promoPanel = $('#admin-promos-panel');
    var usersPanel = $('#admin-users-panel');
    var usagePanel = $('#admin-usage-panel');
    var communitiesPanel = $('#admin-communities-panel');
    var villainAssistPanel = $('#admin-villain-assist-panel');
    if (msgPanel) msgPanel.classList.add('hidden');
    if (promoPanel) promoPanel.classList.add('hidden');
    if (usagePanel) usagePanel.classList.add('hidden');
    if (communitiesPanel) communitiesPanel.classList.add('hidden');
    if (villainAssistPanel) villainAssistPanel.classList.add('hidden');
    if (usersPanel) usersPanel.classList.remove('hidden');
    var usageContent = $('#admin-usage-content');
    if (usageContent) usageContent.innerHTML = '';
    var usageErr = $('#admin-usage-error');
    if (usageErr) usageErr.textContent = '';
    var communitiesList = $('#admin-communities-list');
    if (communitiesList) communitiesList.innerHTML = '';
    var communityDetail = $('#admin-community-detail');
    if (communityDetail) {
      communityDetail.classList.add('hidden');
      communityDetail.innerHTML = '';
    }
    var communitiesErr = $('#admin-communities-error');
    if (communitiesErr) communitiesErr.textContent = '';
    adminUsageCache = null;
    if (global.PTAdminPromos && global.PTAdminPromos.clear) {
      global.PTAdminPromos.clear();
    }
  }

  function lockdownAdmin() {
    clearAdminDataUi();
    setAdminVisible(false);
    var tabAdmin = document.getElementById('tab-admin');
    if (tabAdmin) {
      tabAdmin.classList.remove('active');
      tabAdmin.setAttribute('aria-hidden', 'true');
    }
  }

  /** @returns {boolean} false si no hay acceso; limpia UI y no debe continuar. */
  function requireAdminAccess() {
    if (hasAdminAccess()) return true;
    lockdownAdmin();
    return false;
  }

  function handleAdminRpcError(err, fallbackEl) {
    if (isForbiddenError(err)) {
      lockdownAdmin();
      return true;
    }
    if (fallbackEl && err && err.message) {
      fallbackEl.innerHTML = '<p class="admin-error">' + escapeHtml(err.message) + '</p>';
    }
    return false;
  }

  function canAdminMessageUser(userId) {
    if (!userId || userId === DEMO_USER_ID) return false;
    var me = currentUser();
    if (me && me.sub && me.sub === userId) return false;
    return true;
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

  function usageBarAi(u) {
    if (!u) return '—';
    if (u.is_admin) {
      return '<div class="admin-usage"><span class="admin-usage-text">' + (Number(u.ai_today) || 0) + ' usadas · ∞ admin</span></div>';
    }
    var used = Number(u.ai_today) || 0;
    var limit = aiLimitForRow(u);
    var bonus = Number(u.ai_bonus_effective != null ? u.ai_bonus_effective : u.ai_bonus_balance) || 0;
    var totalAvail = u.ai_total_available;
    if (limit == null) {
      return '<div class="admin-usage"><span class="admin-usage-text">' + used + ' / ∞</span></div>';
    }
    var pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    var cls = pct >= 90 ? 'admin-usage-high' : pct >= 70 ? 'admin-usage-mid' : '';
    var bonusNote = bonus > 0 ? ' <span class="admin-usage-note" title="Consultas de bono">+' + bonus + ' bono</span>' : '';
    var availNote = totalAvail != null ? ' <span class="admin-usage-note" title="Total disponible (plan + bono)">(' + totalAvail + ' disp.)</span>' : '';
    return (
      '<div class="admin-usage">' +
      '<div class="admin-usage-bar ' + cls + '" style="width:' + pct + '%"></div>' +
      '<span class="admin-usage-text">' + used + ' / ' + limit + bonusNote + availNote + '</span>' +
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
      'Te invito a probar PokerForgeAI, el entrenador GTO de póker NLHE (entrenador interactivo, importación de sesiones e ForgeCoach).\n\n' +
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
    document.body.classList.toggle('pt-is-admin', !!show);
    if (show) {
      ensureAdminTab();
      if (adminTabBtn) adminTabBtn.classList.remove('hidden');
    } else if (adminTabBtn) {
      adminTabBtn.classList.add('hidden');
      adminTabBtn.remove();
      adminTabBtn = null;
    }
    var accountBtn = $('#account-admin');
    if (accountBtn) accountBtn.classList.toggle('hidden', !show);
    if (typeof global.refreshLegendaryTabVisibility === 'function') {
      global.refreshLegendaryTabVisibility();
    }
  }

  async function loadStats() {
    if (!requireAdminAccess()) return;
    var c = client();
    var el = $('#admin-stats');
    if (!c || !el) return;
    var res = await c.rpc('pt_admin_stats');
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error, el)) return;
      el.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    adminServerStats = res.data || {};
    renderAdminStats();
  }

  function clientUserStats() {
    var list = adminUsersCache || [];
    var byPlan = { free: 0, pro: 0, premium: 0 };
    var activePaid = 0;
    var expired = 0;
    var pendingFounder = 0;
    list.forEach(function (u) {
      if (!u) return;
      var plan = u.plan || 'free';
      if (byPlan[plan] != null) byPlan[plan] += 1;
      var bucket = userSubscriptionBucket(u);
      if (bucket === 'active' || bucket === 'trialing') activePaid += 1;
      if (bucket === 'expired') expired += 1;
      if ((!u.is_founder_study && u.founder_study_requested_at) ||
          (!u.is_founder_coach && u.founder_coach_requested_at)) {
        pendingFounder += 1;
      }
    });
    return {
      byPlan: byPlan,
      activePaid: activePaid,
      expired: expired,
      pendingFounder: pendingFounder,
      pushOn: list.filter(userHasPush).length
    };
  }

  function renderAdminStats() {
    var el = $('#admin-stats');
    if (!el) return;
    var s = adminServerStats || {};
    var local = clientUserStats();
    var byPlan = (s.by_plan && typeof s.by_plan === 'object') ? s.by_plan : local.byPlan;
    var studyCount = byPlan.pro != null ? byPlan.pro : local.byPlan.pro;
    var coachCount = byPlan.premium != null ? byPlan.premium : local.byPlan.premium;
    var activePaid = s.active_paid != null ? s.active_paid : local.activePaid;
    var pendingFounder = s.pending_founder != null ? s.pending_founder : local.pendingFounder;
    el.innerHTML =
      '<div class="admin-stat-card" data-admin-stat="users"><span class="admin-stat-value">' + (s.total_users || local.byPlan.free + local.byPlan.pro + local.byPlan.premium || 0) + '</span><span class="admin-stat-label">Usuarios</span></div>' +
      '<div class="admin-stat-card" data-admin-stat="active_today"><span class="admin-stat-value">' + (s.active_today || 0) + '</span><span class="admin-stat-label">Activos hoy</span></div>' +
      '<div class="admin-stat-card admin-stat-online" data-admin-stat="online"><span class="admin-stat-value">' + (s.online_now || 0) + '</span><span class="admin-stat-label">En línea</span></div>' +
      '<div class="admin-stat-card" data-admin-stat="ai_today"><span class="admin-stat-value">' + (s.ai_requests_today || 0) + '</span><span class="admin-stat-label">IA hoy</span></div>' +
      '<div class="admin-stat-card admin-stat-clickable" data-admin-filter-plan="pro" title="Filtrar Study"><span class="admin-stat-value">' + studyCount + '</span><span class="admin-stat-label">Study</span></div>' +
      '<div class="admin-stat-card admin-stat-clickable" data-admin-filter-plan="premium" title="Filtrar Coach"><span class="admin-stat-value">' + coachCount + '</span><span class="admin-stat-label">Coach</span></div>' +
      '<div class="admin-stat-card admin-stat-clickable" data-admin-filter-status="active" title="Filtrar suscripciones activas"><span class="admin-stat-value">' + activePaid + '</span><span class="admin-stat-label">Pago activo</span></div>' +
      '<div class="admin-stat-card admin-stat-clickable' + (pendingFounder ? ' admin-stat-alert' : '') + '" data-admin-filter-status="pending_founder" title="Solicitudes FOUNDER pendientes"><span class="admin-stat-value">' + pendingFounder + '</span><span class="admin-stat-label">FOUNDER pend.</span></div>';
    el.querySelectorAll('[data-admin-filter-plan]').forEach(function (card) {
      card.addEventListener('click', function () {
        applyQuickFilter({ plan: card.getAttribute('data-admin-filter-plan') });
      });
    });
    el.querySelectorAll('[data-admin-filter-status]').forEach(function (card) {
      card.addEventListener('click', function () {
        applyQuickFilter({ status: card.getAttribute('data-admin-filter-status') });
      });
    });
    renderFounderQueue();
  }

  function applyQuickFilter(patch) {
    patch = patch || {};
    if (patch.plan != null) {
      adminUsersFilters.plan = patch.plan;
      var planEl = $('#admin-filter-plan');
      if (planEl) planEl.value = patch.plan;
    }
    if (patch.status != null) {
      adminUsersFilters.status = patch.status;
      var stEl = $('#admin-filter-status');
      if (stEl) stEl.value = patch.status;
    }
    if (patch.founder != null) {
      adminUsersFilters.founder = patch.founder;
      var fEl = $('#admin-filter-founder');
      if (fEl) fEl.value = patch.founder;
    }
    adminUsersPage = 1;
    renderUsersTable();
  }

  function renderFounderQueue() {
    var host = $('#admin-founder-queue');
    if (!host) return;
    var pending = pendingFounderUsers();
    if (!pending.length) {
      host.classList.add('hidden');
      host.innerHTML = '';
      return;
    }
    host.classList.remove('hidden');
    var items = pending.slice(0, 8).map(function (u) {
      var bits = [];
      if (!u.is_founder_study && u.founder_study_requested_at) bits.push('Study');
      if (!u.is_founder_coach && u.founder_coach_requested_at) bits.push('Coach');
      return '<button type="button" class="admin-founder-queue-item" data-user-id="' + escapeHtml(u.user_id) + '">' +
        '<strong>' + escapeHtml(u.name || u.email || u.user_id) + '</strong>' +
        '<span class="muted-text">' + escapeHtml(bits.join(' · ')) + '</span></button>';
    }).join('');
    host.innerHTML =
      '<div class="admin-founder-queue-head">' +
      '<strong>Cola FOUNDER</strong> · ' + pending.length + ' pendiente' + (pending.length === 1 ? '' : 's') +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-founder-queue-filter">Ver todas</button>' +
      '</div>' +
      '<div class="admin-founder-queue-list">' + items + '</div>';
    var filterBtn = $('#admin-founder-queue-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', function () {
        applyQuickFilter({ status: 'pending_founder' });
      });
    }
    host.querySelectorAll('[data-user-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openUserDetail(btn.getAttribute('data-user-id'));
      });
    });
  }

  function planSelect(userId, current, disabled) {
    var opts = PLAN_OPTIONS.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');
    return '<select class="admin-plan-select" data-user-id="' + escapeHtml(userId) + '"' +
      (disabled ? ' disabled' : '') + '>' + opts + '</select>';
  }

  function dayKeyFromIso(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    /* Usar UTC para que filtros date coincidan con timestamps ISO del servidor. */
    return d.toISOString().slice(0, 10);
  }

  function dateInRange(iso, fromStr, toStr) {
    if (!fromStr && !toStr) return true;
    var key = dayKeyFromIso(iso);
    if (!key) return false;
    if (fromStr && key < fromStr) return false;
    if (toStr && key > toStr) return false;
    return true;
  }

  function renewalIso(u) {
    if (!u) return null;
    var status = u.subscription_status || 'none';
    var canceled = !!u.subscription_cancel_at_period_end
      || status === 'canceled'
      || status === 'canceling';
    if (!canceled && status !== 'active' && status !== 'trialing') return null;
    return effectivePeriodEnd(u);
  }

  function userSortValue(u, key) {
    if (key === 'user') {
      return String((u.name || '') + ' ' + (u.email || '')).toLowerCase();
    }
    if (key === 'plan') {
      var order = { free: 0, pro: 1, premium: 2 };
      var plan = u.plan || 'free';
      return order[plan] != null ? order[plan] : 99;
    }
    if (key === 'period') {
      var pe = effectivePeriodEnd(u);
      return pe ? new Date(pe).getTime() : 0;
    }
    if (key === 'renewal') {
      var re = renewalIso(u);
      return re ? new Date(re).getTime() : 0;
    }
    if (key === 'ai') return Number(u.ai_today) || 0;
    if (key === 'payment') {
      return u.stripe_last_payment_at ? new Date(u.stripe_last_payment_at).getTime() : 0;
    }
    if (key === 'seen') {
      return u.last_seen_at ? new Date(u.last_seen_at).getTime() : 0;
    }
    if (key === 'admin') return u.is_admin ? 1 : 0;
    if (key === 'founder') {
      var score = 0;
      if (u.is_founder_study) score += 4;
      if (u.is_founder_coach) score += 2;
      if (u.founder_study_requested_at && !u.is_founder_study) score += 1;
      if (u.founder_coach_requested_at && !u.is_founder_coach) score += 1;
      return score;
    }
    if (key === 'founder_study') {
      if (u.is_founder_study) return 2;
      if (u.founder_study_requested_at) return 1;
      return 0;
    }
    if (key === 'founder_coach') {
      if (u.is_founder_coach) return 2;
      if (u.founder_coach_requested_at) return 1;
      return 0;
    }
    if (key === 'push') return userHasPush(u) ? (Number(u.push_devices) || 1) : 0;
    return 0;
  }

  function userHasPush(u) {
    if (!u) return false;
    if (u.push_enabled === true || u.push_enabled === 't' || u.push_enabled === 'true') return true;
    return (Number(u.push_devices) || 0) > 0;
  }

  function pushStatusLabel(u) {
    if (!userHasPush(u)) return 'No';
    var n = Number(u.push_devices) || 0;
    if (n > 1) return 'Sí · ' + n;
    return 'Sí';
  }

  function pushStatusCell(u) {
    var on = userHasPush(u);
    return '<span class="admin-push-badge ' + (on ? 'is-on' : 'is-off') + '">' +
      escapeHtml(pushStatusLabel(u)) + '</span>';
  }


  function userSubscriptionBucket(u) {
    var plan = (u && u.plan) || 'free';
    var st = (u && u.subscription_status) || 'none';
    var end = effectivePeriodEnd(u);
    var expired = !!(end && new Date(end).getTime() < Date.now());
    if (plan === 'free' && st !== 'active' && st !== 'trialing') return 'free';
    if (st === 'trialing') return 'trialing';
    if (expired || st === 'expired') return 'expired';
    if (st === 'canceled' || st === 'canceling') return 'canceled';
    if (st === 'active') return 'active';
    if (plan === 'pro' || plan === 'premium') return expired ? 'expired' : 'active';
    return st || 'none';
  }

  function statusBadgeHtml(u) {
    var bucket = userSubscriptionBucket(u);
    var labels = {
      free: 'Gratis',
      active: 'Activo',
      trialing: 'Trial',
      expired: 'Caducado',
      canceled: 'Cancela',
      none: '—'
    };
    var label = labels[bucket] || bucket;
    return '<span class="admin-status-badge admin-status-' + escapeHtml(bucket) + '">' + escapeHtml(label) + '</span>';
  }

  function pendingFounderUsers() {
    return (adminUsersCache || []).filter(function (u) {
      if (!u || u.user_id === DEMO_USER_ID) return false;
      var pendingStudy = !u.is_founder_study && !!u.founder_study_requested_at;
      var pendingCoach = !u.is_founder_coach && !!u.founder_coach_requested_at;
      return pendingStudy || pendingCoach;
    });
  }

  function filteredSortedUsers() {
    var q = String(adminUsersFilters.user || '').trim().toLowerCase();
    var plan = adminUsersFilters.plan || '';
    var founder = adminUsersFilters.founder || '';
    var push = adminUsersFilters.push || '';
    var rows = adminUsersCache.filter(function (u) {
      if (!u) return false;
      if (q) {
        var text = ((u.name || '') + ' ' + (u.email || '') + ' ' + (u.user_id || '')).toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      if (plan && (u.plan || 'free') !== plan) return false;
      var status = adminUsersFilters.status || '';
      if (status) {
        if (status === 'pending_founder') {
          var ps = !u.is_founder_study && !!u.founder_study_requested_at;
          var pc = !u.is_founder_coach && !!u.founder_coach_requested_at;
          if (!ps && !pc) return false;
        } else if (userSubscriptionBucket(u) !== status) {
          return false;
        }
      }
      if (push === 'on' && !userHasPush(u)) return false;
      if (push === 'off' && userHasPush(u)) return false;
      var community = adminUsersFilters.community || '';
      if (community) {
        var cms = userCommunities(u);
        if (community === 'none') {
          if (cms.length) return false;
        } else if (community === 'mttlab_manager') {
          if (!cms.some(function (c) {
            return (c.community_id || c.id) === 'mttlab' && c.role === 'manager';
          })) return false;
        } else {
          if (!cms.some(function (c) {
            return (c.community_id || c.id) === community;
          })) return false;
        }
      }
      if (founder === 'study' && !u.is_founder_study) return false;
      if (founder === 'coach' && !u.is_founder_coach) return false;
      if (founder === 'any' && !(u.is_founder_study || u.is_founder_coach || u.is_founder)) return false;
      if (founder === 'none' && (u.is_founder_study || u.is_founder_coach || u.is_founder)) return false;
      if (founder === 'req_study' && (u.is_founder_study || !u.founder_study_requested_at)) return false;
      if (founder === 'req_coach' && (u.is_founder_coach || !u.founder_coach_requested_at)) return false;
      if (founder === 'yes' && !(u.is_founder_study || u.is_founder_coach || u.is_founder)) return false;
      if (founder === 'no' && (u.is_founder_study || u.is_founder_coach || u.is_founder)) return false;
      if (founder === 'requested' && (
        (u.is_founder_study || u.is_founder_coach) ||
        !(u.founder_study_requested_at || u.founder_coach_requested_at || u.founder_requested_at)
      )) return false;
      if (!dateInRange(effectivePeriodEnd(u), adminUsersFilters.periodFrom, adminUsersFilters.periodTo)) {
        return false;
      }
      if (!dateInRange(renewalIso(u), adminUsersFilters.renewalFrom, adminUsersFilters.renewalTo)) {
        return false;
      }
      if (!dateInRange(u.last_seen_at, adminUsersFilters.seenFrom, adminUsersFilters.seenTo)) {
        return false;
      }
      return true;
    });

    var key = adminUsersSort.key;
    var dir = adminUsersSort.dir === 'asc' ? 1 : -1;
    if (!key) return rows;
    return rows.slice().sort(function (a, b) {
      var va = userSortValue(a, key);
      var vb = userSortValue(b, key);
      if (typeof va === 'string' || typeof vb === 'string') {
        var cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
        if (cmp !== 0) return cmp * dir;
      } else if (va !== vb) {
        return (va < vb ? -1 : 1) * dir;
      }
      var na = String(a.name || a.email || '').toLowerCase();
      var nb = String(b.name || b.email || '').toLowerCase();
      return na.localeCompare(nb, 'es');
    });
  }

  function updateSortHeaders() {
    document.querySelectorAll('.admin-th-sort').forEach(function (btn) {
      var key = btn.getAttribute('data-sort');
      var active = key === adminUsersSort.key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-sort', active
        ? (adminUsersSort.dir === 'asc' ? 'ascending' : 'descending')
        : 'none');
      var label = btn.getAttribute('data-label') || btn.textContent.replace(/\s*[↑↓↕]\s*$/, '').trim();
      btn.setAttribute('data-label', label);
      var mark = !active ? ' ↕' : (adminUsersSort.dir === 'asc' ? ' ↑' : ' ↓');
      btn.textContent = label + mark;
    });
  }

  function readUsersFiltersFromDom() {
    var userEl = $('#admin-filter-user');
    var planEl = $('#admin-filter-plan');
    var founderEl = $('#admin-filter-founder');
    var pushEl = $('#admin-filter-push');
    adminUsersFilters.user = userEl ? String(userEl.value || '') : '';
    adminUsersFilters.plan = planEl ? String(planEl.value || '') : '';
    adminUsersFilters.founder = founderEl ? String(founderEl.value || '') : '';
    adminUsersFilters.push = pushEl ? String(pushEl.value || '') : '';
    var communityEl = $('#admin-filter-community');
    adminUsersFilters.community = communityEl ? String(communityEl.value || '') : '';
    var statusEl = $('#admin-filter-status');
    adminUsersFilters.status = statusEl ? String(statusEl.value || '') : '';
    adminUsersFilters.periodFrom = ($('#admin-filter-period-from') || {}).value || '';
    adminUsersFilters.periodTo = ($('#admin-filter-period-to') || {}).value || '';
    adminUsersFilters.renewalFrom = ($('#admin-filter-renewal-from') || {}).value || '';
    adminUsersFilters.renewalTo = ($('#admin-filter-renewal-to') || {}).value || '';
    adminUsersFilters.seenFrom = ($('#admin-filter-seen-from') || {}).value || '';
    adminUsersFilters.seenTo = ($('#admin-filter-seen-to') || {}).value || '';
  }

  function clearUsersFilters() {
    adminUsersFilters = {
      user: '', plan: '', founder: '', push: '', community: '', status: '',
      periodFrom: '', periodTo: '',
      renewalFrom: '', renewalTo: '',
      seenFrom: '', seenTo: ''
    };
    adminUsersPage = 1;
    ['admin-filter-user', 'admin-filter-plan', 'admin-filter-founder', 'admin-filter-push', 'admin-filter-community', 'admin-filter-status',
      'admin-filter-period-from', 'admin-filter-period-to',
      'admin-filter-renewal-from', 'admin-filter-renewal-to',
      'admin-filter-seen-from', 'admin-filter-seen-to'
    ].forEach(function (id) {
      var el = $('#' + id);
      if (el) el.value = '';
    });
    renderUsersTable();
  }

  function bindUsersFiltersAndSort() {
    if (adminUsersFiltersBound) return;
    adminUsersFiltersBound = true;
    var filterIds = [
      'admin-filter-user', 'admin-filter-plan', 'admin-filter-founder', 'admin-filter-push', 'admin-filter-community', 'admin-filter-status',
      'admin-filter-period-from', 'admin-filter-period-to',
      'admin-filter-renewal-from', 'admin-filter-renewal-to',
      'admin-filter-seen-from', 'admin-filter-seen-to'
    ];
    filterIds.forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      var evt = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
      el.addEventListener(evt, function () {
        readUsersFiltersFromDom();
        adminUsersPage = 1;
        renderUsersTable();
      });
    });
    var clearBtn = $('#admin-filter-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearUsersFilters);
    document.querySelectorAll('.admin-th-sort').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var key = btn.getAttribute('data-sort');
        if (!key) return;
        if (adminUsersSort.key === key) {
          adminUsersSort.dir = adminUsersSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          adminUsersSort.key = key;
          adminUsersSort.dir = (key === 'user' || key === 'plan') ? 'asc' : 'desc';
        }
        renderUsersTable();
      });
    });
  }

  function renderUsersTable() {
    var tbody = $('#admin-users-body');
    var status = $('#admin-users-status');
    if (!tbody) return;
    bindUsersFiltersAndSort();
    updateSortHeaders();
    var me = currentUser();
    var allRows = filteredSortedUsers();
    var total = adminUsersCache.length;
    var pushOnCount = adminUsersCache.filter(userHasPush).length;
    var pageSize = adminUsersPageSize || 25;
    var maxPage = Math.max(1, Math.ceil(allRows.length / pageSize) || 1);
    if (adminUsersPage > maxPage) adminUsersPage = maxPage;
    if (adminUsersPage < 1) adminUsersPage = 1;
    var start = (adminUsersPage - 1) * pageSize;
    var rows = allRows.slice(start, start + pageSize);
    if (status) {
      var base = allRows.length === total
        ? (total + ' usuario' + (total === 1 ? '' : 's'))
        : (allRows.length + ' de ' + total + ' usuarios');
      status.textContent = base + ' · ' + pushOnCount + ' con push · pág. ' + adminUsersPage + '/' + maxPage;
    }
    renderUsersPagination(allRows.length, maxPage);
    if (!allRows.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="muted-text admin-users-empty">' +
        (total ? 'Ningún usuario coincide con los filtros.' : 'Sin usuarios.') +
        '</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (u) {
      var online = isOnline(u.last_seen_at);
      var isSelf = me && me.sub === u.user_id;
      var isDemo = u.user_id === DEMO_USER_ID;
      var activeDetail = adminDetailUserId === u.user_id ? ' admin-row-active' : '';
      var badges = '';
      if (u.is_founder_study) badges += ' <span class="admin-founder-badge">F·Study</span>';
      else if (u.founder_study_requested_at) badges += ' <span class="admin-founder-pending-badge">Sol·Study</span>';
      if (u.is_founder_coach) badges += ' <span class="admin-founder-badge">F·Coach</span>';
      else if (u.founder_coach_requested_at) badges += ' <span class="admin-founder-pending-badge">Sol·Coach</span>';
      return (
        '<tr data-user-id="' + escapeHtml(u.user_id) + '" class="admin-user-row' + (isDemo ? ' admin-row-demo' : '') + activeDetail + '">' +
        '<td class="admin-user-cell" data-col="user">' +
        '<span class="admin-user-name">' + escapeHtml(u.name || '—') + (isDemo ? ' <span class="admin-demo-badge">DEMO</span>' : '') +
        badges + communityBadges(u) +
        '</span>' +
        '<span class="admin-user-email">' + escapeHtml(u.email) + '</span>' +
        '</td>' +
        '<td data-col="plan"><div class="admin-plan-cell">' + planSelect(u.user_id, u.plan || 'free', false) +
        statusBadgeHtml(u) + '</div></td>' +
        '<td class="admin-period" data-col="period">' + periodEndCell(u) + '</td>' +
        '<td class="admin-renewal" data-col="renewal">' + escapeHtml(formatRenewal(u)) + '</td>' +
        '<td data-col="ai">' + usageBarAi(u) + '</td>' +
        '<td class="admin-payment" data-col="payment">' + escapeHtml(formatPayment(u.stripe_last_payment_at)) + '</td>' +
        '<td data-col="seen"><span class="admin-status' + (online ? ' admin-status-online' : '') + '">' +
        (online ? '● ' : '') + escapeHtml(formatRelative(u.last_seen_at)) + '</span></td>' +
        '<td class="admin-center" data-col="push">' + pushStatusCell(u) + '</td>' +
        '<td class="admin-center" data-col="founder_study">' +
        '<label class="admin-toggle" title="FOUNDER Study">' +
        '<input type="checkbox" class="admin-check" data-field="is_founder_study"' +
        (u.is_founder_study ? ' checked' : '') +
        (isDemo ? ' disabled' : '') + ' />' +
        '</label></td>' +
        '<td class="admin-center" data-col="founder_coach">' +
        '<label class="admin-toggle" title="FOUNDER Coach">' +
        '<input type="checkbox" class="admin-check" data-field="is_founder_coach"' +
        (u.is_founder_coach ? ' checked' : '') +
        (isDemo ? ' disabled' : '') + ' />' +
        '</label></td>' +
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
    bindUserRowClicks();
    renderAdminComposer();
    renderAdminStats();
  }

  function renderUsersPagination(filteredCount, maxPage) {
    var host = $('#admin-users-pagination');
    if (!host) return;
    if (filteredCount <= adminUsersPageSize) {
      host.innerHTML = '';
      host.classList.add('hidden');
      return;
    }
    host.classList.remove('hidden');
    host.innerHTML =
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-page="prev"' + (adminUsersPage <= 1 ? ' disabled' : '') + '>Anterior</button>' +
      '<span class="admin-page-label">Página ' + adminUsersPage + ' / ' + maxPage + ' (' + filteredCount + ')</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-page="next"' + (adminUsersPage >= maxPage ? ' disabled' : '') + '>Siguiente</button>' +
      '<label class="admin-page-size">Por pág. <select id="admin-page-size">' +
      [25, 50, 100].map(function (n) {
        return '<option value="' + n + '"' + (adminUsersPageSize === n ? ' selected' : '') + '>' + n + '</option>';
      }).join('') +
      '</select></label>';
    var prev = host.querySelector('[data-admin-page="prev"]');
    var next = host.querySelector('[data-admin-page="next"]');
    if (prev) prev.addEventListener('click', function () {
      if (adminUsersPage > 1) { adminUsersPage -= 1; renderUsersTable(); }
    });
    if (next) next.addEventListener('click', function () {
      adminUsersPage += 1; renderUsersTable();
    });
    var sizeEl = $('#admin-page-size');
    if (sizeEl) {
      sizeEl.addEventListener('change', function () {
        adminUsersPageSize = parseInt(sizeEl.value, 10) || 25;
        adminUsersPage = 1;
        renderUsersTable();
      });
    }
  }

  function exportUsersCsv() {
    if (!requireAdminAccess()) return;
    var rows = filteredSortedUsers();
    var headers = ['user_id', 'name', 'email', 'plan', 'subscription_status', 'subscription_period_end', 'is_admin', 'is_founder_study', 'is_founder_coach', 'push', 'last_seen_at', 'ai_today'];
    function csvEscape(v) {
      var s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    var lines = [headers.join(',')];
    rows.forEach(function (u) {
      lines.push([
        u.user_id,
        u.name,
        u.email,
        u.plan,
        u.subscription_status,
        u.subscription_period_end,
        u.is_admin ? '1' : '0',
        u.is_founder_study ? '1' : '0',
        u.is_founder_coach ? '1' : '0',
        userHasPush(u) ? '1' : '0',
        u.last_seen_at,
        u.ai_today
      ].map(csvEscape).join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pokerforge-usuarios.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }


  async function loadUsers() {
    if (!requireAdminAccess()) return;
    var c = client();
    var tbody = $('#admin-users-body');
    var status = $('#admin-users-status');
    if (!c || !tbody) return;
    setAdminLoading(true, 'Cargando usuarios…');
    if (status) status.textContent = '';
    var res = await c.rpc('pt_admin_user_list');
    if (!requireAdminAccess()) {
      setAdminLoading(false);
      return;
    }
    if (res.error) {
      tbody.innerHTML = '';
      setAdminLoading(false);
      if (status) status.textContent = '';
      if (handleAdminRpcError(res.error)) return;
      var err = $('#admin-users-error');
      if (err) err.textContent = res.error.message;
      return;
    }
    var errEl = $('#admin-users-error');
    if (errEl) errEl.textContent = '';
    adminUsersCache = (res.data || []).slice();
    normalizeRecipientSelection();
    renderUsersTable();
    renderAdminStats();
    setAdminLoading(false);
  }

  function bindUserRowClicks() {
    var tbody = $('#admin-users-body');
    if (!tbody) return;
    tbody.querySelectorAll('.admin-user-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('select, input, button, label, a')) return;
        var uid = row.dataset.userId;
        if (uid) openUserDetail(uid);
      });
    });
  }

  function ledgerReasonLabel(reason) {
    if (reason === 'purchase') return 'Compra bono';
    if (reason === 'gift') return 'Bono IA';
    if (reason === 'promo') return 'Promo registro';
    if (reason === 'ai_usage') return 'Uso IA';
    return reason || '—';
  }

  function ledgerPackLabel(packCode, reason) {
    if (packCode === 'gift' || reason === 'gift') return 'Bono de regalo';
    if (reason === 'promo' && packCode) return 'Promo ' + packCode;
    if (packCode === 's') return 'Pack S';
    if (packCode === 'm') return 'Pack M';
    if (packCode === 'l') return 'Pack L';
    return packCode || '—';
  }

  function promoGiftSummary(promo) {
    var parts = [];
    if (promo.plan_label || promo.plan_granted) {
      parts.push('Plan ' + (promo.plan_label || promo.plan_granted));
    }
    if (promo.bonus_credits_granted > 0) {
      parts.push(promo.bonus_credits_granted + ' consultas IA');
    }
    return parts.join(' · ') || 'Regalo de promoción';
  }

  function formatActivityTs(value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'number' || (/^\d+$/).test(String(value))) {
      var n = Number(value);
      if (!isNaN(n) && n > 0) {
        var ms = n < 1e12 ? n * 1000 : n;
        return formatDateTime(new Date(ms).toISOString());
      }
    }
    return formatDateTime(value);
  }

  function formatActivityNumber(n, digits) {
    var v = Number(n);
    if (isNaN(v)) return '—';
    if (digits != null) return (Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits)).toFixed(digits);
    return String(Math.round(v));
  }

  function activityPlayingLabel(act) {
    if (!act) return 'Sin datos';
    if (isOnline(act.last_seen_at)) return 'En línea ahora';
    var hands = Number(act.hands_played) || 0;
    var sessions = Number(act.import_sessions) || Number(act.session_stubs) || 0;
    if (hands <= 0 && sessions <= 0) return 'Sin actividad de juego';
    return 'Ha jugado / entrenado';
  }

  function renderActivitySection(act) {
    if (!act) {
      return '<p class="muted-text">Sin datos de actividad disponibles.</p>';
    }
    if (!act.has_cloud_data) {
      return '<p class="muted-text">Este usuario aún no ha sincronizado datos en la nube.</p>' +
        '<p class="muted-text">Última visita: ' + escapeHtml(formatRelative(act.last_seen_at)) + '</p>';
    }
    var accuracy = act.accuracy_pct != null ? act.accuracy_pct + '%' : '—';
    var net = Number(act.total_net) || 0;
    var ev = Number(act.total_ev_loss) || 0;
    return '<p class="admin-activity-status"><strong>' + escapeHtml(activityPlayingLabel(act)) + '</strong>' +
      '<span class="muted-text"> · visto ' + escapeHtml(formatRelative(act.last_seen_at)) +
      ' · sync ' + escapeHtml(formatRelative(act.synced_at)) + '</span></p>' +
      '<div class="admin-detail-grid">' +
      '<div><span class="muted-text">Manos entrenador</span><strong>' + escapeHtml(formatActivityNumber(act.hands_played)) + '</strong></div>' +
      '<div><span class="muted-text">Acierto</span><strong>' + escapeHtml(accuracy) + '</strong></div>' +
      '<div><span class="muted-text">Decisiones</span><strong>' + escapeHtml(formatActivityNumber(act.decisions)) + '</strong></div>' +
      '<div><span class="muted-text">Errores a repasar</span><strong>' + escapeHtml(formatActivityNumber(act.errors_count)) + '</strong></div>' +
      '<div><span class="muted-text">Histórico</span><strong>' + escapeHtml(formatActivityNumber(act.history_count)) + '</strong></div>' +
      '<div><span class="muted-text">Sesiones import</span><strong>' + escapeHtml(formatActivityNumber(act.import_sessions)) + '</strong></div>' +
      '<div><span class="muted-text">Resultado (bb)</span><strong class="' + (net >= 0 ? 'net-pos' : 'net-neg') + '">' +
      (net >= 0 ? '+' : '') + escapeHtml(formatActivityNumber(net, 2)) + '</strong></div>' +
      '<div><span class="muted-text">EV perdido (bb)</span><strong class="net-neg">-' +
      escapeHtml(formatActivityNumber(ev, 2)) + '</strong></div>' +
      '<div><span class="muted-text">Óptimas / Acept.</span><strong>' +
      escapeHtml(formatActivityNumber(act.optima)) + ' / ' + escapeHtml(formatActivityNumber(act.aceptable)) + '</strong></div>' +
      '<div><span class="muted-text">Imprecisas / Error</span><strong>' +
      escapeHtml(formatActivityNumber(act.imprecisa)) + ' / ' + escapeHtml(formatActivityNumber(act.error)) + '</strong></div>' +
      '<div><span class="muted-text">Stats locales sync</span><strong>' + escapeHtml(formatActivityTs(act.stats_updated_at)) + '</strong></div>' +
      '<div><span class="muted-text">Agregados sesión</span><strong>' + escapeHtml(formatActivityNumber(act.session_stubs)) + '</strong></div>' +
      '</div>';
  }

  function schoolLessonTitle(lessonId) {
    var data = global.PTSchoolData;
    if (data && typeof data.getLesson === 'function') {
      var lesson = data.getLesson(lessonId);
      if (lesson && lesson.title) return lesson.title;
    }
    return lessonId;
  }

  function schoolLevelFromXp(xp) {
    var per = (global.PTSchoolData && global.PTSchoolData.XP_PER_LEVEL) || 200;
    var level = Math.floor((Number(xp) || 0) / per) + 1;
    if (level < 1) level = 1;
    if (level > 30) level = 30;
    return { level: level, into: (Number(xp) || 0) % per, per: per, xp: Number(xp) || 0 };
  }

  function summarizeSchool(school) {
    var lessons = (school && school.lessons && typeof school.lessons === 'object') ? school.lessons : {};
    var ids = Object.keys(lessons);
    var passed = 0;
    var gold = 0;
    var perfect = 0;
    var attempts = 0;
    ids.forEach(function (id) {
      var L = lessons[id] || {};
      if (L.passed) passed += 1;
      if (L.gold) gold += 1;
      if (L.perfect) perfect += 1;
      attempts += Number(L.attempts) || 0;
    });
    return {
      xp: Number(school && school.xp) || 0,
      lessonCount: ids.length,
      passed: passed,
      gold: gold,
      perfect: perfect,
      attempts: attempts,
      updatedAt: school && school.updatedAt,
      lessons: lessons
    };
  }

  function renderSchoolSection(school) {
    var sum = summarizeSchool(school);
    if (!sum.lessonCount && sum.xp <= 0) {
      return '<p class="muted-text">Sin progreso en la Escuela de Póker.</p>';
    }
    var lv = schoolLevelFromXp(sum.xp);
    var rows = Object.keys(sum.lessons).sort(function (a, b) {
      var ta = sum.lessons[a] && sum.lessons[a].updatedAt ? String(sum.lessons[a].updatedAt) : '';
      var tb = sum.lessons[b] && sum.lessons[b].updatedAt ? String(sum.lessons[b].updatedAt) : '';
      if (tb !== ta) return tb.localeCompare(ta);
      return a.localeCompare(b);
    }).map(function (id) {
      var L = sum.lessons[id] || {};
      var flags = [];
      if (L.passed) flags.push('OK');
      if (L.gold) flags.push('Oro');
      if (L.perfect) flags.push('Perfect');
      return '<tr><td><strong>' + escapeHtml(id) + '</strong><br><span class="muted-text">' +
        escapeHtml(schoolLessonTitle(id)) + '</span></td>' +
        '<td>' + escapeHtml(L.bestPct != null ? L.bestPct + '%' : (L.bestScore != null ? Math.round(Number(L.bestScore) * 1000) / 10 + '%' : '—')) + '</td>' +
        '<td>' + escapeHtml(formatActivityNumber(L.attempts)) + '</td>' +
        '<td>' + escapeHtml(flags.length ? flags.join(' · ') : '—') + '</td>' +
        '<td class="muted-text">' + escapeHtml(formatDateTime(L.updatedAt) || '—') + '</td></tr>';
    }).join('');
    return '<div class="admin-detail-grid">' +
      '<div><span class="muted-text">Nivel</span><strong>Nv. ' + escapeHtml(lv.level) + '</strong></div>' +
      '<div><span class="muted-text">XP</span><strong>' + escapeHtml(formatActivityNumber(sum.xp)) +
      '</strong><span class="muted-text"> (' + escapeHtml(lv.into) + '/' + escapeHtml(lv.per) + ')</span></div>' +
      '<div><span class="muted-text">Ruta (aprobadas)</span><strong>' + escapeHtml(sum.passed) + '/' +
      escapeHtml(sum.lessonCount) + '</strong></div>' +
      '<div><span class="muted-text">Oro / Perfect</span><strong>' + escapeHtml(sum.gold) + ' / ' +
      escapeHtml(sum.perfect) + '</strong></div>' +
      '<div><span class="muted-text">Intentos</span><strong>' + escapeHtml(formatActivityNumber(sum.attempts)) + '</strong></div>' +
      '<div><span class="muted-text">Actualizado</span><strong>' + escapeHtml(formatActivityTs(sum.updatedAt)) + '</strong></div>' +
      '</div>' +
      (rows
        ? '<table class="admin-detail-table admin-school-table"><thead><tr><th>Lección</th><th>Mejor</th><th>Intentos</th><th>Estado</th><th>Última</th></tr></thead><tbody>' +
          rows + '</tbody></table>'
        : '');
  }

  function sortedCountEntries(mapObj) {
    var map = mapObj && typeof mapObj === 'object' ? mapObj : {};
    return Object.keys(map).map(function (k) {
      return { key: k, count: Number(map[k]) || 0 };
    }).filter(function (x) { return x.count > 0; })
      .sort(function (a, b) { return b.count - a.count || a.key.localeCompare(b.key); });
  }

  function renderCountBars(entries, labelFn) {
    if (!entries.length) return '<p class="muted-text">Sin datos.</p>';
    var max = entries[0].count || 1;
    return '<ul class="admin-usage-bars">' + entries.map(function (e) {
      var pct = Math.max(4, Math.round((e.count / max) * 100));
      var label = labelFn ? labelFn(e.key) : e.key;
      return '<li><div class="admin-usage-bar-row">' +
        '<span class="admin-usage-bar-label">' + escapeHtml(label) + '</span>' +
        '<span class="admin-usage-bar-count">' + escapeHtml(formatActivityNumber(e.count)) + '</span></div>' +
        '<div class="admin-usage-bar-track"><div class="admin-usage-bar-fill" style="width:' + pct + '%"></div></div></li>';
    }).join('') + '</ul>';
  }

  function renderFeatureUsageSection(fu) {
    var data = fu && typeof fu === 'object' ? fu : {};
    var events = sortedCountEntries(data.events);
    var tabs = sortedCountEntries(data.tabs);
    var scopes = sortedCountEntries(data.aiScopes);
    var modes = sortedCountEntries(data.aiModes);
    if (!events.length && !tabs.length && !scopes.length && !modes.length) {
      return '<p class="muted-text">Aún no hay contadores de uso sincronizados para este usuario.</p>';
    }
    return '<p class="muted-text admin-feature-usage-note">Estos contadores son analytics del cliente. ' +
      '«Consultas ForgeCoach» son usos reales; el saludo de inicio no consume cupo y se lista aparte. ' +
      'El cupo del listado y de «Cupo IA este mes» es el consumo facturable del mes.</p>' +
      '<div class="admin-usage-block"><h5>Eventos</h5>' +
      renderCountBars(events, function (k) { return FEATURE_EVENT_LABELS[k] || k; }) + '</div>' +
      '<div class="admin-usage-block"><h5>Pestañas</h5>' +
      renderCountBars(tabs, function (k) { return TAB_LABELS[k] || k; }) + '</div>' +
      '<div class="admin-usage-block"><h5>IA por ámbito</h5>' +
      renderCountBars(scopes) + '</div>' +
      '<div class="admin-usage-block"><h5>IA por modo</h5>' +
      renderCountBars(modes) + '</div>' +
      '<p class="muted-text">Actualizado: ' + escapeHtml(formatActivityTs(data.updatedAt)) + '</p>';
  }

  function renderTournamentUsageSection(tournaments) {
    if (global.PTManagerPanel && typeof PTManagerPanel.renderTournamentUsageSection === 'function') {
      return PTManagerPanel.renderTournamentUsageSection(tournaments);
    }
    var t = tournaments && typeof tournaments === 'object' ? tournaments : null;
    var wallet = (t && t.wallet) || {};
    var sum = (t && t.summary) || {};
    var played = Number(wallet.tournamentsPlayed) || Number(sum.n) || 0;
    if (!played && !t.has_active) {
      return '<p class="muted-text">Sin torneos IA sincronizados aún.</p>';
    }
    return '<div class="admin-detail-grid">' +
      '<div><span class="muted-text">Torneos jugados</span><strong>' +
      escapeHtml(formatActivityNumber(played)) + '</strong></div>' +
      '<div><span class="muted-text">Saldo Koins</span><strong>' +
      escapeHtml(formatActivityNumber(wallet.balance, 2)) + '</strong></div>' +
      '</div>';
  }

  function currentKoinsBalance(tournaments) {
    var wallet = (tournaments && tournaments.wallet) || {};
    var bal = Number(wallet.balance);
    return isFinite(bal) ? bal : 0;
  }

  function renderKoinsEditForm(profile, tournaments, communities) {
    var uid = profile && profile.user_id;
    if (!uid || uid === DEMO_USER_ID) {
      return '<p class="muted-text">No se pueden editar Koins del usuario demo.</p>';
    }
    var bal = currentKoinsBalance(tournaments);
    var opts = [{ id: 'pokerforge', label: 'PokerForge' }];
    var seen = { pokerforge: true };
    (communities || []).forEach(function (c) {
      var id = (c && (c.community_id || c.id)) || '';
      if (!id || seen[id] || c.status === 'revoked') return;
      seen[id] = true;
      opts.push({ id: id, label: id === 'mttlab' ? 'MTT LAB' : id });
    });
    if (!seen.mttlab) opts.push({ id: 'mttlab', label: 'MTT LAB' });
    return '<p class="muted-text">Saldo actual (PokerForge): <strong>' + escapeHtml(formatActivityNumber(bal, 2)) + '</strong> Koins</p>' +
      '<div class="admin-gift-bonus-form admin-koins-edit-form">' +
      '<label class="admin-gift-label" for="admin-koins-community">Comunidad</label>' +
      '<select id="admin-koins-community" class="admin-gift-input">' +
      opts.map(function (o) {
        return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.label) + '</option>';
      }).join('') +
      '</select>' +
      '<label class="admin-gift-label" for="admin-koins-mode">Acción</label>' +
      '<select id="admin-koins-mode" class="admin-gift-input">' +
      '<option value="set" selected>Establecer saldo</option>' +
      '<option value="add">Sumar / restar</option>' +
      '</select>' +
      '<label class="admin-gift-label" for="admin-koins-amount">Cantidad</label>' +
      '<input type="number" id="admin-koins-amount" class="admin-gift-input" min="-1000000" max="1000000" step="0.01" value="' +
      escapeHtml(String(bal)) + '" inputmode="decimal">' +
      '<button type="button" class="btn btn-primary btn-sm" data-admin-set-koins data-user-id="' +
      escapeHtml(uid) + '">Guardar Koins</button>' +
      '</div>' +
      '<p class="muted-text admin-gift-note">Actualiza el wallet en la nube y el ranking de la comunidad. ' +
      'En «Sumar / restar» usa números negativos para restar. Se notifica al usuario en Contacto.</p>';
  }

  function renderUserDetail(data) {
    var host = $('#admin-user-detail');
    if (!host || !data) return;
    var p = data.profile || {};
    var q = data.quotas || {};
    var ledger = data.bonus_ledger || [];
    var usage = data.ai_usage_month || [];
    var threads = data.contact_threads || [];
    var promos = data.promotion_redemptions || [];
    var activity = data.activity || null;
    var school = (activity && activity.school) || data.school || null;
    var featureUsage = (activity && activity.feature_usage) || data.feature_usage || null;
    var tournaments = data.tournaments || null;
    var cached = adminUsersCache.filter(function (x) { return x && x.user_id === p.user_id; })[0];
    var pushOn = userHasPush(cached);
    var pushDevices = cached ? (Number(cached.push_devices) || 0) : 0;
    var pushSummary = pushOn
      ? ('Activado' + (pushDevices > 1 ? (' · ' + pushDevices + ' dispositivos') : (pushDevices === 1 ? ' · 1 dispositivo' : '')))
      : 'No activado';

    var quotaHtml;
    if (q.unlimited) {
      quotaHtml = '<p><strong>Consultas IA:</strong> ilimitadas (admin)</p>' +
        '<p class="muted-text">Usadas este mes: ' + (Number(q.used_month) || 0) + '</p>';
    } else {
      quotaHtml =
        '<div class="admin-detail-grid">' +
        '<div><span class="muted-text">Incluidas plan</span><strong>' + (q.plan_limit != null ? q.plan_limit : '—') + '/mes</strong></div>' +
        '<div><span class="muted-text">Usadas mes</span><strong>' + (Number(q.used_month) || 0) + '</strong></div>' +
        '<div><span class="muted-text">Restan plan</span><strong>' + (q.plan_remaining != null ? q.plan_remaining : '—') + '</strong></div>' +
        '<div><span class="muted-text">Bono activo</span><strong>' + (Number(q.bonus_balance) || 0) + '</strong></div>' +
        '<div><span class="muted-text">Total disponible</span><strong>' + (q.total_remaining != null ? q.total_remaining : '—') + '</strong></div>' +
        '<div><span class="muted-text">Bono caduca</span><strong>' + (q.bonus_expires_at ? formatPeriodLabel(q.bonus_expires_at) : '—') + '</strong></div>' +
        '</div>';
    }

    var promoHtml = promos.length
      ? '<ul class="admin-detail-list">' + promos.map(function (pr) {
        return '<li><span><strong>Registro con promo ' + escapeHtml(pr.code || '—') + '</strong>' +
          (pr.promotion_title ? '<span class="muted-text"> · ' + escapeHtml(pr.promotion_title) + '</span>' : '') +
          '<br><span class="muted-text">' + escapeHtml(promoGiftSummary(pr)) + '</span></span>' +
          '<span class="muted-text">' + escapeHtml(formatDateTime(pr.redeemed_at)) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="muted-text">Sin promoción de registro.</p>';

    var ledgerHtml = ledger.length
      ? '<table class="admin-detail-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Pack</th><th>Δ</th><th>Saldo</th></tr></thead><tbody>' +
        ledger.map(function (l) {
          return '<tr><td>' + escapeHtml(formatDateTime(l.created_at)) + '</td>' +
            '<td>' + escapeHtml(ledgerReasonLabel(l.reason)) + '</td>' +
            '<td>' + escapeHtml(ledgerPackLabel(l.pack_code, l.reason)) + '</td>' +
            '<td>' + (l.delta > 0 ? '+' : '') + escapeHtml(l.delta) + '</td>' +
            '<td>' + escapeHtml(l.balance_after) + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '<p class="muted-text">Sin movimientos de bono.</p>';

    var usageHtml = usage.length
      ? '<ul class="admin-detail-list">' + usage.map(function (u) {
        return '<li><span>' + escapeHtml(u.mode || 'report') + '</span><span class="muted-text">' + escapeHtml(formatDateTime(u.created_at)) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="muted-text">Sin consultas IA este mes.</p>';

    var threadsHtml = threads.length
      ? '<ul class="admin-detail-list">' + threads.map(function (t) {
        return '<li><button type="button" class="admin-thread-link" data-admin-user-thread="' + escapeHtml(t.id) + '">' +
          escapeHtml(t.subject) + '</button>' +
          '<span class="muted-text">' + escapeHtml(formatRelative(t.last_message_at)) +
          (t.admin_unread_count > 0 ? ' · sin leer' : '') + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="muted-text">Sin conversaciones de contacto.</p>';

    var promoHeadNote = promos.length
      ? '<p class="admin-detail-promo-note">Registro con promo <strong>' + escapeHtml(promos[0].code || '—') + '</strong></p>'
      : '';

    var canMessage = canAdminMessageUser(p.user_id);
    var sendBlockedNote = !canMessage
      ? (p.user_id === DEMO_USER_ID
        ? 'El usuario demo no recibe mensajes de Contacto.'
        : 'No puedes enviarte un mensaje a ti mismo.')
      : '';

    var cms = userCommunities(cached || { communities: data.communities });
    if (!cms.length && data.communities) cms = userCommunities({ communities: data.communities });
    var hasMtt = cms.some(function (c) { return (c.community_id || c.id) === 'mttlab' && c.status !== 'revoked'; });
    var isMttMgr = cms.some(function (c) { return (c.community_id || c.id) === 'mttlab' && c.role === 'manager' && c.status !== 'revoked'; });
    var communityControlsHtml =
      '<section class="admin-detail-block"><h4>Comunidades</h4>' +
      '<p class="muted-text">MTT LAB: ' + (hasMtt ? (isMttMgr ? 'Manager' : 'Miembro') : 'Sin acceso') + '</p>' +
      '<div class="admin-detail-actions admin-community-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-admin-community-action="grant" data-community="mttlab">Dar acceso MTT LAB</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-admin-community-action="manager" data-community="mttlab">' +
      (isMttMgr ? 'Quitar manager' : 'Hacer manager') + '</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-admin-community-action="revoke" data-community="mttlab">Revocar acceso</button>' +
      '</div></section>';

    var sendFormHtml = canMessage
      ? '<form id="admin-detail-send-form" class="admin-detail-send-form">' +
        '<label for="admin-detail-send-subject">Asunto</label>' +
        '<input type="text" id="admin-detail-send-subject" name="subject" maxlength="200" required placeholder="Ej.: Aviso sobre tu cuenta" />' +
        '<label for="admin-detail-send-body">Mensaje</label>' +
        '<textarea id="admin-detail-send-body" name="body" rows="4" maxlength="3000" required placeholder="Escribe el mensaje para este usuario…"></textarea>' +
        '<div class="admin-detail-send-actions">' +
        '<button type="submit" class="btn btn-primary btn-sm">Enviar mensaje</button>' +
        '<span id="admin-detail-send-status" class="admin-detail-send-status"></span>' +
        '</div>' +
        '<p class="muted-text admin-gift-note">El usuario lo verá en Contacto y recibirá un aviso si tiene push activo.</p>' +
        '</form>'
      : '<p class="muted-text">' + escapeHtml(sendBlockedNote) + '</p>';

    host.innerHTML =
      '<div class="admin-detail-head">' +
      '<div><h3>' + escapeHtml(p.name || p.email || p.user_id) + '</h3>' +
      '<p class="muted-text">' + escapeHtml(p.email || '') + ' · Plan ' + escapeHtml(p.plan || 'free') +
      (p.is_admin ? ' · Admin' : '') +
      (p.is_founder_study ? ' · FOUNDER Study' : '') +
      (p.is_founder_coach ? ' · FOUNDER Coach' : '') + '</p>' +
      promoHeadNote +
      communityControlsHtml +
      '</div>' +
      '<div class="admin-detail-head-actions">' +
      (canMessage
        ? '<button type="button" class="btn btn-primary btn-sm" id="admin-detail-send-msg">Enviar mensaje</button>'
        : '') +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-detail-close">Cerrar</button>' +
      '</div>' +
      '</div>' +
      '<div class="admin-detail-section"><h4>FOUNDER</h4>' +
      '<label class="admin-toggle admin-detail-founder">' +
      '<input type="checkbox" id="admin-detail-is-founder-study"' + (p.is_founder_study ? ' checked' : '') + ' />' +
      '<span>Founder Study = Sí</span></label>' +
      '<label class="admin-toggle admin-detail-founder">' +
      '<input type="checkbox" id="admin-detail-is-founder-coach"' + (p.is_founder_coach ? ' checked' : '') + ' />' +
      '<span>Founder Coach = Sí</span></label>' +
      '<p class="muted-text">' +
      (p.founder_study_requested_at
        ? ('Solicitud Study: ' + escapeHtml(formatDateTime(p.founder_study_requested_at)) + '. ')
        : 'Sin solicitud Study. ') +
      (p.founder_coach_requested_at
        ? ('Solicitud Coach: ' + escapeHtml(formatDateTime(p.founder_coach_requested_at)) + '.')
        : 'Sin solicitud Coach.') +
      '</p></div>' +
      '<div class="admin-detail-section" id="admin-detail-send">' +
      '<h4>Enviar mensaje</h4>' + sendFormHtml + '</div>' +
      '<div class="admin-detail-section"><h4>Actividad de juego</h4>' + renderActivitySection(activity) + '</div>' +
      '<div class="admin-detail-section"><h4>Escuela de Póker</h4>' + renderSchoolSection(school) + '</div>' +
      '<div class="admin-detail-section"><h4>Torneos</h4>' + renderTournamentUsageSection(tournaments) + '</div>' +
      '<div class="admin-detail-section"><h4>Editar Koins</h4>' + renderKoinsEditForm(p, tournaments, cms) + '</div>' +
      '<div class="admin-detail-section"><h4>Uso de funciones</h4>' + renderFeatureUsageSection(featureUsage) + '</div>' +
      '<div class="admin-detail-section"><h4>Promoción de registro</h4>' + promoHtml + '</div>' +
      '<div class="admin-detail-section"><h4>Cupo IA este mes</h4>' + quotaHtml + '</div>' +
      '<div class="admin-detail-section"><h4>Regalar bono IA</h4>' +
      '<div class="admin-gift-bonus-form">' +
      '<label class="admin-gift-label" for="admin-gift-credits">Consultas a regalar</label>' +
      '<input type="number" id="admin-gift-credits" class="admin-gift-input" min="1" max="500" value="10" inputmode="numeric">' +
      '<button type="button" class="btn btn-primary btn-sm" data-admin-gift-bonus data-user-id="' + escapeHtml(p.user_id) + '">Regalar bono</button>' +
      '</div>' +
      '<p class="muted-text admin-gift-note">Se acredita como <strong>Bono de regalo</strong> y se notifica al usuario en Contacto.</p>' +
      '</div>' +
      '<div class="admin-detail-section"><h4>Notificaciones push</h4>' +
      '<p><strong>' + escapeHtml(pushSummary) + '</strong></p>' +
      '<p class="muted-text">Envía un aviso de prueba a los dispositivos con push activo de este usuario.</p>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-push-test" data-user-id="' +
      escapeHtml(p.user_id) + '">Enviar push de prueba</button>' +
      '<p class="muted-text" id="admin-push-status"></p>' +
      '</div>' +
      '<div class="admin-detail-section"><h4>Transacciones de bono</h4>' + ledgerHtml + '</div>' +
      '<div class="admin-detail-section"><h4>Consultas IA (mes actual)</h4>' + usageHtml + '</div>' +
      '<div class="admin-detail-section"><h4>Mensajes con el usuario</h4>' + threadsHtml + '</div>';

    host.classList.remove('hidden');
    var closeBtn = $('#admin-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', closeUserDetail);
    var sendHeadBtn = $('#admin-detail-send-msg');
    if (sendHeadBtn) {
      sendHeadBtn.addEventListener('click', function () {
        var section = $('#admin-detail-send');
        var subjectEl = $('#admin-detail-send-subject');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (subjectEl) subjectEl.focus();
      });
    }
        host.querySelectorAll('[data-admin-community-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-admin-community-action');
        var cid = btn.getAttribute('data-community') || 'mttlab';
        var uid = p.user_id;
        if (action === 'grant') setCommunityMember(uid, cid, 'member', 'active');
        else if (action === 'revoke') setCommunityMember(uid, cid, 'member', 'revoked');
        else if (action === 'manager') {
          var makeMgr = (btn.textContent || '').toLowerCase().indexOf('quitar') < 0;
          setCommunityMember(uid, cid, makeMgr ? 'manager' : 'member', 'active');
        }
      });
    });
    var sendForm = $('#admin-detail-send-form');
    if (sendForm) {
      sendForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (!requireAdminAccess()) return;
        var subject = (sendForm.subject.value || '').trim();
        var body = (sendForm.body.value || '').trim();
        if (subject.length < 3 || body.length < 5) {
          alert('Completa un asunto y un mensaje válidos.');
          return;
        }
        var btn = sendForm.querySelector('button[type="submit"]');
        var status = $('#admin-detail-send-status');
        if (btn) btn.disabled = true;
        if (status) status.textContent = 'Enviando…';
        var res = await sendAdminMessage(subject, body, {
          targetMode: 'single',
          userIds: [p.user_id]
        });
        if (btn) btn.disabled = false;
        if (!requireAdminAccess()) return;
        if (res.error) {
          if (handleAdminRpcError(res.error)) return;
          if (status) status.textContent = '';
          alert('Error: ' + (res.error.message || 'no enviado'));
          return;
        }
        notifyAdminMessagePush({
          userIds: [p.user_id],
          subject: subject,
          body: body
        });
        await openUserDetail(p.user_id);
        loadAdminMessagesBadge();
      });
    }
    var founderStudyChk = $('#admin-detail-is-founder-study');
    if (founderStudyChk) {
      founderStudyChk.addEventListener('change', function () {
        updateUser(p.user_id, { is_founder_study: founderStudyChk.checked }).then(function () {
          openUserDetail(p.user_id);
        });
      });
    }
    var founderCoachChk = $('#admin-detail-is-founder-coach');
    if (founderCoachChk) {
      founderCoachChk.addEventListener('change', function () {
        updateUser(p.user_id, { is_founder_coach: founderCoachChk.checked }).then(function () {
          openUserDetail(p.user_id);
        });
      });
    }
    host.querySelectorAll('[data-admin-user-thread]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var threadId = btn.getAttribute('data-admin-user-thread');
        var thread = (data.contact_threads || []).find(function (t) { return t.id === threadId; });
        showAdminMessages(true, {
          userId: thread && thread.user_id,
          threadId: threadId
        });
      });
    });
    var giftBtn = host.querySelector('[data-admin-gift-bonus]');
    if (giftBtn) {
      giftBtn.addEventListener('click', function () {
        var uid = giftBtn.getAttribute('data-user-id');
        var input = host.querySelector('#admin-gift-credits');
        var credits = input ? parseInt(input.value, 10) : 0;
        giftAiBonus(uid, credits);
      });
    }
    var koinsBtn = host.querySelector('[data-admin-set-koins]');
    if (koinsBtn) {
      koinsBtn.addEventListener('click', function () {
        var uid = koinsBtn.getAttribute('data-user-id');
        var communityEl = host.querySelector('#admin-koins-community');
        var modeEl = host.querySelector('#admin-koins-mode');
        var amountEl = host.querySelector('#admin-koins-amount');
        var communityId = communityEl ? String(communityEl.value || 'pokerforge') : 'pokerforge';
        var mode = modeEl ? String(modeEl.value || 'set') : 'set';
        var amount = amountEl ? Number(amountEl.value) : NaN;
        setUserKoins(uid, amount, communityId, mode);
      });
    }
    var pushBtn = host.querySelector('#admin-push-test');
    if (pushBtn) {
      pushBtn.addEventListener('click', function () {
        adminSendPush(pushBtn.getAttribute('data-user-id'));
      });
    }
  }

  function notifyAdminMessagePush(opts) {
    if (!global.PTPush || typeof global.PTPush.notifyUsers !== 'function') return;
    opts = opts || {};
    var title = String(opts.subject || 'PokerForgeAI').slice(0, 80);
    var preview = String(opts.body || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!preview) preview = 'Tienes un mensaje nuevo.';
    global.PTPush.notifyUsers({
      allUsers: !!opts.allUsers,
      userIds: opts.userIds || [],
      title: title,
      body: preview,
      url: './?source=push&tab=contact',
      tag: 'admin-msg',
      campaign: 'admin_message'
    }).catch(function () { /* el mensaje ya se envió; el push no debe bloquear */ });
  }

  async function adminSendPush(userId) {
    if (!requireAdminAccess()) return;
    if (!userId) return;
    var status = $('#admin-push-status');
    if (!global.PTPush || !global.PTPush.adminSend) {
      alert('Push no disponible en este entorno.');
      return;
    }
    if (!window.confirm('¿Enviar una notificación de prueba a este usuario?')) return;
    if (status) status.textContent = 'Enviando…';
    try {
      var res = await global.PTPush.adminSend(userId, {
        title: 'PokerForgeAI',
        body: 'Aviso de prueba del administrador.'
      });
      var msg = 'Enviadas: ' + (res && res.sent != null ? res.sent : 0);
      if (res && res.gone) msg += ' · endpoints muertos: ' + res.gone;
      if (status) status.textContent = msg;
    } catch (e) {
      if (status) status.textContent = (e && e.message) || 'No se pudo enviar.';
    }
  }

  async function giftAiBonus(userId, credits) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c || !userId) return;
    if (!credits || credits < 1 || credits > 500) {
      alert('Indica entre 1 y 500 consultas.');
      return;
    }
    if (!window.confirm('¿Regalar ' + credits + ' consultas IA a este usuario? Se enviará un aviso en Contacto.')) {
      return;
    }
    var res = await c.rpc('pt_admin_gift_ai_bonus', {
      p_user_id: userId,
      p_credits: credits,
      p_send_message: true
    });
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error)) return;
      alert(res.error.message || 'No se pudo regalar el bono.');
      return;
    }
    notifyAdminMessagePush({
      userIds: [userId],
      subject: 'Bono de consultas IA',
      body: 'Te hemos regalado consultas IA. Ábrelo en Contacto.'
    });
    alert('Bono regalado. Saldo de bono: ' + (res.data && res.data.balance != null ? res.data.balance : '—'));
    await loadUsers();
    await openUserDetail(userId);
    loadAdminMessagesBadge();
  }

  async function setUserKoins(userId, amount, communityId, mode) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c || !userId) return;
    if (userId === DEMO_USER_ID) {
      alert('No se pueden editar Koins del usuario demo.');
      return;
    }
    mode = String(mode || 'set').toLowerCase();
    communityId = String(communityId || 'pokerforge').toLowerCase().trim() || 'pokerforge';
    if (mode !== 'set' && mode !== 'add') {
      alert('Acción no válida.');
      return;
    }
    if (!isFinite(amount)) {
      alert('Indica una cantidad numérica válida.');
      return;
    }
    if (mode === 'set' && (amount < 0 || amount > 1000000)) {
      alert('El saldo debe estar entre 0 y 1.000.000.');
      return;
    }
    if (mode === 'add' && (amount === 0 || amount < -1000000 || amount > 1000000)) {
      alert('En sumar/restar indica un ajuste distinto de 0 (máx. ±1.000.000).');
      return;
    }
    var actionLabel = mode === 'set'
      ? ('establecer el saldo en ' + amount + ' Koins')
      : ((amount > 0 ? 'sumar ' : 'restar ') + Math.abs(amount) + ' Koins');
    if (!window.confirm(
      '¿Confirmas ' + actionLabel + ' en ' + communityId + '? Se actualizará el ranking y se avisará al usuario en Contacto.'
    )) {
      return;
    }
    var res = await c.rpc('pt_admin_set_user_koins', {
      p_user_id: userId,
      p_koins: amount,
      p_community_id: communityId,
      p_mode: mode,
      p_notify: true
    });
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error)) return;
      alert(res.error.message || 'No se pudieron actualizar los Koins.');
      return;
    }
    var data = res.data || {};
    if (data.notified) {
      notifyAdminMessagePush({
        userIds: [userId],
        subject: 'Ajuste de Koins',
        body: 'Un administrador ha actualizado tu saldo de Koins. Ábrelo en Contacto.'
      });
    }
    alert(
      'Koins actualizados (' + (data.community_id || communityId) + '). ' +
      'Anterior: ' + (data.previous_balance != null ? data.previous_balance : '—') +
      ' · Nuevo: ' + (data.balance != null ? data.balance : '—')
    );
    await loadUsers();
    await openUserDetail(userId);
    loadAdminMessagesBadge();
  }

  function closeUserDetail() {
    adminDetailUserId = null;
    var host = $('#admin-user-detail');
    if (host) {
      host.classList.add('hidden');
      host.innerHTML = '';
    }
    var tbody = $('#admin-users-body');
    if (tbody) {
      tbody.querySelectorAll('.admin-row-active').forEach(function (r) {
        r.classList.remove('admin-row-active');
      });
    }
  }


  async function setCommunityMember(userId, communityId, role, status) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c) return;
    var res = await c.rpc('pt_admin_set_community_member', {
      p_user_id: userId,
      p_community_id: communityId,
      p_role: role,
      p_status: status
    });
    if (res.error) {
      alert(res.error.message || 'Error comunidad');
      return;
    }
    await loadUsers();
    await openUserDetail(userId);
  }

  async function openUserDetail(userId) {
    if (!requireAdminAccess()) return;
    var c = client();
    var host = $('#admin-user-detail');
    if (!c || !host || !userId) return;
    adminDetailUserId = userId;
    host.classList.remove('hidden');
    host.innerHTML = '<div class="contact-loading"><div class="play-boot-spinner"></div><p class="muted-text">Cargando usuario…</p></div>';
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var tbody = $('#admin-users-body');
    if (tbody) {
      tbody.querySelectorAll('.admin-row-active').forEach(function (r) { r.classList.remove('admin-row-active'); });
      var row = tbody.querySelector('tr[data-user-id="' + CSS.escape(userId) + '"]');
      if (row) row.classList.add('admin-row-active');
    }
    var res = await c.rpc('pt_admin_user_detail', { p_user_id: userId });
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error, host)) return;
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    renderUserDetail(res.data);
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
        var field = chk.getAttribute('data-field');
        if (field === 'is_founder_study') {
          updateUser(uid, { is_founder_study: chk.checked });
          return;
        }
        if (field === 'is_founder_coach') {
          updateUser(uid, { is_founder_coach: chk.checked });
          return;
        }
        if (field === 'is_founder') {
          updateUser(uid, { is_founder_study: chk.checked });
          return;
        }
        updateUser(uid, { is_admin: chk.checked });
      };
    });
    tbody.querySelectorAll('.admin-period-input').forEach(function (inp) {
      inp.onchange = function () {
        var uid = inp.dataset.userId;
        if (!uid || !inp.value) return;
        var endIso = new Date(inp.value + 'T23:59:59.999Z').toISOString();
        updateUser(uid, { subscription_period_end: endIso });
      };
    });
  }

  function confirmAdminChange(message) {
    return window.confirm(message);
  }

  function patchUserInCache(userId, patch, serverRow) {
    var idx = -1;
    for (var i = 0; i < adminUsersCache.length; i++) {
      if (adminUsersCache[i] && adminUsersCache[i].user_id === userId) { idx = i; break; }
    }
    if (idx < 0) return;
    var row = adminUsersCache[idx];
    var next = {};
    for (var k in row) {
      if (Object.prototype.hasOwnProperty.call(row, k)) next[k] = row[k];
    }
    if (patch.plan !== undefined) next.plan = patch.plan;
    if (patch.is_admin !== undefined) next.is_admin = patch.is_admin;
    if (patch.is_founder_study !== undefined) next.is_founder_study = patch.is_founder_study;
    if (patch.is_founder_coach !== undefined) next.is_founder_coach = patch.is_founder_coach;
    if (patch.subscription_period_end !== undefined) next.subscription_period_end = patch.subscription_period_end;
    if (serverRow) {
      if (serverRow.plan != null) next.plan = serverRow.plan;
      if (serverRow.is_admin != null) next.is_admin = serverRow.is_admin;
      if (serverRow.is_founder_study != null) next.is_founder_study = serverRow.is_founder_study;
      if (serverRow.is_founder_coach != null) next.is_founder_coach = serverRow.is_founder_coach;
      if (serverRow.subscription_period_end !== undefined) next.subscription_period_end = serverRow.subscription_period_end;
      if (serverRow.subscription_status != null) next.subscription_status = serverRow.subscription_status;
      if (serverRow.is_founder != null) next.is_founder = serverRow.is_founder;
    }
    if (next.is_founder_study || next.is_founder_coach) next.is_founder = true;
    adminUsersCache[idx] = next;
  }

  async function updateUser(userId, patch) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c) return;

    var current = null;
    for (var i = 0; i < adminUsersCache.length; i++) {
      if (adminUsersCache[i] && adminUsersCache[i].user_id === userId) { current = adminUsersCache[i]; break; }
    }

    if (patch.plan !== undefined) {
      var planLabel = patch.plan === 'pro' ? 'Study' : (patch.plan === 'premium' ? 'Coach' : 'Gratis');
      if (!confirmAdminChange('¿Cambiar el plan de este usuario a ' + planLabel + '?')) {
        renderUsersTable();
        return;
      }
      if ((patch.plan === 'pro' || patch.plan === 'premium') &&
          !patch.subscription_period_end &&
          !(current && current.subscription_period_end)) {
        var months = window.prompt('Meses de acceso (1–24). Deja vacío solo si quieres plan sin caducidad (no recomendado):', '1');
        if (months === null) { renderUsersTable(); return; }
        months = String(months).trim();
        if (months === '') {
          if (!confirmAdminChange('Vas a dejar un plan de pago SIN fecha de fin. ¿Continuar?')) {
            renderUsersTable();
            return;
          }
        } else {
          var n = parseInt(months, 10);
          if (!(n >= 1 && n <= 24)) {
            alert('Indica un número de meses entre 1 y 24.');
            renderUsersTable();
            return;
          }
          var end = new Date();
          end.setUTCMonth(end.getUTCMonth() + n);
          end.setUTCHours(23, 59, 59, 999);
          patch.subscription_period_end = end.toISOString();
        }
      }
    }
    if (patch.is_admin !== undefined) {
      if (!confirmAdminChange(patch.is_admin
        ? '¿Conceder permisos de administrador a este usuario?'
        : '¿Quitar permisos de administrador a este usuario?')) {
        renderUsersTable();
        return;
      }
    }
    if (patch.is_founder_study !== undefined) {
      if (!confirmAdminChange(patch.is_founder_study
        ? '¿Marcar FOUNDER Study?'
        : '¿Quitar FOUNDER Study?')) {
        renderUsersTable();
        return;
      }
    }
    if (patch.is_founder_coach !== undefined) {
      if (!confirmAdminChange(patch.is_founder_coach
        ? '¿Marcar FOUNDER Coach?'
        : '¿Quitar FOUNDER Coach?')) {
        renderUsersTable();
        return;
      }
    }

    var args = { p_user_id: userId };
    if (patch.plan !== undefined) args.p_plan = patch.plan;
    if (patch.is_admin !== undefined) args.p_is_admin = patch.is_admin;
    if (patch.is_founder !== undefined) args.p_is_founder = patch.is_founder;
    if (patch.is_founder_study !== undefined) args.p_is_founder_study = patch.is_founder_study;
    if (patch.is_founder_coach !== undefined) args.p_is_founder_coach = patch.is_founder_coach;
    if (patch.subscription_period_end !== undefined) args.p_subscription_period_end = patch.subscription_period_end;
    var res = await c.rpc('pt_admin_update_user', args);
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error)) return;
      alert('Error al guardar: ' + res.error.message);
      await refresh();
      return;
    }
    if (patch.is_admin !== undefined) {
      var me = currentUser();
      if (me && me.sub === userId) {
        me.isAdmin = patch.is_admin;
        if (global.PTProfile) global.PTProfile.applyProfileToUser(me, { is_admin: patch.is_admin });
        if (!patch.is_admin) {
          lockdownAdmin();
          if (global.goToTab) global.goToTab('home');
          return;
        }
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
        global.dispatchEvent(new CustomEvent('pt-plan-changed', { detail: { userId: userId, plan: res.data && res.data.plan } }));
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
    patchUserInCache(userId, patch, res.data);
    renderUsersTable();
    renderAdminStats();
    if (adminDetailUserId === userId) {
      openUserDetail(userId);
    }
  }

  function openInviteModal() {
    if (!requireAdminAccess()) return;
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
    if (!requireAdminAccess()) return;
    /* Solo si localStorage ya no admite escrituras pequeñas (cuota llena). */
    try {
      if (global.localStorage && global.localStorage.setItem) {
        var probe = 'pt_admin_quota_probe';
        global.localStorage.setItem(probe, '1');
        global.localStorage.removeItem(probe);
      }
    } catch (eProbe) {
      try {
        if (global.Store && typeof global.Store.freeStorageSpace === 'function') {
          global.Store.freeStorageSpace({ aggressive: true });
        }
      } catch (eFree) { /* noop */ }
    }
    setAdminLoading(true, 'Actualizando usuarios…');
    var usagePanel = $('#admin-usage-panel');
    var usageOpen = usagePanel && !usagePanel.classList.contains('hidden');
    await Promise.all([loadStats(), loadUsers()].concat(usageOpen ? [loadUsageStats()] : []));
    if (!hasAdminAccess()) return;
    loaded = true;
  }

  function getAutoStripeSyncTs() {
    try {
      if (!global.localStorage || !global.localStorage.getItem) return 0;
      var raw = global.localStorage.getItem(AUTO_STRIPE_SYNC_KEY);
      var n = Number(raw);
      return isNaN(n) || n <= 0 ? 0 : n;
    } catch (_) {
      return 0;
    }
  }

  function markAutoStripeSyncTs() {
    try {
      if (!global.localStorage || !global.localStorage.setItem) return;
      global.localStorage.setItem(AUTO_STRIPE_SYNC_KEY, String(Date.now()));
    } catch (_) {
      /* localStorage can be blocked in private contexts */
    }
  }

  function shouldAutoSyncStripePayments() {
    var last = getAutoStripeSyncTs();
    return !last || (Date.now() - last) >= AUTO_STRIPE_SYNC_COOLDOWN_MS;
  }

  function scheduleAutoStripeSync() {
    if (!hasAdminAccess() || syncRunning || autoStripeSyncTimer) return;
    if (!shouldAutoSyncStripePayments()) return;
    autoStripeSyncTimer = global.setTimeout(function () {
      autoStripeSyncTimer = null;
      if (!hasAdminAccess() || syncRunning || !shouldAutoSyncStripePayments()) return;
      syncStripePayments({ auto: true });
    }, 0);
  }

  function render() {
    if (!requireAdminAccess()) return;
    loadAdminMessagesBadge();
    refresh().then(function () {
      if (hasAdminAccess()) scheduleAutoStripeSync();
    }).catch(function () {
      setAdminLoading(false);
    });
  }

  function initForUser(user) {
    if (!user || !user.isAdmin || demoActive()) {
      lockdownAdmin();
      return;
    }
    setAdminVisible(true);
  }

  async function syncStripeBonuses(opts) {
    if (!requireAdminAccess()) return;
    opts = opts || {};
    var auto = !!opts.auto;
    var btn = $('#admin-sync-bonuses');
    var status = $('#admin-sync-status');
    var billing = global.PTBilling;
    if (!billing || !billing.syncBonusPurchases || !billing.enabled || !billing.enabled()) {
      if (!auto) alert('Sincronización de bonos no disponible.');
      return;
    }
    if (syncRunning) return;
    syncRunning = true;
    if (btn) btn.disabled = true;
    if (status && !auto) status.textContent = 'Sincronizando bonos…';
    try {
      var data = await billing.syncBonusPurchases({ all: true });
      if (!requireAdminAccess()) return;
      if (status) {
        var msg = 'Bonos: +' + (data.credited || 0) + ' acreditados';
        if (data.errors && data.errors.length) msg += ' · ' + data.errors.length + ' error(es)';
        status.textContent = msg;
      }
      await loadUsers();
      if (adminDetailUserId) await openUserDetail(adminDetailUserId);
    } catch (e) {
      if (status && !auto) status.textContent = 'Bonos: error';
      if (!auto) alert(e.message || 'No se pudieron sincronizar los bonos.');
    } finally {
      syncRunning = false;
      if (btn) btn.disabled = false;
    }
  }

  async function syncStripePayments(opts) {
    if (!requireAdminAccess()) return;
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
    try {
      if (auto) markAutoStripeSyncTs();
      var data = await billing.syncPayments();
      if (!requireAdminAccess()) return;
      if (status) {
        status.textContent = billing.formatSyncMessage
          ? billing.formatSyncMessage(data)
          : ('Actualizados: ' + (data.updated || 0));
      }
      if (auto) await loadUsers();
      else {
        markAutoStripeSyncTs();
        setAdminLoading(true, 'Actualizando usuarios…');
        await refresh();
      }
    } catch (e) {
      if (status) status.textContent = auto ? 'Pagos: sin sincronizar' : '';
      if (!loaded) setAdminLoading(false);
      if (!auto) alert(e.message || 'No se pudo sincronizar con Stripe.');
    } finally {
      syncRunning = false;
      if (btn) btn.disabled = false;
    }
  }

  async function loadAdminMessagesBadge() {
    if (!hasAdminAccess()) {
      var badgeHidden = $('#admin-messages-badge');
      if (badgeHidden) {
        badgeHidden.textContent = '0';
        badgeHidden.classList.add('hidden');
      }
      return;
    }
    var c = client();
    var badge = $('#admin-messages-badge');
    if (!c || !badge) return;
    var res = await c.rpc('pt_admin_contact_unread_count');
    if (!hasAdminAccess()) {
      badge.textContent = '0';
      badge.classList.add('hidden');
      return;
    }
    if (res.error) {
      if (handleAdminRpcError(res.error)) return;
      badge.textContent = '0';
      badge.classList.add('hidden');
      return;
    }
    var n = Number(res.data) || 0;
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

  async function sendAdminMessage(subject, body, opts) {
    if (!requireAdminAccess()) return { error: { message: 'forbidden' } };
    var c = client();
    if (!c) return { error: { message: 'unavailable' } };
    opts = opts || {};
    var mode = opts.targetMode || adminMessageMode;
    var userIds = opts.userIds !== undefined ? opts.userIds : adminMessageRecipients;
    var payload = {
      p_subject: subject,
      p_body: body,
      p_target_mode: mode,
      p_user_ids: mode === 'all' ? null : userIds
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
      var pushAll = adminMessageMode === 'all';
      var pushIds = adminMessageRecipients.slice();
      var res = await sendAdminMessage(subject, body);
      if (btn) btn.disabled = false;
      if (res.error) {
        setAdminComposeStatus('');
        alert('Error: ' + (res.error.message || 'no enviado'));
        return;
      }
      notifyAdminMessagePush({
        allUsers: pushAll,
        userIds: pushIds,
        subject: subject,
        body: body
      });
      form.reset();
      adminMessageSubject = '';
      adminMessageBody = '';
      adminMessageFilter = '';
      if (adminMessageMode !== 'all') adminMessageRecipients = [];
      setAdminComposeStatus('Mensaje enviado a ' + ((res.data && res.data.sent_count) || 0) + ' usuario(s).');
      renderAdminComposer();
      closeAdminComposeModal();
      await loadAdminInbox();
    });
  }

  function renderAdminMessageList(threads, activeId) {
    var el = $('#admin-contact-list');
    if (!el) return;
    if (!adminMsgSelectedUserId) {
      el.innerHTML = '<p class="muted-text admin-msg-empty">Elige un usuario de la lista izquierda.</p>';
      return;
    }
    if (!threads.length) {
      el.innerHTML = '<p class="muted-text admin-msg-empty">Este usuario no tiene conversaciones.</p>';
      return;
    }
    el.innerHTML = threads.map(function (t) {
      var active = t.id === activeId ? ' contact-thread-active' : '';
      var unread = t.admin_unread_count > 0 ? ' contact-thread-unread' : '';
      var statusBits = [];
      if (t.admin_unread_count > 0) statusBits.push('<strong>Sin leer (tú)</strong>');
      if ((Number(t.user_unread_count) || 0) > 0) statusBits.push('<strong class="admin-msg-pending-read">Pendiente lectura usuario</strong>');
      return '<button type="button" class="contact-thread-item' + active + unread + '" data-admin-thread="' + escapeHtml(t.id) + '">' +
        '<span class="contact-thread-subject">' + escapeHtml(t.subject) + '</span>' +
        '<span class="contact-thread-meta muted-text">' + escapeHtml(formatRelative(t.last_message_at)) +
        (statusBits.length ? ' · ' + statusBits.join(' · ') : '') + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-admin-thread]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var threadId = btn.getAttribute('data-admin-thread');
        adminMsgSelectedThreadId = threadId;
        openAdminThread(threadId, { skipInboxReload: true });
        renderAdminMessageList(threadsForSelectedUser(), threadId);
      });
    });
  }

  function adminMessageReadBadge(m) {
    if (!m || m.sender_role !== 'admin') return '';
    if (m.read_at) {
      return '<span class="admin-msg-read-status is-read" title="El usuario abrió la conversación">Leído · ' +
        escapeHtml(formatDateTime(m.read_at)) + '</span>';
    }
    return '<span class="admin-msg-read-status is-pending" title="El usuario aún no ha abierto este mensaje">Pendiente de leer</span>';
  }

  function renderAdminMessages(messages) {
    if (!messages || !messages.length) return '<p class="muted-text">Sin mensajes.</p>';
    return messages.map(function (m) {
      var cls = m.sender_role === 'admin' ? 'contact-msg admin' : 'contact-msg user';
      var who = m.sender_role === 'admin' ? 'Soporte (tú)' : 'Usuario';
      var readBadge = adminMessageReadBadge(m);
      return '<div class="' + cls + '">' +
        '<div class="contact-msg-head"><strong>' + escapeHtml(who) + '</strong>' +
        '<span class="muted-text">' + escapeHtml(formatDateTime(m.created_at)) + '</span></div>' +
        '<div class="contact-msg-body">' + escapeHtml(m.body).replace(/\n/g, '<br>') + '</div>' +
        (readBadge ? '<div class="contact-msg-foot">' + readBadge + '</div>' : '') +
        '</div>';
    }).join('');
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  async function openAdminThread(threadId, opts) {
    if (!requireAdminAccess()) return;
    opts = opts || {};
    var c = client();
    var detail = $('#admin-contact-detail');
    if (!c || !detail || !threadId) return;
    adminMsgSelectedThreadId = threadId;
    var cached = adminMessagesThreads.find(function (t) { return t.id === threadId; });
    if (cached && cached.user_id) adminMsgSelectedUserId = cached.user_id;
    detail.innerHTML = '<div class="contact-loading"><div class="play-boot-spinner"></div></div>';
    var res = await c.rpc('pt_admin_contact_get_thread', { p_thread_id: threadId });
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error, detail)) return;
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    var th = (res.data && res.data.thread) || {};
    if (th.user_id) adminMsgSelectedUserId = th.user_id;
    var msgs = (res.data && res.data.messages) || [];
    var userPending = (Number(th.user_unread_count) || 0) > 0;
    var readSummary = userPending
      ? '<span class="admin-msg-read-status is-pending">El usuario aún no ha leído tu(s) mensaje(s)</span>'
      : '<span class="admin-msg-read-status is-read">Sin mensajes pendientes de lectura por el usuario</span>';
    detail.innerHTML =
      '<div class="contact-detail-head">' +
      '<h3>' + escapeHtml(th.subject) + '</h3>' +
      '</div>' +
      '<p class="muted-text contact-thread-user">' + escapeHtml(th.user_name || th.user_email || th.user_id) +
      (th.user_email ? ' · ' + escapeHtml(th.user_email) : '') + '</p>' +
      '<p class="admin-msg-thread-read">' + readSummary + '</p>' +
      '<div class="contact-messages admin-msg-messages">' + renderAdminMessages(msgs) + '</div>' +
      '<form class="contact-reply-form" data-admin-reply="' + escapeHtml(th.id) + '">' +
      '<label>Respuesta<textarea name="body" rows="4" maxlength="3000" required placeholder="Escribe tu respuesta al usuario…"></textarea></label>' +
      '<button type="submit" class="btn btn-primary">Enviar respuesta</button></form>';

    var msgBox = detail.querySelector('.admin-msg-messages');
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;

    var form = detail.querySelector('[data-admin-reply]');
    if (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (!requireAdminAccess()) return;
        var body = (form.body.value || '').trim();
        if (!body) return;
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        var reply = await c.rpc('pt_admin_contact_reply', { p_thread_id: th.id, p_body: body });
        if (btn) btn.disabled = false;
        if (!requireAdminAccess()) return;
        if (reply.error) {
          if (handleAdminRpcError(reply.error)) return;
          alert('Error: ' + (reply.error.message || 'no enviado'));
          return;
        }
        notifyAdminMessagePush({
          userIds: th.user_id ? [th.user_id] : [],
          subject: th.subject || 'Nuevo mensaje',
          body: body
        });
        await openAdminThread(threadId, { skipInboxReload: true });
        await loadAdminInbox(threadId);
      });
    }
    if (!opts.skipInboxReload) {
      renderAdminUserList();
      renderAdminThreadsHeader();
      renderAdminMessageList(threadsForSelectedUser(), threadId);
    }
    await loadAdminMessagesBadge();
  }

  async function loadAdminInbox(activeId) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c) return;
    var res = await c.rpc('pt_admin_contact_threads');
    if (!requireAdminAccess()) return;
    if (res.error) {
      var listEl = $('#admin-contact-list');
      if (handleAdminRpcError(res.error, listEl)) return;
      if (listEl) listEl.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    adminMessagesThreads = res.data || [];
    if (activeId) adminMsgSelectedThreadId = activeId;
    if (adminMsgSelectedThreadId) {
      var activeThread = adminMessagesThreads.find(function (t) { return t.id === adminMsgSelectedThreadId; });
      if (activeThread) adminMsgSelectedUserId = activeThread.user_id;
    }
    renderAdminUserList();
    renderAdminThreadsHeader();
    renderAdminMessageList(threadsForSelectedUser(), adminMsgSelectedThreadId);
    await loadAdminMessagesBadge();
  }

  function addCounts(target, source) {
    if (!source || typeof source !== 'object') return;
    Object.keys(source).forEach(function (k) {
      target[k] = (Number(target[k]) || 0) + (Number(source[k]) || 0);
    });
  }

  function aggregateGlobalUsage(users) {
    var events = {};
    var tabs = {};
    var aiScopes = {};
    var aiModes = {};
    var schoolUsers = 0;
    var schoolXp = 0;
    var schoolPassed = 0;
    var schoolGold = 0;
    var perUser = [];
    (users || []).forEach(function (u) {
      var fu = u.feature_usage || {};
      addCounts(events, fu.events);
      addCounts(tabs, fu.tabs);
      addCounts(aiScopes, fu.aiScopes);
      addCounts(aiModes, fu.aiModes);
      var sum = summarizeSchool(u.school);
      if (sum.xp > 0 || sum.lessonCount > 0) {
        schoolUsers += 1;
        schoolXp += sum.xp;
        schoolPassed += sum.passed;
        schoolGold += sum.gold;
      }
      var eventTotal = 0;
      sortedCountEntries(fu.events).forEach(function (e) { eventTotal += e.count; });
      perUser.push({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        last_seen_at: u.last_seen_at,
        eventTotal: eventTotal,
        hands: Number(u.hands_played) || 0,
        schoolXp: sum.xp,
        schoolPassed: sum.passed,
        schoolGold: sum.gold,
        topEvent: sortedCountEntries(fu.events)[0] || null,
        topTab: sortedCountEntries(fu.tabs)[0] || null
      });
    });
    perUser.sort(function (a, b) {
      if (b.eventTotal !== a.eventTotal) return b.eventTotal - a.eventTotal;
      if (b.hands !== a.hands) return b.hands - a.hands;
      return String(a.email || '').localeCompare(String(b.email || ''));
    });
    return {
      events: events,
      tabs: tabs,
      aiScopes: aiScopes,
      aiModes: aiModes,
      schoolUsers: schoolUsers,
      schoolXp: schoolXp,
      schoolPassed: schoolPassed,
      schoolGold: schoolGold,
      perUser: perUser
    };
  }

  function formatPct(n, d) {
    var a = Number(n) || 0;
    var b = Number(d) || 0;
    if (!b) return '—';
    return Math.round((a / b) * 100) + '%';
  }

  function funnelHandLabel(hand) {
    var h = Number(hand);
    if (h <= 0) return 'Empezaron y no terminaron ninguna mano';
    if (h >= 5) return 'Completaron las 5 manos';
    return 'Se quedaron en la mano ' + h;
  }

  function bindFunnelPeriod() {
    var host = $('#admin-usage-content');
    if (!host) return;
    host.querySelectorAll('[data-admin-funnel-days]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var days = Number(btn.getAttribute('data-admin-funnel-days'));
        if (isNaN(days)) return;
        adminUsageDays = days;
        loadUsageStats();
      });
    });
  }

  function renderGuestFunnelSection() {
    var days = adminUsageDays;
    var periodBtns = [7, 30, 90, 0].map(function (d) {
      var label = d === 0 ? 'Todo' : (d + ' días');
      var active = Number(days) === d ? ' is-active' : '';
      return '<button type="button" class="btn btn-ghost btn-sm' + active +
        '" data-admin-funnel-days="' + d + '">' + label + '</button>';
    }).join('');
    var head =
      '<div class="admin-usage-block admin-funnel-block">' +
      '<div class="admin-funnel-head">' +
      '<h4>Embudo landing → prueba → registro</h4>' +
      '<div class="admin-funnel-period" role="group" aria-label="Periodo del embudo">' +
      periodBtns + '</div></div>';

    if (adminFunnelError) {
      return head +
        '<p class="muted-text">No se pudo cargar el embudo. Aplica en Supabase la migración ' +
        '<code>040_guest_funnel.sql</code> si aún no está. ' +
        escapeHtml(adminFunnelError) + '</p></div>';
    }
    var f = adminFunnelCache;
    if (!f) {
      return head + '<p class="muted-text">Sin datos de embudo todavía.</p></div>';
    }
    var landing = Number(f.landing) || 0;
    var noLogin = Number(f.no_login) || 0;
    var bounced = Number(f.bounced) || 0;
    var ctaLogin = Number(f.cta_login) || 0;
    var ctaTry = Number(f.cta_try) || 0;
    var started = Number(f.guest_start) || 0;
    var played = Number(f.played) || 0;
    var gate = Number(f.gate_shown) || 0;
    var guestLogin = Number(f.guest_login) || 0;
    var converted = Number(f.converted) || 0;
    var drop = Array.isArray(f.drop_by_hand) ? f.drop_by_hand : [];
    var dropEntries = drop.map(function (row) {
      return { key: String(row.hand), count: Number(row.visitors) || 0, converted: Number(row.converted) || 0 };
    });
    var dropList = started
      ? '<ul class="admin-usage-bars">' + dropEntries.map(function (e) {
          var max = dropEntries.reduce(function (m, x) { return Math.max(m, x.count); }, 1) || 1;
          var pct = Math.max(4, Math.round((e.count / max) * 100));
          var conv = e.converted
            ? ' · ' + e.converted + ' se registraron'
            : '';
          return '<li><div class="admin-usage-bar-row">' +
            '<span class="admin-usage-bar-label">' + escapeHtml(funnelHandLabel(e.key)) + '</span>' +
            '<span class="admin-usage-bar-count">' + escapeHtml(formatActivityNumber(e.count)) +
            escapeHtml(conv) + '</span></div>' +
            '<div class="admin-usage-bar-track"><div class="admin-usage-bar-fill" style="width:' + pct +
            '%"></div></div></li>';
        }).join('') + '</ul>'
      : '<p class="muted-text">Aún no hay partidas de invitado en este periodo.</p>';

    return head +
      '<p class="muted-text admin-funnel-note">Visitantes únicos de la landing pública (sin cuenta). ' +
      '«Sin Entrar» son quienes no pulsan Entrar. «Se quedaron» es la última mano que terminaron de las 5 de la prueba. ' +
      'El registro cuenta a quien inicia sesión con Google después de jugar.</p>' +
      '<div class="admin-detail-grid admin-usage-summary">' +
      '<div><span class="muted-text">Vieron la landing</span><strong>' +
      escapeHtml(formatActivityNumber(landing)) + '</strong></div>' +
      '<div><span class="muted-text">Sin pulsar Entrar</span><strong>' +
      escapeHtml(formatActivityNumber(noLogin)) + '</strong>' +
      '<span class="muted-text"> ' + escapeHtml(formatPct(noLogin, landing)) + '</span></div>' +
      '<div><span class="muted-text">Salieron sin probar</span><strong>' +
      escapeHtml(formatActivityNumber(bounced)) + '</strong></div>' +
      '<div><span class="muted-text">Pulsaron Entrar</span><strong>' +
      escapeHtml(formatActivityNumber(ctaLogin)) + '</strong></div>' +
      '<div><span class="muted-text">Probar ahora</span><strong>' +
      escapeHtml(formatActivityNumber(ctaTry)) + '</strong></div>' +
      '<div><span class="muted-text">Empezaron a jugar</span><strong>' +
      escapeHtml(formatActivityNumber(started)) + '</strong></div>' +
      '<div><span class="muted-text">Jugaron ≥1 mano</span><strong>' +
      escapeHtml(formatActivityNumber(played)) + '</strong></div>' +
      '<div><span class="muted-text">Vieron el muro de registro</span><strong>' +
      escapeHtml(formatActivityNumber(gate)) + '</strong></div>' +
      '<div><span class="muted-text">Continuar con Google</span><strong>' +
      escapeHtml(formatActivityNumber(guestLogin)) + '</strong></div>' +
      '<div><span class="muted-text">Se registraron tras jugar</span><strong>' +
      escapeHtml(formatActivityNumber(converted)) + '</strong>' +
      '<span class="muted-text"> ' + escapeHtml(formatPct(converted, started)) + ' de quien jugó</span></div>' +
      '</div>' +
      '<h5>En qué mano se quedan</h5>' + dropList +
      '</div>';
  }

  function renderModeMap(mapObj, title) {
    var entries = sortedCountEntries(mapObj);
    return '<div class="admin-usage-block"><h4>' + escapeHtml(title) + '</h4>' +
      renderCountBars(entries) + '</div>';
  }

  function renderUsagePanel(data) {
    var host = $('#admin-usage-content');
    if (!host) return;
    if (!data) {
      host.innerHTML = '<p class="muted-text">Sin datos de uso.</p>';
      return;
    }
    var agg = aggregateGlobalUsage(data.users || []);
    var userRows = agg.perUser.slice(0, 100).map(function (u) {
      var top = u.topEvent
        ? ((FEATURE_EVENT_LABELS[u.topEvent.key] || u.topEvent.key) + ' (' + u.topEvent.count + ')')
        : '—';
      return '<tr data-admin-usage-user="' + escapeHtml(u.user_id) + '">' +
        '<td><button type="button" class="admin-thread-link" data-admin-usage-open="' + escapeHtml(u.user_id) + '">' +
        escapeHtml(u.name || u.email || u.user_id) + '</button><br><span class="muted-text">' +
        escapeHtml(u.email || '') + '</span></td>' +
        '<td>' + escapeHtml(u.plan || 'free') + '</td>' +
        '<td>' + escapeHtml(formatActivityNumber(u.eventTotal)) + '</td>' +
        '<td>' + escapeHtml(formatActivityNumber(u.hands)) + '</td>' +
        '<td>' + escapeHtml(formatActivityNumber(u.schoolXp)) + ' XP · ' +
        escapeHtml(u.schoolPassed) + ' OK · ' + escapeHtml(u.schoolGold) + ' oro</td>' +
        '<td class="muted-text">' + escapeHtml(top) + '</td>' +
        '<td class="muted-text">' + escapeHtml(formatRelative(u.last_seen_at)) + '</td></tr>';
    }).join('');

    host.innerHTML =
      renderGuestFunnelSection() +
      '<div class="admin-detail-section admin-koins-recompute">' +
      '<h4>Recuento de Koins</h4>' +
      '<p class="muted-text">Recalcula saldos desde el histórico (partida en 0; excluye admin; manager MTTLab = 100). Requiere migración <code>052</code>.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" data-admin-recompute-koins>Recalcular Koins en BBDD</button>' +
      '<p class="muted-text" data-admin-recompute-koins-status></p>' +
      '</div>' +
      '<div class="admin-detail-grid admin-usage-summary">' +
      '<div><span class="muted-text">IA hoy</span><strong>' + escapeHtml(formatActivityNumber(data.ai_requests_today)) + '</strong></div>' +
      '<div><span class="muted-text">IA 30 días</span><strong>' + escapeHtml(formatActivityNumber(data.ai_requests_30d)) + '</strong></div>' +
      '<div><span class="muted-text">IA mes</span><strong>' + escapeHtml(formatActivityNumber(data.ai_requests_month)) + '</strong></div>' +
      '<div><span class="muted-text">Usuarios con Escuela</span><strong>' + escapeHtml(formatActivityNumber(agg.schoolUsers)) + '</strong></div>' +
      '<div><span class="muted-text">XP Escuela total</span><strong>' + escapeHtml(formatActivityNumber(agg.schoolXp)) + '</strong></div>' +
      '<div><span class="muted-text">Lecciones OK / Oro</span><strong>' + escapeHtml(formatActivityNumber(agg.schoolPassed)) +
      ' / ' + escapeHtml(formatActivityNumber(agg.schoolGold)) + '</strong></div>' +
      '</div>' +
      '<div class="admin-usage-grid">' +
      '<div class="admin-usage-block"><h4>Funciones más usadas</h4>' +
      renderCountBars(sortedCountEntries(agg.events), function (k) { return FEATURE_EVENT_LABELS[k] || k; }) +
      '</div>' +
      '<div class="admin-usage-block"><h4>Pestañas más visitadas</h4>' +
      renderCountBars(sortedCountEntries(agg.tabs), function (k) { return TAB_LABELS[k] || k; }) +
      '</div>' +
      renderModeMap(data.ai_by_mode_today || {}, 'IA por modo (hoy)') +
      renderModeMap(data.ai_by_mode_30d || {}, 'IA por modo (30 días)') +
      '<div class="admin-usage-block"><h4>IA por ámbito (cliente)</h4>' +
      renderCountBars(sortedCountEntries(agg.aiScopes)) + '</div>' +
      '</div>' +
      '<div class="admin-detail-section"><h4>Uso por usuario</h4>' +
      (userRows
        ? '<div class="admin-table-wrap"><table class="admin-detail-table"><thead><tr>' +
          '<th>Usuario</th><th>Plan</th><th>Eventos</th><th>Manos</th><th>Escuela</th><th>Top función</th><th>Visto</th>' +
          '</tr></thead><tbody>' + userRows + '</tbody></table></div>'
        : '<p class="muted-text">Aún no hay usuarios con contadores de uso o progreso de Escuela sincronizados.</p>') +
      '</div>';

    host.querySelectorAll('[data-admin-usage-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-admin-usage-open');
        showAdminUsage(false);
        if (uid) openUserDetail(uid);
      });
    });
    var recomputeBtn = host.querySelector('[data-admin-recompute-koins]');
    if (recomputeBtn) {
      recomputeBtn.addEventListener('click', function () {
        recomputeTournamentKoins();
      });
    }
    bindFunnelPeriod();
  }

  async function recomputeTournamentKoins() {
    if (!requireAdminAccess()) return;
    var host = $('#admin-usage-content');
    var status = host && host.querySelector('[data-admin-recompute-koins-status]');
    var btn = host && host.querySelector('[data-admin-recompute-koins]');
    var c = client();
    if (!c) return;
    if (!window.confirm(
      '¿Recalcular Koins de todos los usuarios desde el histórico?\n' +
      'Partida en 0, sin endowment. Se excluye al administrador. ' +
      'Manager MTTLab → 100 en esa comunidad.'
    )) return;
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Recalculando…';
    var res = await c.rpc('pt_admin_recompute_tournament_koins');
    if (btn) btn.disabled = false;
    if (!requireAdminAccess()) return;
    if (res.error) {
      var msg = res.error.message || 'Error al recalcular';
      if (isMissingRpc(res.error)) {
        msg = 'Falta aplicar la migración 052_recompute_tournament_koins_from_history.sql en Supabase.';
      }
      if (status) status.textContent = msg;
      else try { alert(msg); } catch (eA) { /* */ }
      return;
    }
    var d = res.data || {};
    var okMsg = 'Listo: ' +
      (d.updated_users != null ? d.updated_users + ' usuarios, ' : '') +
      (d.updated_wallets != null ? d.updated_wallets + ' wallets, ' : '') +
      (d.skipped_admins != null ? d.skipped_admins + ' admin omitidos, ' : '') +
      (d.manager_grants != null ? d.manager_grants + ' managers MTTLab=100' : '');
    if (status) status.textContent = okMsg;
    else try { alert(okMsg); } catch (eB) { /* */ }
  }

  function isMissingRpc(err) {
    var code = err && err.code;
    var m = String((err && err.message) || '');
    return code === 'PGRST202' || /could not find the function/i.test(m) ||
      /does not exist/i.test(m) || /schema cache/i.test(m);
  }

  async function loadUsageStats() {
    if (!requireAdminAccess()) return;
    var c = client();
    var errEl = $('#admin-usage-error');
    var host = $('#admin-usage-content');
    if (!c || !host) return;
    if (errEl) errEl.textContent = '';
    host.innerHTML = '<p class="muted-text">Cargando estadísticas de uso…</p>';
    var res = await c.rpc('pt_admin_usage_stats');
    if (!requireAdminAccess()) return;
    if (res.error) {
      if (handleAdminRpcError(res.error, errEl || host)) return;
      host.innerHTML = '';
      if (errEl) errEl.textContent = res.error.message || 'Error al cargar uso';
      else host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    adminUsageCache = res.data || {};
    adminFunnelError = null;
    adminFunnelCache = null;
    try {
      var funnelRes = await c.rpc('pt_admin_guest_funnel', { p_days: adminUsageDays });
      if (!requireAdminAccess()) return;
      if (funnelRes.error) {
        if (handleAdminRpcError(funnelRes.error, errEl || host)) return;
        adminFunnelError = isMissingRpc(funnelRes.error)
          ? 'Falta la migración 040_guest_funnel.sql en este proyecto Supabase.'
          : (funnelRes.error.message || 'Error al cargar el embudo');
      } else {
        adminFunnelCache = funnelRes.data || null;
      }
    } catch (e) {
      adminFunnelError = (e && e.message) || 'Error al cargar el embudo';
    }
    renderUsagePanel(adminUsageCache);
  }

  function communityLoginUrl(c) {
    if (!c) return '';
    if (c.login_url) return c.login_url;
    var path = c.entry_path || ('/?app=' + (c.id || ''));
    return 'https://www.pokerforgeai.com' + path;
  }

  async function loadAdminCommunities() {
    var host = $('#admin-communities-list');
    var err = $('#admin-communities-error');
    var detail = $('#admin-community-detail');
    if (err) err.textContent = '';
    if (detail) {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    }
    if (!host) return;
    host.innerHTML = '<p class="muted-text">Cargando comunidades…</p>';
    var c = client();
    if (!c) {
      host.innerHTML = '<p class="admin-error">Sin cliente Supabase.</p>';
      return;
    }
    var res = await c.rpc('pt_admin_list_communities');
    if (res.error) {
      handleAdminRpcError(res.error, err);
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message || 'Error') + '</p>';
      return;
    }
    var list = (res.data && res.data.communities) || res.data || [];
    if (!Array.isArray(list)) list = [];
    if (!list.length) {
      host.innerHTML = '<p class="muted-text">No hay comunidades registradas.</p>';
      return;
    }
    host.innerHTML =
      '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
      '<th>Comunidad</th><th>URL login</th><th>Código</th><th>Miembros</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>' +
      list.map(function (row) {
        var url = communityLoginUrl(row);
        return '<tr>' +
          '<td><strong>' + escapeHtml(row.name || row.id) + '</strong><br><span class="muted-text">' +
          escapeHtml(row.id || '') + '</span></td>' +
          '<td><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(url) + '</a></td>' +
          '<td><code>' + escapeHtml(row.join_code || '—') + '</code></td>' +
          '<td>' + escapeHtml(String(row.member_count != null ? row.member_count : 0)) +
          (row.manager_count ? ' <span class="muted-text">(' + escapeHtml(String(row.manager_count)) + ' mgr)</span>' : '') +
          '</td>' +
          '<td>' + (row.active ? 'Activa' : 'Inactiva') + '</td>' +
          '<td><button type="button" class="btn btn-ghost btn-sm" data-admin-community="' +
          escapeHtml(row.id) + '">Gestionar</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
    host.querySelectorAll('[data-admin-community]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAdminCommunityDetail(btn.getAttribute('data-admin-community'));
      });
    });
  }

  async function openAdminCommunityDetail(communityId) {
    var detail = $('#admin-community-detail');
    var err = $('#admin-communities-error');
    if (!detail) return;
    if (err) err.textContent = '';
    detail.classList.remove('hidden');
    detail.innerHTML = '<p class="muted-text">Cargando detalle…</p>';
    var c = client();
    if (!c) return;
    var res = await c.rpc('pt_admin_community_detail', { p_community_id: communityId });
    if (res.error) {
      handleAdminRpcError(res.error, err);
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message || 'Error') + '</p>';
      return;
    }
    var data = res.data || {};
    var com = data.community || {};
    var members = data.members || [];
    var url = communityLoginUrl(com);
    detail.innerHTML =
      '<div class="admin-section card-box">' +
      '<div class="admin-section-head"><h3>' + escapeHtml(com.name || communityId) + '</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-community-detail-close">Cerrar</button></div>' +
      '<p class="muted-text">URL de login: <a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
      escapeHtml(url) + '</a></p>' +
      '<p class="muted-text">Activos ahora: <strong>' + escapeHtml(String(data.online_count || 0)) +
      '</strong> · Cupo IA comunidad: <strong>' + escapeHtml(String(data.ai_limit || 40)) + '</strong>/mes</p>' +
      '<form id="admin-community-edit-form" class="admin-community-edit-form">' +
      '<label class="admin-invite-label" for="admin-community-join-code">Código de acceso</label>' +
      '<input type="text" id="admin-community-join-code" class="admin-promo-input" value="' +
      escapeHtml(com.join_code || '') + '" maxlength="64" autocomplete="off" />' +
      '<label class="admin-invite-label" for="admin-community-welcome">Mensaje de bienvenida (home)</label>' +
      '<textarea id="admin-community-welcome" class="admin-promo-textarea" rows="3" maxlength="800">' +
      escapeHtml(com.welcome_message || '') + '</textarea>' +
      '<label class="admin-invite-label" for="admin-community-name">Nombre</label>' +
      '<input type="text" id="admin-community-name" class="admin-promo-input" value="' +
      escapeHtml(com.name || '') + '" maxlength="120" />' +
      '<label class="admin-invite-label"><input type="checkbox" id="admin-community-active"' +
      (com.active ? ' checked' : '') + ' /> Comunidad activa</label>' +
      '<div class="admin-messages-head-actions" style="margin-top:12px">' +
      '<button type="submit" class="btn btn-primary btn-sm">Guardar cambios</button>' +
      '<span id="admin-community-save-status" class="muted-text"></span></div></form>' +
      '<h4 style="margin-top:1.5rem">Miembros (' + members.length + ')</h4>' +
      (members.length
        ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
          '<th>Usuario</th><th>Rol</th><th>IA mes</th><th>Escuela</th><th>Última conexión</th><th></th>' +
          '</tr></thead><tbody>' +
          members.map(function (m) {
            return '<tr>' +
              '<td><strong>' + escapeHtml(m.name || '—') + '</strong><br><span class="muted-text">' +
              escapeHtml(m.email || '') + '</span>' +
              (m.is_online ? ' <span class="admin-online-dot" title="En línea">●</span>' : '') +
              '</td>' +
              '<td>' + escapeHtml(m.role || 'member') + '</td>' +
              '<td>' + escapeHtml(String(m.ai_used_month != null ? m.ai_used_month : 0)) + '/' +
              escapeHtml(String(m.ai_limit || 40)) + '</td>' +
              '<td>' + escapeHtml(String(m.school_passed != null ? m.school_passed : 0)) +
              ' lecc. · XP ' + escapeHtml(String(m.school_xp != null ? m.school_xp : 0)) + '</td>' +
              '<td>' + escapeHtml(formatDateTime(m.last_seen_at)) + '</td>' +
              '<td><button type="button" class="btn btn-ghost btn-sm" data-admin-open-user="' +
              escapeHtml(m.user_id) + '">Ver usuario</button></td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<p class="muted-text">Sin miembros activos.</p>') +
      '</div>';

    var close = $('#admin-community-detail-close');
    if (close) close.addEventListener('click', function () {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    });
    var form = $('#admin-community-edit-form');
    if (form) {
      form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var status = $('#admin-community-save-status');
        if (status) status.textContent = 'Guardando…';
        var upd = await c.rpc('pt_admin_update_community', {
          p_community_id: communityId,
          p_join_code: ($('#admin-community-join-code') || {}).value || '',
          p_welcome_message: ($('#admin-community-welcome') || {}).value || '',
          p_name: ($('#admin-community-name') || {}).value || '',
          p_active: !!($('#admin-community-active') && $('#admin-community-active').checked)
        });
        if (upd.error) {
          if (status) status.textContent = '';
          if (err) err.textContent = upd.error.message || 'Error al guardar';
          return;
        }
        if (status) status.textContent = 'Guardado';
        loadAdminCommunities();
        openAdminCommunityDetail(communityId);
      });
    }
    detail.querySelectorAll('[data-admin-open-user]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var uid = btn.getAttribute('data-admin-open-user');
        openCommunityScopedUserDetail(communityId, uid);
      });
    });
  }

  function communityLessonIdsForDetail(school, cid) {
    if (global.PTManagerPanel && typeof PTManagerPanel.sanitizeCommunitySchool === 'function') {
      return Object.keys(PTManagerPanel.sanitizeCommunitySchool(school, cid).lessons || {});
    }
    var lessons = (school && school.lessons) || {};
    return Object.keys(lessons).filter(function (id) {
      if (/^(C-|R-|T-|M0-|D-|O-|B-|F-|E-|Q-|X-|N-|I-|learn-|cash-|spin-)/i.test(id)) return false;
      if (cid === 'mttlab') return /^ML-/i.test(id);
      return true;
    });
  }

  function renderCommunityOnlyMemberHtml(data, communityId) {
    if (global.PTManagerPanel && typeof PTManagerPanel.renderMemberDetailHtml === 'function') {
      return PTManagerPanel.renderMemberDetailHtml(data, communityId);
    }
    var mem = (data && data.member) || {};
    var schoolRaw = (data && data.school) || {};
    var school = (global.PTManagerPanel && PTManagerPanel.sanitizeCommunitySchool)
      ? PTManagerPanel.sanitizeCommunitySchool(schoolRaw, communityId)
      : { xp: 0, lessons: {}, passed: 0 };
    var ai = (data && data.ai) || {};
    var training = (data && data.training) || {};
    var lessonIds = communityLessonIdsForDetail(schoolRaw, communityId);
    var passed = school.passed != null ? school.passed : 0;
    var acc = training.accuracy != null ? (String(training.accuracy) + '%') : '—';
    return '<div class="manager-detail-card">' +
      '<p class="manager-detail-scope muted-text">Solo datos de esta comunidad · sin plan, pagos ni progreso de PokerForgeAI.</p>' +
      '<p><strong>' + escapeHtml(mem.name || mem.email || 'Miembro') + '</strong></p>' +
      '<p class="muted-text">' + escapeHtml(mem.email || '') + ' · Rol: ' + escapeHtml(mem.role || '') + '</p>' +
      '<p>Consultas IA (comunidad): <strong>' + escapeHtml(String(ai.used != null ? ai.used : 0)) +
      '/' + escapeHtml(String(ai.limit || 40)) + '</strong></p>' +
      '<p>Entrenamiento (comunidad): <strong>' + escapeHtml(String(training.handsPlayed != null ? training.handsPlayed : 0)) +
      '</strong> manos · acierto <strong>' + escapeHtml(acc) + '</strong></p>' +
      '<p>XP escuela (esta comunidad): <strong>' + escapeHtml(school.xp != null ? school.xp : 0) + '</strong></p>' +
      '<p>Lecciones: <strong>' + lessonIds.length + '</strong> · Aprobadas: <strong>' + passed + '</strong></p>' +
      '</div>';
  }

  /** Desde Comunidades: solo IA/escuela/stats de esa comunidad (sin ficha PokerForgeAI). */
  async function openCommunityScopedUserDetail(communityId, userId) {
    var detail = $('#admin-community-detail');
    var err = $('#admin-communities-error');
    if (!detail || !userId) return;
    if (err) err.textContent = '';
    detail.classList.remove('hidden');
    detail.innerHTML = '<p class="muted-text">Cargando detalle de comunidad…</p>';
    var c = client();
    if (!c) return;
    var res = await c.rpc('pt_manager_member_usage', {
      p_community_id: communityId,
      p_user_id: userId
    });
    if (res.error) {
      handleAdminRpcError(res.error, err);
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message || 'Error') + '</p>';
      return;
    }
    if (res.data && res.data.ok === false) {
      var errMsg = res.data.error || 'error';
      if (global.PTManagerPanel && PTManagerPanel.formatMemberError) {
        errMsg = PTManagerPanel.formatMemberError(errMsg);
      }
      detail.innerHTML = '<p class="admin-error">' + escapeHtml(errMsg) + '</p>';
      return;
    }
    detail.innerHTML =
      '<div class="admin-section card-box">' +
      '<div class="admin-section-head"><h3>Detalle · comunidad</h3>' +
      '<div class="admin-messages-head-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-community-member-back">Volver a comunidad</button>' +
      '</div></div>' +
      '<p class="muted-text">Vista limitada a <strong>' + escapeHtml(communityId) +
      '</strong>. Plan, pagos y escuela PokerForgeAI no se muestran aquí.</p>' +
      renderCommunityOnlyMemberHtml(res.data, communityId) +
      '</div>';
    var back = $('#admin-community-member-back');
    if (back) back.addEventListener('click', function () {
      openAdminCommunityDetail(communityId);
    });
  }

  function showAdminCommunities(show) {
    if (show && !requireAdminAccess()) return;
    var communitiesPanel = $('#admin-communities-panel');
    var usersPanel = $('#admin-users-panel');
    var promoPanel = $('#admin-promos-panel');
    var msgPanel = $('#admin-messages-panel');
    var usagePanel = $('#admin-usage-panel');
    var villainAssistPanel = $('#admin-villain-assist-panel');
    if (communitiesPanel) communitiesPanel.classList.toggle('hidden', !show);
    if (show) {
      if (usersPanel) usersPanel.classList.add('hidden');
      if (promoPanel) promoPanel.classList.add('hidden');
      if (msgPanel) msgPanel.classList.add('hidden');
      if (usagePanel) usagePanel.classList.add('hidden');
      if (villainAssistPanel) villainAssistPanel.classList.add('hidden');
      loadAdminCommunities();
    } else if (communitiesPanel) {
      communitiesPanel.classList.add('hidden');
      if (usersPanel) usersPanel.classList.remove('hidden');
    }
  }

  function showAdminVillainAssist(show) {
    if (show && !requireAdminAccess()) return;
    var panel = $('#admin-villain-assist-panel');
    var usersPanel = $('#admin-users-panel');
    var promoPanel = $('#admin-promos-panel');
    var msgPanel = $('#admin-messages-panel');
    var usagePanel = $('#admin-usage-panel');
    var communitiesPanel = $('#admin-communities-panel');
    if (panel) panel.classList.toggle('hidden', !show);
    if (show) {
      if (usersPanel) usersPanel.classList.add('hidden');
      if (promoPanel) promoPanel.classList.add('hidden');
      if (msgPanel) msgPanel.classList.add('hidden');
      if (usagePanel) usagePanel.classList.add('hidden');
      if (communitiesPanel) communitiesPanel.classList.add('hidden');
      loadVillainAssistAdmin();
    } else if (panel) {
      panel.classList.add('hidden');
      if (usersPanel) usersPanel.classList.remove('hidden');
    }
  }

  async function loadVillainAssistAdmin() {
    var host = $('#admin-villain-assist-content');
    var errEl = $('#admin-villain-assist-error');
    if (errEl) errEl.textContent = '';
    if (!host) {
      if (errEl) errEl.textContent = 'No se encontró el panel del asistente en el HTML.';
      return;
    }
    host.innerHTML = '<p class="muted-text">Cargando…</p>';
    var enabled = false;
    var stats = null;

    /* Asegurar flags aunque el chunk torneos no se haya cargado. */
    try {
      if (global.PTVillainAssistFlags && global.PTVillainAssistFlags.refresh) {
        enabled = !!(await global.PTVillainAssistFlags.refresh());
      } else if (global.PTVillainAssistFlags) {
        enabled = !!global.PTVillainAssistFlags.isEnabled();
      } else {
        var c0 = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
        if (c0 && c0.rpc) {
          var resFlag = await c0.rpc('pt_get_app_setting', { p_key: 'villain_assist_enabled' });
          if (!resFlag.error && resFlag.data != null) {
            var row = Array.isArray(resFlag.data) ? resFlag.data[0] : resFlag.data;
            var val = row && (row.value != null ? row.value : row);
            if (typeof val === 'boolean') enabled = val;
            else if (val && typeof val === 'object' && val.enabled != null) enabled = !!val.enabled;
            else if (val === true || val === 'true' || val === 1 || val === '1') enabled = true;
          }
        }
      }
    } catch (e) { /* */ }

    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (c && c.rpc) {
        var res = await c.rpc('pt_admin_villain_assist_stats', { p_days: 30 });
        if (!res.error) stats = res.data;
        else if (errEl && String(res.error.message || res.error).indexOf('function') >= 0) {
          errEl.textContent = 'Falta aplicar la migración 058_villain_assist.sql en Supabase.';
        }
      }
    } catch (e2) { /* */ }

    var s = stats || {};
    if (s && typeof s === 'object' && s.feature_enabled != null) {
      enabled = !!s.feature_enabled;
    }
    host.innerHTML =
      '<div class="card-box admin-villain-assist-controls">' +
      '<h4>Kill-switch</h4>' +
      '<label class="admin-toggle">' +
      '<input type="checkbox" id="admin-va-enabled"' + (enabled ? ' checked' : '') + '> ' +
      'Asistente IA villanos (torneos Pro) visible</label>' +
      '<p class="muted-text">Por defecto está desactivado. Al activarlo, en torneos Pro aparece el aviso al empezar y el bloque en Info. Si se desactiva, se oculta por completo.</p>' +
      '<div class="admin-promo-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-va-bump-schema">Invalidar caché L3 (schema++)</button>' +
      '</div></div>' +
      '<div class="card-box">' +
      '<h4>Métricas (30 días)</h4>' +
      '<ul class="admin-usage-bars">' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">Audits totales</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.total || 0)) + '</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">% agree motor local</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.agree_pct != null ? s.agree_pct : 0)) +
      '%</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">% differ</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.differ_pct != null ? s.differ_pct : 0)) +
      '%</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">Differ mejor / peor / neutro</span>' +
      '<span class="admin-usage-bar-count">' +
      escapeHtml([s.differ_better || 0, s.differ_worse || 0, s.differ_neutral || 0].join(' / ')) +
      '</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">ΔEV medio (differ)</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.avg_delta_ev_differ != null ? s.avg_delta_ev_differ : 0)) +
      ' bb</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">Gemini / cache hits</span>' +
      '<span class="admin-usage-bar-count">' +
      escapeHtml(String(s.gemini || 0)) + ' / ' + escapeHtml(String(s.cache_hits || 0)) +
      ' (' + escapeHtml(String(s.cache_hit_pct != null ? s.cache_hit_pct : 0)) + '% hit)</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">Consultas cobradas</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.charged || 0)) + '</span></div></li>' +
      '<li><div class="admin-usage-bar-row"><span class="admin-usage-bar-label">Filas caché L3</span>' +
      '<span class="admin-usage-bar-count">' + escapeHtml(String(s.cache_rows || 0)) + '</span></div></li>' +
      '</ul>' +
      '<p class="muted-text">Si agree ≥ ~70% y ΔEV≈0, la IA aporta poco. ' +
      'Si differ_better &gt; differ_worse con ΔEV&gt;0 en burbuja/FT/HU, señal de mejora.</p>' +
      '</div>';

    var toggle = $('#admin-va-enabled');
    if (toggle) {
      toggle.onchange = null;
      toggle.addEventListener('change', async function onVaToggle() {
        var on = !!toggle.checked;
        try {
          if (global.PTVillainAssistFlags && global.PTVillainAssistFlags.setEnabledAdmin) {
            await global.PTVillainAssistFlags.setEnabledAdmin(on);
          } else {
            var cSet = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
            if (cSet && cSet.rpc) {
              var put = await cSet.rpc('pt_admin_set_app_setting', {
                p_key: 'villain_assist_enabled',
                p_value: { enabled: on }
              });
              if (put.error) throw put.error;
              try {
                if (global.localStorage) {
                  global.localStorage.setItem('pt_villain_assist_admin_enabled', on ? '1' : '0');
                }
              } catch (eLs) { /* */ }
            } else {
              throw new Error('no_client');
            }
          }
          if (errEl) {
            errEl.textContent = on
              ? 'Asistente visible en torneos Pro.'
              : 'Asistente oculto en la app.';
          }
        } catch (e3) {
          toggle.checked = !on;
          if (errEl) {
            errEl.textContent = 'No se pudo guardar el flag. ¿Está aplicada la migración 058?';
          }
        }
      }, { once: false });
    }
    var bump = $('#admin-va-bump-schema');
    if (bump) {
      bump.onclick = async function () {
        try {
          if (global.PTVillainAssistFlags && global.PTVillainAssistFlags.bumpSchemaVersion) {
            var n = await global.PTVillainAssistFlags.bumpSchemaVersion();
            if (errEl) errEl.textContent = n ? ('Caché invalidada · schema ' + n) : 'No se pudo invalidar.';
          } else if (errEl) {
            errEl.textContent = 'Módulo de flags no cargado.';
          }
        } catch (e4) {
          if (errEl) errEl.textContent = 'Error al invalidar caché.';
        }
      };
    }
  }

  function showAdminUsage(show) {
    if (show && !requireAdminAccess()) return;
    var usagePanel = $('#admin-usage-panel');
    var usersPanel = $('#admin-users-panel');
    var promoPanel = $('#admin-promos-panel');
    var msgPanel = $('#admin-messages-panel');
    var communitiesPanel = $('#admin-communities-panel');
    var villainAssistPanel = $('#admin-villain-assist-panel');
    if (usagePanel) usagePanel.classList.toggle('hidden', !show);
    if (show) {
      if (usersPanel) usersPanel.classList.add('hidden');
      if (promoPanel) promoPanel.classList.add('hidden');
      if (msgPanel) msgPanel.classList.add('hidden');
      if (communitiesPanel) communitiesPanel.classList.add('hidden');
      if (villainAssistPanel) villainAssistPanel.classList.add('hidden');
      loadUsageStats();
    } else if (usagePanel) {
      usagePanel.classList.add('hidden');
      if (usersPanel) usersPanel.classList.remove('hidden');
    }
  }

  function showAdminMessages(show, opts) {
    if (show && !requireAdminAccess()) return;
    opts = opts || {};
    var msgPanel = $('#admin-messages-panel');
    var usersPanel = $('#admin-users-panel');
    var promoPanel = $('#admin-promos-panel');
    var usagePanel = $('#admin-usage-panel');
    var communitiesPanel = $('#admin-communities-panel');
    if (msgPanel) msgPanel.classList.toggle('hidden', !show);
    if (usersPanel) usersPanel.classList.toggle('hidden', show);
    if (show && promoPanel) promoPanel.classList.add('hidden');
    if (show && usagePanel) usagePanel.classList.add('hidden');
    if (show && communitiesPanel) communitiesPanel.classList.add('hidden');
    var villainAssistPanel = $('#admin-villain-assist-panel');
    if (show && villainAssistPanel) villainAssistPanel.classList.add('hidden');
    if (show) {
      bindAdminComposeModal();
      if (opts.userId) adminMsgSelectedUserId = opts.userId;
      if (opts.threadId) adminMsgSelectedThreadId = opts.threadId;
      loadAdminInbox(adminMsgSelectedThreadId).then(function () {
        if (!hasAdminAccess()) return;
        if (opts.userId) {
          selectAdminMsgUser(opts.userId, opts.threadId);
        } else if (opts.threadId) {
          openAdminThread(opts.threadId);
        }
      });
    } else {
      closeAdminComposeModal();
    }
  }

  function bindAdminMessages() {
    var btn = $('#admin-messages-btn');
    var back = $('#admin-messages-back');
    var userFilter = $('#admin-msg-user-filter');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () { showAdminMessages(true); });
    }
    if (back && !back.dataset.bound) {
      back.dataset.bound = '1';
      back.addEventListener('click', function () { showAdminMessages(false); });
    }
    if (userFilter && !userFilter.dataset.bound) {
      userFilter.dataset.bound = '1';
      userFilter.addEventListener('input', function () {
        adminMsgUserFilter = String(userFilter.value || '').trim().toLowerCase();
        renderAdminUserList();
      });
    }
    bindAdminComposeModal();
  }

  function bindUi() {
    var refreshBtn = $('#admin-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      if (!requireAdminAccess()) return;
      refresh();
    });

    var exportBtn = $('#admin-export-csv');
    if (exportBtn && !exportBtn.dataset.bound) {
      exportBtn.dataset.bound = '1';
      exportBtn.addEventListener('click', function () {
        exportUsersCsv();
      });
    }

    bindInviteModal();
    bindAdminMessages();

    var usageBtn = $('#admin-usage-btn');
    var usageBack = $('#admin-usage-back');
    if (usageBtn && !usageBtn.dataset.bound) {
      usageBtn.dataset.bound = '1';
      usageBtn.addEventListener('click', function () { showAdminUsage(true); });
    }
    if (usageBack && !usageBack.dataset.bound) {
      usageBack.dataset.bound = '1';
      usageBack.addEventListener('click', function () { showAdminUsage(false); });
    }

    var vaBtn = $('#admin-villain-assist-btn');
    var vaBack = $('#admin-villain-assist-back');
    if (vaBtn && !vaBtn.dataset.bound) {
      vaBtn.dataset.bound = '1';
      vaBtn.addEventListener('click', function () { showAdminVillainAssist(true); });
    }
    if (vaBack && !vaBack.dataset.bound) {
      vaBack.dataset.bound = '1';
      vaBack.addEventListener('click', function () { showAdminVillainAssist(false); });
    }

    var communitiesBtn = $('#admin-communities-btn');
    var communitiesBack = $('#admin-communities-back');
    if (communitiesBtn && !communitiesBtn.dataset.bound) {
      communitiesBtn.dataset.bound = '1';
      communitiesBtn.addEventListener('click', function () { showAdminCommunities(true); });
    }
    if (communitiesBack && !communitiesBack.dataset.bound) {
      communitiesBack.dataset.bound = '1';
      communitiesBack.addEventListener('click', function () { showAdminCommunities(false); });
    }

    var syncBtn = $('#admin-sync-payments');
    if (syncBtn && !syncBtn.dataset.bound) {
      syncBtn.dataset.bound = '1';
      syncBtn.addEventListener('click', function () {
        if (!requireAdminAccess()) return;
        syncStripePayments({ auto: false });
      });
    }

    var syncBonusBtn = $('#admin-sync-bonuses');
    if (syncBonusBtn && !syncBonusBtn.dataset.bound) {
      syncBonusBtn.dataset.bound = '1';
      syncBonusBtn.addEventListener('click', function () {
        if (!requireAdminAccess()) return;
        syncStripeBonuses({ auto: false });
      });
    }

    var accountAdmin = $('#account-admin');
    if (accountAdmin) {
      accountAdmin.addEventListener('click', function () {
        if (!hasAdminAccess()) {
          lockdownAdmin();
          return;
        }
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
    setAdminVisible: setAdminVisible,
    lockdown: lockdownAdmin,
    hasAccess: hasAdminAccess
  };

  bindUi();
})(window);
