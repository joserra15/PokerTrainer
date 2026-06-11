/*
 * data.js — Tablas GTO preflop 6-max 100bb (aprox. solver de estudio).
 *
 * Semántica de frecuencias:
 *   raise / threeBet / fourBet  → 100% agresión
 *   mix / threeBetMix           → 50% agresión / 50% fold (o call si también en call)
 *   call                        → 100% call
 *   callMix                     → 42% call / 58% fold
 */
(function (global) {
  'use strict';

  const OPEN_RAISE = {
    UTG: {
      raise: '22+, ATs+, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AJo+, KQo',
      mix: 'A5s, A4s, A3s, 65s, KJo'
    },
    HJ: {
      raise: '22+, A9s+, A5s-A2s, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, 65s, ATo+, KJo+, QJo',
      mix: 'A8s, K9s, Q9s, J9s, 54s, KTo'
    },
    CO: {
      raise: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, 54s, A9o+, KTo+, QTo+, JTo',
      mix: 'K8s, Q8s, J8s, 86s, A8o, K9o, QJo'
    },
    BTN: {
      raise: '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, 43s, A2o+, K8o+, Q9o+, J9o+, T9o',
      mix: 'K2s-K4s, Q5s, Q6s, 53s, 42s, K7o, Q8o, J8o, T8o, 98o'
    },
    SB: {
      raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A7o+, K9o+, QTo+, JTo',
      mix: 'K2s-K5s, Q6s, Q7s, J7s, 64s, A2o-A6o, K8o, Q9o, J9o, T9o'
    }
  };

  const VS_RFI = {
    BB_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, A4s, KJs',
      call: '22-JJ, A2s-AQs, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, AJo+, KQo, KJo, QJo'
    },
    BB_vs_HJ: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, A4s, A3s, KJs, KTs',
      call: '22-JJ, A2s-AQs, K8s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s, ATo+, KJo+, QJo, JTo'
    },
    BB_vs_CO: {
      threeBet: 'TT+, AQs+, AKo',
      threeBetMix: '99, AJs, A5s-A2s, KJs, KTs, QJs, A5o',
      call: '22-JJ, A2s-AJs, K6s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A8o+, KTo+, QTo+, JTo'
    },
    BB_vs_BTN: {
      threeBet: '99+, AJs+, AKo, A5s',
      threeBetMix: '88, 77, ATs, A4s-A2s, KTs+, QTs, JTs, KQo, A5o, A4o',
      call: '22-TT, A2s-ATs, K3s+, Q5s+, J6s+, T6s+, 95s+, 85s+, 74s+, 64s+, 53s+, A7o-A2o, KTo-K9o, QTo+, J9o+, T9o, 98o'
    },
    BB_vs_SB: {
      threeBet: '88+, ATs+, KJs+, AJo+, A5s',
      threeBetMix: '77-22, A9s-A2s, KTs, QTs, JTs, T9s, KQo, KJo, A8o-A2o',
      call: 'K4s+, Q6s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, KTo, QTo, JTo, T9o, 98o'
    },
    SB_vs_UTG: {
      threeBet: 'TT+, AQs+, AKo',
      threeBetMix: '99, AJs, A5s, A4s, KQs',
      call: '88-22, ATs, KJs, QJs, JTs, T9s, 98s',
      callMix: 'AJo, KQo'
    },
    SB_vs_HJ: {
      threeBet: 'TT+, AQs+, AKo',
      threeBetMix: '99, 88, AJs, ATs, A5s-A3s, KJs, KQs',
      call: '77-22, KTs, QTs, JTs, T9s, 98s, AJo, KQo',
      callMix: 'KJo, QJo'
    },
    SB_vs_CO: {
      threeBet: '99+, AJs+, AKo, A5s',
      threeBetMix: '88, 77, ATs, A4s-A2s, KTs+, QJs, KQo, A5o',
      call: '66-22, A9s, K9s, Q9s, J9s, T9s, 98s, AQo, AJo, KJo',
      callMix: 'QJo, JTo'
    },
    SB_vs_BTN: {
      threeBet: '88+, ATs+, KTs+, QJs, AJo+, A5s, A4s',
      threeBetMix: '77-44, A9s-A2s, K9s, QTs, JTs, T9s, 98s, KJo, KQo, A8o-A5o',
      call: '33, 22, K8s, Q9s, J9s, T8s, 97s, 87s, 76s, KTo, QTo, JTo',
      callMix: 'A9o, T9o'
    },
    CO_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KJs',
      call: 'TT-22, AJs+, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
      callMix: 'AJo, KJo, KQo'
    },
    CO_vs_HJ: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, A5s, A4s, KQs, KJs',
      call: '99-22, ATs+, KTs+, QTs+, JTs, T9s, 98s, 87s, AQo, AJo',
      callMix: 'KJo, QJo, KQo'
    },
    BTN_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, A4s, KJs',
      call: 'TT-22, AJs, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo, KQo',
      callMix: 'AJo, KJo'
    },
    BTN_vs_HJ: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, TT, AQs, AJs, A5s-A3s, KQs, KJs',
      call: '99-22, ATs, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AQo, AJo, KQo',
      callMix: 'KJo, QJo'
    },
    BTN_vs_CO: {
      threeBet: 'JJ+, AQs+, AKo',
      threeBetMix: 'TT, 99, AJs, ATs, A5s-A2s, KQs, KJs, QJs, A5o',
      call: '88-22, A9s, K9s+, Q9s+, J9s, T9s, 98s, 87s, 76s, 65s, AJo, KQo, QJo',
      callMix: 'KJo, T9o'
    },
    HJ_vs_UTG: {
      threeBet: 'QQ+, AKs, AKo',
      threeBetMix: 'JJ, AQs, A5s, KQs',
      call: 'TT-22, AJs+, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
      callMix: 'AJo, KJo'
    }
  };

  /** Opener afronta 3-bet */
  const VS_3BET = {
    fourBet: 'QQ+, AKs, AKo',
    call: 'JJ, TT, 99, AQs, AJs, KQs, AQo',
    callMix: '88, 77, ATs, KJs, QJs, AJo, KQo'
  };

  /** Opener afronta 4-bet */
  const VS_4BET = {
    fourBet: 'KK+, AKs',
    call: 'QQ, JJ, AKo, AQs',
    callMix: 'TT, 99, AJs, KQs'
  };

  /** Squeeze (open + caller) */
  const SQUEEZE = {
    raise: 'TT+, AQs+, AKo, A5s-A2s',
    call: '99-JJ, AJs, ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo',
    callMix: '88, 77, AJo, KQo, KJo'
  };

  /** Iso vs limpers */
  const ISO_LIMP = {
    raise: '88+, A9s+, A5s-A2s, KTs+, QTs+, JTs, AJo+, KQo',
    callMix: '66-77, A8s, ATo, KJo, QJo, JTo, T9s, 98s',
    fold: '22-55, A2o-A7o, K9o-, Q9o-, J9o-'
  };

  /** Cold 3-bet / 4-bet en frío */
  const COLD_3BET = {
    raise: 'QQ+, AKs, AKo, A5s',
    call: 'JJ, TT, AQs, AJs, KQs, AQo',
    callMix: '99, 88, ATs, KJs, QJs, AJo, KQo',
    fold: '77-, A9s-A2s, KTs-, QTs-, JTs-, ATo-, KJo-'
  };

  const BROAD_CONTINUE = '22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, A8o+, KTo+, QTo+, JTo';
  const LIMP_RANGE = '22-99, A2s-A9s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KJo, QJo, JTo';

  /** Claves vsRFI válidas para validación */
  const VS_RFI_KEYS = Object.keys(VS_RFI);

  global.GTORangesData = {
    OPEN_RAISE, VS_RFI, VS_3BET, VS_4BET, SQUEEZE, ISO_LIMP, COLD_3BET,
    BROAD_CONTINUE, LIMP_RANGE, VS_RFI_KEYS
  };
})(window);
