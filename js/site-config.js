/*
 * site-config.js — URLs públicas y orígenes OAuth (Epic 4 / G-03).
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
    'http://localhost:5500/',
    'http://127.0.0.1:5500/'
  ],
  supabaseRedirectUrls: [
    'https://www.pokerforgeai.com/',
    'http://localhost/',
    'http://127.0.0.1/'
  ]
};
