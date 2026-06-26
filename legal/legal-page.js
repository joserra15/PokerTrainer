(function () {
  'use strict';
  var cfg = window.PT_LEGAL || {};
  var defaults = {
    controllerName: 'Responsable del tratamiento (configura js/legal-config.js)',
    controllerEmail: 'privacidad@ejemplo.com',
    appUrl: location.origin + location.pathname.replace(/\/legal\/[^/]*$/, '/'),
    lastUpdated: '19 de junio de 2026'
  };
  function val(k) { return cfg[k] || defaults[k] || ''; }
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    var key = el.getAttribute('data-legal');
    el.textContent = val(key);
  });
  document.querySelectorAll('[data-legal-href]').forEach(function (el) {
    if (el.getAttribute('data-legal-href') === 'appUrl') el.setAttribute('href', val('appUrl'));
  });
})();
