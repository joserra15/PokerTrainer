/*
 * site-config.js — URLs públicas y orígenes OAuth (Epic 4 / G-03).
 */
window.PT_SITE = {
  appUrl: 'https://joserra15.github.io/PokerTrainer/',
  siteName: 'PokerTrainer',
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
