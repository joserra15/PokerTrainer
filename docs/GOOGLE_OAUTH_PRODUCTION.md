# Google OAuth en producción (G-03)

Checklist para publicar el login con Google fuera del modo **Testing** y alinear Google Cloud Console con Supabase y GitHub Pages.

## URLs de referencia

Valores actuales en `js/site-config.js` (`PT_SITE`):

| Concepto | Valor |
|----------|--------|
| App pública | `https://joserra15.github.io/PokerTrainer/` |
| Orígenes JS autorizados | `https://joserra15.github.io`, `http://localhost`, `http://127.0.0.1` |
| Redirect URIs (Supabase) | `https://joserra15.github.io/PokerTrainer/`, `http://localhost/`, `http://127.0.0.1/` |

Si añades dominio propio (G-01), actualiza `js/site-config.js` y repite este checklist con las nuevas URLs.

---

## 1. Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/) → **APIs y servicios** → **Credenciales**.
2. Selecciona el cliente OAuth 2.0 de tipo **Aplicación web** usado por PokerForgeAI.
3. En **Orígenes de JavaScript autorizados**, añade cada entrada de `PT_SITE.oauthJavascriptOrigins`.
4. En **URIs de redireccionamiento autorizados**, añade las de `PT_SITE.oauthRedirectUris` **y** la URL de callback de Supabase (ver sección 2).
5. Guarda los cambios.

### Publicar la app (salir de Testing)

1. **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
2. Completa nombre de la app, logo, dominios autorizados (`joserra15.github.io` o tu dominio), correo de soporte y política de privacidad (`legal/privacidad.html`).
3. Añade el alcance `email`, `profile`, `openid` (los que usa Google Identity Services).
4. En **Usuarios de prueba**, el modo Testing solo permite esos correos. Para producción:
   - Cambia el **Estado de publicación** a **En producción**.
   - Si Google solicita verificación de la app (por alcances sensibles o marca), sigue el proceso de verificación; para login básico con email/perfil suele no ser necesario.

---

## 2. Supabase Auth

Proyecto: `wrkupbxttqrpdpoztcky`

1. **Authentication** → **Providers** → **Google**: activado con Client ID y Client Secret del mismo cliente OAuth.
2. **Authentication** → **URL Configuration**:
   - **Site URL**: `https://joserra15.github.io/PokerTrainer/`
   - **Redirect URLs**: incluye todas las de `PT_SITE.supabaseRedirectUrls` y, si aplica, `https://wrkupbxttqrpdpoztcky.supabase.co/auth/v1/callback`
3. Guarda y prueba login desde la URL de producción.

---

## 3. Cliente en el frontend

| Archivo | Uso |
|---------|-----|
| `js/google-config.js` | Client ID de Google (no commitear secretos; solo el ID público) |
| `js/site-config.js` | Orígenes y redirects documentados para operadores |
| `js/landing.js` | Muestra hints copiables en `#auth-setup` cuando OAuth no está configurado |

La app usa **Google Identity Services** (botón en `#gsi-button`) con `ux_mode: 'popup'`. No hace falta redirect manual en el frontend si el Client ID y los orígenes coinciden.

---

## 4. Verificación manual

- [ ] Login en `https://joserra15.github.io/PokerTrainer/` con cuenta que **no** esté en usuarios de prueba (modo producción).
- [ ] Login en `http://localhost:5500/` (Live Server) para desarrollo local.
- [ ] Tras login: menú de cuenta visible, sync en nube sin errores en consola.
- [ ] Popup no bloqueado; en móvil probar Chrome/Safari.

---

## 5. Panel de configuración en la app

Si el login falla por configuración, la landing muestra `#auth-setup` con los orígenes y redirects esperados (rellenados desde `PT_SITE`). Úsalos para comparar con Google Console y Supabase.

---

## 6. Dominio propio (futuro)

Al migrar de GitHub Pages a dominio custom:

1. Actualiza `PT_SITE.appUrl` y arrays de orígenes/redirects.
2. Añade el dominio en Google OAuth (orígenes + redirects).
3. Actualiza Site URL y Redirect URLs en Supabase.
4. Si usas GitHub Pages con CNAME, mantén también el origen `https://usuario.github.io` hasta deprecar la URL antigua.
