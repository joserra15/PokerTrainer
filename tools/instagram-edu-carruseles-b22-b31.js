#!/usr/bin/env node
/**
 * Fallback HTML para carruseles B22–B31 (letras grandes).
 * Los JPG canónicos en 03-carruseles-edu/ son assets premium (IA).
 * Uso:
 *   node tools/instagram-edu-carruseles-b22-b31.js           # solo si falta el JPG
 *   node tools/instagram-edu-carruseles-b22-b31.js --force  # sobrescribe
 *
 * Copy canónico: marketing/instagram/03-carruseles-edu/CARRUSELES_B22_B31.md
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
    id: 'b22',
    slides: [
      { file: 'edu-b22-01-cover.jpg', kind: 'cover', title: 'Range\nadvantage', sub1: 'quién manda', sub2: 'el board' },
      { file: 'edu-b22-02-que.jpg', kind: 'int', title: 'Qué es *range adv*', body: 'Tu rango *conecta mejor* con el board que el del rival. Tú puedes apostar; él defiende peor.', motif: 'glow' },
      { file: 'edu-b22-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Boards que favorecen al *agresor preflop*: A-high secos, altos no conectados.', motif: 'cards' },
      { file: 'edu-b22-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'C-bet automático en board que *favorece al caller*. Ahí pierdes la ventaja.', motif: 'warn' },
      {
        file: 'edu-b22-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'RANGE',
        line3: 'ADVANTAGE',
        bullets: [
          { ico: '◎', a: 'LEE EL BOARD', b: 'ANTES DE APOSTAR' },
          { ico: '◈', a: 'SABE QUIÉN', b: 'MANDA EL RANGO' },
          { ico: '♛', a: 'DEJA EL C-BET', b: 'AUTOMÁTICO' }
        ]
      }
    ]
  },
  {
    id: 'b23',
    slides: [
      { file: 'edu-b23-01-cover.jpg', kind: 'cover', title: 'Nut\nadvantage', sub1: 'quién tiene', sub2: 'los nuts' },
      { file: 'edu-b23-02-que.jpg', kind: 'int', title: 'Qué es *nut adv*', body: 'Tienes *más combos* de la mejor mano posible. Eso justifica sizings agresivos.', motif: 'glow' },
      { file: 'edu-b23-03-sizing.jpg', kind: 'int', title: 'Con nut adv', body: 'Overbets y líneas *polares* tienen sentido. Cobras nuts y faroleas con blockers.', motif: 'cards' },
      { file: 'edu-b23-04-cuidado.jpg', kind: 'int', title: 'Sin *nuts*', body: 'Si tu rango está *capped*, no polarices. Thin value y checks > teatro.', motif: 'warn' },
      {
        file: 'edu-b23-05-cta.jpg',
        kind: 'cta',
        line1: 'ESTUDIA',
        line2: 'NUT ADV',
        line3: 'EN ESCUELA',
        bullets: [
          { ico: '◎', a: 'NUT VS RANGE', b: 'ADVANTAGE' },
          { ico: '◈', a: 'SIZING SEGÚN', b: 'TUS NUTS' },
          { ico: '♛', a: 'MENOS SPEW', b: 'MÁS CLARIDAD' }
        ]
      }
    ]
  },
  {
    id: 'b24',
    slides: [
      { file: 'edu-b24-01-cover.jpg', kind: 'cover', title: 'Probe bet', sub1: 'cuando el agresor', sub2: 'checkea' },
      { file: 'edu-b24-02-que.jpg', kind: 'int', title: 'Qué es un *probe*', body: 'Apuestas *turn* tras check del PFR en flop. Tomas la iniciativa que él soltó.', motif: 'glow' },
      { file: 'edu-b24-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Turn que *mejora tu rango* o niega el suyo. El check del rival huele a debilidad.', motif: 'cards' },
      { file: 'edu-b24-04-no.jpg', kind: 'int', title: 'Cuándo *no*', body: 'Vs players que *check-raisean* todo. Ahí el probe es donación.', motif: 'warn' },
      {
        file: 'edu-b24-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'PROBE',
        line3: 'EN TRAINER',
        bullets: [
          { ico: '◎', a: 'LEE EL CHECK', b: 'DEL AGRESOR' },
          { ico: '◈', a: 'TURN QUE TE', b: 'FAVORECE' },
          { ico: '♛', a: 'NO PROBES VS', b: 'CHECK-RAISE MANIACS' }
        ]
      }
    ]
  },
  {
    id: 'b25',
    slides: [
      { file: 'edu-b25-01-cover.jpg', kind: 'cover', title: 'Donk bet', sub1: 'OOP lidera', sub2: 'el bote' },
      { file: 'edu-b25-02-que.jpg', kind: 'int', title: 'Qué es un *donk*', body: 'Apostar *OOP* antes que el agresor preflop. Tomas el lead desde fuera de posición.', motif: 'glow' },
      { file: 'edu-b25-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Boards con *fuerte* nut/range advantage para ti. Selectivo, no automático.', motif: 'cards' },
      { file: 'edu-b25-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Donk “por miedo” con *aire*. Leak clásico. Checkea y defiende mejor.', motif: 'warn' },
      {
        file: 'edu-b25-05-cta.jpg',
        kind: 'cta',
        line1: 'PRACTICA',
        line2: 'DONK',
        line3: 'SELECTIVO',
        bullets: [
          { ico: '◎', a: 'SOLO CON', b: 'VENTAJA DE RANGO' },
          { ico: '◈', a: 'NUNCA POR', b: 'MIEDO CON AIRE' },
          { ico: '♛', a: 'OOP CON', b: 'PLAN CLARO' }
        ]
      }
    ]
  },
  {
    id: 'b26',
    slides: [
      { file: 'edu-b26-01-cover.jpg', kind: 'cover', title: 'Thin value', sub1: 'cobrar manos', sub2: 'medias' },
      { file: 'edu-b26-02-que.jpg', kind: 'int', title: 'Qué es *thin value*', body: 'Value con manos que *solo pagan peores*. No necesitas nuts para cobrar.', motif: 'glow' },
      { file: 'edu-b26-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Vs *calling stations* o rangos capped. Si peores llaman → aprieta.', motif: 'cards' },
      { file: 'edu-b26-04-no.jpg', kind: 'int', title: 'Cuándo *no*', body: 'Vs *nits* o boards scary que le dan nuts. Ahí el thin se vuelve bluff-catcher suyo.', motif: 'warn' },
      {
        file: 'edu-b26-05-cta.jpg',
        kind: 'cta',
        line1: 'COBRA',
        line2: 'THIN',
        line3: 'VALUE',
        bullets: [
          { ico: '◎', a: 'NO SOLO', b: 'NUTS COBRAN' },
          { ico: '◈', a: 'LEE SI PAGAN', b: 'PEORES' },
          { ico: '♛', a: 'CHECK VS NIT', b: 'O BOARD SCARY' }
        ]
      }
    ]
  },
  {
    id: 'b27',
    slides: [
      { file: 'edu-b27-01-cover.jpg', kind: 'cover', title: 'MDF', sub1: 'cuánto debes', sub2: 'defender' },
      { file: 'edu-b27-02-que.jpg', kind: 'int', title: 'Qué es *MDF*', body: '*Minimum Defense Frequency*: cuánto debes continuar vs el size del rival para no ser explotado.', motif: 'glow' },
      { file: 'edu-b27-03-formula.jpg', kind: 'int', title: 'Fórmula *rápida*', body: 'MDF ≈ 1 − (bet ÷ (pot+bet)). Size 50% → defiende ~*67%*.', motif: 'cards' },
      { file: 'edu-b27-04-cuidado.jpg', kind: 'int', title: 'Es *guía*', body: 'Vs maniac o con *ICM*, ajústalo. No es ley religiosa.', motif: 'warn' },
      {
        file: 'edu-b27-05-cta.jpg',
        kind: 'cta',
        line1: 'APRENDE',
        line2: 'MDF',
        line3: 'EN ESCUELA',
        bullets: [
          { ico: '◎', a: 'NO FOLDEES', b: 'DE MÁS VS SIZE' },
          { ico: '◈', a: 'CALCULA EN', b: '20 SEGUNDOS' },
          { ico: '♛', a: 'AJUSTA VS', b: 'TIPOS DE RIVAL' }
        ]
      }
    ]
  },
  {
    id: 'b28',
    slides: [
      { file: 'edu-b28-01-cover.jpg', kind: 'cover', title: 'Equity\nrealization', sub1: 'equity ≠', sub2: 'dinero' },
      { file: 'edu-b28-02-que.jpg', kind: 'int', title: 'Qué es *realizar*', body: 'Cuánto de tu equity *cobras de verdad* tras presión, bets y posición.', motif: 'glow' },
      { file: 'edu-b28-03-ip.jpg', kind: 'int', title: 'IP vs *OOP*', body: '*IP realiza más*. OOP realiza menos: te empujan a folds con equity viva.', motif: 'cards' },
      { file: 'edu-b28-04-error.jpg', kind: 'int', title: 'Error *típico*', body: 'Llamar OOP “porque tengo *35%*”. Sin realización, ese 35% no llega al showdown.', motif: 'warn' },
      {
        file: 'edu-b28-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: 'EQUITY',
        line3: 'REAL',
        bullets: [
          { ico: '◎', a: 'EQUITY ≠', b: 'DINERO EN EL BOTE' },
          { ico: '◈', a: 'IP REALIZA', b: 'MEJOR QUE OOP' },
          { ico: '♛', a: 'PIDE MÁS EQUITY', b: 'PARA PAGAR OOP' }
        ]
      }
    ]
  },
  {
    id: 'b29',
    slides: [
      { file: 'edu-b29-01-cover.jpg', kind: 'cover', title: 'Float', sub1: 'call para robar', sub2: 'después' },
      { file: 'edu-b29-02-que.jpg', kind: 'int', title: 'Qué es un *float*', body: 'Call flop *IP* con plan: si checkea turn, tomas el bote. No es call por equity sola.', motif: 'glow' },
      { file: 'edu-b29-03-cuando.jpg', kind: 'int', title: 'Cuándo *sí*', body: 'Vs *c-bet auto* + board que puedes representar. El rival se rinde en turn.', motif: 'cards' },
      { file: 'edu-b29-04-no.jpg', kind: 'int', title: 'Cuándo *no*', body: 'Vs *barrels fuertes* o rango polar. Ahí flotar aire es spew.', motif: 'warn' },
      {
        file: 'edu-b29-05-cta.jpg',
        kind: 'cta',
        line1: 'DRILL',
        line2: 'FLOAT',
        line3: 'EN TRAINER',
        bullets: [
          { ico: '◎', a: 'CALL CON', b: 'PLAN DE TURN' },
          { ico: '◈', a: 'VS C-BET', b: 'AUTOMÁTICO' },
          { ico: '♛', a: 'NO FLOTES VS', b: 'BARREL POLAR' }
        ]
      }
    ]
  },
  {
    id: 'b30',
    slides: [
      { file: 'edu-b30-01-cover.jpg', kind: 'cover', title: '4-bet', sub1: 'value + bluffs', sub2: 'con blocker' },
      { file: 'edu-b30-02-que.jpg', kind: 'int', title: 'Tras un *3-bet*', body: '4-bet = *value premium* o farol con blocker. Sin esa separación, spew.', motif: 'glow' },
      { file: 'edu-b30-03-value.jpg', kind: 'int', title: 'Cara *value*', body: '*KK+/AK* (ajusta vs rival). Quieres stack o bote enorme.', motif: 'cards' },
      { file: 'edu-b30-04-bluff.jpg', kind: 'int', title: 'Cara *bluff*', body: '*Axs* y blockers que quitan AA/KK. Farol que bloquea su continue fuerte.', motif: 'glow' },
      {
        file: 'edu-b30-05-cta.jpg',
        kind: 'cta',
        line1: 'ENTRENA',
        line2: '4-BET',
        line3: 'POLAR',
        bullets: [
          { ico: '◎', a: 'VALUE Y BLUFF', b: 'SEPARADOS' },
          { ico: '◈', a: 'BLOCKERS EN', b: 'TUS FAROLES' },
          { ico: '♛', a: 'MENOS SPEW', b: 'EN 4-BET' }
        ]
      }
    ]
  },
  {
    id: 'b31',
    slides: [
      { file: 'edu-b31-01-cover.jpg', kind: 'cover', title: 'Steal', sub1: 'robar ciegas', sub2: 'desde late' },
      { file: 'edu-b31-02-que.jpg', kind: 'int', title: 'Qué es un *steal*', body: 'Open *late* (CO/BTN/SB) vs blinds que foldean de más. Robas el dead money.', motif: 'glow' },
      { file: 'edu-b31-03-resteal.jpg', kind: 'int', title: '*Resteal*', body: '3-bet desde ciegas vs steal flojo. Castigas opens too wide.', motif: 'cards' },
      { file: 'edu-b31-04-ajuste.jpg', kind: 'int', title: 'Ajusta o *muere*', body: 'Si te defienden o 3-betean → *estrecha* el steal. No es open automático.', motif: 'warn' },
      {
        file: 'edu-b31-05-cta.jpg',
        kind: 'cta',
        line1: 'PRACTICA',
        line2: 'STEAL',
        line3: 'EN SPINS',
        bullets: [
          { ico: '◎', a: 'LATE VS', b: 'BLINDS FOLD-HEAVY' },
          { ico: '◈', a: 'RESTEAL CUANDO', b: 'EL OPEN ES FLOJO' },
          { ico: '♛', a: 'ADAPTA SI TE', b: 'EMPIEZAN A CASTIGAR' }
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
