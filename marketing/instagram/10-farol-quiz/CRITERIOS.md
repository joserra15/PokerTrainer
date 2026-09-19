# Criterios — Farol Quiz Instagram («¿Con qué faroleas mejor?»)

Misma base visual que [`../09-villano-quiz/CRITERIOS.md`](../09-villano-quiz/CRITERIOS.md). Aquí solo lo específico de este quiz.

## Pregunta

| | Texto |
|---|--------|
| Puzzle | `¿Con qué faroleas mejor?` |
| Solución | `Solución: ¿con qué faroleabas mejor?` |
| Footer puzzle | `¿Qué mano farolea mejor?` |
| Opciones | `¿Con cuál faroleas? (elige una)` |

## Idea del spot

- Llegas a un punto (casi siempre **river**) donde toca **farolear**.
- Las **3 opciones son aire** (sin pareja / sin escalera / sin color hecho).
- La correcta es la que **mejor bloquea value/nuts** del rival (y no bloquea basura que ya tiraba).
- Una respuesta clara aunque invite a debate.

## Layout

Igual que villano quiz, con estos cambios:

1. **Board** (4–5 cartas) + **Tú POS · stack** con **dos reversos** (aún eliges el farol).
2. **Villano POS · stack** + reversos (sin texto «ocultas»).
3. Opciones A/B/C = las tres manos candidatas a farol.
4. Sin cartas fijas de héroe boca arriba (las opciones *son* tu mano).

Tamaños, tipografía 1 línea, sizing en oro, mazo colored: igual que villano quiz.

## Contenido

- **Variedad de líneas:** c-bet, delayed barrel, donk, overbet, all-in, XR, probe, 3-bet pot, squeeze, multiway→HU…
- **Stacks** coherentes con all-ins.
- **Sin cartas duplicadas** board ↔ cada opción.
- **Validar que las 3 opciones son aire** (no pareja/escalera/color en ese board).
- **Why en 1 línea** (qué bloquea la correcta vs por qué fallan las otras).

## Campos `casos.json`

```json
{
  "n": 1,
  "tag": "flush-nut-blocker",
  "heroPos": "BTN",
  "villainPos": "BB",
  "heroStack": 100,
  "villainStack": 100,
  "board": ["Kh", "8h", "3h", "Jd", "2c"],
  "line": [ { "street": "Preflop", "text": "BTN open 2,5 bb → BB call" } ],
  "options": [
    { "cards": ["Ah", "5d"], "label": "A5o" },
    { "cards": ["5h", "4d"], "label": "54o" },
    { "cards": ["Qc", "9c"], "label": "Q9s" }
  ],
  "answer": 0,
  "why": "A♥ bloquea nut flush. 5♥ quita flushes flojos; Q9s no toca el color."
}
```

No hace falta campo `hero` (mano): se elige en opciones.

## Regenerar

```bash
python3 tools/instagram-farol-quiz-assets.py
```

## Anti-patrones extra

- Opción que ya es value (pareja, escalera, color) presentada como «farol»
- Farol con Ax cuando hay A en board (harías pareja)
- En 4-flush board, «blocker» del palo = flush hecho (usa board de 3 al color)
- Solo triple barrels; solo flushes; always answer A
