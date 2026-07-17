# Estudio de cuotas IA — planes y bonos

> Objetivo: subir consultas incluidas y packs **sin cambiar precios**, manteniendo la escalera Free → Study → Coach y un margen sano frente al coste real de Gemini.

## 1. Situación actual

| Producto | Consultas | Precio |
|----------|-----------|--------|
| Gratis | 0 / mes | €0 |
| Study | **5** / mes | €14,99/mes · €119/año |
| Coach | **35** / mes | €34,99/mes · €279/año |
| Pack S | **10** | Gratis €7,99 · Study €5,99 · Coach €3,99 |
| Pack M | **20** | Gratis €13,99 · Study €9,99 · Coach €6,99 |
| Pack L | **40** | Gratis €22,99 · Study €15,99 · Coach €11,99 |

Problema: 5 y 35 se sienten escasos (reintentos cuando la IA falla, estudio real de sesión). El coste variable no justifica cupos tan bajos.

## 2. Coste real

Dato operativo: **92 consultas ≈ €0,22** → **~€0,0024 / consulta**.

| Cupo | Coste @ €0,0024 | Coste buffer ×5 (€0,012) | vs ingreso |
|------|-----------------|--------------------------|------------|
| Study 40 | €0,10 | €0,48 | 0,6%–3% de €14,99 |
| Coach 150 | €0,36 | €1,80 | 1%–5% de €34,99 |
| Pack L 80 (peor margen, Gratis) | €0,19 | €0,96 | 0,8%–4% de €22,99 |

El límite de diseño **no es el margen**: incluso con buffer ×5 el coste es irrelevante frente al precio. El límite es la **economía de upgrade** (que compensen Study y Coach frente a bonos).

> Nota: el estudio de mercado antiguo usaba ~€0,06/informe. Con el coste medido hay ~25× de holgura; no hace falta anclar cupos a esa cifra.

## 3. Reglas de diseño

1. **Free → Study:** para un uso mensual ≈ cupo Study, Free+bonos no debe salir más barato en IA *y* además Study aporta entrenador/import ilimitados.
2. **Study → Coach:** Study + un Pack L no debe igualar o superar el cupo Coach a menor precio.
3. **Pack S < cupo Study** (en el tier Free), para que el primer pack no sustituya la suscripción.
4. **Pack M (Free) ≤ cupo Study** cuando el precio del pack ≈ precio Study (±€1).
5. Números redondos y salto percibido claro (×2 packs, Study ×8, Coach ×4).

## 4. Propuesta recomendada (mismo precio)

| Producto | Antes | **Ideal** | Ratio |
|----------|-------|-----------|-------|
| Study | 5 | **40** / mes | ×8 |
| Coach | 35 | **150** / mes | ×4,3 |
| Pack S | 10 | **20** | ×2 |
| Pack M | 20 | **40** | ×2 |
| Pack L | 40 | **80** | ×2 |

### Por qué estos números

**Study = 40**

- ~1,3 consultas/día o una sesión seria con margen para reintentos.
- Pack S Free (20) < 40 → el pack pequeño no sustituye Study.
- Pack M Free (40) a €13,99 ≈ Study €14,99 con **las mismas** consultas IA → Study gana por +€1 y por entrenador/import/sync ilimitados. Cumple Free→Study.
- Coste techo irrelevante (~€0,10–0,48).

**Coach = 150**

- Delta vs Study = **110** consultas.
- Study + Pack L = 40+80 = **120** a €14,99+€15,99 = **€30,98** vs Coach **150** a **€34,99** → Coach da **+30 consultas por +€4** y además bonos más baratos después. Cumple Study→Coach.
- Study + 2× Pack M = 40+80 = 120 a €34,97 ≈ precio Coach pero con **menos** cupo (120 vs 150) → Coach sigue compensando.
- Cubre un mes intenso (referencia: 92 consultas) con holgura para errores/reintentos (~60% extra).
- Coste techo ~€0,36–1,80 frente a €34,99.

**Packs 20 / 40 / 80**

- Doblar el volumen al mismo precio = mensaje claro de generosidad.
- Sigue la escala 1× / 2× / 4× (fácil de entender).
- Pack L no “puentea” Coach en un solo golpe (regla 2).
- En Coach, el €/consulta del Pack L baja a ~€0,15 (antes ~€0,30) — premio por estar en el plan alto sin romper la escalera.

## 5. Comprobaciones de escalera (mensual)

### Free vs Study (uso ~40 IA/mes)

| Opción | Consultas | Coste | Extra |
|--------|-----------|-------|-------|
| Free + Pack M | 40 | €13,99 | Límites free (entrenador/import) |
| Free + Pack L | 80 | €22,99 | Idem |
| **Study** | **40** | **€14,99** | Entrenador + import ilimitados |

→ Para quien quiere ~40 IA/mes de forma recurrente, Study es la elección racional. Free+L solo tiene sentido como stock puntual, no como sustituto mensual.

### Study vs Coach (uso ~120–150 IA/mes)

| Opción | Consultas | Coste |
|--------|-----------|-------|
| Study + Pack L | 120 | €30,98 |
| Study + Pack L + Pack S | 140 | €36,97 |
| **Coach** | **150** | **€34,99** |

→ A partir de ~120–150 consultas/mes, Coach compensa frente a Study+bonos. Por debajo, Study+bono sigue siendo válido (top-up puntual), que es lo deseable.

### Anual (delta Study→Coach ≈ €13,33/mes equiv.)

Un solo Pack L Study (€15,99 / 80) ya cuesta más que el salto anual a Coach por menos cupo incluido que Coach. El anual refuerza Coach.

## 6. Alternativas descartadas

| Opción | Motivo de descarte |
|--------|-------------------|
| Study 25 / Coach 100 / packs 20·40·80 | Study+L (105) ≈ Coach (100) a menos precio → rompe Study→Coach |
| Study 50 / Coach 200 / packs 25·50·100 | Válida y más generosa; Pack M Free (50) a €13,99 supera Study (50) en IA → Free gana en puro volumen. Exige subir Study ≥50 y ajustar. Más agresiva de lo necesario |
| Study 30 / Coach 120 / packs 15·30·60 | Cumple escalera pero 15 en Pack S sigue “corto” frente a reintentos; menos atractiva |
| Coach 100 con packs actuales ×2 (20·40·80) | Study 40 + L 80 = 120 > Coach 100 barato → rompe escalera |

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Power users Free viven de Pack L | Aceptable: no tienen entrenador/import ilimitados; Study sigue siendo el upgrade natural |
| Abuso / coste pico | Cupos siguen acotados; coste unitario bajo; alertas O-02 siguen en backlog |
| Expectativa de “IA ilimitada” | 150 no es ilimitado; el paywall + bonos Coach baratos mantienen control |
| Bonos ya comprados (10/20/40) | No se recalculan; solo compras nuevas reciben 20/40/80 |

## 8. Decisión

**Implementar:** Study **40**, Coach **150**, packs **20 / 40 / 80**, mismos precios.

Justificación en una frase: el coste real (~€0,0024/consulta) permite ser generosos; los números elegidos maximizan percepción de valor y reintentos sin romper Free→Study ni Study→Coach.
