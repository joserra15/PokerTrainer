#!/usr/bin/env node
/**
 * Fallback HTML para carruseles B32–B46 (letras grandes).
 * Los JPG canónicos en 03-carruseles-edu/ son assets premium (IA).
 * Uso:
 *   node tools/instagram-edu-carruseles-b32-b46.js           # solo si falta el JPG
 *   node tools/instagram-edu-carruseles-b32-b46.js --force  # sobrescribe
 *
 * Copy canónico: marketing/instagram/03-carruseles-edu/CARRUSELES_B32_B46.md
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const EDU = path.join(ROOT, 'marketing/instagram/03-carruseles-edu');
const W = 720;
const H = 1080;
const FORCE = process.argv.includes('--force');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resalta trozos entre *asteriscos* en oro */
function rich(s) {
  return esc(s).replace(/\*([^*]+)\*/g, '<span class="g">$1</span>');
}

const SHELL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    font-family: "Noto Sans Display", "Noto Sans", "DejaVu Sans", Arial, sans-serif;
    background: #050708;
    color: #f2f4f6;
    position: relative;
  }
  .scene {
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 90% 55% at 50% -5%, #1a3d3222 0%, transparent 55%),
      radial-gradient(ellipse 70% 40% at 85% 95%, #0d4a3a33 0%, transparent 50%),
      radial-gradient(ellipse 50% 35% at 10% 90%, #1a2a4033 0%, transparent 45%),
      radial-gradient(circle at 50% 40%, #12161c 0%, #050708 70%);
  }
  .rings {
    position: absolute; inset: 0; opacity: 0.14;
    background:
      repeating-radial-gradient(circle at 50% 28%, transparent 0 38px, #2ee6a808 38px 39px);
  }
  .spark {
    position: absolute; inset: 0; opacity: 0.45;
    background-image:
      radial-gradient(circle at 18% 22%, #2ee6a8 1px, transparent 1.5px),
      radial-gradient(circle at 78% 18%, #f5c451 1px, transparent 1.5px),
      radial-gradient(circle at 62% 72%, #2ee6a8 1px, transparent 1.5px),
      radial-gradient(circle at 28% 78%, #f5c451 0.8px, transparent 1.2px),
      radial-gradient(circle at 88% 58%, #ffffff 0.7px, transparent 1.1px);
    background-size: 100% 100%;
  }
  .frame {
    position: absolute; inset: 22px;
    border: 1.5px solid #c9a22755;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px #c9a22722;
  }
  .frame::before, .frame::after {
    content: ""; position: absolute; width: 18px; height: 18px;
    border: 1.5px solid #c9a227aa;
  }
  .frame::before { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }
  .frame::after { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }
  .corner-tr, .corner-bl {
    position: absolute; width: 18px; height: 18px;
    border: 1.5px solid #c9a227aa;
  }
  .corner-tr { top: 21px; right: 21px; border-left: 0; border-bottom: 0; }
  .corner-bl { bottom: 21px; left: 21px; border-right: 0; border-top: 0; }

  .badge {
    position: absolute; top: 40px; right: 44px; z-index: 5;
    font-size: 15px; font-weight: 700; letter-spacing: 0.04em;
    color: #e8ecf0;
    border: 1px solid #c9a22766;
    border-radius: 8px;
    padding: 5px 11px;
    background: #0a0c0eaa;
  }
  .badge .t { color: #2ee6a8; }

  .g { color: #e0b84a; }
  .teal { color: #2ee6a8; }

  .spade-hero {
    width: 132px; height: 132px; margin: 0 auto;
    position: relative;
    filter: drop-shadow(0 0 18px #2ee6a844);
  }
  .spade-hero svg { width: 100%; height: 100%; display: block; }
  .chip-ai {
    position: absolute; left: 50%; top: 52%;
    transform: translate(-50%, -50%);
    width: 42px; height: 42px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #3a2a6a, #1a1030 70%);
    border: 2px solid #e0b84a;
    display: grid; place-items: center;
    font-size: 13px; font-weight: 900; color: #f5f0ff;
    letter-spacing: 0.04em;
    box-shadow: 0 0 16px #7c5cff88, inset 0 0 8px #2ee6a833;
  }

  .brand-foot {
    position: absolute; left: 0; right: 0; bottom: 48px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    z-index: 4;
  }
  .anvil {
    width: 36px; height: 36px;
    display: grid; place-items: center;
  }
  .brand-name {
    font-size: 13px; font-weight: 800; letter-spacing: 0.22em;
  }
  .brand-name .pf { color: #f0f3f6; }
  .brand-name .ai { color: #2ee6a8; }

  .props {
    position: absolute; bottom: 0; left: 0; right: 0; height: 200px;
    pointer-events: none; opacity: 0.55; z-index: 1;
  }
  .props .chips {
    position: absolute; left: -10px; bottom: 20px;
    width: 160px; height: 110px;
    background:
      radial-gradient(ellipse at 40% 70%, #1a1f24 40%, transparent 70%),
      linear-gradient(160deg, #2a3038 0%, #0e1216 100%);
    border-radius: 50% 50% 20% 40%;
    box-shadow: 0 0 40px #000;
    opacity: 0.7;
  }
  .props .chips::before {
    content: ""; position: absolute; left: 28px; top: 18px;
    width: 54px; height: 54px; border-radius: 50%;
    border: 3px solid #c9a22788;
    background: radial-gradient(circle at 40% 35%, #2a323c, #0a0c0e);
    box-shadow: 8px 12px 0 -2px #1a2228, 8px 12px 0 1px #c9a22744;
  }
  .props .card {
    position: absolute; right: 8px; bottom: 28px;
    width: 92px; height: 128px;
    background: linear-gradient(145deg, #1a1e24, #0a0c10);
    border: 1.5px solid #c9a22766;
    border-radius: 8px;
    transform: rotate(12deg);
    box-shadow: -8px 10px 24px #000a;
    opacity: 0.75;
  }
  .props .card::before {
    content: "A♠"; position: absolute; top: 10px; left: 10px;
    font-size: 18px; color: #e0b84a; font-weight: 800;
  }

  .rule {
    width: 200px; height: 1px; margin: 18px auto;
    background: linear-gradient(90deg, transparent, #c9a227cc, transparent);
    position: relative;
  }
  .rule::after {
    content: "◆"; position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    background: #050708; padding: 0 8px;
    color: #e0b84a; font-size: 10px;
  }
`;

function spadeSvg() {
  return `<div class="spade-hero">
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f0d78a"/>
          <stop offset="50%" stop-color="#c9a227"/>
          <stop offset="100%" stop-color="#8a6a14"/>
        </linearGradient>
        <radialGradient id="g2" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#1a3d32"/>
          <stop offset="100%" stop-color="#0a1014"/>
        </radialGradient>
      </defs>
      <path d="M60 8 C60 8 18 48 18 72 C18 88 32 98 48 98 C52 98 56 96 60 92
               C64 96 68 98 72 98 C88 98 102 88 102 72 C102 48 60 8 60 8 Z"
            fill="url(#g2)" stroke="url(#g1)" stroke-width="3"/>
      <path d="M52 98 L60 112 L68 98" fill="#0a1014" stroke="url(#g1)" stroke-width="2"/>
      <circle cx="42" cy="58" r="3" fill="#2ee6a8" opacity="0.9"/>
      <circle cx="78" cy="58" r="3" fill="#2ee6a8" opacity="0.9"/>
      <circle cx="60" cy="42" r="2.5" fill="#2ee6a8" opacity="0.7"/>
      <path d="M42 58 L60 42 L78 58 L60 72 Z" fill="none" stroke="#2ee6a866" stroke-width="1.2"/>
    </svg>
    <div class="chip-ai">AI</div>
  </div>`;
}

function brandFoot() {
  return `<div class="brand-foot">
    <div class="anvil">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <path d="M8 24 h20 l-2 4 H10 z" fill="#c9a227"/>
        <path d="M6 20 h24 v4 H6 z" fill="#e0b84a"/>
        <path d="M18 6 c4 4 6 8 0 14 c-6 -6 -4 -10 0 -14" fill="#2ee6a8"/>
      </svg>
    </div>
    <div class="brand-name"><span class="pf">POKERFORGE</span><span class="ai">AI</span></div>
  </div>`;
}

function props() {
  return `<div class="props"><div class="chips"></div><div class="card"></div></div>`;
}

function htmlCover({ title, sub1, sub2, page }) {
  const titleHtml = title.includes('\n')
    ? title.split('\n').map((l) => `<div>${rich(l)}</div>`).join('')
    : rich(title);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${SHELL_CSS}
    .wrap {
      position: absolute; inset: 0; z-index: 3;
      display: flex; flex-direction: column; align-items: center;
      padding: 56px 48px 140px;
    }
    .title {
      margin-top: 28px;
      font-family: "Noto Sans Display", "Noto Sans", sans-serif;
      font-size: ${title.length > 14 ? 68 : title.length > 10 ? 78 : 92}px;
      font-weight: 400; line-height: 0.95; text-align: center;
      color: #f4f6f8; letter-spacing: -0.02em;
      text-shadow: 0 2px 24px #000a;
    }
    .title .g { color: #e0b84a; }
    .sub1 {
      font-family: "Noto Sans Display", "Noto Sans", sans-serif;
      font-size: 28px; color: #e0b84a; text-align: center;
      letter-spacing: 0.02em; margin-top: 4px; font-weight: 800;
    }
    .sub2 {
      font-family: "Noto Sans Display", "Noto Sans", sans-serif;
      font-size: 44px; color: #e0b84a; text-align: center; font-weight: 900;
      line-height: 1.05; letter-spacing: -0.01em;
    }
  </style></head><body>
    <div class="scene"></div><div class="rings"></div><div class="spark"></div>
    <div class="frame"></div><div class="corner-tr"></div><div class="corner-bl"></div>
    ${props()}
    <div class="badge">${esc(page.split('/')[0])}/<span class="t">${esc(page.split('/')[1] || '5')}</span></div>
    <div class="wrap">
      ${spadeSvg()}
      <div class="title">${titleHtml}</div>
      <div class="rule"></div>
      ${sub1 ? `<div class="sub1">${rich(sub1)}</div>` : ''}
      ${sub2 ? `<div class="sub2">${rich(sub2)}</div>` : ''}
    </div>
    ${brandFoot()}
  </body></html>`;
}

function htmlInt({ title, body, page, motif }) {
  const motifBlock =
    motif === 'warn'
      ? `<div class="motif warn">
          <div class="shield">⚠</div>
        </div>`
      : motif === 'cards'
        ? `<div class="motif cards">♠ ♥</div>`
        : `<div class="motif glow">♠</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${SHELL_CSS}
    .wrap {
      position: absolute; inset: 0; z-index: 3;
      display: flex; flex-direction: column; align-items: center;
      padding: 72px 44px 130px; text-align: center;
    }
    .badge { left: 44px; right: auto; border-radius: 999px; }
    .title {
      font-family: "Noto Sans Display", "Noto Sans", sans-serif;
      font-size: 42px; line-height: 1.05; max-width: 600px;
      letter-spacing: -0.02em; font-weight: 900;
    }
    .body {
      font-size: 22px; line-height: 1.4; max-width: 540px;
      color: #dce3ea; font-weight: 600; margin-top: 4px;
    }
    .motif {
      margin-top: auto; margin-bottom: 24px;
      font-size: 88px; color: #e0b84a;
      text-shadow: 0 0 40px #e0b84a66, 0 0 80px #2ee6a833;
      filter: drop-shadow(0 12px 24px #000a);
    }
    .motif.warn .shield {
      width: 120px; height: 140px; margin: 0 auto;
      border: 2px solid #e0b84a; border-radius: 12px 12px 50% 50%;
      display: grid; place-items: center; font-size: 48px;
      background: linear-gradient(180deg, #1a1510, #0a0c0e);
      box-shadow: 0 0 32px #e0b84a44;
    }
    .motif.cards { letter-spacing: 0.15em; opacity: 0.9; }
    .brand-foot { bottom: 40px; }
    .brand-foot .anvil { display: none; }
    .mini-spade {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1.5px solid #e0b84a; display: grid; place-items: center;
      font-size: 14px; color: #e0b84a; margin-bottom: 4px;
      box-shadow: 0 0 10px #7c5cff55;
    }
  </style></head><body>
    <div class="scene"></div><div class="rings"></div><div class="spark"></div>
    <div class="frame"></div><div class="corner-tr"></div><div class="corner-bl"></div>
    <div class="badge">${esc(page.split('/')[0])}/<span class="t">${esc(page.split('/')[1] || '5')}</span></div>
    <div class="wrap">
      <div class="title">${rich(title)}</div>
      <div class="rule"></div>
      <div class="body">${rich(body)}</div>
      ${motifBlock}
    </div>
    <div class="brand-foot">
      <div class="mini-spade">♠</div>
      <div class="brand-name"><span class="pf">PokerForge</span><span class="ai" style="color:#e0b84a">AI</span></div>
    </div>
  </body></html>`;
}

function htmlCta({ line1, line2, line3, bullets, page }) {
  const items = (bullets || [])
    .map(
      (b) => `<div class="item">
      <div class="ico">${b.ico || '♠'}</div>
      <div class="txt"><div class="a">${esc(b.a)}</div><div class="b">${esc(b.b)}</div></div>
    </div>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${SHELL_CSS}
    .wrap {
      position: absolute; inset: 0; z-index: 3;
      display: flex; flex-direction: column;
      padding: 48px 40px 100px; align-items: flex-start;
    }
    .topbrand {
      display: flex; align-items: center; gap: 10px; margin-bottom: 36px;
    }
    .topbrand .mark {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1.5px solid #e0b84a; display: grid; place-items: center;
      font-size: 12px; color: #e0b84a;
    }
    .topbrand .name { font-size: 14px; font-weight: 800; letter-spacing: 0.12em; }
    .topbrand .name .pf { color: #e0b84a; }
    .topbrand .name .ai { color: #6ea8ff; }
    .stack {
      font-family: "Noto Sans Display", "Noto Sans", sans-serif;
      line-height: 0.92; letter-spacing: -0.02em; font-weight: 900;
    }
    .stack .l1, .stack .l3 { font-size: 48px; color: #f4f6f8; }
    .stack .l2 { font-size: 72px; color: #e0b84a; margin: 2px 0; }
    .cta {
      margin-top: 22px;
      background: linear-gradient(180deg, #1a3a6a, #0f2244);
      border: 2px solid #3d8bff;
      border-radius: 999px;
      padding: 14px 26px;
      font-size: 18px; font-weight: 800; letter-spacing: 0.06em;
      color: #f0f4ff;
      box-shadow: 0 0 24px #3d8bff55;
      display: inline-flex; align-items: center; gap: 10px;
    }
    .cta .gift { color: #e0b84a; }
    .list { margin-top: 28px; width: 100%; max-width: 380px; }
    .item {
      display: flex; gap: 14px; align-items: center;
      padding: 14px 0; border-bottom: 1px solid #ffffff14;
    }
    .item .ico {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1px solid #e0b84a66; display: grid; place-items: center;
      color: #e0b84a; font-size: 16px; flex-shrink: 0;
    }
    .item .a { font-size: 15px; font-weight: 800; letter-spacing: 0.06em; }
    .item .b { font-size: 14px; font-weight: 700; color: #e0b84a; letter-spacing: 0.04em; margin-top: 2px; }
    .side-spade {
      position: absolute; right: 28px; top: 180px; width: 200px; height: 240px;
      opacity: 0.95; z-index: 2;
      filter: drop-shadow(0 0 30px #2ee6a844);
    }
    .foot-row {
      position: absolute; left: 40px; right: 40px; bottom: 44px;
      display: flex; justify-content: space-between; align-items: center; z-index: 4;
    }
    .linkbio {
      border: 1.5px solid #e0b84a88; border-radius: 10px;
      padding: 10px 16px; font-size: 13px; font-weight: 700;
      letter-spacing: 0.1em; color: #e0b84a;
    }
    .pg { font-size: 28px; font-weight: 800; color: #e0b84a; font-style: italic; }
    .props { opacity: 0.7; }
    .props .chips { left: auto; right: 20px; bottom: 90px; }
    .props .card { display: none; }
  </style></head><body>
    <div class="scene"></div><div class="rings"></div><div class="spark"></div>
    <div class="frame"></div><div class="corner-tr"></div><div class="corner-bl"></div>
    ${props()}
    <div class="side-spade">${spadeSvg()}</div>
    <div class="wrap">
      <div class="topbrand">
        <div class="mark">♠</div>
        <div class="name"><span class="pf">POKERFORGE</span><span class="ai">AI</span></div>
      </div>
      <div class="stack">
        <div class="l1">${esc(line1)}</div>
        <div class="l2">${esc(line2)}</div>
        <div class="l3">${esc(line3)}</div>
      </div>
      <div class="rule" style="margin:18px 0;width:140px;margin-left:0"></div>
      <div class="cta"><span class="gift">🎁</span> 5 MANOS GRATIS</div>
      <div class="list">${items}</div>
    </div>
    <div class="foot-row">
      <div class="linkbio">LINK EN BIO</div>
      <div class="pg">${esc(page)}</div>
    </div>
  </body></html>`;
}

/** @type {{id:string,slides:object[]}[]} */
const CAROUSELS = [
  {
    id: 'b32',
    slides: [
      { file: 'edu-b32-01-cover.jpg', kind: 'cover', title: 'Blind vs\nblind', sub1: 'no es un', sub2: 'pool normal' },
      { file: 'edu-b32-02-que.jpg', kind: 'int', title: 'Qué es *BvB*', body: 'SB vs BB: rangos *anchos*, dead money y más presión. No copies el pool de BTN.', motif: 'glow' },
      { file: 'edu-b32-03-sb.jpg', kind: 'int', title: 'Desde las *ciegas*', body: 'SB open más amplio. BB defiende y *castiga* steals flojos. Adapta al rival.', motif: 'cards' },
      { file: 'edu-b32-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Jugar BvB como *BTN vs BB*. Misma mano, distinto juego.', motif: 'warn' },
      {
        file: 'edu-b32-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'BLIND',
        line3: 'VS BLIND',
        bullets: [
          { ico: '◎', a: 'RANGOS MÁS', b: 'ANCHOS QUE EL POOL' },
          { ico: '◈', a: 'SB OPEN', b: 'BB CASTIGA' },
          { ico: '♛', a: 'NO COPIES', b: 'LÍNEAS DE BTN' }
        ]
      }
    ]
  },
  {
    id: 'b33',
    slides: [
      { file: 'edu-b33-01-cover.jpg', kind: 'cover', title: 'Squeeze', sub1: '3-bet vs', sub2: 'open + call' },
      { file: 'edu-b33-02-que.jpg', kind: 'int', title: 'Qué es un *squeeze*', body: '3-bet fuerte con *caller(s)* detrás del open. Hay dead money… y peligro.', motif: 'glow' },
      { file: 'edu-b33-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: '*Polar*: value premium + bluffs. Sizing grande para que duela el call.', motif: 'cards' },
      { file: 'edu-b33-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Squeeze *linear* “porque hay dead money”. Sin separación value/bluff = spew.', motif: 'warn' },
      {
        file: 'edu-b33-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'SQUEEZE',
        line3: 'EN TRAINER',
        bullets: [
          { ico: '◎', a: 'POLARIZA', b: 'VALUE + BLUFFS' },
          { ico: '◈', a: 'SIZING', b: 'GRANDE' },
          { ico: '♛', a: 'NO SQUEEZE', b: 'LINEAR' }
        ]
      }
    ]
  },
  {
    id: 'b34',
    slides: [
      { file: 'edu-b34-01-cover.jpg', kind: 'cover', title: 'Iso vs limp', sub1: 'aísla al', sub2: 'limper' },
      { file: 'edu-b34-02-que.jpg', kind: 'int', title: 'Qué es un *iso*', body: 'Raise vs limp para jugar *heads-up IP*. Castigas el limp y tomas la iniciativa.', motif: 'glow' },
      { file: 'edu-b34-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Limper *flojo* + buena posición. Quieres aislar, no invitar multiway.', motif: 'cards' },
      { file: 'edu-b34-04-error.jpg', kind: 'int', title: 'Error *típico*', body: '*Flat multiway* tras limp(s). Si no aislarías, mejor fold.', motif: 'warn' },
      {
        file: 'edu-b34-05-cta.jpg',
        kind: 'cta',
        line1: 'PRACTICA',
        line2: 'ISO',
        line3: 'VS LIMP',
        bullets: [
          { ico: '◎', a: 'RAISE PARA', b: 'HEADS-UP IP' },
          { ico: '◈', a: 'NO FLAT', b: 'MULTIWAY' },
          { ico: '♛', a: 'SI NO AISLAS', b: 'FOLDEA' }
        ]
      }
    ]
  },
  {
    id: 'b35',
    slides: [
      { file: 'edu-b35-01-cover.jpg', kind: 'cover', title: 'Board\ntexture', sub1: 'dry, wet', sub2: 'o paired' },
      { file: 'edu-b35-02-que.jpg', kind: 'int', title: 'Qué es la *textura*', body: 'Dry / wet / paired cambia *quién manda* y cuánto puedes bluffear.', motif: 'glow' },
      { file: 'edu-b35-03-dry.jpg', kind: 'int', title: 'Boards *dry*', body: 'Más *c-bet* y small size OK. Menos draws; el caller defiende peor.', motif: 'cards' },
      { file: 'edu-b35-04-wet.jpg', kind: 'int', title: 'Wet / *paired*', body: 'Frena bluffs automáticos. Lee *range advantage* antes de apostar.', motif: 'warn' },
      {
        file: 'edu-b35-05-cta.jpg',
        kind: 'cta',
        line1: 'LEE',
        line2: 'EL',
        line3: 'BOARD',
        bullets: [
          { ico: '◎', a: 'DRY = MÁS', b: 'C-BET OK' },
          { ico: '◈', a: 'WET = MENOS', b: 'BLUFF AUTO' },
          { ico: '♛', a: 'PAIRED:', b: 'CUIDADO EXTRA' }
        ]
      }
    ]
  },
  {
    id: 'b36',
    slides: [
      { file: 'edu-b36-01-cover.jpg', kind: 'cover', title: 'Semi-bluff', sub1: 'equity +', sub2: 'fold equity' },
      { file: 'edu-b36-02-que.jpg', kind: 'int', title: 'Qué es un *semi-bluff*', body: 'Apuestas con *draw*: ganas si foldea ahora o si das después.', motif: 'glow' },
      { file: 'edu-b36-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Con *FE* real + outs decentes. Dos caminos al bote.', motif: 'cards' },
      { file: 'edu-b36-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Semi-bluff vs *calling station*. Sin FE → check o call selectivo.', motif: 'warn' },
      {
        file: 'edu-b36-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'DRAWS',
        line3: 'CON PLAN',
        bullets: [
          { ico: '◎', a: 'EQUITY +', b: 'FOLD EQUITY' },
          { ico: '◈', a: 'VS STATION', b: 'MENOS BLUFF' },
          { ico: '♛', a: 'NO APOSTAR', b: 'EL DRAW SIEMPRE' }
        ]
      }
    ]
  },
  {
    id: 'b37',
    slides: [
      { file: 'edu-b37-01-cover.jpg', kind: 'cover', title: 'Bluff-\ncatcher', sub1: 'solo gana', sub2: 'vs bluff' },
      { file: 'edu-b37-02-que.jpg', kind: 'int', title: 'Qué es un *bluff-catcher*', body: 'Mano media: *pierde vs value*, gana vs aire. El call es selectivo.', motif: 'glow' },
      { file: 'edu-b37-03-cuando.jpg', kind: 'int', title: 'Cuándo *call*', body: 'Rival que *bluffea de más* o size raro. Necesitas historia de farol.', motif: 'cards' },
      { file: 'edu-b37-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Hero-call vs *nit polar*. Ahí casi nunca farolea. Fold salva stacks.', motif: 'warn' },
      {
        file: 'edu-b37-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'RIVER',
        line3: 'CALLS',
        bullets: [
          { ico: '◎', a: 'SOLO GANA', b: 'VS BLUFF' },
          { ico: '◈', a: 'VS NIT POLAR', b: 'FOLDEA' },
          { ico: '♛', a: 'VS MANIAC', b: 'MÁS CALL' }
        ]
      }
    ]
  },
  {
    id: 'b38',
    slides: [
      { file: 'edu-b38-01-cover.jpg', kind: 'cover', title: 'Delayed\nc-bet', sub1: 'check flop', sub2: 'bet turn' },
      { file: 'edu-b38-02-que.jpg', kind: 'int', title: 'Qué es *delayed*', body: 'Check flop; *bet turn* cuando la calle mejora tu rango o niega el suyo.', motif: 'glow' },
      { file: 'edu-b38-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Flop *feo* para ti → turn que te favorece. Timing > c-bet auto.', motif: 'cards' },
      { file: 'edu-b38-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Delay siempre “por pasividad”. Sin plan = *free cards* al rival.', motif: 'warn' },
      {
        file: 'edu-b38-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'TIMING',
        line3: 'DE C-BET',
        bullets: [
          { ico: '◎', a: 'FLOP FEO', b: '→ CHECK OK' },
          { ico: '◈', a: 'TURN BUENO', b: '→ TOMA EL LEAD' },
          { ico: '♛', a: 'DELAY CON', b: 'PLAN, NO MIEDO' }
        ]
      }
    ]
  },
  {
    id: 'b39',
    slides: [
      { file: 'edu-b39-01-cover.jpg', kind: 'cover', title: 'Blocking\nbet', sub1: 'small bet', sub2: 'OOP' },
      { file: 'edu-b39-02-que.jpg', kind: 'int', title: 'Qué es un *block*', body: 'Apuesta *pequeña OOP* para definir barato o inducir. Controlas el bote.', motif: 'glow' },
      { file: 'edu-b39-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Medias OOP + rival que *overbettea* si checkeas. Eliges el precio.', motif: 'cards' },
      { file: 'edu-b39-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Block con *trash unbluffeable*. Mejor check-fold que inventar.', motif: 'warn' },
      {
        file: 'edu-b39-05-cta.jpg',
        kind: 'cta',
        line1: 'PRACTICA',
        line2: 'SIZING',
        line3: 'OOP',
        bullets: [
          { ico: '◎', a: 'SMALL BET', b: 'PARA CONTROLAR' },
          { ico: '◈', a: 'EVITA EL', b: 'OVERBET RIVAL' },
          { ico: '♛', a: 'NO BLOCK', b: 'CON BASURA' }
        ]
      }
    ]
  },
  {
    id: 'b40',
    slides: [
      { file: 'edu-b40-01-cover.jpg', kind: 'cover', title: 'Reverse\nimplied', sub1: 'pagar sale', sub2: 'caro' },
      { file: 'edu-b40-02-que.jpg', kind: 'int', title: 'Qué son *RIO*', body: 'Si das, pierdes *stacks* vs manos mejores. El call barato hoy duele mañana.', motif: 'glow' },
      { file: 'edu-b40-03-cuando.jpg', kind: 'int', title: 'Spots *peligrosos*', body: 'Manos *dominadas* / second-best en boards que pagan fuerte.', motif: 'cards' },
      { file: 'edu-b40-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Chase KQo vs 3-bet “por outs”. *Reverse odds* > pot odds lindas.', motif: 'warn' },
      {
        file: 'edu-b40-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'SPOTS',
        line3: 'DOMINADOS',
        bullets: [
          { ico: '◎', a: 'NO SOLO', b: 'POT ODDS' },
          { ico: '◈', a: 'SECOND-BEST', b: 'VACÍA STACKS' },
          { ico: '♛', a: 'FOLD SALVA', b: 'DINERO' }
        ]
      }
    ]
  },
  {
    id: 'b41',
    slides: [
      { file: 'edu-b41-01-cover.jpg', kind: 'cover', title: 'Polar vs\nlinear', sub1: 'cómo formas', sub2: 'el rango' },
      { file: 'edu-b41-02-que.jpg', kind: 'int', title: 'Dos *formas*', body: '*Polar* = value fuerte + bluffs. *Linear* = continuum con medias.', motif: 'glow' },
      { file: 'edu-b41-03-polar.jpg', kind: 'int', title: 'Usa *polar*', body: '3-bet / 4-bet / *overbet* típicos. Extremos del rango, no el medio.', motif: 'cards' },
      { file: 'edu-b41-04-linear.jpg', kind: 'int', title: 'Usa *linear*', body: 'Value thin + defensa. Si estás linear, *no finjas* polarización.', motif: 'warn' },
      {
        file: 'edu-b41-05-cta.jpg',
        kind: 'cta',
        line1: 'ESTUDIA',
        line2: 'RANGOS',
        line3: 'EN ESCUELA',
        bullets: [
          { ico: '◎', a: 'POLAR =', b: 'EXTREMOS' },
          { ico: '◈', a: 'LINEAR =', b: 'INCLUYE MEDIAS' },
          { ico: '♛', a: 'ELIGE UNA', b: 'FORMA Y CÚMBRELA' }
        ]
      }
    ]
  },
  {
    id: 'b42',
    slides: [
      { file: 'edu-b42-01-cover.jpg', kind: 'cover', title: 'Protection\nbet', sub1: 'negar', sub2: 'equity' },
      { file: 'edu-b42-02-que.jpg', kind: 'int', title: 'Qué es *proteger*', body: 'Apuestas para que draws/peores *paguen o tiren*. No es solo value o bluff.', motif: 'glow' },
      { file: 'edu-b42-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Mano buena vs *muchas outs* del rival. Quieres price malo o fold.', motif: 'cards' },
      { file: 'edu-b42-04-error.jpg', kind: 'int', title: 'Error *típico*', body: '“Protejo” con size que *todo call*. Si no niegas equity, no proteges.', motif: 'warn' },
      {
        file: 'edu-b42-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'VALUE +',
        line3: 'PROTECTION',
        bullets: [
          { ico: '◎', a: 'NIEGA OUTS', b: 'CON EL SIZE' },
          { ico: '◈', a: 'NO SOLO', b: 'VALUE O BLUFF' },
          { ico: '♛', a: 'SIZE TINY', b: '= NO PROTEGE' }
        ]
      }
    ]
  },
  {
    id: 'b43',
    slides: [
      { file: 'edu-b43-01-cover.jpg', kind: 'cover', title: 'Triple\nbarrel', sub1: 'tercera bala', sub2: 'en river' },
      { file: 'edu-b43-02-que.jpg', kind: 'int', title: 'Qué es *triple*', body: 'Bet flop + turn + river. La tercera bala necesita *historia coherente*.', motif: 'glow' },
      { file: 'edu-b43-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'River que favorece tu *rango* o blocker fuerte. Sigue la narrativa.', motif: 'cards' },
      { file: 'edu-b43-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Tercera bala “porque ya invertí”. *Sunk cost* no es estrategia.', motif: 'warn' },
      {
        file: 'edu-b43-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'LÍNEAS',
        line3: 'DE 3 CALLES',
        bullets: [
          { ico: '◎', a: 'HISTORIA', b: 'COHERENTE' },
          { ico: '◈', a: 'BLOCKER +', b: 'RANGE ADV' },
          { ico: '♛', a: 'SIN HISTORIA', b: '→ CHECK/FOLD' }
        ]
      }
    ]
  },
  {
    id: 'b44',
    slides: [
      { file: 'edu-b44-01-cover.jpg', kind: 'cover', title: 'Capped vs\nuncapped', sub1: 'qué tiene', sub2: 'tu rango' },
      { file: 'edu-b44-02-que.jpg', kind: 'int', title: 'Qué es estar *capped*', body: '*Capped* = sin nuts/fuertes. *Uncapped* = sí las incluye. Cambia el sizing.', motif: 'glow' },
      { file: 'edu-b44-03-cuando.jpg', kind: 'int', title: 'Si estás *capped*', body: 'Menos polar, más *check* y thin value. No finjas nuts que no tienes.', motif: 'cards' },
      { file: 'edu-b44-04-error.jpg', kind: 'int', title: 'Error *típico*', body: '*Overbet* con rango capped. El rival te lee y te castiga.', motif: 'warn' },
      {
        file: 'edu-b44-05-cta.jpg',
        kind: 'cta',
        line1: 'LEE',
        line2: 'CAPS',
        line3: 'EN ESCUELA',
        bullets: [
          { ico: '◎', a: 'SIN NUTS', b: '→ NO POLARICES' },
          { ico: '◈', a: 'UNCAPPED', b: '= PRESIÓN OK' },
          { ico: '♛', a: 'OVERBET', b: 'SOLO CON SENTIDO' }
        ]
      }
    ]
  },
  {
    id: 'b45',
    slides: [
      { file: 'edu-b45-01-cover.jpg', kind: 'cover', title: 'GTO vs\nexplotativo', sub1: 'baseline +', sub2: 'ajuste' },
      { file: 'edu-b45-02-que.jpg', kind: 'int', title: 'Dos *modos*', body: '*GTO* = indesviable. *Explotativo* = castigas leaks claros del rival.', motif: 'glow' },
      { file: 'edu-b45-03-cuando.jpg', kind: 'int', title: 'Cuándo *desviar*', body: 'Vs station: más *value*, menos bluff. Vs nit: más bluff, menos thin.', motif: 'cards' },
      { file: 'edu-b45-04-error.jpg', kind: 'int', title: 'Error *típico*', body: '“Explotar” sin leer. Inventas y *te explotan* a ti.', motif: 'warn' },
      {
        file: 'edu-b45-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'BASELINE',
        line3: '+ AJUSTES',
        bullets: [
          { ico: '◎', a: 'GTO PRIMERO', b: 'VS DESCONOCIDOS' },
          { ico: '◈', a: 'LEAK CLARO', b: '→ DESVÍA' },
          { ico: '♛', a: 'SIN LECTURA', b: 'NO INVENTES' }
        ]
      }
    ]
  },
  {
    id: 'b46',
    slides: [
      { file: 'edu-b46-01-cover.jpg', kind: 'cover', title: 'Backdoor\nequity', sub1: 'draws', sub2: 'ocultos' },
      { file: 'edu-b46-02-que.jpg', kind: 'int', title: 'Qué es *backdoor*', body: 'Necesitas *dos calles* para completar (flush/straight). Equity que no ves de golpe.', motif: 'glow' },
      { file: 'edu-b46-03-cuando.jpg', kind: 'int', title: 'Cuándo *cuenta*', body: 'Outs + backdoors suman → a veces *call/bet* OK en flop.', motif: 'cards' },
      { file: 'edu-b46-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Pagar river “por backdoor” que *ya murió*. En river no existen.', motif: 'warn' },
      {
        file: 'edu-b46-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'EQUITY',
        line3: 'REAL',
        bullets: [
          { ico: '◎', a: 'BACKDOORS', b: 'SUMAN EN FLOP' },
          { ico: '◈', a: 'EN RIVER', b: 'YA NO EXISTEN' },
          { ico: '♛', a: 'NO PAGUES', b: 'FANTASMAS' }
        ]
      }
    ]
  }
];

function slideHtml(slide, page) {
  if (slide.kind === 'cover') {
    return htmlCover({ title: slide.title, sub1: slide.sub1, sub2: slide.sub2, page });
  }
  if (slide.kind === 'cta') {
    return htmlCta({
      line1: slide.line1,
      line2: slide.line2,
      line3: slide.line3,
      bullets: slide.bullets,
      page
    });
  }
  return htmlInt({ title: slide.title, body: slide.body, page, motif: slide.motif });
}

async function main() {
  fs.mkdirSync(EDU, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let n = 0;

  for (const car of CAROUSELS) {
    const total = car.slides.length;
    for (let i = 0; i < total; i++) {
      const slide = car.slides[i];
      const out = path.join(EDU, slide.file);
      if (!FORCE && fs.existsSync(out)) {
        process.stdout.write(`skip ${slide.file} (exists; use --force)\n`);
        continue;
      }
      const label = `${i + 1}/${total}`;
      const html = slideHtml(slide, label);
      await page.setViewportSize({ width: W, height: H });
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
      n++;
      process.stdout.write(`ok ${slide.file}\n`);
    }
  }

  await browser.close();
  console.log(`\nGenerated ${n} images → ${EDU}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
