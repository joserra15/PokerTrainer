/*
 * Copia como js/ai-config.js y completa tras desplegar supabase/functions/analyze-hand.
 *
 * 1. supabase secrets set GEMINI_API_KEY=...
 * 2. supabase secrets set PT_AI_TOKEN=un_secreto_largo_aleatorio
 * 3. supabase functions deploy analyze-hand
 * 4. Pega aquí la URL de la función y el mismo PT_AI_TOKEN
 */
window.PT_AI = {
  enabled: false,
  endpoint: 'https://TU_PROYECTO.supabase.co/functions/v1/analyze-hand',
  token: 'TU_PT_AI_TOKEN',
  supabaseAnonKey: '' // opcional: anon key del proyecto (recomendado para el gateway)
};
