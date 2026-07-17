/*
 * account-settings.js — Pantalla de configuración de cuenta del usuario.
 */
(function (global) {
  'use strict';

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

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function formatMoney(cents, currency) {
    if (cents == null || isNaN(cents)) return '—';
    var cur = String(currency || 'eur').toUpperCase();
    var amount = (Number(cents) / 100).toFixed(2);
    if (cur === 'EUR') return amount.replace('.', ',') + ' €';
    return amount + ' ' + cur;
  }

  function planLabel(plan) {
    var labels = { free: 'Gratis', pro: 'Study', premium: 'Coach' };
    return labels[plan] || plan || '—';
  }

  function paymentKindLabel(kind) {
    if (kind === 'subscription') return 'Suscripción';
    if (kind === 'renewal') return 'Renovación';
    if (kind === 'bonus') return 'Bono IA';
    if (kind === 'invoice') return 'Factura';
    if (kind === 'promo') return 'Promoción';
    return kind || 'Pago';
  }

  function bonusReasonLabel(reason) {
    if (reason === 'purchase') return 'Compra';
    if (reason === 'gift') return 'Bono IA';
    if (reason === 'promo') return 'Promoción';
    if (reason === 'ai_usage') return 'Uso IA';
    return reason || '—';
  }

  function bonusPackLabel(packCode, reason) {
    if (packCode === 'gift' || reason === 'gift') return 'Bono de regalo';
    if (reason === 'promo' && packCode) return 'Código ' + packCode;
    if (packCode === 'gift') return 'Bono de regalo';
    return packCode || '';
  }

  function row(label, value) {
    return '<div class="account-settings-row"><span>' + escapeHtml(label) + '</span><strong>' + value + '</strong></div>';
  }

  function usageRows(ent) {
    if (!ent) return '';
    var html = '';
    var lim = ent.limits || {};
    var use = ent.usage || {};
    if (lim.trainer_hands_per_day != null) {
      html += row('Entrenador hoy', escapeHtml(use.trainer_hands_today + ' / ' + lim.trainer_hands_per_day));
    }
    if (lim.import_sessions_per_month != null) {
      html += row('Imports mes', escapeHtml((use.import_sessions_month || 0) + ' / ' + lim.import_sessions_per_month));
    }
    if (global.PTEntitlements && global.PTEntitlements.aiQuotaSummary) {
      var ai = global.PTEntitlements.aiQuotaSummary(ent);
      html += row('Consultas IA', escapeHtml(ai.label));
    }
    return html;
  }

  function paymentsTable(payments) {
    if (!payments || !payments.length) {
      return '<p class="muted-text">No hay pagos registrados todavía. Si acabas de pagar, pulsa «Actualizar pagos».</p>';
    }
    return '<div class="account-settings-table-wrap"><table class="account-settings-table">' +
      '<thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody>' +
      payments.map(function (p) {
        var concept = p.description || paymentKindLabel(p.kind);
        if (p.kind === 'promo' && p.pack_code && String(concept).indexOf(p.pack_code) < 0) {
          concept = concept + ' (' + p.pack_code + ')';
        }
        var amount = p.kind === 'promo' && (p.amount_cents == null || Number(p.amount_cents) === 0)
          ? 'Gratis'
          : formatMoney(p.amount_cents, p.currency);
        return '<tr><td>' + escapeHtml(formatDate(p.paid_at)) + '</td>' +
          '<td>' + escapeHtml(concept) + '</td>' +
          '<td>' + escapeHtml(paymentKindLabel(p.kind)) + '</td>' +
          '<td>' + escapeHtml(amount) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function bonusTable(ledger) {
    if (!ledger || !ledger.length) {
      return '<p class="muted-text">Sin movimientos de bono.</p>';
    }
    return '<div class="account-settings-table-wrap"><table class="account-settings-table">' +
      '<thead><tr><th>Fecha</th><th>Movimiento</th><th>Δ</th><th>Saldo</th></tr></thead><tbody>' +
      ledger.map(function (l) {
        return '<tr><td>' + escapeHtml(formatDate(l.created_at)) + '</td>' +
          '<td>' + escapeHtml(bonusReasonLabel(l.reason)) +
          (bonusPackLabel(l.pack_code, l.reason) ? ' (' + escapeHtml(bonusPackLabel(l.pack_code, l.reason)) + ')' : '') + '</td>' +
          '<td>' + (l.delta > 0 ? '+' : '') + escapeHtml(l.delta) + '</td>' +
          '<td>' + escapeHtml(l.balance_after) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function render(data, user) {
    var host = $('#account-settings-content');
    if (!host) return;
    var prof = (data && data.profile) || {};
    var ent = (global.PTEntitlements && global.PTEntitlements.get ? global.PTEntitlements.get() : null)
      || (data && data.entitlements)
      || {};
    var payments = (data && data.payments) || [];
    var bonus = (data && data.bonus_ledger) || [];
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    var billingOn = global.PTBilling && global.PTBilling.enabled && global.PTBilling.enabled();
    var showBilling = billingOn && (prof.plan !== 'free' || prof.subscription_status === 'active');
    var cloudLabels = { disabled: 'Desactivado', pending: 'Pendiente', ready: 'Listo', syncing: 'Sincronizando…', online: 'Sincronizado', error: 'Error' };
    var cloudStatus = global.PTCloud && global.PTCloud.getStatus ? global.PTCloud.getStatus() : { status: 'disabled' };

    host.innerHTML =
      '<div class="account-settings-grid">' +
      '<section class="account-settings-card card-box">' +
      '<h3>Perfil</h3>' +
      row('Nombre', escapeHtml(user.name || prof.name || '—')) +
      row('Correo', escapeHtml(user.email || prof.email || '—')) +
      (user.emailVerified ? row('Verificado', 'Sí') : '') +
      (prof.is_admin ? row('Rol', '<span class="account-settings-admin">Administrador</span>') : '') +
      (user.locale ? row('Idioma', escapeHtml(user.locale)) : '') +
      row('ID', '<code>' + escapeHtml((prof.user_id || user.sub || '').slice(0, 16)) + '…</code>') +
      row('Registro', escapeHtml(formatDate(prof.created_at))) +
      row('Última conexión', escapeHtml(formatDate(prof.last_seen_at))) +
      '</section>' +

      '<section class="account-settings-card card-box">' +
      '<h3>Plan y suscripción</h3>' +
      row('Plan actual', escapeHtml(ent.plan_label || planLabel(prof.plan))) +
      row('Estado', escapeHtml(
        prof.subscription_status === 'trialing' ? 'Promoción / prueba' : (prof.subscription_status || 'none')
      )) +
      row('Fin periodo', escapeHtml(formatDate(prof.subscription_period_end))) +
      row('Intervalo', escapeHtml(prof.billing_interval || '—')) +
      (prof.subscription_cancel_at_period_end ? row('Renovación', 'Sin renovación automática') : '') +
      '<div class="account-settings-actions">' +
      (showBilling ? '<button type="button" class="btn btn-ghost btn-sm" id="settings-billing">Gestionar suscripción</button>' : '') +
      '<button type="button" class="btn btn-primary btn-sm" id="settings-upgrade">Ver planes</button>' +
      '</div>' +
      '</section>' +

      '<section class="account-settings-card card-box">' +
      '<h3>Uso y límites</h3>' +
      row('Nube', escapeHtml(cloudLabels[cloudStatus.status] || cloudStatus.status)) +
      usageRows(ent) +
      '<div id="account-settings-usage-host" class="usage-quota-host" style="margin-top:10px"></div>' +
      '</section>' +

      '<section class="account-settings-card card-box account-settings-card-wide">' +
      '<div class="account-settings-card-head">' +
      '<h3>Pagos realizados</h3>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="settings-sync-payments">Actualizar pagos</button>' +
      '</div>' +
      paymentsTable(payments) +
      '</section>' +

      '<section class="account-settings-card card-box account-settings-card-wide">' +
      '<h3>Bonos IA</h3>' +
      bonusTable(bonus) +
      '</section>' +

      '<section class="account-settings-card card-box">' +
      '<h3>Privacidad y datos</h3>' +
      '<div class="account-settings-actions account-settings-actions-stack">' +
      '<button type="button" class="btn btn-ghost btn-block" id="settings-export">Exportar mis datos</button>' +
      '<button type="button" class="btn btn-ghost btn-block" id="settings-cookies">Configurar cookies</button>' +
      '<label class="account-marketing" id="account-marketing-consent">' +
      '<input type="checkbox" /> Avisos por email si dejo de entrenar' +
      '</label>' +
      '<button type="button" class="btn btn-danger btn-block" id="settings-delete">Eliminar cuenta y datos</button>' +
      '</div>' +
      '</section>' +

      '<section class="account-settings-card card-box">' +
      '<h3>Más opciones</h3>' +
      '<div class="account-settings-actions account-settings-actions-stack">' +
      '<button type="button" class="btn btn-ghost btn-block" id="settings-sync">Sincronizar datos</button>' +
      '<button type="button" class="btn btn-ghost btn-block" id="settings-contact">Contacto / soporte</button>' +
      '<button type="button" class="btn btn-ghost btn-block hidden" id="account-install-app">Instalar app</button>' +
      (user.isAdmin ? '<button type="button" class="btn btn-ghost btn-block' + (demoOn ? ' hidden' : '') + '" id="account-demo">Modo demo</button>' : '') +
      (demoOn ? '<button type="button" class="btn btn-primary btn-block" id="account-stop-demo">Parar demo</button>' : '') +
      '</div>' +
      '</section>' +
      '</div>';

    if (global.PTUsageUI && global.PTUsageUI.renderWidget) {
      global.PTUsageUI.renderWidget($('#account-settings-usage-host'), ent);
    }
    if (global.PTReEngage && global.PTReEngage.bindAccountToggle) {
      global.PTReEngage.bindAccountToggle();
    }
    if (global.PTPwa && global.PTPwa.updateInstallUI) {
      global.PTPwa.updateInstallUI();
    }
    bindActions();
  }

  function bindActions() {
    var billing = $('#settings-billing');
    if (billing) {
      billing.onclick = function () {
        if (global.PTBilling && global.PTBilling.openPortal) {
          global.PTBilling.openPortal().catch(function (e) {
            alert(e.message || 'No se pudo abrir el portal.');
          });
        }
      };
    }
    var upgrade = $('#settings-upgrade');
    if (upgrade) upgrade.onclick = function () {
      if (global.goToTab) global.goToTab('pricing');
    };
    var sync = $('#settings-sync');
    if (sync) {
      sync.onclick = function () {
        if (typeof global.runCloudSync === 'function') global.runCloudSync(sync);
        else if (global.PTCloud && global.PTCloud.syncNow) {
          sync.disabled = true;
          global.PTCloud.syncNow().finally(function () { sync.disabled = false; });
        }
      };
    }
    var syncPay = $('#settings-sync-payments');
    if (syncPay) {
      syncPay.onclick = function () {
        syncPayments(syncPay);
      };
    }
    var exportBtn = $('#settings-export');
    if (exportBtn && global.PTAuth && global.PTAuth.exportAccountData) {
      exportBtn.onclick = function () { global.PTAuth.exportAccountData(); };
    }
    var deleteBtn = $('#settings-delete');
    if (deleteBtn && global.PTAuth && global.PTAuth.deleteAccount) {
      deleteBtn.onclick = function () { global.PTAuth.deleteAccount(); };
    }
    var cookiesBtn = $('#settings-cookies');
    if (cookiesBtn) {
      cookiesBtn.onclick = function () {
        if (global.PTLegal && global.PTLegal.showCookieBanner) global.PTLegal.showCookieBanner();
      };
    }
    var contactBtn = $('#settings-contact');
    if (contactBtn) {
      contactBtn.onclick = function () {
        if (global.goToTab) global.goToTab('contact');
      };
    }
    var installBtn = $('#account-install-app');
    if (installBtn && global.PTPwa && global.PTPwa.installApp) {
      installBtn.onclick = function () { global.PTPwa.installApp(); };
    }
    if (global.PTDemo) {
      var demoBtn = $('#account-demo');
      var stopDemoBtn = $('#account-stop-demo');
      if (demoBtn && !demoBtn.dataset.bound) {
        demoBtn.dataset.bound = '1';
        demoBtn.onclick = function () {
          var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
          if (u && u.isAdmin && global.PTDemo.start) global.PTDemo.start();
        };
      }
      if (stopDemoBtn && !stopDemoBtn.dataset.bound) {
        stopDemoBtn.dataset.bound = '1';
        stopDemoBtn.onclick = function () {
          if (global.PTDemo.stop) global.PTDemo.stop();
        };
      }
    }
  }

  async function syncPayments(btn) {
    if (!global.PTBilling || !global.PTBilling.syncMyPayments) {
      alert('Sincronización de pagos no disponible.');
      return;
    }
    if (btn) btn.disabled = true;
    try {
      await global.PTBilling.syncMyPayments();
      if (global.PTEntitlements && global.PTEntitlements.refresh) {
        await global.PTEntitlements.refresh();
      }
      await load(true);
    } catch (e) {
      alert(e.message || 'No se pudieron actualizar los pagos.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function load(skipSync) {
    var host = $('#account-settings-content');
    var user = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (!host || !user) return;
    host.innerHTML = '<div class="account-settings-loading"><div class="play-boot-spinner"></div><p class="muted-text">Cargando configuración…</p></div>';

    if (!skipSync && global.PTBilling && global.PTBilling.enabled()) {
      try {
        if (global.PTBilling.syncMyPayments) await global.PTBilling.syncMyPayments();
        else if (global.PTBilling.syncBonusPurchases) await global.PTBilling.syncBonusPurchases();
      } catch (e) { /* noop */ }
    }
    if (!skipSync && global.PTEntitlements && global.PTEntitlements.refresh) {
      await global.PTEntitlements.refresh().catch(function () {});
    }

    var c = client();
    if (!c) {
      render(null, user);
      return;
    }
    var res = await c.rpc('pt_get_account_settings');
    if (res.error) {
      host.innerHTML = '<p class="admin-error">' + escapeHtml(res.error.message) + '</p>';
      return;
    }
    render(res.data, user);
  }

  global.PTAccountSettings = {
    render: load,
    refresh: function () { return load(true); }
  };
})(window);
