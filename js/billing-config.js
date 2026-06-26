/*
 * billing-config.js — Stripe Checkout (sin secrets; Price IDs van en Supabase).
 */
window.PT_BILLING = {
  enabled: true,
  functionsUrl: 'https://wrkupbxttqrpdpoztcky.supabase.co/functions/v1',
  plans: {
    pro: { label: 'Study', monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92' },
    premium: { label: 'Coach', monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25' }
  }
};
