/*
 * villain-assist-flags.js — Kill-switch admin + lectura de feature asistente villanos.
 * Si admin desactiva: la UI debe ocultar la feature (no mostrar deshabilitada).
 */
(function (global) {
  'use strict';

  var LS_KEY = 'pt_villain_assist_admin_enabled';
  var cache = {
    loaded: false,
    enabled: false,
    schemaVersion: 1
  };

  function readLocal() {
    try {
      if (!global.localStorage) return null;
      var v = global.localStorage.getItem(LS_KEY);
      if (v === '1' || v === 'true') return true;
      if (v === '0' || v === 'false') return false;
    } catch (e) { /* */ }
    return null;
  }

  function writeLocal(on) {
    try {
      if (global.localStorage) global.localStorage.setItem(LS_KEY, on ? '1' : '0');
    } catch (e) { /* */ }
  }

  function isEnabled() {
    if (cache.loaded) return !!cache.enabled;
    var local = readLocal();
    if (local != null) return local;
    return false;
  }

  function setLocalEnabled(on) {
    cache.enabled = !!on;
    cache.loaded = true;
    writeLocal(!!on);
  }

  async function refresh() {
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (c && c.rpc) {
        var res = await c.rpc('pt_get_app_setting', { p_key: 'villain_assist_enabled' });
        if (!res.error && res.data != null) {
          var row = Array.isArray(res.data) ? res.data[0] : res.data;
          var val = row && (row.value != null ? row.value : row);
          var on = false;
          if (typeof val === 'boolean') on = val;
          else if (val && typeof val === 'object' && val.enabled != null) on = !!val.enabled;
          else if (val === true || val === 'true' || val === 1 || val === '1') on = true;
          cache.enabled = on;
          cache.loaded = true;
          writeLocal(on);
          return on;
        }
      }
    } catch (e) { /* */ }
    var local = readLocal();
    cache.enabled = local != null ? local : false;
    cache.loaded = true;
    return cache.enabled;
  }

  async function setEnabledAdmin(on) {
    on = !!on;
    setLocalEnabled(on);
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (c && c.rpc) {
        await c.rpc('pt_admin_set_app_setting', {
          p_key: 'villain_assist_enabled',
          p_value: { enabled: on }
        });
      }
    } catch (e) { /* */ }
    return on;
  }

  async function bumpSchemaVersion() {
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (!c || !c.rpc) return null;
      var cur = await c.rpc('pt_get_app_setting', { p_key: 'villain_assist_schema_version' });
      var n = 1;
      if (!cur.error && cur.data != null) {
        var row = Array.isArray(cur.data) ? cur.data[0] : cur.data;
        var val = row && (row.value != null ? row.value : row);
        if (typeof val === 'number') n = val;
        else if (val && val.version != null) n = Number(val.version) || 1;
      }
      n += 1;
      await c.rpc('pt_admin_set_app_setting', {
        p_key: 'villain_assist_schema_version',
        p_value: { version: n }
      });
      cache.schemaVersion = n;
      if (global.PTVillainAssistCache && global.PTVillainAssistCache.clearL1) {
        global.PTVillainAssistCache.clearL1();
      }
      return n;
    } catch (e) {
      return null;
    }
  }

  global.PTVillainAssistFlags = {
    isEnabled: isEnabled,
    refresh: refresh,
    setEnabledAdmin: setEnabledAdmin,
    setLocalEnabled: setLocalEnabled,
    bumpSchemaVersion: bumpSchemaVersion,
    /** Visible en UI solo si admin feature on. */
    isVisible: function () { return isEnabled(); }
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
