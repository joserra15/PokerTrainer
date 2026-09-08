# Sprint FOUNDER · 22 sep – 5 oct 2026

Pack Instagram de **14 días** (1 post feed/día + stories) centrado en tres pilares:

1. **Torneos IA** — torneo entero con corrección mano a mano  
2. **Reto IA Pro** — ¿Podrás batir a nuestra IA Pro?  
3. **FOUNDER** — lanzamiento **1 de octubre** (−40 % para siempre)

## Contenido

| Archivo | Qué es |
|---------|--------|
| [`CALENDARIO_14_DIAS.md`](CALENDARIO_14_DIAS.md) | Día a día: formato, hook, assets, caption, story |
| [`CARRUSELES_NUEVOS.md`](CARRUSELES_NUEVOS.md) | Specs B15–B21 + captions |
| [`FEATURE_ADS.md`](FEATURE_ADS.md) | Covers F1–F10 + guiones 15–20s para tu vídeo |
| [`TORNEOS_IA_CAMPAIGN.md`](TORNEOS_IA_CAMPAIGN.md) | Copy coach-al-lado + reto Pro |
| [`FOUNDER_CAMPAIGN.md`](FOUNDER_CAMPAIGN.md) | Precios, UTM, countdown stories |
| [`assets/`](assets/) | JPG listos (carruseles, features, FOUNDER) |

Carruseles también viven en [`../03-carruseles-edu/`](../03-carruseles-edu/) (mismo naming `edu-b15-*` … `edu-b21-*`).

## Cómo emparejar covers con vídeo

1. Abre CapCut → 9:16.  
2. Capa 1: cover `assets/features/feature-fN-*.jpg` (2s hook).  
3. Capa 2: tu screen-recording 10–15s (o b-roll de [`../04-broll/`](../04-broll/)).  
4. Cierra 2s con [`../01-kit-marca/kit-endcard-5manos.jpg`](../01-kit-marca/kit-endcard-5manos.jpg) **o** endcard FOUNDER si es ventana 28 sep–5 oct.  
5. Subtítulos auto + música trending (volumen bajo).

## UTM bio (rotar por campaña)

```
https://www.pokerforgeai.com/?utm_source=instagram&utm_medium=bio&utm_campaign=founder_oct1
https://www.pokerforgeai.com/?utm_source=instagram&utm_medium=bio&utm_campaign=torneos_ia
https://www.pokerforgeai.com/?utm_source=instagram&utm_medium=bio&utm_campaign=reto_ia_pro
https://www.pokerforgeai.com/?utm_source=instagram&utm_medium=bio&utm_campaign=5manos
```

## Marca

- Fondo `#0f1419` · Panel `#1c2530` · Fieltro `#1f6b4a`  
- Acento `#2f81f7` · Oro `#f5c451` · OK `#3fb950` · Error `#f0533b`  
- +18 · Herramienta educativa · Juega responsablemente

## Regenerar assets

```bash
node tools/instagram-sprint-founder-assets.js
```
