/* Regresión: adopción ForgeCoach — CTA, copy trial, onboarding coach, funnel events. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');

const aiSrc = fs.readFileSync(path.join(root, 'js/ai-report.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const billingSrc = fs.readFileSync(path.join(root, 'js/billing.js'), 'utf8');
const haSrc = fs.readFileSync(path.join(root, 'js/hand-analysis.js'), 'utf8');
const onboardingSrc = fs.readFileSync(path.join(root, 'js/onboarding.js'), 'utf8');
const analyticsSrc = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const trnSrc = fs.readFileSync(path.join(root, 'js/tournament/ui.js'), 'utf8');

assert.ok(/hand-end-coach/.test(appSrc), 'CTA fin de mano ForgeCoach');
assert.ok(/Por qué fallé/.test(appSrc), 'copy ¿Por qué fallé?');
assert.ok(/openForgeCoachFromHandEnd/.test(appSrc), 'handler hand-end coach');
assert.ok(/openForgeCoachDeepLink/.test(appSrc), 'deep-link home/onboarding');
assert.ok(/openCoachHandModal/.test(appSrc), 'modal coach desde histórico/errores');
assert.ok(/data-coach-history-id/.test(appSrc), 'CTA histórico');
assert.ok(/data-coach-error-id/.test(appSrc), 'CTA errores');
assert.ok(/ai-session-nudge/.test(appSrc), 'nudge sesión');
assert.ok(/hand-end-coach-guest|ForgeCoach te explica/.test(appSrc), 'teaser guest');

assert.ok(/3 consultas\/mes de prueba/.test(billingSrc), 'billing trial copy');
assert.ok(!/Gratis no incluye IA de pago/.test(billingSrc), 'sin muro Gratis=0');
assert.ok(/3\/mes de prueba/.test(haSrc), 'hand-analysis trial copy');
assert.ok(!/Gratis no incluye IA;/.test(haSrc), 'hand-analysis sin Gratis=0');

assert.ok(/id: 'coach'/.test(onboardingSrc), 'onboarding paso coach');
assert.ok(/No pedir consent en el saludo|if \(!hasConsent\(\)\) return null/.test(aiSrc), 'saludo sin modal consent');
assert.ok(/pt_ai_consent_v1/.test(fs.readFileSync(path.join(root, 'e2e/helpers.js'), 'utf8')), 'e2e seed AI consent');
assert.ok(/dismissAiConsentModal/.test(fs.readFileSync(path.join(root, 'e2e/helpers.js'), 'utf8')), 'e2e dismiss consent modal');

assert.ok(/ai_coach_cta_click/.test(aiSrc), 'evento cta');
assert.ok(/ai_consent_accept/.test(aiSrc), 'evento consent accept');
assert.ok(/ai_paywall_shown/.test(aiSrc) && /ai_paywall_shown/.test(billingSrc), 'evento paywall');
assert.ok(/ai-consent-banner|showInlineConsent/.test(aiSrc), 'consent inline');
assert.ok(/data-ai-chip|defaultQuestionChips/.test(aiSrc), 'chips pregunta');
assert.ok(/function trigger/.test(aiSrc), 'PTAIReport.trigger');
assert.ok(/onOpenCoach/.test(aiSrc), 'home CTA onOpenCoach');

assert.ok(/trackAiFunnel/.test(analyticsSrc), 'analytics funnel helper');
assert.ok(/ai_coach_impression/.test(adminSrc), 'admin label impression');
assert.ok(/ai-question-chips/.test(cssSrc) && /ai-consent-banner/.test(cssSrc), 'CSS coach adoption');
assert.ok(/pedir un informe a ForgeCoach/.test(trnSrc), 'Torneos lobby menciona ForgeCoach');
assert.ok(!/rivales bot/.test(trnSrc), 'sin copy rivales bot en lobby');
assert.ok(!/solo para premios y ROI/.test(trnSrc), 'sin copy ROI en lobby');
assert.ok(!/Spin\/HU fácil/.test(trnSrc), 'sin hint de planes en lobby');

const localStore = {};
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  parseFloat,
  parseInt,
  isNaN,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(onboardingSrc, sandbox, { filename: 'onboarding.js' });
const OB = sandbox.window.PTOnboarding;
assert.strictEqual(OB.STEPS.length, 4, '4 pasos onboarding');
assert.ok(OB.STEPS.some((s) => s.id === 'coach'), 'incluye coach');

console.log('*** forgecoach-adoption OK ***');
