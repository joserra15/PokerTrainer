/*
 * tournament/names.js — Nicks únicos para villanos de torneo.
 * Independientes del rol/perfil (el nick no implica el tipo de jugador).
 */
(function (global) {
  'use strict';

  var POOL = [
    'Alex_92', 'RiverRat', 'ChipChase', 'BluffBay', 'AceHunter', 'FoldEquity',
    'PotCommit', 'SilentSB', 'ButtonBoss', 'CoolerKid', 'MoonRun', 'TiltProof',
    'GTOGhost', 'BubbleBoy', 'ICMWizard', 'ShoveShow', 'FlopHero', 'TurnTorch',
    'RiverGod', 'StackSniper', 'BlindBandit', 'AnteAngel', 'MTTMaven', 'SpinKing',
    'CashCow', 'NutsNora', 'DrawDan', 'ValueVic', 'FloatFlo', 'CBetCarl',
    'ProbePam', 'CheckRaise', 'OverbetOz', 'MinRaise', 'PotOdds', 'ImpliedIz',
    'BlockerBen', 'RangeRob', 'ComboKim', 'EquityEd', 'FoldFam', 'ThreeBetTom',
    'FourBetFay', 'SqueezeSue', 'IsoIan', 'LimpLarry', 'StealSam', 'ReSteal',
    'Shorty', 'CoverCat', 'MidStack', 'DeepDive', 'PushFold', 'NashNora',
    'Harville', 'BubbleFactor', 'PayJump', 'LadderUp', 'FinalTable', 'HeadsUpHz',
    'Railbird', 'SweatShop', 'BadBeat', 'CoolerClub', 'Suckout', 'BrickBoard',
    'Monotone', 'PairedPot', 'WetBoard', 'DryAsDust', 'ScareCard', 'BlankRiver',
    'Backdoor', 'Gutshot', 'OESD', 'FlushDraw', 'SetMine', 'Overpair',
    'Underpair', 'TwoPair', 'TopPair', 'SecondPair', 'AirBall', 'Polarized',
    'Merged', 'Linear', 'WideOpen', 'Splashy', 'RockSolid', 'TrapDoor',
    'SlowRoll', 'OakTable', 'NightOwl', 'SoftServe', 'CopperPot', 'SilverChip',
    'BlueFelt', 'CardSharkX', 'QuietRiver', 'OpenSeat', 'LateReg', 'EarlyBird'
  ];

  function shuffle(arr, rnd) {
    var a = arr.slice();
    var r = typeof rnd === 'function' ? rnd : Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /** Devuelve `count` nicks únicos. Si hace falta, añade sufijos. */
  function pickUnique(count, rnd) {
    var n = Math.max(0, Math.min(200, Number(count) || 0));
    var pool = shuffle(POOL, rnd);
    var out = [];
    var i = 0;
    while (out.length < n) {
      if (i < pool.length) {
        out.push(pool[i++]);
      } else {
        out.push('Villain_' + (out.length + 1));
      }
    }
    return out;
  }

  global.PTTournamentNames = {
    POOL: POOL.slice(),
    pickUnique: pickUnique
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
