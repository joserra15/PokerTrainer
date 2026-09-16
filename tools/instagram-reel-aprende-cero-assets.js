#!/usr/bin/env node
/**
 * Genera frames 9:16 del reel "Aprende desde cero / DM mes gratis".
 * Uso: node tools/instagram-reel-aprende-cero-assets.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'marketing/instagram/08-reel-aprende-cero/assets');
const W = 720;
const H = 1280;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
  background: #0f1419;
  color: #f0f3f6;
  position: relative;
}
.bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 120% 55% at 50% 108%, #1f6b4a66 0%, transparent 55%),
    radial-gradient(ellipse 70% 35% at 85% -8%, #2f81f728 0%, transparent 50%),
    linear-gradient(180deg, #0f1419 0%, #121a22 55%, #0c1014 100%);
}
.suits {
  position: absolute; inset: 0; opacity: 0.07;
  background-image:
    radial-gradient(circle at 18% 28%, #f5c451 1.5px, transparent 2px),
    radial-gradient(circle at 72% 62%, #f5c451 1.5px, transparent 2px),
    radial-gradient(circle at 42% 82%, #2f81f7 1.5px, transparent 2px);
  background-size: 48px 48px, 64px 64px, 56px 56px;
}
.frame {
  position: absolute; inset: 28px;
  border: 1.5px solid #f5c45155;
  border-radius: 28px;
  background: #1c2530cc;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 100px 28px 72px;
  text-align: center;
}
.brand-top {
  position: absolute; top: 40px; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.spade {
  width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid #f5c451;
  display: grid; place-items: center;
  font-size: 20px; color: #f5c451; background: #0f1419;
}
.brand-name {
  font-size: 13px; letter-spacing: 0.28em; color: #f5c451; font-weight: 700;
}
.eyebrow {
  font-size: 20px; letter-spacing: 0.22em; text-transform: uppercase;
  color: #9aa7b5; margin-bottom: 18px; font-weight: 700;
}
.headline {
  font-size: 70px; font-weight: 800; line-height: 1.05;
  max-width: 640px;
}
.headline.lg { font-size: 88px; }
.headline.sm { font-size: 58px; }
.sub {
  margin-top: 24px; font-size: 30px; line-height: 1.28; color: #c5ced8;
  max-width: 580px; font-weight: 700;
}
.gold { color: #f5c451; }
.blue { color: #2f81f7; }
.ok { color: #3fb950; }
.rule {
  width: 120px; height: 2px; background: #f5c451;
  margin: 28px auto; position: relative;
}
.rule::after {
  content: "♠"; position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%); background: #1c2530;
  padding: 0 8px; color: #f5c451; font-size: 14px;
}
.pill {
  margin-top: 28px;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 20px 30px; border-radius: 999px;
  background: #2f81f722; border: 2px solid #2f81f7;
  color: #f0f3f6; font-size: 30px; font-weight: 800; letter-spacing: 0.04em;
}
.steps {
  margin-top: 28px; display: flex; flex-direction: column; gap: 16px; width: 100%;
  max-width: 580px;
}
.step {
  display: flex; align-items: center; gap: 16px;
  background: #0f1419aa; border: 1px solid #2a3644;
  border-radius: 16px; padding: 20px 22px; text-align: left;
}
.step-n {
  width: 48px; height: 48px; border-radius: 50%;
  background: #2f81f7; color: #fff; font-weight: 800; font-size: 22px;
  display: grid; place-items: center; flex-shrink: 0;
}
.step-t { font-size: 28px; font-weight: 800; }
.footer {
  position: absolute; bottom: 40px; left: 0; right: 0;
  font-size: 15px; letter-spacing: 0.12em; color: #6b7785; text-align: center;
}
</style></head><body>
<div class="bg"></div><div class="suits"></div>
<div class="frame">${inner}</div>
</body></html>`;
}

const FRAMES = [
  {
    file: 'hook-01-te-gusta.jpg',
    html: shell(`
      <div class="brand-top"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
      <div class="eyebrow">Sé sincero</div>
      <div class="headline lg">Te gusta<br>el póker…</div>
      <div class="rule"></div>
      <div class="sub">Pero hay algo que nunca has hecho.</div>
      <div class="footer">+18 · Herramienta educativa</div>
    `),
  },
  {
    file: 'hook-02-nunca-aprender.jpg',
    html: shell(`
      <div class="brand-top"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
      <div class="headline">…pero nunca<br>te has parado<br>a <span class="gold">aprender</span>.</div>
      <div class="rule"></div>
      <div class="sub">Ver partidas ≠ saber jugar.</div>
      <div class="footer">+18 · Juega responsablemente</div>
    `),
  },
  {
    file: 'beat-03-sin-riesgo.jpg',
    html: shell(`
      <div class="brand-top"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
      <div class="eyebrow">Desde cero</div>
      <div class="headline">Sin arriesgar<br><span class="gold">dinero</span></div>
      <div class="rule"></div>
      <div class="sub">Entrenas manos reales.<br>Cero bankroll en juego.</div>
      <div class="footer">Práctica segura · Cash · Spins · Torneos</div>
    `),
  },
  {
    file: 'beat-04-practica.jpg',
    html: shell(`
      <div class="brand-top"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
      <div class="headline">Así se aprende</div>
      <div class="steps">
        <div class="step"><div class="step-n">1</div><div class="step-t">Juegas el spot</div></div>
        <div class="step"><div class="step-n">2</div><div class="step-t">Te corrigen al momento</div></div>
        <div class="step"><div class="step-n">3</div><div class="step-t"><span class="ok">Mejoras sin perder dinero</span></div></div>
      </div>
      <div class="footer">Escuela + entrenador</div>
    `),
  },
  {
    file: 'cta-05-mes-gratis.jpg',
    html: shell(`
      <div class="brand-top"><div class="spade">♠</div><div class="brand-name">POKERFORGEAI</div></div>
      <div class="eyebrow">Regalo</div>
      <div class="headline lg"><span class="gold">1 MES</span><br>GRATIS</div>
      <div class="rule"></div>
      <div class="sub">Escribe por privado la palabra</div>
      <div class="pill"><span class="blue">DM</span> · APRENDER</div>
      <div class="footer">Respuesta por privado</div>
    `),
  },
  {
    file: 'endcard-06.jpg',
    html: shell(`
      <div class="spade" style="margin-bottom:14px">♠</div>
      <div class="brand-name" style="margin-bottom:28px">POKERFORGEAI</div>
      <div class="headline">Desde cero.<br>Sin riesgo.<br><span class="gold">DM: APRENDER</span></div>
      <div class="rule"></div>
      <div class="sub">Tu entrenador de póker en español</div>
      <div class="pill" style="margin-top:36px">1 mes gratis · pregunta por privado</div>
      <div class="footer">pokerforgeai.com · +18</div>
    `),
  },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });

  for (const frame of FRAMES) {
    await page.setContent(frame.html, { waitUntil: 'load' });
    const outPath = path.join(OUT, frame.file);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 92 });
    console.log('wrote', path.relative(ROOT, outPath));
  }

  await browser.close();
  console.log(`OK · ${FRAMES.length} frames → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
