import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pt-ai-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const REPORT_PROMPT = `Coach NL Hold'em 6-max cash (español). Recibes JSON compacto: cartas, board, decisiones del héroe, línea del villano y showdown si hay.

CRÍTICO — números del solver local:
Los campos eq (equity), gto (frecuencias), ev (EV perdido) y acc (precisión) son ESTIMACIONES de la app y pueden estar mal. NO los cites como verdad ni bases tu análisis solo en ellos. Recalcula por tu cuenta equity aproximada, pot odds, MDF y si la jugada encaja con GTO usando cartas, board y tamaños de bote/call. Si discrepas del solver, dilo con tus cálculos.

NO narres la mano ni repitas la secuencia de acciones (el usuario ya la ve).
Evalúa SOLO:
1) Cada decisión del héroe: ¿correcta según GTO? ¿por qué? (con tus propios números)
2) Lectura del villano: interpreta su línea (rango, polarización, bluffs/value) y qué señales daría en spots similares

Título: usa hero.code y hero.pos (NUNCA el id numérico de la mano).
Responde markdown completo (no cortes a mitad de frase):
# {hero.code} {hero.pos}
## Decisiones
(bullet por calle con error, duda o EV perdido; omite óptimas salvo lección breve)
## Lectura villano
## Lección práctica
(1 idea concreta microlímites)`;

const QUESTION_PROMPT = `Coach NL Hold'em 6-max cash (español). Recibes el JSON completo de una mano y una PREGUNTA concreta del usuario.

Usa todo el contexto de la mano (cartas, board, decisiones, línea villano, resultado) pero CENTRA la respuesta en la pregunta del usuario. Sé directo y útil.

Los campos eq, gto, ev del JSON son estimaciones del solver local y pueden ser incorrectos. Si la pregunta toca equity, odds o EV, recalcula por tu cuenta; no confíes ciegamente en los números del JSON.

Responde en markdown en español. Empieza con un título breve relacionado con la pregunta (no uses el id de la mano).`;

const SESSION_REPORT_PROMPT = `Coach NL Hold'em 6-max cash (español). Recibes JSON ultra-compacto de una SESIÓN importada:
- st: estadísticas globales (n manos, acc, net, evLost, expNet, varianza, nota, acierto por calle, distribución decisiones)
- leaks: manos con fugas (decisiones malas/EV perdido) con detalle
- clean: resto de manos en una línea cada una (id|mano pos|net|ev|veredicto)
- leakTrunc: si hay más fugas de las enviadas

Los números eq/gto/ev son del solver local y pueden fallar; verifica solo lo relevante.

NO enumeres todas las manos. Analiza patrones, calles débiles, fugas recurrentes y varianza vs errores.
Responde markdown completo en español:
# Resumen sesión {name}
## Rendimiento global
## Fugas principales
(3-6 bullets con mano, calle y por qué)
## Patrones (calle, posición, tipo de spot)
## Plan de estudio
(3 acciones concretas microlímites)`;

const SESSION_QUESTION_PROMPT = `Coach NL Hold'em 6-max cash (español). Recibes JSON compacto de una SESIÓN (stats + leaks + clean) y una PREGUNTA del usuario.

Responde centrándote en la pregunta usando stats y las manos relevantes del JSON. Sé directo.
eq/gto/ev del solver pueden ser incorrectos; recalcula si la pregunta lo requiere.

Responde markdown en español. Título breve relacionado con la pregunta.`;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

type AiMode = 'report' | 'question' | 'session_report' | 'session_question';

function normalizeMode(raw: unknown): AiMode {
  if (raw === 'question') return 'question';
  if (raw === 'session_report') return 'session_report';
  if (raw === 'session_question') return 'session_question';
  return 'report';
}

function sanitizeQuestion(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const q = raw.trim().replace(/\s+/g, ' ');
  if (!q.length) return null;
  return q.slice(0, 200);
}

function promptForMode(mode: AiMode): string {
  if (mode === 'session_report') return SESSION_REPORT_PROMPT;
  if (mode === 'session_question') return SESSION_QUESTION_PROMPT;
  if (mode === 'question') return QUESTION_PROMPT;
  return REPORT_PROMPT;
}

function userContentForMode(mode: AiMode, payload: unknown, question: string | null): string {
  const json = JSON.stringify(payload);
  if (mode === 'session_question') {
    return 'Pregunta del usuario:\n' + question + '\n\nSesión (JSON):\n' + json;
  }
  if (mode === 'session_report') {
    return 'Genera informe de la sesión:\n' + json;
  }
  if (mode === 'question') {
    return 'Pregunta del usuario:\n' + question + '\n\nContexto de la mano (JSON):\n' + json;
  }
  return 'Genera informe de la mano (verifica números del solver por tu cuenta):\n' + json;
}

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

  let body: { payload?: unknown; mode?: unknown; question?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body.payload) {
    return json({ error: 'missing_payload' }, 400);
  }

  const mode = normalizeMode(body.mode);
  const question = (mode === 'question' || mode === 'session_question')
    ? sanitizeQuestion(body.question)
    : null;
  if ((mode === 'question' || mode === 'session_question') && !question) {
    return json({ error: 'missing_question' }, 400);
  }

  const systemPrompt = promptForMode(mode);
  const userContent = userContentForMode(mode, body.payload, question);
  const isSession = mode.startsWith('session_');
  const isQuestion = mode.endsWith('question');

  const model = 'gemini-2.5-flash';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + model +
    ':generateContent?key=' + geminiKey;

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: isQuestion ? 0.4 : 0.35,
        maxOutputTokens: isSession ? (isQuestion ? 1536 : 2560) : (isQuestion ? 1536 : 2048),
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  });

  const geminiData = await geminiRes.json();
  if (!geminiRes.ok) {
    const msg = geminiData?.error?.message || 'gemini_error';
    return json({ error: msg }, 502);
  }

  const candidate = geminiData?.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || '')
    .join('');

  const finishReason = candidate?.finishReason || '';
  const truncated = finishReason === 'MAX_TOKENS';

  if (!text.trim()) {
    return json({ error: 'empty_response' }, 502);
  }

  return json({
    reportMarkdown: text.trim(),
    model: model,
    mode: mode,
    createdAt: new Date().toISOString(),
    truncated: truncated,
    finishReason: finishReason || undefined
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
