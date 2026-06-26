/*
 * Configuración del informe IA (GEMINI_API_KEY solo en Supabase Edge Function).
 * EPIC 2: requiere sesión Supabase Auth (sin token en cliente).
 */
window.PT_AI = {
  enabled: true,
  endpoint: 'https://wrkupbxttqrpdpoztcky.supabase.co/functions/v1/analyze-hand'
};
