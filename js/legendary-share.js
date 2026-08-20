/*
 * legendary-share.js — Imagen compartible tras jugar una mano legendaria.
 */
(function (global) {
  'use strict';

  var SITE_FALLBACK = 'https://www.pokerforgeai.com/';
  var CARD_W = 1080;
  var CARD_H = 1080;

  var SUIT_SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
  var SUIT_COLOR = { s: '#e8edf3', h: '#f87171', d: '#60a5fa', c: '#34d399' };

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
      return new URL(url).host.replace(/^www\./, '');
    } catch (e) {
      return 'pokerforgeai.com';
    }
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

  function cardLabel(code) {
    if (!code || code.length < 2) return '';
    var rank = code.charAt(0).toUpperCase();
    if (rank === 'T') rank = '10';
    var suit = code.charAt(1).toLowerCase();
    return rank + (SUIT_SYM[suit] || suit);
  }

  function cardColor(code) {
    if (!code || code.length < 2) return '#e8edf3';
    return SUIT_COLOR[code.charAt(1).toLowerCase()] || '#e8edf3';
  }

  function drawMiniCard(ctx, x, y, code, scale) {
    scale = scale || 1;
    var w = 72 * scale;
    var h = 96 * scale;
    roundRect(ctx, x, y, w, h, 10 * scale);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = cardColor(code);
    ctx.font = '700 ' + Math.round(34 * scale) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardLabel(code), x + w / 2, y + h * 0.62);
  }

  function buildShareText(payload) {
    var url = siteUrl();
    var line = payload.headline || 'Manos legendarias · PokerForgeAI';
    return line + ' ' + url;
  }

  function drawLegendaryShareCard(canvas, payload) {
    var ctx = canvas.getContext('2d');
    var w = CARD_W;
    var h = CARD_H;
    canvas.width = w;
    canvas.height = h;
    payload = payload || {};

    var accent = payload.playedSameLine ? '#22c55e' : '#e3b341';
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.55, '#111827');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * 0.5, h * 0.15, 20, w * 0.5, h * 0.15, w * 0.55);
    glow.addColorStop(0, payload.playedSameLine ? 'rgba(34,197,94,0.28)' : 'rgba(227,179,65,0.28)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 4;
    roundRect(ctx, 36, 36, w - 72, h - 72, 36);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 42px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PokerForgeAI', 80, 110);

    ctx.fillStyle = accent;
    ctx.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Manos legendarias', 80, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px system-ui, -apple-system, Segoe UI, sans-serif';
    var headline = payload.headline || 'Enhorabuena';
    var headLines = wrapText(ctx, headline, w - 160);
    var hy = 270;
    headLines.slice(0, 3).forEach(function (line) {
      ctx.fillText(line, 80, hy);
      hy += 54;
    });

    ctx.fillStyle = 'rgba(230,237,243,0.78)';
    ctx.font = '600 30px system-ui, -apple-system, Segoe UI, sans-serif';
    var subLines = wrapText(ctx, payload.subline || '', w - 160);
    var sy = hy + 10;
    subLines.slice(0, 2).forEach(function (line) {
      ctx.fillText(line, 80, sy);
      sy += 40;
    });

    var cast = payload.cast || [];
    var castY = 430;
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('Protagonistas', 80, castY);
    castY += 36;
    cast.slice(0, 4).forEach(function (m) {
      ctx.fillStyle = m.isHero ? accent : 'rgba(230,237,243,0.92)';
      ctx.font = (m.isHero ? '800' : '600') + ' 32px system-ui, sans-serif';
      ctx.fillText((m.isHero ? '★ ' : '') + m.name + ' · ' + m.country, 80, castY);
      castY += 42;
    });

    var board = payload.board || [];
    if (board.length) {
      ctx.fillStyle = 'rgba(230,237,243,0.65)';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillText('Board', 80, 620);
      var bx = 80;
      board.forEach(function (c) {
        drawMiniCard(ctx, bx, 640, c, 1);
        bx += 84;
      });
    }

    var heroCards = payload.heroCards || [];
    if (heroCards.length) {
      ctx.fillStyle = 'rgba(230,237,243,0.65)';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillText('Tu mano (' + (payload.heroName || 'Héroe') + ')', 80, 780);
      var hx = 80;
      heroCards.forEach(function (c) {
        drawMiniCard(ctx, hx, 800, c, 1);
        hx += 84;
      });
    }

    var url = siteUrl();
    var host = siteHostLabel(url);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '800 36px system-ui, sans-serif';
    ctx.fillText(host, w / 2, 980);
    ctx.fillStyle = 'rgba(230,237,243,0.65)';
    ctx.font = '600 24px system-ui, sans-serif';
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

  function buildSharePayload(handDef, heroId, analysis) {
    var ForceMod = global.PTLegendaryForce;
    var star = ForceMod && ForceMod.castMember(handDef, heroId);
    var ev = handDef.event || {};
    var eventLabel = [ev.name, ev.stage, handDef.year].filter(Boolean).join(' · ');
    var starName = star ? star.displayName : 'la estrella';
    var headline;
    if (analysis && analysis.playedSameLine) {
      headline = 'Enhorabuena, has jugado igual que ' + starName;
    } else {
      headline = 'Enhorabuena, mismo resultado que ' + starName;
    }
    var subline = (handDef.titleBlind || handDef.title || '') +
      (eventLabel ? ' · ' + eventLabel : '');

    var cast = (handDef.cast || []).map(function (m) {
      return {
        name: m.displayName,
        country: m.countryLabel,
        isHero: m.playerId === heroId
      };
    });

    return {
      headline: headline,
      subline: subline,
      playedSameLine: !!(analysis && analysis.playedSameLine),
      board: (handDef.play && handDef.play.board) || [],
      heroCards: star && star.cards ? star.cards.slice() : [],
      heroName: starName,
      cast: cast
    };
  }

  function setShareStatus(root, msg, ok) {
    var el = root && root.querySelector('[data-legendary-share-status]');
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

  function shareNative(canvas, text, url, root) {
    var nav = global.navigator;
    if (!nav || typeof nav.share !== 'function') {
      canvasToBlob(canvas).then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pokerforgeai-mano-legendaria.png';
        a.click();
        setShareStatus(root, 'Imagen descargada.', true);
      }).catch(function () {
        setShareStatus(root, 'No se pudo guardar la imagen.', false);
      });
      return;
    }
    canvasToBlob(canvas).then(function (blob) {
      var file = null;
      try {
        file = new File([blob], 'pokerforgeai-mano-legendaria.png', { type: 'image/png' });
      } catch (e) { file = null; }
      var data;
      var withFile = file && (!nav.canShare || nav.canShare({ files: [file] }));
      if (withFile) {
        data = { title: 'PokerForgeAI · Manos legendarias', files: [file] };
      } else {
        data = { title: 'PokerForgeAI · Manos legendarias', text: text, url: url };
      }
      return nav.share(data);
    }).then(function () {
      setShareStatus(root, 'Se ha compartido correctamente.', true);
    }).catch(function (err) {
      if (err && err.name === 'AbortError') {
        setShareStatus(root, '', true);
        return;
      }
      setShareStatus(root, 'No se pudo abrir el menú de compartir.', false);
    });
  }

  function mountShareButton(root, handDef, heroId, analysis) {
    if (!root || !handDef || !analysis || !analysis.canShare) return null;
    var canvas = root.querySelector('.legendary-share-canvas');
    if (!canvas) return null;
    var payload = buildSharePayload(handDef, heroId, analysis);
    drawLegendaryShareCard(canvas, payload);
    var text = buildShareText(payload);
    var url = siteUrl();
    var btn = root.querySelector('[data-legendary-share]');
    if (btn) {
      btn.addEventListener('click', function () {
        shareNative(canvas, text, url, root);
      });
    }
    return { canvas: canvas, text: text, payload: payload };
  }

  global.PTLegendaryShare = {
    buildSharePayload: buildSharePayload,
    drawLegendaryShareCard: drawLegendaryShareCard,
    mountShareButton: mountShareButton,
    buildShareText: buildShareText
  };
})(typeof window !== 'undefined' ? window : global);
