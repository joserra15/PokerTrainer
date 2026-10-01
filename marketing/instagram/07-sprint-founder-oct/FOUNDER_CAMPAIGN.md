# Campaña FOUNDER — octubre 2026

## Oferta (solo octubre · cierra 31 oct)

| Plan | Habitual | **FOUNDER (−40%)** |
|------|----------|---------------------|
| Study | 14,99 €/mes · 119 €/año (9,92 €/mes) | **8,99 €/mes · 71,40 €/año (5,95 €/mes)** |
| Coach | 34,99 €/mes · 279 €/año (23,25 €/mes) | **20,99 €/mes · 167,40 €/año (13,95 €/mes)** |

### Qué recibe quien solicita plaza

1. **Prueba gratis 10 días** del plan que elija (Study **o** Coach).  
   - Activación **manual** (DM / solicitud en Planes → admin activa).  
   - Aplica a **ambos** planes.
2. Al pasar a pago: **−40 % para siempre** (precio FOUNDER locked mientras la suscripción siga activa).
3. **Plazas limitadas** — solo octubre; el **31 de octubre** se cierra **para siempre**.

### CTAs canónicos (Instagram)

| Momento | CTA |
|---------|-----|
| Soft / valor | 5 manos gratis → link en bio |
| FOUNDER | **Solicita FOUNDER → 10 días gratis del plan que elijas** |
| DM rápido | Escribe **FOUNDER** por privado |
| Plan concreto | Solicitar plaza FOUNDER Study / Coach |

### Puente producto

- **FOUNDER Coach** = Torneos **Pro · MTT / Spin / SNG** + más ForgeCoach  
- Study = entrenar/import ilimitados · sync · ForgeCoach base  

Disclaimer: +18 · herramienta educativa · juega responsablemente

---

## Ops (activación manual)

Cuando alguien solicita plaza (botón Planes o DM **FOUNDER**):

1. Confirmar plan elegido: **Study** o **Coach**.
2. Activar **10 días** de acceso al plan (manual).
3. Avisar por DM/email: fecha de fin de prueba + precio FOUNDER si continúa.
4. Al convertir: marcar `is_founder_study` / `is_founder_coach` (−40 % locked).
5. Anotar en sheet: fecha solicitud · plan · fin prueba · convertido sí/no.

No mezclar con el lote frío `08-reel-aprende-cero` (DM **APRENDER** = 1 mes gratis desde cero). Keywords distintas:

| Keyword DM | Oferta |
|------------|--------|
| **FOUNDER** | 10 días del plan elegido + −40 % forever (solo octubre) |
| **APRENDER** | 1 mes gratis “desde cero” (audiencia fría) |

---

## Assets

| Archivo | Uso |
|---------|-----|
| `assets/founder/founder-announce-1oct.jpg` | Carrusel 1/3 · anuncio (letras grandes · 3:4) |
| `assets/founder/founder-que-es-1oct.jpg` | Carrusel 2/3 · qué es FOUNDER (−40% + 10 días) |
| `assets/founder/founder-plazas-1oct.jpg` | Carrusel 3/3 · plazas limitadas + CTA |
| `assets/founder/founder-teaser-1oct.jpg` | Soft launch / teaser precios |
| `assets/founder/founder-launch-1oct.jpg` | Launch feed |
| `assets/founder/founder-precios.jpg` | Stories / carrusel precios |
| `assets/founder/founder-urgencia.jpg` | Cierres de urgencia (5 oct · 24–31 oct) |

Carrusel premium 3:4 (mismo lenguaje visual que los covers B15–B21). No se regenera con el HTML de `tools/instagram-sprint-founder-assets.js`.

| # | Archivo | Texto clave (actualizar si regeneras) |
|---|---------|----------------------------------------|
| 1 | `founder-announce-1oct.jpg` | FOUNDER · Solo octubre |
| 2 | `founder-que-es-1oct.jpg` | 10 días gratis · luego −40% para siempre |
| 3 | `founder-plazas-1oct.jpg` | Plazas limitadas · DM FOUNDER / link en bio |

---

## Banco de copy

### Soft / teaser
```
FOUNDER · solo octubre

10 días gratis del plan que elijas (Study o Coach).
Luego −40% para siempre · plazas limitadas.

Study 8,99€ · Coach 20,99€
DM: FOUNDER · o link en bio
```

### Launch
```
FOUNDER ya está aquí

Solicita plaza → 10 días gratis (Study o Coach).
Si te quedas: −40% para siempre.

Study 8,99€/mes · Coach 20,99€/mes
Plazas limitadas · cierra 31 oct

Solicita → link en bio · o DM FOUNDER
```

### Sostenimiento (oct 6–19)
```
¿Study o Coach?

Pídelo FOUNDER → 10 días gratis del que elijas.
Activación manual. Sin compromiso los primeros 10 días.
Si continúas: precio locked −40%.

Solo octubre.
```

### Urgencia (oct 24–31)
```
FOUNDER cierra el 31 de octubre. Para siempre.

Últimas plazas · 10 días gratis · −40% locked.
¿Study o Coach? Comenta o DM FOUNDER.
```

### Stories countdown

| Ventana | Texto sticker |
|---------|----------------|
| 1–5 oct | HOY / plazas abiertas · 10 días gratis |
| 6–19 oct | FOUNDER abierto · DM FOUNDER |
| 20–23 oct | Queda 1 semana · −40% forever |
| 24–27 oct | Faltan X días · 10 días gratis |
| 28–30 oct | Mañana / 2 días · última llamada |
| 31 oct | ÚLTIMO DÍA · solicita ya |

---

## UTM

```
?utm_source=instagram&utm_medium=bio&utm_campaign=founder_oct1
?utm_source=instagram&utm_medium=bio&utm_campaign=founder_trial10
?utm_source=instagram&utm_medium=story&utm_campaign=founder_close31
```

Stories CTA cada 3ª en octubre: “10 días gratis · DM FOUNDER” o “Solicitar plaza · link”.

## Relación con producto

`js/billing-config.js` → `founder.launchDate: '2026-10-01'`, `closeDate: '2026-10-31'`, `seatsOpen`.  
La prueba de 10 días **no** es el trial Stripe automático: es **activación manual** tras solicitud DM/Planes.
