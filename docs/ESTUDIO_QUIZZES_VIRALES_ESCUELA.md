# Estudio: quizzes virales y entrenamientos Escuela / Entrenador

> Producto: PokerForgeAI · Escuela de Póker · Agosto 2026  
> Complementa: [`ROADMAP_ESCUELA_RANGOS.md`](ROADMAP_ESCUELA_RANGOS.md), [`marketing/instagram/`](../marketing/instagram/)

---

## Resumen

Nuevos formatos MCQ para la Escuela, optimizados para **habilidad en mesa** y **share sin spoiler en IG**. Se reutiliza el runner de [`js/school-matrix-drills.js`](../js/school-matrix-drills.js) y las tarjetas 1080×1080 de [`js/school-share.js`](../js/school-share.js).

| Quiz existente | Habilidad | Share IG |
|----------------|-----------|----------|
| `villainQuiz` | Lectura de línea → eliminar combos | Alta |
| `rangeAdvQuiz` | Ventaja de rango en flop | Media–alta |
| **`decisionQuiz`** | Fold / call / raise nodal | Muy alta |
| **`oddsQuiz`** | Pot odds y call correcto | Alta |
| **`blockerQuiz`** | Elegir mano con mejor blocker | Alta |

Lecciones piloto: **D-01**, **D-02**, **O-01**, **B-01** en [`js/school-data-viral-quizzes.js`](../js/school-data-viral-quizzes.js).

---

## Schema: `decisionQuiz`

Spot donde el alumno elige **Fold**, **Call** o **Raise** tras ver línea + board + cartas del héroe.

```javascript
{
  id: 'd01-01',
  kind: 'decisionQuiz',
  seed: 84001,
  heroPos: 'BTN',
  teachBack: 'Explicación breve post-respuesta.',
  quiz: {
    prompt: '¿Qué haces en river?',
    line: 'BTN open → BB call · Flop c-bet 33% → call · Turn bet 75% pot → call · River bet 75% pot',
    lineStory: [
      { street: 'Preflop', text: 'BTN open 2,5 bb → BB call' },
      { street: 'Flop', text: 'BTN c-bet 33% pot · BB call' }
    ],
    board: ['As', 'Kd', '7c', '2h', '5d'],
    heroCards: ['Ah', 'Qd'],
    villainPos: 'BB',
    options: [
      { id: 'fold', label: 'Fold' },
      { id: 'call', label: 'Call' },
      { id: 'raise', label: 'Raise' }
    ],
    correctId: 'fold',
    teachBack: 'Opcional; si falta, usa spot.teachBack.'
  }
}
```

**Grading:** acierto = `optima`; fallo = `error`.  
**Share:** tarjeta sin spoiler con F / C / R visibles + caption «Comenta F, C o R».

---

## Schema: `oddsQuiz`

```javascript
{
  id: 'o01-01',
  kind: 'oddsQuiz',
  seed: 85001,
  teachBack: '...',
  quiz: {
    prompt: '¿Tienes pot odds para call?',
    potBB: 100,
    betBB: 75,
    draw: 'Flush draw · 9 outs',
    heroCards: ['Ah', 'Kh'],
    board: ['Qh', '7h', '2c', 'Jd'],
    options: [
      { id: 'yes', label: 'Sí · call correcto' },
      { id: 'no', label: 'No · fold' },
      { id: 'depends', label: 'Depende · implied odds' }
    ],
    correctId: 'yes',
    requiredPct: 30,
    equityPct: 36
  }
}
```

**Share:** pot, bet y draw visibles; sin revelar sí/no.

---

## Schema: `blockerQuiz`

```javascript
{
  id: 'b01-01',
  kind: 'blockerQuiz',
  seed: 86001,
  teachBack: '...',
  quiz: {
    prompt: 'Villano apuesta river. ¿Con cuál faroleas?',
    board: ['As', 'Kd', '7c', '2h', '3d'],
    villainAction: 'Bet 75% pot',
    options: [
      { id: 'a', label: 'Ah5h', cards: ['Ah', '5h'] },
      { id: 'b', label: 'KhQh', cards: ['Kh', 'Qh'] },
      { id: 'c', label: '9h8h', cards: ['9h', '8h'] }
    ],
    correctId: 'a'
  }
}
```

**Share:** board + 3 manos del héroe; sin respuesta.

---

## Daily Spot

Módulo [`js/school-daily-spot.js`](../js/school-daily-spot.js):

- 1 spot/día determinista (seed = fecha ISO `YYYY-MM-DD`).
- Pool rotativo desde lecciones virales + rangeAdv + villain (muestra).
- Racha en `stats.school.dailySpot` (current / best / lastDay).
- Tarjeta en hub Escuela + share sin spoiler.
- +15 XP al acertar (1 intento contado por día).

---

## Gates de plan

| Lección | Plan | Ruta |
|---------|------|------|
| D-01 · Fold/Call/Raise I | Study | Cash M2 |
| D-02 · Fold/Call/Raise II (3BP) | Study | Cash M2 |
| O-01 · Pot odds | Study | Cash M2 |
| B-01 · Blockers en acción | Study | Rangos M1 |

---

## Calendario IG sugerido

| Día | Formato | Caption |
|-----|---------|---------|
| Lunes | `decisionQuiz` | «Comenta F, C o R 👇» |
| Miércoles | `oddsQuiz` | «¿Call o fold? Pot X, bet Y…» |
| Viernes | `villainQuiz` / `blockerQuiz` | «¿Qué tiene? / ¿Con cuál faroleas?» |
| Story | Poll binario | open/fold, sí/no odds |

UTM: `?utm_source=instagram&utm_medium=social&utm_campaign=escuela_daily`

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `js/school-data-viral-quizzes.js` | Lecciones D/O/B + packs + pool daily |
| `js/school-matrix-drills.js` | Runners MCQ + grading |
| `js/school-share.js` | Tarjetas 1080 sin spoiler |
| `js/school-daily-spot.js` | Hub daily + racha |
| `js/school.js` | Integración hub |
| `tools/test-school.js` | Contratos currículum |
| `tools/test-school-share.js` | Contratos share |
