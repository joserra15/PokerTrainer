/*
 * billing-config.example.js — Copiar a billing-config.js (no commitear secrets).
 */
window.PT_BILLING = {
  enabled: false,
  // Base URL de Edge Functions (sin barra final)
  functionsUrl: 'https://YOUR_PROJECT.supabase.co/functions/v1',
  plans: {
    pro: { label: 'Study', monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92' },
    premium: { label: 'Coach', monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25' }
  }
};
