/*
 * school-share.js — Compartir logro de Escuela (imagen + URL + redes).
 * Cargar antes de school.js (chunk school).
 */
(function (global) {
  'use strict';

  var SITE_FALLBACK = 'https://www.pokerforgeai.com/';
  var CARD_W = 1080;
  var CARD_H = 1080;

  function siteUrl() {
    var site = global.PT_SITE || global.PTSeoConfig || {};
    var u = site.appUrl || site.siteUrl || '';
    if (u) return String(u).replace(/\/?$/, '/');
    try {
      if (global.location && global.location.origin) {
        return String(global.location.origin).replace(/\/?$/, '/') +
          (global.location.pathname && global.location.pathname.indexOf('/PokerTrainer') === 0
            ? global.location.pathname.replace(/\/?$/, '/')
            : '');
      }
    } catch (e) { /* ignore */ }
    return SITE_FALLBACK;
  }

  function siteHostLabel(url) {
    try {
      var u = new URL(url);
      return u.host.replace(/^www\./, '');
    } catch (e) {
      return 'pokerforgeai.com';
    }
  }

  function routeLabel(route) {
    if (route === 'spin') return 'Spins';
    if (route === 'mtt') return 'Torneos';
    if (route === 'ranges') return 'Rangos';
    if (route === 'pro') return 'Pro';
    return 'Cash';
  }

  function buildShareText(lesson, summary) {
    var url = siteUrl();
    var title = (lesson && lesson.title) || (lesson && lesson.id) || 'Lección';
    var pct = summary && summary.pct != null ? summary.pct : 0;
    var exam = !!(lesson && lesson.exam);
    var passed = !!(summary && summary.passed);
    var gold = !!(summary && summary.gold);
    var line;
    if (passed) {
      line = exam
        ? ('He aprobado el examen «' + title + '» en PokerForgeAI con un ' + pct + '%.')
        : ('He superado «' + title + '» en la Escuela de PokerForgeAI (' + pct + '%).');
      if (gold) line += ' ¡Marca oro!';
    } else {
      line = 'Estoy entrenando «' + title + '» en la Escuela de PokerForgeAI (' + pct + '%).';
    }
    return line + ' ' + url;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    var words = String(text || '').split(/\s+/);
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var trial = cur ? cur + ' ' + w : w;
      if (ctx.measureText(trial).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function drawAchievementCard(canvas, lesson, summary) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;

    var passed = !!(summary && summary.passed);
    var gold = !!(summary && summary.gold);
    var perfect = !!(summary && summary.perfect);
    var pct = summary && summary.pct != null ? Number(summary.pct) : 0;
    var accent = passed ? '#22c55e' : '#f87171';
    if (gold) accent = '#e3b341';

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.55, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.18, w * 0.55);
    glow.addColorStop(0, passed ? 'rgba(34,197,94,0.28)' : 'rgba(248,113,113,0.22)');
    if (gold) {
      glow = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.18, w * 0.55);
      glow.addColorStop(0, 'rgba(227,179,65,0.32)');
      glow.addColorStop(1, 'rgba(227,179,65,0)');
    } else {
      glow.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PokerForgeAI', 80, 120);

    ctx.fillStyle = 'rgba(230,237,243,0.7)';
    ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Escuela de Póker · ' + routeLabel(lesson && lesson.route), 80, 168);

    var status = passed
      ? ((lesson && lesson.exam) ? 'Examen superado' : 'Lección superada')
      : 'Sigo entrenando';
    ctx.fillStyle = accent;
    ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(status, 80, 280);

    var title = (lesson && lesson.title) || (lesson && lesson.id) || '';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px system-ui, -apple-system, Segoe UI, sans-serif';
    var titleLines = wrapText(ctx, title, w - 160);
    var ty = 360;
    titleLines.slice(0, 3).forEach(function (line) {
      ctx.fillText(line, 80, ty);
      ty += 64;
    });

    var ringX = w / 2;
    var ringY = 640;
    var ringR = 150;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, pct / 100)));
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '800 84px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(String(pct) + '%', ringX, ringY + 10);
    ctx.fillStyle = 'rgba(230,237,243,0.75)';
    ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('acierto', ringX, ringY + 52);

    var tags = [];
    if (lesson && lesson.id) tags.push(lesson.id);
    if (lesson && lesson.module) tags.push(lesson.module);
    if (gold) tags.push('Marca oro');
    if (perfect) tags.push('100%');
    if (summary && summary.xpGain) tags.push('+' + summary.xpGain + ' XP');
    ctx.textAlign = 'left';
    ctx.font = '700 26px system-ui, -apple-system, Segoe UI, sans-serif';
    var tagX = 80;
    var tagY = 860;
    tags.forEach(function (tag) {
      var tw = ctx.measureText(tag).width + 36;
      if (tagX + tw > w - 80) return;
      roundRect(ctx, tagX, tagY - 34, tw, 48, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.fillStyle = gold && tag.indexOf('oro') >= 0 ? '#e3b341' : 'rgba(230,237,243,0.92)';
      ctx.fillText(tag, tagX + 18, tagY);
      tagX += tw + 14;
    });

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 36px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(host, w / 2, 980);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(url.replace(/\/$/, ''), w / 2, 1020);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) {
        try {
          var data = canvas.toDataURL('image/png');
          var bin = atob(data.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (e) {
          reject(e);
        }
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      }, 'image/png');
    });
  }

  function buildPanelHtml(lesson, summary) {
    var passed = !!(summary && summary.passed);
    return (
      '<section class="school-share card-box" aria-label="Compartir logro">' +
      '<div class="school-share-head">' +
      '<h3>' + (passed ? 'Comparte tu logro' : 'Comparte tu progreso') + '</h3>' +
      '</div>' +
      '<canvas class="school-share-canvas school-share-canvas-hidden" width="1080" height="1080" aria-hidden="true"></canvas>' +
      '<div class="school-share-actions">' +
      '<button type="button" class="btn btn-primary school-share-btn" data-school-share="native">Compartir</button>' +
      '</div>' +
      '<p class="school-share-status muted-text" data-school-share-status hidden></p>' +
      '</section>'
    );
  }

  function buildHubPanelHtml() {
    return (
      '<div class="school-share school-share-hub" aria-label="Compartir resumen Escuela">' +
      '<canvas class="school-share-canvas school-share-canvas-hidden" width="1080" height="1080" aria-hidden="true"></canvas>' +
      '<div class="school-share-actions">' +
      '<button type="button" class="btn btn-ghost school-share-btn" data-school-share="hub">Compartir resumen</button>' +
      '</div>' +
      '<p class="school-share-status muted-text" data-school-share-status hidden></p>' +
      '</div>'
    );
  }

  function buildHubShareText(hub) {
    var url = siteUrl();
    var level = hub && hub.level != null ? hub.level : 1;
    var xp = hub && hub.xp != null ? hub.xp : 0;
    var route = hub ? (hub.routePassed + '/' + hub.routeTotal) : '0/0';
    var gold = hub && hub.gold != null ? hub.gold : 0;
    return 'Mi progreso en la Escuela de PokerForgeAI: Nv. ' + level +
      ' · ' + xp + ' XP · ruta ' + route + ' · ' + gold + ' oro. ' + url;
  }

  function drawHubSummaryCard(canvas, hub) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;
    hub = hub || {};

    var g = ctx.createLinearGradient(0, 0, w * 0.2, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, 80, 10, w * 0.5, 120, w * 0.55);
    glow.addColorStop(0, 'rgba(234,179,8,0.22)');
    glow.addColorStop(1, 'rgba(234,179,8,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = '#e3b341';
    ctx.font = '700 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    var eyebrow = String(hub.eyebrow || 'Escuela').toUpperCase();
    ctx.fillText(eyebrow, 80, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(hub.title || 'Escuela de Póker', 80, 200);

    ctx.fillStyle = 'rgba(230,237,243,0.88)';
    ctx.font = '600 32px system-ui, -apple-system, Segoe UI, sans-serif';
    var leadLines = wrapText(ctx, hub.lead || '', w - 160);
    var ly = 270;
    leadLines.slice(0, 3).forEach(function (line) {
      ctx.fillText(line, 80, ly);
      ly += 42;
    });

    var stats = [
      { val: 'Nv. ' + (hub.level != null ? hub.level : 1), lbl: 'Nivel Escuela' },
      { val: String(hub.xp != null ? hub.xp : 0), lbl: 'XP' },
      { val: String((hub.routePassed || 0) + '/' + (hub.routeTotal || 0)), lbl: 'Ruta' },
      { val: String(hub.gold != null ? hub.gold : 0), lbl: 'Oro' }
    ];
    var boxW = (w - 80 * 2 - 24) / 2;
    var boxH = 160;
    var startY = 420;
    stats.forEach(function (s, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var x = 80 + col * (boxW + 24);
      var y = startY + row * (boxH + 24);
      roundRect(ctx, x, y, boxW, boxH, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.val, x + 28, y + 78);
      ctx.fillStyle = 'rgba(230,237,243,0.65)';
      ctx.font = '600 26px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(s.lbl, x + 28, y + 120);
    });

    var barX = 80;
    var barY = 820;
    var barW = w - 160;
    var barH = 28;
    roundRect(ctx, barX, barY, barW, barH, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    var fillW = Math.max(8, Math.round(barW * Math.min(100, hub.xpPct || 0) / 100));
    var grad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    grad.addColorStop(0, '#e3b341');
    grad.addColorStop(1, '#22c55e');
    roundRect(ctx, barX, barY, fillW, barH, 14);
    ctx.fillStyle = grad;
    ctx.fill();

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 36px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(host, w / 2, 940);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(url.replace(/\/$/, ''), w / 2, 985);

    return canvas;
  }

  function setStatus(root, msg, ok) {
    var el = root.querySelector('[data-school-share-status]');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('is-ok', !!ok);
    el.classList.toggle('is-err', !ok);
  }

  function mountSharePanel(root, lesson, summary) {
    if (!root || !lesson || !summary) return null;
    var canvas = root.querySelector('.school-share-canvas');
    if (!canvas) return null;
    drawAchievementCard(canvas, lesson, summary);
    var text = buildShareText(lesson, summary);
    var url = siteUrl();

    var btn = root.querySelector('[data-school-share="native"]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, url: url };
  }

  function shareNative(canvas, text, url, root) {
    var nav = global.navigator;
    if (!nav || typeof nav.share !== 'function') {
      setStatus(root, 'Este dispositivo no permite compartir desde el navegador.', false);
      return;
    }
    canvasToBlob(canvas).then(function (blob) {
      var file = null;
      try {
        file = new File([blob], 'pokerforgeai-escuela-logro.png', { type: 'image/png' });
      } catch (e) {
        file = null;
      }
      /* Preferir solo la imagen (+ título corto): la URL ya va dibujada en la tarjeta. */
      var data;
      var withFile = file && (!nav.canShare || nav.canShare({ files: [file] }));
      if (withFile) {
        data = { title: 'PokerForgeAI · Escuela', files: [file] };
        if (nav.canShare && !nav.canShare(data) && nav.canShare({ files: [file], text: text })) {
          data = { title: 'PokerForgeAI · Escuela', text: text, files: [file] };
        }
      } else {
        data = { title: 'PokerForgeAI · Escuela', text: text, url: url };
      }
      return nav.share(data);
    }).then(function () {
      setStatus(root, 'Se ha compartido correctamente.', true);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        setStatus(root, '', true);
        return;
      }
      /* Fallback: algunos navegadores rechazan files-only */
      return nav.share({ title: 'PokerForgeAI · Escuela', text: text, url: url }).then(function () {
        setStatus(root, 'Se ha compartido correctamente.', true);
      }).catch(function (err2) {
        if (err2 && err2.name === 'AbortError') {
          setStatus(root, '', true);
          return;
        }
        setStatus(root, 'No se pudo abrir el menú de compartir.', false);
      });
    });
  }

  function mountHubSharePanel(root, hub) {
    if (!root || !hub) return null;
    var canvas = root.querySelector('.school-share-canvas');
    if (!canvas) return null;
    drawHubSummaryCard(canvas, hub);
    var text = buildHubShareText(hub);
    var url = siteUrl();
    var btn = root.querySelector('[data-school-share="hub"]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, url: url };
  }

  function drawPlayingCard(ctx, code, x, y, cw, ch) {
    var rank = String(code || '').charAt(0) || '?';
    var suit = String(code || '').charAt(1) || '';
    var suitSym = suit === 's' ? '♠' : suit === 'h' ? '♥' : suit === 'd' ? '♦' : suit === 'c' ? '♣' : '?';
    var red = suit === 'h' || suit === 'd';
    roundRect(ctx, x, y, cw, ch, Math.max(6, Math.round(cw * 0.12)));
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = red ? '#dc2626' : '#0f172a';
    ctx.textAlign = 'left';
    ctx.font = '800 ' + Math.round(cw * 0.42) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(rank === 'T' ? '10' : rank, x + cw * 0.12, y + ch * 0.38);
    ctx.font = '700 ' + Math.round(cw * 0.4) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(suitSym, x + cw * 0.14, y + ch * 0.78);
  }

  function drawCardRow(ctx, cards, x, y, cw, ch, gap) {
    (cards || []).forEach(function (c, i) {
      drawPlayingCard(ctx, c, x + i * (cw + gap), y, cw, ch);
    });
  }

  function buildLineQuizShareText(payload) {
    var url = siteUrl();
    var title = (payload && payload.lessonTitle) || 'Analizar rango rival';
    return '¿Qué tiene el villano tras esta línea? «' + title + '» en PokerForgeAI. Sin spoiler — ¿tú qué eliges? ' + url;
  }

  function buildLineQuizShareHtml() {
    return (
      '<div class="school-share school-share-line-quiz" aria-label="Compartir spot sin spoiler">' +
      '<canvas class="school-share-canvas school-share-canvas-hidden" width="1080" height="1080" aria-hidden="true"></canvas>' +
      '<div class="school-share-actions">' +
      '<button type="button" class="btn btn-ghost school-share-btn" data-school-share="line-quiz">Compartir spot</button>' +
      '</div>' +
      '<p class="school-share-status muted-text" data-school-share-status hidden></p>' +
      '</div>'
    );
  }

  /**
   * Tarjeta social del quiz de línea: línea + board + héroe + 3 opciones.
   * Sin solución (ni mano correcta, ni elección del usuario, ni teachBack).
   */
  function drawLineQuizCard(canvas, payload) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;
    payload = payload || {};

    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, 100, 10, w * 0.5, 140, w * 0.5);
    glow.addColorStop(0, 'rgba(96,165,250,0.22)');
    glow.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 36px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PokerForgeAI', 80, 108);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Escuela · Rangos · Sin spoiler', 80, 148);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px system-ui, -apple-system, Segoe UI, sans-serif';
    var title = payload.prompt || '¿Qué crees que tiene el villano?';
    var titleLines = wrapText(ctx, title, w - 160);
    var ty = 210;
    titleLines.slice(0, 2).forEach(function (line) {
      ctx.fillText(line, 80, ty);
      ty += 52;
    });

    var story = payload.lineStory || [];
    var storyY = ty + 18;
    ctx.font = '600 26px system-ui, -apple-system, Segoe UI, sans-serif';
    story.slice(0, 4).forEach(function (row) {
      var street = (row && row.street) || '';
      var text = (row && row.text) || '';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(street, 80, storyY);
      ctx.fillStyle = 'rgba(230,237,243,0.9)';
      var lines = wrapText(ctx, text, w - 280);
      ctx.fillText(lines[0] || '', 220, storyY);
      if (lines[1]) {
        storyY += 30;
        ctx.fillText(lines[1], 220, storyY);
      }
      storyY += 38;
    });

    var boardY = Math.max(storyY + 16, 470);
    ctx.fillStyle = 'rgba(230,237,243,0.7)';
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Board', 80, boardY);
    var board = payload.board || [];
    var bcw = 88;
    var bch = 120;
    drawCardRow(ctx, board, 80, boardY + 16, bcw, bch, 12);

    var heroY = boardY + 16;
    var heroX = 620;
    ctx.fillStyle = 'rgba(230,237,243,0.7)';
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Héroe ' + (payload.heroPos || ''), heroX, boardY);
    drawCardRow(ctx, payload.heroCards || [], heroX, heroY + 16, 78, 108, 10);

    ctx.fillStyle = 'rgba(230,237,243,0.55)';
    ctx.font = '600 22px system-ui, -apple-system, Segoe UI, sans-serif';
    var vPos = payload.villainPos || 'Villano';
    ctx.fillText('Villano ' + vPos + ' · cartas ocultas', heroX, heroY + 150);

    var optY = boardY + 180;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Opciones (elige una)', 80, optY);

    var options = payload.options || [];
    var boxW = (w - 160 - 28) / 3;
    var boxH = 200;
    var boxTop = optY + 20;
    options.slice(0, 3).forEach(function (opt, i) {
      var bx = 80 + i * (boxW + 14);
      roundRect(ctx, bx, boxTop, boxW, boxH, 20);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(147,197,253,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      var cards = (opt && opt.cards) || [];
      var ocw = 72;
      var och = 100;
      var rowW = cards.length * ocw + Math.max(0, cards.length - 1) * 10;
      var ox = bx + (boxW - rowW) / 2;
      var oy = boxTop + (boxH - och) / 2;
      drawCardRow(ctx, cards, ox, oy, ocw, och, 10);
    });

    ctx.fillStyle = 'rgba(234,179,8,0.95)';
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin spoiler · ¿Qué mano sobrevive a la línea?', w / 2, 930);

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 34px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(host, w / 2, 980);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 22px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(url.replace(/\/$/, ''), w / 2, 1018);

    return canvas;
  }

  function mountLineQuizShare(root, payload) {
    if (!root || !payload) return null;
    var canvas = root.querySelector('.school-share-canvas');
    if (!canvas) return null;
    drawLineQuizCard(canvas, payload);
    var text = buildLineQuizShareText(payload);
    var url = siteUrl();
    var btn = root.querySelector('[data-school-share="line-quiz"]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, url: url };
  }

  global.PTSchoolShare = {
    siteUrl: siteUrl,
    buildShareText: buildShareText,
    buildHubShareText: buildHubShareText,
    buildLineQuizShareText: buildLineQuizShareText,
    drawAchievementCard: drawAchievementCard,
    drawHubSummaryCard: drawHubSummaryCard,
    drawLineQuizCard: drawLineQuizCard,
    buildPanelHtml: buildPanelHtml,
    buildHubPanelHtml: buildHubPanelHtml,
    buildLineQuizShareHtml: buildLineQuizShareHtml,
    mountSharePanel: mountSharePanel,
    mountHubSharePanel: mountHubSharePanel,
    mountLineQuizShare: mountLineQuizShare,
    CARD_W: CARD_W,
    CARD_H: CARD_H
  };
})(typeof window !== 'undefined' ? window : globalThis);
