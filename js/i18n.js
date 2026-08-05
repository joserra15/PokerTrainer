/*
 * i18n.js — Español / English para landing y chrome principal (P2 #12).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_lang_v1';
  var current = 'es';

  var DICT = {
    es: {
      'nav.features': 'Funciones',
      'nav.pricing': 'Planes',
      'nav.install': 'Instalar',
      'nav.method': 'Metodología',
      'nav.faq': 'FAQ',
      'nav.support': 'Soporte',
      'nav.login': 'Entrar',
      'hero.title': 'Entrena GTO, importa tus sesiones y mejora con IA Coach',
      'hero.lead': 'Practica spots reales en la mesa, revisa manos importadas con análisis heurístico y descubre fugas de EV. También puedes instalarla en el móvil como app.',
      'hero.cta': 'Empezar gratis',
      'hero.plans': 'Ver planes',
      'hero.install': 'Instalar app',
      'hero.bullet1': 'Sesión de ejemplo incluida al registrarte',
      'hero.bullet2': 'Import PokerStars, Winamax y GGPoker',
      'hero.bullet3': 'Plan gratis + prueba Study 10 días',
      'features.title': 'Todo lo que necesitas para estudiar',
      'feat.train.title': 'Entrenador interactivo',
      'feat.train.body': 'Mesa 6-max con evaluación GTO calle a calle, rangos, avisador en vivo y bloques de 25/50/100 manos.',
      'feat.import.title': 'Import de sesiones',
      'feat.import.body': 'Sube historiales .txt de PokerStars, Winamax o GGPoker (varios archivos a la vez) y revisa fugas mano a mano.',
      'feat.ranges.title': 'Rangos preflop',
      'feat.ranges.body': 'Matrices RFI y defensa vs open para cash y MTT, con profundidades configurables.',
      'feat.ai.title': 'IA Coach',
      'feat.ai.body': 'Consultas sobre manos y sesiones en planes Study y Coach (ver planes).',
      'feat.stats.title': 'Estadísticas y errores',
      'feat.stats.body': 'Acierto, EV perdido, leaks por calle/spot y drill adaptativo de tus peores spots.',
      'feat.pwa.title': 'App instalable',
      'feat.pwa.body': 'PWA para móvil y escritorio: acceso rápido sin pasar por la tienda.',
      'pricing.title': 'Planes claros',
      'limits.title': 'Empieza sin fricción',
      'limits.free': 'Gratis: 15 manos/día · 1 import/mes (máx. 200) · 5 análisis · 3 IA/mes · histórico 30 días',
      'limits.trial': 'Prueba Study {days} días: entrenador e import ilimitados (una vez por cuenta)',
      'limits.card': 'Sin tarjeta para el plan gratis; el trial de Study se activa en checkout',
      'plan.free': 'Gratis',
      'plan.free.f1': '15 manos entrenador/día',
      'plan.free.f2': '1 sesión import/mes (máx. 200)',
      'plan.free.f3': '5 manos en análisis (solo manual)',
      'plan.free.f4': '3 consultas IA Coach/mes de prueba',
      'plan.study.f1': '{trial} (una vez)',
      'plan.study.f2': 'Entrenador e import ilimitados',
      'plan.study.f3': '20 manos en análisis',
      'plan.study.f4': '40 consultas IA Coach/mes',
      'plan.study.f5': 'Sync en la nube',
      'plan.coach.f1': 'Todo Study',
      'plan.coach.f2': '100 manos en análisis',
      'plan.coach.f3': '150 consultas IA Coach/mes',
      'plan.coach.f4': 'Informes, análisis y preguntas IA',
      'plan.coach.f5': 'Soporte prioritario',
      'plan.cta': 'Ir al login',
      'tab.home': 'Inicio',
      'tab.play': 'Entrenar',
      'tab.sessions': 'Sesiones',
      'tab.ranges': 'Rangos',
      'tab.stats': 'Stats',
      'tab.errors': 'Errores',
      'tab.pricing': 'Planes',
      'advisor.mode': 'Modo del avisador',
      'advisor.always': 'Siempre (consejo previo)',
      'advisor.serious': 'Solo error grave',
      'advisor.threshold': 'Umbral EV (bb)',
      'export.session': 'Exportar informe',
      'export.json': 'JSON',
      'export.csv': 'CSV',
      'export.pdf': 'PDF / Imprimir',
      'export.errorsOnly': 'Solo manos con fuga',
      'ranges.postflop': 'Flop HU',
      'ranges.postflop.disclaimer': 'Vista heurística de frecuencias fold/call/raise. No es un solver full-tree.',
      'lang.label': 'Idioma'
    },
    en: {
      'nav.features': 'Features',
      'nav.pricing': 'Plans',
      'nav.install': 'Install',
      'nav.method': 'Methodology',
      'nav.faq': 'FAQ',
      'nav.support': 'Support',
      'nav.login': 'Log in',
      'hero.title': 'Train GTO, import your sessions and improve with AI Coach',
      'hero.lead': 'Practice real spots at the table, review imported hands with heuristic analysis and find EV leaks. You can also install it on mobile as an app.',
      'hero.cta': 'Start free',
      'hero.plans': 'See plans',
      'hero.install': 'Install app',
      'hero.bullet1': 'Sample session included when you sign up',
      'hero.bullet2': 'Import PokerStars, Winamax and GGPoker',
      'hero.bullet3': 'Free plan + Study 10-day trial',
      'features.title': 'Everything you need to study',
      'feat.train.title': 'Interactive trainer',
      'feat.train.body': '6-max table with street-by-street GTO evaluation, ranges, live advisor and 25/50/100 hand blocks.',
      'feat.import.title': 'Session import',
      'feat.import.body': 'Upload PokerStars, Winamax or GGPoker .txt hand histories (multiple files) and review leaks hand by hand.',
      'feat.ranges.title': 'Preflop ranges',
      'feat.ranges.body': 'RFI and vs-open defense matrices for cash and MTT, with configurable depths.',
      'feat.ai.title': 'AI Coach',
      'feat.ai.body': 'Questions on hands and sessions on Study and Coach plans.',
      'feat.stats.title': 'Stats and errors',
      'feat.stats.body': 'Accuracy, EV lost, leaks by street/spot and adaptive drills on your worst spots.',
      'feat.pwa.title': 'Installable app',
      'feat.pwa.body': 'PWA for mobile and desktop: quick access without an app store.',
      'pricing.title': 'Clear plans',
      'limits.title': 'Start with no friction',
      'limits.free': 'Free: 15 hands/day · 1 import/month (max 200) · 5 analysis · 3 AI/month · 30-day history',
      'limits.trial': 'Study trial {days} days: unlimited trainer and import (once per account)',
      'limits.card': 'No card required for Free; Study trial starts at checkout',
      'plan.free': 'Free',
      'plan.free.f1': '15 trainer hands/day',
      'plan.free.f2': '1 import session/month (max 200)',
      'plan.free.f3': '5 analysis hands (manual only)',
      'plan.free.f4': '3 AI Coach queries/month trial',
      'plan.study.f1': '{trial} (once)',
      'plan.study.f2': 'Unlimited trainer and import',
      'plan.study.f3': '20 analysis hands',
      'plan.study.f4': '40 AI Coach queries/month',
      'plan.study.f5': 'Cloud sync',
      'plan.coach.f1': 'Everything in Study',
      'plan.coach.f2': '100 analysis hands',
      'plan.coach.f3': '150 AI Coach queries/month',
      'plan.coach.f4': 'Reports, analysis and AI questions',
      'plan.coach.f5': 'Priority support',
      'plan.cta': 'Go to login',
      'tab.home': 'Home',
      'tab.play': 'Train',
      'tab.sessions': 'Sessions',
      'tab.ranges': 'Ranges',
      'tab.stats': 'Stats',
      'tab.errors': 'Errors',
      'tab.pricing': 'Plans',
      'advisor.mode': 'Advisor mode',
      'advisor.always': 'Always (pre-action tip)',
      'advisor.serious': 'Serious errors only',
      'advisor.threshold': 'EV threshold (bb)',
      'export.session': 'Export report',
      'export.json': 'JSON',
      'export.csv': 'CSV',
      'export.pdf': 'PDF / Print',
      'export.errorsOnly': 'Leak hands only',
      'ranges.postflop': 'HU Flop',
      'ranges.postflop.disclaimer': 'Heuristic fold/call/raise frequency view. Not a full-tree solver.',
      'lang.label': 'Language'
    }
  };

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'es') return saved;
    } catch (e) { /* ignore */ }
    return 'es';
  }

  function t(key, vars) {
    var dict = DICT[current] || DICT.es;
    var s = dict[key] != null ? dict[key] : ((DICT.es[key] != null) ? DICT.es[key] : key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return s;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var attr = el.getAttribute('data-i18n-attr');
      var val = t(key);
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });
    try { document.documentElement.lang = current; } catch (e) { /* ignore */ }
  }

  function setLang(lang) {
    current = lang === 'en' ? 'en' : 'es';
    try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
    apply(document);
    if (global.PTLanding && global.PTLanding.refreshI18n) global.PTLanding.refreshI18n();
    return current;
  }

  function getLang() { return current; }

  current = detect();

  global.PTI18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    apply: apply,
    DICT: DICT
  };
})(window);
