/*
 * admin-message-templates.js — Plantillas de mensajes preconfigurados (panel Admin).
 * Usa {nombre} en asunto/cuerpo; al enviar se sustituye por el primer nombre del usuario.
 */
(function (global) {
  'use strict';

  var bound = false;
  var templates = [];
  var loadPromise = null;

  function $(sel) { return document.querySelector(sel); }

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

  function hasAdminAccess() {
    return !!(global.PTAdmin && global.PTAdmin.hasAccess && global.PTAdmin.hasAccess());
  }

  function requireAdminAccess() {
    if (hasAdminAccess()) return true;
    clearTemplatesUi();
    if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
    return false;
  }

  function isForbiddenError(err) {
    if (!err) return false;
    var msg = String(err.message || err.code || err || '').toLowerCase();
    return msg.indexOf('forbidden') >= 0
      || msg.indexOf('not authorized') >= 0
      || msg.indexOf('permission') >= 0
      || err.code === '42501';
  }

  function setStatus(msg) {
    var el = $('#admin-msg-templates-status');
    if (el) el.textContent = msg || '';
  }

  function setError(msg) {
    var el = $('#admin-msg-templates-error');
    if (el) el.textContent = msg || '';
  }

  function firstNameFrom(userName) {
    var n = String(userName || '').trim();
    if (!n) return '';
    return n.split(/\s+/)[0] || '';
  }

  /** Sustituye {nombre}/{name} (y {{nombre}}) por el primer nombre. */
  function personalize(text, userName) {
    var out = String(text == null ? '' : text);
    var first = firstNameFrom(userName) || 'jugador';
    out = out.replace(/\{\{\s*nombre\s*\}\}/gi, first);
    out = out.replace(/\{\{\s*name\s*\}\}/gi, first);
    out = out.replace(/\{\s*nombre\s*\}/gi, first);
    out = out.replace(/\{\s*name\s*\}/gi, first);
    return out;
  }

  function activeTemplates() {
    return templates.filter(function (t) { return t && t.is_active !== false; });
  }

  function getById(id) {
    return templates.find(function (t) { return t.id === id; }) || null;
  }

  function hideOtherAdminPanels() {
    [
      'admin-users-panel',
      'admin-messages-panel',
      'admin-promos-panel',
      'admin-usage-panel',
      'admin-communities-panel',
      'admin-villain-assist-panel'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  function showTemplatesPanel(show) {
    if (show && !requireAdminAccess()) return;
    var panel = $('#admin-msg-templates-panel');
    if (!panel) return;
    if (show) {
      hideOtherAdminPanels();
      panel.classList.remove('hidden');
      loadTemplates({ force: true });
    } else {
      panel.classList.add('hidden');
      var usersPanel = $('#admin-users-panel');
      if (usersPanel) usersPanel.classList.remove('hidden');
    }
  }

  function formValues() {
    return {
      title: (($('#admin-msg-tpl-title') && $('#admin-msg-tpl-title').value) || '').trim(),
      subject: (($('#admin-msg-tpl-subject') && $('#admin-msg-tpl-subject').value) || '').trim(),
      body: (($('#admin-msg-tpl-body') && $('#admin-msg-tpl-body').value) || '').trim(),
      sort_order: Number(($('#admin-msg-tpl-sort') && $('#admin-msg-tpl-sort').value) || 0) || 0
    };
  }

  function clearCreateForm() {
    var title = $('#admin-msg-tpl-title');
    var subject = $('#admin-msg-tpl-subject');
    var body = $('#admin-msg-tpl-body');
    var sort = $('#admin-msg-tpl-sort');
    if (title) title.value = '';
    if (subject) subject.value = '';
    if (body) body.value = '';
    if (sort) sort.value = '0';
  }

  function renderList() {
    var host = $('#admin-msg-templates-list');
    if (!host) return;
    if (!templates.length) {
      host.innerHTML = '<p class="muted-text">Aún no hay plantillas. Crea la primera arriba.</p>';
      return;
    }
    host.innerHTML = '<div class="admin-table-wrap"><table class="admin-table admin-msg-templates-table">' +
      '<thead><tr>' +
      '<th>Título</th><th>Asunto</th><th>Orden</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>' +
      templates.map(function (t) {
        return '<tr data-tpl-id="' + escapeHtml(t.id) + '">' +
          '<td>' + escapeHtml(t.title) + '</td>' +
          '<td>' + escapeHtml(t.subject || '—') + '</td>' +
          '<td><input type="number" class="admin-msg-tpl-sort-input" data-tpl-sort="' +
            escapeHtml(t.id) + '" value="' + escapeHtml(t.sort_order) + '" /></td>' +
          '<td>' + (t.is_active
            ? '<span class="admin-promo-badge admin-promo-badge-on">Activa</span>'
            : '<span class="admin-promo-badge admin-promo-badge-off">Inactiva</span>') +
          '</td>' +
          '<td class="admin-promo-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-tpl-edit="' + escapeHtml(t.id) + '">Editar</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-tpl-toggle="' + escapeHtml(t.id) + '">' +
          (t.is_active ? 'Desactivar' : 'Activar') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-tpl-save="' + escapeHtml(t.id) + '">Guardar orden</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-tpl-delete="' + escapeHtml(t.id) + '">Eliminar</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>';

    host.querySelectorAll('[data-tpl-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = getById(btn.getAttribute('data-tpl-edit'));
        if (!t) return;
        openEditForm(t);
      });
    });
    host.querySelectorAll('[data-tpl-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tpl-toggle');
        var t = getById(id);
        if (!t) return;
        updateTemplate(id, { p_is_active: !t.is_active });
      });
    });
    host.querySelectorAll('[data-tpl-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tpl-save');
        var sortEl = host.querySelector('[data-tpl-sort="' + id + '"]');
        updateTemplate(id, { p_sort_order: Number(sortEl && sortEl.value) || 0 });
      });
    });
    host.querySelectorAll('[data-tpl-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tpl-delete');
        var t = getById(id);
        if (!t) return;
        if (!global.confirm('¿Eliminar la plantilla «' + t.title + '»?')) return;
        deleteTemplate(id);
      });
    });
  }

  function openEditForm(t) {
    var box = $('#admin-msg-tpl-edit');
    if (!box || !t) return;
    box.classList.remove('hidden');
    box.innerHTML =
      '<h4>Editar plantilla</h4>' +
      '<label class="admin-invite-label" for="admin-msg-tpl-edit-title">Título interno</label>' +
      '<input type="text" id="admin-msg-tpl-edit-title" class="admin-promo-input" maxlength="120" value="' +
        escapeHtml(t.title) + '" />' +
      '<label class="admin-invite-label" for="admin-msg-tpl-edit-subject">Asunto</label>' +
      '<input type="text" id="admin-msg-tpl-edit-subject" class="admin-promo-input" maxlength="200" value="' +
        escapeHtml(t.subject || '') + '" />' +
      '<label class="admin-invite-label" for="admin-msg-tpl-edit-body">Mensaje</label>' +
      '<textarea id="admin-msg-tpl-edit-body" class="admin-promo-textarea" rows="6" maxlength="3000">' +
        escapeHtml(t.body || '') + '</textarea>' +
      '<p class="muted-text">Usa <code>{nombre}</code> en el saludo; se sustituye por el primer nombre del destinatario.</p>' +
      '<div class="admin-promo-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="admin-msg-tpl-edit-save" data-id="' +
        escapeHtml(t.id) + '">Guardar cambios</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-msg-tpl-edit-cancel">Cancelar</button>' +
      '</div>';
    var save = $('#admin-msg-tpl-edit-save');
    var cancel = $('#admin-msg-tpl-edit-cancel');
    if (cancel) {
      cancel.onclick = function () {
        box.classList.add('hidden');
        box.innerHTML = '';
      };
    }
    if (save) {
      save.onclick = function () {
        updateTemplate(t.id, {
          p_title: (($('#admin-msg-tpl-edit-title') && $('#admin-msg-tpl-edit-title').value) || '').trim(),
          p_subject: (($('#admin-msg-tpl-edit-subject') && $('#admin-msg-tpl-edit-subject').value) || '').trim(),
          p_body: (($('#admin-msg-tpl-edit-body') && $('#admin-msg-tpl-edit-body').value) || '').trim()
        }).then(function () {
          box.classList.add('hidden');
          box.innerHTML = '';
        });
      };
    }
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearTemplatesUi() {
    templates = [];
    loadPromise = null;
    var host = $('#admin-msg-templates-list');
    if (host) host.innerHTML = '';
    var edit = $('#admin-msg-tpl-edit');
    if (edit) {
      edit.innerHTML = '';
      edit.classList.add('hidden');
    }
    setStatus('');
    setError('');
    var panel = $('#admin-msg-templates-panel');
    if (panel) panel.classList.add('hidden');
  }

  async function loadTemplates(opts) {
    opts = opts || {};
    if (!hasAdminAccess()) {
      templates = [];
      return [];
    }
    if (loadPromise && !opts.force) return loadPromise;
    var c = client();
    if (!c) {
      setError('Supabase no disponible');
      return [];
    }
    loadPromise = (async function () {
      if (opts.force) setStatus('Cargando plantillas…');
      var res = await c.rpc('pt_admin_list_message_templates');
      if (!hasAdminAccess()) {
        templates = [];
        return [];
      }
      if (res.error) {
        setStatus('');
        if (isForbiddenError(res.error)) {
          clearTemplatesUi();
          if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
          return [];
        }
        if (opts.force) setError(res.error.message || 'No se pudieron cargar las plantillas');
        return templates;
      }
      templates = (res.data && res.data.templates) || [];
      if (opts.force) {
        setError('');
        setStatus(templates.length + ' plantilla' + (templates.length === 1 ? '' : 's'));
        renderList();
      }
      return templates;
    })();
    try {
      return await loadPromise;
    } finally {
      loadPromise = null;
    }
  }

  async function createTemplate() {
    if (!requireAdminAccess()) return;
    var vals = formValues();
    if (!vals.title) {
      setError('Indica un título interno para la plantilla');
      return;
    }
    if (!vals.body) {
      setError('El mensaje de la plantilla no puede estar vacío');
      return;
    }
    var c = client();
    if (!c) {
      setError('Supabase no disponible');
      return;
    }
    setError('');
    setStatus('Guardando…');
    var res = await c.rpc('pt_admin_create_message_template', {
      p_title: vals.title,
      p_subject: vals.subject,
      p_body: vals.body,
      p_sort_order: vals.sort_order
    });
    if (!requireAdminAccess()) return;
    if (res.error) {
      setStatus('');
      if (isForbiddenError(res.error)) {
        clearTemplatesUi();
        if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
        return;
      }
      setError(res.error.message || 'No se pudo crear la plantilla');
      return;
    }
    clearCreateForm();
    setStatus('Plantilla creada');
    await loadTemplates({ force: true });
  }

  async function updateTemplate(id, args) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c) return;
    setError('');
    setStatus('Guardando…');
    var payload = { p_id: id };
    Object.keys(args || {}).forEach(function (k) { payload[k] = args[k]; });
    var res = await c.rpc('pt_admin_update_message_template', payload);
    if (!requireAdminAccess()) return;
    if (res.error) {
      setStatus('');
      if (isForbiddenError(res.error)) {
        clearTemplatesUi();
        if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
        return;
      }
      setError(res.error.message || 'No se pudo actualizar');
      return;
    }
    setStatus('Plantilla actualizada');
    await loadTemplates({ force: true });
  }

  async function deleteTemplate(id) {
    if (!requireAdminAccess()) return;
    var c = client();
    if (!c) return;
    setError('');
    setStatus('Eliminando…');
    var res = await c.rpc('pt_admin_delete_message_template', { p_id: id });
    if (!requireAdminAccess()) return;
    if (res.error) {
      setStatus('');
      if (isForbiddenError(res.error)) {
        clearTemplatesUi();
        if (global.PTAdmin && global.PTAdmin.lockdown) global.PTAdmin.lockdown();
        return;
      }
      setError(res.error.message || 'No se pudo eliminar');
      return;
    }
    setStatus('Plantilla eliminada');
    await loadTemplates({ force: true });
  }

  /**
   * HTML del selector para insertar en formularios de redacción.
   * @param {string} selectId
   */
  function pickerHtml(selectId) {
    var id = selectId || 'admin-msg-tpl-picker';
    var opts = activeTemplates().map(function (t) {
      return '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.title) + '</option>';
    }).join('');
    return (
      '<div class="admin-msg-tpl-picker-wrap">' +
      '<label for="' + escapeHtml(id) + '">Plantilla</label>' +
      '<select id="' + escapeHtml(id) + '" class="admin-msg-tpl-picker" data-admin-msg-tpl-picker>' +
      '<option value="">— Escribir a mano / elegir plantilla —</option>' +
      opts +
      '</select>' +
      '<p class="muted-text admin-msg-tpl-hint">Si la plantilla usa <code>{nombre}</code>, el saludo tomará el nombre del destinatario.</p>' +
      '</div>'
    );
  }

  /**
   * Aplica una plantilla a campos subject/body.
   * Si personalizeNow y hay userName, sustituye {nombre} en el preview.
   */
  function applyToFields(templateId, fields, opts) {
    opts = opts || {};
    var t = getById(templateId);
    if (!t || !fields) return null;
    var subject = t.subject || '';
    var body = t.body || '';
    if (opts.personalizeNow) {
      subject = personalize(subject, opts.userName);
      body = personalize(body, opts.userName);
    }
    if (fields.subject) {
      fields.subject.value = subject;
      fields.subject.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (fields.body) {
      fields.body.value = body;
      fields.body.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { subject: subject, body: body, template: t };
  }

  /**
   * Enlaza un <select> de plantillas a subject/body.
   * opts.resolveUserName: fn() → string (nombre del destinatario si es uno solo)
   * opts.shouldPersonalize: fn() → bool
   * opts.onApplied: fn(result)
   */
  function bindPicker(selectEl, fields, opts) {
    if (!selectEl || selectEl.dataset.tplBound) return;
    selectEl.dataset.tplBound = '1';
    opts = opts || {};
    selectEl.addEventListener('change', function () {
      var id = selectEl.value;
      if (!id) return;
      var userName = opts.resolveUserName ? opts.resolveUserName() : '';
      var doPersonalize = opts.shouldPersonalize
        ? !!opts.shouldPersonalize()
        : !!userName;
      var result = applyToFields(id, fields, {
        personalizeNow: doPersonalize,
        userName: userName
      });
      if (opts.onApplied) opts.onApplied(result);
    });
  }

  async function ensurePicker(selectId, fields, opts) {
    await loadTemplates();
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var current = sel.value;
    var html = pickerHtml(selectId);
    var wrap = sel.closest('.admin-msg-tpl-picker-wrap');
    if (wrap) {
      wrap.outerHTML = html;
    } else {
      sel.outerHTML = html;
    }
    sel = document.getElementById(selectId);
    if (sel && current) sel.value = current;
    bindPicker(sel, fields, opts);
  }

  function bindUi() {
    if (bound) return;
    bound = true;

    var openBtn = $('#admin-msg-templates-btn');
    var backBtn = $('#admin-msg-templates-back');
    if (openBtn) {
      openBtn.addEventListener('click', function () { showTemplatesPanel(true); });
    }
    if (backBtn) {
      backBtn.addEventListener('click', function () { showTemplatesPanel(false); });
    }

    var createBtn = $('#admin-msg-tpl-create');
    if (createBtn) createBtn.addEventListener('click', function () { createTemplate(); });

    // Al abrir otros paneles, ocultar plantillas
    ['admin-messages-btn', 'admin-promos-btn', 'admin-usage-btn',
      'admin-communities-btn', 'admin-villain-assist-btn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.dataset.tplHideBound) return;
      btn.dataset.tplHideBound = '1';
      btn.addEventListener('click', function () {
        var panel = $('#admin-msg-templates-panel');
        if (panel) panel.classList.add('hidden');
      });
    });
  }

  global.PTAdminMessageTemplates = {
    bindUi: bindUi,
    load: loadTemplates,
    show: showTemplatesPanel,
    clear: clearTemplatesUi,
    personalize: personalize,
    firstNameFrom: firstNameFrom,
    getTemplates: function () { return templates.slice(); },
    getActiveTemplates: activeTemplates,
    pickerHtml: pickerHtml,
    applyToFields: applyToFields,
    bindPicker: bindPicker,
    ensurePicker: ensurePicker
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }
})(window);
