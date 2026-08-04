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
    title: 'PokerForgeAI · Entrenador GTO de poker NL Hold\'em con IA Coach',
    description: 'Entrena decisiones GTO en cash NL 6-max, importa PokerStars, Winamax y GGPoker, y mejora con IA Coach. Plan gratis, prueba Study 10 días y PWA.',
    keywords: 'poker GTO, entrenador poker, NL Hold\'em, cash game 6-max, IA poker, PokerStars, Winamax, GGPoker, estudiar poker'
  },
  legal: {
    'faq.html': {
      title: 'Preguntas frecuentes · PokerForgeAI',
      description: 'FAQ de PokerForgeAI: entrenamiento GTO, import PokerStars/Winamax/GGPoker, trial Study, planes, IA Coach, PWA y soporte.',
      type: 'FAQPage',
      faq: [
        { q: '¿Qué es PokerForgeAI?', a: 'PokerForgeAI es una aplicación web para entrenar decisiones GTO en No-Limit Hold\'em, revisar sesiones importadas (PokerStars, Winamax, GGPoker) y usar IA Coach con planes de pago.' },
        { q: '¿Necesito cuenta para usarla?', a: 'Sí. El acceso requiere iniciar sesión con Google. Tus datos se asocian a tu cuenta para sincronización en la nube y límites según el plan.' },
        { q: '¿Cómo importo una sesión?', a: 'En la pestaña Sesiones, sube uno o varios ficheros .txt de PokerStars, Winamax o GGPoker (Cash NL Hold\'em). La app analiza cada mano calle a calle.' },
        { q: '¿Qué formatos de historial admite?', a: 'Historiales de texto de PokerStars (ES/EN), Winamax y GGPoker/Natural8 en mesas Cash NLHE. Los torneos se ignoran.' },
        { q: '¿Hay prueba de Study?', a: 'Sí. Puedes activar una prueba de Study de 10 días (una vez por cuenta) desde Planes.' },
        { q: '¿Cuáles son los planes?', a: 'Gratis (límites diarios), Study (14,99 €/mes) e Coach (34,99 €/mes) con más consultas IA y sin límites de entrenamiento.' }
      ]
    },
    'metodologia.html': {
      title: 'Metodología GTO · PokerForgeAI',
      description: 'Cómo PokerForgeAI estima estrategia GTO: rangos preflop, equity Monte Carlo, estrategia por spot y clasificación de fugas de EV en NL Hold\'em.',
      type: 'Article'
    },
    'soporte.html': {
      title: 'Soporte · PokerForgeAI',
      description: 'Contacta con el soporte de PokerForgeAI: ayuda con la app, facturación, importación de sesiones e IA Coach.',
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
      description: 'Cómo PokerForgeAI usa IA Coach: límites por plan, privacidad de consultas, bonos y buenas prácticas.',
      type: 'WebPage'
    }
  }
};
