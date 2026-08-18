/*
 * i18n.js — Español / English para landing y chrome principal (P2 #12).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_lang_v1';
  /** Idioma fijo por ahora: el selector EN queda oculto hasta completar i18n del entrenador. */
  var LANG_LOCKED = true;
  var current = 'es';

  var DICT = {
    es: {
      'nav.features': 'Funciones',
      'nav.how': 'Cómo funciona',
      'nav.pricing': 'Planes',
      'nav.more': 'Más',
      'nav.install': 'Instalar',
      'nav.method': 'Metodología',
      'nav.faq': 'FAQ',
      'nav.support': 'Soporte',
      'nav.login': 'Entrar',
      'nav.menu': 'Menú',
      'hero.eyebrow': 'En español · 5 manos de prueba',
      'hero.title': '¿Crees que no necesitas entrenar al Póker? Juega estas 5 manos y compruébalo.',
      'hero.lead': 'Google solo si quieres guardar el progreso.',
      'hero.cta': 'Probar ahora',
      'hero.how': 'Cómo funciona',
      'hero.plans': 'Ver planes',
      'hero.install': 'Instalar app',
      'hero.age': 'Mayores de 18 años. El registro pide confirmación.',
      'hero.challenge': '¿Serás capaz de jugar estas manos correctamente?',
      'how.title': 'Cómo funciona',
      'how.s1.title': 'Juegas el spot',
      'how.s1.body': '¿Aciertas las cinco manos, del preflop al river?',
      'how.s2.title': 'Te puntúan al momento',
      'how.s2.body': 'Óptima, imprecisa o error, con la acción GTO. Sin menús ni configuración.',
      'how.s3.title': 'Regístrate',
      'how.s3.body': 'Si quieres entrenar más manos, revisar tus errores, hacer las lecciones de la Escuela de Póker, analizar manos y sesiones, y tener el entrenador IA 24/7 para preguntar cualquier duda… regístrate.',
      'features.title': 'Luego, el estudio completo',
      'feat.train.title': 'Entrenador interactivo',
      'feat.train.body': 'Entrena cualquier spot de cash, spins o torneos',
      'feat.import.title': 'Import de sesiones',
      'feat.import.body': 'Sube historiales .txt (PokerStars, Winamax, GGPoker, 888poker, CoinPoker · cash/spins/torneos) y revísalos en pestañas por tipo de juego.',
      'feat.ranges.title': 'Rangos preflop',
      'feat.ranges.body': 'Matrices RFI y defensa vs open para cash. El soporte de torneo es parcial y sobre todo preflop.',
      'feat.ai.title': 'ForgeCoach',
      'feat.ai.body': 'Consultas sobre manos y sesiones en planes Study y Coach (ver planes).',
      'feat.stats.title': 'Estadísticas y errores',
      'feat.stats.body': 'Acierto por calle y por semana, fugas principales y drill de tus peores spots.',
      'feat.pwa.title': 'App instalable',
      'feat.pwa.body': 'PWA para móvil y escritorio: acceso rápido sin pasar por la tienda.',
      'pricing.title': 'Planes claros',
      'limits.title': 'Plan gratis y FOUNDER',
      'limits.free': 'Gratis: 15 manos/día · 1 import/mes (máx. 200) · 5 análisis · 3 IA/mes · histórico 30 días',
      'limits.trial': 'Study/Coach FOUNDER: plazas limitadas por petición (compras cerradas hasta el lanzamiento)',
      'limits.card': 'Sin tarjeta. Las compras abren con FOUNDER próximamente; solicita plaza Study o Coach',
      'plan.free': 'Gratis',
      'plan.free.f1': '15 manos entrenador/día',
      'plan.free.f2': '1 sesión import/mes (máx. 200)',
      'plan.free.f3': '5 manos en análisis (solo manual)',
      'plan.free.f4': '3 consultas ForgeCoach/mes de prueba',
      'plan.study.f1': '{trial} (una vez)',
      'plan.study.beta': 'Acceso con código o regalo en la beta',
      'plan.study.f2': 'Entrenador e import ilimitados',
      'plan.study.f3': '20 manos en análisis',
      'plan.study.f4': '40 consultas ForgeCoach/mes',
      'plan.study.f5': 'Sync en la nube',
      'plan.coach.f1': 'Todo Study',
      'plan.coach.f2': '100 manos en análisis',
      'plan.coach.f3': '150 consultas ForgeCoach/mes',
      'plan.coach.f4': 'Informes, análisis y preguntas IA',
      'plan.coach.f5': 'Soporte prioritario',
      'plan.coach.invite': 'FOUNDER Coach · plazas limitadas por petición',
      'plan.cta': 'Probar ahora',
      'plan.cta.paused': 'Compra {date}',
      'plan.cta.invite': 'Compra próximamente',
      'plan.cta.founder': 'Solicitar plaza FOUNDER',
      'plan.cta.founder.study': 'Solicitar plaza FOUNDER Study',
      'plan.cta.founder.coach': 'Solicitar plaza FOUNDER Coach',
      'plan.founder.note': 'FOUNDER · {discount} dto. · {seats}. Solicita Study o Coach; revisamos cada petición.',
      'tab.home': 'Inicio',
      'tab.play': 'Entrenar',
      'tab.school': 'Escuela de Póker',
      'tab.learn': 'Guía básica',
      'tab.analysis': 'Análisis',
      'tab.sessions': 'Sesiones',
      'tab.ranges': 'Rangos',
      'tab.history': 'Histórico',
      'tab.stats': 'Estadísticas',
      'tab.errors': 'Errores',
      'tab.contact': 'Contacto',
      'tab.pricing': 'Planes',
      'tab.faq': 'FAQ',
      'play.session': 'Sesión',
      'play.hands': 'Manos',
      'play.result': 'Resultado (bb)',
      'play.evLost': 'EV perdido',
      'play.evExpected': 'EV esperado',
      'play.accuracy': 'Acierto',
      'play.handHistory': 'Historial de la mano',
      'play.newHand': 'Nueva mano',
      'play.replayHand': '↻ Repetir esta mano',
      'play.newSession': 'Nueva sesión',
      'play.repeatErrors': 'Repetir mis spots fallados',
      'play.pot': 'Bote',
      'play.bet': 'Apuesta',
      'play.hero': 'HÉROE',
      'play.yourHand': 'Tu mano',
      'play.actionMode': 'Modo de la mesa',
      'play.actionQuick': 'Rápido',
      'play.actionComplete': 'Completo',
      'play.actionModeHint': 'Rápido: te llega el turno al instante. Completo: ves cómo actúa cada asiento desde UTG. Postflop siempre es completo.',
      'play.actionPlaying': 'La acción recorre la mesa…',
      'play.actionSkip': 'Saltar',
      'advisor.mode': 'Modo del avisador',
      'advisor.always': 'Siempre (consejo previo)',
      'advisor.serious': 'Solo error grave',
      'advisor.threshold': 'Umbral EV perdido (bb)',
      'advisor.live': 'Avisador en vivo',
      'advisor.silent': 'Modo silencio',
      'advisor.silentHint': 'Solo aviso si EV perdido ≥ {n} bb',
      'advisor.alert': 'Aviso grave',
      'advisor.alertHint': 'EV perdido ≥ {n} bb',
      'advisor.dismissAlert': 'Cerrar aviso',
      'advisor.disable': 'Desactivar avisador en vivo',
      'advisor.recommended': 'Acción recomendada',
      'advisor.gtoFreq': 'Frecuencia GTO {n}%',
      'advisor.street': 'Calle',
      'advisor.villain': 'Villano',
      'advisor.yourAction': 'Tu última acción',
      'advisor.optimal': 'óptimo',
      'advisor.matrixGto': 'Matriz GTO',
      'advisor.matrixVillain': 'Matriz villano',
      'advisor.matrixLoading': 'Calculando matriz…',
      'advisor.matrixUnavailable': 'Matriz no disponible en este spot.',
      'advisor.matrixGtoFail': 'No se pudo calcular la matriz GTO.',
      'advisor.matrixGtoPreflopOnly': 'Matriz GTO solo disponible en preflop.',
      'advisor.matrixVillainFail': 'No se pudo estimar el rango villano.',
      'settings.advisorTitle': 'Avisador y feedback',
      'settings.advisorLead': 'Controla cuándo el entrenador te avisa tras una decisión.',
      'settings.advisorMode': 'Modo',
      'settings.langTitle': 'Idioma / Language',
      'settings.langEs': 'Idioma actual: Español',
      'settings.langEn': 'Current language: English',
      'settings.pushTitle': 'Notificaciones',
      'settings.pushLead': 'Avisos en el teléfono y en el PC, aunque la app esté cerrada. Independiente del email.',
      'settings.pushEnable': 'Avisarme en este dispositivo',
      'settings.pushTest': 'Enviar notificación de prueba',
      'settings.pushInstallIos': 'Instalar en iPhone/iPad',
      'settings.pushUnsupported': 'Este navegador no admite notificaciones push.',
      'settings.pushDenied': 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.',
      'settings.pushIosInstall': 'Instala la app en la pantalla de inicio para recibir avisos en iPhone.',
      'settings.pushIosUpdate': 'Actualiza iOS (16.4 o posterior) para recibir avisos.',
      'settings.pushReady': 'Este dispositivo recibirá avisos aunque la app esté cerrada.',
      'settings.pushOff': 'Activa el interruptor para pedir permiso y suscribir este dispositivo.',
      'settings.pushNeedLogin': 'Inicia sesión para activar avisos.',
      'settings.pushNotConfigured': 'Notificaciones no configuradas en este entorno.',
      'settings.pushTestSent': 'Notificación de prueba enviada.',
      'export.session': 'Exportar informe',
      'export.json': 'JSON',
      'export.csv': 'CSV',
      'export.pdf': 'PDF / Imprimir',
      'export.errorsOnly': 'Solo manos con fuga',
      'ranges.postflop': 'Flop HU',
      'ranges.postflop.disclaimer': 'Vista heurística de frecuencias fold/call/raise. No es un solver full-tree.',
      'ranges.street.preflop': 'Preflop',
      'ranges.street.flop': 'Flop',
      'ranges.street.turn': 'Turn',
      'ranges.street.river': 'River',
      'ranges.fav.empty': 'Sin spots favoritos en esta pestaña.',
      'ranges.fav.save': '☆ Guardar spot',
      'ranges.fav.saved': '★ Favorito',
      'ranges.fav.remove': 'Eliminar favorito',
      'lang.label': 'Idioma'
    },
    en: {
      'nav.features': 'Features',
      'nav.how': 'How it works',
      'nav.pricing': 'Plans',
      'nav.more': 'More',
      'nav.install': 'Install',
      'nav.method': 'Methodology',
      'nav.faq': 'FAQ',
      'nav.support': 'Support',
      'nav.login': 'Log in',
      'nav.menu': 'Menu',
      'hero.eyebrow': 'In Spanish · 5 practice hands',
      'hero.title': 'Think you don\'t need poker training? Play these 5 hands and find out.',
      'hero.lead': 'Google only if you want to save progress.',
      'hero.cta': 'Try now',
      'hero.how': 'How it works',
      'hero.plans': 'See plans',
      'hero.install': 'Install app',
      'hero.age': '18+ only. Sign-up asks for confirmation.',
      'hero.challenge': 'Can you play these hands correctly?',
      'how.title': 'How it works',
      'how.s1.title': 'You play the spot',
      'how.s1.body': 'Can you get all five hands right, from preflop to river?',
      'how.s2.title': 'Instant grade',
      'how.s2.body': 'Optimal, imprecise or error, with the GTO action. No menus.',
      'how.s3.title': 'Sign up',
      'how.s3.body': 'If you want to train more hands, review your mistakes, take Poker School lessons, analyze hands and sessions, and have the AI coach 24/7 for any question… sign up.',
      'features.title': 'Then the full study suite',
      'feat.train.title': 'Interactive trainer',
      'feat.train.body': 'Train any cash, spins or tournament spot',
      'feat.import.title': 'Session import',
      'feat.import.body': 'Upload .txt histories (PokerStars, Winamax, GGPoker, 888poker, CoinPoker · cash/spins/tournaments) and review them in tabs by game type.',
      'feat.ranges.title': 'Preflop ranges',
      'feat.ranges.body': 'RFI and vs-open defense matrices for cash. Tournament support is partial and mostly preflop.',
      'feat.ai.title': 'ForgeCoach',
      'feat.ai.body': 'Questions on hands and sessions on Study and Coach plans.',
      'feat.stats.title': 'Stats and errors',
      'feat.stats.body': 'Street and weekly accuracy, main leaks and drills on your worst spots.',
      'feat.pwa.title': 'Installable app',
      'feat.pwa.body': 'PWA for mobile and desktop: quick access without an app store.',
      'pricing.title': 'Clear plans',
      'limits.title': 'Free plan and FOUNDER',
      'limits.free': 'Free: 15 hands/day · 1 import/month (max 200) · 5 analysis · 3 AI/month · 30-day history',
      'limits.trial': 'Study/Coach FOUNDER: limited seats by request (purchases closed until launch)',
      'limits.card': 'No card needed. Paid checkout opens with FOUNDER soon; request Study or Coach',
      'plan.free': 'Free',
      'plan.free.f1': '15 trainer hands/day',
      'plan.free.f2': '1 import session/month (max 200)',
      'plan.free.f3': '5 analysis hands (manual only)',
      'plan.free.f4': '3 ForgeCoach queries/month trial',
      'plan.study.f1': '{trial} (once)',
      'plan.study.beta': 'Access with a code or gift during beta',
      'plan.study.f2': 'Unlimited trainer and import',
      'plan.study.f3': '20 analysis hands',
      'plan.study.f4': '40 ForgeCoach queries/month',
      'plan.study.f5': 'Cloud sync',
      'plan.coach.f1': 'Everything in Study',
      'plan.coach.f2': '100 analysis hands',
      'plan.coach.f3': '150 ForgeCoach queries/month',
      'plan.coach.f4': 'Reports, analysis and AI questions',
      'plan.coach.f5': 'Priority support',
      'plan.coach.invite': 'FOUNDER Coach · limited seats by request',
      'plan.cta': 'Try now',
      'plan.cta.paused': 'Buy {date}',
      'plan.cta.invite': 'Buy coming soon',
      'plan.cta.founder': 'Request FOUNDER seat',
      'plan.cta.founder.study': 'Request FOUNDER Study seat',
      'plan.cta.founder.coach': 'Request FOUNDER Coach seat',
      'plan.founder.note': 'FOUNDER · {discount} off · {seats}. Request Study or Coach; we review each request.',
      'tab.home': 'Home',
      'tab.play': 'Train',
      'tab.school': 'Poker School',
      'tab.learn': 'Basics',
      'tab.analysis': 'Analysis',
      'tab.sessions': 'Sessions',
      'tab.ranges': 'Ranges',
      'tab.history': 'History',
      'tab.stats': 'Stats',
      'tab.errors': 'Leaks',
      'tab.contact': 'Contact',
      'tab.pricing': 'Plans',
      'tab.faq': 'FAQ',
      'play.session': 'Session',
      'play.hands': 'Hands',
      'play.result': 'Result (bb)',
      'play.evLost': 'EV lost',
      'play.evExpected': 'Expected EV',
      'play.accuracy': 'Accuracy',
      'play.handHistory': 'Hand history',
      'play.newHand': 'New hand',
      'play.replayHand': '↻ Replay this hand',
      'play.newSession': 'New session',
      'play.repeatErrors': 'Repeat my missed spots',
      'play.pot': 'Pot',
      'play.bet': 'Bet',
      'play.hero': 'HERO',
      'play.yourHand': 'Your hand',
      'play.actionMode': 'Table mode',
      'play.actionQuick': 'Quick',
      'play.actionComplete': 'Full',
      'play.actionModeHint': 'Quick: action jumps to your turn. Full: you see every seat act from UTG. Postflop is always full.',
      'play.actionPlaying': 'Action is going around the table…',
      'play.actionSkip': 'Skip',
      'advisor.mode': 'Advisor mode',
      'advisor.always': 'Always (pre-action tip)',
      'advisor.serious': 'Serious errors only',
      'advisor.threshold': 'EV lost threshold (bb)',
      'advisor.live': 'Live advisor',
      'advisor.silent': 'Silent mode',
      'advisor.silentHint': 'Alert only if EV lost ≥ {n} bb',
      'advisor.alert': 'Serious alert',
      'advisor.alertHint': 'EV lost ≥ {n} bb',
      'advisor.dismissAlert': 'Dismiss alert',
      'advisor.disable': 'Disable live advisor',
      'advisor.recommended': 'Recommended action',
      'advisor.gtoFreq': 'GTO frequency {n}%',
      'advisor.street': 'Street',
      'advisor.villain': 'Villain',
      'advisor.yourAction': 'Your last action',
      'advisor.optimal': 'optimal',
      'advisor.matrixGto': 'GTO matrix',
      'advisor.matrixVillain': 'Villain matrix',
      'advisor.matrixLoading': 'Computing matrix…',
      'advisor.matrixUnavailable': 'Matrix unavailable in this spot.',
      'advisor.matrixGtoFail': 'Could not compute GTO matrix.',
      'advisor.matrixGtoPreflopOnly': 'GTO matrix only available preflop.',
      'advisor.matrixVillainFail': 'Could not estimate villain range.',
      'settings.advisorTitle': 'Advisor and feedback',
      'settings.advisorLead': 'Control when the trainer alerts you after a decision.',
      'settings.advisorMode': 'Mode',
      'settings.langTitle': 'Language / Idioma',
      'settings.langEs': 'Idioma actual: Español',
      'settings.langEn': 'Current language: English',
      'settings.pushTitle': 'Notifications',
      'settings.pushLead': 'Alerts on phone and PC, even if the app is closed. Independent from email.',
      'settings.pushEnable': 'Notify me on this device',
      'settings.pushTest': 'Send a test notification',
      'settings.pushInstallIos': 'Install on iPhone/iPad',
      'settings.pushUnsupported': 'This browser does not support push notifications.',
      'settings.pushDenied': 'Notifications are blocked. Enable them in browser settings.',
      'settings.pushIosInstall': 'Add the app to the Home Screen to receive alerts on iPhone.',
      'settings.pushIosUpdate': 'Update iOS (16.4 or later) to receive alerts.',
      'settings.pushReady': 'This device will receive alerts even if the app is closed.',
      'settings.pushOff': 'Turn the switch on to request permission and subscribe this device.',
      'settings.pushNeedLogin': 'Sign in to enable alerts.',
      'settings.pushNotConfigured': 'Notifications are not configured in this environment.',
      'settings.pushTestSent': 'Test notification sent.',
      'export.session': 'Export report',
      'export.json': 'JSON',
      'export.csv': 'CSV',
      'export.pdf': 'PDF / Print',
      'export.errorsOnly': 'Leak hands only',
      'ranges.postflop': 'HU Flop',
      'ranges.postflop.disclaimer': 'Heuristic fold/call/raise frequency view. Not a full-tree solver.',
      'ranges.street.preflop': 'Preflop',
      'ranges.street.flop': 'Flop',
      'ranges.street.turn': 'Turn',
      'ranges.street.river': 'River',
      'ranges.fav.empty': 'No favorite spots on this tab yet.',
      'ranges.fav.save': '☆ Save spot',
      'ranges.fav.saved': '★ Favorite',
      'ranges.fav.remove': 'Remove favorite',
      'lang.label': 'Language'
    }
  };

  function detect() {
    if (LANG_LOCKED) return 'es';
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

  function syncLangButtons(root) {
    root = root || document;
    var lang = current;
    root.querySelectorAll('[data-set-lang], [data-settings-lang]').forEach(function (btn) {
      var val = btn.getAttribute('data-set-lang') || btn.getAttribute('data-settings-lang');
      var on = val === lang;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
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
    syncLangButtons(root);
  }

  function setLang(lang) {
    if (LANG_LOCKED) {
      current = 'es';
      try { localStorage.setItem(STORAGE_KEY, 'es'); } catch (e) { /* ignore */ }
      apply(document);
      return current;
    }
    current = lang === 'en' ? 'en' : 'es';
    try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
    apply(document);
    if (global.PTLanding && global.PTLanding.refreshI18n) global.PTLanding.refreshI18n();
    try {
      global.dispatchEvent(new CustomEvent('pt-lang-change', { detail: { lang: current } }));
    } catch (e) { /* ignore */ }
    return current;
  }

  function getLang() { return current; }
  function isLangLocked() { return LANG_LOCKED; }

  current = detect();
  try { localStorage.setItem(STORAGE_KEY, 'es'); } catch (e) { /* ignore */ }

  global.PTI18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    apply: apply,
    syncLangButtons: syncLangButtons,
    isLangLocked: isLangLocked,
    DICT: DICT
  };

  function applyAndRefreshLanding() {
    apply(document);
    // If landing rendered before this file ran (script race), re-paint pricing.
    if (global.PTLanding && global.PTLanding.refreshI18n) {
      try { global.PTLanding.refreshI18n(); } catch (e) { /* ignore */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAndRefreshLanding);
  } else {
    try { applyAndRefreshLanding(); } catch (e) { /* ignore */ }
  }
})(window);
