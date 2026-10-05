/*
 * community-config-mttlab.js — Comunidad MTT LAB (Skool).
 *
 * Contrato de producto (compartido con PokerForgeAI):
 * - Motor GTO, criterio de análisis / paso a paso, villanos MTT y torneos:
 *   mismo código que PokerForge (js/engine, import.js, tournament/gto-eval,
 *   tournament/villain-decide). No bifurcar por community id.
 * - Sí: importación de Sesiones (menus.show → sessions).
 * - No: menú Análisis dedicado (menus.hide → analysis).
 * - Independiente por comunidad: ranking de torneos y Koins (wallet/leaderboard).
 * - Entrenador: solo formato MTT (sin Cash / Spins).
 */
(function (global) {
  'use strict';

  global.PT_COMMUNITY_CONFIGS = global.PT_COMMUNITY_CONFIGS || {};
  global.PT_COMMUNITY_CONFIGS.mttlab = {
    id: 'mttlab',
    siteName: 'MTT LAB',
    logo: 'icons/mttlab-logo-header.png',
    logoAuth: 'icons/mttlab-logo-header.png',
    entryPath: '/mttlab/',
    requireMembership: true,
    landing: {
      showPricing: false,
      title: 'MTT LAB Community',
      subtitle: 'Escuela y entrenamiento MTT exclusivos para miembros de la comunidad.',
      kicker: 'Skool Poker Group · 2026'
    },
    menus: {
      /* Sesiones = import HH; Análisis (hand-analysis) queda oculto a propósito. */
      show: ['play', 'school', 'ranges', 'sessions', 'errors', 'stats', 'contact', 'manager', 'tournaments'],
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
