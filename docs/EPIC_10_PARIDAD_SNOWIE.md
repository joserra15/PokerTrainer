# EPIC 10 — Paridad competitiva PokerSnowie

> **Objetivo:** Cerrar el gap funcional con [PokerSnowie](https://pokersnowie.com/) en lo que importa para retener y convertir usuarios de pago, **sin copiar lo que ya nos diferencia** (español nativo, IA Coach narrativa, web sin instalar, precio Study ~15 €).
>
> **Referencia de mercado:** Snowie ~30 $/mes o ~200 $/año · trial 10 días · un solo plan todo incluido.
>
> **Versión producto base:** v1.39.0 (julio 2026).

---

## 1. Resumen ejecutivo

| Dimensión | Snowie | PokerForgeAI hoy | Meta EPIC 10 |
|-----------|--------|------------------|--------------|
| Trial / free | 10 días sin tarjeta | Freemium parcial (billing listo) | Trial claro + límites free publicados |
| Entrenador + consejo en vivo | Live Advisor + EV por acción | Feedback post-decisión | **Advisor toggle** durante la mano |
| Sparring continuo | Sesiones largas vs IA | Manos sueltas | **Modo sesión** (N manos seguidas) |
| Import multi-sala | PS, GG, Winamax | PS ES/EN + Winamax | **+ GGPoker** |
| Leaks y stats | Error rate, gráficas, categorías | Stats v2 + top 5 leaks | **Dashboard leaks** más rico |
| Escenarios custom | Editor mesa completo | Solo entrenador aleatorio | **What-if** en manos importadas |
| Rangos | Preflop + postflop grid | Matriz preflop + villano narrativo | **Range viewer** postflop básico |
| Mobile | Apps iOS/Android | Web responsive | **PWA** instalable |
| IA | Red neuronal integrada | Gemini informes | **Mantener** (no copiar motor Snowie) |

**Veredicto:** No hace falta clonar Snowie entero. Esta épica prioriza **5 pilares** que el usuario compara en la primera semana: trial, entrenar con consejo, import amplio, fugas visibles y practicar en bloque.

**Esfuerzo total estimado:** 8–12 semanas (1 dev), en 3 fases.

**Dependencias:** EPIC 2 (seguridad) y EPIC 3 (billing) deben estar en producción antes de lanzar trial de pago agresivo.

---

## 2. Qué NO copiar (diferenciadores propios)

| Feature Snowie | Por qué no priorizarla |
|----------------|------------------------|
| Red neuronal propia | Años de I+D; nosotros heurísticas + solver JSON + honestidad |
| Apps nativas iOS/Android | PWA primero; coste/beneficio bajo al inicio |
| Multivía profundo | Snowie gana aquí; nicho nuestro es 6-max cash ES |
| “GTO perfecto” en marketing | Nosotros: metodología pública + confianza por decisión |
| Bundle Coach Snowie | Nuestro **IA Coach Gemini** ya es el upsell (EPIC 8) |

---

## 3. Pilares y tareas

Leyenda: **S** 1–2 días · **M** 3–5 días · **L** 1–2 semanas · **XL** 2+ semanas  
Prioridad: **P0** antes de marketing de pago · **P1** retención · **P2** nice-to-have

---

### PILAR A — Onboarding y trial (copiar: trial 10 días sin fricción)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-01 | **Trial 10 días Study** vía Stripe (`trialing`) | P0 | M | Nuevo usuario puede activar trial sin pagar; al día 10 pasa a free o pide tarjeta |
| SN-02 | Pantalla **“Empieza gratis”** con límites claros vs Study vs Coach | P0 | S | Comparativa visible antes del login; enlaza a términos |
| SN-03 | **Límites free publicados** (manos/día, 1 sesión/mes, 0 IA) | P0 | M | Paywall coherente con `docs/BILLING.md`; mensajes al alcanzar límite |
| SN-04 | **Sesión demo precargada** (G-05) con manos reales anonimizadas | P1 | M | Usuario sin import ve leak + repaso en < 2 min |
| SN-05 | Email día 3 y día 8 de trial (“te quedan X días”) | P2 | M | Resend/Stripe; opt-out en cuenta |

**Estado:** M-03/M-05 billing parcialmente hecho · G-05 pendiente · SN-01/02/03 pendientes.

---

### PILAR B — Entrenador tipo Live Advisor (copiar: consejo + EV en tiempo real)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-10 | Toggle **“Consejo en vivo”** en setup de entrenamiento | P0 | S | ON/OFF persistente en perfil local |
| SN-11 | Panel advisor: acción recomendada + EV de 2–3 acciones legales | P0 | L | Visible **antes** de confirmar acción si toggle ON |
| SN-12 | Tras elegir: comparativa **tu EV vs óptimo** (como Snowie) | P0 | M | Misma UX que veredicto actual pero con delta EV explícito |
| SN-13 | Modo **“Solo aviso si error grave”** (umbral EV configurable) | P1 | M | Ajuste en cuenta; default −0.5 bb |
| SN-14 | **Modo sesión**: jugar 25/50/100 manos seguidas sin volver al menú | P1 | L | Resumen al final: acierto, EV perdido, tiempo |
| SN-15 | Filtros de spot en sesión (RFI, vs open, calle…) — extiende P-04 | P1 | M | Elegir tipo de spot antes del bloque de manos |
| SN-16 | Contador **manos/hora** en stats de entrenador | P2 | S | Métrica en dashboard progreso |

**Estado:** Feedback post-decisión existe · advisor pre-acción y modo sesión **no existen**.

---

### PILAR C — Import y cobertura de salas (copiar: “sube y analiza en minutos”)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-20 | Parser **GGPoker** cash NL (muestra 500+ manos en CI) | P1 | L | `testimport.js` verde; detect en `formatDetector` |
| SN-21 | Import **carpeta / múltiples .txt** en una operación | P1 | M | Progreso por archivo; resumen agregado |
| SN-22 | Archivos **10k+ manos** con barra de progreso (I-04) | P1 | M | No bloquea UI; chunk async |
| SN-23 | **Re-análisis** al subir versión motor (I-05) | P2 | L | Banner “Nuevo motor”; botón re-analizar sesión |
| SN-24 | PnL sesión importada (resultado real bb) en resumen | P1 | S | Visible en tarjeta sesión y stats (ya parcial en v1.39) |

**Estado:** PS ES/EN + Winamax hechos · GG pendiente.

---

### PILAR D — Leak detector y estadísticas (copiar: error rate + gráficas + categorías)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-30 | **Error rate %** global y por semana (entrenador + sesiones) | P0 | M | Gráfica + número grande en Estadísticas |
| SN-31 | Leaks por **calle** (preflop/flop/turn/river) | P1 | M | Barras o tabla; clic lleva a filtro errores |
| SN-32 | Leaks por **tipo de spot** (RFI, vs 3bet, cbet…) | P1 | M | Usa `spotKey` existente en storage |
| SN-33 | Gráfica **balance** (demasiado passivo / agresivo) heurística | P2 | L | Basado en clases error vs óptimo por acción |
| SN-34 | Export **informe de sesión PDF/JSON** (manos con error, EV) | P2 | M | Descarga desde sesión; útil para Coach |
| SN-35 | Separar stats **cash vs torneo** cuando import MTT crezca | P2 | M | Filtro en dashboard |

**Estado:** P-02/P-03 hechos (progreso semanal + top 5) · SN-30–32 amplían lo existente.

---

### PILAR E — Escenarios y rangos (copiar: Scenario Manager + Range Advisor)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-40 | **What-if en mano importada**: editar acción/carta y re-evaluar | P1 | L | Desde repaso sesión; no requiere editor de mesa completo |
| SN-41 | **Escenario manual mínimo**: posición, board, pot, stacks → consejo | P2 | L | Nueva pestaña o modal “Probar spot” |
| SN-42 | Range grid postflop **simplificado** (fold/call/raise freq por combo top) | P2 | XL | Solo spots heads-up flop definidos; disclaimer heurístico |
| SN-43 | Preflop advisor: **toggle sizing** (2.5x vs 3x) en explorador rangos | P1 | M | Extender `range-matrix.js` |
| SN-44 | Guardar **spots favoritos** para repetir en entrenador | P2 | M | Lista en Errores o nuevo “Mis spots” |

**Estado:** Explorador preflop existe · what-if y escenario manual **no existen**.

---

### PILAR F — Experiencia producto (copiar: apps + warmup + velocidad)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| SN-50 | **PWA** instalable (P-05): manifest + iconos + offline shell | P1 | M | “Añadir a inicio” en móvil; login requiere red |
| SN-51 | Atajo **“Calentamiento 15 min”** desde home | P1 | S | Lanza SN-14 con 50 manos y consejo ON |
| SN-52 | **Hotkeys** entrenador (F/C/R, flechas calle en repaso) | P2 | M | Documentado en ayuda |
| SN-53 | Modo **sin rake / rake configurable** en entrenador | P2 | S | Alineado con Snowie custom cash |
| SN-54 | Tabla comparativa **PokerForgeAI vs Snowie** en landing (G-02) | P0 | S | Honesta; destaca ES, precio, IA Coach |

**Estado:** PWA y calentamiento pendientes.

---

## 4. Fases de entrega

### Fase 1 — “Puedo probarlo y entrenar como Snowie” (4–5 semanas) `P0`

```
SN-01 → SN-02 → SN-03 → SN-10 → SN-11 → SN-12 → SN-30 → SN-54
```

**Definition of Done Fase 1:**
- Trial 10 días activo en producción
- Consejo en vivo opcional en entrenador
- Error rate visible en estadísticas
- Landing con comparativa vs Snowie

### Fase 2 — “Me quedo por sesiones e import” (3–4 semanas) `P1`

```
SN-14 → SN-15 → SN-20 → SN-21 → SN-22 → SN-31 → SN-32 → SN-40 → SN-43 → SN-50 → SN-51
```

**Definition of Done Fase 2:**
- Bloques de 50 manos seguidas
- Import GG + multi-archivo
- What-if básico en manos importadas
- PWA + calentamiento 15 min

### Fase 3 — “Paridad amplia” (3+ semanas) `P2`

```
SN-13 → SN-33 → SN-41 → SN-42 → SN-44 → SN-23 → SN-34 → SN-52 → SN-53
```

---

## 5. Métricas de éxito (EPIC 10)

| Métrica | Baseline | Objetivo 90 días post Fase 1 |
|---------|----------|------------------------------|
| Activación trial | — | ≥ 25 % registros activan trial |
| Conversión trial → pago | — | ≥ 12 % (Snowie no publica; benchmark SaaS 10–15 %) |
| Manos entrenador / usuario activo / semana | medir | +40 % vs pre SN-14 |
| Sesiones importadas / usuario de pago | medir | ≥ 2/mes |
| Churn mensual Study | — | < 8 % |
| NPS o encuesta “¿sustituye a Snowie?” | — | ≥ 30 % “sí” en usuarios que conocían Snowie |

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Copiar advisor sin rigor EV | Reutilizar `GTO.EvLoss`; tests regresión Poker76 |
| Scope del escenario manual (SN-41) | Limitar a HU flop; no clonar editor Snowie |
| GG parser mantenimiento | Fixtures en CI; versionar formato sala |
| Prometer paridad GTO | Copy: “consejo heurístico”, no “solver Snowie” |
| Coste IA si trial incluye Coach | Trial solo **Study**; Coach con 3 informes trial |

---

## 7. Relación con otras épicas

| Épica | Relación |
|-------|----------|
| EPIC 3 Monetización | SN-01/02/03 extienden M-06/M-07 |
| EPIC 5 Retención | P-02/P-03 hechos; SN-30–32 amplían |
| EPIC 6 Import | I-01/I-02 parcial; SN-20/21/22 completan |
| EPIC 8 IA Coach | No duplicar Live Advisor con IA; Coach = informes profundos |
| EPIC 4 GTM | SN-54 alimenta G-02 landing |

---

## 8. Issues GitHub sugeridos (títulos)

1. `[EPIC-10] SN-01: Trial 10 días Study con Stripe trialing`
2. `[EPIC-10] SN-10–12: Live Advisor en entrenador`
3. `[EPIC-10] SN-14: Modo sesión 50 manos`
4. `[EPIC-10] SN-20: Parser GGPoker`
5. `[EPIC-10] SN-30–32: Dashboard leaks por calle y spot`
6. `[EPIC-10] SN-40: What-if en mano importada`
7. `[EPIC-10] SN-50–51: PWA + calentamiento 15 min`
8. `[EPIC-10] SN-54: Tabla comparativa Snowie en landing`

---

## 9. Mensaje de posicionamiento (post EPIC 10)

> **PokerForgeAI** — Entrena con consejo en vivo, importa PokerStars y Winamax, detecta fugas y profundiza con IA Coach. En español, desde el navegador, desde ~15 €/mes.  
> Snowie cuesta el doble en mensual y no habla tu idioma; GTO Wizard cuesta 3–10× y es un solver, no un compañero de sesiones reales.

---

*Documento creado: julio 2026 · Competidor de referencia: [PokerSnowie](https://pokersnowie.com/) · [Reseña comparativa 2026](https://pokercorner.io/en/tools/pokersnowie)*
