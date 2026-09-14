#!/usr/bin/env node
'use strict';

/**
 * ForgeCoach en resumen de torneo: el hilo debe persistir como session
 * (tournamentSession era un kind huérfano que nunca se guardaba/restauraba).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

{
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  assert.ok(/kind:\s*'session'/.test(uiSrc), 'ui mounts with persist kind session');
  assert.ok(!/kind:\s*'tournamentSession'/.test(uiSrc), 'ui no longer uses orphan tournamentSession kind');
  assert.ok(uiSrc.includes('preservedCoach'), 'paint preserves coach DOM on result');
  assert.ok(uiSrc.includes('onThreadUpdate'), 'keeps coachThread on _savedSession');

  const aiSrc = fs.readFileSync(path.join(ROOT, 'js/ai-report.js'), 'utf8');
  assert.ok(/tournamentSession/.test(aiSrc) && /sessionKinds/.test(aiSrc),
    'resolvePersistTarget still accepts tournamentSession alias');
  assert.ok(/No borrar el hilo/.test(aiSrc), 'loading preserves conversation');
}

{
  const code = fs.readFileSync(path.join(ROOT, 'js/ai-report.js'), 'utf8');
  const sessions = Object.create(null);
  const store = {
    getCoachThread: function (target) {
      if (!target || target.kind !== 'session' || !target.sessionId) return [];
      const s = sessions[target.sessionId];
      return s && Array.isArray(s.coachThread) ? s.coachThread.slice() : [];
    },
    appendCoachEntry: function (target, entry) {
      if (!target || target.kind !== 'session' || !target.sessionId) {
        return Promise.resolve({ ok: false, error: 'invalid_target' });
      }
      if (!sessions[target.sessionId]) {
        sessions[target.sessionId] = { id: target.sessionId, coachThread: [] };
      }
      const s = sessions[target.sessionId];
      s.coachThread.unshift(entry);
      return Promise.resolve({ ok: true, entry: entry, thread: s.coachThread.slice() });
    }
  };

  /* Extract and evaluate resolvePersistTarget by mounting a tiny harness:
     we re-declare the function from source via Function constructor on the matching block. */
  const m = code.match(/function resolvePersistTarget\(options, dataObj\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'resolvePersistTarget found');
  const resolvePersistTarget = new Function(
    'return (' + m[0] + ')'
  )();

  const sessionId = 'trn-abc';
  const asSession = resolvePersistTarget({
    persist: { kind: 'session', getSessionId: function () { return sessionId; } }
  }, { id: sessionId });
  assert.deepStrictEqual(asSession, { kind: 'session', sessionId: sessionId });

  const asAlias = resolvePersistTarget({
    persist: { kind: 'tournamentSession', getSessionId: function () { return sessionId; } }
  }, { id: sessionId });
  assert.deepStrictEqual(asAlias, { kind: 'session', sessionId: sessionId },
    'tournamentSession alias maps to session');

  const orphan = resolvePersistTarget({
    persist: { kind: 'tournamentSessionBroken' }
  }, { id: sessionId });
  assert.strictEqual(orphan, null, 'unknown kinds still return null');

  return store.appendCoachEntry(asAlias, {
    mode: 'question',
    question: 'fuga',
    reportMarkdown: 'Trabaja folds en BTN'
  }).then(function (saved) {
    assert.ok(saved.ok);
    const thread = store.getCoachThread(asAlias);
    assert.strictEqual(thread.length, 1);
    assert.ok(thread[0].reportMarkdown.indexOf('folds') >= 0);
    /* Remount simulation: same target must restore answers */
    const again = store.getCoachThread(
      resolvePersistTarget({
        persist: { kind: 'session', getSessionId: function () { return sessionId; } }
      }, { id: sessionId })
    );
    assert.strictEqual(again.length, 1, 'answers survive remount via session persist');
    console.log('OK tournament-coach-persist');
  });
}
