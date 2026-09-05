#!/usr/bin/env node
/**
 * Lista canónica de regresiones Node (= `.github/workflows/static.yml`).
 * Uso: node tools/run-ci-tests.js
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const STEPS = [
  ['Build JS bundles', ['node', 'tools/build-bundles.js']],
  ['Selftest', ['node', 'tools/selftest.js']],
  ['Test importador ES/EN/Winamax/GGPoker/CoinPoker', ['node', 'tools/testimport.js']],
  ['Test P0 session/onboarding', ['node', 'tools/test-p0-session-onboarding.js']],
  ['P1 retention regression', ['node', 'tools/test-p1-retention.js']],
  ['P2 expansion regression', ['node', 'tools/test-p2-expansion.js']],
  ['UX trainer mode / lang', ['node', 'tools/test-ux-trainer-lang.js']],
  ['Test VPIP/PFR (incl. Poker91 Zoom)', ['node', 'tools/test-vpip-pfr.js']],
  ['Validar rangos JSON solver', ['node', 'tools/validate-ranges-json.js']],
  ['Regresión tablas de rangos (dominancia/tokens/scoring)', ['node', 'tools/test-range-tables.js']],
  ['Regresión EV Poker76', ['node', 'tools/regression-poker76.js']],
  ['Regresión EV modo Jugar', ['node', 'tools/test-play-ev.js']],
  ['Test payload informe IA', ['node', 'tools/test-ai-payload.js']],
  ['Test saludo ForgeCoach caché 8h', ['node', 'tools/test-home-greeting-cache.js']],
  ['Test river trips board doblado', ['node', 'tools/test-river-trips.js']],
  ['Test river top-two value raise', ['node', 'tools/test-river-top-two-value-raise.js']],
  ['Test villano no foldea las nuts', ['node', 'tools/test-villain-never-fold-nuts.js']],
  ['Test villanos pro líneas/sizing/formato', ['node', 'tools/test-villain-pro-lines.js']],
  ['Test hero exploit adjust', ['node', 'tools/test-hero-exploit-adjust.js']],
  ['Test villain type trainer', ['node', 'tools/test-villain-type-trainer.js']],
  ['Test análisis de manos', ['node', 'tools/test-hand-analysis.js']],
  ['Test GTO eval UI', ['node', 'tools/test-gto-eval-ui.js']],
  ['Test range cell popup', ['node', 'tools/test-range-cell-popup.js']],
  ['Test BB vs SB', ['node', 'tools/test-bb-vs-sb-position.js']],
  ['Test coherencia "mejor" vs mezcla GTO', ['node', 'tools/test-best-mix-coherence.js']],
  ['Regresión frecuencias flop/turn (Colorado 98s)', ['node', 'tools/test-flop-turn-freq-duplicate.js']],
  ['Test card picker UX', ['node', 'tools/test-card-picker-ux.js']],
  ['Test growth UX', ['node', 'tools/test-growth-ux.js']],
  ['Test stats redesign', ['node', 'tools/test-stats-redesign.js']],
  ['Test hotkeys, rake y ayuda', ['node', 'tools/test-hotkeys-rake-help.js']],
  // Fase 1 — scripts que ya existían fuera de CI
  ['Test all-in runout', ['node', 'tools/test-allin-runout.js']],
  ['Test river nut flush', ['node', 'tools/test-river-board-ace-nut-flush.js']],
  ['Test river flush raise equity', ['node', 'tools/test-river-flush-raise-equity.js']],
  ['Test river monotone', ['node', 'tools/test-river-monotone-bet-range.js']],
  ['Test river equity polarizada (bluff-catch)', ['node', 'tools/test-river-equity-polar.js']],
  ['Test hand score 0–10', ['node', 'tools/test-hand-score.js']],
  ['Test share-hand HTML', ['node', 'tools/test-share-hand.js']],
  ['Test landing i18n', ['node', 'tools/test-landing-i18n.js']],
  ['Test landing login CTA', ['node', 'tools/test-landing-login-cta.js']],
  ['Test botones Entrar PKCE', ['node', 'tools/test-entrar-buttons-pkce.js']],
  ['Test guest traps', ['node', 'tools/test-guest-traps.js']],
  ['Test guest mode', ['node', 'tools/test-guest-mode.js']],
  ['Test login desktop regression', ['node', 'tools/test-login-desktop-regression.js']],
  ['Test build-guard no deploy-info', ['node', 'tools/test-build-guard-no-deploy-info.js']],
  ['Test JS asset versioning', ['node', 'tools/test-js-asset-versioning.js']],
  ['Test asset cache invalidation', ['node', 'tools/test-asset-cache-invalidation.js']],
  ['Test OAuth callback explicit', ['node', 'tools/test-oauth-callback-explicit.js']],
  ['Test guest OAuth handoff', ['node', 'tools/test-guest-oauth-handoff.js']],
  ['Test contact pending popup', ['node', 'tools/test-contact-pending-popup.js']],
  ['Test replay hand', ['node', 'tools/test-replay-hand.js']],
  // Fase 1 — nuevos
  ['Test entitlements / cuotas', ['node', 'tools/test-entitlements.js']],
  // Fase 2
  ['Test cloud merge', ['node', 'tools/test-cloud-merge.js']],
  ['Test cloud sessions slim', ['node', 'tools/test-cloud-sessions.js']],
  ['Test RLS policies (SQL)', ['node', 'tools/test-rls-policies.js']],
  ['Test auth contract', ['node', 'tools/test-auth-contract.js']],
  ['Test auth bootstrap login UI', ['node', 'tools/test-auth-bootstrap-login-ui.js']],
  ['Test stale auth → landing', ['node', 'tools/test-stale-auth-landing.js']],
  ['Test Stripe Edge contracts', ['node', 'tools/test-stripe-edge-contracts.js']],
  ['Test analyze-hand contract', ['node', 'tools/test-analyze-hand-contract.js']],
  ['Test billing UI markers', ['node', 'tools/test-billing-ui.js']],
  ['Test founder request', ['node', 'tools/test-founder-request.js']],
  ['Test precios FOUNDER', ['node', 'tools/test-founder-pricing.js']],
  ['Test golden hands EV', ['node', 'tools/test-golden-hands.js']],
  // Fase 3
  ['Test stripe-sync contracts', ['node', 'tools/test-stripe-sync-contracts.js']],
  ['Test promo redeem', ['node', 'tools/test-promo-redeem.js']],
  ['Test share-hand Edge contract', ['node', 'tools/test-share-hand-edge-contract.js']],
  ['Test rake scoring', ['node', 'tools/test-rake-scoring.js']],
  ['Test multiway import', ['node', 'tools/test-multiway-import.js']],
  ['Test multiway trainer', ['node', 'tools/test-multiway-trainer.js']],
  ['Test fuzz evaluateSpot', ['node', 'tools/test-fuzz-evaluate.js']],
  ['Test admin panel', ['node', 'tools/test-admin-panel.js']],
  ['Test account settings', ['node', 'tools/test-account-settings.js']],
  ['Test multi-comunidad MTT Lab', ['node', 'tools/test-community-mttlab.js']],
  ['Test aislamiento datos por comunidad', ['node', 'tools/test-community-data-isolation.js']],
  ['Test demo / sample session', ['node', 'tools/test-demo-sample.js']],
  // Fase 4
  ['Test solver sanity JS', ['node', 'tools/test-solver-sanity-js.js']],
  ['Test product variants 6-max', ['node', 'tools/test-product-variants.js']],
  ['Test beginner guide', ['node', 'tools/test-beginner-guide.js']],
  ['Test Escuela de Póker M0', ['node', 'tools/test-school.js']],
  ['Test school exploit line C-32–C-39', ['node', 'tools/test-school-exploit-line.js']],
  ['Test school progress sync', ['node', 'tools/test-school-progress-sync.js']],
  ['Test onboarding cloud sync', ['node', 'tools/test-onboarding-sync.js']],
  ['Test school share social', ['node', 'tools/test-school-share.js']],
  ['Test school coach per lesson', ['node', 'tools/test-school-coach-lesson.js']],
  ['Test spin iso limp order', ['node', 'tools/test-spin-iso-limp-order.js']],
  ['Test admin usage + school', ['node', 'tools/test-admin-usage-school.js']],
  ['Test guest funnel admin', ['node', 'tools/test-guest-funnel.js']],
  ['Test PWA manifest', ['node', 'tools/test-pwa-manifest.js']],
  ['Test analytics/sentry guards', ['node', 'tools/test-analytics-sentry.js']],
  ['Test push config', ['node', 'tools/test-push-config.js']],
  ['Test push client', ['node', 'tools/test-push-client.js']],
  ['Test push Edge contract', ['node', 'tools/test-push-edge-contract.js']],
  // v2.0 — formatos cash/spin/mtt + bluffs + ICM trainer
  ['Test trainer formats v2', ['node', 'tools/test-trainer-formats-v2.js']],
  ['Test trainer pro ranges (KJo/3bet/fase)', ['node', 'tools/test-trainer-pro-ranges.js']],
  ['Test trainer pro regression (UX/ICM/presets)', ['node', 'tools/test-trainer-pro-regression.js']],
  ['Test trainer user presets save/delete', ['node', 'tools/test-trainer-presets.js']],
  ['Test trainer stack/phase/villains', ['node', 'tools/test-trainer-stack-phase-villains.js']],
  ['Test mazo único / reparto entrenador', ['node', 'tools/test-single-deck-deal.js']],
  ['Test trainer Fase 3 (capas/Nash/blinds/escuela)', ['node', 'tools/test-trainer-fase3.js']],
  ['Test feedback EV/mix (fold alto + pot odds)', ['node', 'tools/test-feedback-ev-mix.js']],
  ['Test rangos stack/fase Spin-MTT + chrome mesa', ['node', 'tools/test-ranges-stack-phase.js']],
  ['Test vs3bet MTT/Spin por fase+stack', ['node', 'tools/test-vs3bet-tournament-phase.js']],
  ['Test showdown empate (net/popup)', ['node', 'tools/test-showdown-tie.js']],
  ['Test modo completo/rápido de mesa', ['node', 'tools/test-action-mode.js']],
  ['Test vs3bet/4bet interactivos (sin autoHero)', ['node', 'tools/test-face3bet-interactive.js']],
  ['Test squeeze MTT villano activo (sin fold fantasma)', ['node', 'tools/test-trainer-villain-fold-seat.js']],
  ['Test acciones fantasma sobre FOLD + burbuja stack', ['node', 'tools/test-ghost-fold-actions.js']],
  ['Test línea de acción previa (entrenador)', ['node', 'tools/test-trainer-action-line.js']],
  ['Test manos legendarias (catálogo)', ['node', 'tools/test-legendary.js']],
  ['Test manos legendarias (resultado)', ['node', 'tools/test-legendary-result.js']],
  ['Test manos legendarias (playthrough)', ['node', 'tools/test-legendary-playthrough.js']]
];

let failed = 0;
for (const [name, cmd] of STEPS) {
  console.log('\n==> ' + name);
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    console.error('FAIL step:', name, 'exit', r.status);
    failed = r.status || 1;
    break;
  }
}

if (failed) process.exit(failed);
console.log('\n*** test:ci OK (' + STEPS.length + ' steps) ***');
