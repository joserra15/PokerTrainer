# Estudio de prompts IA Coach — PokerTrainer

> Versión analizada: v1.33.0 · Motor: Gemini 2.5 Flash · Archivo: `supabase/functions/analyze-hand/index.ts`

## 1. Mapa de modos

| Modo API | Scope UI | Prompt sistema | User content |
|----------|----------|----------------|--------------|
| `report` | Mano entrenador | `REPORT_PROMPT` | JSON mano + "Genera informe…" |
| `question` | Pregunta mano | `QUESTION_PROMPT` | Pregunta + JSON mano |
| `session_report` | Sesión importada | `SESSION_REPORT_PROMPT` | JSON sesión completa |
| `session_question` | Pregunta sesión | `SESSION_QUESTION_PROMPT` | Pregunta + JSON sesión |
| `stats_report` | Estadísticas globales | `STATS_REPORT_PROMPT` | JSON progreso + leaks |
| `stats_question` | Pregunta stats | `STATS_QUESTION_PROMPT` | Pregunta + JSON stats |

Cada consulta consume 1 crédito (plan o bono). El hilo conversacional (últimas 10 respuestas) se guarda en cliente; **no se reenvía al modelo** hoy.

---

## 2. Ejemplo de cada tipo de prompt

### 2.1 Informe de mano (`report`)

**System (resumen):**
```
Coach NL Hold'em 6-max cash (español). Recibes JSON compacto: cartas, board, decisiones, línea villano…
NO narres la mano. Evalúa decisiones GTO y lectura del villano.
Los números eq/gto/ev del JSON son estimaciones — recalcula lo crítico.
Estructura: # hero.code hero.pos → ## Decisiones → ## Lectura villano → ## Lección práctica
```

**User (ejemplo real simplificado):**
```
Genera informe de la mano (verifica números del solver por tu cuenta):

{
  "src": "trainer",
  "spot": "RFI BTN",
  "hero": { "pos": "BTN", "code": "AKo", "cards": ["Ah","Kd"] },
  "board": ["Qs","7c","2d","Jh","3s"],
  "dec": [
    { "st": "preflop", "ch": "raise", "ok": true, "cl": "optima", "gto": { "raise": 0.82 } },
    { "st": "flop", "ch": "bet", "ok": false, "cl": "imprecisa", "ev": 0.4, "eq": 62 }
  ],
  "vil": { "pos": "BB", "prof": "Pro", "line": "f:c|t:b|t:c|r:b" },
  "res": { "net": 4.2, "evLoss": 0.4 }
}
```

**Salida esperada:** Markdown con título `# AKo BTN`, bullets por calle con error/EV, lectura de línea del villano, 1 lección microlímites.

---

### 2.2 Pregunta sobre mano (`question`)

**System:**
```
Centra la respuesta en la pregunta del usuario. Usa todo el contexto JSON.
Recalcula equity/EV si la pregunta lo requiere; no confíes ciegamente en el solver.
```

**User:**
```
Pregunta del usuario:
¿Debí foldear el turn con este sizing?

Contexto de la mano (JSON):
{ ... misma mano que arriba ... }
```

**Salida esperada:** Título breve relacionado con la pregunta (no id de mano), respuesta directa con sizing/pot odds.

---

### 2.3 Informe de sesión (`session_report`)

**System:**
```
JSON ultra-compacto: st (stats), leaks (manos malas), clean (resto en una línea).
NO enumerar todas las manos. Patrones, fugas, plan de estudio (3 acciones).
```

**User:**
```
Genera informe de la sesión:
{
  "src": "sessionGlobal",
  "name": "NL25_2026-03-01",
  "st": { "n": 142, "acc": 71, "net": -8.4, "evLost": 12.1, "accSt": { "pf": 78, "fl": 68, "tu": 61, "ri": 55 } },
  "leaks": [
    { "id": "h12", "h": "JTs BTN", "ev": 2.1, "dec": [{ "st": "turn", "ch": "call", "ok": false }] }
  ],
  "clean": ["h1|AA BTN|+5|0|o", "h2|72o BB|-1|0.2|e"]
}
```

---

### 2.4 Pregunta sobre sesión (`session_question`)

**User:**
```
Pregunta del usuario:
¿Perdí más EV en turn o en river por errores claros?

Sesión (JSON):
{ ... }
```

---

### 2.5 Plan de estudio / estadísticas (`stats_report`)

**User:**
```
Genera plan de estudio según estas estadísticas:
{
  "src": "statsGlobal",
  "st": { "hands": 320, "acc": 74, "evLost": 28.5, "accSt": { "pf": 82, "fl": 76, "tu": 65, "ri": 58 } },
  "progress": [{ "w": "3 mar", "hands": 42, "acc": 70, "ev": 4.2 }],
  "leaks": [{ "spot": "3-Bet · CO · turn", "n": 8, "ev": 6.1 }]
}
```

---

### 2.6 Pregunta sobre estadísticas (`stats_question`)

**User:**
```
Pregunta del usuario:
¿Qué calle debería priorizar esta semana?

Estadísticas del entrenador (JSON):
{ ... }
```

---

## 3. Fortalezas del diseño actual

1. **JSON compacto** (`ai-hand-payload.js`) — bajo coste de tokens, datos estructurados.
2. **Aviso explícito** de no confiar en eq/gto/ev del solver — reduce alucinaciones numéricas.
3. **Prohibición de narrar** la mano en informes — evita respuestas redundantes.
4. **Estructura markdown fija** — salidas predecibles para la UI.
5. **Temperatura baja** (0.35–0.4) — más consistencia GTO.

---

## 4. Debilidades y mejoras recomendadas

### 4.1 Sin memoria conversacional en el backend

**Hoy:** Las 10 respuestas guardadas en cliente no se envían a Gemini.

**Mejora (fase 2):**
```typescript
// En analyze-hand, si mode === 'question' y body.thread?.length:
contents: [
  ...thread.slice(0, 4).map(t => ({ role: 'user', parts: [{ text: t.question }] })),
  ...thread.slice(0, 4).map(t => ({ role: 'model', parts: [{ text: t.reportMarkdown }] })),
  { role: 'user', parts: [{ text: userContent }] }
]
```
Limitar a **2–4 turnos** para no disparar tokens. Solo en `question` / `session_question` / `stats_question`.

---

### 4.2 Falta de “perfil de jugador” persistente

**Mejora:** Añadir bloque opcional al payload stats/sesión:
```json
"player": {
  "plan": "study",
  "sessions": 12,
  "topLeaks": ["turn 3bet pots", "river thin value"],
  "trend": "acc +3% últimas 4 semanas"
}
```
Generado en `buildStats()` desde histórico — **no PII**. El prompt stats puede decir: *“Adapta el plan a los leaks recurrentes del JSON.”*

---

### 4.3 Prompts de mano: poca guía de formato por calle

**Mejora en REPORT_PROMPT** — añadir plantilla por decisión:
```
Por cada decisión con cl != optima:
- Calle · Acción elegida vs óptima
- Pot odds / MDF si hay apuesta
- 1 frase: por qué GTO prefiere la otra línea
Máx. 4 bullets en ## Decisiones (solo las relevantes).
```

---

### 4.4 Sesión: leaks truncados sin aviso al modelo

Si `leakTrunc > 45`, el modelo no sabe que hay más manos malas.

**Mejora en payload:**
```json
"leakNote": "Mostrando 45 de 78 manos con EV perdido; prioriza patrones, no lista exhaustiva."
```

---

### 4.5 Stats: sin ejemplos few-shot

Los modelos siguen mejor con **1 ejemplo corto** de salida ideal en el system prompt (no en user).

**Mejora STATS_REPORT_PROMPT** — añadir:
```
Ejemplo de bullet en ## Prioridades:
- **Turn · 3-Bet CO**: 8 errores, −6.1 bb EV — calls con draws débiles vs barrel doble; estudiar check-raise y fold MDF.
```

---

### 4.6 Temperatura y tokens

| Modo | Actual | Recomendado |
|------|--------|-------------|
| Informes sesión/stats | 2560 tokens | Mantener; si trunca, subir a 3072 |
| Preguntas | 1536 | OK |
| Informe mano | 2048 | OK para manos multi-street |

**thinkingBudget: 0** — correcto para latencia/coste en Flash.

---

### 4.7 Post-procesado en cliente (sin re-entrenar modelo)

No hace falta “entrenar” Gemini. Mejoras sin fine-tuning:

1. **Validar markdown** — si falta `## Decisiones`, re-prompt automático (1 retry).
2. **Detectar narración** — si >30% de frases repiten secuencia de acciones del JSON, mostrar aviso.
3. **Cache semántico** — ya existe por `cacheKey`; ampliar a stats con hash de leaks.

---

### 4.8 ¿Se puede “entrenar” o dar histórico?

| Enfoque | Viabilidad | Notas |
|---------|------------|-------|
| Fine-tuning Gemini | Baja | Coste, mantenimiento, pocos datos etiquetados |
| RAG con manos anonimizadas | Media | Chroma/pgvector con embeddings de leaks; buscar 3 manos similares antes del prompt |
| Historial en prompt (thread) | **Alta** | Implementación inmediata en preguntas |
| Resumen rolling del usuario | **Alta** | 1 párrafo generado cada mes guardado en `pt_user_profiles.coach_summary` |

**Recomendación práctica:** Fase 1 = thread en preguntas. Fase 2 = `coach_summary` de 500 tokens actualizado tras cada informe stats.

---

## 5. Checklist de calidad por respuesta

Usar en tests manuales o `tools/test-ai-payload.js` ampliado:

- [ ] Título usa `hero.code` + posición, no id interno
- [ ] No repite secuencia completa de acciones
- [ ] Menciona al menos 1 número propio (pot odds, % equity aproximado) en decisiones críticas
- [ ] Lectura villano distingue value vs bluff lines
- [ ] Lección práctica = 1 idea accionable microlímites
- [ ] Español natural, sin anglicismos innecesarios

---

## 6. Roadmap sugerido

| Prioridad | Mejora | Esfuerzo |
|-----------|--------|----------|
| P1 | Reenviar 2–4 turnos en preguntas | Bajo |
| P1 | Plantilla bullets en REPORT_PROMPT | Bajo |
| P2 | `coach_summary` en perfil usuario | Medio |
| P2 | Few-shot en STATS_REPORT | Bajo |
| P3 | RAG manos similares | Alto |
| P3 | Retry si markdown incompleto | Medio |

---

## 7. Ejemplo de payload “ideal” mano (referencia)

```json
{
  "src": "trainer",
  "spot": "BB vs BTN",
  "hero": { "pos": "BB", "code": "Q9s", "cards": ["Qc","9c"] },
  "board": ["Tc","6c","2h","Jd","4s"],
  "stack": 100,
  "dec": [
    { "st": "preflop", "ch": "call", "ok": true, "cl": "optima", "gto": { "call": 0.55 } },
    { "st": "flop", "ch": "check", "ok": true, "cl": "aceptable" },
    { "st": "turn", "ch": "call", "ok": false, "cl": "error", "ev": 1.8, "eq": 28, "call": 5.5, "pot": 12 }
  ],
  "vil": { "prof": "Pro", "line": "f:r|t:b", "rng": "capped on turn" },
  "res": { "net": -5.5, "evLoss": 1.8 },
  "solverNote": "eq/gto/ev son estimaciones del solver local"
}
```

Este JSON es lo que diferencia PokerTrainer de una captura en Gemini gratis: **contexto estructurado + GTO local + línea del villano**.
