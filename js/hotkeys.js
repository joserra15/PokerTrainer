/**
 * Hotkeys del trainer + repaso de sesión (SN-52).
 * F fold · C call · K/Espacio check/call · R raise/bet · 1–3 tamaños · N nueva · →/Enter siguiente · H/? ayuda
 */
(function (g) {
  "use strict";

  const PTHotkeys = {};

  function isTypingTarget(el) {
    if (!el || !(el instanceof Element)) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return !!el.closest("input, textarea, select, [contenteditable='true']");
  }

  function anyModalOpen() {
    return !!document.querySelector(
      ".modal:not(.hidden)[role='dialog'], .modal:not(.hidden)#help-modal, #help-modal:not(.hidden), #paywall-modal:not(.hidden), #card-picker-modal:not(.hidden), #range-matrix-modal:not(.hidden), #modal:not(.hidden), #age-gate-modal:not(.hidden)"
    );
  }

  function trainerVisible() {
    const play = document.getElementById("view-play") || document.getElementById("tab-play");
    if (!play || play.hidden || play.classList.contains("hidden")) return false;
    if (play.classList.contains("tab-panel") && !play.classList.contains("active")) return false;
    const setup = document.getElementById("play-setup");
    if (setup && !setup.hidden && !setup.classList.contains("hidden")) return false;
    const active = document.getElementById("play-active");
    if (active && (active.hidden || active.classList.contains("hidden"))) return false;
    return true;
  }

  function clickFirst(sel) {
    const el = document.querySelector(sel);
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return false;
    try {
      el.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function actionButtons() {
    return Array.from(document.querySelectorAll("#actions button[data-action]")).filter(
      (b) => !b.disabled && b.offsetParent !== null
    );
  }

  function findAction(name) {
    return actionButtons().find((b) => (b.getAttribute("data-action") || "") === name) || null;
  }

  function isAggressiveId(id) {
    return id === "raise" || id === "bet" || (id && id.indexOf("bet_") === 0);
  }

  function aggressiveButtons() {
    return actionButtons().filter((b) => isAggressiveId(b.getAttribute("data-action") || ""));
  }

  function clickAction(btn) {
    if (!btn) return false;
    try {
      btn.click();
      return true;
    } catch (_) {
      return false;
    }
  }

  function handleTrainerKey(e) {
    if (!trainerVisible()) return false;
    const k = e.key;
    const lower = k.length === 1 ? k.toLowerCase() : k;

    if (lower === "f") {
      e.preventDefault();
      return clickAction(findAction("fold"));
    }
    if (lower === "c") {
      e.preventDefault();
      return clickAction(findAction("call"));
    }
    if (lower === "k" || k === " ") {
      e.preventDefault();
      return clickAction(findAction("check")) || clickAction(findAction("call"));
    }
    if (lower === "r") {
      e.preventDefault();
      const agg = aggressiveButtons();
      return clickAction(agg[0] || findAction("raise"));
    }
    if (k === "1" || k === "2" || k === "3") {
      const idx = Number(k) - 1;
      const btn = aggressiveButtons()[idx];
      if (btn) {
        e.preventDefault();
        return clickAction(btn);
      }
      return false;
    }
    if (lower === "n") {
      e.preventDefault();
      return (
        clickFirst("#next-after") ||
        clickFirst("#new-hand") ||
        clickFirst("#btn-new") ||
        clickFirst("#btn-next-hand")
      );
    }
    return false;
  }

  function handleReplayKey(e) {
    const k = e.key;
    if (k === "ArrowRight" || k === "Enter") {
      if (clickFirst("#replay-next")) {
        e.preventDefault();
        return true;
      }
      if (clickFirst("#replay-actions button[data-act='next']")) {
        e.preventDefault();
        return true;
      }
    }
    if (k === "ArrowLeft") {
      if (clickFirst("#replay-actions button[data-act='prev']")) {
        e.preventDefault();
        return true;
      }
    }
    return false;
  }

  function handleHelpKey(e) {
    const k = e.key;
    if (k === "?" || (e.shiftKey && k === "/") || k.toLowerCase() === "h") {
      if (typeof g.PTHelp === "object" && typeof g.PTHelp.toggle === "function") {
        e.preventDefault();
        g.PTHelp.toggle();
        return true;
      }
      const btn = document.getElementById("btn-help");
      if (btn) {
        e.preventDefault();
        btn.click();
        return true;
      }
    }
    return false;
  }

  function onKeyDown(e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (anyModalOpen()) {
      if (e.key === "Escape" && typeof g.PTHelp === "object" && typeof g.PTHelp.close === "function") {
        const hm = document.getElementById("help-modal");
        if (hm && !hm.classList.contains("hidden")) {
          e.preventDefault();
          g.PTHelp.close();
        }
      }
      return;
    }
    if (handleHelpKey(e)) return;
    if (handleTrainerKey(e)) return;
    handleReplayKey(e);
  }

  let bound = false;
  PTHotkeys.bind = function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("keydown", onKeyDown, true);
  };

  PTHotkeys.hintForAction = function hintForAction(id) {
    if (id === "fold") return "F";
    if (id === "call") return "C";
    if (id === "check") return "K";
    if (id === "raise") return "R";
    if (id === "bet" || (id && id.indexOf("bet_") === 0)) return "R";
    return "";
  };

  g.PTHotkeys = PTHotkeys;
})(typeof window !== "undefined" ? window : globalThis);
