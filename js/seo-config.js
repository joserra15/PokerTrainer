/*
 * seo-config.js — Textos y URLs canónicas para SEO (home + legales).
 */
window.PT_SEO = {
  siteName: 'PokerForgeAI',
  siteUrl: 'https://www.pokerforgeai.com/',
  defaultLocale: 'es',
  ogImage: 'https://www.pokerforgeai.com/icons/logo-512.png',
  twitterHandle: '',
  home: {
    title: 'PokerForgeAI · Entrenador GTO de poker NL Hold\'em con ForgeCoach',
    description: 'Entrena decisiones GTO en cash NL, importa PokerStars, Winamax, GGPoker, 888poker y CoinPoker (cash, spins y torneos), y mejora con ForgeCoach.',
    keywords: 'poker GTO, entrenador poker, NL Hold\'em, cash game 6-max, spins, MTT, IA poker, PokerStars, Winamax, GGPoker, 888poker, CoinPoker, estudiar poker, fugas NL25'
  },
  legal: {
    'faq.html': {
      title: 'Preguntas frecuentes · PokerForgeAI',
      description: 'FAQ de PokerForgeAI: import PokerStars/Winamax/GGPoker/888poker/CoinPoker, pestañas Cash/Spins/Torneos, trial Study, planes, ForgeCoach, PWA y soporte.',
      type: 'FAQPage',
      faq: [
        { q: '¿Qué es PokerForgeAI?', a: 'PokerForgeAI es una app web para entrenar GTO en NL Hold\'em, revisar sesiones importadas (PokerStars, Winamax, GGPoker, 888poker, CoinPoker) y usar ForgeCoach. El entrenador se centra en cash; el importador también organiza spins y torneos.' },
        { q: '¿Necesito cuenta para usarla?', a: 'Sí. El acceso requiere iniciar sesión con Google. Tus datos se asocian a tu cuenta para sincronización en la nube y límites según el plan.' },
        { q: '¿Cómo importo una sesión?', a: 'En Sesiones, sube uno o varios .txt de PokerStars, Winamax, GGPoker, 888poker o CoinPoker. Debajo del importador hay pestañas Cash, Spins y Torneos. En Chrome/Edge puedes auto-importar una carpeta de historiales.' },
        { q: '¿Qué formatos de historial admite?', a: 'PokerStars (ES/EN+Zoom), Winamax, GGPoker/Natural8, 888poker y CoinPoker. NLHE cash/spins/MTT con análisis GTO; PLO y Short Deck se importan sin análisis GTO.' },
        { q: '¿Cómo organizo Cash, Spins y Torneos?', a: 'Tras importar, cada sesión se lista en la pestaña Cash, Spins o Torneos según el tipo detectado, con badges de formato y Max-N.' },
        { q: '¿Hay prueba de Study?', a: 'Sí. Puedes activar una prueba de Study de 10 días (una vez por cuenta) desde Planes.' },
        { q: '¿Cuáles son los planes?', a: 'Gratis (límites diarios), Study (14,99 €/mes) e Coach (34,99 €/mes) con más consultas IA y sin límites de entrenamiento.' },
        { q: '¿Hay atajos de teclado?', a: 'Sí: F fold, C call, K/Espacio check-call, R raise/bet, 1–3 tamaños, N nueva mano, G solo errores graves en sesión, flechas/Enter en repaso, H/? ayuda.' },
        { q: '¿Puedo entrenar con rake?', a: 'Sí. En Configurar sesión eliges sin rake, estándar (~5%/3bb) o personalizado; afecta pot odds y EV del consejo.' },
        { q: '¿Las stats de spins usan las mismas bandas que cash?', a: 'No. Ideales y KPIs se adaptan al formato. En spins/MTT hay ICM lite orientativo; no es un modelo ICM completo de torneo.' }
      ]
    },
    'metodologia.html': {
      title: 'Metodología GTO · PokerForgeAI',
      description: 'Cómo PokerForgeAI estima estrategia GTO: rangos preflop, equity Monte Carlo, estrategia por spot y clasificación de fugas de EV en NL Hold\'em.',
      type: 'Article'
    },
    'soporte.html': {
      title: 'Soporte · PokerForgeAI',
      description: 'Contacta con el soporte de PokerForgeAI: ayuda con la app, facturación, importación de sesiones e ForgeCoach.',
      type: 'WebPage'
    },
    'terminos.html': {
      title: 'Términos de uso · PokerForgeAI',
      description: 'Términos de uso de PokerForgeAI: condiciones del servicio, planes, límites, propiedad intelectual y uso aceptable.',
      type: 'WebPage'
    },
    'privacidad.html': {
      title: 'Política de privacidad · PokerForgeAI',
      description: 'Política de privacidad de PokerForgeAI (RGPD): datos tratados, bases legales, conservación, subencargados y derechos.',
      type: 'WebPage',
      hreflang: { es: 'privacidad.html', en: 'privacy-en.html' }
    },
    'privacy-en.html': {
      title: 'Privacy Policy · PokerForgeAI',
      description: 'PokerForgeAI privacy policy: data processed, legal bases, retention, subprocessors and your rights.',
      type: 'WebPage',
      lang: 'en',
      hreflang: { es: 'privacidad.html', en: 'privacy-en.html' }
    },
    'cookies.html': {
      title: 'Política de cookies · PokerForgeAI',
      description: 'Política de cookies de PokerForgeAI: tipos de cookies, consentimiento, analytics y cómo gestionarlas.',
      type: 'WebPage'
    },
    'ia.html': {
      title: 'Uso de inteligencia artificial · PokerForgeAI',
      description: 'Cómo PokerForgeAI usa ForgeCoach: límites por plan, privacidad de consultas, bonos y buenas prácticas.',
      type: 'WebPage'
    }
  }
};
