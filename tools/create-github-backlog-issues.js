#!/usr/bin/env node
/**
 * Crea issues de GitHub a partir del backlog de mercado (docs/ESTUDIO_MERCADO.md).
 *
 * Uso:
 *   set GITHUB_TOKEN=ghp_...
 *   node tools/create-github-backlog-issues.js
 *
 * Opcional:
 *   DRY_RUN=1          — solo imprime, no crea
 *   GITHUB_REPO=owner/repo — por defecto joserra15/PokerTrainer
 */
'use strict';

const https = require('https');

const REPO = process.env.GITHUB_REPO || 'joserra15/PokerTrainer';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const LABELS = [
  { name: 'epic', color: '6f42c1', description: 'Epic contenedor' },
  { name: 'P0', color: 'd73a4a', description: 'Bloqueante lanzamiento' },
  { name: 'P1', color: 'fbca04', description: 'MVP comercial' },
  { name: 'P2', color: '0e8a16', description: 'Crecimiento' },
  { name: 'P3', color: '1d76db', description: 'Escala / moat' },
  { name: 'legal', color: 'bfd4f2', description: 'Legal / RGPD' },
  { name: 'security', color: 'b60205', description: 'Seguridad / auth' },
  { name: 'billing', color: 'f9d0c4', description: 'Monetización' },
  { name: 'gtm', color: 'c5def5', description: 'Go-to-market' },
  { name: 'product', color: 'd4c5f9', description: 'Features producto' },
  { name: 'import', color: 'fef2c0', description: 'Import sesiones' },
  { name: 'quality', color: 'ededed', description: 'Calidad / tests' },
  { name: 'ai', color: '7057ff', description: 'IA Coach' },
  { name: 'ops', color: '006b75', description: 'Operaciones' },
  { name: 'roadmap', color: 'e99695', description: 'Roadmap comercial' }
];

const EPICS = [
  {
    title: '[EPIC] Legal y cumplimiento RGPD',
    labels: ['epic', 'P0', 'legal'],
    body: `## Epic 1 — Legal y cumplimiento RGPD

**Prioridad:** P0 (bloqueante para lanzamiento público)

Documentación completa: [docs/ESTUDIO_MERCADO.md](../blob/main/docs/ESTUDIO_MERCADO.md)

### Objetivo
Cumplir RGPD y generar confianza antes de abrir la app a usuarios de pago.

### Criterios de aceptación del epic
- [ ] Política de privacidad y términos publicados y enlazados desde la app
- [ ] Banner de cookies operativo
- [ ] Flujos exportar datos y eliminar cuenta funcionando
- [ ] Página de transparencia IA publicada`
  },
  {
    title: '[EPIC] Seguridad y auth de producción',
    labels: ['epic', 'P0', 'security'],
    body: `## Epic 2 — Seguridad y auth de producción

**Prioridad:** P0

### Objetivo
Eliminar RLS abierta, secrets en cliente y auth no verificada.

### Criterios de aceptación
- [ ] Supabase Auth con Google
- [ ] RLS por usuario en \`pt_user_state\`
- [ ] Token IA solo en servidor con rate limits
- [ ] Secrets rotados y fuera del repo`
  },
  {
    title: '[EPIC] Monetización y billing',
    labels: ['epic', 'P0', 'P1', 'billing'],
    body: `## Epic 3 — Monetización y billing

**Prioridad:** P0/P1

### Objetivo
Primeros ingresos con freemium + planes Study/Coach.

Ver pricing en [docs/ESTUDIO_MERCADO.md](../blob/main/docs/ESTUDIO_MERCADO.md#5-estrategia-de-pricing).

### Criterios de aceptación
- [ ] Checkout y portal de cliente operativos
- [ ] Entitlements por plan en app y servidor
- [ ] Paywall en IA, import y límites de entrenador`
  },
  {
    title: '[EPIC] Go-to-market y primera impresión',
    labels: ['epic', 'P1', 'gtm'],
    body: `## Epic 4 — Go-to-market

**Prioridad:** P1

### Objetivo
Landing, onboarding y analytics para convertir visitantes en usuarios activos.`
  },
  {
    title: '[EPIC] Producto core — retención',
    labels: ['epic', 'P1', 'P2', 'product'],
    body: `## Epic 5 — Producto core (retención)

**Prioridad:** P1/P2

### Objetivo
Límites free, progreso visible y PWA para retener usuarios.`
  },
  {
    title: '[EPIC] Import y cobertura de mercado',
    labels: ['epic', 'P2', 'import'],
    body: `## Epic 6 — Import y cobertura

**Prioridad:** P2

### Objetivo
Ampliar salas y formatos más allá de PokerStars ES Cash NL.`
  },
  {
    title: '[EPIC] Calidad y confianza del motor',
    labels: ['epic', 'P1', 'P2', 'quality'],
    body: `## Epic 7 — Calidad motor

**Prioridad:** P1/P2

### Objetivo
Tests E2E, rangos solver JSON y transparencia metodológica.`
  },
  {
    title: '[EPIC] IA Coach comercial',
    labels: ['epic', 'P1', 'ai'],
    body: `## Epic 8 — IA Coach comercial

**Prioridad:** P1

### Objetivo
Monetizar IA con cupos, caché y modos de informe.`
  },
  {
    title: '[EPIC] Operaciones y escala',
    labels: ['epic', 'P2', 'P3', 'ops'],
    body: `## Epic 9 — Operaciones y escala

**Prioridad:** P2/P3

### Objetivo
Admin, alertas de coste, afiliados y B2B.`
  }
];

const TASKS = [
  // EPIC 1 Legal
  { epic: 0, id: 'L-01', title: 'L-01: Redactar Política de Privacidad (ES + EN)', labels: ['P0', 'legal'], effort: 'S', body: 'Redactar política de privacidad RGPD: datos recogidos (Google profile, manos, sesiones, IA), subprocesadores (Google, Supabase, Gemini), retención, derechos del usuario.\n\nPublicar en `/legal/privacidad.html` o ruta equivalente y enlazar desde login y menú cuenta.' },
  { epic: 0, id: 'L-02', title: 'L-02: Redactar Términos de Uso', labels: ['P0', 'legal'], effort: 'S', body: 'Términos: naturaleza educativa del análisis GTO, no asesoramiento de juego, limitación de responsabilidad, edad mínima, cancelación.\n\nEnlazar desde registro/login.' },
  { epic: 0, id: 'L-03', title: 'L-03: Banner cookies y consentimiento', labels: ['P0', 'legal'], effort: 'M', body: 'Implementar banner GDPR para cookies/localStorage y scripts de terceros (Google OAuth, analytics futuro). Guardar preferencia del usuario.' },
  { epic: 0, id: 'L-04', title: 'L-04: Página transparencia IA', labels: ['P0', 'legal', 'ai'], effort: 'S', body: 'Explicar qué datos de manos/sesiones se envían a Gemini, que no es consejo profesional, y opción de no usar IA Coach.' },
  { epic: 0, id: 'L-05', title: 'L-05: Flujo exportar mis datos', labels: ['P0', 'legal'], effort: 'M', body: 'Botón en menú cuenta: export JSON con auth, stats, history, errors, sessions, metadatos. Derecho de portabilidad RGPD.' },
  { epic: 0, id: 'L-06', title: 'L-06: Flujo eliminar mi cuenta', labels: ['P0', 'legal'], effort: 'M', body: 'Eliminar fila Supabase `pt_user_state`, limpiar localStorage del usuario, cerrar sesión. Confirmación explícita.' },
  { epic: 0, id: 'L-07', title: 'L-07: Registro de subprocesadores', labels: ['P0', 'legal'], effort: 'S', body: 'Documentar en privacidad: Google (OAuth), Supabase (hosting/DB), Google AI/Gemini (informes). Incluir enlaces a sus DPAs.' },
  { epic: 0, id: 'L-08', title: 'L-08: Revisión legal externa (RGPD)', labels: ['P0', 'legal'], effort: 'Externo', body: 'Contratar revisión de privacidad, términos y flujos RGPD por abogado especializado (~€500–1500). Checklist previo en docs/ESTUDIO_MERCADO.md.' },

  // EPIC 2 Security
  { epic: 1, id: 'S-01', title: 'S-01: Migrar a Supabase Auth (Google)', labels: ['P0', 'security'], effort: 'L', body: 'Reemplazar auth custom GIS-only por Supabase Auth con provider Google. Sincronizar `user_id` con `auth.uid()`.' },
  { epic: 1, id: 'S-02', title: 'S-02: RLS por usuario en pt_user_state', labels: ['P0', 'security'], effort: 'M', body: 'Eliminar política `anon_read_write_dev`. Crear políticas: usuario solo lee/escribe su fila (`user_id = auth.uid()::text`). Migración SQL en `supabase/schema.sql`.' },
  { epic: 1, id: 'S-03', title: 'S-03: Rotar secrets y excluir configs del repo', labels: ['P0', 'security'], effort: 'S', body: 'Rotar anon key, PT_AI_TOKEN, Gemini. Asegurar `js/supabase-config.js`, `js/ai-config.js`, `js/google-config.js` en `.gitignore`. Solo `.example` en repo.' },
  { epic: 1, id: 'S-04', title: 'S-04: Token IA solo en servidor', labels: ['P0', 'security', 'ai'], effort: 'M', body: 'Quitar `PT_AI.token` del cliente. Edge Function valida JWT de sesión Supabase antes de llamar Gemini.' },
  { epic: 1, id: 'S-05', title: 'S-05: Rate limiting en analyze-hand', labels: ['P0', 'security', 'ai'], effort: 'M', body: 'Límites por usuario/IP/plan en Edge Function. Respuesta 429 con retry-after.' },
  { epic: 1, id: 'S-06', title: 'S-06: Validar JWT en Edge Function', labels: ['P0', 'security'], effort: 'M', body: 'Verificar Bearer token Supabase en cada request a `analyze-hand`. Rechazar anon sin auth.' },
  { epic: 1, id: 'S-07', title: 'S-07: Auditar sesiones reales en repo', labels: ['P0', 'security'], effort: 'S', body: 'Revisar `sesiones/Poker56.txt`, `Poker76.txt` por datos personales. Mover a fixtures anonimizados o `.gitignore`.' },
  { epic: 1, id: 'S-08', title: 'S-08: CSP y hardening básico', labels: ['P0', 'security'], effort: 'S', body: 'Content-Security-Policy en GitHub Pages (meta o headers vía proxy futuro). Restringir scripts a orígenes conocidos.' },

  // EPIC 3 Billing
  { epic: 2, id: 'M-01', title: 'M-01: Elegir proveedor de pagos', labels: ['P0', 'P1', 'billing'], effort: 'S', body: 'Comparar Stripe vs Lemon Squeezy (IVA UE, Merchant of Record). Documentar decisión en docs/.' },
  { epic: 2, id: 'M-02', title: 'M-02: Schema plans y subscriptions', labels: ['P1', 'billing'], effort: 'M', body: 'Tablas Supabase: `plans`, `subscriptions`, `usage_ai_reports`. Campos: user_id, plan_id, stripe_customer_id, status, period_end.' },
  { epic: 2, id: 'M-03', title: 'M-03: Stripe Checkout y Customer Portal', labels: ['P1', 'billing'], effort: 'L', body: 'Integrar Checkout para Study/Coach. Portal para cancelar/cambiar plan.' },
  { epic: 2, id: 'M-04', title: 'M-04: Webhook Stripe → entitlements', labels: ['P1', 'billing'], effort: 'L', body: 'Edge Function o webhook handler: `checkout.session.completed`, `customer.subscription.updated/deleted` → actualizar Supabase.' },
  { epic: 2, id: 'M-05', title: 'M-05: Middleware entitlements en app', labels: ['P1', 'billing'], effort: 'M', body: 'Módulo `js/entitlements.js`: `canUseAI()`, `trainerHandsLeft()`, `canImportSession()`. Fetch plan al login.' },
  { epic: 2, id: 'M-06', title: 'M-06: UI Pricing y paywall', labels: ['P1', 'billing', 'gtm'], effort: 'M', body: 'Página/tab Pricing. Modales paywall al agotar límites free. CTAs upgrade en IA Coach e import.' },
  { epic: 2, id: 'M-07', title: 'M-07: Trial 7 días Coach (opcional)', labels: ['P2', 'billing'], effort: 'M', body: 'Trial con tarjeta vía Stripe. Mostrar días restantes en UI.' },
  { epic: 2, id: 'M-08', title: 'M-08: Emails transaccionales', labels: ['P1', 'billing'], effort: 'M', body: 'Confirmación suscripción, renovación, fallo de pago, cancelación. Resend o Stripe emails.' },

  // EPIC 4 GTM
  { epic: 3, id: 'G-01', title: 'G-01: Dominio propio y SSL', labels: ['P1', 'gtm'], effort: 'S', body: 'Registrar dominio (ej. pokerforgeai.com). DNS → GitHub Pages o Cloudflare. Actualizar OAuth origins.' },
  { epic: 3, id: 'G-02', title: 'G-02: Landing marketing', labels: ['P1', 'gtm'], effort: 'M', body: 'Página pública: hero, features, pricing, testimonios placeholder, CTA login. Separada o sección en index.' },
  { epic: 3, id: 'G-03', title: 'G-03: Google OAuth en producción', labels: ['P0', 'gtm', 'security'], effort: 'M', body: 'Publicar app OAuth (salir de Testing). Completar verificación Google si aplica. Añadir dominio propio a orígenes.' },
  { epic: 3, id: 'G-04', title: 'G-04: Onboarding 3 pasos', labels: ['P1', 'gtm', 'product'], effort: 'M', body: 'Tour primera visita: 1) entrenar una mano 2) ver import demo 3) revisar stats. Skip + no repetir.' },
  { epic: 3, id: 'G-05', title: 'G-05: Sesión de ejemplo precargada', labels: ['P1', 'gtm', 'product'], effort: 'M', body: 'Sesión demo anonimizada precargada para usuarios nuevos sin subir txt.' },
  { epic: 3, id: 'G-06', title: 'G-06: FAQ y página Soporte', labels: ['P1', 'gtm'], effort: 'S', body: 'FAQ + email contacto o formulario. Enlace en menú y landing.' },
  { epic: 3, id: 'G-07', title: 'G-07: Analytics producto', labels: ['P1', 'gtm'], effort: 'M', body: 'Plausible o PostHog: registro, primera mano, import, upgrade, churn events. Respetar consentimiento cookies.' },
  { epic: 3, id: 'G-08', title: 'G-08: Sentry errores', labels: ['P1', 'gtm', 'quality'], effort: 'S', body: 'Sentry para JS cliente y Edge Functions. Source maps si aplica.' },

  // EPIC 5 Product
  { epic: 4, id: 'P-01', title: 'P-01: Límites free tier', labels: ['P1', 'product', 'billing'], effort: 'M', body: '15 manos entrenador/día, 1 sesión import/mes, histórico 30 días. Contadores en UI.' },
  { epic: 4, id: 'P-02', title: 'P-02: Dashboard progreso', labels: ['P2', 'product'], effort: 'L', body: 'Gráficas acierto por calle, EV perdido en el tiempo, sesiones importadas.' },
  { epic: 4, id: 'P-03', title: 'P-03: Mis leaks — top 5 spots', labels: ['P2', 'product'], effort: 'M', body: 'Agregar errores por spot key; mostrar top 5 con CTA repetir.' },
  { epic: 4, id: 'P-04', title: 'P-04: Filtros entrenador', labels: ['P2', 'product'], effort: 'M', body: 'Filtrar por posición, tipo spot (RFI/3bet), calle. README lo lista como mejora futura.' },
  { epic: 4, id: 'P-05', title: 'P-05: PWA instalable', labels: ['P2', 'product'], effort: 'M', body: 'manifest.json, service worker shell, iconos. Instalable en móvil.' },
  { epic: 4, id: 'P-06', title: 'P-06: Email re-engagement', labels: ['P2', 'product', 'ops'], effort: 'M', body: 'Email opcional si X días sin entrenar. Requiere consentimiento marketing.' },
  { epic: 4, id: 'P-07', title: 'P-07: Disclaimers guía de estudio', labels: ['P1', 'product'], effort: 'S', body: 'Texto visible: análisis heurístico GTO, no solver exacto. En import y resultados.' },

  // EPIC 6 Import
  { epic: 5, id: 'I-01', title: 'I-01: Import PokerStars inglés', labels: ['P2', 'import'], effort: 'M', body: 'Extender parser para formato EN de PS Cash NL.' },
  { epic: 5, id: 'I-02', title: 'I-02: Import GGPoker y Winamax', labels: ['P2', 'import'], effort: 'L', body: 'Parsers para formatos HH más comunes en ES.' },
  { epic: 5, id: 'I-03', title: 'I-03: Soporte torneos (preflop)', labels: ['P2', 'import'], effort: 'L', body: 'Detectar MTT/SNG en import; análisis preflop mínimo.' },
  { epic: 5, id: 'I-04', title: 'I-04: Import archivos grandes 10k+ manos', labels: ['P2', 'import'], effort: 'M', body: 'Procesamiento por chunks con barra de progreso; no bloquear UI.' },
  { epic: 5, id: 'I-05', title: 'I-05: Re-análisis al actualizar motor', labels: ['P2', 'import', 'quality'], effort: 'L', body: 'Versionar análisis de sesiones; botón re-procesar con motor nuevo.' },

  // EPIC 7 Quality
  { epic: 6, id: 'Q-01', title: 'Q-01: testimport.js en CI', labels: ['P1', 'quality'], effort: 'S', body: 'Añadir `node tools/testimport.js` a `.github/workflows/static.yml`.' },
  { epic: 6, id: 'Q-02', title: 'Q-02: E2E Playwright básico', labels: ['P2', 'quality'], effort: 'L', body: 'Test: cargar app, mock auth, jugar 1 mano, abrir matriz villano.' },
  { epic: 6, id: 'Q-03', title: 'Q-03: Rangos preflop desde JSON solver', labels: ['P2', 'quality'], effort: 'L', body: 'Cargar rangos UTG–BTN desde JSON exportado de solver.' },
  { epic: 6, id: 'Q-04', title: 'Q-04: Documento Metodología GTO', labels: ['P1', 'quality'], effort: 'S', body: 'Página pública explicando Monte Carlo, heurísticas postflop, límites.' },
  { epic: 6, id: 'Q-05', title: 'Q-05: Indicador confianza por decisión', labels: ['P2', 'quality'], effort: 'M', body: 'Badge alta/media/baja según sample MC y claridad del spot.' },

  // EPIC 8 AI
  { epic: 7, id: 'A-01', title: 'A-01: Contador informes IA', labels: ['P1', 'ai', 'billing'], effort: 'S', body: 'UI: informes usados / restantes según plan.' },
  { epic: 7, id: 'A-02', title: 'A-02: Caché IA más agresiva', labels: ['P1', 'ai'], effort: 'M', body: 'No re-llamar Gemini si payload hash igual. TTL configurable.' },
  { epic: 7, id: 'A-03', title: 'A-03: Modo resumen corto vs completo', labels: ['P1', 'ai'], effort: 'M', body: 'Dos modos de informe; resumen consume menos tokens.' },
  { epic: 7, id: 'A-04', title: 'A-04: Cola async IA sesiones largas', labels: ['P2', 'ai'], effort: 'L', body: 'Job async + notificación/email cuando informe de sesión esté listo.' },
  { epic: 7, id: 'A-05', title: 'A-05: Prompts IA por plan', labels: ['P2', 'ai', 'billing'], effort: 'M', body: 'Coach Pro: informes más profundos; Free: no acceso.' },

  // EPIC 9 Ops
  { epic: 8, id: 'O-01', title: 'O-01: Panel admin', labels: ['P2', 'ops'], effort: 'L', body: 'Vista admin: usuarios, MRR, uso IA, últimos errores.' },
  { epic: 8, id: 'O-02', title: 'O-02: Alertas coste Gemini', labels: ['P2', 'ops', 'ai'], effort: 'S', body: 'Alerta si coste diario Gemini > umbral (email/Discord).' },
  { epic: 8, id: 'O-03', title: 'O-03: Programa afiliados', labels: ['P3', 'ops', 'gtm'], effort: 'M', body: '20% primer año vía Stripe Connect o Rewardful.' },
  { epic: 8, id: 'O-04', title: 'O-04: Plan Escuela B2B', labels: ['P3', 'ops', 'billing'], effort: 'L', body: '5–20 asientos, facturación anual, onboarding grupo.' },
  { epic: 8, id: 'O-05', title: 'O-05: Localización inglés', labels: ['P3', 'ops', 'product'], effort: 'L', body: 'i18n EN para UI y landing; mercado LATAM/global.' }
];

const META_ISSUE = {
  title: '[ROADMAP] Lanzamiento comercial PokerForgeAI',
  labels: ['roadmap', 'epic'],
  body: `## Roadmap comercial PokerForgeAI

Documento maestro: [docs/ESTUDIO_MERCADO.md](https://github.com/${REPO}/blob/main/docs/ESTUDIO_MERCADO.md)

### Resumen
- **Posicionamiento:** compañero de estudio GTO asequible (entrenador + import PS + IA)
- **Pricing:** Free / Study ~€15 / Coach ~€35
- **Bloqueantes P0:** Legal (EPIC 1) + Seguridad (EPIC 2) + OAuth producción

### Fases
| Fase | Objetivo |
|------|----------|
| 0 Fundamentos | Legal + auth/RLS (4–6 sem) |
| 1 MVP pago | Stripe + 2 planes (6–8 sem) |
| 2 Retención | Onboarding + PWA + progreso |
| 3 Escala | Multi-import + EN + B2B |

### Epics
Los issues \`[EPIC]\` enlazan las tareas hijas. Etiquetas: \`P0\` bloqueante, \`P1\` MVP, \`P2\` crecimiento, \`P3\` escala.

### Recrear issues
\`\`\`bash
GITHUB_TOKEN=ghp_... node tools/create-github-backlog-issues.js
\`\`\``
};

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const [owner, repo] = REPO.split('/');
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}${path}`,
      method,
      headers: {
        'User-Agent': 'PokerForgeAI-backlog-script',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let parsed = raw;
        try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { /* keep raw */ }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`GitHub API ${method} ${path} → ${res.statusCode}: ${raw}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function listIssues() {
  const all = [];
  let page = 1;
  for (;;) {
    const batch = await api('GET', `/issues?state=all&per_page=100&page=${page}`);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

async function ensureLabel(label) {
  if (DRY_RUN) return;
  try {
    await api('POST', '/labels', label);
    console.log('  + label', label.name);
  } catch (e) {
    if (String(e.message).includes('422')) return; // exists
    throw e;
  }
}

async function createIssue(title, body, labels) {
  const existing = await listIssues();
  const hit = existing.find((i) => i.title === title);
  if (hit) {
    console.log('  = exists #' + hit.number, title);
    return hit;
  }
  if (DRY_RUN) {
    console.log('  [dry] would create:', title);
    return { number: 0, title };
  }
  const issue = await api('POST', '/issues', { title, body, labels });
  console.log('  + created #' + issue.number, title);
  await sleep(300);
  return issue;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function taskBody(task, epicNum) {
  return `**ID:** ${task.id}  
**Esfuerzo:** ${task.effort}  
**Epic:** #${epicNum}  
**Doc:** [ESTUDIO_MERCADO.md](https://github.com/${REPO}/blob/main/docs/ESTUDIO_MERCADO.md)

---

${task.body}

---

### Criterios de aceptación
- [ ] Implementado según descripción
- [ ] Sin regresiones en \`node tools/selftest.js\`
- [ ] Documentación actualizada si aplica`;
}

async function main() {
  if (!TOKEN && !DRY_RUN) {
    console.error('Falta GITHUB_TOKEN o GH_TOKEN.');
    console.error('Crea un PAT en https://github.com/settings/tokens (scope: repo)');
    console.error('  set GITHUB_TOKEN=ghp_...');
    console.error('  node tools/create-github-backlog-issues.js');
    process.exit(1);
  }

  console.log('Repo:', REPO, DRY_RUN ? '(DRY RUN)' : '');

  console.log('\n1. Labels...');
  for (const lb of LABELS) await ensureLabel(lb);

  console.log('\n2. Meta issue...');
  const meta = await createIssue(META_ISSUE.title, META_ISSUE.body, META_ISSUE.labels);

  console.log('\n3. Epics...');
  const epicIssues = [];
  for (const ep of EPICS) {
    const body = ep.body + `\n\n---\n**Roadmap:** #${meta.number}\n**Documentación:** [ESTUDIO_MERCADO.md](https://github.com/${REPO}/blob/main/docs/ESTUDIO_MERCADO.md)`;
    const issue = await createIssue(ep.title, body, ep.labels);
    epicIssues.push(issue);
  }

  console.log('\n4. Tasks (' + TASKS.length + ')...');
  let created = 0;
  let skipped = 0;
  for (const task of TASKS) {
    const epic = epicIssues[task.epic];
    const title = task.title;
    const body = taskBody(task, epic.number) + `\n\n**Roadmap:** #${meta.number}`;
    const before = await listIssues();
    const existed = before.some((i) => i.title === title);
    await createIssue(title, body, task.labels);
    if (existed) skipped++; else created++;
  }

  console.log('\nDone.');
  console.log('Meta issue: #' + meta.number);
  console.log('Epics:', epicIssues.map((e) => '#' + e.number).join(', '));
  if (!DRY_RUN) {
    console.log('\nVer: https://github.com/' + REPO + '/issues');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
