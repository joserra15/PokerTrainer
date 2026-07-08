/*
 * site-config.example.js — URLs y orígenes OAuth (G-03).
 * Copia a js/site-config.js y ajusta si añades dominio propio (G-01).
 */
window.PT_SITE = {
  appUrl: 'https://joserra15.github.io/PokerTrainer/',
  siteName: 'PokerForgeAI',
  oauthJavascriptOrigins: [
    'https://joserra15.github.io',
    'http://localhost',
    'http://127.0.0.1'
  ],
  oauthRedirectUris: [
    'https://joserra15.github.io/PokerTrainer/',
    'http://localhost:5500/',
    'http://127.0.0.1:5500/'
  ],
  supabaseRedirectUrls: [
    'https://joserra15.github.io/PokerTrainer/',
    'http://localhost/',
    'http://127.0.0.1/'
  ]
};
