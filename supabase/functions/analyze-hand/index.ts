import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pt-ai-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `Eres un coach de poker NL Hold'em 6-max cash en español.
Recibes un JSON con una mano ya evaluada por un motor GTO (equity, EV, clases de decisión).
REGLAS:
- No inventes cartas, números de equity ni EV: usa solo los del JSON.
- Si falta un dato, dilo explícitamente.
- Tono didáctico para microlímites.
- Responde SOLO en markdown con esta estructura:

# Informe de mano — {heroCode} desde {heroPos}

## Resumen
(2-3 frases)

## Contexto
(spot, stacks, dinámica del bote)

## Calle a calle
### Preflop / Flop / Turn / River
(bullet por calle relevante)

## Decisiones clave
(lista o tabla: decisión | veredicto GTO | EV | comentario)

## Lectura del villano
(si hay perfil o línea de apuestas en el JSON)

## Conclusión práctica
(1 lección concreta)`;

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

  const userContent =
    'Analiza esta mano y genera el informe en español:\n\n' +
    JSON.stringify(body.payload, null, 2);

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
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
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
