/*
 * community-config-pokerforge.js — Producto principal (sin membership).
 */
(function (global) {
  'use strict';

  global.PT_COMMUNITY_CONFIGS = global.PT_COMMUNITY_CONFIGS || {};
  global.PT_COMMUNITY_CONFIGS.pokerforge = {
    id: 'pokerforge',
    siteName: 'PokerForgeAI',
    logo: 'icons/logo-header.png',
    logoAuth: 'icons/logo-header.png',
    entryPath: '/',
    requireMembership: false,
    landing: {
      showPricing: true
    },
    menus: {
      show: null,
      hide: ['manager']
    },
    school: {
      pack: 'pokerforge',
      unlockMode: 'linear',
      allowExternalLinks: false
    },
    billing: {
      hidePricing: false,
      bypassPaywalls: false
    },
    contact: {
      communityScoped: false
    }
  };
})(typeof window !== 'undefined' ? window : this);
