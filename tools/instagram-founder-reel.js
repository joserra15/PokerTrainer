#!/usr/bin/env node
/**
 * Genera reel Instagram 9:16 (FOUNDER −40%) con:
 *  - fotos reales Unsplash/Pexels (stock/)
 *  - stills de producto (product/)
 *  - overlays tipográficos marca PokerForgeAI
 *  - Ken Burns + transiciones vía ffmpeg
 *
 * Uso: node tools/instagram-founder-reel.js
 * Salida: marketing/instagram/07-sprint-founder-oct/assets/reels/founder-reel.mp4
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const REELS = path.join(ROOT, 'marketing/instagram/07-sprint-founder-oct/assets/reels');
const STOCK = path.join(REELS, 'stock');
const PRODUCT = path.join(REELS, 'product');
const FRAMES = path.join(REELS, 'frames');
const SCENES = path.join(REELS, 'scenes');
const W = 1080;
const H = 1920;
const FPS = 30;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').slice(-2000);
    throw new Error(`${cmd} ${args[0]} failed (${r.status}): ${err}`);
  }
  return r;
}

function ensureDirs() {
  for (const d of [REELS, STOCK, PRODUCT, FRAMES, SCENES]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function coverToReel(src, dest) {
  run('ffmpeg', [
    '-y', '-i', src,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`,
    '-q:v', '2', dest,
  ]);
}

/** Overlay HTML → PNG transparente 1080×1920 */
function overlayHtml({ kicker, title, lines = [], badge, cta, variant = 'default' }) {
  const lineHtml = lines.map((l) => `<div class="line">${esc(l)}</div>`).join('');
  const badgeHtml = badge ? `<div class="badge">${esc(badge)}</div>` : '';
  const ctaHtml = cta ? `<div class="cta">${esc(cta)}</div>` : '';
  const kickerHtml = kicker ? `<div class="kicker">${esc(kicker)}</div>` : '';
  const dark = variant === 'offer' || variant === 'end';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
    body{
      font-family:"Noto Sans Display","Liberation Sans",Arial,sans-serif;
      color:#f0f3f6;position:relative;
    }
    .veil{
      position:absolute;inset:0;
      background:${dark
        ? 'linear-gradient(180deg,#0f1419ee 0%,#0f1419cc 35%,#0f141999 55%,#0f1419ee 100%)'
        : 'linear-gradient(180deg,#0f1419aa 0%,#0f141955 28%,transparent 48%,#0f141966 72%,#0f1419dd 100%)'};
    }
    .safe{
      position:absolute;inset:0;
      padding:110px 64px 140px;
      display:flex;flex-direction:column;justify-content:flex-end;
      align-items:center;text-align:center;
    }
    .safe.top{justify-content:flex-start;padding-top:160px}
    .brand{
      position:absolute;top:72px;left:0;right:0;
      display:flex;flex-direction:column;align-items:center;gap:6px;
    }
    .spade{
      width:56px;height:56px;border-radius:50%;
      border:2px solid #f5c451;display:grid;place-items:center;
      font-size:28px;color:#f5c451;background:#0f1419cc;
    }
    .brand-name{
      font-size:15px;letter-spacing:0.32em;color:#f5c451;font-weight:700;
    }
    .kicker{
      font-size:22px;letter-spacing:0.28em;text-transform:uppercase;
      color:#2f81f7;font-weight:700;margin-bottom:18px;
    }
    .title{
      font-size:64px;font-weight:900;line-height:1.05;
      max-width:920px;text-shadow:0 4px 24px #000a;
    }
    .title .gold{color:#f5c451}
    .title .blue{color:#2f81f7}
    .title.sm{font-size:48px}
    .title.xl{font-size:78px}
    .line{
      margin-top:14px;font-size:30px;line-height:1.25;color:#d5dde6;
      max-width:880px;text-shadow:0 2px 12px #000a;
    }
    .line.gold{color:#f5c451;font-weight:700;font-size:34px}
    .line.strike{text-decoration:line-through;color:#8a96a3;font-size:24px}
    .badge{
      position:absolute;top:72px;right:48px;
      background:#f5c451;color:#0f1419;font-weight:900;
      font-size:22px;padding:12px 18px;border-radius:12px;
      letter-spacing:0.06em;box-shadow:0 8px 28px #f5c45155;
    }
    .cta{
      margin-top:36px;background:linear-gradient(180deg,#3a92ff,#2f81f7);
      border:2px solid #f5c451;border-radius:18px;
      padding:20px 36px;font-size:28px;font-weight:800;color:#fff;
      box-shadow:0 10px 32px #2f81f788;
    }
    .prices{
      margin-top:28px;display:flex;gap:18px;width:100%;justify-content:center;
    }
    .price{
      flex:1;max-width:380px;background:#0f1419ee;
      border:1.5px solid #f5c45166;border-radius:20px;padding:22px 16px;
    }
    .price .lab{font-size:18px;color:#f5c451;letter-spacing:0.12em;font-weight:700}
    .price .old{font-size:20px;color:#8a96a3;text-decoration:line-through;margin-top:10px}
    .price .now{font-size:44px;font-weight:900;margin-top:4px}
    .price .unit{font-size:16px;color:#9aa7b5}
    .disc{
      margin-top:22px;font-size:56px;font-weight:900;color:#f5c451;
      letter-spacing:0.04em;text-shadow:0 0 40px #f5c45155;
    }
    .legal{
      position:absolute;bottom:48px;left:40px;right:40px;
      font-size:16px;color:#9aa7b5;text-align:center;letter-spacing:0.04em;
    }
  </style></head><body>
    <div class="veil"></div>
    ${badgeHtml}
    <div class="brand"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
    <div class="safe ${variant === 'hook' ? 'top' : ''}">
      ${kickerHtml}
      <div class="title ${variant === 'offer' ? 'xl' : variant === 'feature' ? 'sm' : ''}">${title}</div>
      ${lineHtml}
      ${ctaHtml}
      ${variant === 'offer' ? `
        <div class="disc">−40% PARA SIEMPRE</div>
        <div class="prices">
          <div class="price"><div class="lab">STUDY</div><div class="old">14,99€</div><div class="now">8,99€</div><div class="unit">/mes FOUNDER</div></div>
          <div class="price"><div class="lab">COACH</div><div class="old">34,99€</div><div class="now">20,99€</div><div class="unit">/mes FOUNDER</div></div>
        </div>` : ''}
    </div>
    <div class="legal">+18 · Herramienta educativa · Juega responsablemente</div>
  </body></html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderOverlays(browser) {
  const specs = [
    {
      name: '01-hook',
      html: overlayHtml({
        variant: 'hook',
        kicker: 'Si juegas al póker',
        title: '¿Quieres <span class="gold">dejar de quemar EV</span>?',
        lines: ['Entrena con feedback GTO real.', 'No theory. Decisiones.'],
      }),
    },
    {
      name: '02-brand',
      html: overlayHtml({
        kicker: 'Tu edge empieza aquí',
        title: '<span class="gold">PokerForgeAI</span>',
        lines: ['Entrenador · Coach IA · Escuela · Rangos'],
      }),
    },
    {
      name: '03-gto',
      html: overlayHtml({
        variant: 'feature',
        kicker: 'Punto fuerte',
        title: 'Cada mano, <span class="gold">nota GTO</span>',
        lines: ['Óptima · Imprecisa · Error', 'Ves el EV que estás dejando'],
      }),
    },
    {
      name: '04-coach',
      html: overlayHtml({
        variant: 'feature',
        kicker: 'Punto fuerte',
        title: '<span class="blue">ForgeCoach</span> + Torneos IA',
        lines: ['Pregunta. Informe en español.', 'Torneo entero con coach al lado.'],
      }),
    },
    {
      name: '05-offer',
      html: overlayHtml({
        variant: 'offer',
        badge: 'PLAZAS LIMITADAS',
        kicker: 'Plan FOUNDER',
        title: 'Bloquea el <span class="gold">−40%</span>',
        cta: 'Solicita tu plaza → link en bio',
      }),
    },
    {
      name: '06-cta',
      html: overlayHtml({
        variant: 'end',
        kicker: 'PokerForgeAI',
        title: 'Juegas. <span class="gold">Entrenamos.</span>',
        lines: ['FOUNDER · −40% para siempre', 'Study 8,99€ · Coach 20,99€'],
        cta: 'Solicitar plaza FOUNDER',
      }),
    },
  ];

  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  for (const spec of specs) {
    const tmp = path.join(FRAMES, `${spec.name}.html`);
    fs.writeFileSync(tmp, spec.html);
    await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(FRAMES, `${spec.name}.png`),
      omitBackground: true,
    });
    console.log('overlay', spec.name);
  }
  await page.close();
}

/**
 * Still + overlay → short MP4 with Ken Burns zoom.
 * IMPORTANT: zoompan must run on a *single* still. If fed a looped video,
 * `d` multiplies per input frame and duration explodes.
 */
function sceneFromStill(still, overlay, outMp4, durationSec, zoomEnd = 1.12) {
  const frames = Math.max(1, Math.round(durationSec * FPS));
  const composite = outMp4.replace(/\.mp4$/i, '-comp.png');
  const zStep = ((zoomEnd - 1) / frames).toFixed(8);

  // 1) One composite still (bg + overlay)
  run('ffmpeg', [
    '-y', '-i', still, '-i', overlay,
    '-filter_complex',
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg];` +
      `[1:v]format=rgba,scale=${W}:${H}[ov];` +
      `[bg][ov]overlay=0:0:format=auto[v]`,
    '-map', '[v]',
    '-frames:v', '1',
    '-update', '1',
    composite,
  ]);

  // 2) Ken Burns from that single still
  run('ffmpeg', [
    '-y',
    '-loop', '1', '-i', composite,
    '-vf',
    `zoompan=z='min(1+on*${zStep},${zoomEnd})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},format=yuv420p`,
    '-frames:v', String(frames),
    '-r', String(FPS),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20',
    '-an', outMp4,
  ]);
}

/** Product UI still with gentle push + overlay */
function sceneProduct(still, overlay, outMp4, durationSec) {
  sceneFromStill(still, overlay, outMp4, durationSec, 1.08);
}

function concatScenes(list, outMp4) {
  const listFile = path.join(SCENES, 'concat.txt');
  fs.writeFileSync(
    listFile,
    list.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
  );
  run('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '18',
    '-movflags', '+faststart',
    '-an', outMp4,
  ]);
}

function normalizeStock() {
  // Solo fotos de póker verificadas (Unsplash / Pexels).
  const map = [
    ['01-pocket-kings.jpg', 's01.jpg'], // hook
    ['02-cards-in-air.jpg', 's02.jpg'], // cta
    ['03-cards-scatter.jpg', 's03.jpg'], // brand
    ['06-pexels-poker.jpg', 's04.jpg'], // mesa real
    ['01-pocket-kings.jpg', 's05.jpg'], // offer (oscuro vía eq abajo)
    ['05-casino-chips.jpg', 's06.jpg'],
  ];
  for (const [src, dest] of map) {
    const a = path.join(STOCK, src);
    const b = path.join(STOCK, dest);
    if (!fs.existsSync(a)) throw new Error('Missing stock ' + src);
    const darken = dest === 's05.jpg'
      ? `,eq=brightness=-0.14:saturation=1.08`
      : '';
    run('ffmpeg', [
      '-y', '-i', a,
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}${darken}`,
      '-frames:v', '1', '-update', '1', '-q:v', '2', b,
    ]);
  }
}

async function main() {
  ensureDirs();
  console.log('Normalizing stock…');
  normalizeStock();

  console.log('Rendering overlays…');
  const browser = await chromium.launch();
  try {
    await renderOverlays(browser);
  } finally {
    await browser.close();
  }

  console.log('Building scenes…');
  const scenes = [];

  // 1 Hook — pocket kings
  const sc1 = path.join(SCENES, '01-hook.mp4');
  sceneFromStill(
    path.join(STOCK, 's01.jpg'),
    path.join(FRAMES, '01-hook.png'),
    sc1, 2.8, 1.14
  );
  scenes.push(sc1);

  // 2 Brand — cards scatter / atmosphere
  const sc2 = path.join(SCENES, '02-brand.mp4');
  sceneFromStill(
    path.join(STOCK, 's03.jpg'),
    path.join(FRAMES, '02-brand.png'),
    sc2, 2.4, 1.1
  );
  scenes.push(sc2);

  // 3 GTO product — mesa entrenador
  const sc3 = path.join(SCENES, '03-gto.mp4');
  sceneProduct(
    path.join(PRODUCT, 'entrenador.jpg'),
    path.join(FRAMES, '03-gto.png'),
    sc3, 3.0
  );
  scenes.push(sc3);

  // 4 Coach / producto
  const sc4 = path.join(SCENES, '04-coach.mp4');
  sceneProduct(
    path.join(PRODUCT, 'forgecoach.jpg'),
    path.join(FRAMES, '04-coach.png'),
    sc4, 3.0
  );
  scenes.push(sc4);

  // 5 Offer FOUNDER — chips atmosphere
  const sc5 = path.join(SCENES, '05-offer.mp4');
  sceneFromStill(
    path.join(STOCK, 's05.jpg'),
    path.join(FRAMES, '05-offer.png'),
    sc5, 4.2, 1.1
  );
  scenes.push(sc5);

  // 6 CTA
  const sc6 = path.join(SCENES, '06-cta.mp4');
  sceneFromStill(
    path.join(STOCK, 's02.jpg'),
    path.join(FRAMES, '06-cta.png'),
    sc6, 3.0, 1.08
  );
  scenes.push(sc6);

  const out = path.join(REELS, 'founder-reel-instagram.mp4');
  console.log('Concat…');
  concatScenes(scenes, out);

  const probe = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=width,height,codec_name,r_frame_rate',
    '-of', 'json', out,
  ]);
  console.log('DONE', out);
  console.log(probe.stdout);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
