# Criterios — Villano Quiz Instagram

Guía para generar nuevas tandas (`casos.json` + `python3 tools/instagram-villano-quiz-assets.py`).

## Formato de entrega

| Pieza | Archivo | Contenido |
|-------|---------|-----------|
| Puzzle | `puzzles/NN-puzzle.jpg` | Pregunta + línea + board + héroe + 3 opciones |
| Solución | `soluciones/NN-solucion.jpg` | Misma escena + opción correcta + why |
| Numeración | Solo en **nombre de archivo** (`01`…`NN`) | **Nunca** badge «CASO / SOLUCIÓN N» en la imagen |
| Canvas | 1080×1350 (4:5) | Fondo navy `#0f1419` → `#0c1014` |

Publicación: carrusel puzzle→solución, o puzzle un día / solución al siguiente. Captions en `CAPTIONS.md`.

## Layout visual (no romper)

1. **Header:** `PokerForgeAI` + `Escuela · Rangos` (sin número de caso).
2. **Título grande** (~44px), una sola línea:
   - Puzzle: `¿Qué crees que tiene el villano?`
   - Solución: `Solución: ¿qué tenía el villano?`
3. **Línea de acción** (~25px), **una sola línea por street** (Preflop / Flop / Turn / River). Si no cabe, acortar el copy — no wrap.
4. **Sizing en oro:** solo tamaños (`2,5 bb`, `33% pot`, `all-in`, `overbet`, `N×`). El resto del texto en blanco.
5. **Cartas debajo** de la línea (dejar aire bajo el texto). Tamaño board/héroe ≈ **102×142**; opciones ≈ **90×124**. No volver a full-bleed gigante.
6. **Board** (izq.) + **Héroe POS stack** (der.) en la misma fila.
7. **Villano POS stack** + dos **reversos** (sin texto «ocultas» — el reverso ya lo dice).
8. **Opciones A/B/C** con cartas colored; en solución: correcta verde + ✓, incorrectas rojo.
9. Footer: pregunta o why (1 línea) + `pokerforgeai.com`.

## Cartas — mazo de cuatro colores

Igual que la app (`data-card-style="colored"`):

| Palo | Fondo | Watermark |
|------|-------|-----------|
| ♥ | `#c94a52` | `#e8a0a5` |
| ♦ | `#2f6fd6` | `#8bb4f0` |
| ♣ | `#2a8f4e` | `#7dcea0` |
| ♠ | `#3a4149` | `#9aa3ad` |

Glifos blancos; índice esquina + rango grande centrado + watermark suave. Suits con DejaVu (Inter no tiene ♥♦♣♠).

## Contenido estratégico

- **Una respuesta clara** que mejor encaje con la línea + sizing (aunque el spot invite a debate).
- **Hero coherente** con sus calls/checks (bluff-catcher, draw, float, etc.).
- **Sizing coherente** con la solución (overbet ≈ nuts/polar; small-small+jam ≈ polar; thin 25% ≈ Ax débil; etc.).
- **Stacks** `heroStack` / `villainStack` en bb, visibles en imagen; si hay all-in N bb, el stack del villano ≥ N.
- **Sin cartas duplicadas** entre board + héroe + cada opción.
- **Variedad de líneas** (no solo triple barrel): donk, overbet, all-in, check-raise, probe, delayed barrel, squeeze, limp-jam, multiway, blocker bluff…
- Mezcla **value / bluff / spots de debate**.
- **Why de solución: una sola línea** (~≤1000px a 18px). Acortar si hace falta.

## Campos en `casos.json`

```json
{
  "n": 31,
  "tag": "slug-corto",
  "heroPos": "BB",
  "villainPos": "CO",
  "heroStack": 100,
  "villainStack": 100,
  "hero": ["Qc", "8d"],
  "board": ["Jh", "Td", "3c", "7d", "2s"],
  "line": [
    { "street": "Preflop", "text": "CO open 2,5 bb → BB call" },
    { "street": "Flop", "text": "Jh Td 3c — BB check → CO c-bet 33% pot → BB call" }
  ],
  "options": [
    { "cards": ["9s", "8s"], "label": "98s" },
    { "cards": ["8h", "8c"], "label": "88" },
    { "cards": ["Kh", "Js"], "label": "KJo" }
  ],
  "answer": 2,
  "why": "Frase corta en una línea explicando por qué gana esa opción."
}
```

Códigos de carta: rango `2`–`9`/`T`/`J`/`Q`/`K`/`A` + palo `h|d|c|s`.

## Regenerar

```bash
python3 tools/instagram-villano-quiz-assets.py
```

El generador valida conflictos de cartas y que línea/why quepan en una línea. Si falla, acorta el texto en `casos.json`.

## Anti-patrones (evitar)

- Número de caso en la imagen
- Cartas blancas clásicas (rojo/negro) en vez del mazo colored
- Cartas enormes que comen la línea de acción
- Texto «ocultas» junto a los reversos (tapa el stack)
- Why multilínea o wrap en Preflop/Flop/Turn/River
- Tres barrels en todos los casos
- Hero/sizing incoherentes con la mano “correcta”
