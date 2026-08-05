/*
 * session-export.js — Export informe de sesión JSON / CSV / PDF-print (SN-34).
 */
(function (global) {
  'use strict';

  var PRINT_OVERLAY_ID = 'session-print-overlay';

  function escapeCsv(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function fmt(x) {
    if (global.GTOPotMath && global.GTOPotMath.formatBB) return global.GTOPotMath.formatBB(x);
    var n = Number(x);
    return isNaN(n) ? String(x == null ? '' : x) : (Math.round(n * 100) / 100).toFixed(2);
  }

  function handRows(session, opts) {
    opts = opts || {};
    var hands = (session && session.hands) || [];
    if (opts.errorsOnly) {
      hands = hands.filter(function (h) {
        return (Number(h.totalEvLoss) || 0) > 0 || h.worstClass === 'error' || h.worstClass === 'imprecisa';
      });
    }
    return hands;
  }

  function buildJson(session, opts) {
    var st = (session && session.stats) || {};
    var hands = handRows(session, opts).map(function (h) {
      return {
        id: h.id,
        heroCode: h.heroCode,
        heroPos: h.heroPos,
        heroNetBB: h.heroNetBB,
        totalEvLoss: h.totalEvLoss,
        accuracy: h.accuracy,
        worstClass: h.worstClass,
        decisions: (h.decisions || []).map(function (d) {
          return {
            street: d.street,
            chosen: d.chosen || d.action,
            best: d.best,
            class: d.class,
            evLoss: d.evLoss,
            label: d.label
          };
        })
      };
    });
    return {
      exportedAt: new Date().toISOString(),
      source: 'PokerForgeAI',
      fileName: session.fileName || '',
      hero: session.hero || '',
      stats: {
        nHands: st.nHands,
        netBB: st.netBB,
        accuracy: st.accuracy,
        evLossBB: st.evLossBB,
        grade: st.grade,
        vpipPct: st.vpipPct,
        pfrPct: st.pfrPct,
        bbPer100: st.bbPer100
      },
      hands: hands
    };
  }

  function buildCsv(session, opts) {
    var rows = ['handId,heroCode,heroPos,netBB,evLoss,accuracy,worstClass,streets'];
    handRows(session, opts).forEach(function (h) {
      var streets = (h.decisions || []).map(function (d) {
        return (d.street || '') + ':' + (d.chosen || d.action || '') + '>' + (d.best || '') + '(' + (d.class || '') + ',-' + fmt(d.evLoss || 0) + ')';
      }).join(' | ');
      rows.push([
        escapeCsv(h.id),
        escapeCsv(h.heroCode),
        escapeCsv(h.heroPos),
        escapeCsv(fmt(h.heroNetBB)),
        escapeCsv(fmt(h.totalEvLoss)),
        escapeCsv(h.accuracy != null ? h.accuracy : ''),
        escapeCsv(h.worstClass),
        escapeCsv(streets)
      ].join(','));
    });
    return rows.join('\n');
  }

  function buildPrintHtml(session, opts) {
    opts = opts || {};
    var data = buildJson(session, opts);
    var st = data.stats || {};
    var grade = st.grade && st.grade.letter ? st.grade.letter + ' · ' + st.grade.score + '/10' : '—';
    var rows = (data.hands || []).map(function (h) {
      return '<tr><td>' + (h.heroCode || '') + '</td><td>' + (h.heroPos || '') + '</td>' +
        '<td>' + fmt(h.heroNetBB) + '</td><td>-' + fmt(h.totalEvLoss) + '</td>' +
        '<td>' + (h.worstClass || '') + '</td></tr>';
    }).join('');
    var toolbar = opts.inApp
      ? ''
      : '<p class="no-print toolbar">' +
        '<button type="button" onclick="try{window.close()}catch(e){}if(!window.closed){history.length>1?history.back():location.href=\'about:blank\'}">Cerrar / Volver</button> ' +
        '<button type="button" class="primary" onclick="window.print()">Imprimir / Guardar PDF</button></p>';
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Informe sesión — ' +
      String(data.fileName || '').replace(/</g, '') + '</title>' +
      '<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111;margin:0}' +
      'h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:13px}' +
      'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}' +
      '.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}' +
      '.toolbar button{font:inherit;padding:10px 14px;border:1px solid #ccc;border-radius:8px;background:#f5f5f5;cursor:pointer}' +
      '.toolbar button.primary{background:#1a1a1a;color:#fff;border-color:#1a1a1a}' +
      '.muted{color:#666;font-size:12px}@media print{.no-print{display:none}}</style></head><body>' +
      toolbar +
      '<h1>PokerForgeAI — Informe de sesión</h1>' +
      '<p><strong>' + String(data.fileName || '') + '</strong></p>' +
      '<p>Manos: ' + (st.nHands || 0) + ' · Acierto: ' + (st.accuracy != null ? st.accuracy + '%' : '—') +
      ' · Resultado: ' + fmt(st.netBB) + ' bb · EV perdido: -' + fmt(st.evLossBB) + ' bb · Nota: ' + grade + '</p>' +
      '<table><thead><tr><th>Mano</th><th>Pos</th><th>Net</th><th>EV loss</th><th>Clase</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="muted">Exportado ' + data.exportedAt + ' · Estudio GTO heurístico</p></body></html>';
  }

  function downloadBlob(filename, mime, text) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 500);
  }

  function safeName(session) {
    var base = String((session && session.fileName) || 'sesion').replace(/[^\w.\-]+/g, '_').slice(0, 48);
    return base || 'sesion';
  }

  function isStandaloneShell() {
    if (global.PTPwa && typeof global.PTPwa.isStandalone === 'function') {
      return !!global.PTPwa.isStandalone();
    }
    try {
      return !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
        !!(global.navigator && global.navigator.standalone);
    } catch (e) {
      return false;
    }
  }

  function isIOSDevice() {
    if (global.PTPwa && typeof global.PTPwa.isIOS === 'function') {
      return !!global.PTPwa.isIOS();
    }
    var ua = (global.navigator && global.navigator.userAgent) || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (global.navigator && global.navigator.platform === 'MacIntel' && global.navigator.maxTouchPoints > 1);
  }

  /** iOS PWA / standalone: window.open replaces the app with no browser chrome. */
  function shouldUseInAppPrint() {
    return isStandaloneShell() || isIOSDevice();
  }

  function closePrintOverlay() {
    var existing = global.document && global.document.getElementById(PRINT_OVERLAY_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (global.document && global.document.documentElement) {
      global.document.documentElement.classList.remove('session-print-open');
    }
  }

  function openPrintOverlay(html) {
    var doc = global.document;
    if (!doc || !doc.body) throw new Error('No se puede mostrar la vista previa');
    closePrintOverlay();

    var overlay = doc.createElement('div');
    overlay.id = PRINT_OVERLAY_ID;
    overlay.className = 'session-print-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Vista previa del informe');

    var bar = doc.createElement('div');
    bar.className = 'session-print-bar';
    var btnBack = doc.createElement('button');
    btnBack.type = 'button';
    btnBack.className = 'btn btn-ghost';
    btnBack.setAttribute('data-print-close', '1');
    btnBack.textContent = '← Volver';
    var btnPrint = doc.createElement('button');
    btnPrint.type = 'button';
    btnPrint.className = 'btn btn-primary';
    btnPrint.setAttribute('data-print-go', '1');
    btnPrint.textContent = 'Imprimir / Guardar PDF';
    bar.appendChild(btnBack);
    bar.appendChild(btnPrint);

    var frame = doc.createElement('iframe');
    frame.className = 'session-print-frame';
    frame.title = 'Informe de sesión';
    frame.setAttribute('sandbox', 'allow-modals allow-same-origin');

    overlay.appendChild(bar);
    overlay.appendChild(frame);
    doc.body.appendChild(overlay);
    doc.documentElement.classList.add('session-print-open');

    var win = frame.contentWindow;
    var fdoc = frame.contentDocument || (win && win.document);
    if (!fdoc) throw new Error('No se pudo cargar la vista previa');
    fdoc.open();
    fdoc.write(html);
    fdoc.close();

    function onClose() {
      closePrintOverlay();
      doc.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    btnBack.addEventListener('click', onClose);
    btnPrint.addEventListener('click', function () {
      try {
        if (win && win.print) win.print();
        else global.print();
      } catch (e) {
        global.print();
      }
    });
    doc.addEventListener('keydown', onKey);
    try { btnBack.focus(); } catch (e) { /* ignore */ }
    return { ok: true, format: 'pdf', mode: 'overlay' };
  }

  function openPrintWindow(html) {
    var w = global.open('', '_blank');
    if (!w) throw new Error('Permite ventanas emergentes para generar el PDF');
    // Same-window navigation (common in iOS standalone): fall back to overlay.
    if (w === global) {
      return openPrintOverlay(html);
    }
    w.document.write(html);
    w.document.close();
    return { ok: true, format: 'pdf', mode: 'window' };
  }

  function download(session, format, opts) {
    if (!session) throw new Error('No hay sesión');
    opts = opts || {};
    var name = safeName(session);
    if (format === 'json') {
      downloadBlob(name + '-informe.json', 'application/json;charset=utf-8', JSON.stringify(buildJson(session, opts), null, 2));
      return { ok: true, format: 'json' };
    }
    if (format === 'csv') {
      downloadBlob(name + '-informe.csv', 'text/csv;charset=utf-8', buildCsv(session, opts));
      return { ok: true, format: 'csv' };
    }
    if (format === 'pdf' || format === 'print') {
      var useInApp = opts.forceInApp === true || (opts.forceWindow !== true && shouldUseInAppPrint());
      var html = buildPrintHtml(session, Object.assign({}, opts, { inApp: useInApp }));
      if (useInApp) return openPrintOverlay(html);
      return openPrintWindow(html);
    }
    throw new Error('Formato no soportado');
  }

  global.PTSessionExport = {
    buildJson: buildJson,
    buildCsv: buildCsv,
    buildPrintHtml: buildPrintHtml,
    download: download,
    handRows: handRows,
    shouldUseInAppPrint: shouldUseInAppPrint,
    closePrintOverlay: closePrintOverlay
  };
})(window);
