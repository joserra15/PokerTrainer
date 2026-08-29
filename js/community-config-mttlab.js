/*
 * community-config-mttlab.js — Comunidad MTT LAB (Skool).
 */
(function (global) {
  'use strict';

  global.PT_COMMUNITY_CONFIGS = global.PT_COMMUNITY_CONFIGS || {};
  global.PT_COMMUNITY_CONFIGS.mttlab = {
    id: 'mttlab',
    siteName: 'MTT LAB',
    logo: 'icons/mttlab-logo.jpg',
    logoAuth: 'icons/mttlab-logo.jpg',
    entryPath: '/mttlab/',
    requireMembership: true,
    landing: {
      showPricing: false,
      title: 'MTT LAB Community',
      subtitle: 'Escuela y entrenamiento MTT exclusivos para miembros de la comunidad.',
      kicker: 'Skool Poker Group · 2026'
    },
    menus: {
      show: ['play', 'school', 'ranges', 'sessions', 'errors', 'stats', 'contact', 'manager'],
      hide: ['pricing', 'legendary', 'learn', 'analysis', 'history', 'admin']
    },
    school: {
      pack: 'mttlab',
      unlockMode: 'allOpen',
      allowExternalLinks: true
    },
    billing: {
      hidePricing: true,
      bypassPaywalls: true
    },
    ai: {
      monthlyLimit: 40,
      independent: true
    },
    home: {
      welcomeFromManager: true,
      hideDailySpot: true,
      hideQuickAccess: true,
      hideAnnualUpsell: true,
      hideCoachMount: true
    },
    contact: {
      communityScoped: true
    }
  };
})(typeof window !== 'undefined' ? window : this);
