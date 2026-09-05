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
      hide: ['pricing', 'legendary', 'tournaments', 'learn', 'analysis', 'history', 'admin']
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
    },
    trainer: {
      /* Solo Torneos: oculta pestañas Cash y Spins del setup */
      formatHubs: ['mtt'],
      defaultFormatHub: 'mtt',
      hidePresets: ['cash6', 'spin_grind']
    },
    ranges: {
      /* Oculta Spin 3-max; mantiene 6-max, 9-max y MTT */
      hideGameTypes: ['spin3']
    }
  };
})(typeof window !== 'undefined' ? window : this);
