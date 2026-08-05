/*
 * session-export.js — Export informe de sesión JSON / CSV / PDF-print (SN-34).
 */
(function (global) {
  'use strict';

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
    var data = buildJson(session, opts);
    var st = data.stats || {};
    var grade = st.grade && st.grade.letter ? st.grade.letter + ' · ' + st.grade.score + '/10' : '—';
    var rows = (data.hands || []).map(function (h) {
      return '<tr><td>' + (h.heroCode || '') + '</td><td>' + (h.heroPos || '') + '</td>' +
        '<td>' + fmt(h.heroNetBB) + '</td><td>-' + fmt(h.totalEvLoss) + '</td>' +
        '<td>' + (h.worstClass || '') + '</td></tr>';
    }).join('');
    return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Informe sesión — ' +
      String(data.fileName || '').replace(/</g, '') + '</title>' +
      '<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}' +
      'h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:13px}' +
      'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}' +
      '.muted{color:#666;font-size:12px}@media print{.no-print{display:none}}</style></head><body>' +
      '<p class="no-print"><button onclick="window.print()">Imprimir / Guardar PDF</button></p>' +
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
      var html = buildPrintHtml(session, opts);
      var w = global.open('', '_blank');
      if (!w) throw new Error('Permite ventanas emergentes para generar el PDF');
      w.document.write(html);
      w.document.close();
      return { ok: true, format: 'pdf' };
    }
    throw new Error('Formato no soportado');
  }

  global.PTSessionExport = {
    buildJson: buildJson,
    buildCsv: buildCsv,
    buildPrintHtml: buildPrintHtml,
    download: download,
    handRows: handRows
  };
})(window);
