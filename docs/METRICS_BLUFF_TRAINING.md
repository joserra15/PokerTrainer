# Métricas — entrenamiento de faroles (BL-* + entrenador)

Instrumentación alineada al plan de auditoría Escuela → Entrenador.

## Eventos

| Evento | Dónde | Props clave |
|--------|-------|-------------|
| `lesson_complete` / `lesson_fail` | `js/school.js` | `lessonId`, `pct`, `quizCorrect`, `quizTotal`, `quizPct`, `bluffPack` (true si `BL-*` o `B-01`) |
| `bluff_train_bridge` | CTA «Practicar en entrenador» | `lessonId`, `practiceIntent`, `practiceStreet` |
| `hand_start` | `js/app.js` | `practiceIntent`, `practiceStreet`, `scenario` |
| `play_hand` | `js/app.js` fin de mano | `practiceIntent`, `practiceStreet`, `bluffExcesivo`, `bluffSinFe`, `bluffSpotHits`, `evLoss` |

## KPIs de producto

1. **Acierto quizzes F/BL** — `quizPct` en `lesson_complete` con `bluffPack=true` (BL-01…BL-04, B-01).
2. **Tasa `bluff_excesivo`** — `bluffExcesivo / decisions` en manos con `practiceIntent=bluff_make` (pre vs post lección).
3. **Uso del intent** — volumen de `hand_start` con `practiceIntent` ∈ `{bluff_make, bluff_catch}` y presets `bluffs_river` / `bluff_catch_river`.
4. **Bridge Escuela→Entrenador** — conteo de `bluff_train_bridge` tras completar BL-*.
5. **Conversión Study→Coach** — aprobados BL-01…BL-03 (Study) que abren BL-04 (Coach).

## Cómo mirarlo

- Analytics (Plausible / export PTLog) filtrando props anteriores.
- Informal en sesión: badge `#bluff-spot-badge` + hints en feedback / hand-end.

## No confundir

El `GTOBluffSpotDetector` filtra spots y sugiere porqués; el grading sigue siendo mix/EV del solver. No usar `bluffSpot.score` como verdad GTO.
