/*
 * Copia como js/ai-config.js tras desplegar supabase/functions/analyze-hand.
 *
 * 1. supabase secrets set GEMINI_API_KEY=...
 * 2. supabase secrets set SUPABASE_URL=https://TU_PROYECTO.supabase.co
 * 3. supabase secrets set SUPABASE_ANON_KEY=tu_anon_key
 * 4. supabase functions deploy analyze-hand
 * 5. Activa Google en Supabase Auth y ejecuta supabase/migrations/002_production_rls.sql
 */
window.PT_AI = {
  enabled: false,
  endpoint: 'https://TU_PROYECTO.supabase.co/functions/v1/analyze-hand'
};
