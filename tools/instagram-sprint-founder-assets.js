#!/usr/bin/env node
/**
 * Genera JPG del sprint FOUNDER (extras, features F1–F10, FOUNDER).
 * Uso: node tools/instagram-sprint-founder-assets.js
 *
 * B15–B21 viven en estilo premium (texto grande, atmósfera poker) y NO se
 * regeneran aquí por defecto. Para forzar el HTML plano: --force-html-edu
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const EDU = path.join(ROOT, 'marketing/instagram/03-carruseles-edu');
const SPRINT = path.join(ROOT, 'marketing/instagram/07-sprint-founder-oct/assets');
const OUT_CAR = path.join(SPRINT, 'carruseles');
const OUT_FEAT = path.join(SPRINT, 'features');
const OUT_FOUND = path.join(SPRINT, 'founder');

const W_CAR = 720;
const H_CAR = 1080;
const W_REEL = 720;
const H_REEL = 1280;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseCss(w, h) {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
    body {
      font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
      background: #0f1419;
      color: #f0f3f6;
      position: relative;
    }
    .bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 120% 60% at 50% 110%, #1f6b4a55 0%, transparent 55%),
        radial-gradient(ellipse 80% 40% at 80% -10%, #2f81f722 0%, transparent 50%),
        linear-gradient(180deg, #0f1419 0%, #121a22 55%, #0c1014 100%);
    }
    .suits {
      position: absolute; inset: 0; opacity: 0.06;
      background-image:
        radial-gradient(circle at 20% 30%, #f5c451 1.5px, transparent 2px),
        radial-gradient(circle at 70% 60%, #f5c451 1.5px, transparent 2px),
        radial-gradient(circle at 40% 80%, #2f81f7 1.5px, transparent 2px);
      background-size: 48px 48px, 64px 64px, 56px 56px;
    }
    .frame {
      position: absolute; inset: 36px;
      border: 1.5px solid #f5c45155;
      border-radius: 28px;
      background: #1c2530cc;
      display: flex; flex-direction: column; align-items: center;
      padding: 36px 40px 28px;
    }
    .brand {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      margin-bottom: 28px;
    }
    .spade {
      width: 52px; height: 52px; border-radius: 50%;
      border: 2px solid #f5c451;
      display: grid; place-items: center;
      font-size: 26px; color: #f5c451; background: #0f1419;
    }
    .brand-name {
      font-size: 15px; letter-spacing: 0.28em; color: #f5c451; font-weight: 700;
    }
    .brand-tag {
      font-size: 11px; letter-spacing: 0.18em; color: #f5c451aa; text-transform: uppercase;
    }
    .headline {
      font-size: 48px; font-weight: 800; text-align: center; line-height: 1.12;
      margin-top: 12px; max-width: 560px;
    }
    .headline.sm { font-size: 38px; }
    .headline.lg { font-size: 56px; }
    .gold { color: #f5c451; }
    .blue { color: #2f81f7; }
    .muted { color: #9aa7b5; }
    .rule {
      width: 120px; height: 2px; background: #f5c451;
      margin: 22px auto; position: relative;
    }
    .rule::after {
      content: "♠"; position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%); background: #1c2530;
      padding: 0 8px; color: #f5c451; font-size: 14px;
    }
    .body {
      font-size: 22px; line-height: 1.35; text-align: center;
      color: #d5dde6; max-width: 520px; margin-top: 8px;
    }
    .body.goldish { color: #f5c451; font-size: 20px; }
    .pill {
      margin-top: auto; font-size: 14px; letter-spacing: 0.2em;
      color: #f5c451; border: 1px solid #f5c45166; border-radius: 999px;
      padding: 8px 18px;
    }
    .cta-btn {
      margin-top: 28px; background: linear-gradient(180deg, #3a92ff, #2f81f7);
      border: 2px solid #f5c451; border-radius: 16px;
      padding: 16px 28px; font-size: 22px; font-weight: 700; color: #fff;
      box-shadow: 0 8px 24px #2f81f755;
    }
    .cta-outline {
      margin-top: 14px; border: 1.5px solid #f5c45188; border-radius: 14px;
      padding: 12px 22px; font-size: 16px; color: #f5c451;
    }
    .features {
      margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px;
      width: 100%; max-width: 520px;
    }
    .feat {
      font-size: 13px; color: #c5d0db; text-align: left;
      padding-left: 10px; border-left: 2px solid #f5c45166;
    }
    .kicker {
      font-size: 14px; letter-spacing: 0.22em; color: #2f81f7; font-weight: 700;
      text-transform: uppercase; margin-bottom: 10px;
    }
    .badge {
      position: absolute; top: 28px; right: 28px;
      background: #f5c451; color: #0f1419; font-weight: 800;
      font-size: 13px; padding: 6px 12px; border-radius: 8px; letter-spacing: 0.08em;
    }
    .price-row {
      display: flex; gap: 12px; margin-top: 20px; width: 100%; justify-content: center;
    }
    .price-card {
      flex: 1; max-width: 240px; background: #0f1419;
      border: 1px solid #f5c45155; border-radius: 16px; padding: 16px 12px; text-align: center;
    }
    .price-card .label { font-size: 14px; color: #f5c451; letter-spacing: 0.1em; }
    .price-card .old { font-size: 14px; color: #8a96a3; text-decoration: line-through; margin-top: 8px; }
    .price-card .now { font-size: 28px; font-weight: 800; margin-top: 4px; }
    .price-card .unit { font-size: 12px; color: #9aa7b5; }
    .big-num { font-size: 72px; font-weight: 900; color: #f5c451; line-height: 1; }
    .list { text-align: left; width: 100%; max-width: 480px; margin-top: 18px; }
    .list li {
      list-style: none; padding: 12px 0; border-bottom: 1px solid #ffffff12;
      font-size: 20px; display: flex; gap: 12px; align-items: flex-start;
    }
    .list li::before { content: "♠"; color: #f5c451; }
  `;
}

function htmlCarouselCover({ title, subtitle, page, tag }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W_CAR, H_CAR)}
    .frame { justify-content: flex-start; padding-top: 56px; }
    .headline { margin-top: 80px; }
  </style></head><body>
    <div class="bg"></div><div class="suits"></div>
    <div class="frame">
      <div class="brand">
        <div class="spade">♠</div>
        <div class="brand-name">POKERFORGEAI</div>
        <div class="brand-tag">${esc(tag || 'EDUCACIÓN · GTO EN ESPAÑOL')}</div>
      </div>
      <div class="headline lg">${esc(title)}</div>
      <div class="rule"></div>
      <div class="body goldish">${esc(subtitle)}</div>
      <div class="pill">— ${esc(page)} —</div>
    </div>
  </body></html>`;
}

function htmlCarouselInterior({ title, body, page, kicker }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W_CAR, H_CAR)}
    .frame { padding-top: 48px; }
    .headline { font-size: 42px; margin-top: 40px; }
  </style></head><body>
    <div class="bg"></div><div class="suits"></div>
    <div class="frame">
      <div class="spade">♠</div>
      ${kicker ? `<div class="kicker" style="margin-top:18px">${esc(kicker)}</div>` : ''}
      <div class="headline sm">${esc(title)}</div>
      <div class="rule"></div>
      <div class="body">${esc(body)}</div>
      <div class="pill">${esc(page)}</div>
      <div class="brand" style="margin:18px 0 0;opacity:.9">
        <div class="brand-name" style="letter-spacing:.18em;font-size:13px">POKERFORGEAI</div>
      </div>
    </div>
  </body></html>`;
}

function htmlCarouselCta({ title, subtitle, page, bullets }) {
  const feats = (bullets || [
    'Mejora decisión a decisión',
    'Entrena con IA',
    'Acelera tu progreso',
    'GTO práctico en español'
  ]).map((b) => `<div class="feat">${esc(b)}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W_CAR, H_CAR)}
    .badge { top: 48px; right: 48px; }
    .headline { margin-top: 24px; font-size: 40px; }
  </style></head><body>
    <div class="bg"></div><div class="suits"></div>
    <div class="badge">${esc(page)}</div>
    <div class="frame">
      <div class="spade">♠</div>
      <div class="headline sm">${esc(title)}</div>
      <div class="body goldish" style="margin-top:14px">${esc(subtitle)}</div>
      <div class="cta-btn">5 manos gratis</div>
      <div class="cta-outline">link en bio</div>
      <div class="features">${feats}</div>
    </div>
  </body></html>`;
}

function htmlFeature({ hook, sub, kicker, badge }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W_REEL, H_REEL)}
    .frame { inset: 28px; padding: 48px 36px; justify-content: center; }
    .headline { font-size: 44px; }
    .zone {
      width: 100%; height: 320px; margin: 28px 0;
      border: 1.5px dashed #2f81f788; border-radius: 20px;
      background: #0f1419aa;
      display: grid; place-items: center; color: #6b7c8d; font-size: 15px;
      letter-spacing: 0.12em; text-transform: uppercase;
    }
  </style></head><body>
    <div class="bg"></div><div class="suits"></div>
    ${badge ? `<div class="badge">${esc(badge)}</div>` : ''}
    <div class="frame">
      <div class="brand">
        <div class="spade">♠</div>
        <div class="brand-name">POKERFORGEAI</div>
      </div>
      ${kicker ? `<div class="kicker">${esc(kicker)}</div>` : ''}
      <div class="headline">${esc(hook)}</div>
      <div class="rule"></div>
      <div class="body">${esc(sub)}</div>
      <div class="zone">zona vídeo · screen recording</div>
      <div class="cta-btn">link en bio</div>
    </div>
  </body></html>`;
}

function htmlFounder({ title, lines, prices, urgency }) {
  const priceHtml = prices
    ? `<div class="price-row">${prices
        .map(
          (p) => `<div class="price-card">
        <div class="label">${esc(p.label)}</div>
        <div class="old">${esc(p.old)}</div>
        <div class="now">${esc(p.now)}</div>
        <div class="unit">${esc(p.unit || '€/mes')}</div>
      </div>`
        )
        .join('')}</div>`
    : '';
  const list = (lines || [])
    .map((l) => `<li>${esc(l)}</li>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W_REEL, H_REEL)}
    .frame { justify-content: center; }
    .headline { font-size: 42px; }
  </style></head><body>
    <div class="bg"></div><div class="suits"></div>
    <div class="badge">${urgency ? 'PLAZAS' : 'FOUNDER'}</div>
    <div class="frame">
      <div class="brand">
        <div class="spade">♠</div>
        <div class="brand-name">POKERFORGEAI</div>
        <div class="brand-tag">PLAN FOUNDER</div>
      </div>
      <div class="big-num">−40%</div>
      <div class="headline sm" style="margin-top:12px">${esc(title)}</div>
      <div class="rule"></div>
      ${priceHtml}
      ${list ? `<ul class="list">${list}</ul>` : ''}
      <div class="cta-btn">Solicitar plaza</div>
      <div class="cta-outline">link en bio · +18</div>
    </div>
  </body></html>`;
}

/** @type {{id:string, slides:{file:string, kind:string, title:string, body?:string, subtitle?:string, kicker?:string, bullets?:string[]}[]}[]} */
const CAROUSELS = [
  {
    id: 'b15',
    slides: [
      { file: 'edu-b15-01-cover.jpg', kind: 'cover', title: 'SPR', subtitle: 'el número que cambia tu plan' },
      { file: 'edu-b15-02-que.jpg', kind: 'int', title: 'SPR = stack ÷ pot', body: 'Stack efectivo dividido entre el pot. Un número. Todo el plan postflop depende de él.' },
      { file: 'edu-b15-03-alto.jpg', kind: 'int', title: 'SPR alto', body: 'Juego profundo: más faroles, más calles, más implied. No te commits ligero.' },
      { file: 'edu-b15-04-bajo.jpg', kind: 'int', title: 'SPR bajo', body: 'Zona de commit. Value sets limpios. Menos bluff fancy — más claridad.' },
      { file: 'edu-b15-05-cta.jpg', kind: 'cta', title: 'Practica con stacks reales', subtitle: 'Trainer · Torneos IA · Escuela' }
    ]
  },
  {
    id: 'b16',
    slides: [
      { file: 'edu-b16-01-cover.jpg', kind: 'cover', title: 'Odds implícitas', subtitle: 'set mining en 30s' },
      { file: 'edu-b16-02-que.jpg', kind: 'int', title: 'No solo el pot ahora', body: 'Cuentas lo que puedes ganar después si das. Eso son las implícitas.' },
      { file: 'edu-b16-03-cuando.jpg', kind: 'int', title: 'Cuándo sí', body: 'Deep + rival que paga → set mining tiene sentido. Quieres stack detrás.' },
      { file: 'edu-b16-04-error.jpg', kind: 'int', title: 'Error típico', body: 'Set mining a 20bb vs nit. No hay implícitas. Estás quemando fichas.' },
      { file: 'edu-b16-05-cta.jpg', kind: 'cta', title: 'Entrena el spot', subtitle: 'PokerForgeAI · link en bio' }
    ]
  },
  {
    id: 'b17',
    slides: [
      { file: 'edu-b17-01-cover.jpg', kind: 'cover', title: 'Barrel en turn', subtitle: '¿segunda bala?' },
      { file: 'edu-b17-02-cuando.jpg', kind: 'int', title: 'Cuándo sí', body: 'El turn mejora tu rango o tu fold equity. El bluff sigue teniendo historia.' },
      { file: 'edu-b17-03-no.jpg', kind: 'int', title: 'Cuándo no', body: 'Turn que mata tu equity, o rival calling station. Frena. Checkea.' },
      { file: 'edu-b17-04-regla.jpg', kind: 'int', title: 'Regla fácil', body: 'Pregunta: ¿sigue teniendo sentido el bluff? Si dudas → no es barrel automático.' },
      { file: 'edu-b17-05-cta.jpg', kind: 'cta', title: 'Drill c-bet + barrel', subtitle: 'Entrenador · Escuela de Póker' }
    ]
  },
  {
    id: 'b18',
    slides: [
      { file: 'edu-b18-01-cover.jpg', kind: 'cover', title: 'Overbet', subtitle: 'cuándo duele de verdad' },
      { file: 'edu-b18-02-que.jpg', kind: 'int', title: '>100% del pot', body: 'Polariza fuerte: nuts o aire. No es sizing “medio”.' },
      { file: 'edu-b18-03-si.jpg', kind: 'int', title: 'Cuándo sí', body: 'Value nutty o bluff con blocker en rivers polarizados.' },
      { file: 'edu-b18-04-no.jpg', kind: 'int', title: 'Cuándo no', body: 'Vs calling stations o multiway. Ahí el overbet es suicide.' },
      { file: 'edu-b18-05-cta.jpg', kind: 'cta', title: 'Practica sizing', subtitle: 'Trainer GTO · link en bio' }
    ]
  },
  {
    id: 'b19',
    slides: [
      { file: 'edu-b19-01-cover.jpg', kind: 'cover', title: 'Multiway', subtitle: 'se estrecha todo' },
      { file: 'edu-b19-02-por-que.jpg', kind: 'int', title: 'Más rivales', body: 'Menos bluffs limpios. Alguien siempre llega. Tu rango se estrecha.' },
      { file: 'edu-b19-03-value.jpg', kind: 'int', title: 'Value up', body: 'Value más fuerte. Thin value down. Protege y cobra lo bueno.' },
      { file: 'edu-b19-04-error.jpg', kind: 'int', title: 'Error típico', body: 'C-bet automático multiway. Fuga clásica en NL25.' },
      { file: 'edu-b19-05-cta.jpg', kind: 'cta', title: 'Entrena pots multiway', subtitle: 'Spots reales en PokerForgeAI' }
    ]
  },
  {
    id: 'b20',
    slides: [
      { file: 'edu-b20-01-cover.jpg', kind: 'cover', title: 'Blockers', subtitle: 'por qué A♠ importa' },
      { file: 'edu-b20-02-que.jpg', kind: 'int', title: 'Qué es un blocker', body: 'Cartas en tu mano que quitas del rango del rival. Menos combos de nuts.' },
      { file: 'edu-b20-03-bluff.jpg', kind: 'int', title: 'Bluff con blocker', body: 'En rivers polarizados, blocker de nuts ayuda a que el farol respire.' },
      { file: 'edu-b20-04-cuidado.jpg', kind: 'int', title: 'No es magia', body: 'Sigue necesitando fold equity. Blocker ≠ licencia para shove cualquier cosa.' },
      { file: 'edu-b20-05-cta.jpg', kind: 'cta', title: 'Estudia en Escuela', subtitle: 'Conceptos + drills · link en bio' }
    ]
  },
  {
    id: 'b21',
    slides: [
      {
        file: 'edu-b21-01-cover.jpg',
        kind: 'cover',
        title: 'Torneo entero',
        subtitle: '≠ un drill suelto',
        tag: 'TORNEOS IA · COACH AL LADO'
      },
      {
        file: 'edu-b21-02-blinds.jpg',
        kind: 'int',
        title: 'Blinds suben',
        body: 'Stack pressure real. Lo que era call en early es shove en late.',
        kicker: 'TORNEOS IA'
      },
      {
        file: 'edu-b21-03-icm.jpg',
        kind: 'int',
        title: 'ICM y burbuja',
        body: 'El premio manda. Las fichas no valen lo mismo cerca del dinero.',
        kicker: 'TORNEOS IA'
      },
      {
        file: 'edu-b21-04-coach.jpg',
        kind: 'int',
        title: 'Coach al lado',
        body: 'Cada mano puntuada: Óptima / Imprecisa / Error. Paso a paso de la que te eliminó.',
        kicker: 'MANO A MANO'
      },
      {
        file: 'edu-b21-05-cta.jpg',
        kind: 'cta',
        title: 'Abre Torneos IA',
        subtitle: 'Spin · SNG · MTT · link en bio',
        bullets: [
          'Evento completo',
          'Corrección mano a mano',
          'Fugas al final',
          'ForgeCoach en resultado'
        ]
      }
    ]
  }
];

const EXTRA_CAROUSELS = [
  {
    prefix: 'honestidad',
    slides: [
      { file: 'honestidad-01-cover.jpg', kind: 'cover', title: 'No es PioSolver', subtitle: 'y está bien' },
      { file: 'honestidad-02.jpg', kind: 'int', title: 'Qué sí es', body: 'Estudio práctico en español: trainer, imports, Torneos IA, ForgeCoach.' },
      { file: 'honestidad-03.jpg', kind: 'int', title: 'Para quién', body: 'NL2–NL100 que quieren mejorar sin pagar un solver de 40€+.' },
      { file: 'honestidad-04.jpg', kind: 'int', title: 'Precio Study', body: 'Desde ~15€/mes. FOUNDER: −40% para siempre (plazas limitadas).' },
      { file: 'honestidad-05-cta.jpg', kind: 'cta', title: 'Prueba 5 manos', subtitle: 'Sin cuenta · link en bio' }
    ]
  },
  {
    prefix: 'rutina',
    slides: [
      { file: 'rutina-01-cover.jpg', kind: 'cover', title: '15 min/día', subtitle: 'la rutina que sí se cumple' },
      { file: 'rutina-02.jpg', kind: 'int', title: '5 manos', body: 'Calentamiento. Sin cuenta si quieres. Solo decidir.' },
      { file: 'rutina-03.jpg', kind: 'int', title: '1 lección o 1 Spin', body: 'Escuela (no gasta cupo) o Spin Fácil en Torneos IA.' },
      { file: 'rutina-04.jpg', kind: 'int', title: '3 errores', body: 'Banco de fugas: repite lo que más EV te quemó.' },
      { file: 'rutina-05-cta.jpg', kind: 'cta', title: 'Constancia > perfección', subtitle: 'Empieza hoy · link en bio' }
    ]
  },
  {
    prefix: 'planes',
    slides: [
      { file: 'planes-01-cover.jpg', kind: 'cover', title: 'Planes', subtitle: 'Gratis · Study · Coach · FOUNDER', tag: 'FOUNDER · 1 DE OCTUBRE' },
      { file: 'planes-02.jpg', kind: 'int', title: 'Gratis', body: '15 manos/día · 1 import/mes · Spin Fácil. Empieza sin tarjeta.' },
      { file: 'planes-03.jpg', kind: 'int', title: 'Study', body: 'Ilimitado entrenar e importar. Ideal si el cupo se queda corto.' },
      { file: 'planes-04.jpg', kind: 'int', title: 'Coach', body: 'Torneos Pro (MTT 108, Spin, SNG) + más ForgeCoach.' },
      {
        file: 'planes-05-cta.jpg',
        kind: 'cta',
        title: 'FOUNDER −40%',
        subtitle: 'Para siempre · plazas limitadas · 1 oct',
        bullets: ['Study 8,99€/mes', 'Coach 20,99€/mes', 'Precio locked', 'Solicita plaza']
      }
    ]
  }
];

const FEATURES = [
  { file: 'feature-f1-reto-5manos.jpg', hook: '¿5/5 sin Error GTO?', sub: 'Cinco manos. Sin cuenta. Te puntúan al momento.', kicker: 'RETO', badge: 'F1' },
  { file: 'feature-f2-entrenador.jpg', hook: 'Óptima / Imprecisa / Error', sub: 'Feedback GTO decisión a decisión en el entrenador.', kicker: 'ENTRENADOR', badge: 'F2' },
  { file: 'feature-f3-import.jpg', hook: 'Sube el .txt. Ve la fuga.', sub: 'Winamax · PokerStars · GG · 888 · CoinPoker.', kicker: 'IMPORT', badge: 'F3' },
  { file: 'feature-f4-errores.jpg', hook: 'Tus 3 peores spots. Otra vez.', sub: 'El banco prioriza EV perdido, no manos al azar.', kicker: 'FUGAS', badge: 'F4' },
  { file: 'feature-f5-forgecoach.jpg', hook: 'Pregunta. Informe en español.', sub: 'ForgeCoach cierra el loop tras sesión o torneo.', kicker: 'FORGECOACH', badge: 'F5' },
  { file: 'feature-f6-escuela.jpg', hook: 'Lecciones que no gastan cupo', sub: 'Rutas Cash · Spins · Torneos en Escuela de Póker.', kicker: 'ESCUELA', badge: 'F6' },
  { file: 'feature-f7-rangos.jpg', hook: 'RFI visual en 10s', sub: 'Matrices 13×13 · rojo raise · verde call · gris fold.', kicker: 'RANGOS', badge: 'F7' },
  { file: 'feature-f8-stats.jpg', hook: 'Preflop alto + flop bajo = fuga', sub: 'Acierto por calle. Tú eliges el drill.', kicker: 'STATS', badge: 'F8' },
  {
    file: 'feature-f9-torneos-ia.jpg',
    hook: 'Torneo entero. Coach al lado. Mano a mano.',
    sub: 'Spin · SNG · MTT completo con corrección en cada decisión.',
    kicker: 'TORNEOS IA',
    badge: 'BOMBO'
  },
  {
    file: 'feature-f10-reto-ia-pro.jpg',
    hook: '¿Podrás batir a nuestra IA Pro?',
    sub: 'Pro · MTT 108 · ~80% rivales pro. Comenta tu finish.',
    kicker: 'RETO IA PRO',
    badge: 'BOMBO'
  }
];

const FOUNDERS = [
  {
    file: 'founder-teaser-1oct.jpg',
    title: '1 de octubre',
    lines: ['−40% para siempre', 'Plazas limitadas', 'Coach = Torneos Pro'],
    prices: [
      { label: 'STUDY', old: '14,99€', now: '8,99€' },
      { label: 'COACH', old: '34,99€', now: '20,99€' }
    ]
  },
  {
    file: 'founder-launch-1oct.jpg',
    title: 'FOUNDER ya está aquí',
    lines: ['Precio locked mientras no canceles', 'Solicita plaza Study o Coach', 'Torneos Pro en FOUNDER Coach'],
    prices: [
      { label: 'STUDY', old: '14,99€', now: '8,99€' },
      { label: 'COACH', old: '34,99€', now: '20,99€' }
    ]
  },
  {
    file: 'founder-precios.jpg',
    title: 'Precios FOUNDER',
    lines: ['Anual Study 5,95€/mes', 'Anual Coach 13,95€/mes'],
    prices: [
      { label: 'STUDY', old: '14,99€', now: '8,99€' },
      { label: 'COACH', old: '34,99€', now: '20,99€' }
    ]
  },
  {
    file: 'founder-urgencia.jpg',
    title: 'Plazas limitadas',
    urgency: true,
    lines: ['Torneos IA + Reto Pro + FOUNDER', '¿Study o Coach? Comenta', 'Link en bio'],
    prices: [
      { label: 'STUDY', old: '14,99€', now: '8,99€' },
      { label: 'COACH', old: '34,99€', now: '20,99€' }
    ]
  }
];

function slideHtml(slide, pageLabel) {
  if (slide.kind === 'cover') {
    return htmlCarouselCover({
      title: slide.title,
      subtitle: slide.subtitle,
      page: pageLabel,
      tag: slide.tag
    });
  }
  if (slide.kind === 'cta') {
    return htmlCarouselCta({
      title: slide.title,
      subtitle: slide.subtitle,
      page: pageLabel,
      bullets: slide.bullets
    });
  }
  return htmlCarouselInterior({
    title: slide.title,
    body: slide.body,
    page: pageLabel,
    kicker: slide.kicker
  });
}

async function shot(page, html, width, height, outPath) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outPath, type: 'jpeg', quality: 88 });
}

async function main() {
  for (const d of [EDU, OUT_CAR, OUT_FEAT, OUT_FOUND]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let n = 0;

  const forceHtmlEdu = process.argv.includes('--force-html-edu');
  if (forceHtmlEdu) {
    for (const car of CAROUSELS) {
      const total = car.slides.length;
      for (let i = 0; i < total; i++) {
        const slide = car.slides[i];
        const label = `${i + 1}/${total}`;
        const html = slideHtml(slide, label);
        const eduPath = path.join(EDU, slide.file);
        const copyPath = path.join(OUT_CAR, slide.file);
        await shot(page, html, W_CAR, H_CAR, eduPath);
        fs.copyFileSync(eduPath, copyPath);
        n++;
        process.stdout.write(`ok ${slide.file}\n`);
      }
    }
  } else {
    process.stdout.write('skip B15–B21 (premium assets; use --force-html-edu to overwrite)\n');
  }

  for (const car of EXTRA_CAROUSELS) {
    const total = car.slides.length;
    for (let i = 0; i < total; i++) {
      const slide = car.slides[i];
      const label = `${i + 1}/${total}`;
      const html = slideHtml(slide, label);
      const out = path.join(OUT_CAR, slide.file);
      await shot(page, html, W_CAR, H_CAR, out);
      n++;
      process.stdout.write(`ok ${slide.file}\n`);
    }
  }

  for (const f of FEATURES) {
    const html = htmlFeature(f);
    const out = path.join(OUT_FEAT, f.file);
    await shot(page, html, W_REEL, H_REEL, out);
    n++;
    process.stdout.write(`ok ${f.file}\n`);
  }

  for (const f of FOUNDERS) {
    const html = htmlFounder(f);
    const out = path.join(OUT_FOUND, f.file);
    await shot(page, html, W_REEL, H_REEL, out);
    n++;
    process.stdout.write(`ok ${f.file}\n`);
  }

  await browser.close();
  console.log(`\nGenerated ${n} images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
