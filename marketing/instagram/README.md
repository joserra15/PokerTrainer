# PokerForgeAI — Pack Instagram

Plan de promoción integral: plantillas, spots, carruseles, b-roll de la app y guiones listos para CapCut/Canva.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| [`01-kit-marca/`](01-kit-marca/) | 8 plantillas (reels, carrusel, stories, end card) |
| [`02-spots-virales/`](02-spots-virales/) | 12 gráficos (A1–A5, A10, fugas NL25, thumbs) |
| [`03-carruseles-edu/`](03-carruseles-edu/) | 15 slides (RFI BTN, pot odds, c-bet) |
| [`04-broll/`](04-broll/) | Clips WebM + stills de la app real |
| [`05-semana-1/`](05-semana-1/) | Paquete publicación semana 1 + captions |
| [`06-calendario/`](06-calendario/) | Calendario detallado semanas 2–8 |

## Orden de uso
1. Configura bio + UTM (`05-semana-1/GUIONES_Y_CAPTIONS.md`)
2. Publica Semana 1 con assets de `05-semana-1/`
3. Sigue `06-calendario/CALENDARIO_SEMANAS_2_8.md`
4. Edición típica: 5–10 min/pieza (música + subtítulos + end card)

## Marca
- Fondo `#0f1419` · Panel `#1c2530` · Fieltro `#1f6b4a`
- Acento `#2f81f7` · Oro `#f5c451` · OK `#3fb950` · Error `#f0533b`
- +18 · Herramienta educativa · Juega responsablemente

## Regenerar b-roll
```bash
npx http-server . -p 4173 -c-1
node tools/instagram-broll.js
node tools/instagram-broll-clips.js
node tools/instagram-broll-fix.js
```
