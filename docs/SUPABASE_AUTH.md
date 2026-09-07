# Supabase Auth y seguridad (EPIC 2)

## 1. SQL — RLS de producción

En **Supabase → SQL Editor**, ejecuta:

- `supabase/schema.sql` (si es instalación nueva)
- o `supabase/migrations/002_production_rls.sql` (si ya tenías la tabla)

Esto elimina la política `anon_read_write_dev` y exige **JWT authenticated**.

## 2. Google en Supabase Auth

1. **Authentication → Providers → Google** → activar.
2. Usa el mismo proyecto de Google Cloud o crea credenciales OAuth.
3. **Authentication → URL Configuration**:
   - Site URL: `https://www.pokerforgeai.com/`
   - Redirect URLs: `https://www.pokerforgeai.com/`, `http://localhost/`, `http://127.0.0.1/`

## 3. Edge Function `analyze-hand`

Secrets (ya no uses `PT_AI_TOKEN` en el cliente):

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set SUPABASE_URL=https://TU_PROYECTO.supabase.co
supabase secrets set SUPABASE_ANON_KEY=tu_anon_key
# Opcional: límite diario por usuario (default 120)
supabase secrets set PT_AI_DAILY_LIMIT=120
supabase functions deploy analyze-hand
```

## 4. Cliente (`js/supabase-config.js`)

```javascript
window.PT_SUPABASE = {
  url: '...',
  anonKey: '...',
  enabled: true,
  useAuth: true   // Supabase Auth + Google
};
```

`js/ai-config.js` solo necesita `enabled` y `endpoint` (sin token).

## 5. Verificación

```bash
node tools/test-supabase.js   # INSERT anon debe fallar con RLS
node tools/selftest.js
```

## Migración de usuarios existentes

- **localStorage:** al login con Supabase, se migran claves del Google `sub` antiguo al UUID de Supabase.
- **Nube:** la primera sync lee la fila con `user_id` = Google sub (política temporal) y la reescribe con `auth.uid()`.

## Fallback legacy

Si `useAuth: false`, la app usa el login Google directo anterior (solo para desarrollo).

## Troubleshooting: `{"message":"Gateway Timeout"}` en `/auth/v1/authorize`

Eso **no** es un fallo de Google OAuth ni del frontend. El API Gateway de Supabase no consigue respuesta de **GoTrue (Auth)** (a menudo con Postgres también lento).

Comprobar desde terminal:

```bash
# Debe responder ~200 en <1s si Auth está sano
curl -sS -o /dev/null -w "%{http_code} %{time_total}\n" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "https://wrkupbxttqrpdpoztcky.supabase.co/auth/v1/health"

# Si Storage/DB también caídos: DatabaseTimeout (544)
curl -sS -H "apikey: $ANON" \
  "https://wrkupbxttqrpdpoztcky.supabase.co/storage/v1/bucket"
```

**Qué hacer:**

1. [Supabase Dashboard](https://supabase.com/dashboard/project/wrkupbxttqrpdpoztcky) → **Project Settings** → **General** → **Restart project** (o Restore si está paused).
2. Espera 1–3 minutos y vuelve a probar el `curl` de `/auth/v1/health`.
3. Si tras reiniciar sigue en 504: abre ticket a Supabase Support (GoTrue freeze conocido; REST puede seguir vivo).
4. Revisa [status.supabase.com](https://status.supabase.com) (API Gateway degraded puede empeorar esto).

La app sondea `/auth/v1/health` antes de redirigir a Google; si Auth está caído muestra el error en `#auth-error` en lugar de la página JSON `Gateway Timeout`.
