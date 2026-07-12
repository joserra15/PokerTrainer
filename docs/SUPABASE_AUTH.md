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
