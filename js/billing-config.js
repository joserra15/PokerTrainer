/*
 * billing-config.js — Stripe Checkout (sin secrets; Price IDs van en Supabase).
 */
window.PT_BILLING = {
  enabled: true,
  functionsUrl: 'https://wrkupbxttqrpdpoztcky.supabase.co/functions/v1',
  plans: {
    pro: { label: 'Study', monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92' },
    premium: { label: 'Coach', monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25' }
  },
  bonus: {
    validityMonths: 12,
    packs: {
      s: { credits: 10, label: 'Pack S' },
      m: { credits: 20, label: 'Pack M' },
      l: { credits: 40, label: 'Pack L' }
    },
    prices: {
      free: { s: '7,99', m: '13,99', l: '22,99' },
      study: { s: '5,99', m: '9,99', l: '15,99' },
      coach: { s: '3,99', m: '6,99', l: '11,99' }
    }
  }
};
