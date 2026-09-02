# Precios PokerForgeAI — texto para clientes

Fuente de los importes: `js/billing-config.js` (`PT_BILLING.plans`, `PT_BILLING.bonus`, `PT_BILLING.founder`) y `docs/BILLING.md`.
Si cambian los precios en `billing-config.js`, este documento hay que actualizarlo.

---

## 1. Texto listo para enviar a clientes

### Planes

**Gratis — 0 €**
Para probar el producto entero sin tarjeta:

- 15 manos de entrenador al día
- 1 sesión de import al mes (máximo 200 manos)
- 5 manos en el analizador (solo manuales)
- 3 consultas de ForgeCoach al mes, de prueba
- Histórico de 30 días

**Study — 14,99 €/mes o 119 €/año**

- Entrenador e import **ilimitados**
- 20 manos en el analizador
- 40 consultas de ForgeCoach al mes (añadir manos, análisis y preguntas)
- Sincronización en la nube, estadísticas y repaso
- Histórico completo
- Prueba de 10 días, una vez por cuenta

**Coach — 34,99 €/mes o 279 €/año**

- Todo lo de Study
- 100 manos en el analizador
- 150 consultas de ForgeCoach al mes
- Informes y preguntas sobre manos, análisis y sesiones
- Soporte prioritario

### Cuánto te queda el mes según cómo pagues

| Plan | Pagando mensual | Pagando anual | Con plaza FOUNDER (−40 %) mensual | Con plaza FOUNDER (−40 %) anual |
|------|-----------------|---------------|-----------------------------------|---------------------------------|
| **Study** | 14,99 €/mes | **9,92 €/mes** (119 €/año) | **8,99 €/mes** | **5,95 €/mes** (71,40 €/año) |
| **Coach** | 34,99 €/mes | **23,25 €/mes** (279 €/año) | **20,99 €/mes** | **13,95 €/mes** (167,40 €/año) |

Lo que ahorras respecto a pagar mes a mes al precio de tarifa:

| Plan | Anual | FOUNDER mensual | FOUNDER anual |
|------|-------|-----------------|---------------|
| **Study** (179,88 €/año a precio mensual) | −60,88 €/año (−34 %) | −71,95 €/año (−40 %) | **−108,48 €/año (−60 %)** |
| **Coach** (419,88 €/año a precio mensual) | −140,88 €/año (−34 %) | −167,95 €/año (−40 %) | **−252,48 €/año (−60 %)** |

En una frase: **el pago anual te quita un tercio del precio, la plaza FOUNDER te quita el 40 %, y las dos cosas juntas dejan Study en 5,95 €/mes y Coach en 13,95 €/mes.**

### Plan FOUNDER (40 % de descuento)

- 40 % de descuento sobre el precio del plan, tanto en mensual como en anual.
- Disponible para **FOUNDER Study** y **FOUNDER Coach**.
- **Plazas limitadas por petición**: se solicita desde la web (botón «Solicitar plaza FOUNDER Study / Coach») y revisamos cada solicitud en soporte.
- Se activa con el lanzamiento de FOUNDER (próximamente); mientras tanto las compras están cerradas.

### Bonos de consultas IA (pago único)

Se compran sueltos y se consumen **después** de las consultas incluidas en tu plan. Válidos 12 meses, sin renovación automática.
El precio del bono depende de tu plan: cuanto mejor es el plan, más barato el bono.

| Pack | Consultas | Plan Gratis | Plan Study | Plan Coach |
|------|-----------|-------------|------------|------------|
| Pack S | 20 | 7,99 € | 5,99 € | 3,99 € |
| Pack M | 40 | 13,99 € | 9,99 € | 6,99 € |
| Pack L | 80 | 22,99 € | 15,99 € | 11,99 € |

Precio por consulta: entre 0,40 € (Pack S en Gratis) y 0,15 € (Pack L en Coach).

### Condiciones

- Precios en euros. Sin permanencia: puedes cambiar de mensual a anual, subir o bajar de plan y cancelar cuando quieras desde el portal de cliente.
- El pago anual se cobra de una vez al inicio del año de suscripción.
- La prueba de Study son 10 días y solo puede usarse una vez por cuenta.
- Ahora mismo las compras están **pausadas**: el plan Gratis funciona con normalidad y Study, Coach y bonos se abren con el lanzamiento FOUNDER.

---

## 2. Detalle de cálculo (referencia interna)

### Study (`pro`)

| Concepto | Importe |
|----------|---------|
| Mensual | 14,99 €/mes · 179,88 €/año |
| Anual | 119 €/año · **9,92 €/mes** equivalente · ahorro 60,88 €/año (33,8 %) |
| FOUNDER mensual (−40 %) | 8,99 €/mes · 107,88 €/año · ahorro 71,95 €/año |
| FOUNDER anual (−40 %) | 71,40 €/año · **5,95 €/mes** equivalente · ahorro 108,48 €/año frente a mensual de tarifa (60,3 %) |

### Coach (`premium`)

| Concepto | Importe |
|----------|---------|
| Mensual | 34,99 €/mes · 419,88 €/año |
| Anual | 279 €/año · **23,25 €/mes** equivalente · ahorro 140,88 €/año (33,6 %) |
| FOUNDER mensual (−40 %) | 20,99 €/mes · 251,88 €/año · ahorro 167,95 €/año |
| FOUNDER anual (−40 %) | 167,40 €/año · **13,95 €/mes** equivalente · ahorro 252,48 €/año frente a mensual de tarifa (60,1 %) |

El descuento anual que muestra la UI se calcula en `js/billing.js` (`1 - anual / (mensual × 12)`), por eso ambos planes salen al 34 %.

### Notas pendientes de decisión

- El cupón **FOUNDER** todavía no existe en Stripe (`docs/BILLING.md`: «para reabrir cobros, `purchasesPaused: false` y cupón Stripe FOUNDER»). Las cifras de arriba asumen **descuento recurrente mientras la suscripción siga activa** (`duration: forever`). Si se decide aplicarlo solo al primer periodo —como el cupón SUMMER26, que solo descuenta el primer mes—, hay que reescribir el bloque FOUNDER del texto para clientes.
- Impuestos: hoy los importes se comunican tal cual y Stripe Tax no está activado. Cuando se active, conviene añadir si los precios son con IVA incluido o se suma en el checkout.
