# PokerForgeAI · Cash NL 6-max

Aplicación web (JavaScript puro, sin dependencias ni build) para entrenar
decisiones **pre-flop y post-flop** de poker No-Limit Hold'em basadas en GTO,
centrada en **Cash 6-max a 100bb**.

El héroe va rotando de posición y de spot, juega la mano contra un villano y al
final recibe una valoración del **EV perdido/ganado**, si sus decisiones fueron
correctas y **qué cartas tenía el villano**. Todo se guarda en `localStorage`:
un histórico de manos y un registro de errores para repetir esos spots.

## Login con Google

La app requiere **iniciar sesión con Google** antes de usar cualquier pestaña.
Los datos (histórico, errores, sesiones importadas) se guardan **por cuenta** y se
sincronizan con Supabase si está configurado (`js/supabase-config.js`).

### Configurar OAuth (una sola vez)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto
   (o usa uno existente).
2. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth**
   - Tipo: **Aplicación web**
   - Orígenes autorizados de JavaScript (**sin ruta**, solo dominio):
     - `http://localhost`
     - `http://127.0.0.1`
     - `https://joserra15.github.io`
   - URIs de redirección autorizados (opcional para el botón GIS, pero recomendado):
     - `https://joserra15.github.io/PokerTrainer/`
3. **Pantalla de consentimiento OAuth** (menú lateral):
   - Tipo de usuario: **Externo**
   - Nombre de la app: `PokerForgeAI`
   - Email de asistencia y contacto del desarrollador
   - Si el estado es **Prueba**: en *Usuarios de prueba* añade tu Gmail (`joserra15@gmail.com`)
4. Copia el **Client ID** (termina en `.apps.googleusercontent.com`).
5. Edita `js/google-config.js` (plantilla en `js/google-config.example.js`):

```javascript
window.PT_GOOGLE = {
  clientId: 'TU_CLIENT_ID.apps.googleusercontent.com'
};
```

5. Despliega o abre `index.html`. Verás la pantalla de login y el botón de Google.

### Error 400: invalid_request

Casi siempre es configuración en Google Cloud, no un bug de la app:

| Causa | Solución |
|-------|----------|
| Origen mal puesto | Usa `https://joserra15.github.io` **sin** `/PokerTrainer` |
| Cliente OAuth incorrecto | Debe ser tipo **Aplicación web**, no Android/iOS |
| App en modo Prueba | Añade tu Gmail en *Usuarios de prueba* |
| Consentimiento incompleto | Rellena nombre, emails y guarda la pantalla de consentimiento |
| Brave / bloqueadores | Desactiva el escudo para `joserra15.github.io` |

La pantalla de login muestra el origen exacto que debes registrar.

En la barra superior, el **menú de cuenta** (avatar + correo) muestra nombre,
email, verificación e ID de Google. **Cerrar sesión** vuelve a la pantalla de login.

## Cómo ejecutarla

No necesita servidor ni instalación. Abre el archivo:

```
index.html
```

directamente en el navegador (doble clic). Funciona offline y es **responsive**:
se adapta a escritorio, **tablet y móvil** (los controles se apilan y las cartas
se reescalan en pantallas pequeñas).

> Recomendado: Chrome, Edge o Firefox actualizados.

## Qué entrena

### Spots pre-flop
- **RFI (Raise First In)**: abrir o foldear desde UTG, HJ, CO, BTN o SB.
- **Frente a un open (vs RFI)**: fold / call / 3-bet, en muchos enfrentamientos
  (BB vs cada posición, SB vs LP, BTN/CO/HJ vs posiciones anteriores).
- Líneas de **3-bet / 4-bet / all-in** cuando el villano vuelve a subir.

### Spots post-flop
Si la mano continúa, se reparte flop, turn y river. En cada calle eliges
**check/bet** o **fold/call/raise**, y el villano responde con una estrategia
coherente según la textura del board y su mano concreta. La equity del héroe
contra el rango del villano se estima por Monte Carlo.

## Valoración de cada decisión

Cada acción se clasifica frente a la estrategia GTO de referencia:

| Clase | Significado |
|-------|-------------|
| **Óptima** | Jugada GTO de mayor frecuencia |
| **Aceptable** | Opción GTO secundaria (mezcla válida) |
| **Imprecisa** | Jugada de baja frecuencia / EV ligeramente peor |
| **Error** | Jugada fuera de estrategia, EV claramente peor |

Se muestra el **EV perdido estimado** (en bb) y las **frecuencias GTO** del spot.
Al terminar la mano se revela la mano del villano, el board, el resultado en bb
y el EV total perdido por errores.

## Repetir la mano

Con **"Repetir esta mano"** (en la barra lateral y al terminar) vuelves a jugar
el **mismo spot con las mismas cartas**: cada mano lleva una *semilla*, así que
el reparto es reproducible. Si tomas la misma línea, el board y la mano del
villano serán idénticos; ideal para reintentar un spot en el que te equivocaste.
También puedes repetir manos exactas desde el **Histórico** y los **Errores**.

## Importar sesiones reales de PokerStars

En la pestaña **Sesiones** puedes adjuntar un fichero `.txt` con el historial de
manos exportado de PokerStars (Cash NL Hold'em, en español) y pulsar **Procesar**:

- Detecta automáticamente al **héroe** (el nombre cuyas cartas se reparten).
- Recorre todas las manos de cash NL, **analiza cada mano del héroe con cartas**
  (incluidos folds preflop) y descarta solo las de torneo o sin reparto al héroe.
- Clasifica **cada decisión** del héroe contra GTO (óptima / aceptable /
  imprecisa / error), estima el **EV perdido** y el resultado en bb por mano.
- Genera una **ficha de sesión** con estadísticas: acierto global y **por calle**,
  bb ganadas/perdidas, **5 mejores y 5 peores manos**, reparto de EV perdido
  **por decisiones vs varianza** y una **nota final** (A+…E).

### Revisión de manos
Dentro de una sesión puedes **ordenar** las manos (por EV perdido, acierto o bb)
y revisar cada una de dos formas:
- **Paso a paso**: la línea real calle a calle, con la evaluación GTO de cada
  decisión del héroe y las cartas mostradas por los rivales.
- **Volver a jugar**: rejuegas tus decisiones una a una y se evalúan de nuevo
  con GTO, comparando con lo que hiciste en la mano real.

Cada sesión permite **borrar el txt** (conservando la ficha) o **borrar la
sesión** completa. Todo se guarda en `localStorage`.

> Nota: el análisis usa los mismos rangos/heurísticas GTO aproximados del
> entrenador. Es una guía de estudio, no una salida exacta de solver.

## Persistencia (localStorage)

- **Histórico**: todas las manos jugadas con su resultado y decisiones. Puedes
  exportarlas a JSON o repetir el spot.
- **Errores**: cada decisión imprecisa o errónea se guarda como spot a repasar.
  Desde la pestaña *Errores* puedes "Repetir" un spot concreto, o activar
  *Repetir mis spots fallados* en la pestaña de juego.
- **Estadísticas**: manos jugadas, % de acierto, resultado total y distribución
  de la calidad de tus decisiones.

## Sincronización en la nube (Supabase)

Al iniciar sesión, la app sincroniza **histórico, errores, estadísticas y sesiones
importadas** con Supabase. Los ficheros `.txt` de sesiones **no** se suben (solo el
análisis procesado); el `.txt` sigue en `localStorage` del dispositivo donde lo importaste.

- **Nube = fuente de verdad** al iniciar sesión (gana el dato más reciente por tipo).
- **localStorage = caché** local; cada cambio se guarda aquí y se sube a la nube (debounce 2 s).
- Menú de cuenta → fila **Nube**: estado de sincronización.

### Configurar Supabase (una vez)

1. Copia `js/supabase-config.example.js` → `js/supabase-config.js` y rellena `url`, `anonKey`, `enabled: true`, `useAuth: true`.
2. En Supabase → **SQL Editor**, ejecuta `supabase/schema.sql` y `supabase/migrations/002_production_rls.sql`.
3. Activa **Google** en Authentication y configura redirect URLs (ver [`docs/SUPABASE_AUTH.md`](docs/SUPABASE_AUTH.md)).
4. Despliega la Edge Function `analyze-hand` con secrets `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
5. Prueba:

```
node tools/test-supabase.js
```

6. Recarga la app e inicia sesión con Google (vía Supabase Auth).

> **RLS (EPIC 2):** solo usuarios autenticados acceden a su fila en `pt_user_state`. El IA Coach requiere sesión (JWT), sin token en el cliente.

## Estructura del proyecto

```
index.html          Estructura y pestañas
css/styles.css      Estilos (mesa, cartas, paneles)
js/cards.js         Cartas, baraja y evaluador de manos de 5-7 cartas
js/ranges.js        Rangos GTO + expansor de notación de poker
js/engine.js        Generador de spots, evaluación GTO, EV y juego de la mano
js/storage.js       Histórico, errores y estadísticas (local + sync nube)
js/cloud-store.js   Cliente Supabase: pull al login, push con debounce
js/supabase-config.js URL y anon key de Supabase (ver .example)
js/auth.js          Login con Google, sync al entrar y menú de cuenta
js/google-config.js Client ID OAuth (ver google-config.example.js)
js/app.js           Interfaz: pinta la mesa y orquesta todo
supabase/schema.sql Tabla pt_user_state para sincronización
tools/test-supabase.js Prueba lectura/escritura contra Supabase
tools/selftest.js   Test en Node del evaluador, rangos y simulación de manos
```

## Tests

Requiere Node.js:

```
node tools/selftest.js
```

Comprueba el evaluador de manos, el expansor de rangos y simula miles de manos
completas verificando que ninguna se queda bloqueada.

## Notas sobre los rangos

Los rangos son **aproximaciones de estudio** basadas en outputs de solvers para
6-max 100bb (frecuencias RFI orientativas: UTG ~15%, HJ ~19%, CO ~26%,
BTN ~45%, SB ~40%). La estrategia post-flop usa heurísticas alineadas con GTO
(textura del board, categoría de mano, proyectos y odds), no un solver completo.
Sirven para entrenar la toma de decisiones; para estudio fino conviene
contrastar con un solver dedicado.

## Roadmap comercial

Estudio de mercado, pricing y backlog de lanzamiento: [`docs/ESTUDIO_MERCADO.md`](docs/ESTUDIO_MERCADO.md).  
Issues en GitHub: [Roadmap #1](https://github.com/joserra15/PokerTrainer/issues/1).

## Posibles mejoras futuras

- Cargar rangos exactos de solver desde archivos JSON.
- Más tamaños de apuesta y árboles post-flop multi-acción.
- Filtrar el entrenamiento por posición o tipo de spot.
- Gráficas de evolución del EV por sesión.
