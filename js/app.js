/*
 * app.js
 * Controlador de la interfaz: orquesta Engine + Store y pinta la mesa.
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  // coordenadas (top%, left%) de los 6 asientos; el héroe siempre abajo (índice 0)
  const SEAT_COORDS = [
    { top: 96, left: 50 },  // hero (abajo centro)
    { top: 80, left: 8 },
    { top: 30, left: 6 },
    { top: 4, left: 38 },
    { top: 4, left: 70 },
    { top: 80, left: 92 }
  ];

  let hand = null;
  let pendingForce = null;       // escenario forzado (repaso de errores)
  let repeatErrorsMode = false;
  let session = { hands: 0, net: 0, decisions: 0, good: 0 };

  // ---------- Inicio ----------
  function init() {
    bindTabs();
    bindControls();
    startNewHand();
    refreshSessionUI();
  }

  function bindTabs() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      $$('.tab').forEach((x) => x.classList.remove('active'));
      $$('.tab-panel').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      $('#tab-' + t.dataset.tab).classList.add('active');
      if (t.dataset.tab === 'history') renderHistory();
      if (t.dataset.tab === 'errors') renderErrors();
      if (t.dataset.tab === 'stats') renderStats();
      if (t.dataset.tab === 'sessions') { showSessionsView('home'); renderSessionsList(); }
    }));
  }

  function bindControls() {
    $('#new-hand').addEventListener('click', () => { pendingForce = null; startNewHand(); });
    $('#replay-hand').addEventListener('click', () => replayCurrentHand());
    $('#repeat-errors').addEventListener('change', (e) => { repeatErrorsMode = e.target.checked; });
    $('#clear-history').addEventListener('click', () => {
      if (confirm('¿Borrar TODO el histórico, errores y estadísticas?')) { Store.clearAll(); renderHistory(); refreshSessionUI(); }
    });
    $('#clear-errors').addEventListener('click', () => {
      if (confirm('¿Vaciar la lista de errores?')) { Store.clearErrors(); renderErrors(); }
    });
    $('#train-errors').addEventListener('click', () => trainNextError());
    $('#export-data').addEventListener('click', exportData);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

    // sesiones
    $('#session-file').addEventListener('change', (e) => {
      $('#process-session').disabled = !e.target.files.length;
      $('#import-status').textContent = e.target.files.length ? `Listo para procesar: ${e.target.files[0].name}` : '';
    });
    $('#process-session').addEventListener('click', processSessionFile);
    $('#back-to-sessions').addEventListener('click', () => { showSessionsView('home'); renderSessionsList(); });
    $('#back-to-detail').addEventListener('click', () => { showSessionsView('detail'); });
  }

  // ---------- Nueva mano ----------
  function startNewHand() {
    let force = pendingForce;
    if (!force && repeatErrorsMode) {
      const errs = Store.getErrors();
      if (errs.length) {
        const e = errs[Math.floor(Math.random() * errs.length)];
        const sc = e.scenarioRaw || scenarioFromError(e);
        force = sc ? Object.assign({}, sc, { seed: e.seed }) : null;
      }
    }
    hand = Engine.newHand(force || undefined);
    pendingForce = null;
    $('#feedback').classList.add('hidden');
    $('#hand-log').innerHTML = '';
    renderTable();
    renderActions();
  }

  // Repite la mano actual con la MISMA semilla (mismas cartas y board si juegas igual)
  function replayCurrentHand() {
    if (!hand) return;
    pendingForce = Object.assign({}, hand.scenario, { seed: hand.seed });
    startNewHand();
  }

  function scenarioFromError(err) {
    const s = err.scenario || (err.scenarioRaw);
    if (err.scenarioRaw) return err.scenarioRaw;
    // reconstruye desde label
    if (typeof s === 'string') {
      if (s.startsWith('RFI')) return { type: 'RFI', heroPos: s.split(' ')[1] };
      const parts = s.split(' '); // "BB vs UTG"
      if (parts.length === 3) return { type: 'vsRFI', key: parts.join('_') };
    }
    return null;
  }

  // ---------- Render mesa ----------
  function renderTable() {
    const fmt = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    const pot = hand.current ? hand.current.potBB : (hand.result ? null : hand.potBB);
    $('#hero-pos').textContent = hand.hero.pos;
    $('#pot').textContent = 'Bote: ' + (pot != null ? fmt(pot) : '-') + ' bb';
    $('#hero-cards').innerHTML = hand.hero.cards.map(Cards.cardToHTML).join('');
    $('#hero-handname').textContent = handNameOnBoard();
    $('#hero-action').innerHTML = actionBadgeHTML(hand.heroAction);
    renderBoard();
    renderSeats();
    $('#spot-context').textContent = hand.current ? hand.current.context : (hand.result ? hand.result.reason : '');
  }

  // Genera el HTML de una "burbuja" de acción (Check / Fold / fichas + bb)
  function actionBadgeHTML(action) {
    if (!action) return '';
    const t = action.type;
    if (t === 'check') return '<span class="seat-act check">Check</span>';
    if (t === 'fold') return '<span class="seat-act fold">Fold</span>';
    const labels = { open: 'Abre', bet: 'Apuesta', call: 'Iguala', raise: 'Sube', allin: 'All-in' };
    const lbl = labels[t] || t;
    const amt = action.amount != null ? `${action.amount} bb` : '';
    return `<span class="seat-act bet"><span class="chip-ico"></span>${lbl}${amt ? ' · ' + amt : ''}</span>`;
  }

  function handNameOnBoard() {
    if (!hand.board.length) return '';
    try {
      const ev = Cards.evaluate(hand.hero.cards.concat(hand.board));
      return 'Tu mano: ' + ev.name;
    } catch (e) { return ''; }
  }

  function renderBoard() {
    const complete = hand.stage === 'complete';
    let html = hand.board.map(Cards.cardToHTML).join('');
    $('#board').innerHTML = html || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>';
  }

  function renderSeats() {
    const ring = ringFromHero(hand.hero.pos);
    const villainPos = hand.villain.pos;
    let html = '';
    ring.forEach((pos, i) => {
      const c = SEAT_COORDS[i];
      const isHero = pos === hand.hero.pos;
      const isVillain = pos === villainPos;
      const cls = ['seat'];
      if (isHero) cls.push('hero');
      if (isVillain) cls.push('villain');
      if (pos === 'BTN') cls.push('dealer');
      let role = isHero ? 'Héroe' : (isVillain ? 'Villano' : '');
      const actHtml = isVillain ? actionBadgeHTML(hand.villainAction) : '';
      html += `<div class="${cls.join(' ')}" style="top:${c.top}%;left:${c.left}%">
        <div class="seat-pos">${pos}</div>
        <div class="seat-role">${role}</div>
        ${actHtml ? `<div class="seat-act-wrap">${actHtml}</div>` : ''}
      </div>`;
    });
    $('#seats').innerHTML = html;
  }

  function ringFromHero(heroPos) {
    const idx = POS.indexOf(heroPos);
    const ring = [];
    for (let i = 0; i < POS.length; i++) ring.push(POS[(idx + i) % POS.length]);
    return ring; // héroe primero -> coords[0] (abajo)
  }

  // ---------- Acciones ----------
  function renderActions() {
    const node = hand.current;
    const box = $('#actions');
    if (!node) { box.innerHTML = ''; return; }
    box.innerHTML = node.options.map((o) =>
      `<button class="btn btn-${btnClassForAction(o.id)}" data-action="${o.id}">${o.label}</button>`
    ).join('');
    $$('#actions button').forEach((b) =>
      b.addEventListener('click', () => onAction(b.dataset.action)));
  }

  function btnClassForAction(id) {
    if (!id) return 'fold';
    if (id.indexOf('bet_') === 0 || id === 'bet') return 'bet';
    return id.split('_')[0];
  }

  function onAction(actionId) {
    const res = Engine.act(hand, actionId);
    const d = res.decision;

    session.decisions++;
    if (d.class === 'optima' || d.class === 'aceptable') session.good++;

    appendLog(d);
    showVerdictToast(d);
    $('#feedback').classList.add('hidden');
    renderTable();

    if (hand.stage === 'complete') {
      finishHand();
    } else {
      renderActions();
    }
  }

  function appendLog(d) {
    const li = document.createElement('li');
    const verdict = verdictWord(d.class);
    li.innerHTML = `<strong>${d.street}</strong>: ${escapeHtml(d.label)} <span class="verdict ${d.class}">${verdict}</span> ${d.evLoss > 0 ? `<span style="color:var(--red)">-${d.evLoss}bb</span>` : ''}`;
    $('#hand-log').appendChild(li);
  }

  function showVerdictToast(d) {
    const toast = $('#verdict-toast');
    if (!toast) return;
    const pct = Math.round((d.frequency || 0) * 100);
    toast.className = 'verdict-toast visible ' + d.class;
    toast.innerHTML = `<div class="vt-verdict">${verdictWord(d.class)}</div>
      <div class="vt-freq">${pct}% GTO</div>
      ${d.evLoss > 0 ? `<div class="vt-ev">-${d.evLoss} bb</div>` : ''}`;
    clearTimeout(showVerdictToast._t);
    showVerdictToast._t = setTimeout(() => { toast.classList.remove('visible'); }, 1100);
  }

  function renderOptionGrid(breakdown, chosenId) {
    if (!breakdown || !breakdown.length) return '';
    let html = '<div class="opt-grid">';
    breakdown.forEach((o) => {
      const isChosen = o.id === chosenId;
      const isBest = breakdown[0] && breakdown[0].id === o.id;
      html += `<div class="opt-pill ${isChosen ? 'chosen' : ''} ${isBest ? 'best' : ''}">
        <span class="opt-lbl">${escapeHtml(o.label)}</span>
        <span class="opt-pct">${o.pct}%</span>
      </div>`;
    });
    return html + '</div>';
  }

  function showFeedback(d) {
    const fb = $('#feedback');
    fb.classList.remove('hidden');
    const verdict = verdictWord(d.class);
    const bestLabel = actionName(d.best);
    let html = `<h3>Decisión en ${d.street}: <span class="verdict ${d.class}">${verdict}</span>`;
    if (d.score != null) html += ` <span class="muted-text">· Puntuación ${d.score}/100</span>`;
    html += `</h3>`;
    html += `<div>Elegiste <strong>${escapeHtml(d.label)}</strong>. `;
    if (d.class === 'optima') html += `Es la jugada GTO principal.`;
    else html += `La jugada de mayor frecuencia GTO era <strong>${bestLabel}</strong> (${Math.round((d.gto[d.best] || 0) * 100)}%).`;
    html += `</div>`;
    if (d.frequency != null) html += `<div class="muted-text" style="margin-top:4px">Frecuencia GTO de tu acción: ${Math.round(d.frequency * 100)}% · Confianza: ${Math.round((d.confidence || 0) * 100)}%</div>`;
    html += `<div class="result-line" style="border:none;padding-top:6px">EV loss: <span class="${d.evLoss > 0 ? 'net-neg' : 'net-pos'}">${d.evLoss > 0 ? '-' + d.evLoss : '0'} bb</span>${d.evLossTier ? ` (${d.evLossTier})` : ''}</div>`;
    if (d.explanation) html += `<div class="spot-context" style="margin-top:8px;font-size:13px">${escapeHtml(d.explanation)}</div>`;
    if (d.errors && d.errors.length) html += `<div class="result-line" style="border-color:var(--red)">${d.errors.map((e) => escapeHtml(e.msg)).join(' · ')}</div>`;
    html += renderOptionGrid(d.optionBreakdown, d.action);
    fb.innerHTML = html;
  }

  function renderGtoBars(gto) {
    if (!gto) return '';
    let html = '<div class="gto-bars"><div style="color:var(--muted);font-size:12px;margin-bottom:4px">Estrategia GTO (frecuencias):</div>';
    Object.keys(gto).forEach((a) => {
      const pct = Math.round(gto[a] * 100);
      html += `<div class="gto-bar"><span class="lbl">${actionName(a)}</span>
        <span class="track"><span class="fill" style="width:${pct}%"></span></span>
        <span class="pct">${pct}%</span></div>`;
    });
    return html + '</div>';
  }

  function finishHand() {
    $('#actions').innerHTML = `<button class="btn btn-primary" id="next-after">Siguiente mano &raquo;</button>
      <button class="btn btn-ghost" id="replay-after">&#8635; Repetir esta mano</button>`;
    $('#next-after').addEventListener('click', () => { pendingForce = null; startNewHand(); });
    $('#replay-after').addEventListener('click', () => replayCurrentHand());

    const r = hand.result;
    session.hands++;
    session.net += r.heroNet || 0;
    Store.saveHand(hand);
    refreshSessionUI();

    // mostrar resultado completo + cartas del villano
    const fb = $('#feedback');
    fb.classList.remove('hidden');
    const netCls = r.heroNet >= 0 ? 'net-pos' : 'net-neg';
    let vill = r.villainCards ? r.villainCards.map(Cards.cardToHTML).join(' ') : '<em>no llegó a enseñar</em>';
    let html = `<h3>Resultado de la mano</h3>`;
    html += `<div>${escapeHtml(r.reason)}</div>`;
    html += `<div class="result-line">Cartas del villano (${hand.villain.pos || '—'}): ${vill}`;
    if (r.villainHandName) html += ` · ${r.villainHandName}`;
    html += `</div>`;
    if (hand.board.length) html += `<div class="result-line" style="border:none;padding-top:6px">Board: ${hand.board.map(Cards.cardToHTML).join(' ')}</div>`;
    html += `<div class="result-line">Resultado: <span class="${netCls}">${r.heroNet >= 0 ? '+' : ''}${r.heroNet} bb</span>`;
    html += ` &nbsp;·&nbsp; EV perdido por errores: <span class="${r.totalEvLoss > 0 ? 'net-neg' : 'net-pos'}">-${r.totalEvLoss} bb</span></div>`;

    const nErr = hand.decisions.filter((d) => d.class === 'error' || d.class === 'imprecisa').length;
    if (nErr > 0) html += `<div class="result-line" style="border:none;padding-top:6px;color:var(--orange)">${nErr} decisión(es) guardada(s) en "Errores" para repaso.</div>`;

    html += '<div class="card-box" style="margin-top:14px"><h3>Evaluación GTO de la mano</h3>';
    hand.decisions.forEach((d, i) => {
      html += `<div class="dec-review">
        <div class="dec-head"><strong>${cap(d.street)}</strong> · ${escapeHtml(d.label)}
          <span class="verdict ${d.class}">${verdictWord(d.class)}</span>
          ${d.evLoss > 0 ? `<span class="net-neg">-${d.evLoss}bb</span>` : ''}
        </div>`;
      if (d.explanation) html += `<div class="dec-expl">${escapeHtml(d.explanation)}</div>`;
      html += renderOptionGrid(d.optionBreakdown, d.action);
      html += '</div>';
    });
    html += '</div>';

    if (r.villainRangeLog && r.villainRangeLog.length) {
      html += '<div class="card-box" style="margin-top:14px"><h3>Lectura del rango del villano</h3><ul class="range-log">';
      r.villainRangeLog.forEach((e) => {
        html += `<li><strong>${cap(e.street)}</strong> · ${escapeHtml(e.label)}${e.amountBB != null ? ' ' + e.amountBB + 'bb' : ''}: ${escapeHtml(e.summary || e.note)}</li>`;
      });
      html += '</ul>';
      if (r.villainRangeSummary) {
        const summaryLines = r.villainRangeSummary.split(/\.\s+/).filter(Boolean);
        const uniqueSummary = summaryLines.filter((line, i, arr) => arr.indexOf(line) === i).join('. ');
        if (uniqueSummary) html += `<div class="muted-text" style="margin-top:8px">${escapeHtml(uniqueSummary)}</div>`;
      }
      html += '</div>';
    }

    fb.innerHTML = html;
    renderTable();
    $('#hero-handname').textContent = r.heroHandName ? 'Tu mano: ' + r.heroHandName : handNameOnBoard();
  }

  function refreshSessionUI() {
    $('#s-hands').textContent = session.hands;
    $('#s-ev').textContent = (session.net >= 0 ? '+' : '') + Math.round(session.net * 100) / 100;
    const acc = session.decisions ? Math.round((session.good / session.decisions) * 100) + '%' : '-';
    $('#s-acc').textContent = acc;
  }

  // ---------- Histórico ----------
  function renderHistory() {
    const hist = Store.getHistory();
    const box = $('#history-list');
    if (!hist.length) { box.innerHTML = '<div class="empty">Aún no hay manos jugadas.</div>'; return; }
    box.innerHTML = hist.map((h) => {
      const worst = worstClass(h.decisions);
      const netCls = h.heroNet >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="record">
        <div class="rec-cards">${h.heroCards.map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(h.scenario)} <span class="badge ${worst}">${verdictWord(worst)}</span></div>
          <div class="rec-sub">${h.heroCode} · ${fmtDate(h.createdAt)} · ${escapeHtml(h.reason)}</div>
        </div>
        <div class="rec-right">
          <div class="${netCls}">${h.heroNet >= 0 ? '+' : ''}${h.heroNet} bb</div>
          <div style="color:var(--muted);font-size:12px">EV -${h.totalEvLoss} bb</div>
          <button class="btn btn-ghost" style="margin-top:6px;padding:4px 10px;font-size:12px" data-replay='${encodeURIComponent(JSON.stringify(Object.assign({}, h.scenarioRaw, { seed: h.seed })))}'>Repetir mano</button>
        </div>
      </div>`;
    }).join('');
    $$('#history-list [data-replay]').forEach((b) => b.addEventListener('click', () => {
      try { pendingForce = JSON.parse(decodeURIComponent(b.dataset.replay)); } catch (e) { pendingForce = null; }
      goToPlay(); startNewHand();
    }));
  }

  // ---------- Errores ----------
  function renderErrors() {
    const errs = Store.getErrors();
    const box = $('#errors-list');
    if (!errs.length) { box.innerHTML = '<div class="empty">Sin errores registrados. ¡Buen trabajo!</div>'; return; }
    box.innerHTML = errs.map((e) => `<div class="record">
      <div class="rec-cards">${(e.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div class="rec-main">
        <div class="rec-scenario">${escapeHtml(typeof e.scenario === 'string' ? e.scenario : '')} <span class="badge ${e.class}">${verdictWord(e.class)}</span></div>
        <div class="rec-sub">${e.heroCode} · ${e.street} · elegiste <strong>${escapeHtml(e.chosen)}</strong>, mejor: <strong>${actionName(e.best)}</strong> · -${e.evLoss}bb</div>
        <div class="rec-sub">${escapeHtml(e.context || '')}</div>
      </div>
      <div class="rec-right">
        <button class="btn btn-primary" style="padding:6px 12px;font-size:13px" data-train='${encodeURIComponent(JSON.stringify(Object.assign({}, (e.scenarioRaw || {}), { seed: e.seed })))}'>Repetir</button>
        <button class="btn btn-ghost" style="margin-top:6px;padding:4px 10px;font-size:12px" data-del="${e.id}">Quitar</button>
      </div>
    </div>`).join('');
    $$('#errors-list [data-train]').forEach((b) => b.addEventListener('click', () => {
      try {
        const raw = JSON.parse(decodeURIComponent(b.dataset.train));
        pendingForce = typeof raw === 'string' ? scenarioFromError({ scenario: raw }) : raw;
      } catch (e) { pendingForce = null; }
      goToPlay(); startNewHand();
    }));
    $$('#errors-list [data-del]').forEach((b) => b.addEventListener('click', () => { Store.removeError(b.dataset.del); renderErrors(); }));
  }

  function trainNextError() {
    const errs = Store.getErrors();
    if (!errs.length) { alert('No hay errores para entrenar.'); return; }
    const sc = errs[0].scenarioRaw || scenarioFromError(errs[0]);
    pendingForce = sc ? Object.assign({}, sc, { seed: errs[0].seed }) : null;
    goToPlay(); startNewHand();
  }

  // ---------- Estadísticas ----------
  function renderStats() {
    const st = Store.getStats();
    const box = $('#stats-content');
    const total = st.decisions || 1;
    const pct = (n) => Math.round((n / total) * 100);
    const accuracy = st.decisions ? Math.round(((st.optima + st.aceptable) / st.decisions) * 100) : 0;
    box.innerHTML = `
      <div class="stat-card"><div class="big">${st.handsPlayed}</div><div class="lbl">Manos jugadas</div></div>
      <div class="stat-card"><div class="big">${accuracy}%</div><div class="lbl">Acierto (óptima+aceptable)</div></div>
      <div class="stat-card"><div class="big ${st.totalNet >= 0 ? 'net-pos' : 'net-neg'}">${st.totalNet >= 0 ? '+' : ''}${st.totalNet}</div><div class="lbl">Resultado total (bb)</div></div>
      <div class="stat-card"><div class="big net-neg">-${Math.round(st.totalEvLoss * 100) / 100}</div><div class="lbl">EV perdido total (bb)</div></div>
      <div class="stat-card" style="grid-column:1/-1;text-align:left">
        <div class="lbl" style="margin-bottom:6px">Distribución de decisiones (${st.decisions})</div>
        <div class="dist-bar">
          <span style="width:${pct(st.optima)}%;background:var(--green)">${pct(st.optima)}%</span>
          <span style="width:${pct(st.aceptable)}%;background:var(--yellow)">${pct(st.aceptable)}%</span>
          <span style="width:${pct(st.imprecisa)}%;background:var(--orange)">${pct(st.imprecisa)}%</span>
          <span style="width:${pct(st.error)}%;background:var(--red)">${pct(st.error)}%</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">
          <span style="color:var(--green)">&#9632; Óptima ${st.optima}</span> &nbsp;
          <span style="color:var(--yellow)">&#9632; Aceptable ${st.aceptable}</span> &nbsp;
          <span style="color:var(--orange)">&#9632; Imprecisa ${st.imprecisa}</span> &nbsp;
          <span style="color:var(--red)">&#9632; Error ${st.error}</span>
        </div>
      </div>`;
  }

  // ---------- Utilidades ----------
  function exportData() {
    const data = Store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'poker-trainer-datos.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function goToPlay() {
    $$('.tab').forEach((x) => x.classList.remove('active'));
    $$('.tab-panel').forEach((x) => x.classList.remove('active'));
    $('.tab[data-tab="play"]').classList.add('active');
    $('#tab-play').classList.add('active');
  }

  function worstClass(decisions) {
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    let worst = 'optima';
    (decisions || []).forEach((d) => { if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class; });
    return worst;
  }

  function verdictWord(cls) {
    return { optima: 'Óptima', aceptable: 'Aceptable', imprecisa: 'Imprecisa', error: 'Error' }[cls] || cls;
  }
  function actionName(a) {
    return {
      fold: 'Fold', call: 'Call', raise: 'Subir/3-bet', bet: 'Apostar', check: 'Check',
      bet_33: 'Bet 33%', bet_66: 'Bet 66%', bet_100: 'Bet pot'
    }[a] || a;
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  // ============================================================
  //  SESIONES (importar, estadísticas y revisión de manos)
  // ============================================================
  let currentSession = null;
  let currentHand = null;
  let replayState = null;

  function showSessionsView(which) {
    $('#sessions-home').classList.toggle('hidden', which !== 'home');
    $('#session-detail').classList.toggle('hidden', which !== 'detail');
    $('#hand-review').classList.toggle('hidden', which !== 'review');
  }

  function processSessionFile() {
    const input = $('#session-file');
    if (!input.files.length) return;
    const file = input.files[0];
    const status = $('#import-status');
    status.textContent = 'Leyendo fichero...';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        status.textContent = 'Procesando manos...';
        setTimeout(() => {
          const parsed = Importer.parseSession(reader.result, file.name);
          if (!parsed.hero || !parsed.hands.length) {
            status.innerHTML = '<span style="color:var(--red)">No se reconocieron manos de cash NL en el fichero.</span>';
            return;
          }
          const session = Importer.buildSession(parsed, file.name);
          session.rawText = reader.result;
          Store.saveSession(session);
          status.innerHTML = `<span style="color:var(--green)">Sesión procesada: ${session.hands.length} manos jugadas (de ${session.nTotal} cash, ${session.nDiscarded} descartadas por fold preflop).</span>`;
          input.value = ''; $('#process-session').disabled = true;
          renderSessionsList();
          openSession(session.id);
        }, 30);
      } catch (err) {
        status.innerHTML = '<span style="color:var(--red)">Error al procesar: ' + escapeHtml(err.message) + '</span>';
      }
    };
    reader.onerror = () => { status.textContent = 'No se pudo leer el fichero.'; };
    reader.readAsText(file, 'utf-8');
  }

  function renderSessionsList() {
    const sessions = Store.getSessions();
    const box = $('#sessions-list');
    if (!sessions.length) { box.innerHTML = '<div class="empty">No hay sesiones. Añade un fichero .txt arriba.</div>'; return; }
    box.innerHTML = sessions.map((s) => {
      const st = s.stats;
      const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="record session-card">
        <div class="rec-main">
          <div class="rec-scenario">${escapeHtml(s.fileName)} <span class="badge grade-${st.grade.letter[0]}">Nota ${st.grade.letter}</span></div>
          <div class="rec-sub">Héroe: <strong>${escapeHtml(s.hero)}</strong> · ${st.nHands} manos · ${fmtDate(s.createdAt)} ${s.hasTxt ? '' : '· <em>txt borrado</em>'}</div>
          <div class="rec-sub">Acierto ${st.accuracy}% · <span class="${netCls}">${st.netBB >= 0 ? '+' : ''}${st.netBB} bb</span> · EV perdido -${st.evLossBB} bb</div>
        </div>
        <div class="rec-right" style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-primary" style="padding:6px 12px;font-size:13px" data-open="${s.id}">Revisar manos</button>
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" data-deltxt="${s.id}" ${s.hasTxt ? '' : 'disabled'}>Borrar txt</button>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px" data-delses="${s.id}">Borrar sesión</button>
        </div>
      </div>`;
    }).join('');
    $$('#sessions-list [data-open]').forEach((b) => b.addEventListener('click', () => openSession(b.dataset.open)));
    $$('#sessions-list [data-deltxt]').forEach((b) => b.addEventListener('click', () => {
      if (confirm('¿Borrar el fichero .txt asociado? La ficha de sesión se conserva.')) { Store.deleteSessionTxt(b.dataset.deltxt); renderSessionsList(); }
    }));
    $$('#sessions-list [data-delses]').forEach((b) => b.addEventListener('click', () => {
      if (confirm('¿Borrar la sesión completa? Esta acción no se puede deshacer.')) { Store.removeSession(b.dataset.delses); renderSessionsList(); }
    }));
  }

  function openSession(id) {
    currentSession = Store.getSession(id);
    if (!currentSession) return;
    renderSessionDetail('evLoss');
    showSessionsView('detail');
  }

  function renderSessionDetail(sortBy) {
    const s = currentSession, st = s.stats;
    const netCls = st.netBB >= 0 ? 'net-pos' : 'net-neg';
    const accSt = st.accByStreet;
    const box = $('#session-detail-content');

    const statHtml = `
      <h2>${escapeHtml(s.fileName)} <span class="badge grade-${st.grade.letter[0]}">Nota ${st.grade.letter} · ${st.grade.score}/10</span></h2>
      <p class="muted-text">${escapeHtml(st.grade.verdict)}</p>
      <div class="stats-content">
        <div class="stat-card"><div class="big">${st.nHands}</div><div class="lbl">Manos jugadas</div></div>
        <div class="stat-card"><div class="big ${netCls}">${st.netBB >= 0 ? '+' : ''}${st.netBB}</div><div class="lbl">bb ganadas/perdidas</div></div>
        <div class="stat-card"><div class="big">${st.accuracy}%</div><div class="lbl">Acierto global</div></div>
        <div class="stat-card"><div class="big net-neg">-${st.evLossBB}</div><div class="lbl">EV perdido total (bb)</div></div>
      </div>
      <div class="card-box" style="margin-top:14px">
        <h3>Acierto por calle</h3>
        <div class="street-acc">
          ${streetAccBar('Preflop', accSt.preflop)}
          ${streetAccBar('Flop', accSt.flop)}
          ${streetAccBar('Turn', accSt.turn)}
          ${streetAccBar('River', accSt.river)}
        </div>
      </div>
      <div class="card-box">
        <h3>EV perdido: decisiones vs varianza</h3>
        <div class="dist-bar">
          <span style="width:${st.pctDecision}%;background:var(--red)">${st.pctDecision}% decisiones</span>
          <span style="width:${st.pctVariance}%;background:var(--accent)">${st.pctVariance}% varianza</span>
        </div>
        <div class="muted-text" style="margin-top:8px">Pérdida por decisiones: <strong>-${st.evDecision} bb</strong>. Ajuste por varianza/suerte: <strong>${st.varianceAdj >= 0 ? '+' : ''}${st.varianceAdj} bb</strong> (estimación: si hubieras jugado GTO tu resultado esperado sería ≈ ${st.varianceAdj >= 0 ? '+' : ''}${st.varianceAdj} bb).</div>
      </div>
      <div class="top-hands">
        <div class="card-box"><h3>5 mejores manos</h3>${topHandsHtml(st.best5)}</div>
        <div class="card-box"><h3>5 peores manos</h3>${topHandsHtml(st.worst5)}</div>
      </div>`;

    const sortHtml = `
      <div class="panel-head" style="margin-top:18px">
        <h3>Manos de la sesión (${s.hands.length})</h3>
        <div>
          <label class="muted-text" style="font-size:13px">Ordenar:
            <select id="hand-sort">
              <option value="evLoss" ${sortBy === 'evLoss' ? 'selected' : ''}>Mayor EV perdido</option>
              <option value="evLossAsc" ${sortBy === 'evLossAsc' ? 'selected' : ''}>Menor EV perdido</option>
              <option value="accAsc" ${sortBy === 'accAsc' ? 'selected' : ''}>Menor acierto</option>
              <option value="accDesc" ${sortBy === 'accDesc' ? 'selected' : ''}>Mayor acierto</option>
              <option value="netAsc" ${sortBy === 'netAsc' ? 'selected' : ''}>Más bb perdidas</option>
              <option value="netDesc" ${sortBy === 'netDesc' ? 'selected' : ''}>Más bb ganadas</option>
            </select>
          </label>
        </div>
      </div>
      <div id="session-hands" class="record-list"></div>`;

    box.innerHTML = statHtml + sortHtml;
    $('#hand-sort').addEventListener('change', (e) => renderSessionDetail(e.target.value));
    $$('#session-detail-content [data-review]').forEach((b) => b.addEventListener('click', () => openHandReview(b.dataset.review, 'review')));
    $$('#session-detail-content [data-replay]').forEach((b) => b.addEventListener('click', () => openHandReview(b.dataset.replay, 'replay')));
    renderSessionHands(sortBy);
  }

  function streetAccBar(label, pct) {
    if (pct == null) return `<div class="street-acc-row"><span class="lbl">${label}</span><span class="muted-text">sin decisiones</span></div>`;
    const color = pct >= 75 ? 'var(--green)' : (pct >= 55 ? 'var(--yellow)' : 'var(--red)');
    return `<div class="street-acc-row"><span class="lbl">${label}</span>
      <span class="track"><span class="fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="pct">${pct}%</span></div>`;
  }

  function topHandsHtml(list) {
    if (!list.length) return '<div class="muted-text">—</div>';
    return list.map((h) => {
      const netCls = h.heroNetBB >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="mini-hand">
        <div class="mini-hand-row">
          <span class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</span>
          <span>${h.heroCode} ${h.heroPos}</span>
          <span class="${netCls}">${h.heroNetBB >= 0 ? '+' : ''}${h.heroNetBB}bb</span>
          <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span>
        </div>
        <div class="mini-hand-actions">
          <button class="btn btn-ghost mini-link" data-review="${h.id}">Paso a paso</button>
          <button class="btn btn-primary mini-link" data-replay="${h.id}">Volver a jugar</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderSessionHands(sortBy) {
    const hands = currentSession.hands.slice();
    const sorters = {
      evLoss: (a, b) => b.totalEvLoss - a.totalEvLoss,
      evLossAsc: (a, b) => a.totalEvLoss - b.totalEvLoss,
      accAsc: (a, b) => a.accuracy - b.accuracy,
      accDesc: (a, b) => b.accuracy - a.accuracy,
      netAsc: (a, b) => a.heroNetBB - b.heroNetBB,
      netDesc: (a, b) => b.heroNetBB - a.heroNetBB
    };
    hands.sort(sorters[sortBy] || sorters.evLoss);
    const box = $('#session-hands');
    box.innerHTML = hands.map((h) => {
      const netCls = h.heroNetBB >= 0 ? 'net-pos' : 'net-neg';
      return `<div class="record">
        <div class="rec-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
        <div class="rec-main">
          <div class="rec-scenario">${h.heroCode} <span style="color:var(--muted)">(${h.heroPos})</span> <span class="badge ${h.worstClass}">${verdictWord(h.worstClass)}</span></div>
          <div class="rec-sub">Board: ${(h.board || []).map(Cards.cardToHTML).join('') || '—'} · ${h.nDecisions} decisiones · acierto ${h.accuracy}%</div>
        </div>
        <div class="rec-right" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <div><span class="${netCls}">${h.heroNetBB >= 0 ? '+' : ''}${h.heroNetBB}bb</span> · <span style="color:var(--red)">EV -${h.totalEvLoss}bb</span></div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" data-review="${h.id}">Paso a paso</button>
            <button class="btn btn-primary" style="padding:4px 10px;font-size:12px" data-replay="${h.id}">Volver a jugar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    $$('#session-hands [data-review]').forEach((b) => b.addEventListener('click', () => openHandReview(b.dataset.review, 'review')));
    $$('#session-hands [data-replay]').forEach((b) => b.addEventListener('click', () => openHandReview(b.dataset.replay, 'replay')));
  }

  function findHand(id) { return currentSession.hands.find((h) => h.id === id); }

  function openHandReview(handId, mode) {
    currentHand = findHand(handId);
    if (!currentHand) return;
    showSessionsView('review');
    if (mode === 'replay') startInteractiveReplay();
    else renderTimelineReview();
  }

  function boardForStreet(hand, street) {
    const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
    return (hand.board || []).slice(0, n);
  }

  /** Reconstruye metadatos del spot para re-evaluar sesiones importadas. */
  function inferDecisionMeta(d) {
    let spotKind = d.spotKind;
    let vsPosition = d.vsPosition;
    let vsRfiKey = d.vsRfiKey;
    const spot = d.spot || '';
    if (!spotKind) {
      if (/^RFI /.test(spot)) spotKind = 'RFI';
      else if (/squeeze/.test(spot)) spotKind = 'squeeze';
      else if (/iso/.test(spot)) spotKind = 'isoLimp';
      else if (/3-bet|3bet/i.test(spot)) spotKind = 'face3bet';
      else if (/4-bet|4bet/i.test(spot)) spotKind = 'face4bet';
      else if (/ vs /.test(spot)) {
        spotKind = 'vsRFI';
        const m = spot.match(/^(\S+)\s+vs\s+(\S+)/);
        if (m) { vsPosition = m[2]; vsRfiKey = m[1] + '_vs_' + m[2]; }
      } else spotKind = d.street === 'preflop' ? 'vsRFI' : 'postflop';
    }
    return {
      spotKind,
      vsPosition,
      vsRfiKey,
      initiative: d.initiative || (spotKind === 'RFI' ? 'none' : 'caller')
    };
  }

  function buildReplayEvalInput(h, d, action, board) {
    const meta = inferDecisionMeta(d);
    return {
      spotKind: meta.spotKind,
      position: h.heroPos,
      vsPosition: meta.vsPosition,
      vsRfiKey: meta.vsRfiKey,
      stackDepth: 100,
      street: d.street,
      board,
      heroCards: h.heroCards,
      handCode: h.heroCode,
      potBB: d.potBB,
      toCallBB: d.toCallBB || 0,
      chosenAction: action,
      villainRange: GTO.Ranges.data.BROAD_CONTINUE,
      availableActions: d.options || optionsFor(d.gto),
      initiative: meta.initiative
    };
  }

  // --- Revisión paso a paso (lo que ocurrió realmente + evaluación GTO) ---
  function renderTimelineReview() {
    const h = currentHand;
    const box = $('#hand-review-content');
    const decByKey = {};
    h.decisions.forEach((d, i) => { decByKey[d.street + '#' + i] = d; });
    // mapear decisiones del héroe en orden por calle
    const heroDecQueue = {};
    ['preflop', 'flop', 'turn', 'river'].forEach((st) => { heroDecQueue[st] = h.decisions.filter((d) => d.street === st).slice(); });

    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>${h.heroCode} · ${h.heroPos}</h2>
        <div class="muted-text">Mano #${h.id} · Resultado real: <span class="${h.heroNetBB >= 0 ? 'net-pos' : 'net-neg'}">${h.heroNetBB >= 0 ? '+' : ''}${h.heroNetBB} bb</span> · EV perdido: -${h.totalEvLoss} bb</div>
      </div>
    </div>`;

    html += '<div class="timeline">';
    h.summary.forEach((item) => {
      if (item.kind === 'street') {
        html += `<div class="tl-street"><span>${cap(item.street)}</span> ${item.board.length ? '<span class="tl-board">' + item.board.map(Cards.cardToHTML).join('') + '</span>' : ''}</div>`;
      } else {
        const isHero = item.player === currentSession.hero;
        let heroDec = null;
        let line = `<div class="tl-action ${isHero ? 'hero' : ''}">
          <span class="tl-player">${escapeHtml(item.player)}${item.pos ? ' (' + item.pos + ')' : ''}</span>
          <span class="tl-move">${actionWord(item)}</span>`;
        if (isHero && (item.type === 'fold' || item.type === 'call' || item.type === 'raise' || item.type === 'bet' || item.type === 'check')) {
          heroDec = heroDecQueue[item.street] && heroDecQueue[item.street].shift();
          if (heroDec) {
            line += ` <span class="badge ${heroDec.class}">${verdictWord(heroDec.class)}</span>`;
            if (heroDec.class !== 'optima') line += ` <span class="tl-eval">mejor: ${actionName(heroDec.best)} · EV -${heroDec.evLoss}bb</span>`;
            if (heroDec.heroEquity != null) line += ` <span class="muted-text">eq ${heroDec.heroEquity}%</span>`;
          }
        }
        line += '</div>';
        html += line;
        if (heroDec && (heroDec.class === 'error' || heroDec.class === 'imprecisa')) {
          html += `<div class="tl-expl-block ${heroDec.class}">`;
          if (heroDec.explanation) html += `<div class="tl-expl">${escapeHtml(heroDec.explanation)}</div>`;
          if (heroDec.optionBreakdown && heroDec.optionBreakdown.length) html += renderOptionGrid(heroDec.optionBreakdown, heroDec.chosen);
          html += '</div>';
        }
      }
    });
    html += '</div>';

    // cartas del villano si se mostraron
    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== currentSession.hero);
    if (shows.length) {
      html += '<div class="card-box"><h3>Cartas mostradas</h3>' + shows.map((n) =>
        `<div class="tl-action"><span class="tl-player">${escapeHtml(n)}</span> <span class="rec-cards">${h.villainShows[n].map(Cards.cardToHTML).join('')}</span></div>`
      ).join('') + '</div>';
    }

    html += `<button class="btn btn-primary" id="to-replay" style="margin-top:14px">Volver a jugar esta mano con GTO &raquo;</button>`;
    box.innerHTML = html;
    $('#to-replay').addEventListener('click', () => startInteractiveReplay());
  }

  // --- Volver a jugar la mano evaluando cada decisión con GTO ---
  function startInteractiveReplay() {
    const h = currentHand;
    replayState = { idx: 0, userEvLoss: 0, good: 0, total: 0 };
    renderReplayStep();
  }

  function renderReplayStep() {
    const h = currentHand;
    const box = $('#hand-review-content');
    if (replayState.idx >= h.decisions.length) return renderReplaySummary();
    const d = h.decisions[replayState.idx];
    const board = boardForStreet(h, d.street);

    let html = `<div class="review-head">
      <div class="rec-cards big-cards">${(h.heroCards || []).map(Cards.cardToHTML).join('')}</div>
      <div>
        <h2>Volver a jugar: ${h.heroCode} · ${h.heroPos}</h2>
        <div class="muted-text">Decisión ${replayState.idx + 1} de ${h.decisions.length}</div>
      </div>
    </div>`;
    const fmtBB = window.GTOPotMath ? window.GTOPotMath.formatBB : (x) => String(x);
    html += `<div class="poker-table" style="padding:0"><div class="table-felt" style="min-height:auto;border-radius:18px">
      <div class="board-area"><div class="pot">Bote: ${fmtBB(d.potBB)} bb</div><div class="board">${board.map(Cards.cardToHTML).join('') || '<span style="color:rgba(255,255,255,.3)">— preflop —</span>'}</div></div>
    </div></div>`;
    html += `<div class="spot-context" style="margin:12px 0">${escapeHtml(d.context)}</div>`;
    const opts = d.options || optionsFor(d.gto);
    html += `<div class="actions" id="replay-actions">` + opts.map((a) =>
      `<button class="btn btn-${btnClassForAction(a)}" data-act="${a}">${escapeHtml(replayActionLabel(a, d))}</button>`
    ).join('') + `</div>`;
    html += `<div id="replay-feedback"></div>`;
    box.innerHTML = html;
    $$('#replay-actions [data-act]').forEach((b) => b.addEventListener('click', () => submitReplay(b.dataset.act)));
  }

  function optionsFor(gto) {
    const order = ['fold', 'check', 'call', 'bet_33', 'bet_66', 'bet_100', 'bet', 'raise'];
    return order.filter((a) => gto && gto[a] != null);
  }

  function submitReplay(action) {
    const h = currentHand;
    const d = h.decisions[replayState.idx];
    const board = boardForStreet(h, d.street);
    const evalResult = GTO.evaluateSpot(buildReplayEvalInput(h, d, action, board));
    const ev = evalResult.evaluation;
    replayState.userEvLoss += ev.evLoss;
    replayState.total++;
    if (ev.class === 'optima' || ev.class === 'aceptable') replayState.good++;

    showVerdictToast({ class: ev.class, frequency: ev.frequency, evLoss: ev.evLoss });

    $$('#replay-actions [data-act]').forEach((b) => { b.disabled = true; });
    const fb = $('#replay-feedback');
    const sameAsReal = action === d.chosen;
    let html = `<div class="feedback" style="display:block">
      <h3>Tu decisión: <span class="verdict ${ev.class}">${verdictWord(ev.class)}</span>${ev.score != null ? ` · ${ev.score}/100` : ''}</h3>
      <div>Elegiste <strong>${actionName(action)}</strong> · EV loss: <span class="${ev.evLoss > 0 ? 'net-neg' : 'net-pos'}">${ev.evLoss > 0 ? '-' + ev.evLoss : '0'} bb</span>${ev.evLossTier ? ` (${ev.evLossTier})` : ''}</div>`;
    if (evalResult.explanation) html += `<div class="spot-context" style="margin-top:6px;font-size:13px">${escapeHtml(evalResult.explanation)}</div>`;
    html += renderOptionGrid(evalResult.optionBreakdown, action);
    html += `<div class="muted-text" style="margin-top:6px">En la mano real elegiste <strong>${actionName(d.chosen)}</strong> (${verdictWord(d.class)}).${sameAsReal ? ' Misma decisión.' : ''}</div>
      <button class="btn btn-primary" id="replay-next" style="margin-top:12px">${replayState.idx + 1 >= h.decisions.length ? 'Ver resumen' : 'Siguiente decisión »'}</button>
    </div>`;
    fb.innerHTML = html;
    $('#replay-next').addEventListener('click', () => { replayState.idx++; renderReplayStep(); });
  }

  function renderReplaySummary() {
    const h = currentHand;
    const box = $('#hand-review-content');
    const acc = replayState.total ? Math.round((replayState.good / replayState.total) * 100) : 100;
    const shows = Object.keys(h.villainShows || {}).filter((n) => n !== currentSession.hero);
    let html = `<div class="feedback" style="display:block">
      <h3>Resumen de tu repetición</h3>
      <div>Acierto: <strong>${acc}%</strong> · EV perdido por tus decisiones: <span class="${replayState.userEvLoss > 0 ? 'net-neg' : 'net-pos'}">-${round2(replayState.userEvLoss)} bb</span></div>
      <div class="muted-text" style="margin-top:6px">En la mano real: acierto ${h.accuracy}% · EV perdido -${h.totalEvLoss} bb · resultado ${h.heroNetBB >= 0 ? '+' : ''}${h.heroNetBB} bb.</div>`;
    if (shows.length) {
      html += '<div class="result-line">Cartas del rival: ' + shows.map((n) => `${escapeHtml(n)} ${h.villainShows[n].map(Cards.cardToHTML).join('')}`).join(' · ') + '</div>';
    }
    html += `<div class="result-line" style="border:none;padding-top:6px">Board final: ${(h.board || []).map(Cards.cardToHTML).join('') || '—'}</div>`;
    html += `<div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-ghost" id="replay-again">Repetir</button>
      <button class="btn btn-primary" id="replay-stepbystep">Ver paso a paso real</button>
    </div></div>`;
    box.innerHTML = html;
    $('#replay-again').addEventListener('click', () => startInteractiveReplay());
    $('#replay-stepbystep').addEventListener('click', () => renderTimelineReview());
  }

  function replayActionLabel(a, d) {
    if (a === 'call' && d.toCallBB > 0) return actionName(a) + ' ' + d.toCallBB + 'bb';
    if (a.indexOf('bet_') === 0) {
      const mult = a === 'bet_33' ? 0.33 : (a === 'bet_66' ? 0.66 : 1);
      const pct = a === 'bet_33' ? '33%' : (a === 'bet_66' ? '66%' : 'pot');
      const size = round2(Math.max(1, (d.potBB || 1) * mult));
      return `Bet ${size}bb (${pct})`;
    }
    return actionName(a);
  }

  function actionWord(item) {
    switch (item.type) {
      case 'fold': return 'se retira';
      case 'check': return 'pasa';
      case 'call': return 'iguala ' + (item.amount || 0) + '€';
      case 'bet': return 'apuesta ' + (item.amount || 0) + '€' + (item.allin ? ' (all-in)' : '');
      case 'raise': return 'sube a ' + (item.to || 0) + '€' + (item.allin ? ' (all-in)' : '');
      default: return item.type;
    }
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function round2(x) { return Math.round(x * 100) / 100; }

  document.addEventListener('DOMContentLoaded', init);
})();
