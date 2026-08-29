/*
 * site-config.example.js — URLs y orígenes OAuth (G-03).
 * Copia a js/site-config.js y ajusta si cambias dominio o entornos locales.
 */
window.PT_SITE = {
  appUrl: 'https://www.pokerforgeai.com/',
  siteName: 'PokerForgeAI',
  oauthJavascriptOrigins: [
    'https://www.pokerforgeai.com',
    'http://localhost',
    'http://127.0.0.1'
  ],
  oauthRedirectUris: [
    'https://www.pokerforgeai.com/',
    'https://www.pokerforgeai.com/mttlab/',
    'http://localhost:5500/',
    'http://localhost:5500/mttlab/',
    'http://127.0.0.1:5500/',
    'http://127.0.0.1:5500/mttlab/'
  ],
  supabaseRedirectUrls: [
    'https://www.pokerforgeai.com/',
    'https://www.pokerforgeai.com/mttlab/',
    'http://localhost/',
    'http://localhost/mttlab/',
    'http://127.0.0.1/',
    'http://127.0.0.1/mttlab/'
  ]
};
