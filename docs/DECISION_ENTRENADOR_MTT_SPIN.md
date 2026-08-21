# Decisión de producto — Entrenador MTT / Spin (Fase 3)

> Fecha: agosto 2026 · Relacionado: RoadMap entrenador profesional, [`ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md`](./ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md) ítem #18.

## Decisión

**Profundizar** Spins y Torneos como formato de estudio serio (no solo suavizar la promesa), con techo honesto: charts + ICM lite + heurística por fase, **no** paridad con GTO Wizard / DTO solver trees.

## Por qué

1. El feedback pro (fase invisible, opens/3bets poco creíbles, “no se ajusta a mi juego”) es de **claridad + charts**, no de “falta un solver full”.
2. Ya hay taxonomía de fases, ICM lite y hubs spin/mtt; el coste de retirar la promesa es alto (copy, Escuela, setup).
3. Cash 6-max sigue siendo el núcleo GTO; MTT/Spin se posicionan como **estudio por profundidad**.

## Qué implica (backlog Fase 3+)

| Prioridad | Entrega |
|-----------|---------|
| P3a | Capas JSON de rangos Spin 25/20/15/10bb (mismo pipeline que cash 100bb) |
| P3b | Capas MTT early / mid / short (opens + vs-RFI) |
| P3c | Nash push/fold más fiel en `pushFold.js` |
| P3d | Estructura de blinds simbólica (nivel + ante %) en HUD |
| P3e | Más lecciones Escuela alineadas a la misma taxonomía de fase |

## Qué no haremos en este ciclo

- ICM final table multi-mesa / 100+ jugadores
- Nodelock / multiway solver
- Sustituir el loop cash como producto principal
- Marketing que diga “GTO torneo solver”

## Copy canónico (setup / landing)

> Spins y Torneos: estudio heurístico por fase y stack con ICM lite. El núcleo de charts solver es Cash 6-max.

## Estado Fase 3 (implementado)

- **P3a** Capas JSON Spin 25/20/15/10bb (`data/ranges/phase3-layers.json` → registry).
- **P3b** Capas MTT early/mid/short/push (opens + vs-RFI).
- **P3c** Nash push/fold por profundidad (`nash-push-fold.json`) con ajuste ante/ICM lite.
- **P3d** HUD con nivel de blinds simbólico + ante %.
- **P3e** Escuela: `MTT_SHORT` ≠ `MTT_PUSH`; drills `MTT_BUBBLE` en T-13; Spin con `formatHub: spin` + fase por stack.

### Extensión vs 3-bet (post Fase 3)

- Capas `spinVs3bet` / `mttVs3bet` por stack y fase: flats tipo **99 OOP vs 3-bet** se aprietan en short/push/bubble (prioridad fold o jam), no se copian charts cash deep.
- El selector de **fase** en Spin/MTT adapta opens, vs-RFI **y** vs 3-bet; la mezcla GTO de `vs3betStrategy` también se endurece con ICM/fase corta.

## Estado de Fases 0–2

- Tapete con watermark “Modo entrenamiento”, badge CASH/SPIN/MTT y HUD de fase/stack/ante/ICM/payout.
- Fase Auto vs escenario Aleatorio clarificados; fase resuelta visible por mano.
- Auditoría KJo LJ + 3bets pro acotados; mapa LJ nativo en charts MTT.
- Feedback live con ICM; presets “Mi juego”; sizing open 2.2 / 2.5 / 3×.
- ForgeCoach en detalle de entrenador; impacto fase/ICM por decisión.
