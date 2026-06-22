import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pt-ai-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `Coach NL Hold'em 6-max cash (español). Recibes JSON compacto: cartas, board, decisiones del héroe con veredicto GTO/EV/equity, línea del villano y showdown si hay.
NO narres la mano ni repitas la secuencia de acciones (el usuario ya la ve).
Evalúa SOLO:
1) Cada decisión del héroe: ¿correcta según GTO? ¿por qué? (equity, pot odds, frecuencias gto)
2) Lectura del villano: interpreta su línea (rango, polarización, bluffs/value) y qué señales daría en spots similares
Usa únicamente números del JSON; si falta dato, dilo en una frase.
Responde markdown:
# {code} {pos}
## Decisiones
(bullet por calle con error, duda o EV perdido; omite óptimas salvo lección breve)
## Lectura villano
## Lección práctica
(1 idea concreta microlímites)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const aiToken = Deno.env.get('PT_AI_TOKEN');
  const clientToken = req.headers.get('X-PT-AI-Token');
  if (!aiToken || clientToken !== aiToken) {
    return json({ error: 'unauthorized' }, 401);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    return json({ error: 'GEMINI_API_KEY not configured' }, 500);
  }

  let body: { payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body.payload) {
    return json({ error: 'missing_payload' }, 400);
  }

  const userContent = 'Evalúa decisiones y lectura villano:\n' + JSON.stringify(body.payload);

  const model = 'gemini-2.5-flash';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + model +
    ':generateContent?key=' + geminiKey;

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 1024 }
    })
  });

  const geminiData = await geminiRes.json();
  if (!geminiRes.ok) {
    const msg = geminiData?.error?.message || 'gemini_error';
    return json({ error: msg }, 502);
  }

  const text =
    geminiData?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
    '';

  if (!text.trim()) {
    return json({ error: 'empty_response' }, 502);
  }

  return json({
    reportMarkdown: text.trim(),
    model: model,
    createdAt: new Date().toISOString()
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
