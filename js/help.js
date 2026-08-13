/**
 * help.js — Menú de ayuda in-app (atajos, rake, funciones clave).
 */
(function (g) {
  "use strict";

  const PTHelp = {};

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function ensureModal() {
    let modal = document.getElementById("help-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "help-modal";
      modal.className = "modal help-modal hidden";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "help-modal-title");
      modal.innerHTML =
        '<div class="modal-content help-modal-content">' +
        '<div class="help-modal-head">' +
        '<h2 id="help-modal-title">Ayuda</h2>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="help-modal-close" aria-label="Cerrar">Cerrar</button>' +
        "</div>" +
        '<div class="help-modal-body" id="help-modal-body"></div>' +
        "</div>";
      document.body.appendChild(modal);
    }
    if (!modal._ptHelpWired) {
      modal._ptHelpWired = true;
      modal.addEventListener("click", function (e) {
        if (e.target === modal) PTHelp.close();
      });
      const closeBtn = $("#help-modal-close", modal);
      if (closeBtn) closeBtn.addEventListener("click", function () { PTHelp.close(); });
    }
    return modal;
  }

  function bodyHtml() {
    return (
      '<section class="help-section">' +
      "<h3>Atajos de teclado</h3>" +
      '<p class="muted-text">Disponibles en la mesa del entrenador (no en la configuración ni al escribir en campos).</p>' +
      '<table class="help-keys-table"><tbody>' +
      "<tr><th>F</th><td>Fold</td></tr>" +
      "<tr><th>C</th><td>Call</td></tr>" +
      "<tr><th>K / Espacio</th><td>Check (o Call si no hay check)</td></tr>" +
      "<tr><th>R</th><td>Raise / primera opción de bet</td></tr>" +
      "<tr><th>1 · 2 · 3</th><td>1.ª / 2.ª / 3.ª opción de bet o raise</td></tr>" +
      "<tr><th>N</th><td>Nueva / siguiente mano</td></tr>" +
      "<tr><th>→ / Enter</th><td>Siguiente paso en repaso de sesión / siguiente mano filtrada</td></tr>" +
      "<tr><th>←</th><td>Paso anterior o mano filtrada anterior</td></tr>" +
      "<tr><th>G</th><td>En detalle de sesión: filtrar solo errores graves</td></tr>" +
      "<tr><th>H / ?</th><td>Abrir o cerrar esta ayuda</td></tr>" +
      "<tr><th>Esc</th><td>Cerrar este panel</td></tr>" +
      "</tbody></table>" +
      "</section>" +

      '<section class="help-section">' +
      "<h3>Rake en el entrenador</h3>" +
      "<p>En <strong>Configurar sesión</strong> puedes elegir:</p>" +
      "<ul>" +
      "<li><strong>Sin rake</strong> — botes a valor nominal (por defecto).</li>" +
      "<li><strong>Estándar</strong> — ~5 % del bote con tope de 3 bb (orientativo cash mid-stakes).</li>" +
      "<li><strong>Personalizado</strong> — porcentaje y tope en bb a tu medida.</li>" +
      "</ul>" +
      '<p class="muted-text">El rake estimado reduce el bote usado en pot odds y EV del consejo GTO, para entrenar más cerca de cash real. No sustituye el rake exacto de cada sala.</p>' +
      "</section>" +

      '<section class="help-section">' +
      "<h3>Configurar sesión</h3>" +
      "<ul>" +
      "<li><strong>Tipo de mesa</strong> — Cash 6-max, Cash 9-max o MTT (rangos/stacks orientativos; no es un solver de torneo completo).</li>" +
      "<li><strong>Stack, escenario, posición, rivales, calle y rango</strong> — definen el pool de spots.</li>" +
      "<li><strong>Duración</strong> — Continua o bloque de 25 / 50 / 100 manos con resumen al final.</li>" +
      "<li><strong>Avisador en vivo</strong> — consejo previo, o solo toast si el EV perdido ≥ umbral («Solo error grave»).</li>" +
      "<li><strong>Tema de mesa</strong> — tapete Esmeralda / Medianoche / Burdeos.</li>" +
      "</ul>" +
      "</section>" +

      '<section class="help-section">' +
      "<h3>Funciones útiles</h3>" +
      "<ul>" +
      "<li><strong>Drill adaptativo</strong> (Estadísticas / Errores) — prioriza tus fugas por EV perdido (~25 manos), no un muestreo al azar de todos los errores.</li>" +
      "<li><strong>Selectores de cartas</strong> — en Rangos (flop) y Análisis eliges cartas en un modal, sin teclear notación.</li>" +
      "<li><strong>Rangos preflop + flop HU</strong> — matriz y contexto de calle en la pestaña Rangos.</li>" +
      "<li><strong>Import de sesiones</strong> — PokerStars (ES/EN), Winamax, GGPoker/Natural8, 888poker y CoinPoker (cash/spins/torneos); multi-archivo.</li>" +
      "<li><strong>Export</strong> — JSON / CSV / PDF-imprimir en el detalle de sesión.</li>" +
      "<li><strong>Calentamiento</strong> — atajo desde Inicio para un bloque corto con avisador.</li>" +
      "<li><strong>Repetir spots fallados</strong> — checkbox en la mesa del entrenador.</li>" +
      "<li><strong>PWA</strong> — instala la app desde la landing o Configuración.</li>" +
      "</ul>" +
      "</section>" +

      '<section class="help-section">' +
      "<h3>Más información</h3>" +
      "<ul>" +
      '<li><a href="legal/faq.html" target="_blank" rel="noopener">FAQ completa</a></li>' +
      '<li><a href="legal/metodologia.html" target="_blank" rel="noopener">Metodología GTO</a></li>' +
      '<li><a href="legal/soporte.html" target="_blank" rel="noopener">Soporte</a></li>' +
      '<li>Pestaña <strong>Guía básica</strong> — conceptos para empezar.</li>' +
      "</ul>" +
      "</section>"
    );
  }

  PTHelp.open = function open() {
    const modal = ensureModal();
    const body = $("#help-modal-body", modal);
    if (body) body.innerHTML = bodyHtml();
    modal.classList.remove("hidden");
    document.body.classList.add("help-modal-open");
    const closeBtn = $("#help-modal-close", modal);
    if (closeBtn) {
      try { closeBtn.focus(); } catch (_) { /* ignore */ }
    }
  };

  PTHelp.close = function close() {
    const modal = document.getElementById("help-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.classList.remove("help-modal-open");
  };

  PTHelp.toggle = function toggle() {
    const modal = document.getElementById("help-modal");
    if (modal && !modal.classList.contains("hidden")) PTHelp.close();
    else PTHelp.open();
  };

  PTHelp.bind = function bind() {
    ensureModal();
    document.querySelectorAll("[data-open-help], #btn-help").forEach(function (btn) {
      if (btn._ptHelpBound) return;
      btn._ptHelpBound = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        PTHelp.open();
      });
    });
  };

  g.PTHelp = PTHelp;
})(typeof window !== "undefined" ? window : globalThis);
