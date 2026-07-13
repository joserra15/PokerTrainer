# SEO — PokerForgeAI

Estudio y plan de posicionamiento para `www.pokerforgeai.com` (julio 2026).

## Situación inicial

| Área | Estado previo |
|------|----------------|
| Landing (`index.html`) | Buen copy estático en HTML, pero sin meta description, OG, canonical ni JSON-LD |
| Páginas legales (8) | Títulos y `h1` correctos; sin description, OG, canonical, favicon |
| `robots.txt` / `sitemap.xml` | No existían |
| Datos estructurados | Ninguno |
| App autenticada (tabs) | No indexable como URLs separadas (SPA sin rutas) |
| Dominio canónico | Configurado en `js/site-config.js`, pero sin `<link rel="canonical">` |
| Analytics | Plausible con consentimiento de cookies |

## Arquitectura indexable

**Indexable por Google:**
- `/` — landing pública con hero, funciones, planes, CTA
- `/legal/metodologia.html` — keywords GTO, metodología (alta prioridad SEO)
- `/legal/faq.html` — FAQ + schema `FAQPage`
- `/legal/soporte.html`, `/legal/ia.html`
- `/legal/terminos.html`, `/legal/privacidad.html`, `/legal/cookies.html`
- `/legal/privacy-en.html` (inglés, menor prioridad)

**No indexable (por diseño):**
- Pestañas internas (`play`, `sessions`, etc.) — requieren login, sin URL propia
- Carpeta `/sesiones/` — datos de prueba / personales (`Disallow` en robots)

## Cambios implementados (v1.50.0)

### Técnico
- `robots.txt` con sitemap y exclusiones
- `sitemap.xml` con 9 URLs y `hreflang` en privacidad
- `404.html` para GitHub Pages
- Canonical, meta description, Open Graph y Twitter Cards en home
- JSON-LD en home: `WebSite`, `Organization`, `SoftwareApplication`
- `js/seo-config.js` + `js/legal-seo.js` para páginas legales
- FAQ con schema `FAQPage` (5 preguntas principales)
- Metodología GTO enlazada desde nav y footer de la landing
- `aria-hidden` en `#app-shell` cuando el usuario no está logueado

### Contenido / keywords objetivo
- **Primarios:** entrenador GTO poker, NL Hold'em 6-max, estudiar poker, IA coach poker
- **Secundarios:** importar PokerStars, cash game, fugas EV, metodología GTO
- **Long-tail:** FAQ importación sesiones, planes Study Coach

## HTTPS y dominio canónico

- **Dominio canónico:** `https://www.pokerforgeai.com/`
- `pokerforgeai.com` (sin www) y `http://` redirigen automáticamente vía script en `<head>` + fichero `CNAME`
- CSP incluye `upgrade-insecure-requests` para evitar contenido mixto HTTP
- En GitHub Pages → Settings → Pages: activar **Enforce HTTPS**
- Opcional (recomendado): en DNS/Cloudflare, redirigir apex `pokerforgeai.com` → `www` con 301 a nivel de servidor

## Próximos pasos recomendados

1. **Google Search Console** — verificar propiedad de `www.pokerforgeai.com` y enviar `sitemap.xml`
2. **Redirección 301** — asegurar que `joserra15.github.io/PokerTrainer` redirige al dominio canónico (si sigue activo)
3. **Contenido** — ampliar `metodologia.html` con ejemplos de spots (H2 por calle, posición)
4. **Blog / guías** — artículos estáticos en `/blog/` (futuro) para long-tail
5. **Core Web Vitals** — medir LCP en landing; valorar lazy-load de scripts no críticos
6. **Imagen OG dedicada** — crear `og-share.png` 1200×630 con marca + claim
7. **Enlaces externos** — menciones en foros de poker, Product Hunt, etc.
8. **i18n** — versión inglesa de landing si se apunta mercado internacional

## Mantenimiento

- Actualizar `sitemap.xml` al añadir páginas públicas
- Editar textos SEO en `js/seo-config.js`
- Tras cambios de precios/planes, actualizar JSON-LD `offers` en `index.html`
- Revisar FAQ schema si se añaden preguntas en `legal/faq.html`

## Archivos clave

| Archivo | Función |
|---------|---------|
| `index.html` | Meta + JSON-LD home |
| `js/seo-config.js` | Textos SEO centralizados |
| `js/legal-seo.js` | Inyección meta en legales |
| `robots.txt` | Directivas de rastreo |
| `sitemap.xml` | Mapa del sitio |
| `404.html` | Página de error |
