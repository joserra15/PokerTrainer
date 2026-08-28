/* Listas de JS por chunk — fuente única para build (Node) y fallback en navegador. */
(function (root) {
  'use strict';

  var ENGINE = [
    'js/cards.js',
    'js/engine/cache.js',
    'js/engine/format/taxonomy.js',
    'js/engine/ranges/notation.js',
    'js/engine/ranges/data.js',
    'js/engine/ranges/extended.js',
    'js/engine/ranges/rfi-solver-data.js',
    'js/engine/ranges/vs-rfi-solver-data.js',
    'js/engine/ranges/vs-3bet-solver-data.js',
    'js/engine/ranges/variants.js',
    'js/engine/ranges/phase3-layers-data.js',
    'js/engine/ranges/nash-push-data.js',
    'js/engine/ranges/jsonLoader.js',
    'js/engine/ranges/pushFold.js',
    'js/engine/ranges/registry.js',
    'js/engine/ranges/weights.js',
    'js/engine/ranges/villainTracking.js',
    'js/engine/handStrength.js',
    'js/engine/equity/madeHand.js',
    'js/engine/math/potMath.js',
    'js/engine/math/evMath.js',
    'js/engine/equity/monteCarlo.js',
    'js/engine/equity/handRank.js',
    'js/engine/equity/blockers.js',
    'js/engine/solver/boardCluster.js',
    'js/engine/validation/boardTextureShift.js',
    'js/engine/validation/villainCallAudit.js',
    'js/engine/validation/streetStrategy.js',
    'js/engine/solver/rangeAdvantage.js',
    'js/engine/solver/riverShoveNode.js',
    'js/engine/solver/probeEV.js',
    'js/engine/solver/villainStrategyAdjust.js',
    'js/engine/solver/preflopSolver.js',
    'js/engine/solver/facingBet.js',
    'js/engine/solver/spotKey.js',
    'js/engine/solver/strategyTables.js',
    'js/engine/solver/bluffSpotDetector.js',
    'js/engine/solver/SolverProvider.js',
    'js/engine/scoring/classifier.js',
    'js/engine/scoring/icmEv.js',
    'js/engine/scoring/evLoss.js',
    'js/engine/scoring/scoring.js',
    'js/engine/scoring/errors.js',
    'js/engine/explanations/rules.js',
    'js/engine/solver/LocalSolverProvider.js',
    'js/engine/evaluateSpot.js',
    'js/engine/villainProfiles.js',
    'js/engine/villainPreflop.js',
    'js/engine/multiway.js',
    'js/engine/stacks.js'
  ];

  var CHUNKS = {
    core: ENGINE.concat([
      'js/ranges.js',
      'js/play-config.js',
      'js/live-advisor.js',
      'js/action-line.js',
      'js/engine.js',
      'js/ai-hand-payload.js',
      'js/ai-report.js',
      'js/storage.js',
      'js/stats-aggregate.js',
      'js/cloud-sessions.js',
      'js/sample-session.js',
      'js/usage-ui.js',
      'js/leaks.js',
      'js/progress.js',
      'js/gamification.js',
      'js/disclaimer.js',
      'js/re-engagement.js',
      'js/share-hand.js',
      'js/session-export.js',
      'js/card-picker.js',
      'js/age-gate.js',
      'js/hotkeys.js',
      'js/help.js',
      'js/user-profile.js',
      'js/demo-mode.js',
      'js/entitlements.js',
      'js/billing.js',
      'js/founder-request.js',
      'js/onboarding.js',
      'js/pwa.js',
      'js/push.js',
      'js/account-settings.js',
      'js/auth.js',
      'js/app.js'
    ]),
    sessions: [
      'js/import/hhUtils.js',
      'js/import/formatDetector.js',
      'js/import/icmLite.js',
      'js/import/populationCompare.js',
      'js/import/tournamentSummary.js',
      'js/import/parsers/pokerstars.js',
      'js/import/parsers/winamax.js',
      'js/import/parsers/ggpoker.js',
      'js/import/parsers/eightyeight.js',
      'js/import/parsers/coinpoker.js',
      'js/import.js'
    ],
    analysis: ['js/hand-analysis.js'],
    ranges: ['js/range-matrix.js'],
    learn: ['js/beginner-guide.js'],
    school: [
      'js/school-data.js',
      'js/school-data-m1.js',
      'js/school-data-m2.js',
      'js/school-data-spin.js',
      'js/school-data-mtt.js',
      'js/school-data-ranges.js',
      'js/school-data-pro.js',
      'js/school-extra-spots.js',
      'js/school-data-practice.js',
      'js/school-data-ranges-line.js',
      'js/school-data-ranges-line-sizing.js',
      'js/school-data-viral-quizzes.js',
      'js/school-matrix-drills.js',
      'js/school-share.js',
      'js/school-daily-spot.js',
      'js/school.js'
    ],
    legendary: [
      'js/legendary-hands-catalog.js',
      'js/legendary-force.js',
      'js/legendary-result.js',
      'js/legendary-share.js',
      'js/legendary-hands.js'
    ],
    contact: ['js/contact.js'],
    admin: ['js/admin-panel.js', 'js/admin-promotions.js']
  };

  var ALL_APP_SCRIPTS = CHUNKS.core.concat(
    CHUNKS.sessions,
    CHUNKS.analysis,
    CHUNKS.ranges,
    CHUNKS.learn,
    CHUNKS.school,
    CHUNKS.legendary,
    CHUNKS.contact,
    CHUNKS.admin
  );

  var api = { ENGINE: ENGINE, CHUNKS: CHUNKS, ALL_APP_SCRIPTS: ALL_APP_SCRIPTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PT_BUNDLE_CHUNKS = CHUNKS;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : null);
